import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, Check, ChevronUp } from 'lucide-react';

export interface ModernTimePickerProps {
  value: string; // HH:mm format, e.g. "07:00"
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  align?: 'left' | 'right';
}

const SHIFT_TIME_PRESETS = [
  { label: 'Pagi 1 (07:00)', value: '07:00' },
  { label: 'Pagi 2 (08:00)', value: '08:00' },
  { label: 'Sore 1 (15:00)', value: '15:00' },
  { label: 'Sore 2 (16:00)', value: '16:00' },
  { label: 'Malam (23:00)', value: '23:00' },
  { label: 'Midnight (00:00)', value: '00:00' },
];

export const ModernTimePicker: React.FC<ModernTimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Pilih jam...',
  className = '',
  disabled = false,
  required = false,
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse hours and minutes
  const [hours, minutes] = useMemo(() => {
    if (!value || !value.includes(':')) return ['07', '00'];
    const parts = value.split(':');
    return [parts[0].padStart(2, '0'), parts[1].padStart(2, '0')];
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

  const handleSelectHour = (h: string) => {
    onChange(`${h.padStart(2, '0')}:${minutes}`);
  };

  const handleSelectMinute = (m: string) => {
    onChange(`${hours}:${m.padStart(2, '0')}`);
  };

  const handleAdjustHour = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let currentH = parseInt(hours, 10);
    currentH = (currentH + delta + 24) % 24;
    const hStr = String(currentH).padStart(2, '0');
    onChange(`${hStr}:${minutes}`);
  };

  const handleAdjustMinute = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let currentM = parseInt(minutes, 10);
    currentM = (currentM + delta + 60) % 60;
    const mStr = String(currentM).padStart(2, '0');
    onChange(`${hours}:${mStr}`);
  };

  const allHours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const allMinutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

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
            <Clock className="w-3.5 h-3.5 text-[#202020] dark:text-[#FFD416]" />
          </div>
          <div className="truncate text-left font-mono">
            {value ? (
              <span className="font-extrabold text-xs text-[#202020] dark:text-white tracking-wider">
                {value} <span className="text-[10px] font-sans font-semibold text-slate-400">WITA</span>
              </span>
            ) : (
              <span className="text-slate-400 dark:text-gray-500 font-sans font-normal">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#202020] dark:text-[#FFD416]' : ''
          }`}
        />
      </button>

      {/* Floating Popover Time Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 w-72 sm:w-80 bg-white dark:bg-[#202020] rounded-2xl border border-slate-200/90 dark:border-white/15 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18)] p-3.5 animate-fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="dialog"
          aria-label="Pilih Jam Operasional"
        >
          {/* Shift Quick Presets Chips */}
          <div className="mb-3 pb-2.5 border-b border-slate-100 dark:border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-1.5">
              Preset Shift Operasional
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SHIFT_TIME_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    onChange(preset.value);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-left transition-all ${
                    value === preset.value
                      ? 'bg-[#FFD416] text-[#202020] shadow-2xs font-black ring-1 ring-[#FFD416]'
                      : 'bg-[#F4F4F4] dark:bg-white/5 hover:bg-[#FFE160] hover:text-[#202020] text-slate-700 dark:text-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Digital Hour & Minute Selector */}
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Hours Column */}
            <div>
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[11px] font-bold text-[#202020] dark:text-white uppercase tracking-wider">
                  Jam
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleAdjustHour(-1, e)}
                    className="p-0.5 rounded hover:bg-[#F4F4F4] dark:hover:bg-white/10 text-slate-500 dark:text-gray-300"
                    title="-1 Jam"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleAdjustHour(1, e)}
                    className="p-0.5 rounded hover:bg-[#F4F4F4] dark:hover:bg-white/10 text-slate-500 dark:text-gray-300"
                    title="+1 Jam"
                  >
                    +1
                  </button>
                </div>
              </div>

              <div className="h-44 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-white/10 p-1 space-y-1 bg-[#F4F4F4]/50 dark:bg-black/20 scrollbar-thin">
                {allHours.map((h) => {
                  const isSelected = h === hours;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-[#FFD416] text-[#202020] shadow-2xs font-black'
                          : 'hover:bg-[#FFE160]/40 text-slate-700 dark:text-gray-300'
                      }`}
                    >
                      {h}:00
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[11px] font-bold text-[#202020] dark:text-white uppercase tracking-wider">
                  Menit
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleAdjustMinute(-15, e)}
                    className="p-0.5 rounded hover:bg-[#F4F4F4] dark:hover:bg-white/10 text-slate-500 dark:text-gray-300"
                    title="-15 Menit"
                  >
                    -15
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleAdjustMinute(15, e)}
                    className="p-0.5 rounded hover:bg-[#F4F4F4] dark:hover:bg-white/10 text-slate-500 dark:text-gray-300"
                    title="+15 Menit"
                  >
                    +15
                  </button>
                </div>
              </div>

              <div className="h-44 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-white/10 p-1 space-y-1 bg-[#F4F4F4]/50 dark:bg-black/20 scrollbar-thin">
                {allMinutes.map((m) => {
                  const isSelected = m === minutes;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-[#FFD416] text-[#202020] shadow-2xs font-black'
                          : 'hover:bg-[#FFE160]/40 text-slate-700 dark:text-gray-300'
                      }`}
                    >
                      :{m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Preview & Confirm */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
            <div className="font-mono text-xs">
              <span className="text-slate-400 text-[10px]">Pilihan: </span>
              <strong className="text-sm font-black text-[#202020] dark:text-white">
                {hours}:{minutes}
              </strong>{' '}
              <span className="text-[10px] text-slate-400 font-bold">WITA</span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-[#FFD416] hover:bg-[#FFE160] text-[#202020] text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
