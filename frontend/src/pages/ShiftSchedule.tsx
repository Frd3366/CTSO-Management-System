import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import { GoogleSheetsBackupModal } from '../components/common/GoogleSheetsBackupModal';
import { getGoogleSheetsConfig, GoogleSheetsBackupConfig } from '../utils/googleSheetsBackup';
import { ScheduleAssignment, WorkLocation } from '../types';
import { getShiftBadgeStyle, getJobdeskBadgeStyle, getContrastTextColor, toCssSlug, isOffShiftCode } from '../utils/codeStyles';
import { sortByEmployeeOrder, EmployeeSortMode } from '../utils/employeeSort';
import { getStoredHolidays, saveStoredHolidays, HolidayRecord } from '../utils/holidayUtils';
import { parseLocalDate, formatLocalDateIso, getTodayIso, getWeekAheadIso, formatDateDMY } from '../utils/dateUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Search,
  Download,
  Upload,
  Layers,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  Copy,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  StickyNote
} from 'lucide-react';

export const ShiftSchedule: React.FC = () => {
  const {
    schedules,
    shifts,
    jobdesks,
    employees,
    currentUser,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    publishSchedule,
    bulkAssignSchedule,
    copyPreviousSchedule,
    autoGenerateSchedule
  } = useAuth();

  const { showToast } = useToast();

  // View state: daily kanban, weekly table, monthly table (PRD 5.2, 5.3, 5.4)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Active anchor date
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => getTodayIso());

  // Filters (PRD 5.3)
  const [filterLocation, setFilterLocation] = useState<'All' | WorkLocation>('All');
  const [filterJobdesk, setFilterJobdesk] = useState<string>('All');
  const [filterShift, setFilterShift] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<EmployeeSortMode>('default');

  // Modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGSheetsModalOpen, setIsGSheetsModalOpen] = useState(false);
  const [gsheetsConfig, setGsheetsConfig] = useState<GoogleSheetsBackupConfig>(getGoogleSheetsConfig);

  useEffect(() => {
    const refreshGSheets = () => setGsheetsConfig(getGoogleSheetsConfig());
    window.addEventListener('cms_gsheets_config_updated', refreshGSheets);
    return () => window.removeEventListener('cms_gsheets_config_updated', refreshGSheets);
  }, []);

  // Manual Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDate, setFormDate] = useState('2026-11-15');
  const [formShiftCode, setFormShiftCode] = useState('Pagi 7');
  const [formJobdeskCode, setFormJobdeskCode] = useState('');
  const [formLocation, setFormLocation] = useState<WorkLocation>('Badung');
  const [formStatus, setFormStatus] = useState<'Draft' | 'Published'>('Draft');
  const [formNote, setFormNote] = useState('');
  const [viewingAssignment, setViewingAssignment] = useState<ScheduleAssignment | null>(null);

  // Bulk Form State
  const [bulkEmployeeIds, setBulkEmployeeIds] = useState<string[]>([]);
  const [bulkStartDate, setBulkStartDate] = useState<string>(() => getTodayIso());
  const [bulkEndDate, setBulkEndDate] = useState<string>(() => getWeekAheadIso(7));
  const [bulkShiftCode, setBulkShiftCode] = useState('Pagi 7');
  const [bulkJobdeskCode, setBulkJobdeskCode] = useState('CT1');
  const [bulkLocation, setBulkLocation] = useState<WorkLocation>('Badung');

  // Copy Form State
  const [copySource, setCopySource] = useState<'yesterday' | 'last_week'>('yesterday');

  // Permissions check (PRD Section 2.4 & 5.8)
  const canManageSchedule = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  // Holiday (Hari Besar) State
  const [holidays, setHolidays] = useState<HolidayRecord>(() => getStoredHolidays());
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayNameInput, setHolidayNameInput] = useState('');

  useEffect(() => {
    const handleHolidaysUpdated = () => setHolidays(getStoredHolidays());
    window.addEventListener('cms_holidays_updated', handleHolidaysUpdated);
    return () => window.removeEventListener('cms_holidays_updated', handleHolidaysUpdated);
  }, []);

  const handleOpenHolidayModal = (dateStr: string) => {
    if (!canManageSchedule) return;
    setHolidayDate(dateStr);
    setHolidayNameInput(holidays[dateStr] || '');
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { ...holidays };
    if (holidayNameInput.trim()) {
      next[holidayDate] = holidayNameInput.trim();
      showToast(`Catatan Hari Besar "${holidayNameInput.trim()}" berhasil disimpan pada ${holidayDate}.`, 'success');
    } else {
      delete next[holidayDate];
      showToast(`Catatan Hari Besar pada ${holidayDate} berhasil dihapus.`, 'info');
    }
    setHolidays(next);
    saveStoredHolidays(next);
    setIsHolidayModalOpen(false);
  };

  // Helper to get formatted hours for any shift code
  const getShiftHours = (code: string) => {
    if (isOffShiftCode(code, shifts)) return 'Libur';
    const sh = shifts.find((s) => s.code === code);
    if (!sh) return '';
    return `${sh.startTime} - ${sh.endTime}`;
  };

  // Date calculation helpers
  const currentAnchorDate = useMemo(() => parseLocalDate(currentDateStr), [currentDateStr]);

  // Weekly days generator: 7 days around anchor date
  const weeklyDays = useMemo(() => {
    const start = new Date(currentAnchorDate);
    const dayOfWeek = start.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = formatLocalDateIso(d);
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      days.push({
        iso,
        dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        monthName: d.toLocaleString('id-ID', { month: 'short' }),
        isToday: iso === getTodayIso()
      });
    }
    return days;
  }, [currentAnchorDate]);

  // Monthly days generator: all days of the current month
  const monthlyDays = useMemo(() => {
    const year = currentAnchorDate.getFullYear();
    const month = currentAnchorDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const iso = formatLocalDateIso(d);
      days.push({
        iso,
        dayNumber: i,
        dayName: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()],
        monthName: d.toLocaleString('id-ID', { month: 'short' }),
        isToday: iso === getTodayIso()
      });
    }
    return days;
  }, [currentAnchorDate]);

  // Visible schedules based on role (Employee only sees Published)
  const visibleSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (currentUser?.role === 'Employee' && s.publicationStatus !== 'Published') {
        return false;
      }
      return true;
    });
  }, [schedules, currentUser]);

  // Filtered employees (sorted by custom CTSO order or alphabetical)
  const filteredEmployees = useMemo(() => {
    const list = employees.filter((emp) => {
      if (currentUser?.role === 'SPV') {
        // Scope to team if SPV (PRD Section 2.2)
        // SPV Badung oversees core and fop
      }
      if (filterLocation !== 'All' && emp.defaultLocation !== filterLocation) {
        // Can still filter by default location or work assignment
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return emp.name.toLowerCase().includes(q) || emp.employeeNo.toLowerCase().includes(q);
      }
      return true;
    });
    return sortByEmployeeOrder(list, (emp) => emp.name, sortMode);
  }, [employees, currentUser, filterLocation, searchQuery, sortMode]);

  // Summary Cards for Selected Date / Period (PRD Section 5.5)
  const shiftSummaries = useMemo(() => {
    return shifts.map((sh) => {
      const count = visibleSchedules.filter((s) => {
        if (viewMode === 'daily') {
          return s.date === currentDateStr && s.shiftCode === sh.code;
        } else if (viewMode === 'weekly') {
          return weeklyDays.some((d) => d.iso === s.date) && s.shiftCode === sh.code;
        } else {
          return monthlyDays.some((d) => d.iso === s.date) && s.shiftCode === sh.code;
        }
      }).length;

      return {
        ...sh,
        count
      };
    });
  }, [shifts, visibleSchedules, viewMode, currentDateStr, weeklyDays, monthlyDays]);

  // Draft counts waiting for publication on active date
  const draftCount = useMemo(() => {
    return schedules.filter((s) => {
      if (s.publicationStatus !== 'Draft') return false;
      if (viewMode === 'daily') return s.date === currentDateStr;
      if (viewMode === 'weekly') return weeklyDays.some((d) => d.iso === s.date);
      return monthlyDays.some((d) => d.iso === s.date);
    }).length;
  }, [schedules, viewMode, currentDateStr, weeklyDays, monthlyDays]);

  // Navigation arrows handler
  const handleNavigateDate = (direction: 'prev' | 'next') => {
    const cur = new Date(currentAnchorDate);
    if (viewMode === 'daily') {
      cur.setDate(cur.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'weekly') {
      cur.setDate(cur.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      cur.setMonth(cur.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDateStr(formatLocalDateIso(cur));
  };

  // Open Add Assignment
  const handleOpenAdd = (defaultEmpId?: string, defaultDate?: string) => {
    setEditingId(null);
    setFormEmployeeId(defaultEmpId || employees[0]?.id || '');
    setFormDate(defaultDate || currentDateStr);
    setFormShiftCode('Pagi 7');
    setFormJobdeskCode('');
    setFormLocation('Badung');
    setFormStatus('Published');
    setFormNote('');
    setIsManualModalOpen(true);
  };

  // Open Edit Assignment
  const handleOpenEdit = (assignment: ScheduleAssignment) => {
    if (!canManageSchedule) {
      setViewingAssignment(assignment);
      return;
    }
    setEditingId(assignment.id);
    setFormEmployeeId(assignment.employeeId);
    setFormDate(assignment.date);
    setFormShiftCode(assignment.shiftCode);
    setFormJobdeskCode(assignment.jobdeskCode || '');
    setFormLocation(assignment.location || 'Badung');
    setFormStatus('Published');
    setFormNote(assignment.note || '');
    setIsManualModalOpen(true);
  };

  // Save Assignment (Directly Published, no draft)
  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === formEmployeeId);
    if (!emp) {
      showToast('Pilih karyawan yang valid.', 'error');
      return;
    }

    const isOff = isOffShiftCode(formShiftCode, shifts);
    const existing = editingId ? schedules.find((s) => s.id === editingId) : null;

    if (editingId) {
      const res = updateSchedule(editingId, {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeNo,
        date: formDate,
        shiftCode: formShiftCode,
        jobdeskCode: isOff ? undefined : (formJobdeskCode || undefined),
        location: isOff ? undefined : formLocation,
        publicationStatus: 'Published',
        note: formNote.trim() || undefined
      });

      if (!res.success) {
        showToast(res.error || 'Gagal menyimpan perubahan.', 'error');
        return;
      }
      showToast('Perubahan jadwal dan peran tugas berhasil disimpan (Published).', 'success');
    } else {
      const res = addSchedule({
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeNo,
        date: formDate,
        shiftCode: formShiftCode,
        jobdeskCode: isOff ? undefined : (formJobdeskCode || undefined),
        location: isOff ? undefined : formLocation,
        publicationStatus: 'Published',
        note: formNote.trim() || undefined
      });

      if (!res.success) {
        showToast(res.error || 'Validasi jadwal gagal.', 'error');
        return;
      }
      showToast('Assignment jadwal baru berhasil ditambahkan (Published).', 'success');
    }

    setIsManualModalOpen(false);
  };

  // Delete Assignment
  const handleDelete = (id: string) => {
    if (!canManageSchedule) {
      showToast('Akses ditolak: Hanya Admin/SPV yang dapat menghapus roster.', 'error');
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin menghapus jadwal ini? Snapshot akan disimpan ke Schedule History.')) {
      deleteSchedule(id);
      showToast('Assignment jadwal telah dihapus.', 'info');
      setIsManualModalOpen(false);
    }
  };

  // Publish Current Schedule Action (PRD 5.8)
  const handlePublishAll = () => {
    if (!canManageSchedule) {
      showToast('Akses ditolak: Anda tidak memiliki permission publikasi.', 'error');
      return;
    }
    const res = publishSchedule(viewMode === 'daily' ? currentDateStr : undefined);
    if (res.count > 0) {
      showToast(`Berhasil mempublikasikan ${res.count} roster. Seluruh Employee kini dapat melihat jadwal resmi.`, 'success');
    } else {
      showToast('Tidak ada draft jadwal yang perlu dipublikasikan.', 'info');
    }
  };

  // Bulk Apply Handler
  const handleApplyBulk = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkEmployeeIds.length === 0) {
      showToast('Pilih minimal 1 karyawan untuk bulk assignment.', 'error');
      return;
    }

    // Generate date range safely without timezone drift
    const [sY, sM, sD] = bulkStartDate.split('-').map(Number);
    const [eY, eM, eD] = bulkEndDate.split('-').map(Number);
    const cur = new Date(sY, sM - 1, sD);
    const end = new Date(eY, eM - 1, eD);
    const dates: string[] = [];
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }

    const isBulkOff = isOffShiftCode(bulkShiftCode, shifts);
    const res = bulkAssignSchedule(
      bulkEmployeeIds,
      dates,
      bulkShiftCode,
      undefined,
      isBulkOff ? undefined : 'Badung'
    );

    if (res.count > 0) {
      showToast(`Bulk Assignment berhasil menambahkan ${res.count} slot jadwal sebagai Draft.`, 'success');
      setIsBulkModalOpen(false);
    } else {
      showToast(res.errors[0] || 'Gagal menerapkan bulk assignment.', 'error');
    }
  };

  // Copy Previous Handler
  const handleApplyCopy = () => {
    const res = copyPreviousSchedule(copySource, currentDateStr);
    if (res.count > 0) {
      showToast(`Berhasil menyalin ${res.count} assignment dari periode sebelumnya ke Draft.`, 'success');
    } else {
      showToast('Tidak ada assignment pada periode sumber untuk disalin.', 'warning');
    }
    setIsCopyModalOpen(false);
  };

  // Export CSV Handler (PRD 12.3)
  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Employee ID', 'Nama Karyawan', 'Shift', 'Jobdesk', 'Lokasi', 'Status'];
    const rows = visibleSchedules.map((s) => {
      const isOff = isOffShiftCode(s.shiftCode, shifts);
      return [
        s.date,
        s.employeeCode,
        `"${s.employeeName}"`,
        s.shiftCode,
        isOff ? '-' : (s.jobdeskCode || '-'),
        isOff ? '-' : (s.location || '-'),
        s.publicationStatus
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CTSO_Schedule_Export_${currentDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Ekspor data jadwal berhasil diunduh.', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Operational Actions */}
      <div className="bg-white dark:bg-[#18181A] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Schedule Planner
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Operational roster planning, shift allocation, and rotation schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageSchedule && (
            <>
              <button
                type="button"
                onClick={() => {
                  setBulkStartDate(getTodayIso());
                  setBulkEndDate(getWeekAheadIso(7));
                  setBulkEmployeeIds([]);
                  setIsBulkModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#202020] hover:bg-[#FFE160]/20 text-[#202020] dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Bulk Shift Assignment untuk banyak karyawan sekaligus"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" aria-hidden="true" />
                <span>Bulk Update</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGSheetsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#202020] hover:bg-[#FFE160]/20 text-[#202020] dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Auto Backup Roster ke Google Sheets (Setiap 1 Jam)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" aria-hidden="true" />
                <span>Auto Backup Sheets</span>
                {gsheetsConfig.enabled && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#202020]"
                    title="Auto Backup Active"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-[#202020] dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" aria-hidden="true" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="px-4 py-2 rounded-xl bg-[#FFD416] hover:bg-[#FFE160] text-[#202020] border border-[#FFD416] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#202020]" aria-hidden="true" />
                <span>Add Assignment</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#18181A] p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-bold" role="group" aria-label="Mode tampilan jadwal">
          <button
            type="button"
            aria-pressed={viewMode === 'daily'}
            onClick={() => setViewMode('daily')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              viewMode === 'daily'
                ? 'bg-[#0F172A] text-white shadow-xs dark:bg-white dark:text-[#0F172A]'
                : 'text-slate-600 dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'weekly'}
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              viewMode === 'weekly'
                ? 'bg-[#0F172A] text-white shadow-xs dark:bg-white dark:text-[#0F172A]'
                : 'text-slate-600 dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'monthly'}
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              viewMode === 'monthly'
                ? 'bg-[#0F172A] text-white shadow-xs dark:bg-white dark:text-[#0F172A]'
                : 'text-slate-600 dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Periode sebelumnya"
            onClick={() => handleNavigateDate('prev')}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-[#FFE160]/20 text-[#202020] dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          {viewMode === 'daily' ? (
            <div className="min-w-[190px]">
              <ModernDatePicker
                value={currentDateStr}
                onChange={(d) => setCurrentDateStr(d)}
                showQuickPresets={true}
                className="w-auto"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202020] text-xs font-bold text-[#202020] dark:text-white font-mono shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#FFE160]/25 text-[#202020] dark:text-[#FFD416] flex items-center justify-center shrink-0">
                <CalendarIcon className="w-3.5 h-3.5 text-[#202020] dark:text-[#FFD416]" aria-hidden="true" />
              </div>
              <span>
                {viewMode === 'weekly' && `${formatDateDMY(weeklyDays[0]?.iso)} – ${formatDateDMY(weeklyDays[6]?.iso)}`}
                {viewMode === 'monthly' &&
                  currentAnchorDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          <button
            type="button"
            aria-label="Periode berikutnya"
            onClick={() => handleNavigateDate('next')}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-[#FFE160]/20 text-[#202020] dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentDateStr(getTodayIso())}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 text-[#202020] dark:text-gray-300 hover:bg-[#FFD416] hover:text-[#202020] transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter Lokasi"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-gray-200 bg-white dark:bg-[#18181A]"
          >
            <option value="All">Semua Lokasi</option>
            <option value="Badung">Badung</option>
            <option value="Denpasar">Denpasar</option>
          </select>

          <select
            aria-label="Urutan Karyawan"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as EmployeeSortMode)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-gray-200 bg-white dark:bg-[#18181A]"
          >
            <option value="default">Urutan Default</option>
            <option value="az">Abjad (A → Z)</option>
            <option value="za">Abjad (Z → A)</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              aria-label="Cari karyawan"
              placeholder="Cari karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs text-[#0F172A] dark:text-white placeholder-slate-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>



      {/* VIEW 1: DAILY KANBAN VIEW (PRD Section 5.2) */}
      {viewMode === 'daily' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {shifts.map((sh) => {
            const shIsOff = isOffShiftCode(sh.code, shifts);
            const items = visibleSchedules.filter(
              (s) => s.date === currentDateStr && s.shiftCode === sh.code
            );

            return (
              <div
                key={sh.id}
                className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col"
              >
                {/* Dynamic Shift Column Header */}
                <div
                  className="px-3.5 py-2.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#18181A]"
                >
                  <div>
                    <span
                      style={{
                        backgroundColor: sh.color || '#0284C7',
                        color: sh.textColor || getContrastTextColor(sh.color || '#0284C7')
                      }}
                      className="text-xs font-black font-mono px-2.5 py-0.5 rounded-lg shadow-2xs inline-block"
                    >
                      {sh.code}
                    </span>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-1">
                      {shIsOff ? 'Libur' : `${sh.startTime} - ${sh.endTime}`}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-gray-200 border border-slate-200 dark:border-white/10 font-mono">
                    {items.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="p-2.5 space-y-2 flex-1 min-h-[220px] bg-slate-50/50 dark:bg-white/[0.02]">
                  {items.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-4 text-[11px] text-slate-400 dark:text-gray-500">
                      Kosong
                    </div>
                  ) : (
                    items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className={`w-full text-left p-3 rounded-xl border-0 hover:opacity-95 transition-all space-y-1.5 ${
                          getShiftBadgeStyle(sh.code).card
                        } ${
                          item.publicationStatus === 'Draft' ? 'ring-2 ring-amber-400/80 ring-offset-1' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-current truncate">
                            {item.employeeName}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {item.note && (
                              <span
                                className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current"
                                title={`Ada catatan: ${item.note}`}
                              >
                                <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
                              </span>
                            )}
                            {item.publicationStatus === 'Draft' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                                DRAFT
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] text-current opacity-80 font-mono">
                          {item.employeeCode}
                        </div>

                        <div className="pt-1.5 border-t border-current/15 flex flex-col items-center justify-center text-center">
                          <span className="font-mono font-black text-xs text-current text-center">
                            {sh.code}
                          </span>
                          {!shIsOff && (
                            <>
                              <span className="text-[10px] text-current opacity-85 font-mono mt-0.5">
                                {`${sh.startTime} - ${sh.endTime}`}
                              </span>
                              <span className="text-[9px] font-semibold text-current opacity-75 mt-0.5">
                                {item.location || 'Badung'}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    ))
                  )}

                  {canManageSchedule && (
                    <button
                      type="button"
                      onClick={() => handleOpenAdd(undefined, currentDateStr)}
                      className="w-full py-1.5 border border-dashed border-slate-200 dark:border-white/10 hover:border-[#F9C900] dark:hover:border-[#F9C900] rounded-lg text-[11px] font-medium text-slate-400 dark:text-gray-400 hover:text-[#111111] dark:hover:text-white flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: WEEKLY TABLE VIEW (PRD Section 5.3) */}
      {viewMode === 'weekly' && (
        <div className="bg-white dark:bg-[#18181A] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-bold">
                <tr>
                  <th className="py-3 px-4 min-w-[200px] sticky left-0 bg-slate-50 dark:bg-[#18181A] z-10 border-r border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    Karyawan CTSO ({filteredEmployees.length})
                  </th>
                  {weeklyDays.map((d) => {
                    const isSunday = d.dayName === 'Min';
                    const holidayName = holidays[d.iso];

                    return (
                      <th
                        key={d.iso}
                        onClick={() => {
                          if (canManageSchedule) {
                            handleOpenHolidayModal(d.iso);
                          }
                        }}
                        className={`py-3 px-3 text-center min-w-[120px] transition-colors ${
                          canManageSchedule ? 'cursor-pointer hover:opacity-95' : ''
                        } ${
                          d.isToday
                            ? 'bg-orange-50/70 dark:bg-amber-500/10 text-orange-800 dark:text-amber-400 border-x border-[#CBD5E1] dark:border-white/10'
                            : holidayName
                            ? 'bg-rose-100/90 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100 border border-rose-200 dark:border-rose-900/40 shadow-xs'
                            : isSunday
                            ? 'bg-rose-50/90 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-x border-rose-200/80 dark:border-rose-900/40'
                            : ''
                        }`}
                        title={canManageSchedule ? 'Klik untuk atur / ubah Catatan Hari Besar' : undefined}
                      >
                        <div
                          className={`text-[10px] uppercase font-bold ${
                            isSunday || holidayName
                              ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                              : 'text-slate-400 dark:text-gray-400'
                          }`}
                        >
                          {d.dayName}
                        </div>
                        <div
                          className={`text-sm font-extrabold font-mono ${
                            isSunday || holidayName
                              ? 'text-rose-700 dark:text-rose-300 font-black'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {d.dayNumber} {d.monthName}
                        </div>
                        {holidayName && (
                          <div
                            className="mt-1 px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wide truncate shadow-2xs"
                            title={holidayName}
                          >
                            {holidayName}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                    {/* Sticky Employee Name Column (No Job Area under name) */}
                    <td className="py-2.5 px-4 sticky left-0 bg-white dark:bg-[#18181A] z-10 border-r border-slate-200 dark:border-white/10 shadow-2xs">
                      <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-gray-400 font-mono">
                        {emp.employeeNo}
                      </div>
                    </td>

                    {/* 7 Days Grid Cells */}
                    {weeklyDays.map((day) => {
                      const assignment = visibleSchedules.find(
                        (s) =>
                          (s.employeeId === emp.id ||
                            s.employeeId === emp.employeeNo ||
                            s.employeeCode === emp.employeeNo) &&
                          s.date === day.iso
                      );
                      const isSunday = day.dayName === 'Min';
                      const holidayName = holidays[day.iso];

                      return (
                        <td
                          key={day.iso}
                          onClick={() => {
                            if (assignment) {
                              handleOpenEdit(assignment);
                            } else if (canManageSchedule) {
                              handleOpenAdd(emp.id, day.iso);
                            }
                          }}
                          className={`py-2 px-2 text-center align-middle cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.05] transition-colors ${
                            day.isToday
                              ? 'bg-orange-50/20 dark:bg-amber-500/5'
                              : holidayName
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-x border-rose-200/40 dark:border-rose-900/30'
                              : isSunday
                              ? 'bg-rose-50/30 dark:bg-rose-950/10 border-x border-rose-200/30 dark:border-rose-900/20'
                              : ''
                          }`}
                        >
                          {assignment ? (
                            isOffShiftCode(assignment.shiftCode, shifts) ? (
                              <div
                                className={`py-2 px-1.5 rounded-xl border-0 flex flex-col items-center justify-center text-center font-black text-[10px] tracking-wider uppercase transition-all ${
                                  getShiftBadgeStyle(assignment.shiftCode).card
                                } ${
                                  assignment.publicationStatus === 'Draft'
                                    ? 'ring-2 ring-amber-400/90 ring-offset-1'
                                    : ''
                                }`}
                              >
                                <div className="font-mono font-black text-[9px] text-center w-full leading-tight flex items-center justify-center gap-1">
                                  <span>{assignment.shiftCode === 'OFF' ? 'WEEKLY DAY OFF' : assignment.shiftCode}</span>
                                  {assignment.note && (
                                    <span className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current" title={`Ada catatan: ${assignment.note}`}>
                                      <StickyNote className="w-2.5 h-2.5" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`py-1.5 px-1.5 rounded-xl border-0 flex flex-col items-center justify-center text-center transition-all ${
                                  getShiftBadgeStyle(assignment.shiftCode).card
                                } ${
                                  assignment.publicationStatus === 'Draft'
                                    ? 'ring-2 ring-amber-400/90 ring-offset-1'
                                    : ''
                                }`}
                              >
                                <div className="font-mono font-black text-[10px] text-center w-full uppercase tracking-tight leading-tight flex items-center justify-center gap-1">
                                  <span>{assignment.shiftCode}</span>
                                  {assignment.note && (
                                    <span className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current" title={`Ada catatan: ${assignment.note}`}>
                                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[8.5px] font-mono font-bold text-center mt-0.5 opacity-90 leading-tight">
                                  {getShiftHours(assignment.shiftCode)}
                                </div>
                                <div className="text-[8px] font-semibold text-center mt-0.5 opacity-75 truncate max-w-full leading-tight">
                                  {assignment.location || 'Badung'}
                                </div>
                              </div>
                            )
                          ) : isSunday || holidayName ? (
                            <div
                              className={`py-2 px-1.5 rounded-xl border-0 flex flex-col items-center justify-center text-center font-black text-[10px] tracking-wider uppercase transition-all opacity-90 ${
                                getShiftBadgeStyle('OFF').card
                              }`}
                              title={holidayName ? `Libur Nasional: ${holidayName} (Klik untuk ubah)` : 'Hari Minggu — Weekly Day Off otomatis (Klik untuk ubah)'}
                            >
                              <div className="font-mono font-black text-[9px] text-center w-full leading-tight">
                                WEEKLY DAY OFF
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-[#F9C900] hover:text-[#111111] text-slate-500 dark:text-gray-400 font-extrabold text-xs flex items-center justify-center mx-auto transition-all"
                              title="Tambah Shift"
                            >
                              +
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: MONTHLY TABLE VIEW (PRD Section 5.4) */}
      {viewMode === 'monthly' && (
        <div className="bg-white dark:bg-[#18181A] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-bold">
                <tr>
                  <th className="py-3 px-4 min-w-[200px] sticky left-0 bg-slate-50 dark:bg-[#18181A] z-10 border-r border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold">
                    Karyawan CTSO ({filteredEmployees.length})
                  </th>
                  {monthlyDays.map((d) => {
                    const isSunday = d.dayName === 'Min' || d.dayName === 'Minggu';
                    const holidayName = holidays[d.iso];
                    return (
                      <th
                        key={d.iso}
                        onClick={() => {
                          if (canManageSchedule) {
                            handleOpenHolidayModal(d.iso);
                          }
                        }}
                        className={`py-3 px-3 text-center min-w-[120px] transition-colors ${
                          canManageSchedule ? 'cursor-pointer hover:opacity-95' : ''
                        } ${
                          d.isToday
                            ? 'bg-orange-50/70 dark:bg-amber-500/10 text-orange-800 dark:text-amber-400 border-x border-[#CBD5E1] dark:border-white/10'
                            : holidayName
                            ? 'bg-rose-100/90 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100 border border-rose-200 dark:border-rose-900/40 shadow-xs'
                            : isSunday
                            ? 'bg-rose-50/90 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-x border-rose-200/80 dark:border-rose-900/40'
                            : ''
                        }`}
                        title={canManageSchedule ? 'Klik untuk atur / ubah Catatan Hari Besar' : undefined}
                      >
                        <div
                          className={`text-[10px] uppercase font-bold ${
                            isSunday || holidayName
                              ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                              : 'text-slate-400 dark:text-gray-400'
                          }`}
                        >
                          {d.dayName}
                        </div>
                        <div
                          className={`text-sm font-extrabold font-mono ${
                            isSunday || holidayName
                              ? 'text-rose-900 dark:text-rose-300'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {d.dayNumber} {d.monthName}
                        </div>
                        {holidayName && (
                          <div className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white truncate max-w-[110px] mx-auto shadow-2xs">
                            {holidayName}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 sticky left-0 bg-white dark:bg-[#18181A] z-10 border-r border-slate-200 dark:border-white/10 font-bold text-slate-900 dark:text-white shadow-2xs">
                      <div>{emp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{emp.employeeNo}</div>
                    </td>
                    {monthlyDays.map((d) => {
                      const assignment = visibleSchedules.find(
                        (s) =>
                          (s.employeeId === emp.id ||
                            s.employeeId === emp.employeeNo ||
                            s.employeeCode === emp.employeeNo) &&
                          s.date === d.iso
                      );
                      const isSunday = d.dayName === 'Min' || d.dayName === 'Minggu';
                      const hasHoliday = !!holidays[d.iso];

                      return (
                        <td
                          key={d.iso}
                          onClick={() => {
                            if (assignment) handleOpenEdit(assignment);
                            else if (canManageSchedule) handleOpenAdd(emp.id, d.iso);
                          }}
                          className={`py-2 px-2 text-center align-middle cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.05] transition-colors ${
                            d.isToday
                              ? 'bg-orange-50/20 dark:bg-amber-500/5'
                              : hasHoliday
                              ? 'bg-rose-50/35 dark:bg-rose-950/25'
                              : isSunday
                              ? 'bg-rose-50/25 dark:bg-rose-950/15'
                              : ''
                          }`}
                        >
                          {assignment ? (
                            isOffShiftCode(assignment.shiftCode, shifts) ? (
                              <div
                                className={`py-2 px-1.5 rounded-xl border-0 flex flex-col items-center justify-center text-center font-black text-[10px] tracking-wider uppercase transition-all ${
                                  getShiftBadgeStyle(assignment.shiftCode).card
                                } ${
                                  assignment.publicationStatus === 'Draft'
                                    ? 'ring-2 ring-amber-400/90 ring-offset-1'
                                    : ''
                                }`}
                              >
                                <div className="font-mono font-black text-[9px] text-center w-full leading-tight flex items-center justify-center gap-1">
                                  <span>{assignment.shiftCode === 'OFF' ? 'WEEKLY DAY OFF' : assignment.shiftCode}</span>
                                  {assignment.note && (
                                    <span className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current" title={`Ada catatan: ${assignment.note}`}>
                                      <StickyNote className="w-2.5 h-2.5" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`py-1.5 px-1.5 rounded-xl border-0 flex flex-col items-center justify-center text-center transition-all ${
                                  getShiftBadgeStyle(assignment.shiftCode).card
                                } ${
                                  assignment.publicationStatus === 'Draft'
                                    ? 'ring-2 ring-amber-400/90 ring-offset-1'
                                    : ''
                                }`}
                              >
                                <div className="font-mono font-black text-[10px] text-center w-full uppercase tracking-tight leading-tight flex items-center justify-center gap-1">
                                  <span>{assignment.shiftCode}</span>
                                  {assignment.note && (
                                    <span className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current" title={`Ada catatan: ${assignment.note}`}>
                                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                                {assignment.jobdeskCode && (
                                  <span className="mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-black/10 dark:bg-white/15 text-current">
                                    {assignment.jobdeskCode}
                                  </span>
                                )}
                                <div className="text-[8.5px] font-mono font-bold text-center mt-0.5 opacity-90 leading-tight">
                                  {getShiftHours(assignment.shiftCode)}
                                </div>
                                <div className="text-[8px] font-semibold text-center mt-0.5 opacity-75 truncate max-w-full leading-tight">
                                  {assignment.location || 'Badung'}
                                </div>
                              </div>
                            )
                          ) : isSunday || hasHoliday ? (
                            <div
                              className={`py-2 px-1.5 rounded-xl border-0 flex flex-col items-center justify-center text-center font-black text-[10px] tracking-wider uppercase transition-all opacity-90 ${
                                getShiftBadgeStyle('OFF').card
                              }`}
                              title={hasHoliday ? `Libur Nasional: ${holidays[d.iso]} (Klik untuk ubah)` : 'Hari Minggu — Weekly Day Off otomatis (Klik untuk ubah)'}
                            >
                              <div className="font-mono font-black text-[9px] text-center w-full leading-tight">
                                WEEKLY DAY OFF
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-indigo-600 hover:text-white text-slate-500 dark:text-gray-400 font-extrabold text-xs flex items-center justify-center mx-auto transition-all"
                              title="Tambah Shift"
                            >
                              +
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: MANUAL ASSIGNMENT / EDIT (PRD 5.6 & 5.7) */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title={editingId ? 'Edit Assignment Jadwal' : 'Tambah Assignment Jadwal Manual'}
        size="md"
      >
        <form onSubmit={handleSaveManual} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1">Karyawan</label>
            <select
              value={formEmployeeId}
              onChange={(e) => setFormEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white bg-white dark:bg-[#202023] focus:outline-none focus:border-[#F9C900]"
              required
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id} className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white">
                  {e.name} ({e.employeeNo})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <ModernDatePicker
                value={formDate}
                onChange={(d) => setFormDate(d)}
                label="Tanggal Tugas"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1.5">Kode Shift</label>
              <select
                value={formShiftCode}
                onChange={(e) => setFormShiftCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white bg-white dark:bg-[#202020] focus:outline-none focus:border-[#FFD416]"
                required
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.code} className="bg-white dark:bg-[#202020] text-slate-800 dark:text-white">
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isOffShiftCode(formShiftCode, shifts) && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F4F4F4] dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1">
                  Peran / Jobdesk Roster
                </label>
                <select
                  value={formJobdeskCode}
                  onChange={(e) => setFormJobdeskCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white bg-white dark:bg-[#202020] focus:outline-none focus:border-[#FFD416]"
                >
                  <option value="" className="bg-white dark:bg-[#202020] text-slate-500">
                    -- Tanpa Jobdesk --
                  </option>
                  {jobdesks.map((j) => (
                    <option key={j.id} value={j.code} className="bg-white dark:bg-[#202020] text-slate-800 dark:text-white">
                      {j.code} - {j.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1">
                  Lokasi Kerja
                </label>
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value as WorkLocation)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white bg-white dark:bg-[#202020] focus:outline-none focus:border-[#FFD416]"
                >
                  <option value="Badung">Badung</option>
                  <option value="Bangli">Bangli</option>
                  <option value="Buleleng">Buleleng</option>
                  <option value="Denpasar">Denpasar</option>
                  <option value="Gianyar">Gianyar</option>
                  <option value="Jembrana">Jembrana</option>
                  <option value="Karangasem">Karangasem</option>
                  <option value="Klungkung">Klungkung</option>
                  <option value="Tabanan">Tabanan</option>
                </select>
              </div>
            </div>
          )}

          {/* Direct Published Indicator (No draft) */}
          <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Publikasi Langsung (Published)
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-700/50">
              Otomatis Resmi
            </span>
          </div>

          {/* Note Input (PRD Note on Block) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span>Catatan / Note Roster</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Dapat dibaca oleh viewer</span>
            </label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={2}
              placeholder="Catatan serah terima, instruksi shift, catatan khusus..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202020] text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD416]/30 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
            {editingId ? (
              <button
                type="button"
                onClick={() => handleDelete(editingId)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#FFD416] hover:bg-[#FFE160] text-[#202020] border border-[#FFD416] text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Simpan & Publikasikan
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW DETAIL & NOTE (VIEWER / EMPLOYEE) */}
      <Modal
        isOpen={!!viewingAssignment}
        onClose={() => setViewingAssignment(null)}
        title="Detail Jadwal & Catatan Roster"
        size="md"
      >
        {viewingAssignment && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {viewingAssignment.employeeName}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-gray-400">
                    {viewingAssignment.employeeCode}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black font-mono shadow-2xs ${
                    getShiftBadgeStyle(viewingAssignment.shiftCode).card
                  }`}
                >
                  {viewingAssignment.shiftCode === 'OFF' ? 'WEEKLY DAY OFF' : viewingAssignment.shiftCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Tanggal:</span>
                  <div className="font-bold text-slate-800 dark:text-white font-mono mt-0.5">
                    {viewingAssignment.date}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Jam Kerja:</span>
                  <div className="font-bold text-slate-800 dark:text-white font-mono mt-0.5">
                    {getShiftHours(viewingAssignment.shiftCode)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Jobdesk:</span>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">
                    {isOffShiftCode(viewingAssignment.shiftCode, shifts) ? '-' : (viewingAssignment.jobdeskCode || '-')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Lokasi Hub:</span>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">
                    {isOffShiftCode(viewingAssignment.shiftCode, shifts) ? '-' : (viewingAssignment.location || '-')}
                  </div>
                </div>
              </div>
            </div>

            {/* Note Section */}
            <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Catatan Roster</span>
              </div>
              {viewingAssignment.note ? (
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {viewingAssignment.note}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-gray-400 italic">
                  Tidak ada catatan khusus untuk jadwal ini.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingAssignment(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: BULK ASSIGNMENT (PRD 5.6) */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Shift Assignment"
        size="lg"
      >
        <form onSubmit={handleApplyBulk} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
            Tetapkan shift untuk beberapa karyawan sekaligus dalam rentang tanggal. Hasil penetapan akan langsung resmi dipublikasikan (<strong>Published</strong>).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <ModernDatePicker
                value={bulkStartDate}
                onChange={setBulkStartDate}
                label="Tanggal Mulai"
                required
              />
            </div>
            <div>
              <ModernDatePicker
                value={bulkEndDate}
                onChange={setBulkEndDate}
                label="Tanggal Selesai"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1">Kode Shift</label>
            <select
              value={bulkShiftCode}
              onChange={(e) => setBulkShiftCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] text-xs text-slate-800 dark:text-white"
            >
              {shifts.map((s) => (
                <option key={s.id} value={s.code} className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1">
              Pilih Karyawan Target ({bulkEmployeeIds.length} dipilih)
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#202023]/50 rounded-xl p-2 grid grid-cols-2 gap-1.5">
              {employees.filter((e) => e.status === 'active').map((e) => {
                const isChecked = bulkEmployeeIds.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-[#F9C900]/20 dark:bg-[#F9C900]/15 border border-[#F9C900]/40 font-semibold text-slate-900 dark:text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(ev) => {
                        if (ev.target.checked) {
                          setBulkEmployeeIds((prev) => [...prev, e.id]);
                        } else {
                          setBulkEmployeeIds((prev) => prev.filter((id) => id !== e.id));
                        }
                      }}
                      className="rounded text-[#F9C900] focus:ring-[#F9C900]"
                    />
                    <span className="truncate">{e.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#FFD416] hover:bg-[#FFE160] text-[#202020] border border-[#FFD416] text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Terapkan & Publikasikan
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: MANUAL NOTE & HARI BESAR / TANGGAL MERAH */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Catatan Hari Libur Nasional / Hari Besar"
        size="sm"
      >
        <form onSubmit={handleSaveHoliday} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1">
              Tanggal Terpilih
            </label>
            <input
              type="text"
              value={formatDateDMY(holidayDate)}
              readOnly
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#202023] text-xs font-mono font-bold text-slate-700 dark:text-gray-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1">
              Nama Hari Besar / Catatan Operasional
            </label>
            <input
              type="text"
              placeholder="Contoh: Tahun Baru Imlek 2577, Idul Fitri 1447 H, dsb."
              value={holidayNameInput}
              onChange={(e) => setHolidayNameInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Kosongkan atau klik Hapus Note untuk menghapus penanda pada tanggal ini.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            {holidays[holidayDate] ? (
              <button
                type="button"
                onClick={() => {
                  const next = { ...holidays };
                  delete next[holidayDate];
                  setHolidays(next);
                  saveStoredHolidays(next);
                  showToast(`Catatan pada ${formatDateDMY(holidayDate)} berhasil dihapus.`, 'info');
                  setIsHolidayModalOpen(false);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Note</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Google Sheets Auto Backup Modal */}
      <GoogleSheetsBackupModal
        isOpen={isGSheetsModalOpen}
        onClose={() => setIsGSheetsModalOpen(false)}
      />

    </div>
  );
};
