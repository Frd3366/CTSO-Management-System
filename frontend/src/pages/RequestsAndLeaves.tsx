import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../api/client';
import { RosterChangeRequest, LeaveRecord, RequestType, LeaveType } from '../types';
import { getShiftBadgeStyle, getJobdeskBadgeStyle } from '../utils/codeStyles';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import {
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramAlert,
  TelegramConfig
} from '../utils/telegram';
import {
  ArrowLeftRight,
  CalendarOff,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Shield,
  Search,
  Filter,
  Check,
  X,
  Layers,
  Thermometer,
  Calendar,
  Send,
  Key,
  Hash
} from 'lucide-react';

export const RequestsAndLeaves: React.FC = () => {
  const {
    currentUser,
    requests,
    leaves,
    employees,
    shifts,
    jobdesks,
    schedules,
    createRequest,
    respondReplacementConsent,
    approveRequest,
    rejectRequest,
    cancelRequest,
    createLeave,
    approveLeave,
    rejectLeave,
    cancelLeave
  } = useAuth();
  const { showToast } = useToast();

  // Active Main Section: 'shifts' (Shift & Roster Changes) or 'leaves' (Time Off & Leaves)
  const [activeSection, setActiveSection] = useState<'shifts' | 'leaves'>('shifts');

  // Sub-filters for Shifts: 'all' | RequestType
  const [shiftFilter, setShiftFilter] = useState<'all' | RequestType>('all');

  // Sub-filters for Leaves: 'all' | 'Cuti Tahunan' | 'Izin Sakit' | 'Izin Khusus'
  const [leaveFilter, setLeaveFilter] = useState<'all' | LeaveType>('all');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Shift Request Form State (Location change removed as requested)
  const [newShiftReqType, setNewShiftReqType] = useState<RequestType>('Shift Exchange');
  const [shiftDate, setShiftDate] = useState('2026-11-16');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [requestedShift, setRequestedShift] = useState('Pagi 8');
  const [requestedJobdesk, setRequestedJobdesk] = useState('CT2');
  const [shiftReason, setShiftReason] = useState('');

  // Leave Request Form State (Cuti, Izin Sakit, Izin Khusus)
  const [newLeaveType, setNewLeaveType] = useState<LeaveType>('Cuti Tahunan');
  const [leaveStartDate, setLeaveStartDate] = useState('2026-11-17');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-11-18');
  const [leaveReason, setLeaveReason] = useState('');

  // Telegram Notification Modal & Config State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(getTelegramConfig);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Sync Telegram config with backend on load
  useEffect(() => {
    fetch(`${API_BASE}/telegram/config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && (data.botToken || data.chatId)) {
          setTelegramConfig(data);
          saveTelegramConfig(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isShiftModalOpen && !isLeaveModalOpen && !isTelegramModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShiftModalOpen(false);
        setIsLeaveModalOpen(false);
        setIsTelegramModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShiftModalOpen, isLeaveModalOpen, isTelegramModalOpen]);

  const formatDateDMY = (isoDate: string) => {
    if (!isoDate) return '-';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  const formatLeaveTypeLabel = (type: string) => {
    if (type === 'Cuti Tahunan' || type === 'Cuti (Leave)') return 'Cuti (Leave)';
    if (type === 'Izin Sakit' || type === 'Sakit (Sick)') return 'Sakit (Sick)';
    if (type === 'Izin Khusus' || type === 'Ijin (Personal)') return 'Ijin (Personal)';
    return type;
  };

  const formatDateWithDay = (isoDate: string) => {
    if (!isoDate) return '-';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = days[d.getDay()];
        return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch {
      // fallback
    }
    return formatDateDMY(isoDate);
  };

  const formatWitaNow = () => {
    return (
      new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Makassar'
      })
        .format(new Date())
        .replace(/\./g, ':') + ' WITA'
    );
  };

  const handleSaveTelegramConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    saveTelegramConfig(telegramConfig);
    try {
      await fetch(`${API_BASE}/telegram/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramConfig)
      });
    } catch {}
    showToast('Pengaturan notifikasi Telegram berhasil disimpan.', 'success');
    setIsTelegramModalOpen(false);
  };

  const handleTestTelegramAlert = async () => {
    if (!telegramConfig.botToken.trim() || !telegramConfig.chatId.trim()) {
      showToast('Masukkan Bot Token dan Chat ID terlebih dahulu.', 'warning');
      return;
    }
    setIsTestingTelegram(true);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const res = await sendTelegramAlert(
        {
          nama: `${currentUser?.name || 'I Putu Wijaya'}${currentUser?.employeeId ? ` (${currentUser.employeeId})` : ' (CTSO-0101)'}`,
          waktu: formatWitaNow(),
          jenis: 'Tukar Shift (Swap)',
          hub: currentUser?.hubLocation || 'Badung Hub',
          date: formatDateWithDay(todayIso),
          detail:
            `• Rekan Pengganti : Kadek Surya (CTSO-0102)\n` +
            `• Perubahan Shift : Pagi 7 (07:00) ➔ Siang (13:00)\n` +
            `• Keterangan : Keperluan keluarga mendesak`
        },
        telegramConfig
      );
      if (res.success) {
        showToast('Pesan uji coba berhasil terkirim ke Telegram!', 'success');
      } else {
        showToast(res.message || 'Gagal mengirim ke Telegram.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengirim pesan uji coba.', 'error');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const isAdminOrSpv =
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'SPV' ||
    (currentUser?.role as string) === 'Administrator';

  // Filter Shift Requests
  const filteredShiftRequests = requests.filter((r) => {
    // Role filter: Employee sees only their own requests or where they are replacement
    if (currentUser?.role === 'Employee') {
      const isOwner = r.requesterEmployeeId === currentUser.employeeId;
      const isReplacement = r.replacementEmployeeId === currentUser.employeeId;
      if (!isOwner && !isReplacement) return false;
    }

    if (shiftFilter !== 'all' && r.requestType !== shiftFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.requesterName.toLowerCase().includes(q);
      const matchReason = r.reason.toLowerCase().includes(q);
      const matchRepl = r.replacementName ? r.replacementName.toLowerCase().includes(q) : false;
      if (!matchName && !matchReason && !matchRepl) return false;
    }

    return true;
  });

  // Filter Leave Requests
  const filteredLeaves = leaves.filter((l) => {
    if (currentUser?.role === 'Employee' && l.employeeId !== currentUser.employeeId) {
      return false;
    }

    if (leaveFilter !== 'all' && l.type !== leaveFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = l.employeeName.toLowerCase().includes(q);
      const matchReason = l.reason.toLowerCase().includes(q);
      if (!matchName && !matchReason) return false;
    }

    return true;
  });

  // Handlers
  const handleCreateShiftRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.employeeId) {
      showToast('Profil karyawan tidak ditemukan.', 'error');
      return;
    }

    // Find current shift for workDate
    const existingAssignment = schedules.find(
      (s) => s.employeeId === currentUser.employeeId && s.date === shiftDate
    );
    const currentShift = existingAssignment ? existingAssignment.shiftCode : 'Pagi 7';
    const currentJobdesk = existingAssignment?.jobdeskCode;
    const currentLocation = existingAssignment?.location;

    const payload: Omit<RosterChangeRequest, 'id' | 'createdAt' | 'status' | 'replacementConsentStatus'> = {
      requestType: newShiftReqType,
      requesterEmployeeId: currentUser.employeeId,
      requesterName: currentUser.name,
      workDate: shiftDate,
      currentShift,
      currentJobdesk,
      currentLocation,
      reason: shiftReason || 'Operational adjustment'
    };

    if (newShiftReqType === 'Shift Exchange') {
      const targetEmp = employees.find((e) => e.id === targetEmployeeId);
      if (!targetEmp) {
        showToast('Pilih rekan pengganti untuk tukar shift.', 'warning');
        return;
      }
      payload.replacementEmployeeId = targetEmp.id;
      payload.replacementName = targetEmp.name;
      const targetSched = schedules.find((s) => s.employeeId === targetEmp.id && s.date === shiftDate);
      payload.replacementCurrentShift = targetSched ? targetSched.shiftCode : 'Siang';
    } else if (newShiftReqType === 'Change Shift') {
      payload.requestedShift = requestedShift;
    } else if (newShiftReqType === 'Jobdesk Change') {
      payload.requestedJobdesk = requestedJobdesk;
    }

    createRequest(payload);

    // Send Telegram Notification Alert (Format 2: Emoji Minimalis & Quick-Scan)
    sendTelegramAlert({
      nama: `${currentUser.name}${currentUser.employeeId ? ` (${currentUser.employeeId})` : ''}`,
      waktu: formatWitaNow(),
      jenis:
        newShiftReqType === 'Shift Exchange'
          ? 'Tukar Shift (Swap)'
          : newShiftReqType === 'Change Shift'
          ? 'Ganti Shift'
          : 'Ganti Alokasi Jobdesk',
      hub: currentUser.hubLocation || 'CTSO Bali Central Hub',
      date: formatDateWithDay(shiftDate),
      detail:
        newShiftReqType === 'Shift Exchange'
          ? `• Rekan Pengganti : ${payload.replacementName || '-'}\n• Perubahan Shift : ${currentShift} ➔ ${payload.replacementCurrentShift || '-'}\n• Keterangan      : ${shiftReason || '-'}`
          : newShiftReqType === 'Change Shift'
          ? `• Perubahan Shift : ${currentShift} ➔ ${requestedShift}\n• Keterangan      : ${shiftReason || '-'}`
          : `• Alokasi Jobdesk : ${requestedJobdesk}\n• Keterangan      : ${shiftReason || '-'}`
    }).then((res) => {
      if (res.success) {
        showToast('Notifikasi alert terkirim ke Telegram.', 'info');
      }
    });

    showToast('Shift request submitted successfully.', 'success');
    setIsShiftModalOpen(false);
    setShiftReason('');
  };

  const handleCreateLeaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.employeeId) {
      showToast('Employee profile not found.', 'error');
      return;
    }

    createLeave({
      employeeId: currentUser.employeeId,
      employeeName: currentUser.name,
      type: newLeaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason || `${newLeaveType} request`
    });

    // Send Telegram Notification Alert (Format 2: Emoji Minimalis & Quick-Scan)
    sendTelegramAlert({
      nama: `${currentUser.name}${currentUser.employeeId ? ` (${currentUser.employeeId})` : ''}`,
      waktu: formatWitaNow(),
      jenis: `Permohonan ${formatLeaveTypeLabel(newLeaveType)}`,
      hub: currentUser.hubLocation || 'CTSO Bali Central Hub',
      date:
        leaveStartDate === leaveEndDate
          ? formatDateWithDay(leaveStartDate)
          : `${formatDateWithDay(leaveStartDate)} s/d ${formatDateWithDay(leaveEndDate)}`,
      detail:
        `• Tipe Pengajuan  : ${formatLeaveTypeLabel(newLeaveType)}\n` +
        `• Durasi / Waktu  : ${leaveStartDate === leaveEndDate ? '1 Hari Kerja' : `${formatDateDMY(leaveStartDate)} s/d ${formatDateDMY(leaveEndDate)}`}\n` +
        `• Keterangan      : ${leaveReason || '-'}`
    }).then((res) => {
      if (res.success) {
        showToast('Notifikasi alert terkirim ke Telegram.', 'info');
      }
    });

    showToast(`${formatLeaveTypeLabel(newLeaveType)} request submitted successfully.`, 'success');
    setIsLeaveModalOpen(false);
    setLeaveReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
            Requests & Leaves
          </h1>
          <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
            Centralized hub for roster exchanges, shift changes, jobdesk assignments, and leave approvals.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {activeSection === 'shifts' ? (
            <button
              type="button"
              onClick={() => setIsShiftModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-[#E5B800] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Shift Request</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-[#E5B800] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Leave Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-fit">
          <button
            type="button"
            onClick={() => setActiveSection('shifts')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'shifts'
                ? 'bg-[#111111] text-[#F9C900] shadow-2xs dark:bg-white dark:text-[#111111]'
                : 'text-[#647084] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Shift & Roster Changes</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeSection === 'shifts'
                  ? 'bg-white text-[#202020] dark:bg-[#202020] dark:text-[#FFD416]'
                  : 'bg-slate-200 text-[#202020] dark:bg-white/10 dark:text-gray-300'
              }`}
            >
              {filteredShiftRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('leaves')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'leaves'
                ? 'bg-[#111111] text-[#F9C900] shadow-2xs dark:bg-white dark:text-[#111111]'
                : 'text-[#647084] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white'
            }`}
          >
            <CalendarOff className="w-3.5 h-3.5" />
            <span>Time Off & Leaves</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeSection === 'leaves'
                  ? 'bg-white text-[#202020] dark:bg-[#202020] dark:text-[#FFD416]'
                  : 'bg-slate-200 text-[#202020] dark:bg-white/10 dark:text-gray-300'
              }`}
            >
              {filteredLeaves.length}
            </span>
          </button>
        </div>

        {/* Global Search and Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#647084] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs text-[#111111] dark:text-white placeholder-[#647084] focus:outline-none focus:bg-white dark:focus:bg-[#18181A] focus:border-[#F9C900]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs font-semibold text-[#111111] dark:text-white focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Pending Replacement">Pending Replacement</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* SECTION 1: SHIFT & ROSTER CHANGES */}
      {activeSection === 'shifts' && (
        <div className="space-y-4">
          {/* Subfilter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'All Requests' },
              { id: 'Shift Exchange', label: 'Shift Exchange' },
              { id: 'Change Shift', label: 'Change Shift' },
              { id: 'Jobdesk Change', label: 'Jobdesk Change' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setShiftFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  shiftFilter === tab.id
                    ? 'bg-[#111111] text-[#F9C900] shadow-2xs dark:bg-white dark:text-[#111111]'
                    : 'bg-white dark:bg-[#18181A] text-[#647084] dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:border-[#111111]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List View */}
          {filteredShiftRequests.length === 0 ? (
            <div className="bg-white dark:bg-[#18181A] p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 text-[#647084]">
              <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#111111] dark:text-white" />
              <p className="text-xs font-semibold">No shift requests found matching current filter.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/10 overflow-hidden shadow-2xs">
              {filteredShiftRequests.map((req) => {
                const isRequester = req.requesterEmployeeId === currentUser?.employeeId;
                const isReplacement = req.replacementEmployeeId === currentUser?.employeeId;

                return (
                  <div
                    key={req.id}
                    className="px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    {/* Left & Center Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-white/10">
                          {req.requestType.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-gray-400">
                          {formatDateDMY(req.workDate)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs min-w-0">
                        <div>
                          <span className="text-[11px] text-[#647084] dark:text-gray-400">Dari: </span>
                          <strong className="text-slate-900 dark:text-white">{req.requesterName}</strong>
                          {req.replacementName && (
                            <span> &rarr; <strong className="text-slate-900 dark:text-white">{req.replacementName}</strong></span>
                          )}
                        </div>

                        {req.requestedShift && (
                          <span className="flex items-center gap-1 text-[11px]">
                            <span className="text-[#647084] dark:text-gray-400">Shift:</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${getShiftBadgeStyle(req.requestedShift).badge}`}>
                              {req.requestedShift}
                            </span>
                          </span>
                        )}
                        {req.requestedJobdesk && (
                          <span className="flex items-center gap-1 text-[11px]">
                            <span className="text-[#647084] dark:text-gray-400">Jobdesk:</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${getJobdeskBadgeStyle(req.requestedJobdesk).badge}`}>
                              {req.requestedJobdesk}
                            </span>
                          </span>
                        )}

                        <span className="text-[11px] text-[#647084] dark:text-gray-400 truncate max-w-xs" title={req.reason}>
                          <em>"{req.reason}"</em>
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Status & Action Controls */}
                    <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          req.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                            : req.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                            : 'bg-[#FFFBEA] text-[#8C6700] dark:bg-amber-950 dark:text-amber-300 border border-[#FFEE85] dark:border-amber-800/50'
                        }`}
                      >
                        {req.status}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Peer consent action */}
                        {isReplacement && req.status === 'Pending Replacement' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                respondReplacementConsent(req.id, 'Rejected');
                                showToast('Exchange request rejected.', 'info');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                respondReplacementConsent(req.id, 'Accepted');
                                showToast('Exchange consent approved. Forwarded to SPV.', 'success');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                            >
                              Accept
                            </button>
                          </>
                        )}

                        {/* SPV / Admin Final Approval */}
                        {isAdminOrSpv &&
                          (req.status === 'Pending Approval' ||
                            req.status === 'Pending Replacement' ||
                            (req.status as string) === 'Pending') && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  rejectRequest(req.id, 'Rejected by supervisor');
                                  showToast('Request rejected.', 'info');
                                }}
                                className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = approveRequest(req.id);
                                  showToast(
                                    res.message || 'Request disetujui & langsung di-deploy ke Schedule dan Jobdesk.',
                                    'success'
                                  );
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#111111] text-[#F9C900] hover:bg-black text-[11px] font-bold"
                              >
                                Approve & Deploy
                              </button>
                            </>
                          )}

                        {/* Cancel Own Request */}
                        {isRequester && (req.status === 'Pending Replacement' || req.status === 'Pending Approval') && (
                          <button
                            type="button"
                            onClick={() => {
                              cancelRequest(req.id);
                              showToast('Request cancelled.', 'info');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-[#647084]"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: TIME OFF & LEAVES (Cuti (Leave), Sakit (Sick), Ijin (Personal)) */}
      {activeSection === 'leaves' && (
        <div className="space-y-4">
          {/* Subfilter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'All Leaves' },
              { id: 'Cuti Tahunan', label: 'Cuti (Leave)' },
              { id: 'Izin Sakit', label: 'Sakit (Sick)' },
              { id: 'Izin Khusus', label: 'Ijin (Personal)' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLeaveFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  leaveFilter === tab.id
                    ? 'bg-[#111111] text-[#F9C900] shadow-2xs dark:bg-white dark:text-[#111111]'
                    : 'bg-white dark:bg-[#18181A] text-[#647084] dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:border-[#111111]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Leaves List */}
          {filteredLeaves.length === 0 ? (
            <div className="bg-white dark:bg-[#18181A] p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 text-[#647084]">
              <CalendarOff className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#111111] dark:text-white" />
              <p className="text-xs font-semibold">No leave applications found matching filter.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/10 overflow-hidden shadow-2xs">
              {filteredLeaves.map((leave) => {
                return (
                  <div
                    key={leave.id}
                    className="px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    {/* Left & Center Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-[10px] font-bold border border-slate-200 dark:border-white/10">
                          {formatLeaveTypeLabel(leave.type)}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                          {formatDateDMY(leave.startDate)} &rarr; {formatDateDMY(leave.endDate)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs min-w-0">
                        <div>
                          <span className="text-[11px] text-[#647084] dark:text-gray-400">Pemohon: </span>
                          <strong className="text-slate-900 dark:text-white">{leave.employeeName}</strong>
                        </div>

                        <span className="text-[11px] text-[#647084] dark:text-gray-400 truncate max-w-xs" title={leave.reason}>
                          Alasan: <em>"{leave.reason}"</em>
                        </span>

                        {leave.status === 'Approved' && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Roster terupdate</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Status & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          leave.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                            : leave.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                            : 'bg-[#FFFBEA] text-[#8C6700] dark:bg-amber-950 dark:text-amber-300 border border-[#FFEE85] dark:border-amber-800/50'
                        }`}
                      >
                        {leave.status}
                      </span>

                      {isAdminOrSpv && leave.status === 'Pending' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              rejectLeave(leave.id);
                              showToast('Leave request rejected.', 'info');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              approveLeave(leave.id);
                              showToast('Disetujui & langsung di-deploy ke Schedule.', 'success');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#111111] text-[#F9C900] hover:bg-black text-[11px] font-bold"
                          >
                            Approve & Deploy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: NEW SHIFT REQUEST (Exchange, Change Shift, Jobdesk Change) */}
      {isShiftModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New Shift or Roster Request"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white dark:bg-[#18181A] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#111111] dark:text-white">New Shift / Roster Request</h3>
                <p className="text-xs text-[#647084] dark:text-gray-400 mt-0.5">
                  Submit a request for shift exchange, shift adjustment, or jobdesk role change.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setIsShiftModalOpen(false)}
                className="p-1.5 text-[#647084] hover:text-[#111111] dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateShiftRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">Request Type</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'Shift Exchange' as RequestType, label: 'Shift Exchange' },
                    { id: 'Change Shift' as RequestType, label: 'Change Shift' },
                    { id: 'Jobdesk Change' as RequestType, label: 'Jobdesk Change' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewShiftReqType(t.id)}
                      className={`py-2 px-2 rounded-xl text-center font-bold transition-all ${
                        newShiftReqType === t.id
                          ? 'bg-[#111111] text-[#F9C900] shadow-xs dark:bg-white dark:text-[#111111]'
                          : 'bg-[#F5F6F8] dark:bg-white/5 text-[#647084] border border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <ModernDatePicker
                label="Target Date"
                value={shiftDate}
                onChange={setShiftDate}
                required
              />

              {newShiftReqType === 'Shift Exchange' && (
                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">
                    Replacement Peer (Rekan Pengganti)
                  </label>
                  <select
                    value={targetEmployeeId}
                    onChange={(e) => setTargetEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs text-[#111111] dark:text-white focus:outline-none focus:border-[#F9C900]"
                    required
                  >
                    <option value="">Select replacement employee...</option>
                    {employees
                      .filter((e) => e.id !== currentUser?.employeeId && e.status === 'active')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employeeNo}) &bull; {emp.defaultLocation}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {newShiftReqType === 'Change Shift' && (
                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">
                    Requested Shift Code
                  </label>
                  <select
                    value={requestedShift}
                    onChange={(e) => setRequestedShift(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs text-[#111111] dark:text-white focus:outline-none focus:border-[#F9C900]"
                  >
                    {shifts.map((sh) => (
                      <option key={sh.id} value={sh.code}>
                        {sh.name} ({sh.startTime} - {sh.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newShiftReqType === 'Jobdesk Change' && (
                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">
                    Requested Jobdesk Role
                  </label>
                  <select
                    value={requestedJobdesk}
                    onChange={(e) => setRequestedJobdesk(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs text-[#111111] dark:text-white focus:outline-none focus:border-[#F9C900]"
                  >
                    {jobdesks.map((j) => (
                      <option key={j.id} value={j.code}>
                        {j.code} &bull; {j.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">Reason / Alasan</label>
                <textarea
                  rows={3}
                  value={shiftReason}
                  onChange={(e) => setShiftReason(e.target.value)}
                  placeholder="Explain why this request is required..."
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs text-[#111111] dark:text-white focus:outline-none focus:border-[#F9C900]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-[#647084]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] text-xs font-bold border border-[#E5B800]"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: NEW LEAVE REQUEST (Cuti, Izin Sakit, Izin Khusus) */}
      {isLeaveModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New Leave Application"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white dark:bg-[#18181A] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#111111] dark:text-white">New Leave Application</h3>
                <p className="text-xs text-[#647084] dark:text-gray-400 mt-0.5">
                  Submit Cuti (Leave), Sakit (Sick), or Ijin (Personal).
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1.5 text-[#647084] hover:text-[#111111] dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLeaveRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">Leave Category</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'Cuti Tahunan', label: 'Cuti (Leave)' },
                    { id: 'Izin Sakit', label: 'Sakit (Sick)' },
                    { id: 'Izin Khusus', label: 'Ijin (Personal)' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewLeaveType(cat.id as LeaveType)}
                      className={`py-2 px-2 rounded-xl text-center font-bold transition-all ${
                        newLeaveType === cat.id
                          ? 'bg-[#111111] text-[#F9C900] shadow-xs dark:bg-white dark:text-[#111111]'
                          : 'bg-[#F5F6F8] dark:bg-white/5 text-[#647084] border border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ModernDatePicker
                  label="Start Date"
                  value={leaveStartDate}
                  onChange={setLeaveStartDate}
                  required
                />
                <ModernDatePicker
                  label="End Date"
                  value={leaveEndDate}
                  onChange={setLeaveEndDate}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">
                  Reason / Notes
                </label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Keterangan cuti, izin keluarga, atau surat sakit..."
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs text-[#111111] dark:text-white focus:outline-none focus:border-[#F9C900]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-[#647084]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] text-xs font-bold border border-[#E5B800]"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: TELEGRAM NOTIFICATION CONFIGURATION */}
      {isTelegramModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Alert Notifikasi Telegram"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white dark:bg-[#18181A] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#111111] dark:text-white">Alert Notifikasi Telegram</h3>
                  <p className="text-xs text-[#647084] dark:text-gray-400 mt-0.5">
                    Notifikasi otomatis pengajuan Requests & Leaves ke grup / channel Telegram.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup dialog"
                onClick={() => setIsTelegramModalOpen(false)}
                className="p-1.5 text-[#647084] hover:text-[#111111] dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTelegramConfig} className="space-y-4">
              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Status Notifikasi</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {telegramConfig.enabled
                      ? 'Notifikasi aktif dan otomatis terkirim saat ada request baru'
                      : 'Notifikasi sedang dinonaktifkan'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={telegramConfig.enabled}
                  aria-label="Toggle notifikasi Telegram"
                  onClick={() => setTelegramConfig({ ...telegramConfig, enabled: !telegramConfig.enabled })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    telegramConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      telegramConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Bot Token Input */}
              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">
                  Telegram Bot Token
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={telegramConfig.botToken}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                    placeholder="Contoh: 123456789:ABCdefGHIjklMNOpqrSTUvwxyz"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-[#111111] dark:text-white font-mono focus:outline-none focus:border-[#F9C900]"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Dapatkan Bot Token melalui bot resmi Telegram <strong>@BotFather</strong>.
                </span>
              </div>

              {/* Chat ID / Group ID Input */}
              <div>
                <label className="block text-xs font-bold text-[#111111] dark:text-white mb-1">
                  Telegram Chat ID / Group ID / Channel
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={telegramConfig.chatId}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                    placeholder="Contoh: -100123456789 atau @namagrup"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-[#111111] dark:text-white font-mono focus:outline-none focus:border-[#F9C900]"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Pastikan bot telah dimasukkan ke dalam grup/channel dan diberi izin mengirim pesan.
                </span>
              </div>

              {/* Live Preview Box with Clean Format */}
              <div className="p-3 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/10 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Preview Format Notifikasi:
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Clean
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 dark:text-slate-200 space-y-1 leading-relaxed bg-white dark:bg-black/40 p-3 rounded-lg border border-slate-200/60 dark:border-white/5 font-mono">
                  <p className="font-bold text-slate-900 dark:text-white">Pengajuan Baru: Tukar Shift (Swap)</p>
                  <p className="mt-1">Pemohon : <code>I Putu Wijaya (CTSO-0101)</code></p>
                  <p>Tanggal : <code>Rabu, 18/11/2026</code></p>
                  <p>Diajukan: <code>{formatWitaNow()}</code></p>
                  <p>Lokasi : <code>Badung Hub</code></p>
                  <div className="pt-1.5 pb-1 border-t border-slate-100 dark:border-white/5 mt-1.5 space-y-0.5">
                    <p className="font-bold text-slate-800 dark:text-slate-100">Detail Pengajuan:</p>
                    <p>• Rekan Pengganti : Kadek Surya</p>
                    <p>• Perubahan Shift : Pagi 7 (07:00) ➔ Siang (13:00)</p>
                    <p>• Keterangan : Keperluan keluarga mendesak</p>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-1">Status: Menunggu Review Supervisor ⏳</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleTestTelegramAlert}
                  disabled={isTestingTelegram}
                  className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTestingTelegram ? 'Mengirim...' : 'Kirim Uji Coba (Test)'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTelegramModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-[#647084]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] text-xs font-bold border border-[#E5B800] cursor-pointer shadow-xs"
                  >
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
