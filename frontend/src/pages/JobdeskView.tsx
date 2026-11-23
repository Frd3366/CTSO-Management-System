import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import {
  Layers,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Filter,
  Search,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  FileText,
  StickyNote,
  X
} from 'lucide-react';
import { ScheduleAssignment, WorkLocation } from '../types';
import { getShiftBadgeStyle, getJobdeskBadgeStyle, getContrastTextColor, toCssSlug, parseJobdeskTasks, getAgentPillStyle } from '../utils/codeStyles';
import { getStoredHolidays, saveStoredHolidays, HolidayRecord } from '../utils/holidayUtils';
import { parseLocalDate, formatLocalDateIso, getTodayIso } from '../utils/dateUtils';

export const JobdeskView: React.FC = () => {
  const { schedules, jobdesks, shifts, employees, currentUser, addSchedule, updateSchedule, deleteSchedule } =
    useAuth();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedJobdeskDetail, setSelectedJobdeskDetail] = useState<any | null>(null);


  const formatDateDMY = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const [currentDateStr, setCurrentDateStr] = useState<string>(() => getTodayIso());
  const [filterLocation, setFilterLocation] = useState<'All' | WorkLocation>('All');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!canManageJobdesk) return;
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

  // Add / Assign Jobdesk Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDate, setFormDate] = useState('2026-11-15');
  const [formJobdeskCode, setFormJobdeskCode] = useState('CT1');
  const [formLocation, setFormLocation] = useState<WorkLocation>('Badung');
  const [formShiftCode, setFormShiftCode] = useState('Pagi 7');
  const [formAgent, setFormAgent] = useState<string>('');
  const [formNote, setFormNote] = useState('');
  const [selectedAssignmentForView, setSelectedAssignmentForView] = useState<ScheduleAssignment | null>(null);

  // Dynamic Agent Criteria Management (Persisted in localStorage)
  const [customAgents, setCustomAgents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ctso_cms_custom_agents');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Agent 1', 'Agent 2', 'Agent 3', 'Agent 4'];
  });
  const [newAgentInput, setNewAgentInput] = useState<string>('');
  const [isManagingAgents, setIsManagingAgents] = useState<boolean>(false);

  const saveAgents = (agents: string[]) => {
    setCustomAgents(agents);
    try {
      localStorage.setItem('ctso_cms_custom_agents', JSON.stringify(agents));
    } catch {}
  };

  const handleAddAgent = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!customAgents.includes(trimmed)) {
      const next = [...customAgents, trimmed];
      saveAgents(next);
      setFormAgent(trimmed);
      showToast(`Agent "${trimmed}" berhasil ditambahkan.`, 'success');
    }
    setNewAgentInput('');
  };

  const handleDeleteAgent = (name: string) => {
    const next = customAgents.filter((a) => a !== name);
    saveAgents(next);
    if (formAgent === name) {
      setFormAgent('');
    }
    showToast(`Agent "${name}" berhasil dihapus dari opsi.`, 'info');
  };

  const canManageJobdesk = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  const getShiftHours = (shiftCode: string) => {
    const sh = shifts.find((s) => s.code === shiftCode);
    if (!sh) return '-';
    if (sh.isOff) return 'Off Day';
    return `${sh.startTime} - ${sh.endTime}${sh.endDayOffset > 0 ? ' (+1)' : ''}`;
  };

  // Selected employee's scheduled shift on selected date
  const selectedEmployeeSchedule = useMemo(() => {
    return schedules.find((s) => s.employeeId === formEmployeeId && s.date === formDate);
  }, [schedules, formEmployeeId, formDate]);

  // Workload peers on the same shift & date (for workload balancing)
  const workloadPeers = useMemo(() => {
    const shiftCodeToMatch = selectedEmployeeSchedule?.shiftCode || formShiftCode;
    return schedules.filter(
      (s) => s.date === formDate && s.shiftCode === shiftCodeToMatch && s.shiftCode !== 'OFF'
    );
  }, [schedules, formDate, selectedEmployeeSchedule, formShiftCode]);

  useEffect(() => {
    if (isAddModalOpen && selectedEmployeeSchedule) {
      if (selectedEmployeeSchedule.shiftCode && selectedEmployeeSchedule.shiftCode !== 'OFF') {
        setFormShiftCode(selectedEmployeeSchedule.shiftCode);
      }
      if (selectedEmployeeSchedule.location) {
        setFormLocation(selectedEmployeeSchedule.location as WorkLocation);
      }
    }
  }, [isAddModalOpen, selectedEmployeeSchedule]);

  const currentAnchorDate = useMemo(() => parseLocalDate(currentDateStr), [currentDateStr]);

  // Weekly days generator
  const weeklyDays = useMemo(() => {
    const start = new Date(currentAnchorDate);
    const dayOfWeek = start.getDay();
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

  // Monthly days generator
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

  // Schedules visible to current user (Employee only sees Published, PRD 1.3)
  const visibleSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (currentUser?.role === 'Employee' && s.publicationStatus !== 'Published') {
        return false;
      }
      return true;
    });
  }, [schedules, currentUser]);

  // PRD 6.1: Jobdesk Cards with counts & shift breakdown (dynamic from master jobdesks)
  const jobdeskCards = useMemo(() => {
    const activeMasterJobdesks = jobdesks.filter((j) => j.status === 'active' || !j.status);
    const targetJobdesks = activeMasterJobdesks.length > 0 ? activeMasterJobdesks : jobdesks;
    return targetJobdesks.map((master) => {
      const code = master.code;
      const activeAssignments = visibleSchedules.filter((s) => {
        if (s.jobdeskCode !== code) return false;
        if (viewMode === 'daily') return s.date === currentDateStr;
        if (viewMode === 'weekly') return weeklyDays.some((d) => d.iso === s.date);
        return monthlyDays.some((d) => d.iso === s.date);
      });

      // Shift breakdown
      const shiftBreakdown: Record<string, number> = {};
      activeAssignments.forEach((a) => {
        shiftBreakdown[a.shiftCode] = (shiftBreakdown[a.shiftCode] || 0) + 1;
      });

      return {
        code,
        name: master.name || code,
        description: master.description || '',
        color: master.color || '#0284C7',
        textColor: master.textColor,
        totalRoster: activeAssignments.length,
        shiftBreakdown,
        items: activeAssignments
      };
    });
  }, [jobdesks, visibleSchedules, viewMode, currentDateStr, weeklyDays, monthlyDays]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return emp.name.toLowerCase().includes(q) || emp.employeeNo.toLowerCase().includes(q);
      }
      return true;
    });
  }, [employees, searchQuery]);

  // Date Navigation
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

  // Export Jobdesk Matrix (PRD 12.3)
  const handleExport = () => {
    const headers = ['Tanggal', 'Employee ID', 'Nama Karyawan', 'Kode Jobdesk', 'Shift', 'Lokasi'];
    const rows = visibleSchedules
      .filter((s) => s.jobdeskCode)
      .map((s) => [s.date, s.employeeCode, `"${s.employeeName}"`, s.jobdeskCode, s.shiftCode, s.location || '-']);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CTSO_Jobdesk_Matrix_${currentDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Data pembagian Jobdesk berhasil diekspor.', 'success');
  };

  // Open Add / Assign Jobdesk Modal
  const handleOpenAddJobdesk = (
    preselectedJobdesk?: string,
    preselectedDate?: string,
    preselectedEmployeeId?: string,
    preselectedShiftCode?: string
  ) => {
    if (!canManageJobdesk) {
      showToast('Hanya Admin dan SPV yang dapat mengalokasikan jobdesk.', 'warning');
      return;
    }
    const empId = preselectedEmployeeId || employees[0]?.id || '';
    const dateStr = preselectedDate || currentDateStr;
    const existingSched = schedules.find((s) => s.employeeId === empId && s.date === dateStr);

    setFormEmployeeId(empId);
    setFormDate(dateStr);
    setFormJobdeskCode(preselectedJobdesk || 'CT1');
    setFormLocation((existingSched?.location as WorkLocation) || 'Badung');
    setFormAgent(existingSched?.agent || '');
    setFormNote(existingSched?.note || '');
    if (existingSched?.shiftCode && existingSched.shiftCode !== 'OFF') {
      setFormShiftCode(existingSched.shiftCode);
    } else if (preselectedShiftCode && preselectedShiftCode !== 'OFF') {
      setFormShiftCode(preselectedShiftCode);
    } else {
      setFormShiftCode('Pagi 7');
    }
    setIsAddModalOpen(true);
  };

  const handleSaveJobdesk = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === formEmployeeId);
    if (!emp) {
      showToast('Pilih karyawan yang valid.', 'error');
      return;
    }

    const assignedCode = formJobdeskCode === 'NONE' ? undefined : formJobdeskCode;
    const existing = schedules.find((s) => s.employeeId === formEmployeeId && s.date === formDate);

    if (existing) {
      if (existing.shiftCode === 'OFF' && assignedCode) {
        showToast(
          `Karyawan ${emp.name} berstatus libur (OFF) pada ${formDate}. Ubah shift terlebih dahulu sebelum menetapkan jobdesk.`,
          'warning'
        );
        return;
      }
      const res = updateSchedule(existing.id, {
        jobdeskCode: assignedCode,
        location: formLocation,
        agent: formAgent.trim() || undefined,
        note: formNote.trim() || undefined
      });
      if (!res.success) {
        showToast(res.error || 'Gagal mengalokasikan jobdesk.', 'error');
        return;
      }
      showToast(
        assignedCode
          ? `Alokasi jobdesk ${assignedCode} berhasil disimpan untuk ${emp.name}.`
          : `Jobdesk berhasil dikosongkan untuk ${emp.name}.`,
        'success'
      );
    } else {
      const res = addSchedule({
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeNo,
        date: formDate,
        shiftCode: formShiftCode || 'Pagi 7',
        jobdeskCode: assignedCode,
        location: formLocation,
        agent: formAgent.trim() || undefined,
        publicationStatus: 'Published',
        note: formNote.trim() || undefined
      });
      if (!res.success) {
        showToast(res.error || 'Gagal menambahkan jobdesk.', 'error');
        return;
      }
      showToast(`Jobdesk ${assignedCode} berhasil dialokasikan untuk ${emp.name}.`, 'success');
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteJobdesk = (scheduleId: string) => {
    const res = updateSchedule(scheduleId, {
      jobdeskCode: undefined
    });
    if (res.success) {
      showToast('Alokasi jobdesk berhasil dihapus (personel dipindahkan ke belum ditugaskan).', 'success');
      setIsAddModalOpen(false);
    } else {
      showToast(res.error || 'Gagal menghapus alokasi jobdesk.', 'error');
    }
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    if (!canManageJobdesk) {
      showToast('Akses ditolak: Hanya Admin/SPV yang dapat menghapus roster.', 'error');
      return;
    }
    const success = deleteSchedule(scheduleId);
    if (success) {
      showToast('Block event jadwal berhasil dihapus dari sistem.', 'info');
      setIsAddModalOpen(false);
    } else {
      showToast('Gagal menghapus jadwal.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#0F172A] dark:text-white tracking-tight">
              Jobdesk Allocation
            </h1>
          </div>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Personnel task allocation view across Incident Dispatch (CT1), Surveillance & SLA (CT2), and Field Escalation (CT4).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageJobdesk && (
            <button
              type="button"
              onClick={() => handleOpenAddJobdesk()}
              className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#111111]" aria-hidden="true" />
              <span>Add Jobdesk</span>
            </button>
          )}
          {canManageJobdesk && (
            <button
              type="button"
              onClick={handleExport}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Strip */}
      <div className="bg-white dark:bg-[#18181A] p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-bold" role="group" aria-label="Mode tampilan jobdesk">
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
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-gray-300"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202020] text-xs font-bold text-[#202020] dark:text-white font-mono shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-[#FFE160]/25 text-[#202020] dark:text-[#FFD416] flex items-center justify-center shrink-0">
              <CalendarIcon className="w-3.5 h-3.5 text-[#202020] dark:text-[#FFD416]" aria-hidden="true" />
            </div>
            <span>
              {viewMode === 'daily' && formatDateDMY(currentDateStr)}
              {viewMode === 'weekly' && `${formatDateDMY(weeklyDays[0]?.iso)} – ${formatDateDMY(weeklyDays[6]?.iso)}`}
              {viewMode === 'monthly' &&
                currentAnchorDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <button
            type="button"
            aria-label="Periode berikutnya"
            onClick={() => handleNavigateDate('next')}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-gray-300"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentDateStr(getTodayIso())}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5"
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

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              aria-label="Cari nama karyawan"
              placeholder="Cari nama karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs text-[#0F172A] dark:text-white placeholder-slate-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* PRD 6.1: Dynamic Jobdesk Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {jobdeskCards.map((card) => (
          <div
            key={card.code}
            className="bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span
                style={{
                  backgroundColor: card.color,
                  color: card.textColor || getContrastTextColor(card.color)
                }}
                className="text-xs font-black font-mono px-3.5 py-1.5 rounded-xl shadow-xs"
              >
                {card.code}
              </span>

              <button
                type="button"
                onClick={() => setSelectedJobdeskDetail(card)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
                title={`Lihat keterangan tugas ${card.code}`}
              >
                <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>View Jobdesk</span>
              </button>
            </div>

            <div className="mt-3.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {card.name}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* VIEW 1: DAILY KANBAN (PRD Section 6.2) - List Only (Header description already in top cards) */}
      {viewMode === 'daily' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {jobdeskCards.map((col) => {
            const dailyItems = visibleSchedules.filter(
              (s) => s.date === currentDateStr && s.jobdeskCode === col.code
            );

            return (
              <div
                key={col.code}
                className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col"
              >
                {/* Column Cards List */}
                <div className="p-3.5 space-y-2.5 flex-1 min-h-[220px]">
                  {dailyItems.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-6 text-xs text-slate-400 dark:text-gray-500 italic">
                      Tidak ada personel bertugas di {col.code} pada tanggal ini.
                    </div>
                  ) : (
                    dailyItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (canManageJobdesk) {
                            handleOpenAddJobdesk(item.jobdeskCode, item.date, item.employeeId);
                          } else {
                            setSelectedAssignmentForView(item);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl border-0 hover:opacity-95 space-y-2 transition-all ${
                          getJobdeskBadgeStyle(col.code).card
                        }`}
                        title={canManageJobdesk ? "Klik untuk ubah jobdesk" : "Klik untuk melihat detail & catatan"}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-current truncate">
                            {item.employeeName}
                          </span>
                          <span className="text-[10px] font-mono text-current opacity-80 shrink-0 ml-2">
                            {item.employeeCode}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-current/15">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${getShiftBadgeStyle(item.shiftCode).badge}`}>
                              {item.shiftCode}
                            </span>
                            {item.agent && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono shadow-2xs inline-flex items-center gap-1 ${getAgentPillStyle(item.agent).bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${getAgentPillStyle(item.agent).dot}`} />
                                <span>{item.agent}</span>
                              </span>
                            )}
                          </div>

                          {item.note && (
                            <span
                              className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current ml-auto"
                              title={`Ada catatan: ${item.note}`}
                            >
                              <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}

                  {canManageJobdesk && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddJobdesk(col.code, currentDateStr)}
                      className="w-full py-2 border border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl text-xs font-semibold text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-colors mt-2 bg-white/40 dark:bg-white/[0.01]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Personel {col.code}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: WEEKLY TABLE (PRD Section 6.2) */}
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
                    const isSunday = d.dayName === 'Min' || d.dayName === 'Minggu';
                    const hasHoliday = !!holidays[d.iso];
                    return (
                      <th
                        key={d.iso}
                        onClick={() => handleOpenHolidayModal(d.iso)}
                        title={hasHoliday ? `${holidays[d.iso]} (Klik untuk ubah)` : 'Klik untuk tambah catatan hari besar'}
                        className={`py-3 px-3 text-center min-w-[120px] cursor-pointer transition-colors ${
                          d.isToday
                            ? 'bg-orange-50/70 dark:bg-amber-500/10 text-orange-800 dark:text-amber-400 border-x border-[#CBD5E1] dark:border-white/10'
                            : hasHoliday
                            ? 'bg-rose-100/70 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-x border-rose-300 dark:border-rose-900/50'
                            : isSunday
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-x border-rose-200 dark:border-rose-900/40'
                            : 'hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className={`text-[10px] uppercase font-bold ${isSunday || hasHoliday ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-gray-400'}`}>
                          {d.dayName}
                        </div>
                        <div className={`text-sm font-extrabold font-mono ${isSunday || hasHoliday ? 'text-rose-900 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>
                          {d.dayNumber} {d.monthName}
                        </div>
                        {hasHoliday && (
                          <div className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white truncate max-w-[110px] mx-auto shadow-2xs">
                            {holidays[d.iso]}
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
                    <td className="py-2.5 px-4 sticky left-0 bg-white dark:bg-[#18181A] z-10 border-r border-slate-200 dark:border-white/10 shadow-2xs">
                      <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-gray-400 font-mono">
                        {emp.employeeNo}
                      </div>
                    </td>

                    {weeklyDays.map((day) => {
                      const assignment = visibleSchedules.find(
                        (s) =>
                          (s.employeeId === emp.id ||
                            s.employeeId === emp.employeeNo ||
                            s.employeeCode === emp.employeeNo) &&
                          s.date === day.iso
                      );
                      const isSunday = day.dayName === 'Min' || day.dayName === 'Minggu';
                      const hasHoliday = !!holidays[day.iso];

                      return (
                        <td
                          key={day.iso}
                          onClick={() => {
                            if (assignment?.shiftCode === 'OFF') {
                              if (!canManageJobdesk && assignment) {
                                setSelectedAssignmentForView(assignment);
                                return;
                              }
                              showToast('Karyawan libur (OFF). Hari libur tidak dapat dialokasikan jobdesk.', 'warning');
                              return;
                            }
                            if (canManageJobdesk) {
                              handleOpenAddJobdesk(assignment?.jobdeskCode, day.iso, emp.id, assignment?.shiftCode);
                            } else if (assignment) {
                              setSelectedAssignmentForView(assignment);
                            }
                          }}
                          className={`py-2 px-2 text-center align-middle cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.05] transition-colors ${
                            day.isToday
                              ? 'bg-orange-50/20 dark:bg-amber-500/5'
                              : hasHoliday
                              ? 'bg-rose-50/35 dark:bg-rose-950/25'
                              : isSunday
                              ? 'bg-rose-50/25 dark:bg-rose-950/15'
                              : ''
                          }`}
                        >
                          {assignment ? (
                            assignment.shiftCode === 'OFF' ? (
                              <div className={`py-2 px-1.5 rounded-xl border-0 font-black text-[10px] tracking-wider uppercase text-center ${getShiftBadgeStyle('OFF').card}`}>
                                <div>WEEKLY DAY OFF</div>
                                {assignment.note && (
                                  <div className="mt-1 flex items-center justify-center">
                                    <span className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current" title={`Ada catatan: ${assignment.note}`}>
                                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : assignment.jobdeskCode ? (
                              <div
                                className={`py-1.5 px-2 rounded-xl border-0 flex flex-col justify-between text-left transition-all ${
                                  getJobdeskBadgeStyle(assignment.jobdeskCode).card
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-black text-xs uppercase tracking-tight">
                                    {assignment.jobdeskCode}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-black/10 dark:bg-white/15 text-current">
                                    {assignment.shiftCode}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1 min-h-[16px]">
                                  <div>
                                    {assignment.agent ? (
                                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black font-mono shadow-2xs inline-flex items-center gap-1 ${getAgentPillStyle(assignment.agent).bg}`}>
                                        <span className={`w-1 h-1 rounded-full ${getAgentPillStyle(assignment.agent).dot}`} />
                                        <span className="truncate max-w-[65px]">{assignment.agent}</span>
                                      </span>
                                    ) : null}
                                  </div>
                                  {assignment.note && (
                                    <span
                                      className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current ml-auto"
                                      title={`Ada catatan: ${assignment.note}`}
                                    >
                                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`py-2 px-2 rounded-xl border-0 flex flex-col items-center justify-center text-center transition-all ${
                                  getShiftBadgeStyle(assignment.shiftCode).card
                                }`}
                                title={`Shift: ${assignment.shiftCode}. Klik untuk alokasi Jobdesk`}
                              >
                                <div className="font-mono font-black text-xs uppercase tracking-tight flex items-center justify-center gap-1">
                                  <span>{assignment.shiftCode}</span>
                                  {assignment.note && (
                                    <span className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current" title={`Ada catatan: ${assignment.note}`}>
                                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 px-2 py-0.5 rounded-md bg-black/15 dark:bg-white/20 text-[9px] font-bold flex items-center gap-1 shadow-2xs">
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Isi Jobdesk</span>
                                </div>
                              </div>
                            )
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-[#F9C900] hover:text-[#111111] text-slate-500 dark:text-gray-400 font-extrabold text-xs flex items-center justify-center mx-auto transition-all"
                              title="Tambah Jobdesk"
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

      {/* VIEW 3: MONTHLY TABLE (PRD Section 6.2) */}
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
                    const hasHoliday = !!holidays[d.iso];
                    return (
                      <th
                        key={d.iso}
                        onClick={() => handleOpenHolidayModal(d.iso)}
                        title={hasHoliday ? `${holidays[d.iso]} (Klik untuk ubah)` : 'Klik untuk tambah catatan hari besar'}
                        className={`py-3 px-3 text-center min-w-[120px] cursor-pointer transition-colors ${
                          d.isToday
                            ? 'bg-orange-50/70 dark:bg-amber-500/10 text-orange-800 dark:text-amber-400 border-x border-[#CBD5E1] dark:border-white/10'
                            : hasHoliday
                            ? 'bg-rose-100/70 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-x border-rose-300 dark:border-rose-900/50'
                            : isSunday
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-x border-rose-200 dark:border-rose-900/40'
                            : 'hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className={`text-[10px] uppercase font-bold ${isSunday || hasHoliday ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-gray-400'}`}>
                          {d.dayName}
                        </div>
                        <div className={`text-sm font-extrabold font-mono ${isSunday || hasHoliday ? 'text-rose-900 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>
                          {d.dayNumber} {d.monthName}
                        </div>
                        {hasHoliday && (
                          <div className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white truncate max-w-[110px] mx-auto shadow-2xs">
                            {holidays[d.iso]}
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
                    <td className="py-2.5 px-4 sticky left-0 bg-white dark:bg-[#18181A] z-10 border-r border-slate-200 dark:border-white/10 shadow-2xs">
                      <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-gray-400 font-mono">
                        {emp.employeeNo}
                      </div>
                    </td>

                    {monthlyDays.map((day) => {
                      const assignment = visibleSchedules.find(
                        (s) =>
                          (s.employeeId === emp.id ||
                            s.employeeId === emp.employeeNo ||
                            s.employeeCode === emp.employeeNo) &&
                          s.date === day.iso
                      );
                      const isSunday = day.dayName === 'Min' || day.dayName === 'Minggu';
                      const hasHoliday = !!holidays[day.iso];

                      return (
                        <td
                          key={day.iso}
                          onClick={() => {
                            if (assignment?.shiftCode === 'OFF') {
                              if (!canManageJobdesk && assignment) {
                                setSelectedAssignmentForView(assignment);
                                return;
                              }
                              showToast('Karyawan libur (OFF). Hari libur tidak dapat dialokasikan jobdesk.', 'warning');
                              return;
                            }
                            if (canManageJobdesk) {
                              handleOpenAddJobdesk(assignment?.jobdeskCode, day.iso, emp.id, assignment?.shiftCode);
                            } else if (assignment) {
                              setSelectedAssignmentForView(assignment);
                            }
                          }}
                          className={`py-2 px-2 text-center align-middle cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.05] transition-colors ${
                            day.isToday
                              ? 'bg-orange-50/20 dark:bg-amber-500/5'
                              : hasHoliday
                              ? 'bg-rose-50/35 dark:bg-rose-950/25'
                              : isSunday
                              ? 'bg-rose-50/25 dark:bg-rose-950/15'
                              : ''
                          }`}
                        >
                          {assignment ? (
                            assignment.shiftCode === 'OFF' ? (
                              <div className={`py-2 px-1.5 rounded-xl border-0 font-black text-[10px] tracking-wider uppercase text-center ${getShiftBadgeStyle('OFF').card}`}>
                                <div>WEEKLY DAY OFF</div>
                                {assignment.note && (
                                  <div className="mt-1 flex items-center justify-center">
                                    <span className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current" title={`Ada catatan: ${assignment.note}`}>
                                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : assignment.jobdeskCode ? (
                              <div
                                className={`py-1.5 px-2 rounded-xl border-0 flex flex-col justify-between text-left transition-all ${
                                  getJobdeskBadgeStyle(assignment.jobdeskCode).card
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-black text-xs uppercase tracking-tight">
                                    {assignment.jobdeskCode}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-black/10 dark:bg-white/15 text-current">
                                    {assignment.shiftCode}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1 min-h-[16px]">
                                  <div>
                                    {assignment.agent ? (
                                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black font-mono shadow-2xs inline-flex items-center gap-1 ${getAgentPillStyle(assignment.agent).bg}`}>
                                        <span className={`w-1 h-1 rounded-full ${getAgentPillStyle(assignment.agent).dot}`} />
                                        <span className="truncate max-w-[65px]">{assignment.agent}</span>
                                      </span>
                                    ) : null}
                                  </div>
                                  {assignment.note && (
                                    <span
                                      className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current ml-auto"
                                      title={`Ada catatan: ${assignment.note}`}
                                    >
                                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`py-2 px-2 rounded-xl border-0 flex flex-col items-center justify-center text-center transition-all ${
                                  getShiftBadgeStyle(assignment.shiftCode).card
                                }`}
                                title={`Shift: ${assignment.shiftCode}. Klik untuk alokasi Jobdesk`}
                              >
                                <div className="font-mono font-black text-xs uppercase tracking-tight flex items-center justify-center gap-1">
                                  <span>{assignment.shiftCode}</span>
                                  {assignment.note && (
                                    <span className="p-0.5 rounded bg-black/10 dark:bg-white/20 text-current" title={`Ada catatan: ${assignment.note}`}>
                                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 px-2 py-0.5 rounded-md bg-black/15 dark:bg-white/20 text-[9px] font-bold flex items-center gap-1 shadow-2xs">
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Isi Jobdesk</span>
                                </div>
                              </div>
                            )
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-indigo-600 hover:text-white text-slate-500 dark:text-gray-400 font-extrabold text-xs flex items-center justify-center mx-auto transition-all"
                              title="Tambah Jobdesk"
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

      {/* MODAL: ADD / ALLOCATE JOBDESK */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Alokasi Jobdesk Personel"
        size="md"
      >
        <form onSubmit={handleSaveJobdesk} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              Karyawan CTSO
            </label>
            <select
              value={formEmployeeId}
              onChange={(e) => setFormEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#F9C900]"
              required
            >
              {employees
                .filter((e) => e.status === 'active')
                .map((e) => {
                  const sched = schedules.find((s) => s.employeeId === e.id && s.date === formDate);
                  const shiftDesc = sched
                    ? sched.shiftCode === 'OFF'
                      ? 'WEEKLY DAY OFF'
                      : `Shift ${sched.shiftCode} (${getShiftHours(sched.shiftCode)})`
                    : 'Belum Ada Shift';
                  return (
                    <option
                      key={e.id}
                      value={e.id}
                      className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white"
                    >
                      {e.name} ({e.employeeNo}) &bull; {shiftDesc}
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Live Shift & Workload Balance Insights Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#F9C900]" />
                Jadwal Shift Karyawan ({formDate})
              </span>
              {selectedEmployeeSchedule ? (
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black font-mono shadow-2xs ${
                    getShiftBadgeStyle(selectedEmployeeSchedule.shiftCode).card
                  }`}
                >
                  {selectedEmployeeSchedule.shiftCode === 'OFF'
                    ? 'WEEKLY DAY OFF'
                    : `SHIFT: ${selectedEmployeeSchedule.shiftCode}`}
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-100/70 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800/40">
                  Belum Ada Shift di Schedule
                </span>
              )}
            </div>

            {selectedEmployeeSchedule ? (
              <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-slate-700 dark:text-gray-300">
                    Jam Kerja: <strong className="font-mono text-slate-900 dark:text-white">{getShiftHours(selectedEmployeeSchedule.shiftCode)}</strong>
                  </div>
                  <div className="text-slate-700 dark:text-gray-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Hub: <strong className="text-slate-900 dark:text-white">{selectedEmployeeSchedule.location || 'Badung'}</strong></span>
                  </div>
                </div>

                {/* Workload Distribution for this specific Shift on this Date */}
                {selectedEmployeeSchedule.shiftCode !== 'OFF' && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                      <span>Pemerataan Beban Kerja Shift {selectedEmployeeSchedule.shiftCode}:</span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-gray-400">
                        {workloadPeers.length} Rekan Tim Terjadwal
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                      <div className="p-1.5 rounded-xl bg-[#38BDF8]/20 dark:bg-[#0284C7]/30 border border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-200">
                        <div className="font-black">CT1</div>
                        <div className="font-bold">{workloadPeers.filter((s) => s.jobdeskCode === 'CT1').length} org</div>
                      </div>
                      <div className="p-1.5 rounded-xl bg-[#FBBF24]/25 dark:bg-[#D97706]/30 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200">
                        <div className="font-black">CT2</div>
                        <div className="font-bold">{workloadPeers.filter((s) => s.jobdeskCode === 'CT2').length} org</div>
                      </div>
                      <div className="p-1.5 rounded-xl bg-[#818CF8]/25 dark:bg-[#4F46E5]/30 border border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200">
                        <div className="font-black">CT4</div>
                        <div className="font-bold">{workloadPeers.filter((s) => s.jobdeskCode === 'CT4').length} org</div>
                      </div>
                      <div className="p-1.5 rounded-xl bg-slate-200/80 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-gray-300">
                        <div className="font-black">Belum Ada</div>
                        <div className="font-bold">{workloadPeers.filter((s) => !s.jobdeskCode).length} org</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-gray-400 italic">
                Karyawan ini belum dijadwalkan shift pada kalender tanggal ini. Anda dapat memilih shift manual di bawah.
              </p>
            )}
          </div>

          {selectedEmployeeSchedule?.shiftCode === 'OFF' && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>Karyawan ini berstatus <strong>WEEKLY DAY OFF (Libur)</strong> pada tanggal ini. Jobdesk tidak dapat dialokasikan saat hari libur.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ModernDatePicker
              label="Tanggal Penugasan"
              value={formDate}
              onChange={setFormDate}
              required
            />
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Kode Jobdesk
              </label>
              <select
                value={formJobdeskCode}
                onChange={(e) => setFormJobdeskCode(e.target.value)}
                disabled={selectedEmployeeSchedule?.shiftCode === 'OFF'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] disabled:opacity-50 disabled:cursor-not-allowed text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-[#F9C900]"
                required
              >
                {jobdesks.map((j) => (
                  <option key={j.id} value={j.code} className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white">
                    {j.code} - {j.name}
                  </option>
                ))}
                <option value="NONE" className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white">-- Tanpa Jobdesk (Kosongkan) --</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Lokasi Tugas
              </label>
              <select
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#F9C900]"
              >
                <option value="Badung" className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white">Badung (Kerobokan)</option>
                <option value="Denpasar" className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white">Denpasar (Gatsu Timur)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Shift Kerja
              </label>
              <select
                value={formShiftCode}
                onChange={(e) => setFormShiftCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#F9C900]"
              >
                {shifts
                  .filter((s) => !s.isOff)
                  .map((s) => (
                    <option key={s.id} value={s.code} className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white">
                      {s.name} ({s.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Kriteria Agent (Bisa Ditambah & Dihapus, warna berbeda setiap agent) */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                Kriteria Agent
              </label>
              <button
                type="button"
                onClick={() => setIsManagingAgents(!isManagingAgents)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{isManagingAgents ? 'Tutup Pengelola Agent' : '+ Tambah / Hapus Opsi Agent'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={formAgent}
                  onChange={(e) => setFormAgent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#F9C900]"
                >
                  <option value="" className="bg-white dark:bg-[#202023] text-slate-500 font-normal">-- Tanpa Kriteria Agent --</option>
                  {customAgents.map((ag) => (
                    <option key={ag} value={ag} className="bg-white dark:bg-[#202023] text-slate-800 dark:text-white">
                      {ag}
                    </option>
                  ))}
                </select>
              </div>

              {formAgent && (
                <div className="shrink-0">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black font-mono shadow-2xs inline-flex items-center gap-1.5 ${getAgentPillStyle(formAgent).bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getAgentPillStyle(formAgent).dot}`} />
                    <span>{formAgent}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Sub-Panel: Add / Delete Custom Agent Tags */}
            {isManagingAgents && (
              <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAgentInput}
                    onChange={(e) => setNewAgentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAgent(newAgentInput);
                      }
                    }}
                    placeholder="Nama agent baru (misal: Agent 5)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#F9C900]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAgent(newAgentInput)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-2xs"
                  >
                    Tambah
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customAgents.map((ag) => (
                    <span
                      key={ag}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono inline-flex items-center gap-1.5 ${getAgentPillStyle(ag).bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${getAgentPillStyle(ag).dot}`} />
                      <span>{ag}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAgent(ag)}
                        className="hover:text-rose-600 text-current opacity-70 hover:opacity-100 ml-0.5"
                        title={`Hapus ${ag} dari daftar`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {customAgents.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">Belum ada agent tersimpan. Tambah nama di atas.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span>Catatan Penugasan Jobdesk</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Dapat dibaca oleh viewer</span>
            </label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={2}
              placeholder="Catatan tugas khusus, instruksi penugasan, serah terima..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202023] text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#F9C900] resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              {selectedEmployeeSchedule?.jobdeskCode && (
                <button
                  type="button"
                  onClick={() => handleDeleteJobdesk(selectedEmployeeSchedule.id)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center gap-1.5 transition-colors border border-amber-200 dark:border-amber-800/40"
                  title="Hapus penugasan jobdesk ini saja (jadwal shift tetap ada)"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Lepas Jobdesk
                </button>
              )}
              {selectedEmployeeSchedule && (
                <button
                  type="button"
                  onClick={() => handleDeleteSchedule(selectedEmployeeSchedule.id)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 flex items-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-900/40"
                  title="Hapus seluruh block jadwal karyawan ini"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Jadwal
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={selectedEmployeeSchedule?.shiftCode === 'OFF'}
                className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] disabled:opacity-40 disabled:cursor-not-allowed text-[#111111] border border-[#E5B800] text-xs font-bold shadow-sm"
              >
                Simpan Jobdesk
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW DETAIL & NOTE (VIEWER / EMPLOYEE) */}
      <Modal
        isOpen={!!selectedAssignmentForView}
        onClose={() => setSelectedAssignmentForView(null)}
        title="Detail Alokasi Jobdesk & Catatan"
        size="md"
      >
        {selectedAssignmentForView && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedAssignmentForView.employeeName}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-gray-400">
                    {selectedAssignmentForView.employeeCode}
                  </p>
                </div>
                {selectedAssignmentForView.jobdeskCode ? (
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black font-mono shadow-2xs ${
                      getJobdeskBadgeStyle(selectedAssignmentForView.jobdeskCode).card
                    }`}
                  >
                    {selectedAssignmentForView.jobdeskCode}
                  </span>
                ) : (
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black font-mono shadow-2xs ${
                      getShiftBadgeStyle(selectedAssignmentForView.shiftCode).card
                    }`}
                  >
                    {selectedAssignmentForView.shiftCode}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Tanggal:</span>
                  <div className="font-bold text-slate-800 dark:text-white font-mono mt-0.5">
                    {selectedAssignmentForView.date}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Shift:</span>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">
                    {selectedAssignmentForView.shiftCode} ({getShiftHours(selectedAssignmentForView.shiftCode)})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Peran Jobdesk:</span>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">
                    {jobdesks.find((j) => j.code === selectedAssignmentForView.jobdeskCode)?.name || selectedAssignmentForView.jobdeskCode || '-'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Lokasi Tugas:</span>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">
                    {selectedAssignmentForView.location || 'Badung'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Kriteria Agent:</span>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5 flex items-center gap-1.5">
                    {selectedAssignmentForView.agent ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono inline-flex items-center gap-1 ${getAgentPillStyle(selectedAssignmentForView.agent).bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getAgentPillStyle(selectedAssignmentForView.agent).dot}`} />
                        <span>{selectedAssignmentForView.agent}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal italic">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Note Section */}
            <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Catatan Penugasan</span>
              </div>
              {selectedAssignmentForView.note ? (
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedAssignmentForView.note}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-gray-400 italic">
                  Tidak ada catatan khusus untuk alokasi jobdesk ini.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedAssignmentForView(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: MANUAL NOTE & HARI BESAR / TANGGAL MERAH */}
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

      {/* MODAL: VIEW KETERANGAN JOBDESK */}
      <Modal
        isOpen={!!selectedJobdeskDetail}
        onClose={() => setSelectedJobdeskDetail(null)}
        title={`Keterangan Jobdesk - ${selectedJobdeskDetail?.code || ''}`}
        size="md"
      >
        {selectedJobdeskDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              <span
                style={{
                  backgroundColor: selectedJobdeskDetail.color,
                  color: selectedJobdeskDetail.textColor || getContrastTextColor(selectedJobdeskDetail.color)
                }}
                className="text-sm font-black font-mono px-3.5 py-1.5 rounded-xl shadow-md ring-2 ring-black/10 dark:ring-white/20"
              >
                {selectedJobdeskDetail.code}
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedJobdeskDetail.name}
                </h4>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Total Personel:{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedJobdeskDetail.totalRoster} Personel
                  </strong>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Ruang Lingkup &amp; Butir Tugas</span>
              </h5>
              <div className="space-y-2">
                {parseJobdeskTasks(selectedJobdeskDetail.description).length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-gray-500 italic">
                    Belum ada deskripsi tugas.
                  </p>
                ) : (
                  parseJobdeskTasks(selectedJobdeskDetail.description).map((task: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: selectedJobdeskDetail.color || '#0284C7' }}
                      />
                      <span className="leading-relaxed font-medium">{task}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {Object.entries(selectedJobdeskDetail.shiftBreakdown).length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Distribusi Personel per Shift:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(selectedJobdeskDetail.shiftBreakdown).map(([shiftName, count]) => (
                    <span
                      key={shiftName}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono"
                    >
                      <span>{shiftName}:</span>
                      <strong>{count as number}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedJobdeskDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
