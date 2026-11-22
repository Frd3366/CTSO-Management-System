import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import { AnnouncementItem } from '../types';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Send,
  Eye,
  Archive,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export const AnnouncementManagement: React.FC = () => {
  const { announcements, teams, currentUser, addAnnouncement, updateAnnouncement } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPublishDate, setFormPublishDate] = useState('2026-11-15');
  const [formTargetType, setFormTargetType] = useState<'all' | 'team'>('all');
  const [formStatus, setFormStatus] = useState<'Draft' | 'Published' | 'Archived'>('Published');

  const canManage = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormPublishDate(new Date().toISOString().split('T')[0]);
    setFormTargetType('all');
    setFormStatus('Published');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann: AnnouncementItem) => {
    setEditingId(ann.id);
    setFormTitle(ann.title);
    setFormContent(ann.content);
    setFormPublishDate(ann.publishDate);
    setFormTargetType(ann.targetType);
    setFormStatus(ann.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateAnnouncement(editingId, {
        title: formTitle,
        content: formContent,
        publishDate: formPublishDate,
        targetType: formTargetType,
        status: formStatus
      });
      showToast('Pengumuman berhasil diperbarui.', 'success');
    } else {
      addAnnouncement({
        title: formTitle,
        content: formContent,
        publishDate: formPublishDate,
        targetType: formTargetType,
        targetTeamIds: [],
        status: formStatus
      });
      showToast('Pengumuman operasional berhasil disiarkan.', 'success');
    }
    setIsModalOpen(false);
  };

  const handleArchive = (id: string) => {
    updateAnnouncement(id, { status: 'Archived' });
    showToast('Pengumuman telah diarsipkan.', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
              Announcements
            </h1>
          </div>
          <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
            Broadcast operational bulletins, network maintenance alerts, and team updates.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements Feed */}
      <div className="space-y-3.5">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className={`p-4 sm:p-5 rounded-2xl border bg-white dark:bg-[#18181A] border-slate-200/90 dark:border-white/10 shadow-xs space-y-3 transition-all ${
              ann.status === 'Archived' ? 'opacity-75' : ''
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{ann.title}</h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Oleh: <strong className="text-slate-700 dark:text-slate-300">{ann.authorName}</strong></span>
                    <span>&bull;</span>
                    <span>Tanggal: {ann.publishDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    ann.status === 'Published'
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60'
                      : ann.status === 'Draft'
                      ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {ann.status === 'Published' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  {ann.status}
                </span>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ann)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
                      title="Edit pengumuman"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {ann.status === 'Published' && (
                      <button
                        type="button"
                        onClick={() => handleArchive(ann.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 rounded-lg transition-colors"
                        title="Arsipkan"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {ann.content}
            </p>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Pengumuman</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="cth: Pemeliharaan Link FO Sunset Road Badung"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-bold text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Isi Pesan / Instruksi Operasional</label>
            <textarea
              rows={4}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Tuliskan detail teknis, waktu pengerjaan, dan dampaknya pada shift..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ModernDatePicker
              label="Tanggal Publikasi"
              value={formPublishDate}
              onChange={setFormPublishDate}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Publikasi</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white font-semibold"
              >
                <option value="Published">Published (Disiarkan Sekarang)</option>
                <option value="Draft">Draft (Simpan sebagai Konsep)</option>
                <option value="Archived">Archived (Arsip)</option>
              </select>
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
              Simpan & Siarkan
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
