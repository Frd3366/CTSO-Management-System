import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GoogleSheetsBackupModal } from '../components/common/GoogleSheetsBackupModal';
import { getGoogleSheetsConfig, GoogleSheetsBackupConfig } from '../utils/googleSheetsBackup';
import { ModernDatePicker } from '../components/common/ModernDatePicker';
import {
  FileText,
  Download,
  Calendar,
  Layers,
  Users,
  ArrowLeftRight,
  CalendarOff,
  Printer,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { schedules, employees, requests, leaves, shifts, jobdesks, currentUser } = useAuth();
  const { showToast } = useToast();

  const canManage =
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'SPV' ||
    (currentUser?.role as string) === 'Administrator';

  const getTodayIso = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const [selectedReportType, setSelectedReportType] = useState<string>('daily_schedule');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIso());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [startDate, setStartDate] = useState<string>('2026-11-01');
  const [endDate, setEndDate] = useState<string>('2026-11-30');
  const [isGSheetsModalOpen, setIsGSheetsModalOpen] = useState(false);
  const [gsheetsConfig, setGsheetsConfig] = useState<GoogleSheetsBackupConfig>(getGoogleSheetsConfig);

  useEffect(() => {
    const refresh = () => setGsheetsConfig(getGoogleSheetsConfig());
    window.addEventListener('cms_gsheets_config_updated', refresh);
    return () => window.removeEventListener('cms_gsheets_config_updated', refresh);
  }, []);

  // PRD 12.3: Export formats
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `CTSO_Report_${selectedReportType}_${selectedDate}.csv`;

    switch (selectedReportType) {
      case 'daily_schedule':
      case 'weekly_schedule':
      case 'monthly_schedule':
        headers = ['Tanggal', 'Employee ID', 'Nama Karyawan', 'Shift', 'Jobdesk', 'Lokasi Kerja', 'Status'];
        rows = schedules.map((s) => [
          s.date,
          s.employeeCode,
          `"${s.employeeName}"`,
          s.shiftCode,
          s.jobdeskCode || '-',
          s.location || '-',
          s.publicationStatus
        ]);
        break;

      case 'jobdesk_matrix':
        headers = ['Tanggal', 'Kode Jobdesk', 'Employee ID', 'Nama Karyawan', 'Shift', 'Lokasi'];
        rows = schedules
          .filter((s) => s.jobdeskCode)
          .map((s) => [s.date, s.jobdeskCode || '', s.employeeCode, `"${s.employeeName}"`, s.shiftCode, s.location || '']);
        break;

      case 'individual_roster':
        headers = ['Tanggal', 'Shift', 'Jobdesk', 'Lokasi', 'Status'];
        rows = schedules
          .filter((s) => s.employeeId === selectedEmployeeId && s.date >= startDate && s.date <= endDate)
          .map((s) => [s.date, s.shiftCode, s.jobdeskCode || '-', s.location || '-', s.publicationStatus]);
        break;

      case 'leave_report':
        headers = ['Karyawan', 'Jenis', 'Mulai', 'Selesai', 'Alasan', 'Status', 'Reviewer'];
        rows = leaves.map((l) => [
          `"${l.employeeName}"`,
          l.type,
          l.startDate,
          l.endDate,
          `"${l.reason.replace(/"/g, '""')}"`,
          l.status,
          l.reviewedBy || '-'
        ]);
        break;

      case 'request_report':
        headers = ['ID', 'Jenis', 'Pemohon', 'Pengganti', 'Tanggal', 'Status', 'Alasan'];
        rows = requests.map((r) => [
          r.id,
          r.requestType,
          `"${r.requesterName}"`,
          r.replacementName ? `"${r.replacementName}"` : '-',
          r.workDate,
          r.status,
          `"${r.reason.replace(/"/g, '""')}"`
        ]);
        break;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Laporan ${selectedReportType} berhasil diekspor.`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#18181A] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#111111] dark:text-[#F2F4F7] tracking-tight">
              Reports
            </h1>
          </div>
          <p className="text-xs text-[#647084] dark:text-gray-400 mt-1">
            Export operational rosters, attendance reports, individual employee schedules, and audit records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={() => setIsGSheetsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Konfigurasi Auto Backup Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
              <span>Auto Backup Sheets</span>
              {gsheetsConfig.enabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD416] animate-pulse" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
            <span>Cetak / PDF</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-1.5 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV (Excel)</span>
            </button>
          )}
        </div>
      </div>

      {/* Report Type Selector Grid (Clean cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {[
          { id: 'daily_schedule', title: 'Daily Schedule Report', desc: 'Roster harian seluruh karyawan per tanggal', icon: Calendar },
          { id: 'weekly_schedule', title: 'Weekly Schedule Matrix', desc: 'Roster mingguan dengan kode shift & lokasi', icon: Calendar },
          { id: 'jobdesk_matrix', title: 'Jobdesk Matrix (CT1/CT2/CT4)', desc: 'Distribusi personel per kode kerja', icon: Layers },
          { id: 'individual_roster', title: 'Individual Employee Roster', desc: 'Histori penugasan satu karyawan spesifik', icon: Users },
          { id: 'request_report', title: 'Roster Change Request Report', desc: 'Rekapitulasi permohonan tukar shift', icon: ArrowLeftRight },
          { id: 'leave_report', title: 'Leave & Cuti Report', desc: 'Rekap cuti, sakit, & ijin', icon: CalendarOff },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = selectedReportType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedReportType(item.id)}
              className={`text-left p-4 rounded-2xl border bg-white dark:bg-[#18181A] text-slate-900 dark:text-white transition-all flex flex-col justify-between ${
                isSelected
                  ? 'ring-2 ring-[#F9C900] shadow-md border-[#F9C900]'
                  : 'border-slate-200/90 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
              }`}
            >
              <div>
                <div className={`p-2 rounded-xl w-fit mb-2 shadow-2xs ${isSelected ? 'bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111]' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white'}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <h3 className="text-xs font-black tracking-tight">{item.title}</h3>
                <p className="text-[11px] text-slate-600 dark:text-gray-300 mt-1 leading-relaxed">{item.desc}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between w-full text-[10px] text-slate-500 dark:text-gray-400">
                <span>Format: CSV / XLSX</span>
                {isSelected && <span className="font-bold text-[#111111] dark:text-[#F9C900]">Terpilih &bull; Ready</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Parameter Form */}
      <div className="bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Parameter Filter Laporan
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedReportType === 'individual_roster' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Pilih Karyawan</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-[#F9C900]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.employeeNo})</option>
                ))}
              </select>
            </div>
          ) : (
            <ModernDatePicker
              label="Tanggal Acuan"
              value={selectedDate}
              onChange={setSelectedDate}
              showQuickChips={true}
            />
          )}

          <ModernDatePicker
            label="Dari Tanggal"
            value={startDate}
            onChange={setStartDate}
            showQuickChips={false}
          />

          <ModernDatePicker
            label="Sampai Tanggal"
            value={endDate}
            onChange={setEndDate}
            showQuickChips={false}
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] border border-[#E5B800] text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download Laporan</span>
          </button>
        </div>
      </div>

      {/* Google Sheets Auto Backup Modal */}
      <GoogleSheetsBackupModal
        isOpen={isGSheetsModalOpen}
        onClose={() => setIsGSheetsModalOpen(false)}
      />
    </div>
  );
};
