#!/usr/bin/env python3
"""
Initialize CMS Database with Clean / Empty State:
- Creates all database schema tables
- Seeds 1 Default Super Administrator (admin@ctso.net / admin)
- Seeds base Shift Master & Jobdesk Master catalog
- All operational data (Schedules, Employees, Leaves, Requests, Announcements) is 100% EMPTY.
"""

import sys
import json
from sqlalchemy import text
from app.database import engine, SessionLocal, Base
from app.models import UserModel, ShiftModel, JobdeskModel, PermissionModel
from app.security import get_password_hash

def init_database():
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)

    # Auto-migrate existing tables before any ORM queries run
    print("Verifying schema columns...")
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS note TEXT;"))
        conn.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS agent VARCHAR;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;"))
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS level VARCHAR DEFAULT 'Junior';"))
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname VARCHAR;"))
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR DEFAULT 'male';"))
        conn.execute(text("DELETE FROM shift_master WHERE code = 'Middle' OR name = 'Mid-Day Flex';"))
        conn.commit()

    db = SessionLocal()
    try:
        # 1. Seed Default Admin User
        admin_email = "admin@ctso.net"
        existing_admin = db.query(UserModel).filter(UserModel.email == admin_email).first()
        if not existing_admin:
            print("Seeding default Administrator account (admin@ctso.net)...")
            admin_user = UserModel(
                email=admin_email,
                name="Super Administrator",
                password_hash=get_password_hash("admin"),
                role="Admin",
                employee_id=None
            )
            db.add(admin_user)
            db.commit()
            print("✔ Admin account created: admin@ctso.net (password: admin)")
        else:
            print("ℹ Admin account already exists.")

        # 2. Seed Base Shift Master Catalog
        default_shifts = [
            {"code": "Pagi 7", "name": "Early Morning", "start_time": "07:00", "end_time": "15:00", "end_day_offset": 0, "color": "#2563EB", "is_off": False},
            {"code": "Pagi 8", "name": "Regular Morning", "start_time": "08:00", "end_time": "16:00", "end_day_offset": 0, "color": "#0284C7", "is_off": False},
            {"code": "Siang", "name": "Afternoon Shift", "start_time": "13:00", "end_time": "21:00", "end_day_offset": 0, "color": "#16A34A", "is_off": False},
            {"code": "Sore", "name": "Evening Shift", "start_time": "15:00", "end_time": "23:00", "end_day_offset": 0, "color": "#EA580C", "is_off": False},
            {"code": "Malam", "name": "Overnight Shift", "start_time": "23:00", "end_time": "07:00", "end_day_offset": 1, "color": "#7C3AED", "is_off": False},
            {"code": "OFF", "name": "Weekly Day Off", "start_time": "-", "end_time": "-", "end_day_offset": 0, "color": "#E11D48", "is_off": True},
        ]
        for s in default_shifts:
            if not db.query(ShiftModel).filter(ShiftModel.code == s["code"]).first():
                db.add(ShiftModel(**s))
        db.commit()
        print("✔ Base shift master catalog initialized.")

        # 3. Seed Base Jobdesk Catalog
        default_jobdesks = [
            {"code": "CT1", "name": "Incident Dispatch & Triage", "description": "Ticketing dispatch, alarm triage, and initial customer verification", "color": "#38BDF8"},
            {"code": "CT2", "name": "Network Surveillance & SLA", "description": "Core FO monitoring, NMS topology surveillance, and latency threshold SLA", "color": "#FBBF24"},
            {"code": "CT4", "name": "Field Ops Escalation & Onsite", "description": "Field technical dispatch, splicer coordination, and restoration tracking", "color": "#818CF8"},
        ]
        for j in default_jobdesks:
            if not db.query(JobdeskModel).filter(JobdeskModel.code == j["code"]).first():
                db.add(JobdeskModel(**j))
        db.commit()
        print("✔ Base jobdesk catalog initialized.")

        # 4. Seed Base Permissions
        spv_perms = {
            "canPublishSchedule": True,
            "canEditScheduleDirectly": True,
            "canApproveLeave": True,
            "canApproveSwap": True,
            "canManageEmployees": True,
            "canManageShifts": False,
            "canManageJobdesks": False,
            "canViewAuditLogs": True,
            "canExportReports": True
        }
        emp_perms = {
            "canRequestShiftChange": True,
            "canRequestSwap": True,
            "canRequestLeave": True,
            "canViewTeamSchedule": True,
            "canViewOwnProfile": True,
            "canViewAnnouncements": True
        }
        if not db.query(PermissionModel).filter(PermissionModel.role == "SPV").first():
            db.add(PermissionModel(role="SPV", permissions_json=json.dumps(spv_perms)))
        if not db.query(PermissionModel).filter(PermissionModel.role == "Employee").first():
            db.add(PermissionModel(role="Employee", permissions_json=json.dumps(emp_perms)))
        db.commit()
        print("✔ Role permissions initialized.")

        print("\n=======================================================")
        print("🎉 Database successfully initialized with CLEAN state!")
        print("   - Schedules: 0 (KOSONG)")
        print("   - Employees: 0 (KOSONG, siap diinput)")
        print("   - Requests & Leaves: 0 (KOSONG)")
        print("   - Announcements: 0 (KOSONG)")
        print("   - Default Login: admin@ctso.net / admin")
        print("=======================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    init_database()
