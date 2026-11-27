import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PixelOfficeStage, OfficeAvatarData, OfficeTVStats } from '../components/office3d/PixelOfficeStage';
import { EMPLOYEE_PROFILES, STUDIO_PROFILES } from '../components/office3d/employee.js';
import { ShiftMasterItem } from '../types';
import cmsLogo from '../assets/cms-logo.jpeg';

function getWitaClockParts(nowMs: number) {
  const wita = new Date(nowMs + 8 * 60 * 60 * 1000);
  const yyyy = wita.getUTCFullYear();
  const mm = String(wita.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(wita.getUTCDate()).padStart(2, '0');
  const hh = String(wita.getUTCHours()).padStart(2, '0');
  const min = String(wita.getUTCMinutes()).padStart(2, '0');
  const sec = String(wita.getUTCSeconds()).padStart(2, '0');

  const yesterdayDate = new Date(nowMs + 8 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  const yYyyy = yesterdayDate.getUTCFullYear();
  const yMm = String(yesterdayDate.getUTCMonth() + 1).padStart(2, '0');
  const yDd = String(yesterdayDate.getUTCDate()).padStart(2, '0');

  const displayDate = new Date(yyyy, Number(mm) - 1, Number(dd)).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return {
    todayIso: `${yyyy}-${mm}-${dd}`,
    yesterdayIso: `${yYyyy}-${yMm}-${yDd}`,
    dateLabel: displayDate,
    timeLabel: `${hh}:${min}:${sec} WITA`,
    nowMinutes: wita.getUTCHours() * 60 + wita.getUTCMinutes(),
  };
}

function parseMinutes(hhmm?: string): number | null {
  if (!hhmm || !hhmm.includes(':')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Checks whether a shift assignment is actively on duty at the exact real WITA clock time.
 */
function isAssignmentActiveNow(
  assignmentDate: string,
  shift: ShiftMasterItem | undefined,
  todayIso: string,
  yesterdayIso: string,
  nowMinutes: number
): boolean {
  if (!shift || shift.isOff) return false;
  const startMin = parseMinutes(shift.startTime);
  const endMin = parseMinutes(shift.endTime);
  if (startMin === null || endMin === null) {
    return assignmentDate === todayIso;
  }

  const isOvernight = shift.endDayOffset > 0 || endMin <= startMin;
  if (!isOvernight) {
    return assignmentDate === todayIso && nowMinutes >= startMin && nowMinutes < endMin;
  }

  // Overnight shift (e.g., 23:00 - 07:00): active on start day after startMin, or next day before endMin
  if (assignmentDate === todayIso && nowMinutes >= startMin) return true;
  if (assignmentDate === yesterdayIso && nowMinutes < endMin) return true;
  return false;
}

export const Landing: React.FC = () => {
  const { isAuthenticated, schedules, employees, shifts, jobdesks } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tick real-time WITA clock every second
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const wita = useMemo(() => getWitaClockParts(nowMs), [nowMs]);

  const entryPath = isAuthenticated ? '/dashboard' : '/login';
  const entryLabel = isAuthenticated ? 'Dashboard' : 'Masuk';

  // Integrate avatars directly with CMS schedules matching the REAL current WITA hour!
  const { mainRoster, studioRoster, tvStats } = useMemo(() => {
    const shiftByCode = new Map(shifts.map((s) => [s.code.toUpperCase(), s]));
    const jobdeskColorMap = new Map(jobdesks.map((j) => [j.code, j.color]));
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // 1. Exact real-time on-duty assignments at current WITA hour
    const activeNowAssignments = schedules.filter((a) => {
      if (!a.shiftCode || a.shiftCode.toUpperCase() === 'OFF') return false;
      const shift = shiftByCode.get(a.shiftCode.toUpperCase());
      return isAssignmentActiveNow(a.date, shift, wita.todayIso, wita.yesterdayIso, wita.nowMinutes);
    });

    // 2. Fallback to all today's non-OFF assignments if no shift matches current exact hour
    const todayAssignments =
      activeNowAssignments.length > 0
        ? activeNowAssignments
        : schedules.filter((a) => {
            if (a.date !== wita.todayIso) return false;
            if (!a.shiftCode || a.shiftCode.toUpperCase() === 'OFF') return false;
            const shift = shiftByCode.get(a.shiftCode.toUpperCase());
            return !shift?.isOff;
          });

    let mainList: OfficeAvatarData[] = [];
    let studioList: OfficeAvatarData[] = [];
    let modeLabel = 'LIVE SCHEDULE REAL-TIME';

    if (todayAssignments.length > 0) {
      modeLabel =
        activeNowAssignments.length > 0
          ? `SHIFT AKTIF SEKARANG (${wita.timeLabel.slice(0, 5)} WITA)`
          : 'JADWAL SHIFT HARI INI';

      const badung = todayAssignments.filter(
        (a) => (a.location || employeeMap.get(a.employeeId)?.defaultLocation) !== 'Denpasar'
      );
      const denpasar = todayAssignments.filter(
        (a) => (a.location || employeeMap.get(a.employeeId)?.defaultLocation) === 'Denpasar'
      );

      mainList = badung.slice(0, 11).map((a) => {
        const emp = employeeMap.get(a.employeeId);
        const jdCode = a.jobdeskCode || emp?.defaultJobdesk || 'OPS';
        const fullName = a.employeeName || emp?.name || 'Staff CTSO';
        const nickname = emp?.nickname?.trim() || undefined;
        const shiftColor = shiftByCode.get((a.shiftCode || '').toUpperCase())?.color || '#FFD416';
        return {
          id: a.id,
          name: nickname || fullName,
          nickname,
          fullName,
          role: emp?.level || 'Operations',
          shiftCode: a.shiftCode,
          shiftColor,
          jobdeskCode: jdCode,
          jobdeskColor: jobdeskColorMap.get(jdCode),
          location: 'Badung',
          isLive: true,
        };
      });

      studioList = denpasar.slice(0, 4).map((a) => {
        const emp = employeeMap.get(a.employeeId);
        const jdCode = a.jobdeskCode || emp?.defaultJobdesk || 'OPS';
        const fullName = a.employeeName || emp?.name || 'Staff CTSO';
        const nickname = emp?.nickname?.trim() || undefined;
        const shiftColor = shiftByCode.get((a.shiftCode || '').toUpperCase())?.color || '#FFD416';
        return {
          id: a.id,
          name: nickname || fullName,
          nickname,
          fullName,
          role: emp?.level || 'Operations',
          shiftCode: a.shiftCode,
          shiftColor,
          jobdeskCode: jdCode,
          jobdeskColor: jobdeskColorMap.get(jdCode),
          location: 'Denpasar',
          isLive: true,
        };
      });
    } else if (employees.length > 0) {
      modeLabel = 'DATA KARYAWAN CMS AKTIF';
      const activeEmps = employees.filter((e) => e.status === 'active');
      const badungEmps = activeEmps.filter((e) => e.defaultLocation !== 'Denpasar').slice(0, 11);
      const denpasarEmps = activeEmps.filter((e) => e.defaultLocation === 'Denpasar').slice(0, 4);

      mainList = badungEmps.map((e) => ({
        id: e.id,
        name: e.nickname?.trim() || e.name,
        nickname: e.nickname?.trim() || undefined,
        fullName: e.name,
        role: e.level,
        shiftCode: 'On-Duty',
        shiftColor: '#22C55E',
        jobdeskCode: e.defaultJobdesk || 'CT1',
        jobdeskColor: jobdeskColorMap.get(e.defaultJobdesk || 'CT1'),
        location: 'Badung',
        isLive: false,
      }));

      studioList = denpasarEmps.map((e) => ({
        id: e.id,
        name: e.nickname?.trim() || e.name,
        nickname: e.nickname?.trim() || undefined,
        fullName: e.name,
        role: e.level,
        shiftCode: 'On-Duty',
        shiftColor: '#22C55E',
        jobdeskCode: e.defaultJobdesk || 'CT2',
        jobdeskColor: jobdeskColorMap.get(e.defaultJobdesk || 'CT2'),
        location: 'Denpasar',
        isLive: false,
      }));
    } else {
      modeLabel = 'SIMULASI OPERASIONAL REAL-TIME';
      const demoShiftColors = ['#2563EB', '#16A34A', '#EA580C', '#7C3AED'];
      mainList = EMPLOYEE_PROFILES.map((p, idx) => ({
        id: `demo-main-${idx}`,
        name: p.name,
        role: p.role,
        shiftCode: 'Shift Aktif',
        shiftColor: demoShiftColors[idx % demoShiftColors.length],
        jobdeskCode: ['CT1', 'CT2', 'CT4'][idx % 3],
        location: 'Badung',
        isLive: false,
      }));
      studioList = STUDIO_PROFILES.map((p, idx) => ({
        id: `demo-studio-${idx}`,
        name: p.name,
        role: p.role,
        shiftCode: 'Shift Aktif',
        shiftColor: demoShiftColors[idx % demoShiftColors.length],
        jobdeskCode: ['CT1', 'CT2', 'CT4'][idx % 3],
        location: 'Denpasar',
        isLive: false,
      }));
    }

    const jdCounts = new Map<string, number>();
    [...mainList, ...studioList].forEach((item) => {
      jdCounts.set(item.jobdeskCode, (jdCounts.get(item.jobdeskCode) || 0) + 1);
    });
    const jobdeskBars = Array.from(jdCounts.entries()).map(([code, count]) => ({
      code,
      count,
      color: jobdeskColorMap.get(code),
    }));

    const stats: OfficeTVStats = {
      dateLabel: `${wita.dateLabel} • ${wita.timeLabel.slice(0, 5)}`,
      totalOnDuty: mainList.length + studioList.length,
      badungCount: mainList.length,
      denpasarCount: studioList.length,
      jobdeskBars,
      tickerText: `CTSO MANAGEMENT SYSTEM   •   ${wita.dateLabel.toUpperCase()}   •   ${wita.timeLabel}   •   BADUNG: ${mainList.length}   •   DENPASAR: ${studioList.length}`,
    };

    return {
      mainRoster: mainList,
      studioRoster: studioList,
      tvStats: stats,
    };
  }, [schedules, employees, shifts, jobdesks, wita]);

  return (
    <div className="min-h-screen bg-[#F4F4F4] dark:bg-[#141414] text-[#202020] dark:text-[#F4F4F4] font-sans antialiased selection:bg-[#FFD416]/40">
      {/* Top CMS Navbar (Logo + Live Date & Clock + Theme Toggle) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800 shadow-topbar">
        <div className="max-w-[1520px] mx-auto px-3.5 sm:px-9 h-14 sm:h-[70px] flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <img
              src={cmsLogo}
              alt="CTSO Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover border border-slate-200 dark:border-neutral-700 shadow-clean shrink-0"
            />
            <div className="min-w-0">
              <span className="block text-xs sm:text-[17px] font-extrabold tracking-tight text-[#202020] dark:text-white leading-tight truncate">
                CTSO MANAGEMENT SYSTEM
              </span>
              <span className="block text-[10px] sm:text-xs font-medium text-[#647084] dark:text-neutral-400 truncate">
                Live Operational Workspace
              </span>
            </div>
          </div>

          {/* Live Hari, Tanggal & Jam WITA + Global Dark/Light Mode Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#F4F4F4] dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] sm:text-[13px] font-semibold text-[#202020] dark:text-neutral-200">
              <Calendar className="hidden sm:block w-4 h-4 text-[#BF9C00] shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{wita.dateLabel}</span>
              <span className="hidden sm:inline text-slate-300 dark:text-neutral-600">•</span>
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BF9C00] shrink-0" aria-hidden="true" />
              <span className="font-mono font-bold tabular-nums">{wita.timeLabel}</span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[#F4F4F4] dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-200 hover:text-[#111111] dark:hover:text-white hover:border-[#FFD416] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFD416]" aria-hidden="true" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1520px] mx-auto px-3.5 sm:px-9 py-4 sm:py-6 pb-8 flex flex-col gap-4 sm:gap-5">
        {/* Hero Header (Left) + Masuk button positioned above top-right of animation frame */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2 max-w-3xl">
            <h1 className="text-[22px] sm:text-[34px] lg:text-[40px] font-black tracking-tight text-[#202020] dark:text-white leading-snug sm:leading-tight">
              Operasional Tim &amp;{' '}
              <span className="underline decoration-[#FFD416] decoration-[3px] sm:decoration-4 underline-offset-4">
                Jadwal Shift CTSO Real-Time
              </span>
            </h1>
            <p className="text-xs sm:text-[15px] text-[#647084] dark:text-neutral-400 leading-relaxed">
              Visualisasi operasional Badung dan Denpasar yang tersinkron otomatis dengan jadwal shift CTSO sesuai jam WITA saat ini.
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto md:self-end">
            <Link
              to={entryPath}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-extrabold text-[#202020] bg-[#FFD416] hover:bg-[#E5BD00] border border-[#E5BD00] shadow-gx transition-colors"
            >
              <span>{entryLabel}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Dual Live 2D Pixel Art Stages: Badung & Denpasar */}
        <main className="flex-1">
          <PixelOfficeStage
            resetCounter={0}
            mainRoster={mainRoster}
            studioRoster={studioRoster}
            selectedJobdesk={null}
            tvStats={tvStats}
          />
        </main>
      </div>
    </div>
  );
};
