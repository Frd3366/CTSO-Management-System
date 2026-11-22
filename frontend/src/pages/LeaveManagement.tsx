import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import { LeaveType, LeaveStatus } from '../types';
import {
  CalendarOff,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  User,
  ShieldAlert,
  Check,
  X,
  FileText
} from 'lucide-react';

export const LeaveManagement: React.FC = () => {
  const { leaves, employees, currentUser, createLeave, approveLeave, rejectLeave, cancelLeave } = useAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'All' | LeaveStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState(currentUser?.employeeId || employees[0]?.id || '');
  const [formType, setFormType] = useState<LeaveType>('Cuti Tahunan');
  const [formStartDate, setFormStartDate] = useState('2026-11-20');
  const [formEndDate, setFormEndDate] = useState('2026-11-21');
  const [formReason, setFormReason] = useState('');

  // Permission: PRD 2.4 & 9 (Admin/SPV can approve/reject; Employee can create/cancel own)
  const isApprover = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return l.employeeName.toLowerCase().includes(q) || l.reason.toLowerCase().includes(q) || l.type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [leaves, statusFilter, searchQuery]);

  const handleOpenCreate = () => {
    setFormEmployeeId(currentUser?.employeeId || employees[0]?.id || '');
    setFormType('Cuti Tahunan');
    setFormStartDate('2026-11-20');
    setFormEndDate('2026-11-21');
    setFormReason('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === formEmployeeId);
    if (!emp) {
      showToast('Karyawan tidak valid.', 'error');
      return;
    }

    if (formStartDate > formEndDate) {
      showToast('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.', 'error');
      return;
    }

    createLeave({
      employeeId: emp.id,
      employeeName: emp.name,
      type: formType,
      startDate: formStartDate,
      endDate: formEndDate,
      reason: formReason
    });

    showToast('Pengajuan cuti/izin berhasil dikirim. Menunggu persetujuan Admin/SPV.', 'success');
    setIsModalOpen(false);
  };

  const handleApprove = (id: string) => {
    if (!isApprover) {
      showToast('Akses ditolak: Hanya Admin/SPV yang dapat menyetujui cuti.', 'error');
      return;
    }
    approveLeave(id);
    showToast('Cuti telah disetujui. Jadwal pada tanggal tersebut disesuaikan menjadi OFF.', 'success');
  };

  const handleReject = (id: string) => {
    if (!isApprover) {
      showToast('Akses ditolak: Hanya Admin/SPV yang dapat menolak cuti.', 'error');
      return;
    }
    rejectLeave(id);
    showToast('Pengajuan cuti/izin telah ditolak.', 'info');
  };

  const handleCancel = (id: string) => {
    cancelLeave(id);
    showToast('Pengajuan cuti telah dibatalkan.', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Cuti dan Izin Operasional (Leave Management)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengajuan cuti tahunan, izin sakit, dan izin khusus. Cuti yang disetujui (Approved) secara otomatis memblokir shift kerja dan menyesuaikan status roster menjadi OFF.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Ajukan Cuti / Izin</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
          >
            <option value="All">Semua Status</option>
            <option value="Pending">Pending (Menunggu)</option>
            <option value="Approved">Approved (Disetujui)</option>
            <option value="Rejected">Rejected (Ditolak)</option>
            <option value="Cancelled">Cancelled (Dibatalkan)</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari karyawan atau alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 w-52 focus:outline-none"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Total: <strong>{filteredLeaves.length}</strong> pengajuan
        </div>
      </div>

      {/* Leave Cards / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Jenis Pengajuan</th>
                <th className="py-3 px-4">Rentang Tanggal</th>
                <th className="py-3 px-4">Alasan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada pengajuan cuti yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((l) => {
                  const isMine = currentUser?.employeeId === l.employeeId;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{l.employeeName}</div>
                        <div className="text-[10px] text-slate-400">Diajukan: {l.createdAt}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {l.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {l.startDate} s.d {l.endDate}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={l.reason}>
                        {l.reason}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : l.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : l.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {l.reviewedBy ? (
                          <div>
                            <div className="font-semibold text-slate-700">{l.reviewedBy}</div>
                            <div className="text-[10px] text-slate-400">{l.reviewedAt}</div>
                          </div>
                        ) : (
                          <span className="italic text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Cancel button if pending & mine */}
                          {isMine && l.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(l.id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold"
                            >
                              Batal
                            </button>
                          )}

                          {/* Approval actions for Admin/SPV */}
                          {isApprover && l.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReject(l.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Tolak cuti"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprove(l.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-bold"
                                title="Setujui cuti (Otomatis OFF di roster)"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pengajuan Cuti / Izin Karyawan"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Karyawan Pemohon</label>
            <select
              value={formEmployeeId}
              onChange={(e) => setFormEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              required
            >
              {employees.filter((e) => e.status === 'active').map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.employeeNo})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Cuti / Izin</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              <option value="Cuti Tahunan">Cuti Tahunan</option>
              <option value="Izin Sakit">Izin Sakit (Surat Dokter)</option>
              <option value="Izin Khusus">Izin Khusus / Keperluan Mendesak</option>
              <option value="Izin Menikah">Izin Menikah</option>
              <option value="Cuti Melahirkan">Cuti Melahirkan</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ModernDatePicker
              label="Tanggal Mulai"
              value={formStartDate}
              onChange={setFormStartDate}
              required
            />
            <ModernDatePicker
              label="Tanggal Selesai"
              value={formEndDate}
              onChange={setFormEndDate}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Pengajuan</label>
            <textarea
              rows={3}
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Tuliskan keterangan detail..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
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
              className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold"
            >
              Ajukan Sekarang
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
