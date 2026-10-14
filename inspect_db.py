import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('data/profile_4/homefinance.db')
c = conn.cursor()

res = c.execute("SELECT count(*), sum(amount) FROM transactions WHERE cluster = 'Dining & Entertainment' AND merchant LIKE '%העברה%'").fetchone()
print(f'Transfers in Dining: {res[0]} rows, sum: {res[1]}')

print('=== ACCOUNTS ===')
for row in c.execute('SELECT id, name, type, institution, current_balance, currency FROM accounts').fetchall():
    print(row)

print('\n=== TRANSACTION SUMMARY ===')
res = c.execute('SELECT count(*), min(date), max(date), sum(case when amount > 0 then amount else 0 end), sum(case when amount < 0 then amount else 0 end) FROM transactions').fetchone()
print(f'Count: {res[0]}, Min Date: {res[1]}, Max Date: {res[2]}')
print(f'Total Inflows: {res[3]}, Total Outflows: {res[4]}')

print('\n=== MONTHLY BREAKDOWN BY YEAR-MONTH ===')
for row in c.execute("""
    SELECT strftime('%Y-%m', date) as ym, 
           count(*), 
           sum(case when amount > 0 then amount else 0 end) as inflow,
           sum(case when amount < 0 then amount else 0 end) as outflow
    FROM transactions 
    GROUP BY ym 
    ORDER BY ym DESC
    LIMIT 20
""").fetchall():
    print(row)

print('\n=== TRANSACTIONS PER ACCOUNT ===')
for row in c.execute("""
    SELECT a.name, count(t.id), sum(t.amount)
    FROM accounts a
    LEFT JOIN transactions t ON a.id = t.account_id
    GROUP BY a.id
""").fetchall():
    print(row)

print('\n=== DINING & ENTERTAINMENT ROWS ===')
for row in c.execute("SELECT date, merchant, amount FROM transactions WHERE cluster = 'Dining & Entertainment' ORDER BY amount ASC LIMIT 15").fetchall():
    print(row)

print('\n=== OTHER EXPENSES TOP OUTFLOWS ===')
for row in c.execute("SELECT date, merchant, amount FROM transactions WHERE cluster = 'Other Expenses' ORDER BY amount ASC LIMIT 15").fetchall():
    print(row)
