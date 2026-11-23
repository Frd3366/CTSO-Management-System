/**
 * Utility functions for interconnected styling of Shift codes and Jobdesk codes
 * across Kanban cards, Table views (Weekly and Monthly), Dashboard widgets,
 * Requests & Leaves, and Schedule History.
 * 
 * Interconnected Color Mapping:
 * - Pagi 7 / Pagi 8 & CT1  -> Sky Blue (#0284C7)
 * - Siang                 -> Emerald Green (#0D9488)
 * - Middle / Sore & CT2   -> Amber Gold (#D97706)
 * - Malam & CT4           -> Deep Indigo (#4F46E5)
 * - OFF                   -> Soft Rose (#E11D48)
 */

export interface CodeStyle {
  card: string;   // For larger table cards / kanban tiles (Full padat solid background)
  badge: string;  // For compact rounded pills
  cell: string;   // For monthly table grid cells
  border: string; // Hex border accent
}

import React from 'react';
import { ShiftMasterItem, JobdeskItem } from '../types';
import { INITIAL_SHIFTS, INITIAL_JOBDESKS } from '../data/mockData';

export interface CodeStyle {
  card: string;   // Dynamic class & fallback
  badge: string;  // Dynamic class & fallback
  cell: string;   // Dynamic class & fallback
  border: string; // The active hex color
  style?: React.CSSProperties;
}

// Blend any hex color with a solid base (100% opaque, no transparency)
export const blendSolidColor = (hex: string, weight: number, baseHex: string = '#ffffff'): string => {
  if (!hex || typeof hex !== 'string') return baseHex;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  let b = baseHex.replace('#', '').trim();
  if (b.length === 3) b = b.split('').map((x) => x + x).join('');

  const num = parseInt(c, 16);
  const baseNum = parseInt(b, 16);
  if (isNaN(num) || isNaN(baseNum)) return baseHex;

  const r1 = (num >> 16) & 255;
  const g1 = (num >> 8) & 255;
  const b1 = num & 255;

  const r2 = (baseNum >> 16) & 255;
  const g2 = (baseNum >> 8) & 255;
  const b2 = baseNum & 255;

  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(r1 * w + r2 * (1 - w));
  const g = Math.round(g1 * w + g2 * (1 - w));
  const b_val = Math.round(b1 * w + b2 * (1 - w));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b_val)}`;
};

export const getSolidCardBg = (hex?: string, isDark: boolean = false): string => {
  const color = hex || '#0284C7';
  return isDark
    ? blendSolidColor(color, 0.44, '#1E293B')
    : blendSolidColor(color, 0.48, '#CBD5E1');
};

export const getSolidCardBorder = (_hex?: string, _isDark: boolean = false): string => {
  return 'transparent';
};

// Convert any hex color (#RRGGBB or #RGB) to rgba string
export const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || typeof hex !== 'string') return `rgba(100, 116, 139, ${alpha})`;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(100, 116, 139, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Calculate contrast text color (black vs white)
export const getContrastTextColor = (hex: string): string => {
  if (!hex || typeof hex !== 'string') return '#111111';
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return '#111111';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#0f172a' : '#ffffff';
};

// Sanitize code name to safe CSS class name
export const toCssSlug = (text: string): string => {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
};

let cachedShifts: ShiftMasterItem[] | null = null;
let cachedJobdesks: JobdeskItem[] | null = null;

// Read master shifts from cache or localStorage
export const getMasterShifts = (): ShiftMasterItem[] => {
  if (cachedShifts && cachedShifts.length > 0) return cachedShifts;
  try {
    const raw =
      localStorage.getItem('ctso_cms_clean_v1_shifts') ||
      localStorage.getItem('cms_shifts');
    if (raw) {
      cachedShifts = JSON.parse(raw);
      return cachedShifts!;
    }
  } catch {}
  return INITIAL_SHIFTS;
};

// Read master jobdesks from cache or localStorage
export const getMasterJobdesks = (): JobdeskItem[] => {
  if (cachedJobdesks && cachedJobdesks.length > 0) return cachedJobdesks;
  try {
    const raw =
      localStorage.getItem('ctso_cms_clean_v1_jobdesks') ||
      localStorage.getItem('cms_jobdesks');
    if (raw) {
      cachedJobdesks = JSON.parse(raw);
      return cachedJobdesks!;
    }
  } catch {}
  return INITIAL_JOBDESKS;
};

export const RECOMMENDED_SHIFT_COLORS = [
  { name: 'Crimson Red', hex: '#E11D48' },
  { name: 'Bright Orange', hex: '#EA580C' },
  { name: 'Golden Yellow', hex: '#FFD416' },
  { name: 'Fresh Lime', hex: '#65A30D' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Ocean Teal', hex: '#0D9488' },
  { name: 'Sky Blue', hex: '#0284C7' },
  { name: 'Deep Blue', hex: '#1D4ED8' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Vivid Purple', hex: '#9333EA' },
  { name: 'Hot Magenta', hex: '#DB2777' },
  { name: 'Warm Brown', hex: '#92400E' },
  { name: 'Cool Slate', hex: '#475569' },
  { name: 'Charcoal Black', hex: '#111827' },
] as const;

// Dynamically inject stylesheet so ANY color change in Schedule/Jobdesk Master updates every card immediately
export const syncDynamicStyles = (shifts?: ShiftMasterItem[], jobdesks?: JobdeskItem[]) => {
  const activeShifts = shifts || getMasterShifts();
  const activeJobdesks = jobdesks || getMasterJobdesks();

  cachedShifts = activeShifts;
  cachedJobdesks = activeJobdesks;

  if (typeof document === 'undefined') return;

  let styleTag = document.getElementById('cms-dynamic-code-styles') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'cms-dynamic-code-styles';
    document.head.appendChild(styleTag);
  }

  let css = '/* Dynamic Master Code Colors */\n';

  // Generate shift styles (High-contrast distinct tint, text automatically adapts to Light/Dark mode)
  activeShifts.forEach((s) => {
    const slug = toCssSlug(s.code);
    const color = s.color || '#0284C7';

    const cardBgLight = blendSolidColor(color, 0.30, '#FFFFFF');
    const cardBorderLight = blendSolidColor(color, 0.65, '#FFFFFF');
    const cardBgDark = blendSolidColor(color, 0.44, '#202020');
    const cardBorderDark = blendSolidColor(color, 0.72, '#202020');

    const badgeBgLight = blendSolidColor(color, 0.32, '#FFFFFF');
    const badgeBorderLight = blendSolidColor(color, 0.75, '#FFFFFF');
    const badgeBgDark = blendSolidColor(color, 0.50, '#202020');
    const badgeBorderDark = blendSolidColor(color, 0.80, '#202020');

    css += `
.card-shift-${slug},
.cell-shift-${slug} {
  background-color: ${cardBgLight} !important;
  border-color: ${cardBorderLight} !important;
  color: #202020 !important;
}
.dark .card-shift-${slug},
.dark .cell-shift-${slug} {
  background-color: ${cardBgDark} !important;
  border-color: ${cardBorderDark} !important;
  color: #FFFFFF !important;
}

.badge-shift-${slug} {
  background-color: ${badgeBgLight} !important;
  border-color: ${badgeBorderLight} !important;
  color: #202020 !important;
}
.dark .badge-shift-${slug} {
  background-color: ${badgeBgDark} !important;
  border-color: ${badgeBorderDark} !important;
  color: #FFFFFF !important;
}
`;
  });

  // Generate jobdesk styles (Dark pastel without border for event blocks; solid for compact code badges)
  activeJobdesks.forEach((j) => {
    const slug = toCssSlug(j.code);
    const color = j.color || '#0284C7';
    const customText = j.textColor && j.textColor.startsWith('#') ? j.textColor : undefined;
    const badgeText = customText || getContrastTextColor(color);

    const cardBgLight = blendSolidColor(color, 0.48, '#CBD5E1');
    const cardBgDark = blendSolidColor(color, 0.44, '#1E293B');
    const textLight = customText || getContrastTextColor(cardBgLight);
    const textDark = customText || '#F8FAFC';

    css += `
.card-jobdesk-${slug},
.cell-jobdesk-${slug} {
  background-color: ${cardBgLight} !important;
  border-color: transparent !important;
  border-width: 0px !important;
  color: ${textLight} !important;
}
.dark .card-jobdesk-${slug},
.dark .cell-jobdesk-${slug} {
  background-color: ${cardBgDark} !important;
  border-color: transparent !important;
  border-width: 0px !important;
  color: ${textDark} !important;
}

.badge-jobdesk-${slug},
.dark .badge-jobdesk-${slug} {
  background-color: ${color} !important;
  border-color: ${color} !important;
  color: ${badgeText} !important;
}
`;
  });

  styleTag.textContent = css;
};

// Initialize once
if (typeof window !== 'undefined') {
  syncDynamicStyles();
}

export const getShiftBadgeStyle = (code: string, shiftsList?: ShiftMasterItem[]): CodeStyle => {
  const masterList = shiftsList || getMasterShifts();
  const c = (code || '').toLowerCase().trim();

  // Find shift from master
  const sh = masterList.find(
    (s) => s.code.toLowerCase().trim() === c || (s.isOff && (c === 'off' || c === 'c' || c === 's' || c.includes('libur')))
  );

  const activeColor = sh?.color || (c === 'off' || c === 'c' ? '#E11D48' : '#0284C7');
  const customText = sh?.textColor && sh.textColor.startsWith('#') ? sh.textColor : undefined;
  const darkPastelBg = blendSolidColor(activeColor, 0.48, '#CBD5E1');
  const activeText = customText || getContrastTextColor(darkPastelBg);
  const slug = toCssSlug(sh?.code || code);

  return {
    card: `card-shift-${slug} border-0 font-bold`,
    badge: `badge-shift-${slug} border font-bold`,
    cell: `cell-shift-${slug} border-0 font-bold`,
    border: 'transparent',
    style: {
      backgroundColor: darkPastelBg,
      borderColor: 'transparent',
      color: activeText
    }
  };
};

export const getJobdeskBadgeStyle = (code?: string, jobdesksList?: JobdeskItem[]): CodeStyle => {
  const masterList = jobdesksList || getMasterJobdesks();
  const c = (code || '').toUpperCase().trim();

  if (!c) {
    return {
      card: 'bg-slate-200 dark:bg-white/10 border-0 text-slate-800 dark:text-gray-200',
      badge: 'bg-slate-200 dark:bg-white/10 text-slate-700 border border-slate-300 dark:border-white/10',
      cell: 'text-slate-600 dark:text-gray-400 bg-slate-200/70 dark:bg-white/5 border-0',
      border: 'transparent'
    };
  }

  const jd = masterList.find((j) => j.code.toUpperCase().trim() === c);
  const activeColor = jd?.color || (c === 'OFF' ? '#E11D48' : '#0284C7');
  const customText = jd?.textColor && jd.textColor.startsWith('#') ? jd.textColor : undefined;
  const darkPastelBg = blendSolidColor(activeColor, 0.48, '#CBD5E1');
  const activeText = customText || getContrastTextColor(darkPastelBg);
  const slug = toCssSlug(jd?.code || code || '');

  return {
    card: `card-jobdesk-${slug} border-0 font-bold`,
    badge: `badge-jobdesk-${slug} border font-bold`,
    cell: `cell-jobdesk-${slug} border-0 font-bold`,
    border: activeColor,
    style: {
      backgroundColor: darkPastelBg,
      borderColor: activeColor,
      color: activeText
    }
  };
};

/**
 * Splits a free-text jobdesk description into clean, structured task capsules.
 * Handles newlines, bullets, semicolons, and commas with conjunctions (dan, serta).
 */
export const parseJobdeskTasks = (desc: string): string[] => {
  if (!desc || typeof desc !== 'string') return [];
  const text = desc.trim();
  if (!text) return [];

  let rawItems: string[] = [];
  if (text.includes('\n')) {
    rawItems = text.split('\n');
  } else if (text.includes('•') || text.includes(';')) {
    rawItems = text.split(/[•;]+/);
  } else {
    const cleaned = text.replace(/\.$/, '');
    rawItems = cleaned.split(/,\s*(?:dan\s+|serta\s+)?|;\s*|\s+dan\s+|\s+serta\s+/i);
  }

  return rawItems
    .map((item) => item.replace(/^[-•*–\u2014\d.)\s]+/, '').trim())
    .filter((item) => item.length > 0)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));
};

export interface AgentColorStyle {
  bg: string;
  dot: string;
  border: string;
}

export const getAgentPillStyle = (agentName: string): AgentColorStyle => {
  if (!agentName) {
    return { bg: 'bg-slate-500 text-white', dot: 'bg-slate-300', border: 'border-slate-400' };
  }

  const palettes: AgentColorStyle[] = [
    { bg: 'bg-emerald-600 text-white', dot: 'bg-emerald-200', border: 'border-emerald-400' },
    { bg: 'bg-purple-600 text-white', dot: 'bg-purple-200', border: 'border-purple-400' },
    { bg: 'bg-amber-500 text-slate-950 font-black', dot: 'bg-amber-200', border: 'border-amber-600' },
    { bg: 'bg-rose-600 text-white', dot: 'bg-rose-200', border: 'border-rose-400' },
    { bg: 'bg-cyan-600 text-white', dot: 'bg-cyan-200', border: 'border-cyan-400' },
    { bg: 'bg-indigo-600 text-white', dot: 'bg-indigo-200', border: 'border-indigo-400' },
    { bg: 'bg-teal-600 text-white', dot: 'bg-teal-200', border: 'border-teal-400' },
    { bg: 'bg-orange-600 text-white', dot: 'bg-orange-200', border: 'border-orange-400' },
    { bg: 'bg-fuchsia-600 text-white', dot: 'bg-fuchsia-200', border: 'border-fuchsia-400' },
    { bg: 'bg-blue-600 text-white', dot: 'bg-blue-200', border: 'border-blue-400' }
  ];

  let hash = 0;
  for (let i = 0; i < agentName.length; i++) {
    hash = (hash << 5) - hash + agentName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
};

