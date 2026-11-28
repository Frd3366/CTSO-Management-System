from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from datetime import datetime
import uuid
from .database import Base

def gen_uuid():
    return str(uuid.uuid4())

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="Employee")  # Admin, SPV, Employee
    employee_id = Column(String, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmployeeModel(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_no = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    gender = Column(String, nullable=True, default="male")  # male, female
    role = Column(String, nullable=False, default="Employee")
    level = Column(String, nullable=True, default="Junior")
    status = Column(String, default="active")  # active, inactive
    default_location = Column(String, default="Badung")  # Badung, Denpasar, Bandung
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ShiftModel(Base):
    __tablename__ = "shift_master"

    id = Column(String, primary_key=True, default=gen_uuid)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    end_day_offset = Column(Integer, default=0)
    color = Column(String, default="#F9C900")
    is_off = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

class JobdeskModel(Base):
    __tablename__ = "jobdesk_master"

    id = Column(String, primary_key=True, default=gen_uuid)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#38BDF8")
    is_active = Column(Boolean, default=True)

class ScheduleModel(Base):
    __tablename__ = "schedules"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, index=True, nullable=False)
    employee_name = Column(String, nullable=False)
    employee_code = Column(String, nullable=False)
    date = Column(String, index=True, nullable=False)  # YYYY-MM-DD
    shift_code = Column(String, nullable=False)
    jobdesk_code = Column(String, nullable=True)
    location = Column(String, nullable=True, default=None)
    agent = Column(String, nullable=True)
    publication_status = Column(String, default="Draft")  # Draft, Published
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScheduleHistoryModel(Base):
    __tablename__ = "schedule_histories"

    id = Column(String, primary_key=True, default=gen_uuid)
    schedule_id = Column(String, index=True, nullable=False)
    employee_name = Column(String, nullable=False)
    date = Column(String, nullable=False)
    modified_by = Column(String, nullable=False)
    action_type = Column(String, nullable=False)  # create, update, delete, bulk_assign, publish
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class RosterRequestModel(Base):
    __tablename__ = "roster_requests"

    id = Column(String, primary_key=True, default=gen_uuid)
    request_type = Column(String, nullable=False)  # Shift Exchange, Change Shift, Jobdesk Change
    requester_employee_id = Column(String, nullable=False)
    requester_name = Column(String, nullable=False)
    replacement_employee_id = Column(String, nullable=True)
    replacement_name = Column(String, nullable=True)
    work_date = Column(String, nullable=False)
    requested_shift = Column(String, nullable=True)
    requested_jobdesk = Column(String, nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String, default="Pending Approval")  # Pending Replacement, Pending Approval, Approved, Rejected, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

class LeaveModel(Base):
    __tablename__ = "leave_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, nullable=False)
    employee_name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Cuti Tahunan, Izin Sakit, Izin Khusus
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String, default="Pending")  # Pending, Approved, Rejected, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

class AnnouncementModel(Base):
    __tablename__ = "announcements"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String, default="Normal")  # Urgent, Normal, Info
    status = Column(String, default="Published")  # Published, Draft, Archived
    author_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ActivityLogModel(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_name = Column(String, nullable=False)
    user_role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, default="127.0.0.1")

class HolidayModel(Base):
    __tablename__ = "holidays"

    date = Column(String, primary_key=True)  # YYYY-MM-DD
    name = Column(String, nullable=False)

class PermissionModel(Base):
    __tablename__ = "role_permissions"

    role = Column(String, primary_key=True)  # SPV, Employee
    permissions_json = Column(Text, nullable=False)
