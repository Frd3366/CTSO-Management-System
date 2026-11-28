export type UserRole = 'Admin' | 'SPV' | 'Employee' | 'Administrator' | 'Operator';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type WorkLocation = 'Badung' | 'Denpasar';

export interface User {
  id: string;
  userId: string;
  employeeId?: string;
  name: string;
  email: string;
  role: 'Admin' | 'SPV' | 'Employee';
  status: UserStatus;
  teamId?: string;
  teamName?: string;
  department?: string;
  avatarText?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  lastLogin: string;
  password?: string;
}

export interface Team {
  id: string;
  code: string;
  name: string;
  description: string;
  spvUserId?: string;
  status: 'active' | 'inactive';
}

export interface LocationItem {
  id: string;
  code: string;
  name: WorkLocation;
  address: string;
  status: 'active' | 'inactive';
}

// Master Shift Code (PRD Section 5.1 & 7.3)
export interface ShiftMasterItem {
  id: string;
  code: string; // Pagi 7, Pagi 8, Siang, Sore, Malam, OFF
  name: string;
  startTime: string; // e.g. "07:00"
  endTime: string; // e.g. "15:00"
  endDayOffset: number; // 0 for same day, 1 for next day (Malam)
  color: string;
  textColor?: string;
  bgLight?: string;
  isOff: boolean;
  order: number;
  note: string;
  status: 'active' | 'inactive';
}

// Master Jobdesk Code (PRD Section 6 & 7.4)
export interface JobdeskItem {
  id: string;
  code: string; // CT1, CT2, CT4
  name: string;
  description: string;
  color: string;
  textColor?: string;
  order: number;
  status: 'active' | 'inactive';
}

// Unified Roster Source of Truth (PRD Section 1.3, 5, 6, 18.2)
export interface ScheduleAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  teamId?: string;
  teamName?: string;
  date: string; // YYYY-MM-DD (WITA)
  shiftCode: string; // Pagi 7, Pagi 8, Siang, Sore, Malam, OFF
  shiftId?: string;
  jobdeskCode?: string; // CT1, CT2, CT4 (empty string or undefined if shift is OFF)
  jobdeskId?: string;
  location?: WorkLocation; // Badung or Denpasar (undefined if shift is OFF)
  agent?: string; // Optional assigned agent tag (e.g. Agent 1, Agent 2)
  publicationStatus: 'Draft' | 'Published'; // Draft only visible to Admin/SPV
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Employee Master (PRD Section 7.1)
export interface EmployeeItem {
  id: string;
  employeeNo: string; // e.g. CTSO-101
  employeeId?: string;
  name: string;
  nickname?: string;
  gender?: 'male' | 'female';
  level: string; // e.g. Lead Operations, Senior Specialist, Technician, NOC Engineer
  email: string;
  phone: string;
  teamId?: string;
  teamName?: string;
  defaultLocation: WorkLocation;
  defaultJobdesk?: string;
  status: 'active' | 'inactive';
  role: 'Admin' | 'SPV' | 'Employee';
  joinDate: string;
  avatarText?: string;
}

// Schedule History (PRD Section 11.2 & 11.3)
export interface ScheduleHistoryItem {
  id: string;
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'SWAP';
  beforeData: {
    shiftCode?: string;
    jobdeskCode?: string;
    location?: string;
    publicationStatus?: string;
  } | null;
  afterData: {
    shiftCode?: string;
    jobdeskCode?: string;
    location?: string;
    publicationStatus?: string;
  } | null;
  changedByUserId: string;
  changedByName: string;
  changedAt: string; // WITA string e.g. "15 Nov 2026, 08:30:00 WITA"
  timestamp: number;
}

// Activity Log (PRD Section 11.1 - IMMUTABLE AUDIT TRAIL)
export interface ActivityLogItem {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: 'Admin' | 'SPV' | 'Employee';
  teamId?: string;
  teamName?: string;
  action: string;
  entityType: 'schedule' | 'request' | 'leave' | 'employee' | 'account' | 'permission' | 'announcement' | 'history' | 'auth';
  entityId?: string;
  description: string;
  ipAddress?: string;
  status: 'Success' | 'Failed';
  createdAt: string; // WITA formatted
  timestamp: number;
}

// Roster Change Request & Shift Exchange (PRD Section 8)
export type RequestType = 'Change Shift' | 'Shift Exchange' | 'Jobdesk Change';
export type RequestStatus = 'Pending Replacement' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Cancelled';

export interface RosterChangeRequest {
  id: string;
  requestType: RequestType;
  requesterEmployeeId: string;
  requesterName: string;
  workDate: string;
  // Current values
  currentShift: string;
  currentJobdesk?: string;
  currentLocation?: WorkLocation;
  // Requested values
  requestedShift?: string;
  requestedJobdesk?: string;
  requestedLocation?: WorkLocation;
  // For Shift Exchange (Tukar Shift)
  replacementEmployeeId?: string;
  replacementName?: string;
  replacementCurrentShift?: string;
  replacementConsentStatus: 'None' | 'Pending' | 'Accepted' | 'Rejected';
  status: RequestStatus;
  reason: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// Cuti dan Izin (PRD Section 9)
export type LeaveType = 'Cuti Tahunan' | 'Izin Sakit' | 'Izin Khusus' | 'Cuti Melahirkan' | 'Izin Menikah';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// Notification Center Item (PRD Section 10.2)
export type NotificationType =
  | 'schedule_change'
  | 'jobdesk_change'
  | 'swap_request'
  | 'swap_consent'
  | 'swap_approved'
  | 'leave_status'
  | 'announcement'
  | 'system';

export interface NotificationItem {
  id: string;
  targetUserId?: string; // if empty, visible to all
  targetRole?: 'Admin' | 'SPV' | 'Employee' | 'all';
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  linkPath?: string;
  createdAt: string;
  timestamp: number;
}

// Announcement (PRD Section 10.3)
export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  publishDate: string;
  targetType: 'all' | 'team';
  targetTeamIds: string[];
  status: 'Draft' | 'Published' | 'Archived';
  authorName: string;
  createdAt: string;
}

// SPV Permission Rule (PRD Section 2.2, 2.4, 7.5)
export interface SpvPermissionConfig {
  canViewDraft: boolean;
  canEditSchedule: boolean;
  canPublishSchedule: boolean;
  canManageJobdesk: boolean;
  canApproveRequest: boolean;
  canApproveLeave: boolean;
  canManageAnnouncement: boolean;
  canExportReport: boolean;
  teamScopeIds: string[]; // Team IDs this SPV is authorized to oversee
}

// Employee Permission Rule
export interface EmployeePermissionConfig {
  canViewSchedule: boolean;
  canRequestSwap: boolean;
  canRespondSwap: boolean;
  canApplyLeave: boolean;
  canViewJobdesk: boolean;
  canViewAnnouncements: boolean;
  canDownloadSchedule: boolean;
}

// Toast System (PRD Section 10.1)
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number; // default 3000ms per PRD 10.1
  createdAt: number;
  expiresAt: number;
}
