from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List

from database import get_db
from models import User, Transaction, CategoryBudget
from schemas import (
    BudgetUpdate,
    BudgetOut,
    CategoryBudgetCreate,
    CategoryBudgetUpdate,
    CategoryBudgetOut,
)
from auth import get_current_user
from services.allocation_table import ALLOCATION_TABLE

router = APIRouter(prefix="/api/v1/budget", tags=["Budget"])

VALID_CATEGORIES = [
    "Food & Beverage",
    "Transport",
    "Bills",
    "Health",
    "Shopping",
    "Entertainment",
    "Education",
    "Other",
]


def _get_category_group(category: str) -> str:
    rule = ALLOCATION_TABLE.get(category)
    if rule:
        return rule.get("tipe", "Wants")
    return "Needs" if category in ("Bills", "Food & Beverage", "Health", "Transport") else "Wants"


def _build_budget_response(current_user: User, db: Session) -> BudgetOut:
    today = datetime.now().date()
    first_day = today.replace(day=1)

    # 1. Total expenses per category and overall for current month
    expenses = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.tx_date >= first_day,
            Transaction.tx_date <= today,
        )
        .all()
    )

    category_spent = {}
    for tx in expenses:
        category_spent[tx.category] = category_spent.get(tx.category, 0.0) + float(tx.amount)

    # 2. Actual monthly income from transactions
    incomes = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.tx_date >= first_day,
            Transaction.tx_date <= today,
        )
        .all()
    )
    monthly_income = sum(float(tx.amount) for tx in incomes) if incomes else 0.0

    # Fallback to user monthly_income profile if 0
    if monthly_income == 0.0 and current_user.monthly_income and float(current_user.monthly_income) > 0:
        monthly_income = float(current_user.monthly_income)

    budget_used = sum(category_spent.values())
    monthly_budget = float(current_user.monthly_budget or 0)

    # 3. Category budgets from database
    cat_budgets_db = (
        db.query(CategoryBudget)
        .filter(CategoryBudget.user_id == current_user.id)
        .order_by(CategoryBudget.id.asc())
        .all()
    )

    cat_budgets_out: List[CategoryBudgetOut] = []
    total_cat_budget = 0.0

    for cb in cat_budgets_db:
        amt = float(cb.amount)
        total_cat_budget += amt
        spent = category_spent.get(cb.category, 0.0)
        rem = amt - spent
        pct = round((spent / amt * 100), 1) if amt > 0 else 0.0

        if pct > 100:
            st = "danger"
        elif pct >= 80:
            st = "warning"
        else:
            st = "safe"

        cat_budgets_out.append(
            CategoryBudgetOut(
                id=cb.id,
                category=cb.category,
                amount=amt,
                spent=spent,
                remaining=rem,
                percentage=pct,
                status=st,
                group=_get_category_group(cb.category),
                created_at=cb.created_at,
            )
        )

    # If monthly_budget is 0 but category budgets exist, use total_cat_budget as effective monthly budget
    effective_budget = monthly_budget if monthly_budget > 0 else total_cat_budget
    budget_remaining = effective_budget - budget_used
    budget_percentage = (budget_used / effective_budget * 100) if effective_budget > 0 else 0.0

    return BudgetOut(
        monthly_budget=monthly_budget,
        monthly_income=monthly_income,
        budget_used=budget_used,
        budget_remaining=budget_remaining,
        budget_percentage=budget_percentage,
        total_category_budget=total_cat_budget,
        category_budgets=cat_budgets_out,
    )


@router.get("", response_model=BudgetOut)
def get_budget(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get current user's budget information including overall status and category budgets."""
    return _build_budget_response(current_user, db)


@router.put("", response_model=BudgetOut)
def update_budget(
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user's total monthly budget."""
    if payload.monthly_budget < 0:
        raise HTTPException(status_code=400, detail="Budget cannot be negative")

    current_user.monthly_budget = payload.monthly_budget
    db.commit()
    db.refresh(current_user)

    return _build_budget_response(current_user, db)


@router.delete("")
def reset_budget(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Reset user's overall budget and category budgets."""
    current_user.monthly_budget = 0
    db.query(CategoryBudget).filter(CategoryBudget.user_id == current_user.id).delete()
    db.commit()
    db.refresh(current_user)

    return {"message": "Budget dan anggaran kategori berhasil direset"}


@router.post("/categories", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_or_update_category_budget(
    payload: CategoryBudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update a category budget (Upsert)."""
    if payload.amount <= 0:
        raise HTTPException(
            status_code=400, detail="Nominal anggaran kategori harus lebih besar dari 0"
        )

    category = payload.category.strip()
    if not category:
        raise HTTPException(status_code=400, detail="Kategori tidak boleh kosong")

    existing = (
        db.query(CategoryBudget)
        .filter(
            CategoryBudget.user_id == current_user.id,
            CategoryBudget.category == category,
        )
        .first()
    )

    if existing:
        existing.amount = payload.amount
    else:
        new_cb = CategoryBudget(
            user_id=current_user.id,
            category=category,
            amount=payload.amount,
        )
        db.add(new_cb)

    db.commit()
    return _build_budget_response(current_user, db)


@router.put("/categories/{budget_id}", response_model=BudgetOut)
def update_category_budget_by_id(
    budget_id: int,
    payload: CategoryBudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update nominal of an existing category budget by ID."""
    if payload.amount <= 0:
        raise HTTPException(
            status_code=400, detail="Nominal anggaran kategori harus lebih besar dari 0"
        )

    cb = (
        db.query(CategoryBudget)
        .filter(
            CategoryBudget.id == budget_id,
            CategoryBudget.user_id == current_user.id,
        )
        .first()
    )

    if not cb:
        raise HTTPException(status_code=404, detail="Anggaran kategori tidak ditemukan")

    cb.amount = payload.amount
    db.commit()

    return _build_budget_response(current_user, db)


@router.delete("/categories/{budget_id}", response_model=BudgetOut)
def delete_category_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a specific category budget by ID."""
    cb = (
        db.query(CategoryBudget)
        .filter(
            CategoryBudget.id == budget_id,
            CategoryBudget.user_id == current_user.id,
        )
        .first()
    )

    if not cb:
        raise HTTPException(status_code=404, detail="Anggaran kategori tidak ditemukan")

    db.delete(cb)
    db.commit()

    return _build_budget_response(current_user, db)


@router.post("/auto-allocate", response_model=BudgetOut)
def auto_allocate_category_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Auto-generate category budgets according to 50/30/20 rule:
    Uses current_user.monthly_budget (if set) or current month's actual income.
    Allocates 80% to expenses (50% Needs + 30% Wants) and reserves 20% for Savings.
    """
    # 1. Determine base amount
    today = datetime.now().date()
    first_day = today.replace(day=1)
    incomes = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.tx_date >= first_day,
            Transaction.tx_date <= today,
        )
        .all()
    )
    actual_income = sum(float(tx.amount) for tx in incomes) if incomes else 0.0

    base_amount = float(current_user.monthly_budget or 0)
    if base_amount <= 0:
        base_amount = actual_income
    if base_amount <= 0 and current_user.monthly_income and float(current_user.monthly_income) > 0:
        base_amount = float(current_user.monthly_income)

    if base_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Tentukan Total Budget Bulanan atau catat Transaksi Pemasukan terlebih dahulu untuk menggunakan Auto Alokasi 50/30/20.",
        )

    # 2. If monthly_budget is not yet set on user, set it
    if not current_user.monthly_budget or float(current_user.monthly_budget) <= 0:
        current_user.monthly_budget = base_amount

    # 3. Calculate category allocations
    # Ideal allocations based on 50/30/20:
    allocations = {
        "Bills": round(base_amount * 0.15, 0),
        "Food & Beverage": round(base_amount * 0.15, 0),
        "Health": round(base_amount * 0.10, 0),
        "Transport": round(base_amount * 0.10, 0),
        "Shopping": round(base_amount * 0.10, 0),
        "Entertainment": round(base_amount * 0.10, 0),
        "Education": round(base_amount * 0.05, 0),
        "Other": round(base_amount * 0.05, 0),
    }

    # 4. Upsert each category budget in DB
    existing_items = (
        db.query(CategoryBudget).filter(CategoryBudget.user_id == current_user.id).all()
    )
    existing_map = {item.category: item for item in existing_items}

    for cat, amt in allocations.items():
        if cat in existing_map:
            existing_map[cat].amount = amt
        else:
            new_cb = CategoryBudget(
                user_id=current_user.id,
                category=cat,
                amount=amt,
            )
            db.add(new_cb)

    db.commit()
    db.refresh(current_user)

    return _build_budget_response(current_user, db)
