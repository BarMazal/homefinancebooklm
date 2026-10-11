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

async def seed_demo_profile_data(session: AsyncSession):
    from app.models import Account, Transaction, PensionPolicy, MortgageTrack, Receipt, RealEstateProperty
    
    # 1. Accounts
    a1 = Account(name="Bank Leumi Main Checking", type="bank", institution="Bank Leumi", currency="ILS", current_balance=45200.0, last_uploaded_at=datetime.utcnow())
    a2 = Account(name="Isracard Executive Card", type="credit_card", institution="Isracard", currency="ILS", current_balance=-8450.0, last_uploaded_at=datetime.utcnow())
    a3 = Account(name="IBKR USD Stock Portfolio", type="savings", institution="Interactive Brokers", currency="USD", current_balance=145000.0, last_uploaded_at=datetime.utcnow())
    a4 = Account(name="Altshuler Gemel Kids Savings", type="savings", institution="Altshuler Shaham", currency="ILS", current_balance=65000.0, last_uploaded_at=datetime.utcnow())
    session.add_all([a1, a2, a3, a4])
    await session.commit()
    await session.refresh(a1)
    await session.refresh(a2)
    await session.refresh(a3)
    await session.refresh(a4)

    # 2. Checking & Credit Card Transactions across last 6 months (May to Oct 2026)
    demo_txs = [
        # Oct 2026
        Transaction(account_id=a1.id, date=date(2026, 10, 8), amount=-4200.0, merchant="Shufersal Supermarket", cluster="Groceries"),
        Transaction(account_id=a1.id, date=date(2026, 10, 5), amount=-5800.0, merchant="Chavrat Chashmal & Arnona", cluster="Housing & Utilities"),
        Transaction(account_id=a1.id, date=date(2026, 10, 2), amount=-3100.0, merchant="Kindergarten Daycare", cluster="Kids & Education"),
        Transaction(account_id=a2.id, date=date(2026, 10, 1), amount=-2400.0, merchant="Paz Fuel & Vehicle Maintenance", cluster="Car & Transport"),
        Transaction(account_id=a2.id, date=date(2026, 10, 3), amount=-1800.0, merchant="Restaurants & Delivery", cluster="Dining & Entertainment"),
        Transaction(account_id=a1.id, date=date(2026, 10, 1), amount=35000.0, merchant="Employer Salary Deposit", cluster="Income"),

        # Sep 2026
        Transaction(account_id=a1.id, date=date(2026, 9, 28), amount=35000.0, merchant="Employer Salary Deposit", cluster="Income"),
        Transaction(account_id=a1.id, date=date(2026, 9, 15), amount=-4100.0, merchant="Yohananof Supermarket", cluster="Groceries"),
        Transaction(account_id=a1.id, date=date(2026, 9, 10), amount=-5750.0, merchant="Rent & Utilities", cluster="Housing & Utilities"),
        Transaction(account_id=a1.id, date=date(2026, 9, 5), amount=-3100.0, merchant="Kids Extracurriculars", cluster="Kids & Education"),
        Transaction(account_id=a2.id, date=date(2026, 9, 8), amount=-2350.0, merchant="Fuel & Highway Tolls", cluster="Car & Transport"),
        Transaction(account_id=a2.id, date=date(2026, 9, 20), amount=-1750.0, merchant="Family Dining", cluster="Dining & Entertainment"),

        # Aug 2026
        Transaction(account_id=a1.id, date=date(2026, 8, 28), amount=35000.0, merchant="Employer Salary Deposit", cluster="Income"),
        Transaction(account_id=a1.id, date=date(2026, 8, 14), amount=-4300.0, merchant="Shufersal Supermarket", cluster="Groceries"),
        Transaction(account_id=a1.id, date=date(2026, 8, 10), amount=-5850.0, merchant="Housing & Arnona", cluster="Housing & Utilities"),
        Transaction(account_id=a1.id, date=date(2026, 8, 2), amount=-3200.0, merchant="Summer Camp / Kids", cluster="Kids & Education"),
        Transaction(account_id=a2.id, date=date(2026, 8, 15), amount=-2500.0, merchant="Car Insurance & Fuel", cluster="Car & Transport"),
        Transaction(account_id=a2.id, date=date(2026, 8, 22), amount=-1900.0, merchant="Vacation & Dining", cluster="Dining & Entertainment"),

        # Jul 2026
        Transaction(account_id=a1.id, date=date(2026, 7, 28), amount=35000.0, merchant="Employer Salary Deposit", cluster="Income"),
        Transaction(account_id=a1.id, date=date(2026, 7, 12), amount=-4050.0, merchant="Rami Levy Supermarket", cluster="Groceries"),
        Transaction(account_id=a1.id, date=date(2026, 7, 8), amount=-5700.0, merchant="Housing & Electric", cluster="Housing & Utilities"),
        Transaction(account_id=a2.id, date=date(2026, 7, 5), amount=-2400.0, merchant="Car Service", cluster="Car & Transport"),
        Transaction(account_id=a2.id, date=date(2026, 7, 18), amount=-1850.0, merchant="Dining & Cafes", cluster="Dining & Entertainment"),

        # Jun 2026
        Transaction(account_id=a1.id, date=date(2026, 6, 28), amount=35000.0, merchant="Employer Salary Deposit", cluster="Income"),
        Transaction(account_id=a1.id, date=date(2026, 6, 10), amount=-4200.0, merchant="Shufersal Deal", cluster="Groceries"),
        Transaction(account_id=a1.id, date=date(2026, 6, 5), amount=-5800.0, merchant="Housing & Water", cluster="Housing & Utilities"),
        Transaction(account_id=a2.id, date=date(2026, 6, 12), amount=-2200.0, merchant="Fuel Expenses", cluster="Car & Transport"),
        Transaction(account_id=a2.id, date=date(2026, 6, 25), amount=-1700.0, merchant="Weekend Dining", cluster="Dining & Entertainment"),

        # May 2026
        Transaction(account_id=a1.id, date=date(2026, 5, 28), amount=35000.0, merchant="Employer Salary Deposit", cluster="Income"),
        Transaction(account_id=a1.id, date=date(2026, 5, 11), amount=-4150.0, merchant="Mega Supermarket", cluster="Groceries"),
        Transaction(account_id=a1.id, date=date(2026, 5, 4), amount=-5750.0, merchant="Housing & Utilities", cluster="Housing & Utilities"),
        Transaction(account_id=a2.id, date=date(2026, 5, 9), amount=-2300.0, merchant="Fuel Station", cluster="Car & Transport"),
        Transaction(account_id=a2.id, date=date(2026, 5, 19), amount=-1800.0, merchant="Restaurants", cluster="Dining & Entertainment")
    ]

    # 3. Investment Cashflows for IBKR Portfolio (2021-2026)
    inv_txs = [
        Transaction(account_id=a3.id, date=date(2021, 1, 15), amount=110000.0, merchant="Initial Portfolio Deposit", cluster="Investment"),
        Transaction(account_id=a3.id, date=date(2022, 2, 10), amount=50000.0, merchant="Annual Contribution", cluster="Investment"),
        Transaction(account_id=a3.id, date=date(2023, 3, 5), amount=60000.0, merchant="Annual Contribution", cluster="Investment"),
        Transaction(account_id=a3.id, date=date(2024, 1, 20), amount=80000.0, merchant="Annual Contribution", cluster="Investment"),
        Transaction(account_id=a3.id, date=date(2025, 2, 15), amount=90000.0, merchant="Annual Contribution", cluster="Investment"),
        Transaction(account_id=a3.id, date=date(2026, 1, 10), amount=80000.0, merchant="Annual Contribution", cluster="Investment")
    ]
    session.add_all(demo_txs + inv_txs)

    # 4. Receipt
    r1 = Receipt(
        file_path="sample_shufersal_receipt.jpg",
        merchant="Shufersal Deal Tel Aviv",
        amount=345.80,
        date=date(2026, 10, 8),
        category="Groceries",
        line_items=[
            {"item": "Organic Milk 3%", "price": 14.90, "confidence": 0.94},
            {"item": "Whole Grain Bread", "price": 18.50, "confidence": 0.91},
            {"item": "Fresh Salmon Fillet", "price": 89.00, "confidence": 0.76},
            {"item": "Household Detergent", "price": 42.90, "confidence": 0.88},
            {"item": "Fresh Produce (Vegetables)", "price": 180.50, "confidence": 0.95}
        ],
        confidence_scores={"merchant": 0.95, "amount": 0.82, "date": 0.98},
        status="pending_review"
    )
    session.add(r1)

    # 5. Pensions & Insurances
    p1 = PensionPolicy(policy_name="Main Pension Fund", provider="Altshuler Shaham", type="Pension", monthly_premium=1850.0, management_fee_deposit=1.2, management_fee_accumulation=0.15, covered_amount=1500000.0, accumulated_balance=420000.0)
    p2 = PensionPolicy(policy_name="Executive Life Insurance", provider="Clal Insurance", type="Life Insurance", monthly_premium=240.0, covered_amount=1000000.0)
    p3 = PensionPolicy(policy_name="Private Health Shield", provider="Harel Insurance", type="Health Insurance", monthly_premium=320.0, covered_amount=2000000.0)
    p4 = PensionPolicy(policy_name="Workplace Life Insurance", provider="Migdal", type="Life Insurance", monthly_premium=180.0, covered_amount=500000.0)
    session.add_all([p1, p2, p3, p4])

    # 6. Real Estate Properties & Mortgages
    re1 = RealEstateProperty(name="Main Family Apartment (Tel Aviv)", estimated_value=3500000.0, monthly_rent=0.0, annual_maintenance=12000.0)
    re2 = RealEstateProperty(name="Rental Investment Apartment (Haifa)", estimated_value=1800000.0, monthly_rent=5200.0, annual_maintenance=8000.0)
    session.add_all([re1, re2])

    m1 = MortgageTrack(property_name="Main Family Apartment (Tel Aviv)", track_name="Prime (-0.6%)", original_amount=400000.0, remaining_balance=320000.0, interest_rate=5.4, monthly_payment=2450.0, end_date=date(2045, 1, 1))
    m2 = MortgageTrack(property_name="Main Family Apartment (Tel Aviv)", track_name="Fixed Non-Linked", original_amount=550000.0, remaining_balance=450000.0, interest_rate=4.2, monthly_payment=3120.0, end_date=date(2045, 1, 1))
    m3 = MortgageTrack(property_name="Rental Investment Apartment (Haifa)", track_name="CPI-Linked Variable", original_amount=600000.0, remaining_balance=480000.0, interest_rate=3.8, monthly_payment=2890.0, end_date=date(2048, 6, 1))
    session.add_all([m1, m2, m3])

    await session.commit()

async def init_db(profile_id: int = None):
    if profile_id is None:
        profile_id = profile_manager.get_active_profile_id()
    engine, sessionmaker = get_engine_for_profile(profile_id)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed demo data ONLY for Profile 1 (Demo Profile) if empty
    if profile_id == 1:
        from app.models import Account
        async with sessionmaker() as session:
            acc_res = await session.execute(select(Account))
            if not acc_res.scalars().first():
                await seed_demo_profile_data(session)
