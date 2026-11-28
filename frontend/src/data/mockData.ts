import {
  User,
  Team,
  LocationItem,
  ShiftMasterItem,
  JobdeskItem,
  EmployeeItem,
  ScheduleAssignment,
  ScheduleHistoryItem,
  ActivityLogItem,
  RosterChangeRequest,
  LeaveRecord,
  NotificationItem,
  AnnouncementItem,
  SpvPermissionConfig,
  EmployeePermissionConfig
} from '../types';

export const INITIAL_LOCATIONS: LocationItem[] = [
  {
    id: 'loc_badung',
    code: 'BADUNG',
    name: 'Badung',
    address: 'Gedung Operasional CTSO, Jl. Sunset Road No. 88, Badung, Bali',
    status: 'active'
  },
  {
    id: 'loc_denpasar',
    code: 'DENPASAR',
    name: 'Denpasar',
    address: 'Hub Operasional CTSO, Jl. Teuku Umar No. 120, Denpasar, Bali',
    status: 'active'
  }
];

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'team_core',
    code: 'TM-CORE',
    name: 'Team Core Network Ops',
    description: 'Pengawasan dan penanganan insiden jaringan inti & transmission gateway.',
    spvUserId: 'usr_spv_badung',
    status: 'active'
  },
  {
    id: 'team_surveillance',
    code: 'TM-SURV',
    name: 'Team Surveillance & SLA',
    description: 'Pemantauan real-time alarm network dan kepatuhan target SLA pelanggan.',
    spvUserId: 'usr_spv_denpasar',
    status: 'active'
  },
  {
    id: 'team_fop',
    code: 'TM-FOP',
    name: 'Team Field Escalation',
    description: 'Koordinasi teknisi lapangan dan eskalasi penanganan fiber optic outdoor.',
    spvUserId: 'usr_spv_badung',
    status: 'active'
  }
];

// PRD Section 5.1: Default Shift Codes
export const INITIAL_SHIFTS: ShiftMasterItem[] = [
  {
    id: 'sh_p7',
    code: 'Pagi 7',
    name: 'Pagi 7 (Early Morning)',
    startTime: '07:00',
    endTime: '15:00',
    endDayOffset: 0,
    color: '#0284C7', // Sky Blue (Synchronized with CT1)
    textColor: 'text-sky-700',
    bgLight: 'bg-sky-50 border-sky-200',
    isOff: false,
    order: 1,
    note: 'Shift pagi awal CTSO desk',
    status: 'active'
  },
  {
    id: 'sh_p8',
    code: 'Pagi 8',
    name: 'Pagi 8 (Standard Morning)',
    startTime: '08:00',
    endTime: '16:00',
    endDayOffset: 0,
    color: '#0284C7', // Sky Blue (Synchronized with CT1)
    textColor: 'text-sky-700',
    bgLight: 'bg-sky-50 border-sky-200',
    isOff: false,
    order: 2,
    note: 'Shift pagi reguler',
    status: 'active'
  },
  {
    id: 'sh_siang',
    code: 'Siang',
    name: 'Siang (Midday Shift)',
    startTime: '13:00',
    endTime: '21:00',
    endDayOffset: 0,
    color: '#0D9488', // Emerald Green
    textColor: 'text-emerald-700',
    bgLight: 'bg-emerald-50 border-emerald-200',
    isOff: false,
    order: 3,
    note: 'Shift siang handover traffic peak',
    status: 'active'
  },
  {
    id: 'sh_sore',
    code: 'Sore',
    name: 'Sore (Evening Shift)',
    startTime: '15:00',
    endTime: '23:00',
    endDayOffset: 0,
    color: '#D97706', // Amber Gold (Synchronized with CT2)
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50 border-amber-200',
    isOff: false,
    order: 4,
    note: 'Shift sore pengawasan beban puncak malam',
    status: 'active'
  },
  {
    id: 'sh_malam',
    code: 'Malam',
    name: 'Malam (Overnight Shift)',
    startTime: '23:00',
    endTime: '07:00',
    endDayOffset: 1, // Lintas tanggal berikutnya (+1 day)
    color: '#4F46E5', // Deep Indigo (Synchronized with CT4)
    textColor: 'text-indigo-700',
    bgLight: 'bg-indigo-50 border-indigo-200',
    isOff: false,
    order: 5,
    note: 'Shift malam lintas pergantian tanggal',
    status: 'active'
  },
  {
    id: 'sh_off',
    code: 'OFF',
    name: 'Off Day (Libur)',
    startTime: '00:00',
    endTime: '00:00',
    endDayOffset: 0,
    color: '#E11D48', // Soft Rose
    textColor: 'text-rose-700',
    bgLight: 'bg-rose-50 border-rose-200',
    isOff: true,
    order: 6,
    note: 'Karyawan libur; wajib tanpa jobdesk & tidak dihitung bekerja',
    status: 'active'
  },
  {
    id: 'sh_cuti',
    code: 'Cuti',
    name: 'Cuti Tahunan',
    startTime: '00:00',
    endTime: '00:00',
    endDayOffset: 0,
    color: '#8B5CF6', // Purple/Violet
    textColor: 'text-purple-700',
    bgLight: 'bg-purple-50 border-purple-200',
    isOff: true,
    order: 7,
    note: 'Cuti tahunan yang telah disetujui',
    status: 'active'
  },
  {
    id: 'sh_sakit',
    code: 'Sakit',
    name: 'Ijin Sakit',
    startTime: '00:00',
    endTime: '00:00',
    endDayOffset: 0,
    color: '#EC4899', // Pink
    textColor: 'text-pink-700',
    bgLight: 'bg-pink-50 border-pink-200',
    isOff: true,
    order: 8,
    note: 'Ijin sakit dengan surat keterangan dokter',
    status: 'active'
  },
  {
    id: 'sh_ijin',
    code: 'Ijin',
    name: 'Ijin Khusus',
    startTime: '00:00',
    endTime: '00:00',
    endDayOffset: 0,
    color: '#F59E0B', // Amber
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50 border-amber-200',
    isOff: true,
    order: 9,
    note: 'Ijin khusus atau keperluan mendesak',
    status: 'active'
  }
];

// PRD Section 6: Default Jobdesk Codes (CT1, CT2, CT4) - Interconnected with Shift Color Hierarchy
export const INITIAL_JOBDESKS: JobdeskItem[] = [
  {
    id: 'jd_ct1',
    code: 'CT1',
    name: 'First-Line Incident & Dispatch',
    description: 'Penanganan komplain tingkat pertama, validasi tiket insiden, dan dispatch awal.',
    color: '#0284C7', // Sky Blue (Synchronized with Pagi 7 & Pagi 8)
    order: 1,
    status: 'active'
  },
  {
    id: 'jd_ct2',
    code: 'CT2',
    name: 'Network Surveillance & Quality',
    description: 'Monitoring traffic metro ethernet, status backbone microwave/FO, dan kualitas link SLA.',
    color: '#D97706', // Amber Gold (Synchronized with Sore / Middle)
    order: 2,
    status: 'active'
  },
  {
    id: 'jd_ct4',
    code: 'CT4',
    name: 'Field Escalation & Coordinator',
    description: 'Eskalasi kendala ke teknisi lapangan (FOP), koordinasi pemadaman darurat, dan logistik perbaikan.',
    color: '#4F46E5', // Deep Indigo (Synchronized with Malam)
    order: 3,
    status: 'active'
  }
];

// Realistic Balinese & Indonesian CTSO Employees
export const INITIAL_EMPLOYEES: EmployeeItem[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    userId: 'CTSO-ADMIN',
    employeeId: 'emp_admin',
    name: 'Administrator',
    email: 'admin@ctso.net',
    role: 'Admin',
    status: 'active',
    teamId: 'team_core',
    teamName: 'Team Core Network Ops',
    department: 'Central IT & Operations',
    avatarText: 'AD',
    phone: '0812-0000-0001',
    createdAt: '2026-11-15T00:00:00Z',
    lastLogin: 'Never',
    password: 'admin123'
  }
];

export const INITIAL_SCHEDULES: ScheduleAssignment[] = [];

export const INITIAL_REQUESTS: RosterChangeRequest[] = [];

export const INITIAL_LEAVES: LeaveRecord[] = [];

export const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_SCHEDULE_HISTORIES: ScheduleHistoryItem[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [];

export const INITIAL_SPV_PERMISSION: SpvPermissionConfig = {
  canViewDraft: true,
  canEditSchedule: true,
  canPublishSchedule: true,
  canManageJobdesk: true,
  canApproveRequest: true,
  canApproveLeave: true,
  canManageAnnouncement: true,
  canExportReport: true,
  teamScopeIds: ['team_core', 'team_fop']
};

export const INITIAL_EMPLOYEE_PERMISSION: EmployeePermissionConfig = {
  canViewSchedule: true,
  canRequestSwap: true,
  canRespondSwap: true,
  canApplyLeave: true,
  canViewJobdesk: true,
  canViewAnnouncements: true,
  canDownloadSchedule: true
};
