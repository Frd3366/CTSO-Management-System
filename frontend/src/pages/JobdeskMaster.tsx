import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { JobdeskItem } from '../types';
import { toCssSlug, getContrastTextColor, parseJobdeskTasks } from '../utils/codeStyles';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  PowerOff,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export const JobdeskMaster: React.FC = () => {
  const { jobdesks, addJobdesk, updateJobdesk, deleteJobdesk, currentUser } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobdeskItem | null>(null);

  const [formCode, setFormCode] = useState('CT1');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#EA580C');
  const [formTextColor, setFormTextColor] = useState('#FFFFFF');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const isAdmin = currentUser?.role === 'Admin';

  const handleOpenAdd = () => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat mengelola master jobdesk.', 'error');
      return;
    }
    setEditingId(null);
    setFormCode(`CT${jobdesks.length + 5}`);
    setFormName('');
    setFormDescription('');
    setFormColor('#EA580C');
    setFormTextColor('#FFFFFF');
    setFormOrder(jobdesks.length + 1);
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (jd: JobdeskItem) => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat mengedit master jobdesk.', 'error');
      return;
    }
    setEditingId(jd.id);
    setFormCode(jd.code);
    setFormName(jd.name);
    setFormDescription(jd.description);
    setFormColor(jd.color);
    setFormTextColor(jd.textColor || getContrastTextColor(jd.color || '#EA580C'));
    setFormOrder(jd.order);
    setFormStatus(jd.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateJobdesk(editingId, {
        code: formCode,
        name: formName,
        description: formDescription,
        color: formColor,
        textColor: formTextColor,
        order: formOrder,
        status: formStatus
      });
      showToast('Master kode jobdesk berhasil diperbarui.', 'success');
    } else {
      addJobdesk({
        code: formCode,
        name: formName,
        description: formDescription,
        color: formColor,
        textColor: formTextColor,
        order: formOrder,
        status: formStatus
      });
      showToast('Kode jobdesk baru berhasil ditambahkan ke katalog.', 'success');
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (jd: JobdeskItem) => {
    if (!isAdmin) return;
    const newStatus = jd.status === 'active' ? 'inactive' : 'active';
    updateJobdesk(jd.id, { status: newStatus });
    showToast(`Status kode ${jd.code} diubah menjadi ${newStatus}.`, 'info');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const res = deleteJobdesk(deleteTarget.id);
    if (!res.success) {
      showToast(res.error || 'Gagal menghapus kode jobdesk.', 'error');
    } else {
      showToast(`Kode jobdesk ${deleteTarget.code} berhasil dihapus dari master katalog.`, 'success');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
              Jobdesk Master
            </h1>
          </div>
          <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
            Master task catalog for operational roles. Exactly one jobdesk per employee per working day.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Jobdesk Code</span>
          </button>
        )}
      </div>

      {/* Jobdesks Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {jobdesks.map((jd) => (
          <div
            key={jd.id}
            className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden flex flex-col justify-between transition-all"
          >
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      backgroundColor: jd.color || '#0284C7',
                      color: jd.textColor || getContrastTextColor(jd.color || '#0284C7')
                    }}
                    className="text-xs font-black font-mono px-3 py-1 rounded-xl shadow-xs"
                  >
                    {jd.code}
                  </span>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">{jd.name}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    jd.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {jd.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Tugas ${jd.code}`}>
                {parseJobdeskTasks(jd.description).map((task, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-normal shadow-2xs"
                    title={task}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: jd.color || '#64748B' }}
                    />
                    <span>{task}</span>
                  </span>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="py-2 px-3 bg-slate-50/60 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(jd)}
                  className="px-3 py-1 rounded-lg border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-white font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Edit2 className="w-3 h-3 text-slate-400 dark:text-slate-300" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(jd)}
                  className="p-1 rounded-lg border border-slate-300 dark:border-white/20 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-2xs"
                  title={`Hapus kode jobdesk ${jd.code}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Kode Jobdesk' : 'Tambah Kode Jobdesk Baru'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Jobdesk</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="cth: CT1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-mono font-bold text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Fungsi</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="cth: Incident Handling & Dispatch"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Deskripsi Ruang Lingkup</label>
              <span className="text-[10px] text-slate-400">Pisahkan dengan koma, titik koma, atau baris baru</span>
            </div>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="cth: Penanganan komplain tingkat 1, validasi tiket insiden, dan dispatch awal"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              required
            />
            {formDescription.trim() && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Pratinjau Butir Tugas:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parseJobdeskTasks(formDescription).map((task, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300 font-medium shadow-2xs"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: formColor || '#0284C7' }}
                      />
                      <span>{task}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Warna Background Kode</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-10 h-9 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Warna Teks Kode</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formTextColor}
                  onChange={(e) => setFormTextColor(e.target.value)}
                  className="w-10 h-9 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={formTextColor}
                  onChange={(e) => setFormTextColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Preview Kode</label>
              <div className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                <span
                  style={{ backgroundColor: formColor, color: formTextColor }}
                  className="text-xs font-black font-mono px-3 py-0.5 rounded-lg shadow-2xs inline-block"
                >
                  {formCode || 'CT1'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold shadow-sm"
            >
              Simpan Master Jobdesk
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Kode Jobdesk"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              Apakah Anda yakin ingin menghapus kode jobdesk <strong className="font-mono text-slate-900 dark:text-white">{deleteTarget?.code}</strong> ({deleteTarget?.name})?
              <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
                Tindakan ini tidak dapat dibatalkan. Jobdesk yang masih dialokasikan dalam jadwal aktif tidak dapat dihapus.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Jobdesk</span>
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
