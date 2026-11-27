import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { User, UserRole, UserStatus, EmployeeItem } from '../types';
import { apiClient } from '../api/client';
import {
  UserCog,
  Plus,
  Edit2,
  KeyRound,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Mail,
  User as UserIcon,
  Phone,
  Trash2,
  UserPlus,
  Link as LinkIcon
} from 'lucide-react';

function formatRealTimeLastLogin(raw?: string, nowMs?: number): { primary: string; relative?: string } {
  if (!raw || raw === 'Belum pernah login') {
    return { primary: 'Belum pernah login' };
  }
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) {
    return { primary: raw };
  }
  const now = nowMs ?? Date.now();
  const diffSec = Math.max(0, Math.floor((now - parsed.getTime()) / 1000));

  let relative = '';
  if (diffSec < 60) {
    relative = 'Baru saja';
  } else if (diffSec < 3600) {
    relative = `${Math.floor(diffSec / 60)} mnt lalu`;
  } else if (diffSec < 86400) {
    relative = `${Math.floor(diffSec / 3600)} jam lalu`;
  } else {
    relative = `${Math.floor(diffSec / 86400)} hari lalu`;
  }

  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Makassar'
  }).format(parsed);

  return { primary: `${formatted} WITA`, relative };
}

export const UserManagement: React.FC = () => {
  const { users: accounts, addUser, updateUser, deleteUser, employees, addEmployee, updateEmployee, currentUser } = useAuth();
  const { showToast } = useToast();

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [liveLoginMap, setLiveLoginMap] = useState<Record<string, string>>({});

  // Real-time refresh of relative time and backend last_login timestamps
  useEffect(() => {
    let active = true;
    const fetchLiveLogins = async () => {
      try {
        const res = await apiClient.get<any[]>('/auth/users', []);
        if (active && Array.isArray(res) && res.length > 0) {
          const map: Record<string, string> = {};
          res.forEach((u) => {
            if (u.email && u.lastLogin) {
              map[String(u.email).toLowerCase()] = u.lastLogin;
            }
          });
          setLiveLoginMap(map);
        }
      } catch {
        // Offline fallback
      }
    };

    fetchLiveLogins();
    const timer = setInterval(() => {
      setNowMs(Date.now());
      fetchLiveLogins();
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<User | null>(null);

  // Form State
  const [createMode, setCreateMode] = useState<'direct' | 'link'>('direct');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUserId, setFormUserId] = useState('');
  const [formPassword, setFormPassword] = useState('admin123');
  const [formRole, setFormRole] = useState<'Admin' | 'SPV' | 'Employee'>('Employee');
  const [formStatus, setFormStatus] = useState<UserStatus>('active');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [autoCreateEmployee, setAutoCreateEmployee] = useState(true);

  // Edit Account Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editRole, setEditRole] = useState<'Admin' | 'SPV' | 'Employee'>('Employee');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');

  // Reset password form state
  const [newPassword, setNewPassword] = useState('admin123');

  const isAdmin = currentUser?.role === 'Admin';

  const filteredAccounts = accounts.filter((a) => {
    if (roleFilter !== 'All' && a.role !== roleFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.userId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat mengelola akun pengguna.', 'error');
      return;
    }
    const randId = `CTSO-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormName('');
    setFormEmail('');
    setFormUserId(randId);
    setFormPassword('admin123');
    setFormRole('Employee');
    setFormStatus('active');
    setCreateMode(employees.length > 0 ? 'direct' : 'direct');
    setFormEmployeeId(employees[0]?.id || '');
    setAutoCreateEmployee(true);
    setIsModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();

    if (createMode === 'direct') {
      if (!formName.trim() || !formEmail.trim()) {
        showToast('Nama dan Email wajib diisi.', 'error');
        return;
      }

      const cleanEmail = formEmail.trim().toLowerCase();
      const cleanNameLower = formName.trim().toLowerCase();
      if (
        accounts.some((a) => (a.email || '').trim().toLowerCase() === cleanEmail) ||
        employees.some((emp) => (emp.email || '').trim().toLowerCase() === cleanEmail)
      ) {
        showToast('Email sudah terdaftar. Tidak boleh menggunakan email yang sama.', 'error');
        return;
      }

      if (
        accounts.some((a) => (a.name || '').trim().toLowerCase() === cleanNameLower) ||
        employees.some((emp) => (emp.name || '').trim().toLowerCase() === cleanNameLower)
      ) {
        showToast('Nama employee sudah terdaftar. Tidak boleh menggunakan nama yang sama.', 'error');
        return;
      }

      let empId: string | undefined = undefined;
      const initials = formName
        .trim()
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      if (autoCreateEmployee) {
        empId = `emp_${Date.now()}`;
        const newEmp: EmployeeItem = {
          id: empId,
          employeeNo: formUserId.trim() || `CTSO-${Math.floor(1000 + Math.random() * 9000)}`,
          name: formName.trim(),
          level: formRole === 'Admin' ? 'Head' : formRole === 'SPV' ? 'SPV' : 'Junior',
          email: cleanEmail,
          phone: '-',
          defaultLocation: 'Badung',
          defaultJobdesk: undefined,
          status: formStatus,
          role: formRole,
          joinDate: new Date().toISOString().split('T')[0],
          avatarText: initials
        };
        addEmployee(newEmp);
      }

      addUser({
        name: formName.trim(),
        email: cleanEmail,
        userId: formUserId.trim() || `CTSO-${Math.floor(1000 + Math.random() * 9000)}`,
        role: formRole,
        status: formStatus,
        password: formPassword || 'admin',
        employeeId: empId
      });

      showToast(`Akun pengguna ${formName} berhasil dibuat dengan role ${formRole}!`, 'success');
      setIsModalOpen(false);
    } else {
      // Link to existing employee
      const emp = employees.find((e) => e.id === formEmployeeId);
      if (!emp) {
        showToast('Silakan pilih data karyawan yang valid.', 'error');
        return;
      }

      if (accounts.some((a) => a.email.toLowerCase() === emp.email.toLowerCase())) {
        showToast('Email sudah terdaftar. Karyawan ini telah memiliki akun pengguna.', 'error');
        return;
      }

      addUser({
        name: emp.name,
        email: emp.email,
        userId: emp.employeeNo,
        role: formRole,
        status: formStatus,
        password: formPassword || 'admin',
        employeeId: emp.id,
        department: emp.teamName
      });

      showToast(`Akun untuk karyawan ${emp.name} berhasil dibuat!`, 'success');
      setIsModalOpen(false);
    }
  };

  const handleOpenEditAccount = (acc: User) => {
    setSelectedAccount(acc);
    setEditName(acc.name);
    setEditEmail(acc.email);
    setEditUserId(acc.userId);
    setEditRole(acc.role);
    setEditStatus(acc.status);
    setIsEditModalOpen(true);
  };

  const handleSaveEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    if (!editName.trim() || !editEmail.trim()) {
      showToast('Nama dan Email wajib diisi.', 'error');
      return;
    }

    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanNameLower = editName.trim().toLowerCase();
    const prevEmailLower = (selectedAccount.email || '').trim().toLowerCase();

    if (
      accounts.some((a) => a.id !== selectedAccount.id && (a.email || '').trim().toLowerCase() === cleanEmail) ||
      employees.some(
        (emp) =>
          emp.id !== selectedAccount.employeeId &&
          (emp.email || '').trim().toLowerCase() !== prevEmailLower &&
          (emp.email || '').trim().toLowerCase() === cleanEmail
      )
    ) {
      showToast('Email sudah digunakan oleh akun atau employee lain.', 'error');
      return;
    }

    if (
      accounts.some((a) => a.id !== selectedAccount.id && (a.name || '').trim().toLowerCase() === cleanNameLower) ||
      employees.some(
        (emp) =>
          emp.id !== selectedAccount.employeeId &&
          (emp.email || '').trim().toLowerCase() !== prevEmailLower &&
          (emp.name || '').trim().toLowerCase() === cleanNameLower
      )
    ) {
      showToast('Nama employee sudah digunakan oleh akun atau employee lain.', 'error');
      return;
    }

    updateUser(selectedAccount.id, {
      name: editName.trim(),
      email: cleanEmail,
      userId: editUserId.trim() || selectedAccount.userId,
      role: editRole,
      status: editStatus
    });

    if (selectedAccount.employeeId) {
      updateEmployee(selectedAccount.employeeId, {
        name: editName.trim(),
        email: cleanEmail,
        employeeNo: editUserId.trim() || selectedAccount.userId,
        role: editRole,
        status: editStatus
      });
    }

    showToast(`Role dan data akun ${editName} berhasil diperbarui (Role: ${editRole}).`, 'success');
    setIsEditModalOpen(false);
  };

  const handleResetPassword = () => {
    if (!selectedAccount) return;
    updateUser(selectedAccount.id, { password: newPassword });
    showToast(`Password akun ${selectedAccount.name} berhasil diperbarui.`, 'success');
    setIsResetModalOpen(false);
  };

  const handleSyncEmployees = () => {
    let syncedCount = 0;
    employees.forEach((emp) => {
      const match = accounts.find(
        (a) => a.email.toLowerCase() === emp.email.toLowerCase() || a.userId === emp.employeeNo
      );
      if (!match) {
        addUser({
          employeeId: emp.id,
          name: emp.name,
          email: emp.email,
          userId: emp.employeeNo,
          role: emp.role || 'Employee',
          status: emp.status || 'active',
          password: 'admin',
          phone: emp.phone,
          department: emp.teamName
        });
        syncedCount++;
      } else if (!match.employeeId) {
        updateUser(match.id, { employeeId: emp.id });
        syncedCount++;
      }
    });
    if (syncedCount > 0) {
      showToast(`Berhasil menyinkronkan ${syncedCount} akun dengan karyawan.`, 'success');
    } else {
      showToast('Seluruh data akun pengguna dan karyawan sudah sinkron.', 'info');
    }
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount) return;
    if (selectedAccount.email === 'admin@ctso.net') {
      showToast('Akun Super Administrator default tidak boleh dihapus.', 'error');
      setIsDeleteModalOpen(false);
      return;
    }
    deleteUser(selectedAccount.id);
    showToast(`Akun pengguna ${selectedAccount.name} berhasil dihapus.`, 'success');
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
              User Accounts
            </h1>
          </div>
          <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
            Kelola akun login sistem, perizinan hak akses (Admin, SPV, Employee), dan kredensial kata sandi.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncEmployees}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Sinkronisasikan seluruh data karyawan ke akun pengguna"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
              <span>Sinkronkan Karyawan</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#111111]" />
              <span>Buat Akun Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Strip */}
      <div className="bg-white dark:bg-[#18181A] p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-gray-200 bg-white dark:bg-[#18181A] focus:outline-none"
          >
            <option value="All">Semua Role</option>
            <option value="Admin">Admin</option>
            <option value="SPV">SPV</option>
            <option value="Employee">Employee</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari user, email, atau NIK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs text-[#111111] dark:text-white placeholder-[#647084] dark:placeholder-gray-400 w-60 focus:outline-none focus:border-[#F9C900]"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-gray-400">
          Total Akun Terdaftar: <strong className="text-slate-800 dark:text-white font-mono">{filteredAccounts.length}</strong>
        </div>
      </div>

      {/* Account Table */}
      <div className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">User ID / NIK</th>
                <th className="py-3 px-4">Role Sistem</th>
                <th className="py-3 px-4">Login Terakhir</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-[#F9C900] font-bold text-xs flex items-center justify-center">
                        {acc.avatarText || 'US'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-gray-400">{acc.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-gray-300">
                    {acc.userId}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                        acc.role === 'Admin'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                          : acc.role === 'SPV'
                          ? 'bg-[#E7F0FE] dark:bg-white/10 text-[#111111] dark:text-[#F9C900] border border-[#CBD5E1] dark:border-white/10'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                      }`}
                    >
                      {acc.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-gray-300">
                    {(() => {
                      const effectiveLastLogin =
                        liveLoginMap[acc.email.toLowerCase()] || acc.lastLogin;
                      const info = formatRealTimeLastLogin(effectiveLastLogin, nowMs);
                      return (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-gray-200">{info.primary}</span>
                          {info.relative && (
                            <span className="text-[10px] text-slate-400 dark:text-gray-400 font-sans">
                              {info.relative}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        acc.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {acc.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAccount(acc)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/10 text-[11px] font-semibold text-slate-700 dark:text-gray-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Edit Role & Data Akun"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccount(acc);
                            setNewPassword('admin123');
                            setIsResetModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/10 text-[11px] font-semibold text-slate-700 dark:text-gray-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Ubah Sandi"
                        >
                          <KeyRound className="w-3 h-3 text-slate-400" />
                          <span>Sandi</span>
                        </button>
                        {acc.email !== 'admin@ctso.net' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAccount(acc);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 rounded-lg border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer shadow-2xs"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Akun Pengguna Baru"
        size="md"
      >
        <form onSubmit={handleSaveAccount} className="space-y-4">
          
          {/* Mode Tabs */}
          <div className="flex border-b border-slate-200 dark:border-white/10 gap-2 pb-2">
            <button
              type="button"
              onClick={() => setCreateMode('direct')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                createMode === 'direct'
                  ? 'bg-[#111111] text-[#F9C900]'
                  : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Input Akun Baru</span>
            </button>
            {employees.length > 0 && (
              <button
                type="button"
                onClick={() => setCreateMode('link')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  createMode === 'link'
                    ? 'bg-[#111111] text-[#F9C900]'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Tautkan ke Karyawan yang Ada</span>
              </button>
            )}
          </div>

          {createMode === 'direct' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: I Putu Wijaya"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white focus:outline-none focus:border-[#F9C900]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Email Pengguna <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="nama@ctso.net"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white focus:outline-none focus:border-[#F9C900]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    User ID / NIK Karyawan
                  </label>
                  <input
                    type="text"
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                    placeholder="CTSO-0101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#F9C900]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Kata Sandi Awal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#F9C900]"
                  required
                />
              </div>

              {/* Checkbox Auto-create Employee */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateEmployee}
                    onChange={(e) => setAutoCreateEmployee(e.target.checked)}
                    className="mt-0.5 rounded text-[#111111] focus:ring-[#F9C900]"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                      Otomatis sinkronkan ke Master Karyawan
                    </span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300/80 block">
                      Data pengguna ini akan langsung tercatat sebagai karyawan aktif agar dapat dialokasikan jadwal shift kerja.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Pilih Data Karyawan (Tersedia: {employees.length})
              </label>
              <select
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white focus:outline-none focus:border-[#F9C900]"
                required
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeNo}) &bull; {e.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Role Akun</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#F9C900]"
              >
                <option value="Employee">Employee (Staff Teknis)</option>
                <option value="SPV">SPV (Supervisor Operasional)</option>
                <option value="Admin">Admin (Full Administrative Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Status Akun</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white focus:outline-none focus:border-[#F9C900]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold shadow-sm cursor-pointer"
            >
              Simpan Akun
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Akun & Role Pengguna"
        size="md"
      >
        <form onSubmit={handleSaveEditAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white focus:outline-none focus:border-[#F9C900]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Email Pengguna <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white focus:outline-none focus:border-[#F9C900]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                User ID / NIK Karyawan
              </label>
              <input
                type="text"
                value={editUserId}
                onChange={(e) => setEditUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#F9C900]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Role Akun <span className="text-rose-500">*</span>
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#F9C900]"
              >
                <option value="Employee">Employee (Staff Teknis)</option>
                <option value="SPV">SPV (Supervisor Operasional)</option>
                <option value="Admin">Admin (Full Administrative Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Status Akun</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white focus:outline-none focus:border-[#F9C900]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold shadow-sm cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET / UBAH PASSWORD MODAL */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Ubah Sandi Pengguna"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-gray-400">
            Atur kata sandi baru untuk akun <strong>{selectedAccount?.name}</strong> ({selectedAccount?.email}):
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 mb-1">
              Kata Sandi Baru:
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan sandi baru"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#18181A] text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#F9C900]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              className="px-4 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold cursor-pointer"
            >
              Simpan Sandi
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus Akun"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus akun <strong>{selectedAccount?.name}</strong> ({selectedAccount?.email})?
            Akun ini tidak akan dapat login lagi ke sistem.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
            >
              Hapus Akun
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
