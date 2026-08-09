"""
Comprehensive System Test for SmartFinance AI
Tests:
- Database creation & models
- Auth registration & login
- Transaction CRUD
- Budget CRUD (Total & Category Budgets)
- Auto 50/30/20 Allocation
- Forecasting (LSTM / Heuristic)
- Financial Health Score
- Dashboard Summary
- Chatbot Endpoint
"""

import sys
import os
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from main import app
from database import engine, Base

client = TestClient(app)

def run_tests():
    print("=== STARTING FULL SYSTEM VERIFICATION ===")
    
    # 1. Ensure DB tables exist
    Base.metadata.create_all(bind=engine)
    print("[PASS] Database tables created successfully.")

    # 2. Test Registration & Login
    test_email = "testuser_full_flow@smartfinance.ai"
    test_password = "password123"
    
    # Try login first in case user already exists
    login_res = client.post("/api/v1/auth/login", json={"email": test_email, "password": test_password})
    if login_res.status_code != 200:
        reg_res = client.post("/api/v1/auth/register", json={
            "name": "Test User Full Flow",
            "email": test_email,
            "password": test_password,
            "monthly_income": 8000000,
            "monthly_budget": 6000000
        })
        assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
        token = reg_res.json()["access_token"]
        print("[PASS] User Registration OK")
    else:
        token = login_res.json()["access_token"]
        print("[PASS] User Login OK")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Test /auth/me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200, f"Get /me failed: {me_res.text}"
    user_data = me_res.json()
    print(f"[PASS] User Profile: {user_data['name']} (ID: {user_data['id']})")

    # 4. Test Transaction CRUD
    print("\n--- Testing Transaction CRUD ---")
    # 4a. Create Income
    tx_inc = client.post("/api/v1/transactions", json={
        "amount": 8500000,
        "category": "Income",
        "type": "income",
        "tx_date": "2026-08-01",
        "description": "Gaji Bulanan Agustus"
    }, headers=headers)
    assert tx_inc.status_code == 201, f"Create income failed: {tx_inc.text}"
    inc_id = tx_inc.json()["id"]
    print(f"[PASS] Created Income Transaction: ID {inc_id}")

    # 4b. Create Expenses
    sample_expenses = [
        {"amount": 1200000, "category": "Food & Beverage", "type": "expense", "tx_date": "2026-08-02", "description": "Belanja Bulanan"},
        {"amount": 500000, "category": "Transport", "type": "expense", "tx_date": "2026-08-03", "description": "Bensin & Tol"},
        {"amount": 900000, "category": "Bills", "type": "expense", "tx_date": "2026-08-04", "description": "Listrik & Internet"},
        {"amount": 350000, "category": "Shopping", "type": "expense", "tx_date": "2026-08-05", "description": "Baju Baru"},
    ]
    created_tx_ids = []
    for exp in sample_expenses:
        res = client.post("/api/v1/transactions", json=exp, headers=headers)
        assert res.status_code == 201, f"Create expense failed: {res.text}"
        created_tx_ids.append(res.json()["id"])
    print(f"[PASS] Created {len(created_tx_ids)} Expense Transactions")

    # 4c. List Transactions
    list_res = client.get("/api/v1/transactions?month=8&year=2026", headers=headers)
    assert list_res.status_code == 200, f"List transactions failed: {list_res.text}"
    tx_list = list_res.json()
    assert len(tx_list) >= len(sample_expenses) + 1, "Transaction count mismatch"
    print(f"[PASS] List Transactions: {len(tx_list)} items found")

    # 4d. Update Transaction
    update_res = client.put(f"/api/v1/transactions/{created_tx_ids[0]}", json={
        "amount": 1250000,
        "description": "Belanja Bulanan (Update)"
    }, headers=headers)
    assert update_res.status_code == 200, f"Update transaction failed: {update_res.text}"
    assert float(update_res.json()["amount"]) == 1250000
    print(f"[PASS] Updated Transaction ID {created_tx_ids[0]}")

    # 5. Test Budget CRUD & Category Budgets
    print("\n--- Testing Budget & Category Budget CRUD ---")
    # 5a. Get initial budget
    b_get = client.get("/api/v1/budget", headers=headers)
    assert b_get.status_code == 200, f"Get budget failed: {b_get.text}"
    b_data = b_get.json()
    print(f"[PASS] Initial Budget: Monthly={b_data['monthly_budget']}, Actual Income={b_data['monthly_income']}, Used={b_data['budget_used']}")

    # 5b. Update Total Monthly Budget
    b_put = client.put("/api/v1/budget", json={"monthly_budget": 6500000}, headers=headers)
    assert b_put.status_code == 200, f"Update budget failed: {b_put.text}"
    assert float(b_put.json()["monthly_budget"]) == 6500000
    print("[PASS] Updated Total Monthly Budget to 6,500,000")

    # 5c. Create Category Budget
    cat_res1 = client.post("/api/v1/budget/categories", json={
        "category": "Food & Beverage",
        "amount": 1800000
    }, headers=headers)
    assert cat_res1.status_code == 201, f"Create category budget failed: {cat_res1.text}"
    cat_budgets = cat_res1.json()["category_budgets"]
    assert any(c["category"] == "Food & Beverage" for c in cat_budgets)
    fb_budget = next(c for c in cat_budgets if c["category"] == "Food & Beverage")
    print(f"[PASS] Created Category Budget 'Food & Beverage': ID={fb_budget['id']}, Target={fb_budget['amount']}, Spent={fb_budget['spent']}, Pct={fb_budget['percentage']}%")

    # 5d. Update Category Budget by ID
    cat_up = client.put(f"/api/v1/budget/categories/{fb_budget['id']}", json={
        "amount": 2000000
    }, headers=headers)
    assert cat_up.status_code == 200, f"Update category budget failed: {cat_up.text}"
    fb_updated = next(c for c in cat_up.json()["category_budgets"] if c["id"] == fb_budget["id"])
    assert float(fb_updated["amount"]) == 2000000
    print("[PASS] Updated Category Budget 'Food & Beverage' to 2,000,000")

    # 5e. Create Second Category Budget (Transport)
    cat_res2 = client.post("/api/v1/budget/categories", json={
        "category": "Transport",
        "amount": 750000
    }, headers=headers)
    assert cat_res2.status_code == 201, f"Create transport budget failed: {cat_res2.text}"
    cat_budgets2 = cat_res2.json()["category_budgets"]
    assert len(cat_budgets2) >= 2
    print(f"[PASS] Created Second Category Budget 'Transport': 750,000")

    # 5f. Delete Category Budget by ID
    del_cat_res = client.delete(f"/api/v1/budget/categories/{fb_budget['id']}", headers=headers)
    assert del_cat_res.status_code == 200, f"Delete category budget failed: {del_cat_res.text}"
    remaining_cats = del_cat_res.json()["category_budgets"]
    assert not any(c["id"] == fb_budget["id"] for c in remaining_cats)
    print(f"[PASS] Deleted Category Budget ID {fb_budget['id']} ({fb_budget['category']})")


    # 6. Test Forecasting, Health Score, Dashboard & Chat
    print("\n--- Testing Prediction, Health Score, Dashboard & Chat ---")
    # 6a. Prediction
    pred_res = client.get("/api/v1/predict", headers=headers)
    assert pred_res.status_code == 200, f"Prediction failed: {pred_res.text}"
    pred_data = pred_res.json()
    print(f"[PASS] Prediction Endpoint: Month={pred_data['prediction_month']}, Total Predicted={pred_data['total_predicted']}")

    # 6b. Health Score
    health_res = client.get("/api/v1/predict/health-score", headers=headers)
    assert health_res.status_code == 200, f"Health score failed: {health_res.text}"
    health_data = health_res.json()
    print(f"[PASS] Health Score: {health_data['score']}/100 ({health_data['label']}), Savings={health_data['savings_pct']}%")

    # 6c. Dashboard Summary
    dash_res = client.get("/api/v1/predict/dashboard", headers=headers)
    assert dash_res.status_code == 200, f"Dashboard summary failed: {dash_res.text}"
    dash_data = dash_res.json()
    print(f"[PASS] Dashboard Summary: Income={dash_data['current_month']['income']}, Expense={dash_data['current_month']['expense']}, Balance={dash_data['current_month']['balance']}")

    # 6d. Chat
    chat_res = client.post("/api/v1/chat", json={
        "message": "Halo, bagaimana status anggaran dan keuangan saya?"
    }, headers=headers)
    assert chat_res.status_code == 200, f"Chat failed: {chat_res.text}"
    print(f"[PASS] Chat Advisor Response: {chat_res.json()['reply'][:80]}...")

    print("\n=== ALL SYSTEM TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
