import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { EmployeeItem, WorkLocation } from '../types';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Building,
  Phone,
  Mail,
  Calendar,
  Layers,
  PowerOff,
  UserCheck,
  Download,
  Upload,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  FileText,
  Trash2
} from 'lucide-react';

const EMPLOYEE_LEVEL_OPTIONS = [
  'Head',
  'SPV',
  'Senior',
  'Intermediate',
  'Junior',
  'Training',
  'Intership'
] as const;

export const EmployeeManagement: React.FC = () => {
  const { employees, teams, currentUser, addEmployee, updateEmployee, deleteEmployee, users, addUser, updateUser, deleteUser } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState<'All' | WorkLocation>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'inactive'>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmpForDelete, setSelectedEmpForDelete] = useState<EmployeeItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields (PRD 7.1)
  const [formEmployeeNo, setFormEmployeeNo] = useState('');
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState<string>('Junior');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTeamId, setFormTeamId] = useState('team_core');
  const [formLocation, setFormLocation] = useState<WorkLocation>('Badung');
  const [formRole, setFormRole] = useState<'Admin' | 'SPV' | 'Employee'>('Employee');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formJoinDate, setFormJoinDate] = useState('2022-01-15');

  // Permission: PRD 2.4 & 7.1 (Only Admin can mutate; SPV can view if authorized)
  const isAdmin = currentUser?.role === 'Admin';
  const canView = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch =
        (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.employeeNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.level || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'All' || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  const handleOpenAdd = () => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat menambah karyawan.', 'error');
      return;
    }
    setEditingId(null);
    setFormEmployeeNo(`CTSO-${String(employees.length + 101).padStart(4, '0')}`);
    setFormName('');
    setFormLevel('Junior');
    setFormEmail('');
    setFormPhone('');
    setFormTeamId(teams[0]?.id || 'team_core');
    setFormLocation('Badung');
    setFormRole('Employee');
    setFormStatus('active');
    setFormJoinDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeItem) => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat mengubah data utama karyawan.', 'warning');
      return;
    }
    setEditingId(emp.id);
    setFormEmployeeNo(emp.employeeNo);
    setFormName(emp.name);
    const validLevel = EMPLOYEE_LEVEL_OPTIONS.includes(emp.level as any) ? emp.level : 'Junior';
    setFormLevel(validLevel);
    setFormEmail(emp.email);
    setFormPhone(emp.phone);
    setFormTeamId(emp.teamId);
    setFormLocation(emp.defaultLocation);
    setFormRole(emp.role || 'Employee');
    setFormStatus(emp.status);
    setFormJoinDate(emp.joinDate);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (emp: EmployeeItem) => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat mengubah status aktif karyawan.', 'error');
      return;
    }
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    const actionLabel = newStatus === 'active' ? 'mengaktifkan kembali' : 'menonaktifkan';

    if (window.confirm(`Apakah Anda yakin ingin ${actionLabel} ${emp.name}? Karyawan nonaktif tidak dapat diberi roster baru, namun histori lama tetap dipertahankan.`)) {
      updateEmployee(emp.id, { status: newStatus });
      showToast(`Status karyawan ${emp.name} berhasil diubah menjadi ${newStatus}.`, 'success');
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedEmpForDelete) return;
    const linkedUser = users.find(
      (u) => u.employeeId === selectedEmpForDelete.id || u.email.toLowerCase() === selectedEmpForDelete.email.toLowerCase()
    );
    const res = deleteEmployee(selectedEmpForDelete.id);
    if (res.success) {
      if (linkedUser) {
        deleteUser(linkedUser.id);
      }
      showToast(`Data karyawan ${selectedEmpForDelete.name} dan akun user berhasil dihapus.`, 'success');
    } else {
      showToast(res.error || 'Gagal menghapus karyawan.', 'error');
    }
    setIsDeleteModalOpen(false);
    setSelectedEmpForDelete(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const team = teams.find((t) => t.id === formTeamId);
    const teamName = team?.name || 'CTSO Operations';

    if (editingId) {
      updateEmployee(editingId, {
        employeeNo: formEmployeeNo,
        name: formName,
        level: formLevel,
        email: formEmail,
        phone: formPhone,
        teamId: formTeamId,
        teamName,
        defaultLocation: formLocation,
        role: formRole,
        status: formStatus,
        joinDate: formJoinDate
      });

      // Synchronize role and profile with linked user account
      const linkedUser = users.find(
        (u) => u.employeeId === editingId || u.email.toLowerCase() === formEmail.toLowerCase()
      );
      if (linkedUser) {
        updateUser(linkedUser.id, {
          name: formName,
          email: formEmail,
          userId: formEmployeeNo,
          role: formRole,
          status: formStatus
        });
      }

      showToast(`Data karyawan ${formName} berhasil diperbarui (Role: ${formRole}).`, 'success');
    } else {
      const newEmpId = `emp_${Date.now()}`;
      addEmployee({
        id: newEmpId,
        employeeNo: formEmployeeNo,
        name: formName,
        level: formLevel,
        email: formEmail,
        phone: formPhone,
        teamId: formTeamId,
        teamName,
        defaultLocation: formLocation,
        status: formStatus,
        role: formRole,
        joinDate: formJoinDate,
        avatarText: formName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
      });

      // Auto-create & synchronize user account
      if (!users.some((u) => u.email.toLowerCase() === formEmail.toLowerCase())) {
        addUser({
          employeeId: newEmpId,
          name: formName,
          email: formEmail,
          userId: formEmployeeNo,
          role: formRole,
          status: formStatus,
          password: 'admin',
          phone: formPhone,
          department: teamName
        });
      }

      showToast(`Karyawan baru ${formName} berhasil ditambahkan dan disinkronkan ke User Accounts.`, 'success');
    }
    setIsModalOpen(false);
  };

  // Export Employee List to CSV (PRD 12.3)
  const handleExport = () => {
    const headers = ['Employee ID', 'Nama Lengkap', 'Jabatan', 'Email', 'Telepon', 'Status', 'Tanggal Bergabung'];
    const rows = filteredEmployees.map((e) => [
      e.employeeNo,
      `"${e.name}"`,
      `"${e.level}"`,
      e.email,
      e.phone,
      e.status,
      e.joinDate
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CTSO_Employee_Master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Master data karyawan berhasil diekspor.', 'success');
  };

  if (!canView) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto space-y-3">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Akses Terbatas (Permission Required)</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Akun Anda saat ini memiliki role <strong>{currentUser?.role}</strong>. Modul Employee Management hanya dapat diakses oleh Admin atau Supervisor dengan permission khusus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
              Employees
            </h1>
          </div>
          <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
            Master database of CTSO technical staff across Badung and Denpasar hubs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handleExport}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181A] hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold text-[#111111] dark:text-white flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#647084]" />
              <span>Export CSV</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#18181A] p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID, nama, level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-[#CBD5E1] dark:border-white/10 bg-[#E7F0FE]/50 dark:bg-white/5 text-xs text-[#111111] dark:text-white placeholder-[#647084] dark:placeholder-gray-400 w-48 sm:w-64 focus:bg-white dark:focus:bg-[#18181A] focus:outline-none focus:border-[#F9C900] focus:ring-2 focus:ring-[#F9C900]/20"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-gray-200 bg-white dark:bg-[#18181A] focus:outline-none"
          >
            <option value="All">Semua Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-gray-400">
          Menampilkan <strong className="text-slate-800 dark:text-white">{filteredEmployees.length}</strong> karyawan
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Role Akun</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-400 dark:text-gray-500">
                    Tidak ada karyawan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-gray-200">
                      {emp.employeeNo}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-gray-300 font-medium">
                      {emp.level || 'Junior'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          (emp.role || 'Employee') === 'Admin'
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/50'
                            : (emp.role || 'Employee') === 'SPV'
                            ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300/50'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                        }`}
                      >
                        {emp.role || 'Employee'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-gray-400 text-[11px] font-mono">
                      <div>{emp.email}</div>
                      <div>{emp.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400'
                        }`}
                      >
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title="Edit data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              emp.status === 'active'
                                ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                            title={emp.status === 'active' ? 'Set Inactive' : 'Set Active'}
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmpForDelete(emp);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Karyawan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Employee ID</label>
              <input
                type="text"
                value={formEmployeeNo}
                onChange={(e) => setFormEmployeeNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:border-[#F9C900]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="cth: I Putu Wijaya"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F9C900]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Level</label>
            <select
              value={formLevel}
              onChange={(e) => setFormLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181A] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#F9C900]"
              required
            >
              {EMPLOYEE_LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Email Resmi</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="nama@ctso.internal"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F9C900]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[#F9C900]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Role Akun</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181A] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#F9C900]"
              >
                <option value="Employee">Employee (Staff Teknis)</option>
                <option value="SPV">SPV (Supervisor Operasional)</option>
                <option value="Admin">Admin (Full Administrative Access)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Status Karyawan</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181A] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F9C900]"
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
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold shadow-sm"
            >
              Simpan Data
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus Karyawan"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus data karyawan <strong>{selectedEmpForDelete?.name}</strong> ({selectedEmpForDelete?.employeeNo})?
            Jadwal shift terkait karyawan ini juga akan dihapus.
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
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
            >
              Hapus Karyawan
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
