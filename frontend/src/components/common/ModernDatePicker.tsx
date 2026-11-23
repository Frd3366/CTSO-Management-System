import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import {
  parseLocalDate,
  formatLocalDateIso,
  getTodayIso,
  formatDateShortIndo,
  formatDateLongIndo,
  formatMonthYearIndo,
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
  showQuickChips?: boolean;
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
  required = false,
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 312
  });

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

  // Compute smart viewport-safe fixed position for portal popover
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const popoverWidth = Math.min(vw < 640 ? 296 : 316, vw - margin * 2);
    const popoverHeight = popoverRef.current?.offsetHeight || 355;

    // Horizontal alignment with viewport clamping
    let left = align === 'right' ? rect.right - popoverWidth : rect.left;
    if (left + popoverWidth > vw - margin) {
      left = vw - popoverWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // Vertical placement: prefer below, flip above if clipped at bottom
    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let top: number;
    if (spaceBelow >= popoverHeight || spaceBelow >= spaceAbove) {
      top = Math.min(rect.bottom + 8, vh - popoverHeight - margin);
    } else {
      top = Math.max(margin, rect.top - popoverHeight - 8);
    }
    if (top < margin) top = margin;

    setCoords({ top, left, width: popoverWidth });
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    // Re-measure once rendered with actual popover height
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Click outside to close (handles both trigger and portaled popover)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
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
    if (minDate && todayIso < minDate) {
      setViewDate(parseLocalDate(todayIso));
      return;
    }
    if (maxDate && todayIso > maxDate) {
      setViewDate(parseLocalDate(todayIso));
      return;
    }
    onChange(todayIso);
    setViewDate(parseLocalDate(todayIso));
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
    <div className={`relative inline-block w-full text-left ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-[#202020] dark:text-gray-200 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          {required && <span className="text-rose-500 text-[10px]">*Wajib</span>}
        </label>
      )}

      {/* Modern Trigger Button */}
      <button
        ref={triggerRef}
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
              Today
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#202020] dark:text-[#FFD416]' : 'text-slate-400'
            }`}
          />
        </div>
      </button>

      {/* Viewport-Safe Portaled Popover Calendar Dropdown */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999
            }}
            className="bg-white dark:bg-[#202020] rounded-2xl border border-slate-200/90 dark:border-white/15 shadow-[0_16px_44px_-6px_rgba(0,0,0,0.22)] p-3.5 animate-fade-in"
            role="dialog"
            aria-label="Pilih Tanggal"
          >
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
                onClick={handleSelectToday}
                className="px-2.5 py-1 rounded-lg bg-[#F4F4F4] dark:bg-white/10 hover:bg-[#FFD416] hover:text-[#202020] text-slate-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
