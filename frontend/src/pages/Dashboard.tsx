import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  CalendarOff,
  MapPin,
  Clock,
  Layers,
  Search,
  Calendar,
  X,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Trash2,
  Monitor
} from 'lucide-react';
import { getShiftBadgeStyle, getJobdeskBadgeStyle, getContrastTextColor, isOffShiftCode } from '../utils/codeStyles';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import { sortByEmployeeOrder, EmployeeSortMode } from '../utils/employeeSort';

export const Dashboard: React.FC = () => {
  const { employees, schedules, shifts, jobdesks, leaves, currentUser, deleteSchedule } = useAuth();
  const navigate = useNavigate();
  const canManage = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  const getTodayIso = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIso());
  const [locationFilter, setLocationFilter] = useState<'All' | 'Badung' | 'Denpasar'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterJobdesk, setFilterJobdesk] = useState<string>('all');
  const [filterDutyStatus, setFilterDutyStatus] = useState<'all' | 'working' | 'off'>('all');
  const [sortMode, setSortMode] = useState<EmployeeSortMode>('default');

  const [activeModalTitle, setActiveModalTitle] = useState<string | null>(null);
  const [modalAssignments, setModalAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (!activeModalTitle) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModalTitle(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalTitle]);

  // Fast employee lookup map
  const empMap = useMemo(() => {
    const m = new Map<string, typeof employees[0]>();
    employees.forEach((e) => {
      m.set(e.id, e);
      m.set(e.employeeNo, e);
      if (e.name) m.set(e.name.toLowerCase(), e);
    });
    return m;
  }, [employees]);

  // Helper to determine if a shift code counts as Off/Libur/Cuti/Ijin/Sakit/Weekoff
  const isOffShift = useCallback(
    (shiftCode: string): boolean => isOffShiftCode(shiftCode, shifts),
    [shifts]
  );

  // Approved Leaves for selected date
  const approvedLeavesToday = useMemo(() => {
    if (!leaves || !Array.isArray(leaves)) return [];
    return leaves.filter((l) => {
      if (l.status !== 'Approved') return false;
      return l.startDate <= selectedDate && l.endDate >= selectedDate;
    });
  }, [leaves, selectedDate]);

  // Day assignments from schedules for selected date & location
  const dayAssignments = useMemo(() => {
    return schedules.filter((s) => {
      if (s.date !== selectedDate) return false;

      // Filter out orphaned schedules whose employee does not exist in master employee directory
      const hasEmp = empMap.has(s.employeeId) || (s.employeeCode && empMap.has(s.employeeCode));
      if (!hasEmp) return false;

      if (currentUser?.role === 'Employee' && s.publicationStatus !== 'Published') {
        return false;
      }
      if (locationFilter !== 'All' && s.location !== locationFilter) {
        return false;
      }
      return true;
    });
  }, [schedules, selectedDate, locationFilter, currentUser, empMap]);

  // Comprehensive KPIs
  const kpis = useMemo(() => {
    const relevantEmployees =
      locationFilter === 'All'
        ? employees
        : employees.filter((e) => e.defaultLocation === locationFilter);

    const totalKaryawan = relevantEmployees.length;
    const activeEmployees = relevantEmployees.filter((e) => e.status === 'active').length;

    // Working assignments (actively on duty, not an off/libur shift)
    const workingAssignments = dayAssignments.filter((s) => !isOffShift(s.shiftCode));
    const workingToday = workingAssignments.length;

    // Off Day assignments (shift is off/libur/cuti)
    const offAssignments = dayAssignments.filter((s) => isOffShift(s.shiftCode));

    // Approved leaves today
    const offEmpIds = new Set(offAssignments.map((s) => s.employeeId || s.employeeCode));
    const additionalLeaves = approvedLeavesToday.filter(
      (l) => !offEmpIds.has(l.employeeId)
    );
    const offDay = offAssignments.length + additionalLeaves.length;

    // Hub specific working staff
    const badungShift = workingAssignments.filter(
      (s) => s.location === 'Badung' || (!s.location && empMap.get(s.employeeId)?.defaultLocation === 'Badung')
    ).length;

    const denpasarShift = workingAssignments.filter(
      (s) => s.location === 'Denpasar' || (!s.location && empMap.get(s.employeeId)?.defaultLocation === 'Denpasar')
    ).length;

    return {
      totalKaryawan,
      activeEmployees,
      workingToday,
      offDay,
      badungShift,
      denpasarShift,
      workingAssignments,
      offAssignments,
      additionalLeaves
    };
  }, [employees, dayAssignments, isOffShift, approvedLeavesToday, locationFilter, empMap]);

  // Kanban Columns - Active Master Jobdesks Only (Working Personnel Only)
  const kanbanColumns = useMemo(() => {
    // Only working personnel are allocated to active jobdesks (off day staff do not work jobdesks)
    const workingStaff = dayAssignments.filter((s) => !isOffShift(s.shiftCode));

    const activeMasterJobdesks = jobdesks.filter((j) => j.status === 'active' || !j.status);
    const targetJobdesks = activeMasterJobdesks.length > 0 ? activeMasterJobdesks : jobdesks;

    return targetJobdesks
      .map((jd) => {
        const items = sortByEmployeeOrder(
          workingStaff.filter((s) => s.jobdeskCode === jd.code),
          (s) => s.employeeName || '',
          sortMode
        );
        return {
          code: jd.code,
          name: jd.name || jd.code,
          color: jd.color || '#0284C7',
          textColor: jd.textColor,
          items
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
  }, [dayAssignments, jobdesks, isOffShift]);

  // Shift Distribution Groups
  const shiftGroups = useMemo(() => {
    const map = new Map<string, { shift: any; count: number; items: any[]; isOff: boolean }>();

    // 1. Populate from master shifts
    shifts.forEach((sh) => {
      const items = dayAssignments.filter((s) => s.shiftCode === sh.code);
      map.set(sh.code, {
        shift: sh,
        count: items.length,
        items,
        isOff: Boolean(sh.isOff || isOffShift(sh.code))
      });
    });

    // 2. Catch any active shift codes present in day assignments not in master
    dayAssignments.forEach((s) => {
      if (!map.has(s.shiftCode)) {
        const off = isOffShift(s.shiftCode);
        map.set(s.shiftCode, {
          shift: {
            id: `sh_${s.shiftCode}`,
            code: s.shiftCode,
            name: s.shiftCode,
            startTime: off ? '-' : '08:00',
            endTime: off ? '-' : '16:00',
            endDayOffset: 0,
            color: off ? '#E11D48' : '#0284C7',
            isOff: off
          },
          count: 0,
          items: [],
          isOff: off
        });
      }
      const existing = map.get(s.shiftCode);
      if (existing && !existing.items.some((it) => it.id === s.id)) {
        existing.items.push(s);
        existing.count = existing.items.length;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.shift.code || '').localeCompare(String(b.shift.code || ''), undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    );
  }, [shifts, dayAssignments, isOffShift]);

  // Filtered Roster Directory Table
  const filteredRoster = useMemo(() => {
    const list = dayAssignments.filter((item) => {
      if (filterShift !== 'all' && item.shiftCode !== filterShift) return false;
      if (filterJobdesk !== 'all' && (item.jobdeskCode || 'UNASSIGNED') !== filterJobdesk) return false;

      if (filterDutyStatus === 'working' && isOffShift(item.shiftCode)) return false;
      if (filterDutyStatus === 'off' && !isOffShift(item.shiftCode)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.employeeName.toLowerCase().includes(q);
        const matchCode = item.employeeCode.toLowerCase().includes(q);
        const matchLoc = (item.location || '').toLowerCase().includes(q);
        const matchJd = (item.jobdeskCode || '').toLowerCase().includes(q);
        const matchShift = item.shiftCode.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchLoc && !matchJd && !matchShift) return false;
      }
      return true;
    });
    return sortByEmployeeOrder(list, (item) => item.employeeName || '', sortMode);
  }, [dayAssignments, filterShift, filterJobdesk, filterDutyStatus, searchQuery, isOffShift, sortMode]);

  const getShiftHours = (shiftCode: string) => {
    if (isOffShift(shiftCode)) return 'OFF (Rest / Libur)';
    const sh = shifts.find((s) => s.code === shiftCode);
    if (!sh) return '-';
    if (sh.isOff) return 'OFF (Rest / Libur)';
    return `${sh.startTime} - ${sh.endTime}${sh.endDayOffset > 0 ? ' (+1)' : ''}`;
  };

  const openKpiDetail = (title: string, list: any[]) => {
    setActiveModalTitle(title);
    setModalAssignments(list);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#18181A] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F2F4F7] tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-xs text-slate-600 dark:text-gray-300 mt-1">
            Monitoring realtime alokasi jobdesk, kehadiran shift, dan status operasional personel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFD416] hover:bg-[#E5BD00] text-[#202020] text-xs font-extrabold border border-[#E5BD00] shadow-gx transition-colors cursor-pointer"
          >
            <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Live Workspace</span>
          </button>

          <div className="w-56 sm:w-64">
            <ModernDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              showQuickPresets={true}
            />
          </div>

          <div
            className="flex items-center p-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 text-xs"
            role="group"
            aria-label="Filter Lokasi Hub"
          >
            {(['All', 'Badung', 'Denpasar'] as const).map((loc) => {
              const label = loc === 'All' ? 'All Hubs' : loc;
              const isActive = locationFilter === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setLocationFilter(loc)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-xs dark:bg-white dark:text-[#0F172A]'
                      : 'text-slate-600 dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Total Personnel */}
        <button
          type="button"
          onClick={() =>
            openKpiDetail(
              'Master Karyawan Terdaftar',
              employees.map((e) => {
                const todaySched = dayAssignments.find(
                  (s) => s.employeeId === e.id || s.employeeCode === e.employeeNo
                );
                return {
                  employeeName: e.name,
                  employeeCode: e.employeeNo,
                  shiftCode: todaySched ? todaySched.shiftCode : (e.status === 'active' ? 'Belum Ada Jadwal' : 'Inactive'),
                  jobdeskCode: todaySched?.jobdeskCode || e.defaultJobdesk,
                  location: todaySched?.location || e.defaultLocation,
                  publicationStatus: todaySched ? todaySched.publicationStatus : (e.status === 'active' ? 'Active' : 'Inactive'),
                  role: e.role || e.level,
                  teamName: e.teamName
                };
              })
            )
          }
          className="text-left bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs transition-all flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">Total Employees</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center">
              <Users className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.totalKaryawan}
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-slate-600 dark:text-gray-300">Employee</span>
            </div>
          </div>
        </button>

        {/* 2. Working Personnel */}
        <button
          type="button"
          onClick={() =>
            openKpiDetail(
              `Personel Bertugas (${selectedDate})`,
              kpis.workingAssignments
            )
          }
          className="text-left bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs transition-all flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">Working Today</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center">
              <UserCheck className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.workingToday}
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-slate-600 dark:text-gray-300">Online</span>
            </div>
          </div>
        </button>

        {/* 3. Off Day (Rest / Libur / Cuti) */}
        <button
          type="button"
          onClick={() => {
            const list = [
              ...kpis.offAssignments,
              ...kpis.additionalLeaves.map((l) => ({
                employeeName: l.employeeName,
                employeeCode: empMap.get(l.employeeId)?.employeeNo || l.employeeId,
                shiftCode: l.type || 'CUTI',
                jobdeskCode: undefined,
                location: empMap.get(l.employeeId)?.defaultLocation || 'Hub',
                publicationStatus: 'Approved Leave'
              }))
            ];
            openKpiDetail(`Personel Libur & Cuti (${selectedDate})`, list);
          }}
          className="text-left bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs transition-all flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">OFF Day</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center">
              <CalendarOff className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.offDay}
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-slate-600 dark:text-gray-300">Off / Leave / Permit / Sick</span>
            </div>
          </div>
        </button>

        {/* 4. Badung Hub */}
        <button
          type="button"
          onClick={() =>
            openKpiDetail(
              `Roster Dinas Hub Badung (${selectedDate})`,
              kpis.workingAssignments.filter(
                (s) => s.location === 'Badung' || (!s.location && empMap.get(s.employeeId)?.defaultLocation === 'Badung')
              )
            )
          }
          className="text-left bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs transition-all flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">Badung Hub</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center">
              <MapPin className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.badungShift}
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-slate-600 dark:text-gray-300">
                {kpis.badungShift > 0 ? 'Active' : 'Not active'}
              </span>
            </div>
          </div>
        </button>

        {/* 5. Denpasar Hub */}
        <button
          type="button"
          onClick={() =>
            openKpiDetail(
              `Roster Dinas Hub Denpasar (${selectedDate})`,
              kpis.workingAssignments.filter(
                (s) => s.location === 'Denpasar' || (!s.location && empMap.get(s.employeeId)?.defaultLocation === 'Denpasar')
              )
            )
          }
          className="text-left bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs transition-all flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">Denpasar Hub</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 flex items-center justify-center">
              <MapPin className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.denpasarShift}
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-slate-600 dark:text-gray-300">
                {kpis.denpasarShift > 0 ? 'Active' : 'Not Active'}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Main Content: Left (Jobdesk Kanban + Roster Directory) & Right (Shift Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-stretch">
        <div className="lg:col-span-8 lg:relative">
          <div className="lg:absolute lg:inset-0 flex flex-col gap-6">
          {/* Section: Jobdesk Allocation Today */}
          <div className="bg-white dark:bg-[#18181A] p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-5 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <span>Jobdesk Allocation Today</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-gray-300 mt-1">
                  Alokasi tugas personel dinas aktif per katalog master jobdesk ({kanbanColumns.reduce((acc, col) => acc + col.items.length, 0)} personel bertugas).
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/jobdesk')}
                className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>Open Jobdesk</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Dynamic Grid: Auto fits number of jobdesk columns */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${kanbanColumns.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
              {kanbanColumns.map((col) => {
                const badgeBorderColor = col.color || '#0284C7';
                return (
                  <div
                    key={col.code}
                    className="bg-white dark:bg-[#18181A] rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col shadow-xs"
                  >
                    {/* Column Header: Jobdesk Code matching Jobdesk Master style */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181A] flex items-center justify-between gap-2">
                      <span
                        style={{
                          backgroundColor: badgeBorderColor,
                          borderColor: badgeBorderColor,
                          color: col.textColor || getContrastTextColor(badgeBorderColor)
                        }}
                        className="text-xs font-black font-mono px-3 py-1 rounded-xl border shadow-xs truncate"
                      >
                        {col.code}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300">
                        {col.items.length} Staff
                      </span>
                    </div>

                  {/* Column Items (Exactly 3 compact cards visible, scrolls internally) */}
                  <div className="p-2.5 space-y-2 flex-1 min-h-[140px] max-h-[218px] overflow-y-auto bg-slate-50/50 dark:bg-white/[0.02]">
                    {col.items.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-6 text-xs text-slate-500 dark:text-gray-400 italic">
                        Tidak ada personel bertugas di {col.code} pada tanggal ini.
                      </div>
                    ) : (
                      col.items.map((item) => {
                        const emp = empMap.get(item.employeeId) || empMap.get(item.employeeCode);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openKpiDetail(`Assignment Detail: ${item.employeeName}`, [item])}
                            className={`w-full text-left p-2.5 rounded-xl border-0 hover:opacity-95 space-y-1.5 transition-all ${
                              getJobdeskBadgeStyle(col.code).card
                            }`}
                          >
                            <div className="text-xs font-extrabold text-white truncate">
                              {item.employeeName}
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/25">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${getShiftBadgeStyle(item.shiftCode).badge}`}>
                                {item.shiftCode}
                              </span>

                              <span className="flex items-center gap-1 text-white/95 text-[10px] font-medium font-mono">
                                <MapPin className="w-3 h-3 text-white/85" aria-hidden="true" />
                                {item.location || emp?.defaultLocation || '-'}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>

          {/* Section: Personnel Roster Directory (Bottom aligned with Shift Distribution, scrolls internally) */}
          <div className="bg-white dark:bg-[#18181A] p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col flex-1 min-h-[340px] lg:min-h-0 gap-4">
            <div className="shrink-0">
              <h2 className="text-sm font-black text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" aria-hidden="true" />
                <span>Personnel Roster Directory</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Daftar personel terjadwal untuk {selectedDate} ({filteredRoster.length} record)
              </p>
            </div>

            {/* Single-Line Compact Filter Bar */}
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-0.5 shrink-0">
              <div className="relative flex items-center flex-1 min-w-[130px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none z-10" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Cari nama atau ID personel"
                  placeholder="Cari nama, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2 h-8 text-[11px] rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white placeholder-slate-400 w-full focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Filter Shift */}
              <select
                aria-label="Filter berdasarkan shift"
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="h-8 px-2 text-[11px] rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-gray-200 font-medium focus:outline-none shrink-0"
              >
                <option value="all">Semua Shift</option>
                {shifts.map((sh) => (
                  <option key={sh.id} value={sh.code}>
                    {sh.code} {sh.isOff ? '(Libur)' : ''}
                  </option>
                ))}
              </select>

              {/* Filter Jobdesk */}
              <select
                aria-label="Filter berdasarkan jobdesk"
                value={filterJobdesk}
                onChange={(e) => setFilterJobdesk(e.target.value)}
                className="h-8 px-2 text-[11px] rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-gray-200 font-medium focus:outline-none shrink-0"
              >
                <option value="all">Semua Jobdesk</option>
                {jobdesks.map((jd) => (
                  <option key={jd.id} value={jd.code}>
                    {jd.code} - {jd.name || jd.code}
                  </option>
                ))}
                <option value="UNASSIGNED">Tanpa Jobdesk</option>
              </select>

              {/* Filter Status Kerja / Libur */}
              <select
                aria-label="Filter status dinas"
                value={filterDutyStatus}
                onChange={(e) => setFilterDutyStatus(e.target.value as any)}
                className="h-8 px-2 text-[11px] rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-gray-200 font-medium focus:outline-none shrink-0"
              >
                <option value="all">Semua Status</option>
                <option value="working">On Duty (Kerja)</option>
                <option value="off">Off Day (Libur / Cuti)</option>
              </select>

              {/* Urutan Nama */}
              <select
                aria-label="Urutan nama personel"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as EmployeeSortMode)}
                className="h-8 px-2 text-[11px] rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-gray-200 font-medium focus:outline-none shrink-0"
              >
                <option value="default">Urutan Default</option>
                <option value="az">Abjad (A → Z)</option>
                <option value="za">Abjad (Z → A)</option>
              </select>
            </div>

            {/* Table (Scrolls cleanly inside box aligned to Distribusi Shift) */}
            <div className="flex-1 min-h-0 overflow-auto border border-slate-200/80 dark:border-white/10 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#F8FAFC] dark:bg-[#202023] text-slate-600 dark:text-gray-300 font-bold border-b border-slate-200/80 dark:border-white/10">
                  <tr>
                    <th className="py-3 px-4">Karyawan / ID</th>
                    <th className="py-3 px-4">Posisi</th>
                    <th className="py-3 px-4">Shift</th>
                    <th className="py-3 px-4">Jobdesk</th>
                    <th className="py-3 px-4">Hub Lokasi</th>
                    <th className="py-3 px-4">Jam Kerja</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-xs text-slate-600 dark:text-gray-300 italic">
                        Tidak ada jadwal personel yang cocok dengan filter tanggal/kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((item) => {
                      const emp = empMap.get(item.employeeId) || empMap.get(item.employeeCode);
                      const isOff = isOffShift(item.shiftCode);
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#0F172A] dark:text-white">{item.employeeName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                              {item.employeeCode}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[11px] font-semibold text-slate-700 dark:text-gray-200">
                              {emp?.role || emp?.level || 'CTSO Staff'}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                getShiftBadgeStyle(item.shiftCode).badge
                              }`}
                            >
                              {item.shiftCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {item.jobdeskCode && !isOff ? (
                              <span
                                className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-md text-[10px] font-extrabold font-mono ${
                                  getJobdeskBadgeStyle(item.jobdeskCode).badge
                                }`}
                              >
                                {item.jobdeskCode}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isOff ? (
                              <span className="text-[10px] text-slate-400 dark:text-gray-500">-</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[#0F172A] dark:text-gray-200 font-medium whitespace-nowrap">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                                {item.location || emp?.defaultLocation || '-'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-gray-300 font-mono text-[11px] whitespace-nowrap">
                            {getShiftHours(item.shiftCode)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isOff
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                                  : item.publicationStatus === 'Published'
                                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                  : 'bg-[#FFFBEA] dark:bg-amber-950 text-[#8C6700] dark:text-amber-300 border border-[#FFEE85]'
                              }`}
                            >
                              {isOff ? 'Off Day' : item.publicationStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>

        {/* Right Sidebar: Shift Distribution */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#18181A] p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span>Distribusi Shift</span>
              </h2>
              <span className="text-[11px] text-slate-600 dark:text-gray-300">Click to View</span>
            </div>

            <div className="space-y-3">
              {shiftGroups.map((sg) => {
                const total = dayAssignments.length || 1;
                const pct = Math.round((sg.count / total) * 100);
                const sh = sg.shift;

                return (
                  <button
                    key={sh.code}
                    type="button"
                    onClick={() =>
                      openKpiDetail(
                        `Personel Shift: ${sh.name || sh.code} (${sg.isOff ? 'Libur/Rest' : 'Dinas'})`,
                        sg.items
                      )
                    }
                    className="w-full text-left p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-white mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            backgroundColor: sh.color || '#0284C7',
                            color: sh.textColor || getContrastTextColor(sh.color || '#0284C7')
                          }}
                          className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs"
                        >
                          {sh.code}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-gray-300">
                          {sg.isOff ? 'Libur (Rest)' : `${sh.startTime} - ${sh.endTime}`}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#0F172A] dark:text-white">
                        {sg.count} Staf
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: sh.color || '#F9C900' }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reusable KPI & Assignment Detail Modal */}
      {activeModalTitle &&
        createPortal(
          <div
            className="fixed inset-0 z-50 !mt-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label={activeModalTitle}
            onClick={() => setActiveModalTitle(null)}
          >
            <div
              className="bg-white dark:bg-[#18181A] rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#111111] dark:text-white">{activeModalTitle}</h3>
                  <p className="text-xs text-slate-600 dark:text-gray-300">
                    Total {modalAssignments.length} record terdata untuk kategori ini
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Tutup dialog"
                  onClick={() => setActiveModalTitle(null)}
                  className="p-2 text-slate-500 hover:text-[#111111] dark:text-gray-300 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 pr-1">
                {modalAssignments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-600 dark:text-gray-300 italic">
                    Tidak ada personel dalam kategori ini pada tanggal {selectedDate}.
                  </div>
                ) : (
                  modalAssignments.map((item, idx) => {
                    const emp = empMap.get(item.employeeId) || empMap.get(item.employeeCode);
                    const isOff = isOffShift(item.shiftCode);
                    return (
                      <div key={idx} className="py-3 flex items-center justify-between text-xs gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-[#111111] dark:text-white truncate">
                            {item.employeeName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                            {item.employeeCode}{!isOff ? ` • ${item.location || emp?.defaultLocation || 'Hub'}` : ''}
                          </div>
                          {(item.role || emp?.role || emp?.level) && (
                            <div className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                              {item.role || emp?.role || emp?.level} &bull; {item.teamName || emp?.teamName || 'CTSO'}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                getShiftBadgeStyle(item.shiftCode).badge
                              }`}
                            >
                              {item.shiftCode}
                            </span>
                            {item.jobdeskCode && !isOff && (
                              <span
                                className={`ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                  getJobdeskBadgeStyle(item.jobdeskCode).badge
                                }`}
                              >
                                {item.jobdeskCode}
                              </span>
                            )}
                          </div>
                          {canManage && item.id && !item.id.startsWith('leave_') && (
                            <button
                              type="button"
                              title="Hapus assignment ini dari roster"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Hapus assignment shift ${item.shiftCode} untuk ${item.employeeName}?`)) {
                                  deleteSchedule(item.id);
                                  setModalAssignments((prev) => prev.filter((m) => m.id !== item.id));
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/10 text-right">
                <button
                  type="button"
                  onClick={() => setActiveModalTitle(null)}
                  className="px-4 py-2 rounded-xl bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111] text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
