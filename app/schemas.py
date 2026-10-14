from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class AccountBase(BaseModel):
    name: str
    type: str
    institution: Optional[str] = None
    currency: str = "ILS"
    current_balance: float = 0.0

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    institution: Optional[str] = None
    currency: Optional[str] = None
    current_balance: Optional[float] = None

class AccountResponse(AccountBase):
    id: int
    last_uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    account_id: int
    date: date
    amount: float
    currency: str = "ILS"
    merchant: str
    cluster: str = "Uncategorized"
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    receipt_id: Optional[int] = None

class TransactionResponse(TransactionBase):
    id: int
    receipt_id: Optional[int] = None

    class Config:
        from_attributes = True

class ReceiptConfirm(BaseModel):
    merchant: str
    amount: float
    date: date
    category: str
    account_id: int
    line_items: List[Dict[str, Any]] = []

class ReceiptResponse(BaseModel):
    id: int
    file_path: str
    merchant: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[date] = None
    category: str
    line_items: List[Dict[str, Any]] = []
    confidence_scores: Dict[str, float] = {}
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class PensionPolicyBase(BaseModel):
    policy_name: str
    provider: str
    type: str
    monthly_premium: float = 0.0
    management_fee_deposit: float = 0.0
    management_fee_accumulation: float = 0.0
    covered_amount: float = 0.0
    accumulated_balance: float = 0.0
    notes: Optional[str] = None

class PensionPolicyResponse(PensionPolicyBase):
    id: int

    class Config:
        from_attributes = True

class MortgageTrackBase(BaseModel):
    property_name: str
    track_name: str
    original_amount: float
    remaining_balance: float
    interest_rate: float
    monthly_payment: float
    end_date: date

class MortgageTrackResponse(MortgageTrackBase):
    id: int

    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    key: str
    value: str

class XirrCalculationRequest(BaseModel):
    dates: List[date]
    amounts: List[float] # Cashflows: deposits are negative, current total valuation is positive

class SimulatorRequest(BaseModel):
    monthly_savings: float
    interest_rate_stock: float = 7.0 # % annual stock return
    interest_rate_mortgage: float = 4.5 # % mortgage interest rate
    years: int = 10
    divorce_split_ratio: float = 0.5 # 50/50 split

class RetroCommitRequest(BaseModel):
    items: List[Dict[str, Any]]
    account_id: int = 1

