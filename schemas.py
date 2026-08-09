from pydantic import BaseModel, EmailStr, field_validator
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    monthly_income: float = 0
    monthly_budget: float = 0

    @field_validator("password")
    @classmethod
    def truncate_password(cls, v):
        return v[:72]


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def truncate_password(cls, v):
        return v[:72]


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    monthly_income: float
    monthly_budget: float

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TransactionCreate(BaseModel):
    amount: float
    category: str
    type: str
    tx_date: date
    description: Optional[str] = None


class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    type: Optional[str] = None
    tx_date: Optional[date] = None
    description: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    amount: float
    category: str
    type: str
    tx_date: date
    description: Optional[str] = None

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class BudgetUpdate(BaseModel):
    monthly_budget: float


class CategoryBudgetCreate(BaseModel):
    category: str
    amount: float


class CategoryBudgetUpdate(BaseModel):
    amount: float


class CategoryBudgetOut(BaseModel):
    id: int
    category: str
    amount: float
    spent: float = 0.0
    remaining: float = 0.0
    percentage: float = 0.0
    status: str = "safe"
    group: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetOut(BaseModel):
    monthly_budget: float
    monthly_income: float
    budget_used: float
    budget_remaining: float
    budget_percentage: float
    total_category_budget: float = 0.0
    category_budgets: List[CategoryBudgetOut] = []

    class Config:
        from_attributes = True

