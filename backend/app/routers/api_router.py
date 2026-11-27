from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import (
    EmployeeModel, ShiftModel, JobdeskModel, ScheduleModel,
    ScheduleHistoryModel, RosterRequestModel, LeaveModel,
    AnnouncementModel, ActivityLogModel, HolidayModel, PermissionModel, UserModel
)
from ..security import get_current_user, require_admin, get_password_hash
from ..schemas import (
    EmployeeCreate, EmployeeUpdate,
    ShiftCreate, ShiftUpdate,
    JobdeskCreate, JobdeskUpdate,
    ScheduleCreate, ScheduleUpdate, BulkScheduleCreate,
    RosterRequestCreate, LeaveCreate,
    AnnouncementCreate, ActivityLogCreate, HolidayCreate
)

import re

router = APIRouter()

def _natural_code_key(code: str):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", (code or "").strip())]

# ==========================================
# EMPLOYEES
# ==========================================
@router.get("/employees")
def get_employees(db: Session = Depends(get_db)):
    items = db.query(EmployeeModel).all()
    return [
        {
            "id": e.id,
            "employeeNo": e.employee_no,
            "name": e.name,
            "role": e.role,
            "level": e.level or "Junior",
            "status": e.status,
            "defaultLocation": e.default_location,
            "email": e.email,
            "phone": e.phone
        }
        for e in items
    ]

@router.post("/employees")
def create_employee(req: EmployeeCreate, db: Session = Depends(get_db)):
    clean_no = (req.employee_no or "").strip()
    clean_name = (req.name or "").strip()
    clean_email = (req.email or "").strip().lower() if req.email else ""

    if db.query(EmployeeModel).filter(EmployeeModel.employee_no == clean_no).first():
        raise HTTPException(status_code=400, detail="Nomor Induk Karyawan sudah digunakan.")

    if clean_name and db.query(EmployeeModel).filter(EmployeeModel.name.ilike(clean_name)).first():
        raise HTTPException(status_code=400, detail="Nama employee sudah terdaftar. Tidak boleh menggunakan nama yang sama.")

    if clean_email and db.query(EmployeeModel).filter(EmployeeModel.email.ilike(clean_email)).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar. Tidak boleh menggunakan email yang sama.")

    data = req.dict()
    data["employee_no"] = clean_no
    data["name"] = clean_name
    if clean_email:
        data["email"] = clean_email
    emp = EmployeeModel(**data)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return {"success": True, "data": emp}

@router.put("/employees/{emp_id}")
def update_employee(emp_id: str, req: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(EmployeeModel).filter(EmployeeModel.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan.")

    updates = req.dict(exclude_unset=True)
    if "name" in updates and updates["name"]:
        clean_name = updates["name"].strip()
        dup_name = db.query(EmployeeModel).filter(
            EmployeeModel.id != emp_id,
            EmployeeModel.name.ilike(clean_name)
        ).first()
        if dup_name:
            raise HTTPException(status_code=400, detail="Nama employee sudah digunakan oleh karyawan lain.")
        updates["name"] = clean_name

    if "email" in updates and updates["email"]:
        clean_email = updates["email"].strip().lower()
        dup_email = db.query(EmployeeModel).filter(
            EmployeeModel.id != emp_id,
            EmployeeModel.email.ilike(clean_email)
        ).first()
        if dup_email:
            raise HTTPException(status_code=400, detail="Email sudah digunakan oleh karyawan lain.")
        updates["email"] = clean_email

    for k, v in updates.items():
        setattr(emp, k, v)
    db.commit()
    return {"success": True}

@router.delete("/employees/{emp_id}")
def delete_employee(emp_id: str, db: Session = Depends(get_db)):
    emp = db.query(EmployeeModel).filter(EmployeeModel.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan.")
    db.delete(emp)
    db.commit()
    return {"success": True}

# ==========================================
# SHIFTS
# ==========================================
@router.get("/shifts")
def get_shifts(db: Session = Depends(get_db)):
    items = db.query(ShiftModel).all()
    return [
        {
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "startTime": s.start_time,
            "endTime": s.end_time,
            "endDayOffset": s.end_day_offset,
            "color": s.color,
            "isOff": s.is_off,
            "isActive": s.is_active
        }
        for s in items
    ]

@router.post("/shifts")
def create_shift(req: ShiftCreate, db: Session = Depends(get_db)):
    exist = db.query(ShiftModel).filter(ShiftModel.code == req.code).first()
    if exist:
        raise HTTPException(status_code=400, detail="Kode Shift sudah ada.")
    shift = ShiftModel(**req.dict())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return {"success": True, "data": shift}

@router.put("/shifts/{shift_id}")
def update_shift(shift_id: str, req: ShiftUpdate, db: Session = Depends(get_db)):
    shift = db.query(ShiftModel).filter(
        (ShiftModel.id == shift_id) | (ShiftModel.code == shift_id)
    ).first()
    if not shift and req.code:
        shift = db.query(ShiftModel).filter(ShiftModel.code == req.code).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift tidak ditemukan.")
    for k, v in req.dict(exclude_unset=True).items():
        setattr(shift, k, v)
    db.commit()
    db.refresh(shift)
    return {"success": True, "id": shift.id, "color": shift.color}

@router.delete("/shifts/{shift_id}")
def delete_shift(shift_id: str, db: Session = Depends(get_db)):
    shift = db.query(ShiftModel).filter(
        (ShiftModel.id == shift_id) | (ShiftModel.code == shift_id)
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift tidak ditemukan.")
    db.delete(shift)
    db.commit()
    return {"success": True}

# ==========================================
# JOBDESKS
# ==========================================
@router.get("/jobdesks")
def get_jobdesks(db: Session = Depends(get_db)):
    items = sorted(db.query(JobdeskModel).all(), key=lambda j: _natural_code_key(j.code))
    return [
        {
            "id": j.id,
            "code": j.code,
            "name": j.name,
            "description": j.description,
            "color": j.color,
            "isActive": j.is_active
        }
        for j in items
    ]

@router.post("/jobdesks")
def create_jobdesk(req: JobdeskCreate, db: Session = Depends(get_db)):
    exist = db.query(JobdeskModel).filter(JobdeskModel.code == req.code).first()
    if exist:
        raise HTTPException(status_code=400, detail="Kode Jobdesk sudah ada.")
    j = JobdeskModel(**req.dict())
    db.add(j)
    db.commit()
    db.refresh(j)
    return {"success": True, "data": j}

@router.put("/jobdesks/{jobdesk_id}")
def update_jobdesk(jobdesk_id: str, req: JobdeskUpdate, db: Session = Depends(get_db)):
    j = db.query(JobdeskModel).filter(
        (JobdeskModel.id == jobdesk_id) | (JobdeskModel.code == jobdesk_id)
    ).first()
    if not j and req.code:
        j = db.query(JobdeskModel).filter(JobdeskModel.code == req.code).first()
    if not j:
        raise HTTPException(status_code=404, detail="Jobdesk tidak ditemukan.")
    for k, v in req.dict(exclude_unset=True).items():
        setattr(j, k, v)
    db.commit()
    db.refresh(j)
    return {"success": True, "id": j.id, "color": j.color}

@router.delete("/jobdesks/{jobdesk_id}")
def delete_jobdesk(jobdesk_id: str, db: Session = Depends(get_db)):
    j = db.query(JobdeskModel).filter(
        (JobdeskModel.id == jobdesk_id) | (JobdeskModel.code == jobdesk_id)
    ).first()
    if not j:
        raise HTTPException(status_code=404, detail="Jobdesk tidak ditemukan.")
    db.delete(j)
    db.commit()
    return {"success": True}

# ==========================================
# SCHEDULES
# ==========================================
@router.get("/schedules")
def get_schedules(db: Session = Depends(get_db)):
    items = db.query(ScheduleModel).all()
    return [
        {
            "id": s.id,
            "employeeId": s.employee_id,
            "employeeName": s.employee_name,
            "employeeCode": s.employee_code,
            "date": s.date,
            "shiftCode": s.shift_code,
            "jobdeskCode": s.jobdesk_code,
            "location": s.location,
            "agent": s.agent,
            "publicationStatus": s.publication_status,
            "note": s.note,
            "updatedAt": s.updated_at.isoformat() if s.updated_at else None
        }
        for s in items
    ]

_OFF_SHIFT_REGEX = re.compile(r"\b(OFF|WEEKOFF|LIBUR|CUTI|IJIN|IZIN|SAKIT|LEAVE|SICK)\b", re.IGNORECASE)

def _is_off_shift_code(shift_code: str, db: Session) -> bool:
    if not shift_code:
        return False
    clean = shift_code.strip()
    if not clean:
        return False
    shift = db.query(ShiftModel).filter(ShiftModel.code.ilike(clean)).first()
    if shift and shift.is_off:
        return True
    if _OFF_SHIFT_REGEX.search(clean):
        return True
    if shift and shift.name and _OFF_SHIFT_REGEX.search(shift.name):
        return True
    return False

@router.post("/schedules")
def create_schedule(req: ScheduleCreate, db: Session = Depends(get_db)):
    payload = req.dict()
    if _is_off_shift_code(payload.get("shift_code", ""), db):
        payload["location"] = None
        payload["jobdesk_code"] = None
    sched = ScheduleModel(**payload)
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return {"success": True, "data": sched}

@router.put("/schedules/{sched_id}")
def update_schedule(sched_id: str, req: ScheduleUpdate, db: Session = Depends(get_db)):
    sched = db.query(ScheduleModel).filter(ScheduleModel.id == sched_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan.")
    
    data = req.dict(exclude_unset=True)
    if "shift_code" in data:
        sched.shift_code = data["shift_code"]
    elif "shiftCode" in data:
        sched.shift_code = data["shiftCode"]

    if "jobdesk_code" in data:
        sched.jobdesk_code = data["jobdesk_code"] or None
    elif "jobdeskCode" in data:
        sched.jobdesk_code = data["jobdeskCode"] or None

    if "location" in data:
        sched.location = data["location"] or None
    if "agent" in data:
        sched.agent = data["agent"] or None
    if "publication_status" in data:
        sched.publication_status = data["publication_status"]
    elif "publicationStatus" in data:
        sched.publication_status = data["publicationStatus"]
    if "note" in data:
        sched.note = data["note"]

    if _is_off_shift_code(sched.shift_code, db):
        sched.location = None
        sched.jobdesk_code = None

    sched.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}

@router.delete("/schedules/{sched_id}")
def delete_schedule(sched_id: str, db: Session = Depends(get_db)):
    sched = db.query(ScheduleModel).filter(ScheduleModel.id == sched_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan.")
    db.delete(sched)
    db.commit()
    return {"success": True}

@router.post("/schedules/publish-all")
def publish_schedules(date_str: str = None, db: Session = Depends(get_db)):
    q = db.query(ScheduleModel).filter(ScheduleModel.publication_status == "Draft")
    if date_str:
        q = q.filter(ScheduleModel.date == date_str)
    updated = q.update({"publication_status": "Published"}, synchronize_session=False)
    db.commit()
    return {"success": True, "count": updated}

# ==========================================
# SCHEDULE HISTORIES
# ==========================================
@router.get("/schedule-histories")
def get_histories(db: Session = Depends(get_db)):
    items = db.query(ScheduleHistoryModel).order_by(ScheduleHistoryModel.timestamp.desc()).limit(200).all()
    return [
        {
            "id": h.id,
            "scheduleId": h.schedule_id,
            "employeeName": h.employee_name,
            "date": h.date,
            "modifiedBy": h.modified_by,
            "actionType": h.action_type,
            "oldValue": h.old_value,
            "newValue": h.new_value,
            "reason": h.reason,
            "timestamp": h.timestamp.isoformat() if h.timestamp else None
        }
        for h in items
    ]

# ==========================================
# ROSTER REQUESTS
# ==========================================
@router.get("/requests")
def get_requests(db: Session = Depends(get_db)):
    items = db.query(RosterRequestModel).order_by(RosterRequestModel.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "requestType": r.request_type,
            "requesterEmployeeId": r.requester_employee_id,
            "requesterName": r.requester_name,
            "replacementEmployeeId": r.replacement_employee_id,
            "replacementName": r.replacement_name,
            "workDate": r.work_date,
            "requestedShift": r.requested_shift,
            "requestedJobdesk": r.requested_jobdesk,
            "reason": r.reason,
            "status": r.status,
            "createdAt": r.created_at.isoformat() if r.created_at else None
        }
        for r in items
    ]

@router.post("/requests")
def create_request(req: RosterRequestCreate, db: Session = Depends(get_db)):
    r = RosterRequestModel(**req.dict())
    if r.request_type == "Shift Exchange" and r.replacement_employee_id:
        r.status = "Pending Replacement"
    else:
        r.status = "Pending Approval"
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"success": True, "data": r}

@router.put("/requests/{req_id}/status")
def update_request_status(req_id: str, status: str, db: Session = Depends(get_db)):
    r = db.query(RosterRequestModel).filter(RosterRequestModel.id == req_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request tidak ditemukan.")
    r.status = status
    db.commit()
    return {"success": True}

# ==========================================
# LEAVE RECORDS
# ==========================================
@router.get("/leaves")
def get_leaves(db: Session = Depends(get_db)):
    items = db.query(LeaveModel).order_by(LeaveModel.created_at.desc()).all()
    return [
        {
            "id": l.id,
            "employeeId": l.employee_id,
            "employeeName": l.employee_name,
            "type": l.type,
            "startDate": l.start_date,
            "endDate": l.end_date,
            "reason": l.reason,
            "status": l.status,
            "createdAt": l.created_at.isoformat() if l.created_at else None
        }
        for l in items
    ]

@router.post("/leaves")
def create_leave(req: LeaveCreate, db: Session = Depends(get_db)):
    l = LeaveModel(**req.dict())
    db.add(l)
    db.commit()
    db.refresh(l)
    return {"success": True, "data": l}

@router.put("/leaves/{leave_id}/status")
def update_leave_status(leave_id: str, status: str, db: Session = Depends(get_db)):
    l = db.query(LeaveModel).filter(LeaveModel.id == leave_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Leave tidak ditemukan.")
    l.status = status
    db.commit()
    return {"success": True}

# ==========================================
# ANNOUNCEMENTS
# ==========================================
@router.get("/announcements")
def get_announcements(db: Session = Depends(get_db)):
    items = db.query(AnnouncementModel).order_by(AnnouncementModel.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "priority": a.priority,
            "status": a.status,
            "authorName": a.author_name,
            "createdAt": a.created_at.isoformat() if a.created_at else None
        }
        for a in items
    ]

@router.post("/announcements")
def create_announcement(req: AnnouncementCreate, db: Session = Depends(get_db)):
    a = AnnouncementModel(**req.dict())
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"success": True, "data": a}

@router.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: str, db: Session = Depends(get_db)):
    a = db.query(AnnouncementModel).filter(AnnouncementModel.id == ann_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan.")
    db.delete(a)
    db.commit()
    return {"success": True}

# ==========================================
# ACTIVITY LOGS
# ==========================================
@router.get("/activity-logs")
def get_activity_logs(db: Session = Depends(get_db)):
    items = db.query(ActivityLogModel).order_by(ActivityLogModel.timestamp.desc()).limit(200).all()
    return [
        {
            "id": log.id,
            "userName": log.user_name,
            "userRole": log.user_role,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "ipAddress": log.ip_address
        }
        for log in items
    ]

@router.post("/activity-logs")
def create_activity_log(req: ActivityLogCreate, db: Session = Depends(get_db)):
    log = ActivityLogModel(**req.dict())
    db.add(log)
    db.commit()
    return {"success": True}

# ==========================================
# HOLIDAYS (HARI BESAR)
# ==========================================
@router.get("/holidays")
def get_holidays(db: Session = Depends(get_db)):
    items = db.query(HolidayModel).all()
    return {h.date: h.name for h in items}

@router.post("/holidays")
def save_holiday(req: HolidayCreate, db: Session = Depends(get_db)):
    exist = db.query(HolidayModel).filter(HolidayModel.date == req.date).first()
    if exist:
        exist.name = req.name
    else:
        h = HolidayModel(date=req.date, name=req.name)
        db.add(h)
    db.commit()
    return {"success": True}

@router.delete("/holidays/{date_str}")
def delete_holiday(date_str: str, db: Session = Depends(get_db)):
    h = db.query(HolidayModel).filter(HolidayModel.date == date_str).first()
    if h:
        db.delete(h)
        db.commit()
    return {"success": True}

# ==========================================
# PERMISSIONS
# ==========================================
@router.get("/permissions")
def get_permissions(db: Session = Depends(get_db)):
    items = db.query(PermissionModel).all()
    return {p.role: p.permissions_json for p in items}

@router.put("/permissions/{role}")
def update_permission(role: str, data: dict, db: Session = Depends(get_db)):
    import json
    p = db.query(PermissionModel).filter(PermissionModel.role == role).first()
    if p:
        p.permissions_json = json.dumps(data)
    else:
        p = PermissionModel(role=role, permissions_json=json.dumps(data))
        db.add(p)
    db.commit()
    return {"success": True}

# ==========================================
# FULL DATABASE SYNC (Multi-Device Hub)
# ==========================================
@router.get("/sync/pull")
def pull_all_data(db: Session = Depends(get_db)):
    users_list = [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "employeeId": u.employee_id,
            "status": "active",
            "lastLogin": u.last_login.isoformat() + "Z" if u.last_login else None,
            "createdAt": u.created_at.isoformat() if u.created_at else None
        }
        for u in db.query(UserModel).all()
    ]
    employees = [
        {
            "id": e.id,
            "employeeNo": e.employee_no,
            "name": e.name,
            "role": e.role,
            "level": e.level or "Junior",
            "status": e.status,
            "defaultLocation": e.default_location,
            "email": e.email or "",
            "phone": e.phone or ""
        }
        for e in db.query(EmployeeModel).all()
    ]
    shifts = [
        {
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "startTime": s.start_time,
            "endTime": s.end_time,
            "endDayOffset": s.end_day_offset,
            "color": s.color,
            "isOff": s.is_off,
            "isActive": s.is_active,
            "status": "active" if s.is_active else "inactive"
        }
        for s in db.query(ShiftModel).all()
    ]
    jobdesks = [
        {
            "id": j.id,
            "code": j.code,
            "name": j.name,
            "description": j.description or "",
            "color": j.color,
            "isActive": j.is_active,
            "status": "active" if j.is_active else "inactive"
        }
        for j in sorted(db.query(JobdeskModel).all(), key=lambda j: _natural_code_key(j.code))
    ]
    schedules = [
        {
            "id": s.id,
            "employeeId": s.employee_id,
            "employeeName": s.employee_name,
            "employeeCode": s.employee_code,
            "date": s.date,
            "shiftCode": s.shift_code,
            "jobdeskCode": s.jobdesk_code,
            "location": s.location,
            "agent": s.agent,
            "publicationStatus": s.publication_status,
            "note": s.note
        }
        for s in db.query(ScheduleModel).all()
    ]
    announcements = [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "priority": a.priority,
            "status": a.status,
            "authorName": a.author_name,
            "createdAt": a.created_at.isoformat() if a.created_at else None
        }
        for a in db.query(AnnouncementModel).all()
    ]
    holidays = {h.date: h.name for h in db.query(HolidayModel).all()}

    return {
        "success": True,
        "users": users_list,
        "employees": employees,
        "shifts": shifts,
        "jobdesks": jobdesks,
        "schedules": schedules,
        "announcements": announcements,
        "holidays": holidays
    }

@router.post("/sync/push")
def push_all_data(payload: dict, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    # 0. Sync Users
    if "users" in payload and isinstance(payload["users"], list):
        for u_data in payload["users"]:
            u_email = (u_data.get("email") or "").strip().lower()
            if not u_email:
                continue
            exist_u = db.query(UserModel).filter(UserModel.email == u_email).first()
            if exist_u:
                exist_u.name = u_data.get("name", exist_u.name)
                exist_u.role = u_data.get("role", exist_u.role)
                if u_data.get("employeeId"):
                    exist_u.employee_id = u_data.get("employeeId")
            else:
                raw_pwd = u_data.get("password") or "admin"
                new_u = UserModel(
                    id=u_data.get("id"),
                    email=u_email,
                    name=u_data.get("name", "User"),
                    password_hash=get_password_hash(raw_pwd),
                    role=u_data.get("role", "Employee"),
                    employee_id=u_data.get("employeeId") or u_data.get("userId")
                )
                db.add(new_u)

    # 1. Sync Employees & Auto Provision Users
    if "employees" in payload and isinstance(payload["employees"], list):
        for emp_data in payload["employees"]:
            exist = db.query(EmployeeModel).filter(
                (EmployeeModel.id == emp_data.get("id")) | 
                (EmployeeModel.employee_no == emp_data.get("employeeNo"))
            ).first()
            emp_email = (emp_data.get("email") or "").strip().lower()
            if exist:
                exist.name = emp_data.get("name", exist.name)
                exist.role = emp_data.get("role", exist.role)
                if emp_data.get("level") is not None:
                    exist.level = emp_data.get("level")
                exist.status = emp_data.get("status", exist.status)
                exist.default_location = emp_data.get("defaultLocation", exist.default_location)
                exist.email = emp_email or exist.email
                exist.phone = emp_data.get("phone", exist.phone)
            else:
                new_emp = EmployeeModel(
                    id=emp_data.get("id"),
                    employee_no=emp_data.get("employeeNo", ""),
                    name=emp_data.get("name", ""),
                    role=emp_data.get("role", "Employee"),
                    level=emp_data.get("level", "Junior"),
                    status=emp_data.get("status", "active"),
                    default_location=emp_data.get("defaultLocation", "Badung"),
                    email=emp_email,
                    phone=emp_data.get("phone")
                )
                db.add(new_emp)

            # Auto-provision user account for this employee if email is provided
            if emp_email:
                user_match = db.query(UserModel).filter(UserModel.email == emp_email).first()
                if not user_match:
                    db.add(UserModel(
                        email=emp_email,
                        name=emp_data.get("name", "Employee"),
                        password_hash=get_password_hash("admin"),
                        role="SPV" if any(k in (emp_data.get("role") or "").upper() for k in ["SPV", "SUPERVISOR", "LEAD"]) else "Employee",
                        employee_id=emp_data.get("employeeNo")
                    ))

    # 2. Sync Shifts
    if "shifts" in payload and isinstance(payload["shifts"], list):
        active_shift_codes = {s.get("code") for s in payload["shifts"] if s.get("code")}
        if active_shift_codes:
            db.query(ShiftModel).filter(ShiftModel.code.notin_(active_shift_codes)).delete(synchronize_session=False)

        for s_data in payload["shifts"]:
            exist = db.query(ShiftModel).filter(ShiftModel.code == s_data.get("code")).first()
            if exist:
                exist.name = s_data.get("name", exist.name)
                exist.start_time = s_data.get("startTime", exist.start_time)
                exist.end_time = s_data.get("endTime", exist.end_time)
                exist.color = s_data.get("color", exist.color)
                exist.is_off = s_data.get("isOff", exist.is_off)
                exist.is_active = (s_data.get("status") == "active") if "status" in s_data else s_data.get("isActive", True)
            else:
                new_s = ShiftModel(
                    id=s_data.get("id"),
                    code=s_data.get("code", ""),
                    name=s_data.get("name", ""),
                    start_time=s_data.get("startTime", "08:00"),
                    end_time=s_data.get("endTime", "16:00"),
                    end_day_offset=s_data.get("endDayOffset", 0),
                    color=s_data.get("color", "#F9C900"),
                    is_off=s_data.get("isOff", False),
                    is_active=True
                )
                db.add(new_s)

    # 3. Sync Jobdesks
    if "jobdesks" in payload and isinstance(payload["jobdesks"], list):
        active_jd_codes = {j.get("code") for j in payload["jobdesks"] if j.get("code")}
        if active_jd_codes:
            db.query(JobdeskModel).filter(JobdeskModel.code.notin_(active_jd_codes)).delete(synchronize_session=False)

        for j_data in payload["jobdesks"]:
            exist = db.query(JobdeskModel).filter(JobdeskModel.code == j_data.get("code")).first()
            if exist:
                exist.name = j_data.get("name", exist.name)
                exist.description = j_data.get("description", exist.description)
                exist.color = j_data.get("color", exist.color)
                exist.is_active = (j_data.get("status") == "active") if "status" in j_data else j_data.get("isActive", True)
            else:
                new_j = JobdeskModel(
                    id=j_data.get("id"),
                    code=j_data.get("code", ""),
                    name=j_data.get("name", ""),
                    description=j_data.get("description", ""),
                    color=j_data.get("color", "#38BDF8"),
                    is_active=True
                )
                db.add(new_j)

    # 4. Sync Schedules
    if "schedules" in payload and isinstance(payload["schedules"], list):
        active_sched_ids = {sc.get("id") for sc in payload["schedules"] if sc.get("id")}
        if active_sched_ids:
            db.query(ScheduleModel).filter(ScheduleModel.id.notin_(active_sched_ids)).delete(synchronize_session=False)
        elif len(payload["schedules"]) == 0:
            db.query(ScheduleModel).delete(synchronize_session=False)

        for sc in payload["schedules"]:
            exist = db.query(ScheduleModel).filter(ScheduleModel.id == sc.get("id")).first()
            if exist:
                exist.shift_code = sc.get("shiftCode", exist.shift_code)
                exist.jobdesk_code = sc.get("jobdeskCode") or None
                exist.location = sc.get("location", exist.location)
                exist.agent = sc.get("agent") or None
                exist.publication_status = sc.get("publicationStatus", exist.publication_status)
                exist.note = sc.get("note")
            else:
                new_sc = ScheduleModel(
                    id=sc.get("id"),
                    employee_id=sc.get("employeeId", ""),
                    employee_name=sc.get("employeeName", ""),
                    employee_code=sc.get("employeeCode", ""),
                    date=sc.get("date", ""),
                    shift_code=sc.get("shiftCode", "OFF"),
                    jobdesk_code=sc.get("jobdeskCode") or None,
                    location=sc.get("location", "Badung"),
                    agent=sc.get("agent") or None,
                    publication_status=sc.get("publicationStatus", "Draft"),
                    note=sc.get("note")
                )
                db.add(new_sc)

    # 5. Sync Announcements
    if "announcements" in payload and isinstance(payload["announcements"], list):
        for a_data in payload["announcements"]:
            exist = db.query(AnnouncementModel).filter(AnnouncementModel.id == a_data.get("id")).first()
            if exist:
                exist.title = a_data.get("title", exist.title)
                exist.content = a_data.get("content", exist.content)
            else:
                new_a = AnnouncementModel(
                    id=a_data.get("id"),
                    title=a_data.get("title", ""),
                    content=a_data.get("content", ""),
                    author_name=a_data.get("authorName", "Administrator"),
                    status="Published"
                )
                db.add(new_a)

    db.commit()
    return {"success": True, "message": "All data synchronized to PostgreSQL database."}

# ==========================================
# TELEGRAM ALERT NOTIFICATIONS
# ==========================================
@router.get("/telegram/config")
def get_telegram_config(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    import json
    p = db.query(PermissionModel).filter(PermissionModel.role == "telegram_config").first()
    if p:
        try:
            return json.loads(p.permissions_json)
        except Exception:
            pass
    return {
        "enabled": False,
        "botToken": "",
        "chatId": "",
        "chatName": ""
    }

@router.post("/telegram/config")
def save_telegram_config(data: dict, db: Session = Depends(get_db), admin: UserModel = Depends(require_admin)):
    import json
    p = db.query(PermissionModel).filter(PermissionModel.role == "telegram_config").first()
    if p:
        p.permissions_json = json.dumps(data)
    else:
        p = PermissionModel(role="telegram_config", permissions_json=json.dumps(data))
        db.add(p)
    db.commit()
    return {"success": True}

@router.post("/telegram/send")
def send_telegram(payload: dict, current_user: UserModel = Depends(get_current_user)):
    import urllib.request
    import json
    
    bot_token = payload.get("botToken", "").strip()
    chat_id = payload.get("chatId", "").strip()
    text = payload.get("text", "").strip()

    if not bot_token or not chat_id or not text:
        raise HTTPException(status_code=400, detail="botToken, chatId, dan text wajib diisi.")

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    body = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            res_data = json.loads(response.read().decode())
            return {"success": True, "result": res_data}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ==========================================
# GOOGLE SHEETS AUTO-BACKUP
# ==========================================
@router.get("/gsheets/config")
def get_gsheets_config(db: Session = Depends(get_db)):
    import json
    p = db.query(PermissionModel).filter(PermissionModel.role == "gsheets_config").first()
    if p:
        try:
            return json.loads(p.permissions_json)
        except Exception:
            pass
    return {
        "enabled": False,
        "sheetUrl": "",
        "scriptUrl": "",
        "intervalMinutes": 60,
        "lastBackupAt": "-"
    }

@router.post("/gsheets/config")
def save_gsheets_config(data: dict, db: Session = Depends(get_db)):
    import json
    p = db.query(PermissionModel).filter(PermissionModel.role == "gsheets_config").first()
    if p:
        p.permissions_json = json.dumps(data)
    else:
        p = PermissionModel(role="gsheets_config", permissions_json=json.dumps(data))
        db.add(p)
    db.commit()
    return {"success": True}

@router.post("/gsheets/backup")
def execute_gsheets_backup(data: dict):
    import urllib.request
    import json

    script_url = (data.get("scriptUrl") or "").strip()
    payload = data.get("payload") or {}

    if not script_url:
        raise HTTPException(status_code=400, detail="scriptUrl wajib diisi.")

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(script_url, data=body, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_text = response.read().decode("utf-8", errors="ignore")
            return {"success": True, "result": res_text}
    except Exception as e:
        return {"success": False, "error": str(e)}
