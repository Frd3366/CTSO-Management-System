import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Modal } from '../components/common/Modal';
import { ShiftMasterItem } from '../types';
import {
  RECOMMENDED_SHIFT_COLORS,
  blendSolidColor,
  getShiftBadgeStyle
} from '../utils/codeStyles';
import {
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Check
} from 'lucide-react';
import { ModernTimePicker } from '../components/common/ModernTimePicker';

export const ShiftMaster: React.FC = () => {
  const { shifts, addShift, updateShift, deleteShift, currentUser } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftMasterItem | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formStartTime, setFormStartTime] = useState('07:00');
  const [formEndTime, setFormEndTime] = useState('15:00');
  const [formEndDayOffset, setFormEndDayOffset] = useState<number>(0);
  const [formColor, setFormColor] = useState<string>(RECOMMENDED_SHIFT_COLORS[0].hex);
  const [formIsOff, setFormIsOff] = useState(false);
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formNote, setFormNote] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const isAdmin = currentUser?.role === 'Admin';
  const isDark = theme === 'dark';

  const handleOpenAdd = () => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat mengelola Schedule Master.', 'error');
      return;
    }
    setEditingId(null);
    setFormCode('');
    setFormName('');
    setFormStartTime('07:00');
    setFormEndTime('15:00');
    setFormEndDayOffset(0);
    setFormColor(RECOMMENDED_SHIFT_COLORS[0].hex);
    setFormIsOff(false);
    setFormOrder(shifts.length + 1);
    setFormNote('');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sh: ShiftMasterItem) => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat mengedit Schedule Master.', 'error');
      return;
    }
    setEditingId(sh.id);
    setFormCode(sh.code);
    setFormName(sh.name);
    setFormStartTime(sh.startTime);
    setFormEndTime(sh.endTime);
    setFormEndDayOffset(sh.endDayOffset || 0);
    setFormColor(sh.color || RECOMMENDED_SHIFT_COLORS[0].hex);
    setFormIsOff(sh.isOff);
    setFormOrder(sh.order);
    setFormNote(sh.note);
    setFormStatus(sh.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateShift(editingId, {
        code: formCode,
        name: formName,
        startTime: formStartTime,
        endTime: formEndTime,
        endDayOffset: formEndDayOffset,
        color: formColor,
        textColor: undefined,
        isOff: formIsOff,
        order: formOrder,
        note: formNote,
        status: formStatus
      });
      showToast('Konfigurasi kode jadwal berhasil diperbarui dan disinkronkan ke Schedule.', 'success');
    } else {
      addShift({
        code: formCode,
        name: formName,
        startTime: formStartTime,
        endTime: formEndTime,
        endDayOffset: formEndDayOffset,
        color: formColor,
        textColor: undefined,
        isOff: formIsOff,
        order: formOrder,
        note: formNote,
        status: formStatus
      });
      showToast('Kode jadwal baru berhasil ditambahkan ke katalog.', 'success');
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const res = deleteShift(deleteTarget.id);
    if (!res.success) {
      showToast(res.error || 'Gagal menghapus kode jadwal.', 'error');
    } else {
      showToast(`Kode ${deleteTarget.code} berhasil dihapus dari Schedule Master.`, 'success');
      setDeleteTarget(null);
    }
  };

  const previewBg = isDark
    ? blendSolidColor(formColor, 0.42, '#202020')
    : blendSolidColor(formColor, 0.22, '#FFFFFF');
  const previewBorder = isDark
    ? blendSolidColor(formColor, 0.65, '#202020')
    : blendSolidColor(formColor, 0.55, '#FFFFFF');
  const previewText = isDark ? '#FFFFFF' : '#202020';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
              Schedule Master
            </h1>
          </div>
          <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
            Configure schedule codes, working hours, day offsets (+1 for overnight shift), color themes, and active status.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-[#FFD416] hover:bg-[#FFE160] text-[#202020] border border-[#FFD416] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Schedule Code</span>
          </button>
        )}
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {shifts.map((sh) => (
          <div
            key={sh.id}
            className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden flex flex-col justify-between transition-all"
          >
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-black font-mono px-2.5 py-0.5 rounded-lg shadow-2xs inline-block ${
                      getShiftBadgeStyle(sh.code, shifts).badge
                    }`}
                  >
                    {sh.code}
                  </span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{sh.name}</div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sh.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {sh.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Time Configuration (PRD 5.1 & 14 Time Handling) */}
              <div className="py-1.5 px-2.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/70 dark:border-white/10 text-xs flex items-center justify-between font-mono">
                <span className="font-sans text-slate-500 dark:text-slate-400 text-[11px]">Jam Kerja:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-xs">
                  {sh.isOff ? 'Libur (00:00 - 00:00)' : `${sh.startTime} - ${sh.endTime}${sh.endDayOffset > 0 ? ' (+1)' : ''}`}
                </strong>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 leading-snug">{sh.note}</p>
            </div>

            {isAdmin && (
              <div className="py-2 px-3 bg-slate-50/60 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(sh)}
                  className="px-3 py-1 rounded-lg border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-white font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Edit2 className="w-3 h-3 text-slate-400 dark:text-slate-300" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(sh)}
                  className="p-1 rounded-lg border border-slate-300 dark:border-white/20 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-2xs"
                  title={`Hapus kode ${sh.code}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Konfigurasi Schedule' : 'Tambah Kode Schedule Baru'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Singkat</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="cth: Pagi 7"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-mono font-bold text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Schedule</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="cth: Pagi 7 (Early Morning)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ModernTimePicker
              label="Jam Mulai (WITA)"
              value={formStartTime}
              onChange={setFormStartTime}
              required
            />
            <ModernTimePicker
              label="Jam Selesai (WITA)"
              value={formEndTime}
              onChange={setFormEndTime}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Offset Hari Selesai</label>
            <select
              value={formEndDayOffset}
              onChange={(e) => setFormEndDayOffset(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white"
            >
              <option value={0}>0 (Selesai pada tanggal yang sama)</option>
              <option value={1}>+1 Hari (Shift Malam lintas tanggal berikutnya)</option>
            </select>
          </div>

          {/* Curated Recommended Color Palette (Synced to Schedule, Text Auto-Adapts to Light/Dark Mode) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Rekomendasi Warna Kode
              </label>
              <span className="text-[10px] text-slate-400 dark:text-gray-400">
                Teks otomatis menyesuaikan Light / Dark Mode
              </span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              {RECOMMENDED_SHIFT_COLORS.map((swatch) => {
                const isSelected = formColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => setFormColor(swatch.hex)}
                    title={swatch.name}
                    aria-label={`Pilih warna ${swatch.name}`}
                    style={{ backgroundColor: swatch.hex }}
                    className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-[#202020] dark:ring-[#FFD416] dark:ring-offset-[#202020] scale-105 shadow-sm'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 stroke-[3] ${
                          swatch.hex.toUpperCase() === '#FFD416' ? 'text-[#202020]' : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Badge Preview */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Preview di Schedule:
            </span>
            <span
              style={{
                backgroundColor: previewBg,
                borderColor: previewBorder,
                color: previewText
              }}
              className="text-xs font-black font-mono px-3 py-1 rounded-lg border shadow-2xs inline-block"
            >
              {formCode || 'KODE'}
            </span>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsOff}
                onChange={(e) => setFormIsOff(e.target.checked)}
                className="rounded text-[#111111] focus:ring-orange-500"
              />
              <span>Tandai sebagai kode Off Day (Libur)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formStatus === 'active'}
                onChange={(e) => setFormStatus(e.target.checked ? 'active' : 'inactive')}
                className="rounded text-[#111111] focus:ring-orange-500"
              />
              <span>Status Active</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi / Catatan Operasional</label>
            <textarea
              rows={2}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Catatan penempatan..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
            />
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
              className="px-5 py-2 rounded-xl bg-[#FFD416] hover:bg-[#FFE160] text-[#202020] border border-[#FFD416] text-xs font-bold shadow-sm"
            >
              Simpan Schedule Master
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Kode Schedule"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              Apakah Anda yakin ingin menghapus kode <strong className="font-mono text-slate-900 dark:text-white">{deleteTarget?.code}</strong> ({deleteTarget?.name})?
              <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
                Tindakan ini tidak dapat dibatalkan. Kode yang masih digunakan dalam jadwal aktif tidak dapat dihapus.
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
              <span>Hapus Kode</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
