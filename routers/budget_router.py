from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from database import get_db
from models import User, Transaction
from schemas import BudgetUpdate, BudgetOut
from auth import get_current_user

router = APIRouter(prefix="/api/v1/budget", tags=["Budget"])


@router.get("", response_model=BudgetOut)
def get_budget(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's budget information including usage"""
    today = datetime.now().date()
    first_day = today.replace(day=1)
    
    # Calculate total expenses for current month
    expenses = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.tx_date >= first_day,
        Transaction.tx_date <= today
    ).all()
    
    budget_used = sum(tx.amount for tx in expenses)
    budget_remaining = float(current_user.monthly_budget) - budget_used
    budget_percentage = (budget_used / float(current_user.monthly_budget) * 100) if current_user.monthly_budget > 0 else 0
    
    return BudgetOut(
        monthly_budget=float(current_user.monthly_budget),
        monthly_income=float(current_user.monthly_income),
        budget_used=budget_used,
        budget_remaining=max(0, budget_remaining),
        budget_percentage=min(100, budget_percentage)
    )


@router.put("", response_model=BudgetOut)
def update_budget(
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's monthly budget"""
    if payload.monthly_budget < 0:
        raise HTTPException(status_code=400, detail="Budget cannot be negative")
    
    current_user.monthly_budget = payload.monthly_budget
    db.commit()
    db.refresh(current_user)
    
    # Return updated budget info
    return get_budget(current_user, db)


@router.delete("")
def reset_budget(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset user's budget to 0"""
    current_user.monthly_budget = 0
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Budget reset successfully"}
