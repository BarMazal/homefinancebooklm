from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)  # bank, credit_card, savings, kids_savings, pension, real_estate
    institution = Column(String, nullable=True) # e.g. Bank Leumi, Isracard, Altshuler
    currency = Column(String, default="ILS")
    current_balance = Column(Float, default=0.0)
    last_uploaded_at = Column(DateTime, nullable=True)

    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    date = Column(Date, index=True, default=date.today)
    amount = Column(Float, nullable=False) # positive = income, negative = expense
    currency = Column(String, default="ILS")
    merchant = Column(String, index=True)
    cluster = Column(String, default="Uncategorized") # Groceries, Housing, Utilities, Subscriptions, Entertainment, Kids, Insurance, Salary, Investment
    notes = Column(Text, nullable=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=True)

    account = relationship("Account", back_populates="transactions")
    receipt = relationship("Receipt", back_populates="transaction")

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, nullable=False)
    merchant = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    date = Column(Date, nullable=True)
    category = Column(String, default="Uncategorized")
    line_items = Column(JSON, default=list) # [{item: str, price: float, confidence: float}]
    confidence_scores = Column(JSON, default=dict) # {merchant: float, amount: float, date: float}
    status = Column(String, default="pending_review") # pending_review, confirmed, archived
    created_at = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="receipt", uselist=False)

class PensionPolicy(Base):
    __tablename__ = "pension_policies"

    id = Column(Integer, primary_key=True, index=True)
    policy_name = Column(String, index=True)
    provider = Column(String) # Clal, Migdal, Menora, Harel, etc.
    type = Column(String) # pension, insurance_life, insurance_health, insurance_home, keren_hishtalmut
    monthly_premium = Column(Float, default=0.0)
    management_fee_deposit = Column(Float, default=0.0) # % from deposit
    management_fee_accumulation = Column(Float, default=0.0) # % from balance
    covered_amount = Column(Float, default=0.0)
    accumulated_balance = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)

class MortgageTrack(Base):
    __tablename__ = "mortgage_tracks"

    id = Column(Integer, primary_key=True, index=True)
    property_name = Column(String, index=True) # e.g. Main Apartment
    track_name = Column(String) # Prime, Fixed Non-Linked, CPI-Linked
    original_amount = Column(Float)
    remaining_balance = Column(Float)
    interest_rate = Column(Float) # %
    monthly_payment = Column(Float)
    end_date = Column(Date)

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(Text)
