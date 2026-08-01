from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date

from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/v1/transactions", tags=["Transactions"])


@router.get("", response_model=List[schemas.TransactionOut])
def list_transactions(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)
    if month:
        q = q.filter(models.Transaction.tx_date.op("MONTH")() == month) if False else q
    if year and month:
        from sqlalchemy import extract
        q = q.filter(extract("year", models.Transaction.tx_date) == year,
                     extract("month", models.Transaction.tx_date) == month)
    elif year:
        from sqlalchemy import extract
        q = q.filter(extract("year", models.Transaction.tx_date) == year)
    if type:
        q = q.filter(models.Transaction.type == type)
    return q.order_by(models.Transaction.tx_date.desc()).all()


@router.post("", response_model=schemas.TransactionOut, status_code=201)
def create_transaction(
    payload: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Tipe harus 'income' atau 'expense'")
    tx = models.Transaction(user_id=current_user.id, **payload.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.put("/{tx_id}", response_model=schemas.TransactionOut)
def update_transaction(
    tx_id: int,
    payload: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id, models.Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id, models.Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    db.delete(tx)
    db.commit()
    return None
