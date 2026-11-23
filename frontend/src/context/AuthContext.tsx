import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import {
  User,
  EmployeeItem,
  ShiftMasterItem,
  JobdeskItem,
  ScheduleAssignment,
  ScheduleHistoryItem,
  ActivityLogItem,
  RosterChangeRequest,
  LeaveRecord,
  NotificationItem,
  AnnouncementItem,
  SpvPermissionConfig,
  EmployeePermissionConfig,
  Team,
  LocationItem,
  WorkLocation
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_EMPLOYEES,
  INITIAL_SHIFTS,
  INITIAL_JOBDESKS,
  INITIAL_LOCATIONS,
  INITIAL_TEAMS,
  INITIAL_SCHEDULES,
  INITIAL_REQUESTS,
  INITIAL_LEAVES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SCHEDULE_HISTORIES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_SPV_PERMISSION,
  INITIAL_EMPLOYEE_PERMISSION
} from '../data/mockData';
import { syncDynamicStyles } from '../utils/codeStyles';
import { getGoogleSheetsConfig, executeGoogleSheetsBackup } from '../utils/googleSheetsBackup';
import { parseLocalDate, formatLocalDateIso } from '../utils/dateUtils';

interface AuthContextType {
  currentUser: User | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  switchUserRole: (role: 'Admin' | 'SPV' | 'Employee') => void;
  login: (emailOrUserNo: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<boolean>;

  // Master Data
  employees: EmployeeItem[];
  shifts: ShiftMasterItem[];
  jobdesks: JobdeskItem[];
  teams: Team[];
  locations: LocationItem[];
  spvPermissions: SpvPermissionConfig;
  employeePermissions: EmployeePermissionConfig;

  // Single Source of Truth Roster
  schedules: ScheduleAssignment[];
  scheduleHistories: ScheduleHistoryItem[];
  activityLogs: ActivityLogItem[];
  requests: RosterChangeRequest[];
  leaves: LeaveRecord[];
  notifications: NotificationItem[];
  announcements: AnnouncementItem[];

  // Mutators & Operations
  addSchedule: (assignment: Omit<ScheduleAssignment, 'id'>) => { success: boolean; error?: string };
  updateSchedule: (id: string, assignment: Partial<ScheduleAssignment>) => { success: boolean; error?: string };
  deleteSchedule: (id: string) => boolean;
  publishSchedule: (targetDate?: string, targetId?: string) => { count: number };
  bulkAssignSchedule: (
    employeeIds: string[],
    dates: string[],
    shiftCode: string,
    jobdeskCode?: string,
    location?: WorkLocation
  ) => { success: boolean; count: number; errors: string[] };
  copyPreviousSchedule: (sourceRange: 'yesterday' | 'last_week', targetDate: string) => { count: number };
  autoGenerateSchedule: (startDate: string, daysCount: number) => { count: number };

  // Schedule History Deletion (Admin Only - PRD 11.3)
  deleteScheduleHistories: (filter: { dateRange?: { start: string; end: string }; employeeId?: string; all?: boolean }) => number;

  // Audit Logs (Immutable)
  addActivityLog: (action: string, entityType: ActivityLogItem['entityType'], description: string, entityId?: string) => void;

  // Shift & Jobdesk Masters
  addShift: (shift: Omit<ShiftMasterItem, 'id'>) => void;
  updateShift: (id: string, shift: Partial<ShiftMasterItem>) => void;
  deleteShift: (id: string) => { success: boolean; error?: string };
  addJobdesk: (jobdesk: Omit<JobdeskItem, 'id'>) => void;
  updateJobdesk: (id: string, jobdesk: Partial<JobdeskItem>) => void;
  deleteJobdesk: (id: string) => { success: boolean; error?: string };

  // Employee Master
  addEmployee: (employee: Omit<EmployeeItem, 'id'>) => void;
  updateEmployee: (id: string, employee: Partial<EmployeeItem>) => void;
  deleteEmployee: (id: string) => { success: boolean; error?: string };

  // Workflow: Requests & Shift Exchange
  createRequest: (req: Omit<RosterChangeRequest, 'id' | 'createdAt' | 'status' | 'replacementConsentStatus'>) => void;
  respondReplacementConsent: (requestId: string, consent: 'Accepted' | 'Rejected') => void;
  approveRequest: (requestId: string) => { success: boolean; message: string };
  rejectRequest: (requestId: string, rejectionReason: string) => void;
  cancelRequest: (requestId: string) => void;

  // Workflow: Leaves
  createLeave: (leave: Omit<LeaveRecord, 'id' | 'createdAt' | 'status'>) => void;
  approveLeave: (leaveId: string) => void;
  rejectLeave: (leaveId: string) => void;
  cancelLeave: (leaveId: string) => void;

  // Notifications & Announcements
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  addAnnouncement: (ann: Omit<AnnouncementItem, 'id' | 'createdAt' | 'authorName'>) => void;
  updateAnnouncement: (id: string, ann: Partial<AnnouncementItem>) => void;
  updateSpvPermissions: (perms: Partial<SpvPermissionConfig>) => void;
  updateEmployeePermissions: (perms: Partial<EmployeePermissionConfig>) => void;

  // Central Database Sync
  syncToServer: () => Promise<{ success: boolean; message: string }>;

  // User Management & Registration
  users: User[];
  addUser: (user: Partial<User> & { password?: string }) => User;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => boolean;
  register: (
    name: string,
    email: string,
    password: string,
    role?: 'Admin' | 'SPV' | 'Employee',
    employeeNo?: string
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'ctso_cms_clean_v1_';
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 Jam (7,200,000 ms)

// Purge any legacy demo cached state from browser localStorage
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ctso_cms_v1_') || key.startsWith('ctso_cms_demo_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Storage purge error:', e);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local storage helper
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(`Failed to parse storage for ${key}`, e);
    }
    return fallback;
  };

  const saveState = (key: string, data: any) => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Failed to save storage for ${key}`, e);
    }
  };

  // State initialization: Check if active session exists and is still within 2 hours
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUserStr = localStorage.getItem(STORAGE_KEY_PREFIX + 'user');
      const sessionExpiryStr = localStorage.getItem(STORAGE_KEY_PREFIX + 'session_expires_at');
      if (savedUserStr && sessionExpiryStr) {
        const expiresAt = parseInt(sessionExpiryStr, 10);
        if (!isNaN(expiresAt) && Date.now() < expiresAt) {
          return JSON.parse(savedUserStr);
        }
      }
    } catch (e) {
      console.warn('Session check failed', e);
    }
    // Default null: User must log in first!
    return null;
  });
  const [users, setUsers] = useState<User[]>(() =>
    loadState<User[]>('users', INITIAL_USERS)
  );
  const [sessionId] = useState<string>(() => 'sess_wita_' + Math.random().toString(36).substring(2, 10));

  const [employees, setEmployees] = useState<EmployeeItem[]>(() =>
    loadState<EmployeeItem[]>('employees', INITIAL_EMPLOYEES)
  );
  const [shifts, setShifts] = useState<ShiftMasterItem[]>(() =>
    loadState<ShiftMasterItem[]>('shifts', INITIAL_SHIFTS)
  );
  const sortJobdesksByCode = (list: JobdeskItem[]): JobdeskItem[] =>
    [...list].sort((a, b) =>
      (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
    );

  const [jobdesks, setJobdesks] = useState<JobdeskItem[]>(() =>
    sortJobdesksByCode(loadState<JobdeskItem[]>('jobdesks', INITIAL_JOBDESKS))
  );
  const [teams] = useState<Team[]>(INITIAL_TEAMS);
  const [locations] = useState<LocationItem[]>(INITIAL_LOCATIONS);
  const [spvPermissions, setSpvPermissions] = useState<SpvPermissionConfig>(() =>
    loadState<SpvPermissionConfig>('spv_permissions', INITIAL_SPV_PERMISSION)
  );
  const [employeePermissions, setEmployeePermissions] = useState<EmployeePermissionConfig>(() =>
    loadState<EmployeePermissionConfig>('employee_permissions', INITIAL_EMPLOYEE_PERMISSION)
  );

  const [schedules, setSchedules] = useState<ScheduleAssignment[]>(() => {
    const loaded = loadState<ScheduleAssignment[]>('schedules', INITIAL_SCHEDULES);
    return loaded.map((s) => ({
      ...s,
      publicationStatus: 'Published' as const
    }));
  });
  const [scheduleHistories, setScheduleHistories] = useState<ScheduleHistoryItem[]>(() =>
    loadState<ScheduleHistoryItem[]>('schedule_histories', INITIAL_SCHEDULE_HISTORIES)
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() =>
    loadState<ActivityLogItem[]>('activity_logs', INITIAL_ACTIVITY_LOGS)
  );
  const [requests, setRequests] = useState<RosterChangeRequest[]>(() =>
    loadState<RosterChangeRequest[]>('requests', INITIAL_REQUESTS)
  );
  const [leaves, setLeaves] = useState<LeaveRecord[]>(() =>
    loadState<LeaveRecord[]>('leaves', INITIAL_LEAVES)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadState<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS)
  );
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() =>
    loadState<AnnouncementItem[]>('announcements', INITIAL_ANNOUNCEMENTS)
  );

  // Auto-sync back to localStorage on change (Secure: Plaintext passwords are never saved to localStorage)
  useEffect(() => {
    if (currentUser) {
      const { password, ...sanitizedUser } = currentUser as any;
      saveState('user', sanitizedUser);
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'session_expires_at');
        localStorage.removeItem('ctso_cms_token');
      } catch (e) {}
    }
  }, [currentUser]);

  useEffect(() => {
    const sanitizedUsers = users.map((u: any) => {
      const { password, ...safeUser } = u;
      return safeUser;
    });
    saveState('users', sanitizedUsers);
  }, [users]);
  useEffect(() => saveState('employees', employees), [employees]);
  useEffect(() => {
    saveState('shifts', shifts);
    syncDynamicStyles(shifts, jobdesks);
  }, [shifts, jobdesks]);
  useEffect(() => {
    saveState('jobdesks', jobdesks);
    syncDynamicStyles(shifts, jobdesks);
  }, [shifts, jobdesks]);
  useEffect(() => saveState('schedules', schedules), [schedules]);
  useEffect(() => saveState('schedule_histories', scheduleHistories), [scheduleHistories]);
  useEffect(() => saveState('activity_logs', activityLogs), [activityLogs]);
  useEffect(() => saveState('requests', requests), [requests]);
  useEffect(() => saveState('leaves', leaves), [leaves]);
  useEffect(() => saveState('notifications', notifications), [notifications]);
  useEffect(() => saveState('announcements', announcements), [announcements]);
  useEffect(() => saveState('spv_permissions', spvPermissions), [spvPermissions]);

  // Auto-purge orphaned schedule assignments (assignments belonging to deleted or non-existent employees)
  useEffect(() => {
    if (employees.length === 0) return;
    const validIds = new Set<string>();
    employees.forEach((e) => {
      if (e.id) validIds.add(e.id);
      if (e.employeeNo) validIds.add(e.employeeNo);
    });
    setSchedules((prev) => {
      const filtered = prev.filter(
        (s) => validIds.has(s.employeeId) || (s.employeeCode && validIds.has(s.employeeCode))
      );
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });
  }, [employees]);

  // Central Database Sync Function (Upload local to PostgreSQL)
  const syncToServer = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const isUp = await apiClient.isBackendAvailable();
      if (!isUp) {
        return { success: false, message: 'Server backend tidak dapat dihubungi.' };
      }
      const res = await apiClient.post<any>('/sync/push', {
        employees,
        shifts,
        jobdesks,
        schedules,
        announcements
      });
      if (res.success) {
        return { success: true, message: 'Data berhasil disinkronkan ke PostgreSQL database server!' };
      }
      return { success: false, message: res.error || 'Gagal sinkronisasi data.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Terjadi kesalahan sinkronisasi.' };
    }
  }, [employees, shifts, jobdesks, schedules, announcements]);

  // Fully Automated Central Database Synchronization (Zero manual buttons needed)
  const syncWithServer = useCallback(async () => {
    try {
      const isUp = await apiClient.isBackendAvailable();
      if (!isUp) return;

      const res = await apiClient.get<any>('/sync/pull', null);
      if (res && res.success) {
        const serverEmps = res.employees || [];
        const serverSchedules = res.schedules || [];
        const localEmps = loadState<EmployeeItem[]>('employees', []);
        const localSchedules = loadState<ScheduleAssignment[]>('schedules', []);

        // Sync users from backend if available
        if (res.users && Array.isArray(res.users) && res.users.length > 0) {
          setUsers((prev) => {
            const map = new Map<string, User>();
            prev.forEach((u) => map.set(u.email.toLowerCase(), u));
            res.users.forEach((su: any) => {
              const email = (su.email || '').toLowerCase();
              if (!email) return;
              const existing = map.get(email);
              map.set(email, {
                id: su.id || existing?.id || 'usr_' + Date.now(),
                userId: su.employeeId || existing?.userId || 'CTSO-ADMIN',
                employeeId: su.employeeId || existing?.employeeId,
                name: su.name || existing?.name || 'User',
                email: su.email,
                role: su.role || existing?.role || 'Employee',
                status: su.status || existing?.status || 'active',
                teamId: existing?.teamId || 'team_core',
                teamName: existing?.teamName || 'Team Core Network Ops',
                department: existing?.department || 'Operations',
                avatarText: (su.name || 'U').substring(0, 2).toUpperCase(),
                phone: existing?.phone || '-',
                createdAt: su.createdAt || existing?.createdAt || new Date().toISOString(),
                lastLogin: su.lastLogin || existing?.lastLogin || '',
                password: existing?.password || 'admin'
              });
            });
            return Array.from(map.values());
          });
        }

        // Case 1: Server already has central records -> sync directly into state!
        if (serverEmps.length > 0) {
          const localEmpMap = new Map(localEmps.map((le) => [le.id, le]));
          const mergedEmps = serverEmps.map((se: any) => {
            const localMatch = localEmpMap.get(se.id) || localEmps.find((le) => le.employeeNo === se.employeeNo);
            return {
              ...localMatch,
              ...se,
              level: se.level || localMatch?.level || 'Junior'
            };
          });
          setEmployees(mergedEmps);
          saveState('employees', mergedEmps);
          if (serverSchedules.length > 0) {
            setSchedules(serverSchedules);
            saveState('schedules', serverSchedules);
          }
          if (res.shifts && res.shifts.length > 0) {
            setShifts(res.shifts);
            saveState('shifts', res.shifts);
          }
          if (res.jobdesks && res.jobdesks.length > 0) {
            const sortedJds = sortJobdesksByCode(res.jobdesks);
            setJobdesks(sortedJds);
            saveState('jobdesks', sortedJds);
          }
          if (res.announcements && res.announcements.length > 0) {
            setAnnouncements(res.announcements);
            saveState('announcements', res.announcements);
          }
        }
        // Case 2: Server database is clean/empty, but current browser has local data -> auto-seed server PostgreSQL!
        else if (localEmps.length > 0 || localSchedules.length > 0) {
          await apiClient.post('/sync/push', {
            employees: localEmps,
            shifts: loadState('shifts', INITIAL_SHIFTS),
            jobdesks: loadState('jobdesks', INITIAL_JOBDESKS),
            schedules: localSchedules,
            announcements: loadState('announcements', [])
          });
        }
      }
    } catch (err) {
      console.warn('Auto sync failed:', err);
    }
  }, []);

  // Initial Auto-Sync on mount & on window focus (multi-device real-time sync)
  useEffect(() => {
    syncWithServer();

    const handleFocus = () => {
      syncWithServer();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [syncWithServer]);

  // Automated background push to PostgreSQL whenever any data changes (no manual click required)
  const syncTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (employees.length === 0 && schedules.length === 0) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const isUp = await apiClient.isBackendAvailable();
        if (isUp) {
          await apiClient.post('/sync/push', {
            users,
            employees,
            shifts,
            jobdesks,
            schedules,
            announcements
          });
        }
      } catch (e) {
        // Non-blocking fallback
      }
    }, 1200);
  }, [users, employees, shifts, jobdesks, schedules, announcements]);

  // Automated Google Sheets Backup Scheduler (Default every 1 hour / 60 mins)
  useEffect(() => {
    const checkAndRunBackup = () => {
      const cfg = getGoogleSheetsConfig();
      if (!cfg.enabled || !cfg.sheetUrl.trim()) return;
      const intervalMs = (cfg.intervalMinutes || 60) * 60 * 1000;
      const lastTs = cfg.lastBackupTimestamp || 0;
      if (Date.now() - lastTs >= intervalMs) {
        executeGoogleSheetsBackup({
          schedules,
          employees,
          shifts,
          jobdesks,
          requests,
          leaves
        });
      }
    };

    const timer = setInterval(checkAndRunBackup, 60 * 1000); // check every 1 minute
    window.addEventListener('cms_gsheets_config_updated', checkAndRunBackup);
    return () => {
      clearInterval(timer);
      window.removeEventListener('cms_gsheets_config_updated', checkAndRunBackup);
    };
  }, [schedules, employees, shifts, jobdesks, requests, leaves]);

  // WITA Formatted Date Helper
  const getNowWITAString = useCallback(() => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Makassar'
    }).format(new Date()) + ' WITA';
  }, []);

  // Immutable Activity Logger (PRD Section 11.1)
  const addActivityLog = useCallback(
    (action: string, entityType: ActivityLogItem['entityType'], description: string, entityId?: string) => {
      const now = Date.now();
      const newLog: ActivityLogItem = {
        id: `act_${now}_${Math.random().toString(36).substring(2, 6)}`,
        actorUserId: currentUser?.id || 'sys',
        actorName: currentUser?.name || 'Sistem',
        actorRole: currentUser?.role || 'Admin',
        teamId: currentUser?.teamId,
        teamName: currentUser?.teamName,
        action,
        entityType,
        entityId,
        description,
        ipAddress: '192.168.10.45',
        status: 'Success',
        createdAt: getNowWITAString(),
        timestamp: now
      };
      setActivityLogs((prev) => [newLog, ...prev].slice(0, 100));
    },
    [currentUser, getNowWITAString]
  );

  // Push Notification helper (PRD Section 10.2)
  const pushNotification = useCallback(
    (
      title: string,
      message: string,
      type: NotificationItem['type'] = 'system',
      targetRole: NotificationItem['targetRole'] = 'all',
      targetUserId?: string,
      linkPath?: string
    ) => {
      const newNotif: NotificationItem = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title,
        message,
        type,
        targetRole,
        targetUserId,
        linkPath,
        isRead: false,
        createdAt: getNowWITAString(),
        timestamp: Date.now()
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    [getNowWITAString]
  );

  // Role Switcher for persona testing
  const switchUserRole = useCallback(
    (role: 'Admin' | 'SPV' | 'Employee') => {
      if (role === 'Admin') {
        const adminUser = INITIAL_USERS[0];
        setCurrentUser(adminUser);
        addActivityLog('SWITCH_ROLE', 'auth', `Pengguna beralih mode profil ke Admin (${adminUser.name})`);
        return;
      }
      const emp = employees.find((e) => e.role === role);
      if (emp) {
        const userObj: User = {
          id: 'usr_' + emp.id,
          userId: emp.employeeNo,
          employeeId: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          status: emp.status,
          teamId: emp.teamId,
          teamName: emp.teamName,
          department: 'Operations',
          avatarText: emp.avatarText,
          phone: emp.phone,
          createdAt: new Date().toISOString(),
          lastLogin: 'Active Now'
        };
        setCurrentUser(userObj);
        addActivityLog('SWITCH_ROLE', 'auth', `Pengguna beralih mode profil ke ${role} (${userObj.name})`);
      } else {
        const fallbackUser: User = {
          id: 'usr_' + role.toLowerCase(),
          userId: `CTSO-${role.toUpperCase()}`,
          name: `${role} User`,
          email: `${role.toLowerCase()}@ctso.net`,
          role: role,
          status: 'active',
          teamId: 'team_core',
          teamName: 'Team Core Network Ops',
          department: 'Operations',
          avatarText: role.substring(0, 2).toUpperCase(),
          phone: '-',
          createdAt: new Date().toISOString(),
          lastLogin: 'Active Now'
        };
        setCurrentUser(fallbackUser);
        addActivityLog('SWITCH_ROLE', 'auth', `Pengguna beralih mode profil ke ${role}`);
      }
    },
    [employees, addActivityLog]
  );

  // User Management & Registration Functions
  const addUser = useCallback(
    (userData: Partial<User> & { password?: string }) => {
      const newId = userData.id || `usr_${Date.now()}`;
      const initials = (userData.name || 'User')
        .trim()
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const newUser: User = {
        id: newId,
        userId: userData.userId || `CTSO-${Math.floor(1000 + Math.random() * 9000)}`,
        employeeId: userData.employeeId,
        name: userData.name || 'User',
        email: userData.email?.trim().toLowerCase() || '',
        role: userData.role || 'Employee',
        status: userData.status || 'active',
        teamId: userData.teamId || 'team_core',
        teamName: userData.teamName || 'Team Core Network Ops',
        department: userData.department || 'Operations',
        avatarText: initials,
        phone: userData.phone || '-',
        createdAt: new Date().toISOString(),
        lastLogin: 'Belum pernah login',
        password: userData.password || 'admin'
      };

      setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id && u.email.toLowerCase() !== newUser.email.toLowerCase())]);

      // Asynchronously persist to backend PostgreSQL
      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp && newUser.email) {
          apiClient.post('/auth/users', {
            name: newUser.name,
            email: newUser.email,
            password: userData.password || 'admin',
            role: newUser.role,
            employee_id: newUser.employeeId || newUser.userId
          }).catch((e) => console.warn('Failed to sync user to backend', e));
        }
      });

      addActivityLog('CREATE_USER', 'auth', `Akun baru ${newUser.name} (${newUser.email}) dibuat dengan role ${newUser.role}`);
      return newUser;
    },
    [addActivityLog]
  );

  const updateUser = useCallback(
    (id: string, updatedData: Partial<User>) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updatedData } : u))
      );
      if (updatedData.password) {
        apiClient.isBackendAvailable().then((isUp) => {
          if (isUp) {
            apiClient.put(`/auth/users/${id}/password`, {
              new_password: updatedData.password
            }).catch((e) => console.warn('Failed to update password on backend', e));
          }
        });
      }
      addActivityLog('UPDATE_USER', 'auth', `Data akun ID ${id} diperbarui`);
    },
    [addActivityLog]
  );

  const deleteUser = useCallback(
    (id: string) => {
      const userToDelete = users.find((u) => u.id === id);
      if (userToDelete?.email === 'admin@ctso.net') {
        return false;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.delete(`/auth/users/${id}`).catch((e) => console.warn('Failed to delete user on backend', e));
        }
      });
      if (userToDelete) {
        addActivityLog('DELETE_USER', 'auth', `Akun ${userToDelete.name} (${userToDelete.email}) dihapus`);
      }
      return true;
    },
    [users, addActivityLog]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: 'Admin' | 'SPV' | 'Employee' = 'Employee',
      employeeNo?: string
    ) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanNameLower = cleanName.toLowerCase();

      if (!cleanName || !cleanEmail) {
        return { success: false, error: 'Nama lengkap dan email wajib diisi.' };
      }

      if (
        users.some((u) => (u.email || '').trim().toLowerCase() === cleanEmail) ||
        INITIAL_USERS.some((u) => (u.email || '').trim().toLowerCase() === cleanEmail) ||
        employees.some((e) => (e.email || '').trim().toLowerCase() === cleanEmail)
      ) {
        return { success: false, error: 'Email sudah terdaftar. Tidak boleh menggunakan email yang sama.' };
      }

      if (
        users.some((u) => (u.name || '').trim().toLowerCase() === cleanNameLower) ||
        INITIAL_USERS.some((u) => (u.name || '').trim().toLowerCase() === cleanNameLower) ||
        employees.some((e) => (e.name || '').trim().toLowerCase() === cleanNameLower)
      ) {
        return { success: false, error: 'Nama employee sudah terdaftar. Tidak boleh menggunakan nama yang sama.' };
      }

      const generatedEmpNo = employeeNo?.trim() || `CTSO-${Math.floor(1000 + Math.random() * 9000)}`;
      const newEmpId = `emp_${Date.now()}`;
      const initials = cleanName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      let backendUserId: string | undefined;

      // Validate & persist to backend PostgreSQL first when available
      try {
        const isUp = await apiClient.isBackendAvailable();
        if (isUp) {
          const res = await apiClient.post<any>('/auth/register', {
            name: cleanName,
            email: cleanEmail,
            password: password,
            role: role,
            employee_id: generatedEmpNo
          });
          if (!res.success) {
            return {
              success: false,
              error: res.error || 'Pendaftaran gagal. Email atau nama employee sudah terdaftar.'
            };
          }
          if (res.data?.user?.id) {
            backendUserId = res.data.user.id;
          }
        }
      } catch (err) {
        console.warn('Backend register sync warning:', err);
      }

      // Create employee item
      const newEmp: EmployeeItem = {
        id: newEmpId,
        employeeNo: generatedEmpNo,
        name: cleanName,
        level: role === 'Admin' ? 'Head' : role === 'SPV' ? 'SPV' : 'Junior',
        email: cleanEmail,
        phone: '-',
        teamId: 'team_core',
        teamName: 'Team Core Network Ops',
        defaultLocation: 'Badung',
        defaultJobdesk: undefined,
        status: 'active',
        role: role,
        joinDate: new Date().toISOString().split('T')[0],
        avatarText: initials
      };
      setEmployees((prev) => [newEmp, ...prev]);

      // Create user
      const newUser: User = {
        id: backendUserId || `usr_${Date.now()}`,
        userId: generatedEmpNo,
        employeeId: newEmpId,
        name: cleanName,
        email: cleanEmail,
        role: role,
        status: 'active',
        teamId: 'team_core',
        teamName: 'Team Core Network Ops',
        department: 'Operations',
        avatarText: initials,
        phone: '-',
        createdAt: new Date().toISOString(),
        lastLogin: '',
        password: password
      };

      setUsers((prev) => [newUser, ...prev]);

      addActivityLog('REGISTER_USER', 'auth', `Pendaftaran mandiri: ${newUser.name} (${cleanEmail}) terdaftar sebagai ${role}`);
      return { success: true, user: newUser };
    },
    [users, employees, addActivityLog]
  );

  const logout = useCallback(async () => {
    if (currentUser) {
      addActivityLog('LOGOUT', 'auth', `Pengguna ${currentUser.name} keluar dari sistem`);
    }
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'session_expires_at');
      localStorage.removeItem('ctso_cms_token');
    } catch (e) {}
    setCurrentUser(null);
    return true;
  }, [currentUser, addActivityLog]);

  // Session 2-Hour Timeout Monitor (PRD Security Policy)
  useEffect(() => {
    if (!currentUser) return;

    const checkSession = () => {
      try {
        const sessionExpiryStr = localStorage.getItem(STORAGE_KEY_PREFIX + 'session_expires_at');
        if (sessionExpiryStr) {
          const expiresAt = parseInt(sessionExpiryStr, 10);
          if (isNaN(expiresAt) || Date.now() >= expiresAt) {
            logout();
          }
        } else {
          logout();
        }
      } catch (e) {
        logout();
      }
    };

    // Check every 60 seconds and on browser focus
    const interval = setInterval(checkSession, 60000);
    window.addEventListener('focus', checkSession);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkSession);
    };
  }, [currentUser, logout]);

  const login = useCallback(
    async (emailOrUserNo: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      const cleanInput = emailOrUserNo?.trim().toLowerCase();
      if (!cleanInput) {
        return { success: false, error: 'Silakan masukkan email atau User ID Anda.' };
      }
      if (!password) {
        return { success: false, error: 'Silakan masukkan kata sandi Anda.' };
      }

      const startSession = (user: User, token?: string) => {
        const expiresAt = Date.now() + SESSION_DURATION_MS;
        const { password, ...sanitized } = user as any;
        try {
          localStorage.setItem(STORAGE_KEY_PREFIX + 'user', JSON.stringify(sanitized));
          localStorage.setItem(STORAGE_KEY_PREFIX + 'session_expires_at', String(expiresAt));
          if (token) {
            localStorage.setItem('ctso_cms_token', token);
          }
        } catch (e) {
          console.warn('Failed to save session', e);
        }
        setCurrentUser(sanitized as User);
      };

      // 1. Production Backend Authentication (PostgreSQL + JWT Token)
      try {
        const isBackendUp = await apiClient.isBackendAvailable();
        if (isBackendUp) {
          const res = await apiClient.post<{ access_token: string; user: any }>('/auth/login', {
            email: cleanInput,
            password: password
          });

          if (res.success && res.data?.access_token) {
            const backendUser = res.data.user;
            const loginTimeIso = backendUser.lastLogin || new Date().toISOString();
            const existingLocal = users.find(
              (u) => u.email.toLowerCase() === cleanInput || u.userId.toLowerCase() === cleanInput
            );
            const userToSet: User = existingLocal
              ? { ...existingLocal, role: backendUser.role || existingLocal.role, lastLogin: loginTimeIso }
              : {
                  id: backendUser.id || 'usr_' + Date.now(),
                  userId: backendUser.employeeId || 'CTSO-ADMIN',
                  employeeId: backendUser.employeeId,
                  name: backendUser.name || 'User',
                  email: backendUser.email || cleanInput,
                  role: backendUser.role || 'Admin',
                  status: 'active',
                  teamId: 'team_core',
                  teamName: 'Team Core Network Ops',
                  department: 'Operations',
                  avatarText: (backendUser.name || 'U').substring(0, 2).toUpperCase(),
                  phone: '-',
                  createdAt: new Date().toISOString(),
                  lastLogin: loginTimeIso
                };

            setUsers((prev) =>
              prev.map((u) =>
                u.email.toLowerCase() === userToSet.email.toLowerCase() || u.id === userToSet.id
                  ? { ...u, lastLogin: loginTimeIso }
                  : u
              )
            );
            startSession(userToSet, res.data.access_token);
            addActivityLog('LOGIN', 'auth', `Pengguna ${userToSet.name} (${userToSet.email}) login berhasil sebagai ${userToSet.role}`);
            return { success: true };
          } else if (res.error) {
            return {
              success: false,
              error: res.error || 'Username / Email atau Kata Sandi salah.'
            };
          }
        }
      } catch (err) {
        console.warn('Backend login error, attempting offline check', err);
      }

      // 2. Standalone / Offline Fallback Check
      let matchedUser = users.find(
        (u) =>
          u.email.toLowerCase() === cleanInput ||
          u.userId.toLowerCase() === cleanInput
      );

      if (!matchedUser && (cleanInput === 'admin@ctso.net' || cleanInput === 'ctso-admin' || cleanInput === 'admin')) {
        matchedUser = INITIAL_USERS[0];
      }

      if (!matchedUser) {
        return {
          success: false,
          error: 'Username / Email atau Kata Sandi salah. Akun tidak ditemukan.'
        };
      }

      if (matchedUser.status && matchedUser.status !== 'active') {
        return {
          success: false,
          error: 'Akun berstatus Inactive. Silakan hubungi Administrator.'
        };
      }

      const expectedPassword = (matchedUser as any).password || 'admin';
      if (password !== expectedPassword) {
        return {
          success: false,
          error: 'Username / Email atau Kata Sandi salah. Silakan periksa kembali.'
        };
      }

      const offlineLoginIso = new Date().toISOString();
      const updatedOfflineUser = { ...matchedUser, lastLogin: offlineLoginIso };
      setUsers((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === updatedOfflineUser.email.toLowerCase() || u.id === updatedOfflineUser.id
            ? { ...u, lastLogin: offlineLoginIso }
            : u
        )
      );
      startSession(updatedOfflineUser);
      addActivityLog('LOGIN', 'auth', `Pengguna ${updatedOfflineUser.name} (${updatedOfflineUser.email}) login berhasil (Offline Mode)`);
      return { success: true };
    },
    [users, addActivityLog]
  );

  // Validation Engine (PRD Section 5.7)
  const validateAssignment = useCallback(
    (
      empId: string,
      date: string,
      shiftCode: string,
      jobdeskCode?: string,
      location?: WorkLocation,
      publicationStatus: 'Draft' | 'Published' = 'Published',
      ignoreId?: string
    ): { valid: boolean; error?: string } => {
      // 1. Employee Active Check
      const emp = employees.find((e) => e.id === empId);
      if (!emp) return { valid: false, error: 'Data karyawan tidak ditemukan.' };
      if (emp.status === 'inactive') return { valid: false, error: 'Karyawan nonaktif tidak dapat diberi roster baru.' };

      // 2. Duplicate Assignment Check on same date
      const existing = schedules.find(
        (s) =>
          (s.employeeId === empId || s.employeeId === emp.employeeNo || s.employeeCode === emp.employeeNo) &&
          s.date === date &&
          s.id !== ignoreId
      );
      if (existing) {
        return { valid: false, error: `Karyawan ${emp.name} sudah memiliki assignment pada ${date} (${existing.shiftCode}).` };
      }

      // 3. Approved Leave Conflict Check
      const hasConflictLeave = leaves.some(
        (l) =>
          l.employeeId === empId &&
          l.status === 'Approved' &&
          date >= l.startDate &&
          date <= l.endDate
      );
      if (hasConflictLeave && shiftCode !== 'OFF') {
        return {
          valid: false,
          error: `Karyawan ${emp.name} memiliki Cuti/Izin yang telah disetujui pada tanggal ${date}.`
        };
      }

      // 4. OFF Rules
      if (shiftCode === 'OFF') {
        if (jobdeskCode && jobdeskCode.trim() !== '') {
          return { valid: false, error: 'Karyawan dengan shift OFF tidak boleh memiliki jobdesk.' };
        }
      }

      return { valid: true };
    },
    [employees, schedules, leaves]
  );

  // Add Schedule Assignment
  const addSchedule = useCallback(
    (assignment: Omit<ScheduleAssignment, 'id'>) => {
      const validation = validateAssignment(
        assignment.employeeId,
        assignment.date,
        assignment.shiftCode,
        assignment.jobdeskCode,
        assignment.location,
        assignment.publicationStatus
      );

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const emp = employees.find((e) => e.id === assignment.employeeId);
      const newId = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newRecord: ScheduleAssignment = {
        ...assignment,
        publicationStatus: 'Published',
        id: newId,
        employeeName: emp?.name || assignment.employeeName,
        employeeCode: emp?.employeeNo || assignment.employeeCode,
        teamId: emp?.teamId,
        teamName: emp?.teamName,
        updatedAt: getNowWITAString(),
        updatedBy: currentUser?.name
      };

      setSchedules((prev) => [...prev, newRecord]);

      // Schedule History snapshot (PRD 11.2)
      const histItem: ScheduleHistoryItem = {
        id: `hist_${Date.now()}`,
        assignmentId: newId,
        employeeId: newRecord.employeeId,
        employeeName: newRecord.employeeName,
        workDate: newRecord.date,
        action: 'CREATE',
        beforeData: null,
        afterData: {
          shiftCode: newRecord.shiftCode,
          jobdeskCode: newRecord.jobdeskCode,
          location: newRecord.location,
          publicationStatus: newRecord.publicationStatus
        },
        changedByUserId: currentUser?.id || 'sys',
        changedByName: currentUser?.name || 'Administrator',
        changedAt: getNowWITAString(),
        timestamp: Date.now()
      };
      setScheduleHistories((prev) => [histItem, ...prev]);

      addActivityLog(
        'CREATE_ROSTER',
        'schedule',
        `Menambah jadwal ${newRecord.employeeName} (${newRecord.date}) sebagai ${newRecord.shiftCode} [${newRecord.publicationStatus}]`,
        newId
      );

      return { success: true };
    },
    [validateAssignment, employees, getNowWITAString, currentUser, addActivityLog]
  );

  // Update Schedule Assignment
  const updateSchedule = useCallback(
    (id: string, updates: Partial<ScheduleAssignment>) => {
      const current = schedules.find((s) => s.id === id);
      if (!current) return { success: false, error: 'Assignment tidak ditemukan.' };

      const empId = updates.employeeId || current.employeeId;
      const date = updates.date || current.date;
      const shiftCode = updates.shiftCode || current.shiftCode;
      
      // Accurately detect if jobdeskCode is being updated (including clearing it to undefined/null)
      const hasJobdeskUpdate = 'jobdeskCode' in updates;
      const jobdeskCode = hasJobdeskUpdate ? (updates.jobdeskCode || undefined) : current.jobdeskCode;
      
      const location = updates.location !== undefined ? updates.location : current.location;
      const publicationStatus = updates.publicationStatus || current.publicationStatus;

      const validation = validateAssignment(empId, date, shiftCode, jobdeskCode, location, publicationStatus, id);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const beforeSnapshot = {
        shiftCode: current.shiftCode,
        jobdeskCode: current.jobdeskCode,
        location: current.location,
        publicationStatus: current.publicationStatus
      };

      const afterSnapshot = {
        shiftCode,
        jobdeskCode: shiftCode === 'OFF' ? undefined : jobdeskCode,
        location: shiftCode === 'OFF' ? undefined : location,
        publicationStatus
      };

      setSchedules((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated: ScheduleAssignment = {
            ...s,
            ...updates,
            shiftCode,
            jobdeskCode: afterSnapshot.jobdeskCode,
            location: afterSnapshot.location,
            agent: 'agent' in updates ? (updates.agent || undefined) : s.agent,
            publicationStatus,
            updatedAt: getNowWITAString(),
            updatedBy: currentUser?.name
          };
          if (!afterSnapshot.jobdeskCode) {
            delete updated.jobdeskCode;
          }
          if (!updated.agent) {
            delete updated.agent;
          }
          return updated;
        })
      );

      // Asynchronously update on server if online
      apiClient.put(`/schedules/${id}`, {
        shift_code: shiftCode,
        jobdesk_code: afterSnapshot.jobdeskCode || null,
        location: afterSnapshot.location || null,
        agent: updates.agent !== undefined ? (updates.agent || null) : (current.agent || null),
        publication_status: publicationStatus,
        note: updates.note !== undefined ? (updates.note || null) : (current.note || null)
      }).catch((err) => {
        console.warn('Backend schedule update error:', err);
      });

      // Record snapshot to Schedule History
      const histItem: ScheduleHistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assignmentId: id,
        employeeId: current.employeeId,
        employeeName: current.employeeName,
        workDate: date,
        action: updates.publicationStatus === 'Published' && current.publicationStatus === 'Draft' ? 'PUBLISH' : 'UPDATE',
        beforeData: beforeSnapshot,
        afterData: afterSnapshot,
        changedByUserId: currentUser?.id || 'sys',
        changedByName: currentUser?.name || 'Administrator',
        changedAt: getNowWITAString(),
        timestamp: Date.now()
      };
      setScheduleHistories((prev) => [histItem, ...prev]);

      addActivityLog(
        'UPDATE_ROSTER',
        'schedule',
        `Memperbarui jadwal ${current.employeeName} (${date}): ${beforeSnapshot.shiftCode} -> ${shiftCode}`,
        id
      );

      return { success: true };
    },
    [schedules, validateAssignment, getNowWITAString, currentUser, addActivityLog]
  );

  // Delete Schedule Assignment
  const deleteSchedule = useCallback(
    (id: string) => {
      const current = schedules.find((s) => s.id === id);
      if (!current) return false;

      // 1. Remove from local state immediately
      setSchedules((prev) => prev.filter((s) => s.id !== id));

      // 2. Remove from backend database immediately if online
      apiClient.delete(`/schedules/${id}`).catch((err) => {
        console.warn('Backend schedule delete error:', err);
      });

      // 3. Record snapshot to Schedule History
      const histItem: ScheduleHistoryItem = {
        id: `hist_${Date.now()}`,
        assignmentId: id,
        employeeId: current.employeeId,
        employeeName: current.employeeName,
        workDate: current.date,
        action: 'DELETE',
        beforeData: {
          shiftCode: current.shiftCode,
          jobdeskCode: current.jobdeskCode,
          location: current.location,
          publicationStatus: current.publicationStatus
        },
        afterData: null,
        changedByUserId: currentUser?.id || 'sys',
        changedByName: currentUser?.name || 'Administrator',
        changedAt: getNowWITAString(),
        timestamp: Date.now()
      };
      setScheduleHistories((prev) => [histItem, ...prev]);

      addActivityLog(
        'DELETE_ROSTER',
        'schedule',
        `Menghapus jadwal ${current.employeeName} pada tanggal ${current.date}`,
        id
      );
      return true;
    },
    [schedules, getNowWITAString, currentUser, addActivityLog]
  );

  // Publish Schedule (PRD Section 5.8)
  const publishSchedule = useCallback(
    (targetDate?: string, targetId?: string) => {
      let publishedCount = 0;
      setSchedules((prev) =>
        prev.map((s) => {
          const matchDate = !targetDate || s.date === targetDate;
          const matchId = !targetId || s.id === targetId;
          if (matchDate && matchId && s.publicationStatus === 'Draft') {
            publishedCount++;
            return {
              ...s,
              publicationStatus: 'Published',
              updatedAt: getNowWITAString(),
              updatedBy: currentUser?.name
            };
          }
          return s;
        })
      );

      if (publishedCount > 0) {
        addActivityLog(
          'PUBLISH_SCHEDULE',
          'schedule',
          `Mempublikasikan ${publishedCount} jadwal resmi ${targetDate ? `tanggal ${targetDate}` : ''}`,
          targetDate
        );
        pushNotification(
          'Jadwal Baru Dipublikasikan',
          `Roster kerja resmi ${targetDate ? `untuk ${targetDate}` : ''} telah dipublikasikan dan dapat diakses seluruh tim.`,
          'schedule_change',
          'all'
        );
      }
      return { count: publishedCount };
    },
    [getNowWITAString, currentUser, addActivityLog, pushNotification]
  );

  // Bulk Assignment (PRD Section 5.6)
  const bulkAssignSchedule = useCallback(
    (
      employeeIds: string[],
      dates: string[],
      shiftCode: string,
      jobdeskCode?: string,
      location?: WorkLocation
    ) => {
      const errors: string[] = [];
      let successCount = 0;

      employeeIds.forEach((empId) => {
        dates.forEach((date) => {
          const res = addSchedule({
            employeeId: empId,
            employeeName: employees.find((e) => e.id === empId)?.name || 'Karyawan',
            employeeCode: employees.find((e) => e.id === empId)?.employeeNo || 'CTSO',
            date,
            shiftCode,
            jobdeskCode: shiftCode === 'OFF' ? undefined : jobdeskCode,
            location: shiftCode === 'OFF' ? undefined : location,
            publicationStatus: 'Published'
          });

          if (res.success) {
            successCount++;
          } else if (res.error) {
            errors.push(res.error);
          }
        });
      });

      return { success: successCount > 0, count: successCount, errors };
    },
    [addSchedule, employees]
  );

  // Copy Previous Schedule (PRD Section 5.6)
  const copyPreviousSchedule = useCallback(
    (sourceRange: 'yesterday' | 'last_week', targetDate: string) => {
      // Calculate source date
      const targetObj = parseLocalDate(targetDate);
      const daysBack = sourceRange === 'yesterday' ? 1 : 7;
      targetObj.setDate(targetObj.getDate() - daysBack);
      const sourceDateStr = formatLocalDateIso(targetObj);

      const sourceItems = schedules.filter((s) => s.date === sourceDateStr);
      let count = 0;

      sourceItems.forEach((src) => {
        const res = addSchedule({
          employeeId: src.employeeId,
          employeeName: src.employeeName,
          employeeCode: src.employeeCode,
          date: targetDate,
          shiftCode: src.shiftCode,
          jobdeskCode: src.jobdeskCode,
          location: src.location,
          publicationStatus: 'Published'
        });
        if (res.success) count++;
      });

      addActivityLog(
        'COPY_SCHEDULE',
        'schedule',
        `Menyalin ${count} assignment dari ${sourceDateStr} ke ${targetDate} sebagai Draft.`
      );
      return { count };
    },
    [schedules, addSchedule, addActivityLog]
  );

  // Auto Generate Schedule (PRD Section 5.6 & 18.5)
  const autoGenerateSchedule = useCallback(
    (startDate: string, daysCount: number = 7) => {
      const activeEmps = employees.filter((e) => e.status === 'active');
      const standardShifts = ['Pagi 7', 'Pagi 8', 'Siang', 'Sore', 'Malam', 'OFF'];
      const standardJobdesks = ['CT1', 'CT2', 'CT4'];
      let count = 0;

      for (let day = 0; day < daysCount; day++) {
        const curDate = parseLocalDate(startDate);
        curDate.setDate(curDate.getDate() + day);
        const dateStr = formatLocalDateIso(curDate);

        activeEmps.forEach((emp, empIdx) => {
          // Check if already assigned
          const exists = schedules.some((s) => (s.employeeId === emp.id || s.employeeCode === emp.employeeNo) && s.date === dateStr);
          if (!exists) {
            // Predictable balanced rotation formula
            const shiftIdx = (empIdx + day) % standardShifts.length;
            const chosenShift = standardShifts[shiftIdx];
            const isOff = chosenShift === 'OFF';
            const chosenJobdesk = isOff ? undefined : standardJobdesks[(empIdx + day) % standardJobdesks.length];
            const chosenLoc: WorkLocation = empIdx % 2 === 0 ? 'Badung' : 'Denpasar';

            const res = addSchedule({
              employeeId: emp.id,
              employeeName: emp.name,
              employeeCode: emp.employeeNo,
              date: dateStr,
              shiftCode: chosenShift,
              jobdeskCode: chosenJobdesk,
              location: isOff ? undefined : chosenLoc,
              publicationStatus: 'Published'
            });
            if (res.success) count++;
          }
        });
      }

      addActivityLog(
        'AUTO_GENERATE_SCHEDULE',
        'schedule',
        `Automatic Generator menghasilkan ${count} assignment Draft untuk ${daysCount} hari dari ${startDate}`
      );
      return { count };
    },
    [employees, schedules, addSchedule, addActivityLog]
  );

  // Delete Schedule History (PRD Section 11.3 - ADMIN ONLY)
  const deleteScheduleHistories = useCallback(
    (filter: { dateRange?: { start: string; end: string }; employeeId?: string; all?: boolean }) => {
      if (currentUser?.role !== 'Admin') {
        throw new Error('Hanya Admin yang berwenang menghapus Schedule History.');
      }

      let removedCount = 0;
      setScheduleHistories((prev) => {
        const remaining = prev.filter((item) => {
          if (filter.all) {
            removedCount++;
            return false;
          }
          if (filter.employeeId && item.employeeId === filter.employeeId) {
            removedCount++;
            return false;
          }
          if (
            filter.dateRange &&
            item.workDate >= filter.dateRange.start &&
            item.workDate <= filter.dateRange.end
          ) {
            removedCount++;
            return false;
          }
          return true;
        });
        return remaining;
      });

      // IMMUTABLE Activity Log MUST record this deletion (PRD 11.3)
      addActivityLog(
        'DELETE_SCHEDULE_HISTORY',
        'history',
        `Admin ${currentUser.name} menghapus permanen ${removedCount} catatan Schedule History (${filter.all ? 'Semua' : filter.employeeId || 'Rentang Tanggal'})`
      );

      return removedCount;
    },
    [currentUser, addActivityLog]
  );

  // Workflows: Requests & Shift Exchange (PRD Section 8)
  const createRequest = useCallback(
    (req: Omit<RosterChangeRequest, 'id' | 'createdAt' | 'status' | 'replacementConsentStatus'>) => {
      const isExchange = req.requestType === 'Shift Exchange';
      const newReq: RosterChangeRequest = {
        ...req,
        id: `req_${Date.now()}`,
        status: 'Pending Approval',
        replacementConsentStatus: isExchange ? 'Accepted' : 'None',
        createdAt: getNowWITAString()
      };
      setRequests((prev) => [newReq, ...prev]);

      addActivityLog(
        'CREATE_REQUEST',
        'request',
        `${req.requesterName} mengajukan ${req.requestType} untuk tanggal ${req.workDate}`,
        newReq.id
      );

      if (isExchange && req.replacementEmployeeId) {
        pushNotification(
          'Permintaan Tukar Shift Masuk',
          `${req.requesterName} mengajukan pertukaran shift tanggal ${req.workDate} dengan Anda.`,
          'swap_request',
          'Employee',
          req.replacementEmployeeId,
          '/management/requests'
        );
      } else {
        pushNotification(
          'Pengajuan Request Baru',
          `${req.requesterName} mengajukan ${req.requestType} (${req.workDate}).`,
          'swap_request',
          'SPV',
          undefined,
          '/management/requests'
        );
      }
    },
    [getNowWITAString, addActivityLog, pushNotification]
  );

  const respondReplacementConsent = useCallback(
    (requestId: string, consent: 'Accepted' | 'Rejected') => {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === requestId) {
            const nextStatus: RosterChangeRequest['status'] =
              consent === 'Accepted' ? 'Pending Approval' : 'Rejected';
            return {
              ...r,
              replacementConsentStatus: consent,
              status: nextStatus
            };
          }
          return r;
        })
      );

      const target = requests.find((r) => r.id === requestId);
      addActivityLog(
        'REPLACEMENT_CONSENT',
        'request',
        `Rekan pengganti ${consent === 'Accepted' ? 'menyetujui' : 'menolak'} request tukar shift #${requestId}`,
        requestId
      );

      if (target) {
        pushNotification(
          consent === 'Accepted' ? 'Persetujuan Rekan Diterima' : 'Persetujuan Rekan Ditolak',
          `Rekan kerja Anda ${consent === 'Accepted' ? 'telah menyetujui' : 'menolak'} permintaan tukar shift tanggal ${target.workDate}.`,
          'swap_consent',
          'Employee',
          target.requesterEmployeeId,
          '/management/requests'
        );
      }
    },
    [requests, addActivityLog, pushNotification]
  );

  // Approve Request with ATOMIC SWAP for Shift Exchange (PRD Section 8.2 & 18.3)
  const approveRequest = useCallback(
    (requestId: string) => {
      const req = requests.find((r) => r.id === requestId);
      if (!req) return { success: false, message: 'Request tidak ditemukan.' };

      const nowStr = getNowWITAString();

      if (req.requestType === 'Shift Exchange') {
        const empA = employees.find((e) => e.id === req.requesterEmployeeId);
        const empB = employees.find((e) => e.id === req.replacementEmployeeId);
        let assignA = schedules.find((s) => s.employeeId === req.requesterEmployeeId && s.date === req.workDate);
        let assignB = schedules.find((s) => s.employeeId === req.replacementEmployeeId && s.date === req.workDate);

        let currentSchedules = [...schedules];

        if (!assignA) {
          assignA = {
            id: `sched_swap_${Date.now()}_a`,
            employeeId: req.requesterEmployeeId,
            employeeName: req.requesterName,
            employeeCode: empA?.employeeNo || 'CTSO-0000',
            date: req.workDate,
            shiftCode: req.currentShift || 'Pagi 7',
            jobdeskCode: empA?.defaultJobdesk || 'CT1',
            location: empA?.defaultLocation || 'Badung',
            publicationStatus: 'Published',
            createdAt: nowStr,
            createdBy: currentUser?.name || 'Approver',
            updatedAt: nowStr
          };
          currentSchedules.push(assignA);
        }

        if (!assignB) {
          assignB = {
            id: `sched_swap_${Date.now()}_b`,
            employeeId: req.replacementEmployeeId,
            employeeName: req.replacementName || empB?.name || 'Staff',
            employeeCode: empB?.employeeNo || 'CTSO-0000',
            date: req.workDate,
            shiftCode: req.requestedShift || 'Pagi 8',
            jobdeskCode: empB?.defaultJobdesk || 'CT2',
            location: empB?.defaultLocation || 'Badung',
            publicationStatus: 'Published',
            createdAt: nowStr,
            createdBy: currentUser?.name || 'Approver',
            updatedAt: nowStr
          };
          currentSchedules.push(assignB);
        }

        // Swap shifts & jobdesks atomically and deploy to Published schedule
        const shiftA = assignA.shiftCode;
        const shiftB = assignB.shiftCode;
        const jobA = assignA.jobdeskCode;
        const jobB = assignB.jobdeskCode;

        setSchedules(
          currentSchedules.map((s) => {
            if (s.id === assignA!.id) {
              return {
                ...s,
                shiftCode: shiftB,
                jobdeskCode: jobB || s.jobdeskCode,
                publicationStatus: 'Published',
                updatedAt: nowStr,
                updatedBy: currentUser?.name
              };
            }
            if (s.id === assignB!.id) {
              return {
                ...s,
                shiftCode: shiftA,
                jobdeskCode: jobA || s.jobdeskCode,
                publicationStatus: 'Published',
                updatedAt: nowStr,
                updatedBy: currentUser?.name
              };
            }
            return s;
          })
        );

        // Record history snapshot for both
        const histNow = Date.now();
        setScheduleHistories((prev) => [
          {
            id: `hist_swap_${histNow}_1`,
            assignmentId: assignA!.id,
            employeeId: assignA!.employeeId,
            employeeName: assignA!.employeeName,
            workDate: req.workDate,
            action: 'SWAP',
            beforeData: { shiftCode: shiftA, jobdeskCode: assignA!.jobdeskCode, location: assignA!.location },
            afterData: { shiftCode: shiftB, jobdeskCode: jobB || assignA!.jobdeskCode, location: assignA!.location },
            changedByUserId: currentUser?.id || 'sys',
            changedByName: currentUser?.name || 'Approver',
            changedAt: nowStr,
            timestamp: histNow
          },
          {
            id: `hist_swap_${histNow}_2`,
            assignmentId: assignB!.id,
            employeeId: assignB!.employeeId,
            employeeName: assignB!.employeeName,
            workDate: req.workDate,
            action: 'SWAP',
            beforeData: { shiftCode: shiftB, jobdeskCode: assignB!.jobdeskCode, location: assignB!.location },
            afterData: { shiftCode: shiftA, jobdeskCode: jobA || assignB!.jobdeskCode, location: assignB!.location },
            changedByUserId: currentUser?.id || 'sys',
            changedByName: currentUser?.name || 'Approver',
            changedAt: nowStr,
            timestamp: histNow
          },
          ...prev
        ]);
      } else if (req.requestType === 'Change Shift' && req.requestedShift) {
        const assign = schedules.find((s) => s.employeeId === req.requesterEmployeeId && s.date === req.workDate);
        if (assign) {
          updateSchedule(assign.id, {
            shiftCode: req.requestedShift,
            jobdeskCode: req.requestedJobdesk || assign.jobdeskCode,
            publicationStatus: 'Published'
          });
        } else {
          const emp = employees.find((e) => e.id === req.requesterEmployeeId);
          addSchedule({
            employeeId: req.requesterEmployeeId,
            employeeName: req.requesterName,
            employeeCode: emp?.employeeNo || 'CTSO-0000',
            date: req.workDate,
            shiftCode: req.requestedShift,
            jobdeskCode: req.requestedJobdesk || emp?.defaultJobdesk || 'CT1',
            location: emp?.defaultLocation || 'Badung',
            publicationStatus: 'Published'
          });
        }
      } else if (req.requestType === 'Jobdesk Change' && req.requestedJobdesk) {
        const assign = schedules.find((s) => s.employeeId === req.requesterEmployeeId && s.date === req.workDate);
        if (assign) {
          updateSchedule(assign.id, {
            jobdeskCode: req.requestedJobdesk,
            publicationStatus: 'Published'
          });
        } else {
          const emp = employees.find((e) => e.id === req.requesterEmployeeId);
          addSchedule({
            employeeId: req.requesterEmployeeId,
            employeeName: req.requesterName,
            employeeCode: emp?.employeeNo || 'CTSO-0000',
            date: req.workDate,
            shiftCode: req.currentShift || 'Pagi 7',
            jobdeskCode: req.requestedJobdesk,
            location: emp?.defaultLocation || 'Badung',
            publicationStatus: 'Published'
          });
        }
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: 'Approved', reviewedBy: currentUser?.name, reviewedAt: nowStr }
            : r
        )
      );

      addActivityLog(
        'APPROVE_REQUEST',
        'request',
        `Menyetujui ${req.requestType} #${req.id} untuk ${req.requesterName} (${req.workDate}) & langsung terapkan ke jadwal`,
        requestId
      );

      pushNotification(
        'Permintaan Perubahan Disetujui & Diterapkan',
        `Permintaan ${req.requestType} Anda untuk tanggal ${req.workDate} telah disetujui dan langsung di-deploy ke jadwal & jobdesk.`,
        'swap_approved',
        'Employee',
        req.requesterEmployeeId,
        '/schedule'
      );

      return { success: true, message: 'Request berhasil disetujui dan langsung diterapkan pada halaman schedule & jobdesk.' };
    },
    [requests, schedules, employees, getNowWITAString, currentUser, updateSchedule, addSchedule, addActivityLog, pushNotification]
  );

  const rejectRequest = useCallback(
    (requestId: string, rejectionReason: string) => {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: 'Rejected',
                rejectionReason,
                reviewedBy: currentUser?.name,
                reviewedAt: getNowWITAString()
              }
            : r
        )
      );

      const target = requests.find((r) => r.id === requestId);
      addActivityLog(
        'REJECT_REQUEST',
        'request',
        `Menolak request #${requestId}: ${rejectionReason}`,
        requestId
      );

      if (target) {
        pushNotification(
          'Permintaan Ditolak',
          `Pengajuan ${target.requestType} tanggal ${target.workDate} ditolak. Alasan: ${rejectionReason}`,
          'system',
          'Employee',
          target.requesterEmployeeId,
          '/management/requests'
        );
      }
    },
    [requests, currentUser, getNowWITAString, addActivityLog, pushNotification]
  );

  const cancelRequest = useCallback(
    (requestId: string) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'Cancelled' } : r))
      );
      addActivityLog('CANCEL_REQUEST', 'request', `Membatalkan permohonan request #${requestId}`, requestId);
    },
    [addActivityLog]
  );

  // Workflow: Leaves (Cuti & Izin)
  const createLeave = useCallback(
    (leave: Omit<LeaveRecord, 'id' | 'createdAt' | 'status'>) => {
      const newLeave: LeaveRecord = {
        ...leave,
        id: `leave_${Date.now()}`,
        status: 'Pending',
        createdAt: getNowWITAString()
      };
      setLeaves((prev) => [newLeave, ...prev]);

      addActivityLog(
        'CREATE_LEAVE',
        'leave',
        `${leave.employeeName} mengajukan ${leave.type} (${leave.startDate} s.d ${leave.endDate})`,
        newLeave.id
      );

      pushNotification(
        'Pengajuan Cuti / Izin Baru',
        `${leave.employeeName} mengajukan ${leave.type} periode ${leave.startDate} s.d ${leave.endDate}.`,
        'leave_status',
        'SPV',
        undefined,
        '/management/leave'
      );
    },
    [getNowWITAString, addActivityLog, pushNotification]
  );

  const approveLeave = useCallback(
    (leaveId: string) => {
      const target = leaves.find((l) => l.id === leaveId);
      if (!target) return;

      const nowStr = getNowWITAString();
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === leaveId
            ? { ...l, status: 'Approved', reviewedBy: currentUser?.name, reviewedAt: nowStr }
            : l
        )
      );

      // Generate all dates in the range [startDate, endDate]
      const leaveDates: string[] = [];
      const curr = parseLocalDate(target.startDate);
      const end = parseLocalDate(target.endDate);
      while (curr <= end) {
        leaveDates.push(formatLocalDateIso(curr));
        curr.setDate(curr.getDate() + 1);
      }

      const emp = employees.find((e) => e.id === target.employeeId || e.employeeNo === target.employeeId);

      // Determine shift code based on leave type: Cuti, Sakit, or Ijin
      const getLeaveShiftCode = (typeStr: string): string => {
        const t = (typeStr || '').toLowerCase();
        if (t.includes('sakit')) return 'Sakit';
        if (t.includes('khusus') || t.includes('ijin') || t.includes('izin')) return 'Ijin';
        return 'Cuti';
      };
      const targetShiftCode = getLeaveShiftCode(target.type);

      // Auto update active work shift on roster to Cuti/Sakit/Ijin during approved leave dates and deploy to published schedule & jobdesk!
      setSchedules((prev) => {
        const matchesEmp = (s: ScheduleAssignment) =>
          s.employeeId === target.employeeId ||
          (emp && s.employeeId === emp.id) ||
          (emp && s.employeeId === emp.employeeNo) ||
          (emp && s.employeeCode === emp.employeeNo);

        const updated = prev.map((s) => {
          if (matchesEmp(s) && leaveDates.includes(s.date)) {
            return {
              ...s,
              shiftCode: targetShiftCode,
              jobdeskCode: undefined,
              location: undefined,
              publicationStatus: 'Published' as const,
              note: `Cuti/Izin Disetujui: ${target.type}`,
              updatedAt: nowStr,
              updatedBy: currentUser?.name
            };
          }
          return s;
        });

        // For any leave date that doesn't have an assignment row yet, create it so schedule & jobdesk reflect it immediately!
        leaveDates.forEach((dateStr) => {
          const exists = updated.some((s) => matchesEmp(s) && s.date === dateStr);
          if (!exists) {
            updated.push({
              id: `sched_leave_${Date.now()}_${dateStr}`,
              employeeId: emp?.id || target.employeeId,
              employeeName: emp?.name || target.employeeName,
              employeeCode: emp?.employeeNo || 'CTSO-0000',
              date: dateStr,
              shiftCode: targetShiftCode,
              jobdeskCode: undefined,
              location: undefined,
              publicationStatus: 'Published' as const,
              note: `Cuti/Izin Disetujui: ${target.type}`,
              createdAt: nowStr,
              createdBy: currentUser?.name || 'Approver',
              updatedAt: nowStr
            });
          }
        });

        return updated;
      });

      addActivityLog(
        'APPROVE_LEAVE',
        'leave',
        `Menyetujui ${target.type} untuk ${target.employeeName} (${target.startDate} s.d ${target.endDate}) & deploy ke roster schedule & jobdesk`,
        leaveId
      );

      pushNotification(
        'Pengajuan Cuti Disetujui & Diterapkan',
        `${target.type} Anda tanggal ${target.startDate} s.d ${target.endDate} telah disetujui dan langsung di-deploy ke jadwal & jobdesk sebagai status OFF.`,
        'leave_status',
        'Employee',
        target.employeeId,
        '/schedule'
      );
    },
    [leaves, employees, getNowWITAString, currentUser, addActivityLog, pushNotification]
  );

  const rejectLeave = useCallback(
    (leaveId: string) => {
      const target = leaves.find((l) => l.id === leaveId);
      if (target) {
        // Rollback any automated leave assignments created for this leave
        const emp = employees.find((e) => e.id === target.employeeId || e.employeeNo === target.employeeId);
        setSchedules((prev) =>
          prev.filter(
            (s) =>
              !(
                (s.employeeId === target.employeeId || (emp && s.employeeId === emp.id) || (emp && s.employeeCode === emp.employeeNo)) &&
                s.date >= target.startDate &&
                s.date <= target.endDate &&
                (s.id.startsWith('sched_leave_') || ['Sakit', 'Cuti', 'Ijin'].includes(s.shiftCode))
              )
          )
        );
      }
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === leaveId
            ? { ...l, status: 'Rejected', reviewedBy: currentUser?.name, reviewedAt: getNowWITAString() }
            : l
        )
      );
      addActivityLog('REJECT_LEAVE', 'leave', `Menolak cuti #${leaveId}`, leaveId);
    },
    [leaves, employees, currentUser, getNowWITAString, addActivityLog]
  );

  const cancelLeave = useCallback(
    (leaveId: string) => {
      const target = leaves.find((l) => l.id === leaveId);
      if (target) {
        // Rollback any automated leave assignments created for this leave
        const emp = employees.find((e) => e.id === target.employeeId || e.employeeNo === target.employeeId);
        setSchedules((prev) =>
          prev.filter(
            (s) =>
              !(
                (s.employeeId === target.employeeId || (emp && s.employeeId === emp.id) || (emp && s.employeeCode === emp.employeeNo)) &&
                s.date >= target.startDate &&
                s.date <= target.endDate &&
                (s.id.startsWith('sched_leave_') || ['Sakit', 'Cuti', 'Ijin'].includes(s.shiftCode))
              )
          )
        );
      }
      setLeaves((prev) =>
        prev.map((l) => (l.id === leaveId ? { ...l, status: 'Cancelled' } : l))
      );
      addActivityLog('CANCEL_LEAVE', 'leave', `Membatalkan pengajuan cuti #${leaveId}`, leaveId);
    },
    [leaves, employees, addActivityLog]
  );

  // Master Data Add/Update
  const addShift = useCallback(
    (shift: Omit<ShiftMasterItem, 'id'>) => {
      const newShift: ShiftMasterItem = { ...shift, id: `sh_${Date.now()}` };
      setShifts((prev) => [...prev, newShift]);

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.post('/shifts', {
            code: shift.code,
            name: shift.name,
            start_time: shift.startTime,
            end_time: shift.endTime,
            end_day_offset: shift.endDayOffset || 0,
            color: shift.color || '#F9C900',
            is_off: shift.isOff || false,
            is_active: shift.status === 'active'
          }).catch((e) => console.warn('Failed to add shift on backend', e));
        }
      });

      addActivityLog('CREATE_SHIFT_MASTER', 'schedule', `Menambah master shift ${shift.name} (${shift.code})`);
    },
    [addActivityLog]
  );

  const updateShift = useCallback(
    (id: string, shift: Partial<ShiftMasterItem>) => {
      let oldCode: string | undefined;
      setShifts((prev) => {
        const found = prev.find((s) => s.id === id);
        if (found && shift.code && shift.code !== found.code) {
          oldCode = found.code;
        }
        return prev.map((s) => (s.id === id ? { ...s, ...shift } : s));
      });
      if (oldCode && shift.code) {
        const newCode = shift.code;
        setSchedules((prev) =>
          prev.map((sc) => (sc.shiftCode === oldCode ? { ...sc, shiftCode: newCode } : sc))
        );
      }

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.put(`/shifts/${id}`, {
            code: shift.code,
            name: shift.name,
            start_time: shift.startTime,
            end_time: shift.endTime,
            end_day_offset: shift.endDayOffset,
            color: shift.color,
            is_off: shift.isOff,
            is_active: shift.status ? shift.status === 'active' : undefined
          }).catch((e) => console.warn('Failed to update shift on backend', e));
        }
      });

      addActivityLog('UPDATE_SHIFT_MASTER', 'schedule', `Memperbarui master shift #${id}`);
    },
    [addActivityLog]
  );

  const deleteShift = useCallback(
    (id: string) => {
      const target = shifts.find((s) => s.id === id || s.code === id);
      if (!target) return { success: false, error: 'Shift tidak ditemukan.' };

      const usedCount = schedules.filter((s) => s.shiftCode === target.code).length;
      if (usedCount > 0) {
        return {
          success: false,
          error: `Shift ${target.code} sedang digunakan oleh ${usedCount} assignment jadwal aktif. Hapus atau pindahkan jadwal terkait terlebih dahulu.`
        };
      }

      setShifts((prev) => prev.filter((s) => s.id !== target.id && s.code !== target.code));

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.delete(`/shifts/${target.id}`).catch(() => {
            // Fallback delete by code
            apiClient.delete(`/shifts/${encodeURIComponent(target.code)}`).catch((e) =>
              console.warn('Failed to delete shift on backend', e)
            );
          });
        }
      });

      addActivityLog('DELETE_SHIFT_MASTER', 'schedule', `Menghapus master shift ${target.name} (${target.code})`);
      return { success: true };
    },
    [shifts, schedules, addActivityLog]
  );

  const addJobdesk = useCallback(
    (jobdesk: Omit<JobdeskItem, 'id'>) => {
      const newJd: JobdeskItem = { ...jobdesk, id: `jd_${Date.now()}` };
      setJobdesks((prev) => sortJobdesksByCode([...prev, newJd]));

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.post('/jobdesks', {
            code: jobdesk.code,
            name: jobdesk.name,
            description: jobdesk.description || '',
            color: jobdesk.color || '#38BDF8',
            is_active: jobdesk.status === 'active'
          }).catch((e) => console.warn('Failed to add jobdesk on backend', e));
        }
      });

      addActivityLog('CREATE_JOBDESK_MASTER', 'schedule', `Menambah kode jobdesk ${jobdesk.code}`);
    },
    [addActivityLog]
  );

  const updateJobdesk = useCallback(
    (id: string, jobdesk: Partial<JobdeskItem>) => {
      let oldCode: string | undefined;
      setJobdesks((prev) => {
        const found = prev.find((j) => j.id === id);
        if (found && jobdesk.code && jobdesk.code !== found.code) {
          oldCode = found.code;
        }
        return sortJobdesksByCode(prev.map((j) => (j.id === id ? { ...j, ...jobdesk } : j)));
      });
      if (oldCode && jobdesk.code) {
        const newCode = jobdesk.code;
        setSchedules((prev) =>
          prev.map((sc) => (sc.jobdeskCode === oldCode ? { ...sc, jobdeskCode: newCode } : sc))
        );
      }

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.put(`/jobdesks/${id}`, {
            code: jobdesk.code,
            name: jobdesk.name,
            description: jobdesk.description,
            color: jobdesk.color,
            is_active: jobdesk.status ? jobdesk.status === 'active' : undefined
          }).catch((e) => console.warn('Failed to update jobdesk on backend', e));
        }
      });

      addActivityLog('UPDATE_JOBDESK_MASTER', 'schedule', `Memperbarui master jobdesk #${id}`);
    },
    [addActivityLog]
  );

  const deleteJobdesk = useCallback(
    (id: string) => {
      const target = jobdesks.find((j) => j.id === id || j.code === id);
      if (!target) return { success: false, error: 'Jobdesk tidak ditemukan.' };

      const usedCount = schedules.filter((s) => s.jobdeskCode === target.code).length;
      if (usedCount > 0) {
        return {
          success: false,
          error: `Jobdesk ${target.code} sedang dialokasikan pada ${usedCount} assignment jadwal aktif. Ubah alokasi tugas terlebih dahulu.`
        };
      }

      setJobdesks((prev) => prev.filter((j) => j.id !== target.id && j.code !== target.code));

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.delete(`/jobdesks/${target.id}`).catch(() => {
            apiClient.delete(`/jobdesks/${encodeURIComponent(target.code)}`).catch((e) =>
              console.warn('Failed to delete jobdesk on backend', e)
            );
          });
        }
      });

      addActivityLog('DELETE_JOBDESK_MASTER', 'schedule', `Menghapus master jobdesk ${target.name} (${target.code})`);
      return { success: true };
    },
    [jobdesks, schedules, addActivityLog]
  );

  const addEmployee = useCallback(
    (employee: Omit<EmployeeItem, 'id'>) => {
      const newEmp: EmployeeItem = { ...employee, id: `emp_${Date.now()}` };
      setEmployees((prev) => [...prev, newEmp]);

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.post('/employees', {
            employee_no: employee.employeeNo,
            name: employee.name,
            role: employee.role,
            level: employee.level || 'Junior',
            status: employee.status || 'active',
            default_location: employee.defaultLocation || 'Badung',
            email: employee.email || null,
            phone: employee.phone || null
          }).catch((e) => console.warn('Failed to persist employee to backend', e));
        }
      });

      addActivityLog('CREATE_EMPLOYEE', 'employee', `Menambah karyawan baru ${employee.name} (${employee.employeeNo})`);
    },
    [addActivityLog]
  );

  const updateEmployee = useCallback(
    (id: string, employee: Partial<EmployeeItem>) => {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...employee } : e)));

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.put(`/employees/${id}`, {
            employee_no: employee.employeeNo,
            name: employee.name,
            role: employee.role,
            level: employee.level,
            status: employee.status,
            default_location: employee.defaultLocation,
            email: employee.email,
            phone: employee.phone
          }).catch((e) => console.warn('Failed to update employee on backend', e));
        }
      });

      addActivityLog('UPDATE_EMPLOYEE', 'employee', `Memperbarui data karyawan #${id}`);
    },
    [addActivityLog]
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      const target = employees.find((e) => e.id === id);
      if (!target) return { success: false, error: 'Data karyawan tidak ditemukan.' };

      setEmployees((prev) => prev.filter((e) => e.id !== id));
      setSchedules((prev) =>
        prev.filter(
          (s) =>
            s.employeeId !== id &&
            s.employeeCode !== target.employeeNo &&
            s.employeeId !== target.employeeNo
        )
      );

      apiClient.isBackendAvailable().then((isUp) => {
        if (isUp) {
          apiClient.delete(`/employees/${id}`).catch((e) => console.warn('Failed to delete employee on backend', e));
        }
      });

      addActivityLog('DELETE_EMPLOYEE', 'employee', `Menghapus data karyawan ${target.name} (${target.employeeNo})`);
      return { success: true };
    },
    [employees, addActivityLog]
  );

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    saveState('notifications', []);
    addActivityLog('CLEAR_NOTIFICATIONS', 'auth', 'Membersihkan seluruh daftar notifikasi');
  }, [addActivityLog]);

  const addAnnouncement = useCallback(
    (ann: Omit<AnnouncementItem, 'id' | 'createdAt' | 'authorName'>) => {
      const newAnn: AnnouncementItem = {
        ...ann,
        id: `ann_${Date.now()}`,
        authorName: currentUser?.name || 'Administrator',
        createdAt: getNowWITAString()
      };
      setAnnouncements((prev) => [newAnn, ...prev]);
      addActivityLog('CREATE_ANNOUNCEMENT', 'announcement', `Membuat pengumuman: ${ann.title}`);

      if (ann.status === 'Published') {
        pushNotification('Pengumuman Baru', ann.title, 'announcement', 'all', undefined, '/management/announcements');
      }
    },
    [currentUser, getNowWITAString, addActivityLog, pushNotification]
  );

  const updateAnnouncement = useCallback(
    (id: string, ann: Partial<AnnouncementItem>) => {
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, ...ann } : a)));
      addActivityLog('UPDATE_ANNOUNCEMENT', 'announcement', `Memperbarui status pengumuman #${id}`);
    },
    [addActivityLog]
  );

  const updateSpvPermissions = useCallback(
    (perms: Partial<SpvPermissionConfig>) => {
      setSpvPermissions((prev) => ({ ...prev, ...perms }));
      addActivityLog('UPDATE_PERMISSIONS', 'permission', 'Memperbarui matriks permission operasional SPV');
    },
    [addActivityLog]
  );

  const updateEmployeePermissions = useCallback(
    (perms: Partial<EmployeePermissionConfig>) => {
      setEmployeePermissions((prev) => ({ ...prev, ...perms }));
      addActivityLog('UPDATE_PERMISSIONS', 'permission', 'Memperbarui matriks permission operasional Employee');
    },
    [addActivityLog]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        sessionId,
        isAuthenticated: !!currentUser,
        switchUserRole,
        login,
        logout,
        employees,
        shifts,
        jobdesks,
        teams,
        locations,
        spvPermissions,
        employeePermissions,
        schedules,
        scheduleHistories,
        activityLogs,
        requests,
        leaves,
        notifications,
        announcements,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        publishSchedule,
        bulkAssignSchedule,
        copyPreviousSchedule,
        autoGenerateSchedule,
        deleteScheduleHistories,
        addActivityLog,
        addShift,
        updateShift,
        deleteShift,
        addJobdesk,
        updateJobdesk,
        deleteJobdesk,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        createRequest,
        respondReplacementConsent,
        approveRequest,
        rejectRequest,
        cancelRequest,
        createLeave,
        approveLeave,
        rejectLeave,
        cancelLeave,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        addAnnouncement,
        updateAnnouncement,
        updateSpvPermissions,
        updateEmployeePermissions,
        users,
        addUser,
        updateUser,
        deleteUser,
        register,
        syncToServer
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
