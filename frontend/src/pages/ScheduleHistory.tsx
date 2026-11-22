import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import { getShiftBadgeStyle, getJobdeskBadgeStyle } from '../utils/codeStyles';
import {
  FileSpreadsheet,
  Trash2,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Download,
  Info
} from 'lucide-react';

export const ScheduleHistory: React.FC = () => {
  const { scheduleHistories, employees, currentUser, deleteScheduleHistories } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  // Permanent Delete Modal State (Admin Only - PRD Section 11.3)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'date_range' | 'employee'>('all');
  const [deleteStartDate, setDeleteStartDate] = useState('2026-11-01');
  const [deleteEndDate, setDeleteEndDate] = useState('2026-11-14');
  const [deleteTargetEmployeeId, setDeleteTargetEmployeeId] = useState(employees[0]?.id || '');
  const [confirmText, setConfirmText] = useState('');

  // Permission check: Only Admin can access deletion (PRD 11.3)
  const isAdmin = currentUser?.role === 'Admin';

  const filteredHistories = useMemo(() => {
    return scheduleHistories.filter((h) => {
      if (employeeFilter !== 'All' && h.employeeId !== employeeFilter) return false;
      if (actionFilter !== 'All' && h.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          h.employeeName.toLowerCase().includes(q) ||
          h.changedByName.toLowerCase().includes(q) ||
          h.workDate.includes(q)
        );
      }
      return true;
    });
  }, [scheduleHistories, employeeFilter, actionFilter, searchQuery]);

  // Count to be deleted preview
  const countToDelete = useMemo(() => {
    if (deleteMode === 'all') return scheduleHistories.length;
    if (deleteMode === 'employee') {
      return scheduleHistories.filter((h) => h.employeeId === deleteTargetEmployeeId).length;
    }
    return scheduleHistories.filter((h) => h.workDate >= deleteStartDate && h.workDate <= deleteEndDate).length;
  }, [scheduleHistories, deleteMode, deleteTargetEmployeeId, deleteStartDate, deleteEndDate]);

  const handleConfirmPermanentDelete = () => {
    if (confirmText !== 'HAPUS PERMANEN') {
      showToast('Ketik konfirmasi "HAPUS PERMANEN" dengan benar.', 'error');
      return;
    }

    try {
      const deletedCount = deleteScheduleHistories({
        all: deleteMode === 'all',
        employeeId: deleteMode === 'employee' ? deleteTargetEmployeeId : undefined,
        dateRange: deleteMode === 'date_range' ? { start: deleteStartDate, end: deleteEndDate } : undefined
      });

      showToast(`Berhasil menghapus permanen ${deletedCount} record Schedule History. Aksi dicatat di Activity Log.`, 'success');
      setIsDeleteModalOpen(false);
      setConfirmText('');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus histori.', 'error');
    }
  };

  const getActionCardBackground = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-100/80 dark:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-300 dark:hover:border-emerald-700';
      case 'UPDATE':
        return 'bg-sky-100/80 dark:bg-sky-950/45 border-sky-200 dark:border-sky-800/60 hover:border-sky-300 dark:hover:border-sky-700';
      case 'DELETE':
        return 'bg-rose-100/80 dark:bg-rose-950/45 border-rose-200 dark:border-rose-800/60 hover:border-rose-300 dark:hover:border-rose-700';
      case 'PUBLISH':
        return 'bg-amber-100/80 dark:bg-amber-950/45 border-amber-200 dark:border-amber-800/60 hover:border-amber-300 dark:hover:border-amber-700';
      case 'SWAP':
        return 'bg-violet-100/80 dark:bg-violet-950/45 border-violet-200 dark:border-violet-800/60 hover:border-violet-300 dark:hover:border-violet-700';
      default:
        return 'bg-slate-100 dark:bg-[#1E2024] border-slate-200 dark:border-white/10';
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-100/90 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'UPDATE':
        return 'bg-sky-100/90 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700';
      case 'DELETE':
        return 'bg-rose-100/90 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      case 'PUBLISH':
        return 'bg-amber-100/90 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'SWAP':
        return 'bg-violet-100/90 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-700';
      default:
        return 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
              Schedule History
            </h1>
          </div>
          <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
            Historical before/after snapshots of roster mutations, shift exchanges, and administrative revisions.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setConfirmText('');
              setIsDeleteModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-white/15 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
            <span>Hapus Permanen Histori</span>
          </button>
        )}
      </div>

      {/* Filter Strip */}
      <div className="bg-white dark:bg-[#18181A] p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-black/20"
          >
            <option value="All">Semua Aksi</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="PUBLISH">PUBLISH</option>
            <option value="SWAP">SWAP</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* Employee Filter */}
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-black/20"
          >
            <option value="All">Semua Karyawan</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari histori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white bg-white dark:bg-black/20 w-44 focus:outline-none"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total: <strong>{filteredHistories.length}</strong> catatan perubahan
        </div>
      </div>

      {/* History Items List View (No Colored Card Backgrounds) */}
      {filteredHistories.length === 0 ? (
        <div className="bg-white dark:bg-[#18181A] p-12 rounded-2xl border border-slate-200 dark:border-white/10 text-center text-slate-400 dark:text-gray-500">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Belum ada rekaman histori perubahan.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/10 overflow-hidden shadow-2xs">
          {filteredHistories.map((h) => (
            <div
              key={h.id}
              className="px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs"
            >
              {/* Left & Center: Action, Employee, Date, and Inline Before -> After */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0 flex-1">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black border font-mono shrink-0 ${getActionBadge(
                    h.action
                  )}`}
                >
                  {h.action}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-bold text-slate-900 dark:text-white">{h.employeeName}</span>
                  <span className="text-slate-300 dark:text-white/20">&bull;</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
                    {h.workDate}
                  </span>
                </div>

                {/* Inline Before -> After */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.03] px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-white/5">
                  <span className="text-[10px] text-slate-400 font-semibold">Sebelum:</span>
                  {h.beforeData ? (
                    <span className="inline-flex items-center gap-1">
                      {h.beforeData.shiftCode && (
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] ${getShiftBadgeStyle(h.beforeData.shiftCode).badge}`}>
                          {h.beforeData.shiftCode}
                        </span>
                      )}
                      {h.beforeData.jobdeskCode && (
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] ${getJobdeskBadgeStyle(h.beforeData.jobdeskCode).badge}`}>
                          {h.beforeData.jobdeskCode}
                        </span>
                      )}
                      {h.beforeData.location && (
                        <span className="text-[10px] text-slate-500">({h.beforeData.location})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Kosong</span>
                  )}

                  <ArrowRight className="w-3 h-3 text-slate-400 mx-0.5 shrink-0" />

                  <span className="text-[10px] text-slate-400 font-semibold">Sesudah:</span>
                  {h.afterData ? (
                    <span className="inline-flex items-center gap-1">
                      {h.afterData.shiftCode && (
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] ${getShiftBadgeStyle(h.afterData.shiftCode).badge}`}>
                          {h.afterData.shiftCode}
                        </span>
                      )}
                      {h.afterData.jobdeskCode && (
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] ${getJobdeskBadgeStyle(h.afterData.jobdeskCode).badge}`}>
                          {h.afterData.jobdeskCode}
                        </span>
                      )}
                      {h.afterData.location && (
                        <span className="text-[10px] text-slate-500">({h.afterData.location})</span>
                      )}
                      {h.afterData.publicationStatus && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          [{h.afterData.publicationStatus}]
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold italic">Dihapus</span>
                  )}
                </div>
              </div>

              {/* Right: Actor & Timestamp */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>
                  <strong className="text-slate-700 dark:text-slate-300">{h.changedByName}</strong>
                </span>
                <span>&bull;</span>
                <span className="font-mono text-[10px]">{h.changedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL (PRD 11.3) */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Penghapusan Permanen Schedule History (Admin Only)"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Ketentuan Audit PRD 11.3:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-800 dark:text-rose-300">
                <li>Hanya Admin yang berwenang melakukan tindakan ini.</li>
                <li>Penghapusan ini <strong>TIDAK menghapus</strong> roster aktif, request, atau Activity Log.</li>
                <li>Aksi penghapusan ini akan dicatat ke Activity Log secara permanen.</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cakupan Penghapusan</label>
            <select
              value={deleteMode}
              onChange={(e) => setDeleteMode(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white font-semibold"
            >
              <option value="all">Semua Catatan Histori ({scheduleHistories.length} record)</option>
              <option value="date_range">Berdasarkan Rentang Tanggal Roster</option>
              <option value="employee">Berdasarkan Karyawan Spesifik</option>
            </select>
          </div>

          {deleteMode === 'date_range' && (
            <div className="grid grid-cols-2 gap-3">
              <ModernDatePicker
                label="Dari Tanggal"
                value={deleteStartDate}
                onChange={setDeleteStartDate}
              />
              <ModernDatePicker
                label="Sampai Tanggal"
                value={deleteEndDate}
                onChange={setDeleteEndDate}
              />
            </div>
          )}

          {deleteMode === 'employee' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Karyawan</label>
              <select
                value={deleteTargetEmployeeId}
                onChange={(e) => setDeleteTargetEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.employeeNo})</option>
                ))}
              </select>
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Jumlah record yang akan dihapus:</span>
            <span className="font-black text-rose-700 dark:text-rose-400 font-mono text-sm">{countToDelete} Record</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ketik <span className="text-rose-600 dark:text-rose-400 font-mono">HAPUS PERMANEN</span> untuk konfirmasi:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="HAPUS PERMANEN"
              className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-black/20 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={confirmText !== 'HAPUS PERMANEN' || countToDelete === 0}
              onClick={handleConfirmPermanentDelete}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Konfirmasi Hapus Permanen</span>
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
