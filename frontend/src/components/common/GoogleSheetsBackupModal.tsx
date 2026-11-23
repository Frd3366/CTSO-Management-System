import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { API_BASE } from '../../api/client';
import {
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  executeGoogleSheetsBackup,
  GoogleSheetsBackupConfig,
  GOOGLE_APPS_SCRIPT_TEMPLATE
} from '../../utils/googleSheetsBackup';
import {
  FileSpreadsheet,
  X,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Link2,
  Code2,
  CheckCircle2
} from 'lucide-react';

interface GoogleSheetsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsBackupModal: React.FC<GoogleSheetsBackupModalProps> = ({ isOpen, onClose }) => {
  const { schedules, employees, shifts, jobdesks, requests, leaves } = useAuth();
  const { showToast } = useToast();

  const [config, setConfig] = useState<GoogleSheetsBackupConfig>(getGoogleSheetsConfig);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setConfig(getGoogleSheetsConfig());
    fetch(`${API_BASE}/gsheets/config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && (data.sheetUrl || data.scriptUrl)) {
          const merged = { ...getGoogleSheetsConfig(), ...data };
          setConfig(merged);
          saveGoogleSheetsConfig(merged);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveGoogleSheetsConfig(config);
    try {
      await fetch(`${API_BASE}/gsheets/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch {}
    showToast(
      config.enabled
        ? `Auto Backup Google Sheets aktif (Interval: setiap ${config.intervalMinutes} menit).`
        : 'Pengaturan Auto Backup Google Sheets disimpan.',
      'success'
    );
    onClose();
  };

  const handleBackupNow = async () => {
    if (!config.sheetUrl.trim()) {
      showToast('Masukkan Link Google Sheets terlebih dahulu.', 'warning');
      return;
    }
    setIsSyncing(true);
    try {
      saveGoogleSheetsConfig(config);
      const res = await executeGoogleSheetsBackup(
        { schedules, employees, shifts, jobdesks, requests, leaves },
        config
      );
      setConfig(getGoogleSheetsConfig());
      if (res.success) {
        showToast(`${res.message} (${res.timestamp})`, 'success');
      } else {
        showToast(res.message, 'warning');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    showToast('Kode Google Apps Script berhasil disalin!', 'info');
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 !mt-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Auto Backup Google Sheets"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#18181A] rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#111111] dark:text-white">
                Auto Backup Google Sheets
              </h3>
              <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5">
                Sinkronisasi & backup otomatis jadwal, karyawan, shift, dan cuti ke link Google Sheets pilihan Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-2 text-slate-500 hover:text-[#111111] dark:text-gray-300 dark:hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Status Auto-Backup Terjadwal
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                {config.enabled
                  ? `Active: Otomatis mengupdate Google Sheets setiap ${
                      config.intervalMinutes === 60
                        ? '1 Jam'
                        : `${config.intervalMinutes} Menit`
                    }`
                  : 'Inactive: Aktifkan untuk backup otomatis berkala'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.enabled}
              aria-label="Status Auto-Backup Terjadwal"
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                config.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-white/20'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  config.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="gsheets-url-input" className="block text-xs font-bold text-[#111111] dark:text-white">
                Custom Link Google Sheets (Bisa Diganti Kapan Saja)
              </label>
              {config.sheetUrl.includes('docs.google.com/spreadsheets') && (
                <a
                  href={config.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Buka Sheet</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </div>
            <div className="relative">
              <Link2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                id="gsheets-url-input"
                type="url"
                value={config.sheetUrl}
                onChange={(e) => setConfig({ ...config, sheetUrl: e.target.value })}
                placeholder="https://docs.google.com/spreadsheets/d/1abc123.../edit"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-[#111111] dark:text-white font-mono"
              />
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 block">
              Tempel link Google Spreadsheet tujuan. Anda bebas mengganti link ini jika ingin pindah ke file Sheet baru (misal per bulan).
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="gsheets-interval-select" className="block text-xs font-bold text-[#111111] dark:text-white mb-1">
                Interval Auto Backup / Update
              </label>
              <select
                id="gsheets-interval-select"
                value={config.intervalMinutes}
                onChange={(e) => setConfig({ ...config, intervalMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181A] text-xs font-semibold text-[#111111] dark:text-white"
              >
                <option value={60}>Setiap 1 Jam (Default)</option>
                <option value={15}>Setiap 15 Menit</option>
                <option value={30}>Setiap 30 Menit</option>
                <option value={180}>Setiap 3 Jam</option>
                <option value={360}>Setiap 6 Jam</option>
                <option value={1440}>Setiap 24 Jam (Harian)</option>
              </select>
            </div>

            <div>
              <span className="block text-xs font-bold text-[#111111] dark:text-white mb-1">
                Status Backup Terakhir
              </span>
              <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-[11px] truncate">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="truncate">{config.lastBackupAt || 'Belum pernah'}</span>
                </span>
                {config.lastStatus === 'success' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="gsheets-script-input" className="block text-xs font-bold text-[#111111] dark:text-white">
                URL Web App Google Apps Script (Bridge Penulis Sheet)
              </label>
              <button
                type="button"
                onClick={() => setShowScriptGuide(!showScriptGuide)}
                className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Code2 className="w-3 h-3" aria-hidden="true" />
                <span>{showScriptGuide ? 'Tutup Panduan Script' : 'Lihat Kode Apps Script'}</span>
              </button>
            </div>
            <input
              id="gsheets-script-input"
              type="url"
              value={config.scriptUrl}
              onChange={(e) => setConfig({ ...config, scriptUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs text-[#111111] dark:text-white font-mono"
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 block">
              Cukup pasang 1 kali di Google Apps Script, selanjutnya Anda bisa mengganti-ganti Link Google Sheets di atas secara bebas.
            </span>
          </div>

          {showScriptGuide && (
            <div className="p-3 rounded-xl bg-slate-900 text-slate-100 space-y-2 text-[11px] border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">
                  Cara Pasang (Hanya 1 Menit):
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1"
                >
                  {copiedScript ? <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                  <span>{copiedScript ? 'Tersalin!' : 'Copy Script'}</span>
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-300 text-[10px]">
                <li>Buka Google Sheet Anda &rarr; menu <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Hapus kode bawaan, tempel kode di bawah, lalu klik <strong>Deploy &gt; New deployment</strong>.</li>
                <li>Pilih tipe <strong>Web app</strong>, <em>Who has access</em> pilih <strong>Anyone</strong>, lalu klik Deploy.</li>
                <li>Salin <strong>Web app URL</strong> yang muncul ke kolom di atas.</li>
              </ol>
              <pre className="p-2 rounded-lg bg-black/50 text-[10px] font-mono overflow-x-auto max-h-36 text-emerald-300">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10 gap-2">
            <button
              type="button"
              onClick={handleBackupNow}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isSyncing ? 'Membackup...' : 'Backup Sekarang'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-[#111111] text-xs font-bold border border-[#E5B800] shadow-xs"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
