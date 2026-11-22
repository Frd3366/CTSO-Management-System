import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import {
  parseLocalDate,
  formatLocalDateIso,
  getTodayIso,
  formatDateFullIndo,
  formatDateShortIndo,
  formatDateLongIndo,
  formatMonthYearIndo,
  MONTH_NAMES_INDO,
  DAY_NAMES_SHORT_INDO
} from '../../utils/dateUtils';
import { getStoredHolidays } from '../../utils/holidayUtils';

export interface ModernDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateIso: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
  showQuickPresets?: boolean;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
}

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Pilih tanggal...',
  className = '',
  disabled = false,
  align = 'left',
  showQuickPresets = true,
  required = false,
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active viewing month in calendar
  const [viewDate, setViewDate] = useState<Date>(() => {
    return value ? parseLocalDate(value) : new Date();
  });

  const holidays = useMemo(() => getStoredHolidays(), []);
  const todayIso = useMemo(() => getTodayIso(), []);

  // Sync viewDate when value changes from outside
  useEffect(() => {
    if (value) {
      setViewDate(parseLocalDate(value));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(todayIso);
    setViewDate(parseLocalDate(todayIso));
    setIsOpen(false);
  };

  const handleSelectQuick = (daysOffset: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const iso = formatLocalDateIso(d);
    onChange(iso);
    setViewDate(d);
    setIsOpen(false);
  };

  const handleSelectDay = (dayIso: string) => {
    if (minDate && dayIso < minDate) return;
    if (maxDate && dayIso > maxDate) return;
    onChange(dayIso);
    setIsOpen(false);
  };

  // Generate 42-cell calendar grid for viewMonth
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      const iso = formatLocalDateIso(d);
      days.push({
        iso,
        dayNum,
        isCurrentMonth: false,
        isSunday: d.getDay() === 0,
        isHoliday: Boolean(holidays[iso]),
        holidayName: holidays[iso] || null,
        isToday: iso === todayIso,
        isSelected: iso === value
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      const iso = formatLocalDateIso(d);
      days.push({
        iso,
        dayNum: i,
        isCurrentMonth: true,
        isSunday: d.getDay() === 0,
        isHoliday: Boolean(holidays[iso]),
        holidayName: holidays[iso] || null,
        isToday: iso === todayIso,
        isSelected: iso === value
      });
    }

    // Next month padding days to complete 42 cells (6 rows x 7 cols)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      const iso = formatLocalDateIso(d);
      days.push({
        iso,
        dayNum: i,
        isCurrentMonth: false,
        isSunday: d.getDay() === 0,
        isHoliday: Boolean(holidays[iso]),
        holidayName: holidays[iso] || null,
        isToday: iso === todayIso,
        isSelected: iso === value
      });
    }

    return days;
  }, [viewYear, viewMonth, holidays, todayIso, value]);

  const selectedHolidayName = value ? holidays[value] : null;

  return (
    <div className={`relative inline-block w-full text-left ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-[#202020] dark:text-gray-200 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          {required && <span className="text-rose-500 text-[10px]">*Wajib</span>}
        </label>
      )}

      {/* Modern Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all text-xs shadow-2xs ${
          isOpen
            ? 'border-[#FFD416] ring-2 ring-[#FFE160]/40 bg-white dark:bg-[#202020]'
            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#202020] hover:border-[#FFD416] dark:hover:border-[#FFD416]/70'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-white/5' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#FFE160]/20 text-[#202020] dark:text-[#FFD416] flex items-center justify-center shrink-0">
            <CalendarIcon className="w-3.5 h-3.5 text-[#202020] dark:text-[#FFD416]" />
          </div>
          <div className="truncate text-left">
            {value ? (
              <span className="font-bold text-[#202020] dark:text-white">
                {formatDateShortIndo(value)}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-gray-500 font-normal">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {value && value === todayIso && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#FFD416]/20 text-[#202020] dark:text-[#FFD416]">
              Hari Ini
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#202020] dark:text-[#FFD416]' : 'text-slate-400'
            }`}
          />
        </div>
      </button>

      {/* Floating Popover Calendar Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 w-72 sm:w-80 bg-white dark:bg-[#202020] rounded-2xl border border-slate-200/90 dark:border-white/15 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18)] p-3.5 animate-fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="dialog"
          aria-label="Pilih Tanggal"
        >
          {/* Quick Preset Chips */}
          {showQuickPresets && (
            <div className="flex items-center gap-1 pb-3 mb-2.5 border-b border-slate-100 dark:border-white/10 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F4F4F4] dark:bg-white/10 hover:bg-[#FFE160] hover:text-[#202020] text-slate-700 dark:text-gray-200 transition-colors shrink-0"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={(e) => handleSelectQuick(1, e)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F4F4F4] dark:bg-white/10 hover:bg-[#FFE160] hover:text-[#202020] text-slate-700 dark:text-gray-200 transition-colors shrink-0"
              >
                Besok
              </button>
              <button
                type="button"
                onClick={(e) => handleSelectQuick(7, e)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F4F4F4] dark:bg-white/10 hover:bg-[#FFE160] hover:text-[#202020] text-slate-700 dark:text-gray-200 transition-colors shrink-0"
              >
                +7 Hari
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const d = new Date(viewYear, viewMonth, 1);
                  handleSelectDay(formatLocalDateIso(d));
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F4F4F4] dark:bg-white/10 hover:bg-[#FFE160] hover:text-[#202020] text-slate-700 dark:text-gray-200 transition-colors shrink-0"
              >
                Awal Bln
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
                  const d = new Date(viewYear, viewMonth, lastDay);
                  handleSelectDay(formatLocalDateIso(d));
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F4F4F4] dark:bg-white/10 hover:bg-[#FFE160] hover:text-[#202020] text-slate-700 dark:text-gray-200 transition-colors shrink-0"
              >
                Akhir Bln
              </button>
            </div>
          )}

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#202020] dark:text-white capitalize">
                {formatMonthYearIndo(viewDate)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES_SHORT_INDO.map((dayName, idx) => (
              <span
                key={dayName}
                className={`text-[10px] font-extrabold uppercase py-1 ${
                  idx === 0 ? 'text-rose-500' : 'text-slate-400 dark:text-gray-500'
                }`}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Month Days Grid (7 columns x 6 rows = 42 cells) */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d) => {
              const isDisabled =
                (minDate && d.iso < minDate) || (maxDate && d.iso > maxDate);

              return (
                <button
                  key={d.iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleSelectDay(d.iso)}
                  title={
                    d.holidayName
                      ? `${d.iso}: ${d.holidayName}`
                      : d.isSunday
                      ? `${d.iso}: Hari Minggu`
                      : d.iso
                  }
                  className={`relative flex flex-col items-center justify-center h-8 sm:h-8.5 rounded-xl text-xs font-semibold transition-all ${
                    d.isSelected
                      ? 'bg-[#FFD416] text-[#202020] font-black shadow-xs ring-2 ring-[#FFD416]/50 z-10'
                      : d.isToday
                      ? 'bg-[#FFE160]/20 text-[#202020] dark:text-[#FFD416] font-bold ring-1 ring-[#FFD416]'
                      : d.isCurrentMonth
                      ? d.isSunday
                        ? 'text-rose-600 dark:text-rose-400 hover:bg-[#FFE160]/30 hover:text-[#202020]'
                        : 'text-slate-800 dark:text-gray-200 hover:bg-[#F4F4F4] dark:hover:bg-white/10'
                      : 'text-slate-300 dark:text-gray-600 hover:bg-[#F4F4F4]/50 dark:hover:bg-white/5'
                  } ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span>{d.dayNum}</span>

                  {/* Holiday Indicator Dot */}
                  {d.isHoliday && (
                    <span
                      className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                        d.isSelected ? 'bg-[#202020]' : 'bg-rose-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Card Info */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px]">
            <div className="truncate flex-1 min-w-0 pr-2">
              {value ? (
                <div>
                  <div className="font-bold text-[#202020] dark:text-white truncate">
                    {formatDateLongIndo(value)}
                  </div>
                  {selectedHolidayName && (
                    <div className="text-[10px] text-rose-500 font-semibold truncate flex items-center gap-1">
                      <span>•</span>
                      <span>{selectedHolidayName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 italic">Belum ada tanggal dipilih</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-[#F4F4F4] dark:bg-white/10 hover:bg-[#FFD416] hover:text-[#202020] text-slate-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
