from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import uuid
from ..database import get_db
from ..models import UserModel, EmployeeModel
from ..schemas import LoginRequest, TokenResponse, UserCreate, PasswordUpdate
from ..security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_admin
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    clean_input = (req.email or "").strip()
    clean_lower = clean_input.lower()
    if not clean_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email atau User ID wajib diisi."
        )

    # 1. Direct email match or admin alias
    user = None
    if clean_lower in ["admin", "ctso-admin", "administrator"]:
        user = db.query(UserModel).filter(UserModel.email == "admin@ctso.net").first()
    else:
        user = db.query(UserModel).filter(UserModel.email.ilike(clean_lower)).first()

    # 2. If not found by email, lookup via EmployeeModel (by employee_no or id)
    emp = None
    if not user:
        emp = db.query(EmployeeModel).filter(
            (EmployeeModel.employee_no.ilike(clean_input)) |
            (EmployeeModel.id == clean_input)
        ).first()

        if emp:
            if emp.email:
                user = db.query(UserModel).filter(UserModel.email.ilike(emp.email.strip().lower())).first()
            if not user:
                user = db.query(UserModel).filter(
                    (UserModel.employee_id == emp.id) |
                    (UserModel.employee_id == emp.employee_no)
                ).first()

    # 3. Direct lookup by UserModel.employee_id
    if not user:
        user = db.query(UserModel).filter(UserModel.employee_id.ilike(clean_input)).first()

    # 4. Fallback auto-provisioning: If employee exists in EmployeeModel but UserModel wasn't generated
    if not user and emp and req.password in ["admin", "admin123", "password"]:
        emp_email = (emp.email or f"{emp.employee_no.lower()}@ctso.net").strip().lower()
        role = "SPV" if any(k in emp.role.upper() for k in ["SPV", "SUPERVISOR", "LEAD"]) else "Employee"
        user = UserModel(
            email=emp_email,
            name=emp.name,
            password_hash=get_password_hash(req.password),
            role=role,
            employee_id=emp.employee_no
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email / Username atau password salah."
        )

    # Record real-time login timestamp
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "employeeId": user.employee_id,
            "lastLogin": user.last_login.isoformat() + "Z" if user.last_login else None
        }
    }

@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    users = db.query(UserModel).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "employeeId": u.employee_id,
            "lastLogin": u.last_login.isoformat() + "Z" if u.last_login else None,
            "createdAt": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

@router.post("/register")
def register(req: UserCreate, db: Session = Depends(get_db)):
    clean_email = (req.email or "").strip().lower()
    clean_name = (req.name or "").strip()
    clean_name_lower = clean_name.lower()

    if not clean_email or not clean_name:
        raise HTTPException(status_code=400, detail="Nama lengkap dan email wajib diisi.")

    # Check duplicate email in users and employees
    if db.query(UserModel).filter(func.lower(func.trim(UserModel.email)) == clean_email).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar. Tidak boleh menggunakan email yang sama.")
    if db.query(EmployeeModel).filter(func.lower(func.trim(EmployeeModel.email)) == clean_email).first():
        raise HTTPException(status_code=400, detail="Email sudah digunakan pada data employee lain.")

    # Check duplicate name in users and employees
    if db.query(UserModel).filter(func.lower(func.trim(UserModel.name)) == clean_name_lower).first():
        raise HTTPException(status_code=400, detail="Nama sudah terdaftar. Tidak boleh menggunakan nama employee yang sama.")
    if db.query(EmployeeModel).filter(func.lower(func.trim(EmployeeModel.name)) == clean_name_lower).first():
        raise HTTPException(status_code=400, detail="Nama employee sudah terdaftar. Tidak boleh menggunakan nama yang sama.")

    emp_no = req.employee_id or f"CTSO-{uuid.uuid4().hex[:4].upper()}"

    emp = EmployeeModel(
        employee_no=emp_no,
        name=clean_name,
        role=req.role or "Employee",
        level="Head" if req.role == "Admin" else "SPV" if req.role == "SPV" else "Junior",
        status="active",
        default_location="Badung",
        email=clean_email
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)

    user = UserModel(
        email=clean_email,
        name=clean_name,
        password_hash=get_password_hash(req.password),
        role=req.role or "Employee",
        employee_id=emp.employee_no
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "employeeId": user.employee_id
        }
    }

@router.post("/users")
def create_user_by_admin(
    req: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role not in ["Admin", "SPV"]:
        raise HTTPException(status_code=403, detail="Tidak memiliki hak akses.")

    clean_email = req.email.strip().lower()
    existing = db.query(UserModel).filter(UserModel.email == clean_email).first()
    if existing:
        existing.name = req.name.strip()
        existing.role = req.role or existing.role
        if req.employee_id:
            existing.employee_id = req.employee_id
        if req.password:
            existing.password_hash = get_password_hash(req.password)
        db.commit()
        db.refresh(existing)
        return {
            "success": True,
            "user": {
                "id": existing.id,
                "email": existing.email,
                "name": existing.name,
                "role": existing.role,
                "employeeId": existing.employee_id
            }
        }

    user = UserModel(
        email=clean_email,
        name=req.name.strip(),
        password_hash=get_password_hash(req.password),
        role=req.role or "Employee",
        employee_id=req.employee_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "employeeId": user.employee_id
        }
    }

@router.put("/users/{user_id}/password")
def update_user_password(
    user_id: str,
    req: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role != "Admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Tidak memiliki izin untuk mengubah password pengguna ini.")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"success": True, "message": "Password berhasil diperbarui."}

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), admin: UserModel = Depends(require_admin)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")
    if user.email == "admin@ctso.net":
        raise HTTPException(status_code=400, detail="Akun Super Admin utama tidak dapat dihapus.")
    db.delete(user)
    db.commit()
    return {"success": True}
