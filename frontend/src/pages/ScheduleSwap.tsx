import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import { RequestType, RequestStatus, WorkLocation } from '../types';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  MapPin,
  Check,
  X,
  FileText
} from 'lucide-react';

export const ScheduleSwap: React.FC = () => {
  const {
    requests,
    employees,
    schedules,
    shifts,
    jobdesks,
    currentUser,
    createRequest,
    respondReplacementConsent,
    approveRequest,
    rejectRequest,
    cancelRequest
  } = useAuth();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'exchange' | 'shift' | 'jobdesk'>('all');
  const [statusFilter, setStatusFilter] = useState<'All' | RequestStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('Shift Exchange');
  const [workDate, setWorkDate] = useState('2026-11-16');
  const [requesterEmpId, setRequesterEmpId] = useState(
    currentUser?.employeeId || employees[0]?.id || ''
  );
  const [replacementEmpId, setReplacementEmpId] = useState(employees[1]?.id || '');
  const [requestedShift, setRequestedShift] = useState('Siang');
  const [requestedJobdesk, setRequestedJobdesk] = useState('CT1');
  const [requestedLocation, setRequestedLocation] = useState<WorkLocation>('Badung');
  const [reason, setReason] = useState('');

  // Rejection Dialog State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Permission checks (PRD 2.4 & 8.2)
  const isApprover = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  // Selected requester's assignment on selected workDate
  const requesterAssignment = useMemo(() => {
    return schedules.find((s) => s.employeeId === requesterEmpId && s.date === workDate);
  }, [schedules, requesterEmpId, workDate]);

  // Selected replacement's assignment on selected workDate (for Shift Exchange)
  const replacementAssignment = useMemo(() => {
    return schedules.find((s) => s.employeeId === replacementEmpId && s.date === workDate);
  }, [schedules, replacementEmpId, workDate]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab === 'exchange' && r.requestType !== 'Shift Exchange') return false;
      if (activeTab === 'shift' && r.requestType !== 'Change Shift') return false;
      if (activeTab === 'jobdesk' && r.requestType !== 'Jobdesk Change') return false;

      if (statusFilter !== 'All' && r.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.requesterName.toLowerCase().includes(q) ||
          (r.replacementName && r.replacementName.toLowerCase().includes(q)) ||
          r.reason.toLowerCase().includes(q) ||
          r.workDate.includes(q)
        );
      }
      return true;
    });
  }, [requests, activeTab, statusFilter, searchQuery]);

  // Submit Request Handler
  const handleOpenCreate = () => {
    setRequesterEmpId(currentUser?.employeeId || employees[0]?.id || '');
    setWorkDate('2026-11-16');
    setRequestType('Shift Exchange');
    setReason('');
    setIsModalOpen(true);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();

    const requesterEmp = employees.find((e) => e.id === requesterEmpId);
    if (!requesterEmp) {
      showToast('Karyawan pemohon tidak valid.', 'error');
      return;
    }

    if (!requesterAssignment) {
      showToast(`Karyawan pemohon tidak memiliki jadwal pada ${workDate}.`, 'error');
      return;
    }

    if (requestType === 'Shift Exchange') {
      if (requesterEmpId === replacementEmpId) {
        showToast('Karyawan pengganti tidak boleh sama dengan pemohon.', 'error');
        return;
      }
      const replEmp = employees.find((e) => e.id === replacementEmpId);
      if (!replEmp) {
        showToast('Pilih karyawan pengganti.', 'error');
        return;
      }
      if (!replacementAssignment) {
        showToast(`Karyawan pengganti tidak memiliki jadwal pada ${workDate}.`, 'error');
        return;
      }

      createRequest({
        requestType: 'Shift Exchange',
        requesterEmployeeId: requesterEmp.id,
        requesterName: requesterEmp.name,
        workDate,
        currentShift: requesterAssignment.shiftCode,
        currentJobdesk: requesterAssignment.jobdeskCode,
        currentLocation: requesterAssignment.location,
        replacementEmployeeId: replEmp.id,
        replacementName: replEmp.name,
        replacementCurrentShift: replacementAssignment.shiftCode,
        requestedShift: replacementAssignment.shiftCode,
        reason
      });

      showToast('Permintaan tukar shift berhasil dibuat. Menunggu konfirmasi persetujuan dari karyawan pengganti (Pending Replacement).', 'success');
    } else if (requestType === 'Change Shift') {
      createRequest({
        requestType: 'Change Shift',
        requesterEmployeeId: requesterEmp.id,
        requesterName: requesterEmp.name,
        workDate,
        currentShift: requesterAssignment.shiftCode,
        currentJobdesk: requesterAssignment.jobdeskCode,
        currentLocation: requesterAssignment.location,
        requestedShift,
        reason
      });
      showToast('Permintaan ubah shift berhasil dikirim ke Admin/SPV untuk persetujuan.', 'success');
    } else if (requestType === 'Jobdesk Change') {
      createRequest({
        requestType: 'Jobdesk Change',
        requesterEmployeeId: requesterEmp.id,
        requesterName: requesterEmp.name,
        workDate,
        currentShift: requesterAssignment.shiftCode,
        currentJobdesk: requesterAssignment.jobdeskCode,
        currentLocation: requesterAssignment.location,
        requestedJobdesk,
        reason
      });
      showToast('Permintaan ganti jobdesk berhasil diajukan.', 'success');
    }

    setIsModalOpen(false);
  };

  // Replacement Consent Actions (PRD 8.2 Steps 3-5)
  const handleConsent = (requestId: string, consent: 'Accepted' | 'Rejected') => {
    respondReplacementConsent(requestId, consent);
    if (consent === 'Accepted') {
      showToast('Persetujuan Anda telah dicatat. Request kini diteruskan ke Admin/SPV (Pending Approval).', 'success');
    } else {
      showToast('Permintaan tukar shift telah ditolak.', 'info');
    }
  };

  // Admin/SPV Approval Action (PRD 8.2 Steps 6-7: Atomic Swap!)
  const handleApprove = (requestId: string) => {
    if (!isApprover) {
      showToast('Akses ditolak: Hanya Admin/SPV yang dapat menyetujui request.', 'error');
      return;
    }
    const res = approveRequest(requestId);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  // Admin/SPV Reject Action
  const handleConfirmReject = () => {
    if (!rejectingId) return;
    rejectRequest(rejectingId, rejectionReasonText || 'Tidak memenuhi kebutuhan coverage tim.');
    showToast('Permintaan perubahan telah ditolak.', 'info');
    setRejectingId(null);
    setRejectionReasonText('');
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'Pending Replacement':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Pending Approval':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Approved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Request Shifting & Perubahan Roster
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Alur pertukaran shift antar-karyawan (Shift Exchange), ubah shift mandiri, rotasi jobdesk, dan penyesuaian lokasi operasional.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengajuan Baru</span>
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        {/* Tabs */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'all' ? 'bg-white text-[#111111] font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Semua ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exchange')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'exchange' ? 'bg-white text-[#111111] font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Tukar Shift (Shift Exchange)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shift')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'shift' ? 'bg-white text-[#111111] font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Change Shift
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jobdesk')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'jobdesk' ? 'bg-white text-[#111111] font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Jobdesk Change
          </button>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
          >
            <option value="All">Semua Status</option>
            <option value="Pending Replacement">Pending Replacement</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pemohon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 w-44 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3.5">
        {filteredRequests.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
            <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Tidak ada permintaan yang sesuai dengan filter.</p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isRequester = currentUser?.employeeId === req.requesterEmployeeId;
            const isReplacement = currentUser?.employeeId === req.replacementEmployeeId;

            return (
              <div
                key={req.id}
                className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-3 transition-all"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-[#E7F0FE] text-[#111111] border border-[#CBD5E1]">
                      <ArrowLeftRight className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{req.requestType}</span>
                        <span className="text-[10px] text-slate-400 font-mono">#{req.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Tanggal Tugas: <strong className="text-slate-800">{req.workDate}</strong></span>
                        <span>&bull;</span>
                        <span>Diajukan: {req.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Body Details: Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Pemohon Details */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Pemohon (Employee A)
                    </div>
                    <div className="font-bold text-slate-900 text-xs">{req.requesterName}</div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-1">
                      <span>Shift: <strong className="text-slate-900">{req.currentShift}</strong></span>
                      {req.currentJobdesk && (
                        <span>Jobdesk: <strong className="text-slate-900">{req.currentJobdesk}</strong></span>
                      )}
                      {req.currentLocation && (
                        <span>Lokasi: <strong className="text-slate-900">{req.currentLocation}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Perubahan / Pengganti Details */}
                  <div className="p-3 bg-orange-50/40 rounded-xl border border-[#CBD5E1]/80 space-y-1">
                    <div className="text-[10px] font-bold text-[#111111] uppercase tracking-wider">
                      {req.requestType === 'Shift Exchange' ? 'Rekan Pengganti (Employee B)' : 'Detail Perubahan yang Diminta'}
                    </div>

                    {req.requestType === 'Shift Exchange' ? (
                      <>
                        <div className="font-bold text-slate-900 text-xs">{req.replacementName}</div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-1">
                          <span>Shift Saat Ini: <strong className="text-slate-900">{req.replacementCurrentShift}</strong></span>
                          <span>Consent: <strong className="text-[#111111]">{req.replacementConsentStatus}</strong></span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-800 font-semibold mt-1">
                        {req.requestedShift && <div>Shift Baru: <span className="text-[#111111]">{req.requestedShift}</span></div>}
                        {req.requestedJobdesk && <div>Jobdesk Baru: <span className="text-[#111111]">{req.requestedJobdesk}</span></div>}
                        {req.requestedLocation && <div>Lokasi Baru: <span className="text-[#111111]">{req.requestedLocation}</span></div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason & Review Note */}
                <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 text-slate-600">
                  <span className="font-semibold text-slate-700">Alasan Pengajuan:</span> "{req.reason}"
                  {req.rejectionReason && (
                    <div className="mt-1 text-rose-700 font-semibold">
                      Alasan Penolakan: "{req.rejectionReason}" (oleh {req.reviewedBy})
                    </div>
                  )}
                  {req.reviewedBy && req.status === 'Approved' && (
                    <div className="mt-1 text-emerald-700 text-[11px]">
                      Disetujui oleh {req.reviewedBy} pada {req.reviewedAt}
                    </div>
                  )}
                </div>

                {/* Interactive Action Bar (PRD 8.2 Steps) */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  {/* Cancel button for requester */}
                  {isRequester && (req.status === 'Pending Replacement' || req.status === 'Pending Approval') ? (
                    <button
                      type="button"
                      onClick={() => cancelRequest(req.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Batalkan Pengajuan
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Step 3: Replacement Consent Actions (For Employee B) */}
                    {req.status === 'Pending Replacement' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConsent(req.id, 'Rejected')}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Tolak Pertukaran
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConsent(req.id, 'Accepted')}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Setujui Sebagai Pengganti
                        </button>
                      </div>
                    )}

                    {/* Step 6: Admin/SPV Approval Actions (ATOMIC SWAP!) */}
                    {isApprover && req.status === 'Pending Approval' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRejectingId(req.id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Tolak
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(req.id)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve & Swap Jadwal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE REQUEST MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Form Pengajuan Perubahan Roster"
        size="md"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Perubahan</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as RequestType)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-900"
            >
              <option value="Shift Exchange">Shift Exchange (Tukar Shift Antar Karyawan)</option>
              <option value="Change Shift">Change Shift (Ubah Jam Shift Kerja Sendiri)</option>
              <option value="Jobdesk Change">Jobdesk Change (Pindah Kode Tugas CT1/CT2/CT4)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Karyawan Pemohon</label>
              <select
                value={requesterEmpId}
                onChange={(e) => setRequesterEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                required
              >
                {employees.filter((e) => e.status === 'active').map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.employeeNo})</option>
                ))}
              </select>
            </div>

            <ModernDatePicker
              label="Tanggal Roster"
              value={workDate}
              onChange={setWorkDate}
              required
            />
          </div>

          {/* Current Assignment Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            {requesterAssignment ? (
              <div>
                Jadwal pemohon pada <strong>{workDate}</strong>: Shift <strong>{requesterAssignment.shiftCode}</strong>, Jobdesk <strong>{requesterAssignment.jobdeskCode || 'None'}</strong>, Lokasi <strong>{requesterAssignment.location || 'None'}</strong>.
              </div>
            ) : (
              <span className="text-amber-700 font-semibold">
                Peringatan: Karyawan ini belum memiliki jadwal assignment pada tanggal tersebut.
              </span>
            )}
          </div>

          {/* Dynamic Fields per Type */}
          {requestType === 'Shift Exchange' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Karyawan Rekan Pengganti (Employee B)
              </label>
              <select
                value={replacementEmpId}
                onChange={(e) => setReplacementEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                required
              >
                {employees
                  .filter((e) => e.id !== requesterEmpId && e.status === 'active')
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeNo})</option>
                  ))}
              </select>

              {replacementAssignment && (
                <div className="mt-2 text-[11px] text-slate-500">
                  Jadwal pengganti: Shift <strong>{replacementAssignment.shiftCode}</strong>, Lokasi <strong>{replacementAssignment.location}</strong>
                </div>
              )}
            </div>
          )}

          {requestType === 'Change Shift' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shift Baru yang Diminta</label>
              <select
                value={requestedShift}
                onChange={(e) => setRequestedShift(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          )}

          {requestType === 'Jobdesk Change' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jobdesk yang Diminta</label>
              <select
                value={requestedJobdesk}
                onChange={(e) => setRequestedJobdesk(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                {jobdesks.map((j) => (
                  <option key={j.id} value={j.code}>{j.code} - {j.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Pengajuan</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan keperluan operasional atau mendesak..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#F9C900]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold shadow-sm"
            >
              Kirim Pengajuan
            </button>
          </div>
        </form>
      </Modal>

      {/* REJECTION REASON MODAL */}
      <Modal
        isOpen={!!rejectingId}
        onClose={() => setRejectingId(null)}
        title="Konfirmasi Penolakan Request"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Tuliskan alasan penolakan agar pemohon memahami pertimbangan operasional.
          </p>
          <textarea
            rows={3}
            value={rejectionReasonText}
            onChange={(e) => setRejectionReasonText(e.target.value)}
            placeholder="cth: Mengakibatkan kekurangan personel pada shift malam..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRejectingId(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Tolak Request
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
