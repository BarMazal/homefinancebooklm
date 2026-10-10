import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import select
from datetime import date, datetime
from app.services.profile_manager import profile_manager

Base = declarative_base()

_engines = {}
_sessionmakers = {}

def get_engine_for_profile(profile_id: int):
    if profile_id not in _engines:
        db_path = profile_manager.get_profile_db_path(profile_id)
        db_url = f"sqlite+aiosqlite:///{db_path}"
        engine = create_async_engine(db_url, connect_args={"check_same_thread": False}, echo=False)
        sm = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        _engines[profile_id] = engine
        _sessionmakers[profile_id] = sm
    return _engines[profile_id], _sessionmakers[profile_id]

async def get_db():
    active_profile_id = profile_manager.get_active_profile_id()
    _, sessionmaker = get_engine_for_profile(active_profile_id)
    async with sessionmaker() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db(profile_id: int = None):
    if profile_id is None:
        profile_id = profile_manager.get_active_profile_id()
    engine, sessionmaker = get_engine_for_profile(profile_id)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed demo data ONLY for Profile 1 (Demo Profile) if empty
    if profile_id == 1:
        from app.models import Account, Transaction, PensionPolicy, MortgageTrack, Receipt, RealEstateProperty
        async with sessionmaker() as session:
            acc_res = await session.execute(select(Account))
            if not acc_res.scalars().first():
                # Add demo accounts
                a1 = Account(name="Bank Leumi Main Checking", type="bank", institution="Bank Leumi", currency="ILS", current_balance=45200.0, last_uploaded_at=datetime.utcnow())
                a2 = Account(name="Isracard Executive Card", type="credit_card", institution="Isracard", currency="ILS", current_balance=-8450.0, last_uploaded_at=datetime.utcnow())
                a3 = Account(name="IBKR USD Stock Portfolio", type="savings", institution="Interactive Brokers", currency="USD", current_balance=34500.0, last_uploaded_at=datetime.utcnow())
                session.add_all([a1, a2, a3])
                await session.commit()
                await session.refresh(a1)

                # Add demo transactions
                t1 = Transaction(account_id=a1.id, date=date(2026, 10, 8), amount=-4200.0, merchant="Shufersal Supermarket", cluster="Groceries")
                t2 = Transaction(account_id=a1.id, date=date(2026, 10, 5), amount=-5800.0, merchant="Chavrat Chashmal & Arnona", cluster="Housing & Utilities")
                t3 = Transaction(account_id=a1.id, date=date(2026, 10, 2), amount=-3100.0, merchant="Kindergarten Daycare", cluster="Kids & Education")
                t4 = Transaction(account_id=a1.id, date=date(2026, 9, 28), amount=35000.0, merchant="Employer Salary Deposit", cluster="Income")
                session.add_all([t1, t2, t3, t4])

                # Add demo pensions
                p1 = PensionPolicy(policy_name="Main Pension Fund", provider="Altshuler Shaham", type="Pension", monthly_premium=1850.0, management_fee_deposit=1.2, management_fee_accumulation=0.15, covered_amount=1500000.0, accumulated_balance=420000.0)
                p2 = PensionPolicy(policy_name="Executive Life Insurance", provider="Clal Insurance", type="Life Insurance", monthly_premium=240.0, covered_amount=1000000.0)
                session.add_all([p1, p2])

                # Add demo real estate properties & mortgages
                re1 = RealEstateProperty(name="Main Family Apartment (Tel Aviv)", estimated_value=3500000.0, monthly_rent=0.0, annual_maintenance=12000.0)
                re2 = RealEstateProperty(name="Rental Investment Apartment (Haifa)", estimated_value=1800000.0, monthly_rent=5200.0, annual_maintenance=8000.0)
                session.add_all([re1, re2])

                m1 = MortgageTrack(property_name="Main Family Apartment (Tel Aviv)", track_name="Prime (-0.6%)", original_amount=400000.0, remaining_balance=320000.0, interest_rate=5.4, monthly_payment=2450.0, end_date=date(2045, 1, 1))
                m2 = MortgageTrack(property_name="Main Family Apartment (Tel Aviv)", track_name="Fixed Non-Linked", original_amount=550000.0, remaining_balance=450000.0, interest_rate=4.2, monthly_payment=3120.0, end_date=date(2045, 1, 1))
                session.add_all([m1, m2])

                await session.commit()
