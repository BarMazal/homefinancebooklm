import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Account, Setting

async def check_missing_upload_reminders():
    """
    Checks accounts for missing statement uploads (e.g. > 30 days old)
    and constructs notification messages.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Account))
        accounts = result.scalars().all()

        missing_accounts = []
        now = datetime.utcnow()
        for acc in accounts:
            if not acc.last_uploaded_at or (now - acc.last_uploaded_at) > timedelta(days=25):
                missing_accounts.append(acc.name)

        if missing_accounts:
            msg = f"🔔 Home Finance Reminder: Missing statement updates for accounts: {', '.join(missing_accounts)}."
            print(f"[Reminder Service]: {msg}")
            await send_telegram_notification(msg)
            return missing_accounts
    return []

async def send_telegram_notification(message: str):
    """
    Send notification message via Telegram Bot API if configured in Settings.
    """
    async with AsyncSessionLocal() as session:
        bot_token_res = await session.execute(select(Setting).where(Setting.key == "telegram_bot_token"))
        chat_id_res = await session.execute(select(Setting).where(Setting.key == "telegram_chat_id"))

        token_row = bot_token_res.scalar_one_or_none()
        chat_id_row = chat_id_res.scalar_one_or_none()

        if token_row and chat_id_row and token_row.value and chat_id_row.value:
            url = f"https://api.telegram.org/bot{token_row.value}/sendMessage"
            payload = {"chat_id": chat_id_row.value, "text": message}
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(url, json=payload)
                    print("[Reminder Service]: Telegram message sent successfully.")
            except Exception as e:
                print(f"[Telegram Notification Error]: {e}")

async def send_email_notification(subject: str, body: str, to_email: str):
    """
    Send email via SMTP if configured in Settings.
    """
    async with AsyncSessionLocal() as session:
        host_res = await session.execute(select(Setting).where(Setting.key == "smtp_host"))
        user_res = await session.execute(select(Setting).where(Setting.key == "smtp_user"))
        pass_res = await session.execute(select(Setting).where(Setting.key == "smtp_pass"))

        host = host_res.scalar_one_or_none()
        user = user_res.scalar_one_or_none()
        password = pass_res.scalar_one_or_none()

        if host and user and password and host.value and user.value and password.value:
            msg = MIMEMultipart()
            msg['From'] = user.value
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            try:
                server = smtplib.SMTP(host.value, 587)
                server.starttls()
                server.login(user.value, password.value)
                server.send_message(msg)
                server.quit()
                print("[Reminder Service]: Email sent successfully.")
            except Exception as e:
                print(f"[Email Notification Error]: {e}")
