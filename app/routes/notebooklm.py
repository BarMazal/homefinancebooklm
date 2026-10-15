from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Dict, Any, Optional
from datetime import date, datetime
import json
import asyncio
from pydantic import BaseModel
from notebooklm import NotebookLMClient

from app.database import get_db
from app.models import Transaction, Account, Receipt, PensionPolicy
from app.schemas import RetroCommitRequest
from app.services.notebooklm_service import notebooklm_service
from app.services.profile_manager import profile_manager, get_request_profile_id
from app.services.statement_parser import parse_statement_text

router = APIRouter(prefix="/api/notebooklm", tags=["NotebookLM"])

class LinkNotebookRequest(BaseModel):
    notebook_id: str

class SetProfileRequest(BaseModel):
    profile_name: str

@router.post("/set-profile")
async def set_profile(req: SetProfileRequest, request: Request):
    profile_id = get_request_profile_id(request)
    result = notebooklm_service.set_nb_profile_name(req.profile_name, profile_id)
    return result

@router.post("/launch-auth-browser")
async def launch_auth_browser(request: Request):
    try:
        profile_id = get_request_profile_id(request)
        result = await notebooklm_service.launch_auth_browser(profile_id)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}

@router.get("/status")
async def get_notebooklm_status(request: Request):
    try:
        profile_id = get_request_profile_id(request)
        status = await notebooklm_service.check_connection_status(profile_id)
        return status
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "authenticated": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@router.get("/connection-state")
async def get_connection_state(request: Request):
    """
    Returns instantly with the background connection state for the active profile:
    'connecting' while the check runs, then 'connected' or 'disconnected'.
    """
    profile_id = get_request_profile_id(request)
    return notebooklm_service.get_connection_state(profile_id)

@router.post("/connect")
async def start_connect(request: Request):
    """
    (Re)starts a background connection check (bypassing the status cache) and returns
    immediately. Poll /connection-state until state is no longer 'connecting'.
    """
    profile_id = get_request_profile_id(request)
    notebooklm_service.start_background_connect(profile_id, force=True)
    return notebooklm_service.get_connection_state(profile_id)

@router.post("/import-system-session")
async def import_system_session():
    return {
        "success": False,
        "message": "System account importing is disabled to ensure each application independently manages its own dedicated Google session."
    }

@router.post("/disconnect")
async def disconnect_account(request: Request):
    profile_id = get_request_profile_id(request)
    result = await notebooklm_service.disconnect_account(profile_id)
    return result

@router.get("/notebooks")
async def list_notebooks(request: Request):
    """
    Scans the connected NotebookLM account and lists all notebooks.
    If not authenticated, returns authenticated: false.
    """
    profile_id = get_request_profile_id(request)
    result = await notebooklm_service.list_notebooks(profile_id)
    return result

@router.get("/active-notebook-details")
async def get_active_notebook_details(
    force_refresh: bool = Query(False),
    request: Request = None
):
    """
    Returns resources (sources), notes, and artifacts inside the active profile's linked notebook.
    Uses instantaneous memory/disk cache when available.
    """
    profile_id = get_request_profile_id(request)
    result = await notebooklm_service.get_active_notebook_details(profile_id, force_refresh=force_refresh)
    return result

@router.get("/notebooks/{notebook_id}/details")
async def get_notebook_details(
    notebook_id: str,
    force_refresh: bool = Query(False),
    request: Request = None
):
    """
    Returns resources (sources), notes, and artifacts inside the chosen notebook.
    """
    profile_id = get_request_profile_id(request)
    result = await notebooklm_service.get_notebook_details(notebook_id, profile_id, force_refresh=force_refresh)
    return result

@router.get("/notebooks/{notebook_id}/source/{source_id}/fulltext")
async def get_source_fulltext(notebook_id: str, source_id: str, request: Request):
    """
    Returns the full text content of a source in the notebook.
    """
    profile_id = get_request_profile_id(request)
    result = await notebooklm_service.get_source_fulltext(notebook_id, source_id, profile_id)
    return result

@router.post("/link-notebook")
async def link_notebook(req: LinkNotebookRequest, request: Request):
    """
    Links a notebook to the active profile after checking duplicate sharing restrictions.
    """
    profile_id = get_request_profile_id(request)
    clean_id = req.notebook_id.strip()

    # Check duplicate sharing rule
    check = profile_manager.check_notebook_id_sharing(profile_id, clean_id)
    if check.get("is_shared"):
        return {
            "success": False,
            "warning": True,
            "message": check["message"]
        }

    # Save to profile settings
    settings = profile_manager.load_profile_settings(profile_id)
    settings["notebooklm_notebook_id"] = clean_id
    profile_manager.save_profile_settings(profile_id, settings)

    return {
        "success": True,
        "notebook_id": clean_id,
        "message": f"Successfully linked notebook to Profile #{profile_id}"
    }

@router.get("/scan-retro-stream")
async def scan_retroactive_history_stream(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Interactively streams progress and extracted financial records source-by-source via SSE.
    """
    profile_id = get_request_profile_id(request)
    settings = profile_manager.load_profile_settings(profile_id)
    notebook_id = settings.get("notebooklm_notebook_id", "").strip()

    if not notebook_id:
        async def err_gen():
            yield f"data: {json.dumps({'type': 'error', 'message': 'No notebook linked to active profile'})}\n\n"
        return StreamingResponse(err_gen(), media_type="text/event-stream")

    # Fetch existing transactions for conflict checking
    result = await db.execute(select(Transaction))
    existing_txs = result.scalars().all()
    existing_keys = {
        f"{tx.date}_{tx.merchant.strip().lower()}_{abs(tx.amount)}"
        for tx in existing_txs
    }

    async def event_generator():
        storage_path = notebooklm_service._get_storage_path(profile_id)
        nb_profile = notebooklm_service.get_nb_profile_name(profile_id)

        if not storage_path:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Google NotebookLM session not found. Please log in first.'})}\n\n"
            return

        try:
            async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
                sources = await client.sources.list(notebook_id)
                notes = await client.notes.list(notebook_id)

                items_to_process = []
                for s in sources:
                    items_to_process.append({"kind": "Document", "id": s.id, "title": s.title or "Untitled Statement", "obj": s})
                for n in notes:
                    items_to_process.append({"kind": "Receipt / Note", "id": n.id, "title": n.title or "Untitled Note", "obj": n})

                total_items = len(items_to_process)
                yield f"data: {json.dumps({'type': 'init', 'total_sources': total_items})}\n\n"

                total_extracted = 0
                total_conflicts = 0
                seen_in_session = set()

                for i, item_entry in enumerate(items_to_process):
                    if await request.is_disconnected():
                        print(f"[RetroStream] Client disconnected at item {i+1}")
                        break

                    source_title = item_entry["title"]
                    kind_label = item_entry["kind"]
                    display_title = f"[{kind_label}] {source_title}"
                    percent = int(((i) / total_items) * 100)

                    # 1. Send progress event
                    yield f"data: {json.dumps({'type': 'progress', 'current_index': i + 1, 'total': total_items, 'source_title': display_title, 'percent': percent})}\n\n"

                    # Check if meta/instruction note to avoid parsing prompts
                    is_meta = any(k in source_title.lower() for k in ["פרומט", "prompt", "קישור לשיחת", "instructions"])
                    source_items = []
                    if not is_meta:
                        try:
                            raw_content = ""
                            if item_entry["kind"] == "Document":
                                ft = await client.sources.get_fulltext(notebook_id, item_entry["id"])
                                raw_content = getattr(ft, "content", "")
                            else:
                                raw_content = getattr(item_entry["obj"], "content", "")

                            if raw_content:
                                parsed_records = parse_statement_text(raw_content, source_title)
                                for item in parsed_records:
                                    clean_merchant = item["merchant"].strip().lower()
                                    clean_amount = round(abs(item["amount"]), 1)
                                    sig_key = f"{item['date']}_{clean_merchant}_{clean_amount}"

                                    # Cross-document deduplication: avoid adding same receipt/transaction from multiple documents
                                    if sig_key in seen_in_session:
                                        continue
                                    seen_in_session.add(sig_key)

                                    is_conflict = sig_key in existing_keys
                                    if is_conflict:
                                        total_conflicts += 1
                                    source_items.append({
                                        **item,
                                        "source_id": item_entry["id"],
                                        "kind": item_entry["kind"],
                                        "has_conflict": is_conflict,
                                        "conflict_reason": "Matching transaction exists in local database" if is_conflict else None
                                    })
                        except Exception as src_err:
                            print(f"[RetroStream] Error reading {item_entry['kind']} '{source_title}': {src_err}")

                    total_extracted += len(source_items)

                    # 3. Emit chunk event with newly parsed items
                    yield f"data: {json.dumps({'type': 'chunk', 'current_index': i + 1, 'total': total_items, 'source_title': source_title, 'new_items': source_items, 'total_extracted': total_extracted, 'total_conflicts': total_conflicts, 'percent': int(((i + 1) / total_items) * 100)})}\n\n"
                    
                    await asyncio.sleep(0.03)

                yield f"data: {json.dumps({'type': 'complete', 'total_sources': total_items, 'total_extracted': total_extracted, 'total_conflicts': total_conflicts})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/scan-retro")
async def scan_retroactive_history(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Scans NotebookLM notes/sources for historical financial records,
    and cross-references existing SQLite DB records to flag conflicts/duplicates.
    """
    profile_id = get_request_profile_id(request)
    settings = profile_manager.load_profile_settings(profile_id)
    notebook_id = settings.get("notebooklm_notebook_id", "").strip()

    # Fetch existing transactions for conflict checking
    result = await db.execute(select(Transaction))
    existing_txs = result.scalars().all()
    
    existing_keys = set()
    for tx in existing_txs:
        key = f"{tx.date}_{tx.merchant.strip().lower()}_{abs(tx.amount)}"
        existing_keys.add(key)

    historical_extracted = []
    if notebook_id:
        try:
            extracted = await notebooklm_service.extract_financial_records(notebook_id, profile_id)
            if extracted:
                historical_extracted = extracted
        except Exception as err:
            print(f"[RetroScan] Live extraction error: {err}")

    # Fallback only for Demo Profile 1 if no notebook records found
    if not historical_extracted and profile_id == 1:
        historical_extracted = [
            {"date": "2026-01-15", "merchant": "Shufersal Supermarket", "amount": -450.0, "category": "Groceries", "source_note": "Uploaded Receipt Jan 2026"},
            {"date": "2026-02-10", "merchant": "Electric Corp (Chavrat Chashmal)", "amount": -620.0, "category": "Housing & Utilities", "source_note": "Bank Report Feb 2026"},
            {"date": "2026-03-05", "merchant": "Super-Pharm Tel Aviv", "amount": -185.5, "category": "Groceries", "source_note": "Uploaded Receipt Mar 2026"},
            {"date": "2026-04-12", "merchant": "Paz Gas Station", "amount": -310.0, "category": "Car & Transport", "source_note": "Card Report Apr 2026"},
            {"date": "2026-05-20", "merchant": "Altshuler Pension Deposit", "amount": 1850.0, "category": "Salary / Pension", "source_note": "Pension Annual Report 2026"}
        ]

    scanned_items = []
    conflict_count = 0

    for item in historical_extracted:
        clean_merchant = item["merchant"].strip().lower()
        clean_amount = abs(item["amount"])
        sig_key = f"{item['date']}_{clean_merchant}_{clean_amount}"

        is_conflict = sig_key in existing_keys
        if is_conflict:
            conflict_count += 1

        scanned_items.append({
            **item,
            "has_conflict": is_conflict,
            "conflict_reason": "Matching transaction already exists in local database" if is_conflict else None
        })

    return {
        "status": "success",
        "total_extracted": len(scanned_items),
        "conflicts_detected": conflict_count,
        "items": scanned_items
    }

@router.post("/commit-retro")
async def commit_retroactive_history(req: RetroCommitRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Commits approved retroactive items into SQLite database after user preview approval.
    Automatically assigns each transaction to its specific detected account (Leumi, Otsar, Visa, MC, etc.).
    """
    profile_id = get_request_profile_id(request)

    # 1. Fetch existing accounts for this profile and cache by name
    existing_accs_res = await db.execute(select(Account).where(Account.profile_id == profile_id))
    accounts_by_name = {a.name: a for a in existing_accs_res.scalars().all()}
    
    # Also support explicit fallback if requested
    fallback_account = None
    if req.account_id:
        acc_res = await db.execute(select(Account).where(Account.id == req.account_id))
        fallback_account = acc_res.scalars().first()

    committed_count = 0
    account_deltas = {}

    for item in req.items:
        if item.get("has_conflict"):
            continue

        acc_name = item.get("account_name") or "חשבון כללי"
        inst = item.get("institution") or "כללי"
        acc_type = item.get("account_type") or "bank"

        target_account = fallback_account or accounts_by_name.get(acc_name)
        if not target_account:
            target_account = Account(
                name=acc_name,
                type=acc_type,
                institution=inst,
                currency="ILS",
                profile_id=profile_id,
                current_balance=0.0
            )
            db.add(target_account)
            await db.flush()
            accounts_by_name[acc_name] = target_account

        amt = float(item["amount"])
        item_tags = item.get("tags") or []
        tags_str = ", ".join(item_tags) if item_tags else ""
        tx = Transaction(
            account_id=target_account.id,
            profile_id=profile_id,
            date=datetime.strptime(item["date"], "%Y-%m-%d").date(),
            amount=amt,
            merchant=item["merchant"],
            cluster=item.get("category", "Uncategorized"),
            tags=item_tags,
            notes=f"NotebookLM: {item.get('source_note', '')}{(' | Tags: ' + tags_str) if tags_str else ''}"
        )
        db.add(tx)
        committed_count += 1
        account_deltas[target_account.id] = account_deltas.get(target_account.id, 0.0) + amt

    # Update balances on all affected accounts
    for acc_id, delta in account_deltas.items():
        for acc in accounts_by_name.values():
            if acc.id == acc_id:
                acc.current_balance = (acc.current_balance or 0.0) + delta
                acc.last_uploaded_at = datetime.utcnow()

    await db.commit()
    return {"status": "success", "committed_count": committed_count, "accounts_updated": len(account_deltas)}
