from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Auth
class LoginRequest(BaseModel):
    email: str
    password: str

class PasswordUpdate(BaseModel):
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str = "Employee"
    employee_id: Optional[str] = None

# Employee
class EmployeeCreate(BaseModel):
    employee_no: str
    name: str
    nickname: Optional[str] = None
    gender: Optional[str] = "male"
    role: str = "Employee"
    level: Optional[str] = "Junior"
    status: str = "active"
    default_location: str = "Badung"
    email: Optional[str] = None
    phone: Optional[str] = None

class EmployeeUpdate(BaseModel):
    employee_no: Optional[str] = None
    name: Optional[str] = None
    nickname: Optional[str] = None
    gender: Optional[str] = None
    role: Optional[str] = None
    level: Optional[str] = None
    status: Optional[str] = None
    default_location: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

# Shift
class ShiftCreate(BaseModel):
    code: str
    name: str
    start_time: str
    end_time: str
    end_day_offset: int = 0
    color: str = "#F9C900"
    is_off: bool = False
    is_active: bool = True

class ShiftUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    end_day_offset: Optional[int] = None
    color: Optional[str] = None
    is_off: Optional[bool] = None
    is_active: Optional[bool] = None

# Jobdesk
class JobdeskCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    color: str = "#38BDF8"
    is_active: bool = True

class JobdeskUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

# Schedule
class ScheduleCreate(BaseModel):
    employee_id: str
    employee_name: str
    employee_code: str
    date: str
    shift_code: str
    jobdesk_code: Optional[str] = None
    location: Optional[str] = None
    agent: Optional[str] = None
    publication_status: str = "Draft"
    note: Optional[str] = None

class ScheduleUpdate(BaseModel):
    shift_code: Optional[str] = None
    shiftCode: Optional[str] = None
    jobdesk_code: Optional[str] = None
    jobdeskCode: Optional[str] = None
    location: Optional[str] = None
    agent: Optional[str] = None
    publication_status: Optional[str] = None
    publicationStatus: Optional[str] = None
    note: Optional[str] = None

class BulkScheduleCreate(BaseModel):
    employee_ids: list[str]
    start_date: str
    end_date: str
    shift_code: str
    jobdesk_code: Optional[str] = None
    location: Optional[str] = None
    publication_status: str = "Draft"

# Roster Request
class RosterRequestCreate(BaseModel):
    request_type: str
    requester_employee_id: str
    requester_name: str
    replacement_employee_id: Optional[str] = None
    replacement_name: Optional[str] = None
    work_date: str
    requested_shift: Optional[str] = None
    requested_jobdesk: Optional[str] = None
    reason: str

# Leave Record
class LeaveCreate(BaseModel):
    employee_id: str
    employee_name: str
    type: str
    start_date: str
    end_date: str
    reason: str

# Announcement
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "Normal"
    status: str = "Published"
    author_name: str

# Activity Log
class ActivityLogCreate(BaseModel):
    user_name: str
    user_role: str
    action: str
    details: str
    ip_address: Optional[str] = "127.0.0.1"

# Holiday
class HolidayCreate(BaseModel):
    date: str
    name: str
