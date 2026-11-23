import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Users,
  Clock,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  CalendarOff,
  UserCheck,
  Tag,
  Sparkles,
  Info,
  X,
  TrendingUp,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';
import {
  getShiftBadgeStyle,
  getJobdeskBadgeStyle,
  getAgentPillStyle,
  getContrastTextColor
} from '../utils/codeStyles';
import { getStoredHolidays } from '../utils/holidayUtils';
import {
  parseLocalDate,
  formatLocalDateIso,
  getTodayIso,
  formatDateDMY
} from '../utils/dateUtils';
import { WorkLocation } from '../types';

interface EmployeeComboChartProps {
  data: any[];
  monthName: string;
  onSelectEmployee: (empData: any) => void;
}

const EmployeeComboChart: React.FC<EmployeeComboChartProps> = ({
  data,
  monthName,
  onSelectEmployee
}) => {
  const [sortBy, setSortBy] = useState<'working-desc' | 'holiday-desc' | 'name-asc'>('working-desc');
  const [limit, setLimit] = useState<'all' | '10' | '15' | '20'>('all');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const sortedData = useMemo(() => {
    const list = [...data];
    if (sortBy === 'working-desc') {
      list.sort((a, b) => b.totalWorkingShifts - a.totalWorkingShifts || b.totalWorkOnHolidays - a.totalWorkOnHolidays);
    } else if (sortBy === 'holiday-desc') {
      list.sort((a, b) => b.totalWorkOnHolidays - a.totalWorkOnHolidays || b.totalWorkingShifts - a.totalWorkingShifts);
    } else {
      list.sort((a, b) => (a.employee?.name || '').localeCompare(b.employee?.name || ''));
    }
    if (limit !== 'all') {
      return list.slice(0, parseInt(limit, 10));
    }
    return list;
  }, [data, sortBy, limit]);

  // Statistics
  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        avgWorking: 0,
        maxWorking: 0,
        maxWorkingEmp: '-',
        maxHoliday: 0,
        maxHolidayEmp: '-',
        totalHolidayShifts: 0,
        staffOnHolidays: 0
      };
    }
    const totalWorking = data.reduce((acc, d) => acc + d.totalWorkingShifts, 0);
    const avgWorking = totalWorking / data.length;

    let maxWorking = 0;
    let maxWorkingEmp = '-';
    let maxHoliday = 0;
    let maxHolidayEmp = '-';
    let totalHolidayShifts = 0;
    let staffOnHolidays = 0;

    data.forEach((d) => {
      if (d.totalWorkingShifts > maxWorking) {
        maxWorking = d.totalWorkingShifts;
        maxWorkingEmp = d.employee?.name || '-';
      }
      if (d.totalWorkOnHolidays > maxHoliday) {
        maxHoliday = d.totalWorkOnHolidays;
        maxHolidayEmp = d.employee?.name || '-';
      }
      if (d.totalWorkOnHolidays > 0) {
        staffOnHolidays++;
        totalHolidayShifts += d.totalWorkOnHolidays;
      }
    });

    return {
      avgWorking,
      maxWorking,
      maxWorkingEmp,
      maxHoliday,
      maxHolidayEmp,
      totalHolidayShifts,
      staffOnHolidays
    };
  }, [data]);

  // Dimensions
  const count = sortedData.length;
  const slotWidth = Math.max(56, count > 0 ? Math.min(84, 820 / count) : 60);
  const chartWidth = Math.max(760, count * slotWidth + 90);
  const chartHeight = 310;
  const padLeft = 48;
  const padRight = 48;
  const padTop = 32;
  const padBottom = 78;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  // Maximum scale
  const maxVal = useMemo(() => {
    const highest = Math.max(
      ...sortedData.map((d) => Math.max(d.totalWorkingShifts, d.totalWorkOnHolidays)),
      0
    );
    return Math.max(25, Math.ceil((highest + 2) / 5) * 5);
  }, [sortedData]);

  // Y-axis tick intervals
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = maxVal > 30 ? 10 : 5;
    for (let i = 0; i <= maxVal; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [maxVal]);

  const itemSlotWidth = count > 0 ? innerWidth / count : innerWidth;

  // Points for line & bars
  const chartItems = useMemo(() => {
    return sortedData.map((d, i) => {
      const cx = padLeft + (i + 0.5) * itemSlotWidth;
      const barWidth = Math.min(26, Math.max(14, itemSlotWidth * 0.52));
      const barHeight = Math.max(0, (d.totalWorkingShifts / maxVal) * innerHeight);
      const barX = cx - barWidth / 2;
      const barY = padTop + innerHeight - barHeight;
      const lineY = padTop + innerHeight - Math.max(0, (d.totalWorkOnHolidays / maxVal) * innerHeight);
      return {
        data: d,
        index: i,
        cx,
        barX,
        barY,
        barWidth,
        barHeight,
        lineY
      };
    });
  }, [sortedData, padLeft, itemSlotWidth, maxVal, innerHeight, padTop]);

  // SVG Line path
  const linePathD = useMemo(() => {
    if (chartItems.length === 0) return '';
    return chartItems.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.cx} ${pt.lineY}` : `${acc} L ${pt.cx} ${pt.lineY}`;
    }, '');
  }, [chartItems]);

  // SVG Line Area gradient path
  const areaPathD = useMemo(() => {
    if (chartItems.length === 0) return '';
    const first = chartItems[0];
    const last = chartItems[chartItems.length - 1];
    const bottomY = padTop + innerHeight;
    return `${linePathD} L ${last.cx} ${bottomY} L ${first.cx} ${bottomY} Z`;
  }, [chartItems, linePathD, padTop, innerHeight]);

  // Average line Y coordinate
  const avgY = padTop + innerHeight - (stats.avgWorking / maxVal) * innerHeight;

  const hoveredItem = hoveredIdx !== null ? chartItems[hoveredIdx] : null;

  return (
    <div className="bg-white dark:bg-[#18181A] p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-5">
      {/* Chart Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h2 className="text-sm font-black text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Grafik Garis & Batang: Beban Kerja & Hari Libur Karyawan</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Kombinasi grafik batang (Total Hari Masuk Kerja) dan garis (Hari Kerja Jatuh di Hari Libur & Minggu) per personel periode {monthName}.
          </p>
        </div>

        {/* Legend & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend Items */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-gray-300">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3 rounded-xs bg-indigo-600" />
              <span>Batang: Hari Kerja</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-950" />
              <span>Garis: Libur / Minggu</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400 dark:text-gray-500">
              <span className="w-3 h-0.5 border-b border-dashed border-slate-400" />
              <span>Rerata Tim</span>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Urutkan data grafik"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="working-desc">Hari Kerja Terbanyak</option>
              <option value="holiday-desc">Kerja Libur Terbanyak</option>
              <option value="name-asc">Nama Karyawan (A-Z)</option>
            </select>
          </div>

          {/* Limit Selector */}
          <div className="flex items-center gap-1 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Batasi jumlah personel di grafik"
              value={limit}
              onChange={(e) => setLimit(e.target.value as any)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="all">Semua ({data.length})</option>
              <option value="15">Top 15</option>
              <option value="10">Top 10</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mini Insight Highlights Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
            Masuk Kerja Tertinggi
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">
            {stats.maxWorkingEmp}
          </div>
          <div className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
            {stats.maxWorking} Hari Kerja
          </div>
        </div>

        <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Kerja Libur Tertinggi
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">
            {stats.maxHolidayEmp}
          </div>
          <div className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            {stats.maxHoliday} Shift Libur / Minggu
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">
            Rata-rata Tim
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            {stats.avgWorking.toFixed(1)} <span className="text-[11px] font-normal text-slate-500">hari/orang</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 truncate">
            Baseline shift bulanan
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Personel Masuk Libur
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            {stats.staffOnHolidays} <span className="text-[11px] font-normal text-slate-500">orang</span>
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium truncate">
            Total {stats.totalHolidayShifts} shift di hari libur
          </div>
        </div>
      </div>

      {/* SVG Combo Chart Display */}
      {sortedData.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 italic border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
          Tidak ada data karyawan yang sesuai dengan kriteria filter saat ini.
        </div>
      ) : (
        <div className="relative overflow-x-auto pb-2 select-none">
          {/* Tooltip Float Overlay */}
          {hoveredItem && (
            <div
              className="absolute z-20 pointer-events-none transition-all duration-150 transform -translate-x-1/2"
              style={{
                left: Math.max(140, Math.min(chartWidth - 140, hoveredItem.cx)),
                top: Math.max(10, Math.min(hoveredItem.barY, hoveredItem.lineY) - 10)
              }}
            >
              <div className="bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] p-2.5 rounded-xl shadow-xl border border-slate-700 dark:border-slate-200 text-xs min-w-[210px] animate-fade-in">
                <div className="font-extrabold text-[12px] truncate">
                  {hoveredItem.data.employee.name}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {hoveredItem.data.employee.employeeNo} &bull; {hoveredItem.data.employee.defaultLocation || 'Hub'}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700/60 dark:border-slate-200/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-indigo-300 dark:text-indigo-600 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                      Hari Kerja:
                    </span>
                    <span className="font-mono font-black">{hoveredItem.data.totalWorkingShifts} hari</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-rose-300 dark:text-rose-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Kerja di Libur:
                    </span>
                    <span className="font-mono font-black text-rose-300 dark:text-rose-600">
                      {hoveredItem.data.totalWorkOnHolidays} hari
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>Libur Nasional: {hoveredItem.data.holidayWorkCount} &bull; Minggu: {hoveredItem.data.sundayWorkCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400 dark:text-slate-500">Hari Off:</span>
                    <span className="font-mono">{hoveredItem.data.totalOffShifts} hari</span>
                  </div>
                </div>
                <div className="mt-2 pt-1 border-t border-slate-800 dark:border-slate-100 text-[9px] text-indigo-400 dark:text-indigo-600 text-center font-bold">
                  Klik untuk melihat kalender detail
                </div>
              </div>
            </div>
          )}

          <svg
            width={chartWidth}
            height={chartHeight}
            className="overflow-visible font-sans"
          >
            <defs>
              {/* Bar Gradients */}
              <linearGradient id="barGradNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#3730A3" />
              </linearGradient>
              <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#4338CA" />
              </linearGradient>

              {/* Line Area Gradient */}
              <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((val) => {
              const y = padTop + innerHeight - (val / maxVal) * innerHeight;
              return (
                <g key={val}>
                  <line
                    x1={padLeft}
                    x2={padLeft + innerWidth}
                    y1={y}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                    className="stroke-slate-200 dark:stroke-white/10"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    className="fill-slate-600 dark:fill-gray-300 font-mono font-medium"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Team Average Dashed Line */}
            {stats.avgWorking > 0 && (
              <g>
                <line
                  x1={padLeft}
                  x2={padLeft + innerWidth}
                  y1={avgY}
                  y2={avgY}
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
                <rect
                  x={padLeft + innerWidth - 78}
                  y={avgY - 9}
                  width="74"
                  height="16"
                  rx="4"
                  fill="#F1F5F9"
                  className="fill-slate-100 dark:fill-white/10"
                />
                <text
                  x={padLeft + innerWidth - 41}
                  y={avgY + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  className="fill-slate-600 dark:fill-slate-300 font-mono"
                >
                  Rerata {stats.avgWorking.toFixed(1)}
                </text>
              </g>
            )}

            {/* Column Hover Background Rects */}
            {chartItems.map((item) => {
              const isHovered = hoveredIdx === item.index;
              return (
                <rect
                  key={`hover-bg-${item.index}`}
                  x={item.cx - itemSlotWidth / 2}
                  y={padTop}
                  width={itemSlotWidth}
                  height={innerHeight}
                  fill={isHovered ? 'currentColor' : 'transparent'}
                  className={isHovered ? 'text-indigo-500/5 dark:text-indigo-400/10' : ''}
                />
              );
            })}

            {/* BARS: Total Working Shifts */}
            {chartItems.map((item) => {
              const isHovered = hoveredIdx === item.index;
              return (
                <g key={`bar-group-${item.index}`}>
                  <rect
                    x={item.barX}
                    y={item.barY}
                    width={item.barWidth}
                    height={item.barHeight}
                    rx="4"
                    ry="4"
                    fill={isHovered ? 'url(#barGradHover)' : 'url(#barGradNormal)'}
                    className="transition-all duration-150"
                  />
                  {/* Value on top of bar */}
                  <text
                    x={item.cx}
                    y={Math.max(padTop - 6, item.barY - 5)}
                    textAnchor="middle"
                    fontSize={isHovered ? '11' : '10'}
                    fontWeight="bold"
                    className={
                      isHovered
                        ? 'fill-indigo-600 dark:fill-indigo-400 font-black'
                        : 'fill-slate-700 dark:fill-gray-300 font-mono'
                    }
                  >
                    {item.data.totalWorkingShifts}
                  </text>
                </g>
              );
            })}

            {/* LINE CHART: Area Fill under line */}
            {areaPathD && (
              <path
                d={areaPathD}
                fill="url(#lineAreaGrad)"
                className="transition-all duration-200"
              />
            )}

            {/* LINE CHART: Line Path */}
            {linePathD && (
              <path
                d={linePathD}
                fill="none"
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-200"
              />
            )}

            {/* LINE CHART: Markers / Points */}
            {chartItems.map((item) => {
              const isHovered = hoveredIdx === item.index;
              const hasHolidayWork = item.data.totalWorkOnHolidays > 0;
              return (
                <g key={`point-${item.index}`}>
                  <circle
                    cx={item.cx}
                    cy={item.lineY}
                    r={isHovered ? 6 : hasHolidayWork ? 4.5 : 3.5}
                    fill={hasHolidayWork ? '#EF4444' : '#94A3B8'}
                    stroke="#FFFFFF"
                    strokeWidth={isHovered ? 2.5 : 2}
                    className="transition-all duration-150"
                  />
                  {/* If holiday work > 0 or hovered, print label */}
                  {(hasHolidayWork || isHovered) && (
                    <text
                      x={item.cx}
                      y={item.lineY - 7}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="black"
                      fill="#EF4444"
                      className="font-mono"
                    >
                      {item.data.totalWorkOnHolidays}
                    </text>
                  )}
                </g>
              );
            })}

            {/* X-AXIS: Employee Names */}
            {chartItems.map((item) => {
              const isHovered = hoveredIdx === item.index;
              const rawName = item.data.employee.name || '';
              const shortName = rawName.split(' ')[0] || rawName;
              const textY = padTop + innerHeight + 14;

              return (
                <g
                  key={`xlabel-${item.index}`}
                  transform={`rotate(-40, ${item.cx}, ${textY})`}
                  className="cursor-pointer"
                  onClick={() => onSelectEmployee(item.data)}
                >
                  <text
                    x={item.cx}
                    y={textY}
                    textAnchor="end"
                    fontSize="10"
                    fontWeight={isHovered ? '800' : '600'}
                    className={
                      isHovered
                        ? 'fill-indigo-600 dark:fill-indigo-400 underline font-bold'
                        : 'fill-slate-600 dark:fill-gray-300'
                    }
                  >
                    {shortName}
                  </text>
                </g>
              );
            })}

            {/* Invisible Interactive Hit-Test Overlay Columns */}
            {chartItems.map((item) => {
              return (
                <rect
                  key={`hittest-${item.index}`}
                  x={item.cx - itemSlotWidth / 2}
                  y={padTop}
                  width={itemSlotWidth}
                  height={innerHeight + padBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(item.index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectEmployee(item.data)}
                />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};

export const Analytics: React.FC = () => {
  const { employees, schedules, shifts, jobdesks, currentUser } = useAuth();

  // Role Gate: Only Admin & SPV can access Analytics
  const canAccess = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  // Active Tab: 'employee' | 'shifting'
  const [activeTab, setActiveTab] = useState<'employee' | 'shifting'>('employee');

  // Month Anchor (Default to current month)
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => getTodayIso());
  const currentAnchorDate = useMemo(() => parseLocalDate(currentDateStr), [currentDateStr]);

  // Filters
  const [locationFilter, setLocationFilter] = useState<'All' | WorkLocation>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Employee Modal Detail
  const [selectedEmpModal, setSelectedEmpModal] = useState<any | null>(null);

  // Selected Day Modal Detail
  const [selectedDayModal, setSelectedDayModal] = useState<any | null>(null);

  // Holidays
  const holidays = useMemo(() => getStoredHolidays(), []);

  // Helper to check if a shift is Off
  const isOffShift = (shiftCode: string): boolean => {
    if (!shiftCode) return false;
    const clean = shiftCode.trim().toUpperCase();
    const match = shifts.find((sh) => sh.code.trim().toUpperCase() === clean);
    if (match) return Boolean(match.isOff);
    if (['OFF', 'LIBUR', 'CUTI', 'DAY OFF', 'REST DAY'].includes(clean)) return true;
    return false;
  };

  // Month navigation
  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    const cur = new Date(currentAnchorDate);
    cur.setMonth(cur.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDateStr(formatLocalDateIso(cur));
  };

  const currentYear = currentAnchorDate.getFullYear();
  const currentMonth = currentAnchorDate.getMonth(); // 0-indexed
  const monthName = currentAnchorDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // Generate all days in the current month
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const list = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const fullDayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const iso = formatLocalDateIso(d);
      const dayIdx = d.getDay();
      const isSunday = dayIdx === 0;
      const holidayName = holidays[iso] || null;

      list.push({
        iso,
        dayNumber: i,
        dayName: dayNames[dayIdx],
        fullDayName: fullDayNames[dayIdx],
        isSunday,
        isHoliday: Boolean(holidayName),
        holidayName,
        isOffDay: isSunday || Boolean(holidayName),
        isToday: iso === getTodayIso()
      });
    }
    return list;
  }, [currentYear, currentMonth, holidays]);

  // Filter schedules strictly for the selected month and location
  const monthSchedules = useMemo(() => {
    const startIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const endIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

    return schedules.filter((s) => {
      if (s.date < startIso || s.date > endIso) return false;
      if (locationFilter !== 'All' && s.location && s.location !== locationFilter) return false;
      return true;
    });
  }, [schedules, currentYear, currentMonth, locationFilter]);

  // Unique agents discovered from schedules & custom storage
  const allAgents = useMemo(() => {
    const set = new Set<string>();
    try {
      const saved = localStorage.getItem('ctso_cms_custom_agents');
      if (saved) {
        JSON.parse(saved).forEach((a: string) => set.add(a));
      }
    } catch (e) {}
    monthSchedules.forEach((s) => {
      if (s.agent) set.add(s.agent);
    });
    return Array.from(set).sort();
  }, [monthSchedules]);

  // ==========================================
  // SECTION 1: EMPLOYEE ANALYSIS DATA
  // ==========================================
  const employeeAnalysisData = useMemo(() => {
    const relevantEmployees = employees.filter((emp) => {
      if (locationFilter !== 'All' && emp.defaultLocation !== locationFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.employeeNo.toLowerCase().includes(q) ||
          (emp.role || '').toLowerCase().includes(q) ||
          (emp.teamName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    return relevantEmployees.map((emp) => {
      // Find all assignments for this employee in the month
      const empAssignments = monthSchedules.filter(
        (s) =>
          s.employeeId === emp.id ||
          s.employeeId === emp.employeeNo ||
          s.employeeCode === emp.employeeNo
      );

      // 1. Shift breakdown: count per shift code
      const shiftCounts: Record<string, number> = {};
      let totalWorkingShifts = 0;
      let totalOffShifts = 0;

      empAssignments.forEach((s) => {
        const code = s.shiftCode || 'UNKNOWN';
        shiftCounts[code] = (shiftCounts[code] || 0) + 1;
        if (isOffShift(code)) {
          totalOffShifts++;
        } else {
          totalWorkingShifts++;
        }
      });

      // 2. Jobdesk breakdown: count per jobdesk code
      const jobdeskCounts: Record<string, number> = {};
      let unassignedJobdeskCount = 0;

      empAssignments.forEach((s) => {
        if (!isOffShift(s.shiftCode)) {
          if (s.jobdeskCode) {
            jobdeskCounts[s.jobdeskCode] = (jobdeskCounts[s.jobdeskCode] || 0) + 1;
          } else {
            unassignedJobdeskCount++;
          }
        }
      });

      // 3. Kerja di hari libur: count working on public holiday or Sunday
      let holidayWorkCount = 0;
      let sundayWorkCount = 0;
      const holidayWorkAssignments: any[] = [];

      empAssignments.forEach((s) => {
        if (!isOffShift(s.shiftCode)) {
          const dayDate = parseLocalDate(s.date);
          const isSunday = dayDate.getDay() === 0;
          const holidayName = holidays[s.date];

          if (holidayName || isSunday) {
            if (holidayName) holidayWorkCount++;
            if (isSunday && !holidayName) sundayWorkCount++;

            holidayWorkAssignments.push({
              ...s,
              holidayReason: holidayName ? `Libur Nasional: ${holidayName}` : 'Hari Minggu (Weekend Rest)'
            });
          }
        }
      });

      const totalWorkOnHolidays = holidayWorkCount + sundayWorkCount;

      return {
        employee: emp,
        empAssignments,
        shiftCounts,
        totalWorkingShifts,
        totalOffShifts,
        jobdeskCounts,
        unassignedJobdeskCount,
        totalWorkOnHolidays,
        holidayWorkCount,
        sundayWorkCount,
        holidayWorkAssignments
      };
    });
  }, [employees, monthSchedules, locationFilter, searchQuery, holidays, shifts]);

  // ==========================================
  // SECTION 2: DAILY SHIFTING ANALYSIS DATA
  // ==========================================
  const dailyShiftingData = useMemo(() => {
    return daysInMonth.map((day) => {
      const dayAssignments = monthSchedules.filter((s) => s.date === day.iso);

      // 1. Jumlah per kode shifting setiap hari
      const shiftCounts: Record<string, number> = {};
      let totalWorking = 0;
      let totalOff = 0;

      dayAssignments.forEach((s) => {
        const code = s.shiftCode || 'UNKNOWN';
        shiftCounts[code] = (shiftCounts[code] || 0) + 1;
        if (isOffShift(code)) {
          totalOff++;
        } else {
          totalWorking++;
        }
      });

      // 2. Jumlah per kode jobdesk tiap hari
      const jobdeskCounts: Record<string, number> = {};
      let unassignedJobdesk = 0;

      dayAssignments.forEach((s) => {
        if (!isOffShift(s.shiftCode)) {
          if (s.jobdeskCode) {
            jobdeskCounts[s.jobdeskCode] = (jobdeskCounts[s.jobdeskCode] || 0) + 1;
          } else {
            unassignedJobdesk++;
          }
        }
      });

      // 3. Jumlah per agent tiap hari
      const agentCounts: Record<string, number> = {};
      let unassignedAgent = 0;

      dayAssignments.forEach((s) => {
        if (!isOffShift(s.shiftCode)) {
          if (s.agent) {
            agentCounts[s.agent] = (agentCounts[s.agent] || 0) + 1;
          } else {
            unassignedAgent++;
          }
        }
      });

      return {
        ...day,
        dayAssignments,
        totalStaff: dayAssignments.length,
        totalWorking,
        totalOff,
        shiftCounts,
        jobdeskCounts,
        unassignedJobdesk,
        agentCounts,
        unassignedAgent
      };
    });
  }, [daysInMonth, monthSchedules, shifts]);

  // Overall KPIs for Top Cards
  const kpis = useMemo(() => {
    const totalWorkingShiftsMonth = employeeAnalysisData.reduce((acc, e) => acc + e.totalWorkingShifts, 0);
    const totalHolidayWorkMonth = employeeAnalysisData.reduce((acc, e) => acc + e.totalWorkOnHolidays, 0);
    const activeStaffCount = employeeAnalysisData.length;
    const avgShiftsPerStaff = activeStaffCount > 0 ? (totalWorkingShiftsMonth / activeStaffCount).toFixed(1) : '0';

    return {
      activeStaffCount,
      totalWorkingShiftsMonth,
      totalHolidayWorkMonth,
      avgShiftsPerStaff
    };
  }, [employeeAnalysisData]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (activeTab === 'employee') {
      const headers = [
        'Nama Karyawan',
        'NIK',
        'Posisi',
        'Lokasi',
        'Total Shift Kerja',
        'Total Libur/OFF',
        'Kerja Hari Libur (Total)',
        'Kerja Libur Nasional',
        'Kerja Hari Minggu',
        ...shifts.map((s) => `Shift ${s.code}`),
        ...jobdesks.map((j) => `Jobdesk ${j.code}`),
        'Jobdesk Unassigned'
      ];

      const rows = employeeAnalysisData.map((d) => [
        `"${d.employee.name}"`,
        d.employee.employeeNo,
        `"${d.employee.role || d.employee.level || '-'}"`,
        d.employee.defaultLocation || 'Badung',
        d.totalWorkingShifts,
        d.totalOffShifts,
        d.totalWorkOnHolidays,
        d.holidayWorkCount,
        d.sundayWorkCount,
        ...shifts.map((s) => d.shiftCounts[s.code] || 0),
        ...jobdesks.map((j) => d.jobdeskCounts[j.code] || 0),
        d.unassignedJobdeskCount
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Analisis_Employee_${currentYear}_${currentMonth + 1}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'Tanggal',
        'Hari',
        'Status Libur',
        'Total Staf Kerja',
        'Total Off Day',
        ...shifts.map((s) => `Shift ${s.code}`),
        ...jobdesks.map((j) => `Jobdesk ${j.code}`),
        'Jobdesk Tanpa Alokasi',
        ...allAgents.map((a) => `Agent ${a}`),
        'Tanpa Agent'
      ];

      const rows = dailyShiftingData.map((d) => [
        d.iso,
        d.fullDayName,
        d.holidayName ? `Libur (${d.holidayName})` : d.isSunday ? 'Minggu' : 'Hari Kerja',
        d.totalWorking,
        d.totalOff,
        ...shifts.map((s) => d.shiftCounts[s.code] || 0),
        ...jobdesks.map((j) => d.jobdeskCounts[j.code] || 0),
        d.unassignedJobdesk,
        ...allAgents.map((a) => d.agentCounts[a] || 0),
        d.unassignedAgent
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Analisis_Shifting_Harian_${currentYear}_${currentMonth + 1}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white dark:bg-[#18181A] p-8 sm:p-12 rounded-3xl border border-slate-200/80 dark:border-white/10 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-[#0F172A] dark:text-white">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 leading-relaxed">
          Hanya pengguna dengan peran <strong>Admin</strong> atau <strong>Supervisor (SPV)</strong> yang diizinkan untuk mengakses halaman analitik.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#18181A] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F2F4F7] tracking-tight">
                Analisis Shifting & Personel
              </h1>
              <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5">
                Monitoring beban shifting per karyawan, alokasi kode jobdesk, dan kerja di hari libur.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigation Control */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <button
              type="button"
              onClick={() => handleNavigateMonth('prev')}
              aria-label="Bulan sebelumnya"
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-2 text-xs font-bold text-[#202020] dark:text-white capitalize min-w-[140px] justify-center">
              <div className="w-6 h-6 rounded-lg bg-[#FFE160]/25 text-[#202020] dark:text-[#FFD416] flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5 text-[#202020] dark:text-[#FFD416]" />
              </div>
              <span>{monthName}</span>
            </div>
            <button
              type="button"
              onClick={() => handleNavigateMonth('next')}
              aria-label="Bulan berikutnya"
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Location Hub Filter */}
          <div
            className="flex items-center p-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 text-xs"
            role="group"
            aria-label="Filter Lokasi Hub"
          >
            {(['All', 'Badung', 'Denpasar'] as const).map((loc) => {
              const label = loc === 'All' ? 'All Hubs' : loc;
              const isActive = locationFilter === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setLocationFilter(loc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-xs dark:bg-white dark:text-[#0F172A]'
                      : 'text-slate-600 dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Karyawan Teranalisis */}
        <div className="bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">Personel Dianalisis</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.activeStaffCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Karyawan tercakup di {locationFilter === 'All' ? 'semua hub' : locationFilter}
            </div>
          </div>
        </div>

        {/* 2. Total Shift Kerja */}
        <div className="bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">Total Hari Kerja Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.totalWorkingShiftsMonth}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Shift tugas dinas (tidak termasuk OFF/Cuti)
            </div>
          </div>
        </div>

        {/* 3. Kerja di Hari Libur */}
        <div className="bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">Dinas di Hari Libur</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.totalHolidayWorkMonth}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Hari kerja jatuh pada Minggu / Tanggal Merah
            </div>
          </div>
        </div>

        {/* 4. Rata-rata Shift per Karyawan */}
        <div className="bg-white dark:bg-[#18181A] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">Rerata Shift / Personel</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight">
              {kpis.avgShiftsPerStaff} <span className="text-xs font-normal text-slate-500">shift/bln</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Keseimbangan beban kerja operasional
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Switcher */}
      <div className="bg-white dark:bg-[#18181A] p-2 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('employee')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'employee'
                ? 'bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111] shadow-xs'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Analisis Karyawan (Per Employee)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shifting')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'shifting'
                ? 'bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111] shadow-xs'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. Analisis Shifting Harian (Per Hari)</span>
          </button>
        </div>

        {activeTab === 'employee' && (
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari karyawan, NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 h-8 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white placeholder-slate-400 w-44 sm:w-56 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: EMPLOYEE ANALYSIS VIEW                           */}
      {/* ======================================================== */}
      {activeTab === 'employee' && (
        <div className="space-y-6">
          {/* 1. COMBINED BAR & LINE CHART */}
          <EmployeeComboChart
            data={employeeAnalysisData}
            monthName={monthName}
            onSelectEmployee={(empData) => setSelectedEmpModal(empData)}
          />

          {/* 2. TABLE MATRIX */}
          <div className="bg-white dark:bg-[#18181A] p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-black text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Matriks Analisis Beban Kerja per Karyawan ({employeeAnalysisData.length} personel)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Distribusi total kode shift, alokasi kode jobdesk, dan frekuensi penugasan di hari libur selama periode {monthName}.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 dark:border-white/10 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-white/5 text-slate-600 dark:text-gray-300 font-bold border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="py-3 px-4 min-w-[180px]">Karyawan / NIK</th>
                  <th className="py-3 px-4 text-center min-w-[110px]">Hari Kerja</th>
                  <th className="py-3 px-4 min-w-[280px]">Jumlah per Kode Shift</th>
                  <th className="py-3 px-4 min-w-[240px]">Jumlah per Kode Jobdesk</th>
                  <th className="py-3 px-4 min-w-[170px]">Kerja di Hari Libur</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {employeeAnalysisData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-500 italic">
                      Tidak ada karyawan yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  employeeAnalysisData.map((d) => {
                    const emp = d.employee;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors">
                        {/* 1. Employee Info */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-[#0F172A] dark:text-white">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                            {emp.employeeNo} &bull; {emp.defaultLocation || 'Hub'}
                          </div>
                          {(emp.role || emp.level) && (
                            <div className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 truncate">
                              {emp.role || emp.level} {emp.teamName ? `• ${emp.teamName}` : ''}
                            </div>
                          )}
                        </td>

                        {/* 2. Total Working Shifts */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-sm font-black font-mono text-[#0F172A] dark:text-white">
                              {d.totalWorkingShifts}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">
                              Shift Aktif
                            </span>
                          </div>
                        </td>

                        {/* 3. Jumlah per Kode Shift */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {Object.keys(d.shiftCounts).length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">Belum ada jadwal</span>
                            ) : (
                              shifts.map((sh) => {
                                const count = d.shiftCounts[sh.code];
                                if (!count) return null;
                                return (
                                  <span
                                    key={sh.code}
                                    style={{
                                      backgroundColor: sh.color || '#0284C7',
                                      color: sh.textColor || getContrastTextColor(sh.color || '#0284C7')
                                    }}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-2xs inline-flex items-center gap-1"
                                    title={`${sh.name}: ${count} kali`}
                                  >
                                    <span>{sh.code}:</span>
                                    <span className="font-black underline">{count}</span>
                                  </span>
                                );
                              })
                            )}
                            {/* Catches any custom shifts not in master catalog */}
                            {Object.entries(d.shiftCounts)
                              .filter(([code]) => !shifts.some((s) => s.code === code))
                              .map(([code, count]) => (
                                <span
                                  key={code}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-200"
                                >
                                  {code}: {count}
                                </span>
                              ))}
                          </div>
                        </td>

                        {/* 4. Jumlah per Kode Jobdesk */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {jobdesks.map((jd) => {
                              const count = d.jobdeskCounts[jd.code];
                              if (!count) return null;
                              return (
                                <span
                                  key={jd.code}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold shadow-2xs inline-flex items-center gap-1 ${
                                    getJobdeskBadgeStyle(jd.code).badge
                                  }`}
                                  title={`${jd.name}: ${count} kali`}
                                >
                                  <span>{jd.code}:</span>
                                  <span className="underline">{count}</span>
                                </span>
                              );
                            })}

                            {d.unassignedJobdeskCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">
                                Tanpa Jobdesk: {d.unassignedJobdeskCount}
                              </span>
                            )}

                            {Object.keys(d.jobdeskCounts).length === 0 && d.unassignedJobdeskCount === 0 && (
                              <span className="text-[11px] text-slate-400 italic">-</span>
                            )}
                          </div>
                        </td>

                        {/* 5. Jumlah Kerja di Hari Libur */}
                        <td className="py-3.5 px-4">
                          {d.totalWorkOnHolidays > 0 ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>{d.totalWorkOnHolidays} Hari Dinas</span>
                              </span>
                              <div className="text-[9.5px] text-slate-500 dark:text-gray-400">
                                {d.holidayWorkCount > 0 && `${d.holidayWorkCount} Tanggal Merah`}
                                {d.holidayWorkCount > 0 && d.sundayWorkCount > 0 && ' & '}
                                {d.sundayWorkCount > 0 && `${d.sundayWorkCount} Hari Minggu`}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Tidak Ada (0)</span>
                            </span>
                          )}
                        </td>

                        {/* 6. Action */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEmpModal(d)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 text-[11px] font-bold transition-colors"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DAILY SHIFTING ANALYSIS VIEW                     */}
      {/* ======================================================== */}
      {activeTab === 'shifting' && (
        <div className="bg-white dark:bg-[#18181A] p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-black text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Matriks Distribusi Shifting Harian ({dailyShiftingData.length} Hari - {monthName})</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Rekapitulasi jumlah personel per kode shift, per kode jobdesk, dan per kriteria agent untuk setiap hari.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 dark:border-white/10 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-white/5 text-slate-600 dark:text-gray-300 font-bold border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="py-3 px-4 min-w-[150px]">Tanggal & Hari</th>
                  <th className="py-3 px-4 text-center min-w-[90px]">Dinas Aktif</th>
                  <th className="py-3 px-4 min-w-[280px]">Jumlah per Kode Shift</th>
                  <th className="py-3 px-4 min-w-[230px]">Jumlah per Kode Jobdesk</th>
                  <th className="py-3 px-4 min-w-[230px]">Jumlah per Agent Tag</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {dailyShiftingData.map((d) => (
                  <tr
                    key={d.iso}
                    className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors ${
                      d.isToday
                        ? 'bg-orange-50/25 dark:bg-amber-500/5'
                        : d.isHoliday
                        ? 'bg-rose-50/30 dark:bg-rose-950/20'
                        : d.isSunday
                        ? 'bg-rose-50/15 dark:bg-rose-950/10'
                        : ''
                    }`}
                  >
                    {/* 1. Tanggal & Hari */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                        <span>{d.fullDayName}, {d.dayNumber} {monthName.split(' ')[0]}</span>
                        {d.isToday && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-600 text-white">
                            HARI INI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 mt-0.5">
                        {d.iso}
                      </div>
                      {d.holidayName && (
                        <div className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white shadow-2xs">
                          {d.holidayName}
                        </div>
                      )}
                    </td>

                    {/* 2. Total Staf Dinas */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-sm font-black font-mono text-[#0F172A] dark:text-white">
                        {d.totalWorking}
                      </span>
                      <div className="text-[10px] text-slate-500 dark:text-gray-400">
                        {d.totalOff > 0 ? `${d.totalOff} OFF` : '0 OFF'}
                      </div>
                    </td>

                    {/* 3. Jumlah per Kode Shift */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {Object.keys(d.shiftCounts).length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Tidak ada dinas</span>
                        ) : (
                          shifts.map((sh) => {
                            const count = d.shiftCounts[sh.code];
                            if (!count) return null;
                            return (
                              <span
                                key={sh.code}
                                style={{
                                  backgroundColor: sh.color || '#0284C7',
                                  color: sh.textColor || getContrastTextColor(sh.color || '#0284C7')
                                }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-2xs inline-flex items-center gap-1"
                                title={`${sh.name}: ${count} staf`}
                              >
                                <span>{sh.code}:</span>
                                <span className="font-black underline">{count}</span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>

                    {/* 4. Jumlah per Kode Jobdesk */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {jobdesks.map((jd) => {
                          const count = d.jobdeskCounts[jd.code];
                          if (!count) return null;
                          return (
                            <span
                              key={jd.code}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold shadow-2xs inline-flex items-center gap-1 ${
                                getJobdeskBadgeStyle(jd.code).badge
                              }`}
                              title={`${jd.name}: ${count} staf bertugas`}
                            >
                              <span>{jd.code}:</span>
                              <span className="underline">{count}</span>
                            </span>
                          );
                        })}

                        {d.unassignedJobdesk > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">
                            Tanpa Jobdesk: {d.unassignedJobdesk}
                          </span>
                        )}

                        {Object.keys(d.jobdeskCounts).length === 0 && d.unassignedJobdesk === 0 && (
                          <span className="text-[11px] text-slate-400 italic">-</span>
                        )}
                      </div>
                    </td>

                    {/* 5. Jumlah per Agent Tag */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {allAgents.map((agentName) => {
                          const count = d.agentCounts[agentName];
                          if (!count) return null;
                          return (
                            <span
                              key={agentName}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-2xs inline-flex items-center gap-1.5 ${
                                getAgentPillStyle(agentName).bg
                              }`}
                              title={`Agent ${agentName}: ${count} staf`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${getAgentPillStyle(agentName).dot}`} />
                              <span>{agentName}:</span>
                              <span className="font-black underline">{count}</span>
                            </span>
                          );
                        })}

                        {d.unassignedAgent > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono text-slate-400 dark:text-gray-500">
                            Tanpa Agent: {d.unassignedAgent}
                          </span>
                        )}

                        {Object.keys(d.agentCounts).length === 0 && d.unassignedAgent === 0 && (
                          <span className="text-[11px] text-slate-400 italic">-</span>
                        )}
                      </div>
                    </td>

                    {/* 6. Aksi */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedDayModal(d)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 text-[11px] font-bold transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: EMPLOYEE DETAIL SHIFTING BREAKDOWN              */}
      {/* ======================================================== */}
      {selectedEmpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEmpModal(null)}
        >
          <div
            className="bg-white dark:bg-[#18181A] rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-[#111111] dark:text-white">
                  Rincian Penugasan: {selectedEmpModal.employee.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-gray-300">
                  {selectedEmpModal.employee.employeeNo} &bull; Periode: {monthName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmpModal(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] font-semibold text-slate-500">Total Shift Aktif</span>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {selectedEmpModal.totalWorkingShifts}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] font-semibold text-slate-500">Off Day / Cuti</span>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {selectedEmpModal.totalOffShifts}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">Kerja di Hari Libur</span>
                <div className="text-xl font-black font-mono text-amber-900 dark:text-amber-200 mt-0.5">
                  {selectedEmpModal.totalWorkOnHolidays}
                </div>
              </div>
            </div>

            {/* Assignment History List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-gray-200">
                Daftar Tanggal Assignment ({selectedEmpModal.empAssignments.length} jadwal tercatat):
              </h4>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 pr-1">
                {selectedEmpModal.empAssignments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 italic">
                    Belum ada penugasan jadwal untuk karyawan ini pada bulan {monthName}.
                  </div>
                ) : (
                  selectedEmpModal.empAssignments
                    .sort((a: any, b: any) => a.date.localeCompare(b.date))
                    .map((item: any, idx: number) => {
                      const isOff = isOffShift(item.shiftCode);
                      const isHoliday = Boolean(holidays[item.date]);
                      const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][parseLocalDate(item.date).getDay()];

                      return (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 dark:text-white min-w-[90px]">
                              {formatDateDMY(item.date)} ({dayName})
                            </span>
                            {isHoliday && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white">
                                {holidays[item.date]}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${getShiftBadgeStyle(item.shiftCode).badge}`}>
                              {item.shiftCode}
                            </span>

                            {item.jobdeskCode && !isOff && (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono ${getJobdeskBadgeStyle(item.jobdeskCode).badge}`}>
                                {item.jobdeskCode}
                              </span>
                            )}

                            {item.agent && !isOff && (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${getAgentPillStyle(item.agent).bg}`}>
                                {item.agent}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/10 text-right">
              <button
                type="button"
                onClick={() => setSelectedEmpModal(null)}
                className="px-4 py-2 rounded-xl bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111] text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DAILY DETAIL STAFF ON DUTY                     */}
      {/* ======================================================== */}
      {selectedDayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedDayModal(null)}
        >
          <div
            className="bg-white dark:bg-[#18181A] rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-[#111111] dark:text-white">
                  Roster Shifting: {selectedDayModal.fullDayName}, {formatDateDMY(selectedDayModal.iso)}
                </h3>
                <p className="text-xs text-slate-600 dark:text-gray-300">
                  Total {selectedDayModal.totalWorking} personel bertugas aktif &bull; {selectedDayModal.totalOff} libur
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayModal(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 pr-1">
              {selectedDayModal.dayAssignments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  Tidak ada jadwal tercatat pada tanggal ini.
                </div>
              ) : (
                selectedDayModal.dayAssignments.map((item: any, idx: number) => {
                  const isOff = isOffShift(item.shiftCode);
                  return (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                      <div>
                        <div className="font-bold text-[#111111] dark:text-white">{item.employeeName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">
                          {item.employeeCode} &bull; {item.location || 'Hub'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${getShiftBadgeStyle(item.shiftCode).badge}`}>
                          {item.shiftCode}
                        </span>

                        {item.jobdeskCode && !isOff && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono ${getJobdeskBadgeStyle(item.jobdeskCode).badge}`}>
                            {item.jobdeskCode}
                          </span>
                        )}

                        {item.agent && !isOff && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${getAgentPillStyle(item.agent).bg}`}>
                            {item.agent}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/10 text-right">
              <button
                type="button"
                onClick={() => setSelectedDayModal(null)}
                className="px-4 py-2 rounded-xl bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111] text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
