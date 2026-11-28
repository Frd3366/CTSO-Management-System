import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User as UserIcon,
  KeyRound,
  Mail,
  Phone,
  Building,
  Save,
  CheckCircle2,
  Camera,
  ShieldCheck,
  Database
} from 'lucide-react';

export const SettingsProfile: React.FC = () => {
  const { currentUser, employees, syncToServer } = useAuth();
  const { showToast } = useToast();

  const userEmployee = employees.find(
    (e) => e.id === currentUser?.employeeId || e.name === currentUser?.name
  );
  const userJabatan = userEmployee?.level || (currentUser?.role === 'Admin' ? 'Lead Operations' : currentUser?.role === 'SPV' ? 'Supervisor Operasional' : 'NOC Engineer');

  const [displayName, setDisplayName] = useState(currentUser?.name || 'Ferdi Adi');
  const [email, setEmail] = useState(currentUser?.email || 'ferdi@ctso.internal');
  const [phone, setPhone] = useState(currentUser?.phone || '0812-3456-7891');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Profil Anda berhasil diperbarui.', 'success');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Masukkan password saat ini.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password baru minimal 8 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.', 'error');
      return;
    }
    showToast('Password berhasil diubah. Silakan gunakan password baru saat login berikutnya.', 'success');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs">
        <h1 className="text-xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
          Account Profile
        </h1>
        <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
          Manage your personal information, profile photo, and password credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Card */}
        <div className="bg-white dark:bg-[#18181A] p-6 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#111111] dark:bg-white text-[#F9C900] dark:text-[#111111] font-black text-lg flex items-center justify-center shadow-md ring-1 ring-black/10 dark:ring-white/20">
              {currentUser?.avatarText || 'US'}
            </div>
            <button
              type="button"
              onClick={() => showToast('Choose a profile image to upload.', 'info')}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#F9C900] text-[#111111] hover:bg-[#E5B800] shadow-sm border border-[#E5B800]"
              title="Change Profile Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{currentUser?.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{currentUser?.userId}</p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/10 w-full space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Role:</span>
              <strong className="text-[#111111] dark:text-[#F9C900]">{currentUser?.role}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Level:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{userJabatan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Status:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">Active</span>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-[#111111] dark:text-[#F9C900]" />
                <span>Informasi Profil Mandiri</span>
              </h3>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Tampilan</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Kontak</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Telepon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Profil</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form (PRD Section 3.1 Profile menu) */}
          <div className="bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#111111] dark:text-[#F9C900]" />
                <span>Ganti Password Akun (Change Password)</span>
              </h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password Saat Ini</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ulangi Password Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white dark:hover:bg-slate-200 hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
