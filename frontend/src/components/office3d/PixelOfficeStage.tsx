import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export interface OfficeAvatarData {
  id: string;
  name: string;
  nickname?: string;
  fullName?: string;
  gender?: 'male' | 'female';
  role: string;
  shiftCode: string;
  shiftColor?: string;
  jobdeskCode: string;
  jobdeskColor?: string;
  location: 'Badung' | 'Denpasar';
  isLive: boolean;
}

export interface OfficeTVStats {
  dateLabel: string;
  totalOnDuty: number;
  badungCount: number;
  denpasarCount: number;
  jobdeskBars: Array<{ code: string; count: number; color?: string }>;
  tickerText: string;
}

interface PixelOfficeStageProps {
  resetCounter: number;
  mainRoster: OfficeAvatarData[];
  studioRoster: OfficeAvatarData[];
  selectedJobdesk: string | null;
  tvStats: OfficeTVStats;
}

type Facing = 'down' | 'up' | 'left' | 'right';
type AgentState = 'WORKING' | 'WALKING_TO_POI' | 'AT_POI' | 'WALKING_BACK';

interface Point {
  x: number;
  y: number;
}

interface PixelDesk {
  id: number;
  pic?: string;
  isStool?: boolean;
  x: number;
  y: number;
  sitX: number;
  sitY: number;
  aisleX: number;
  aisleY: number;
  facing: Facing;
}

interface PixelPOI {
  id: string;
  label: string;
  x: number;
  y: number;
  facing: Facing;
  icon: string;
  givesDrink?: 'coffee' | 'water';
}

interface PixelAgent {
  index: number;
  room: 'main' | 'studio';
  desk: PixelDesk;
  x: number;
  y: number;
  facing: Facing;
  state: AgentState;
  stateTimer: number;
  workDuration: number;
  breakDuration: number;
  walkFrame: number;
  walkAccum: number;
  waypoints: Point[];
  wpIndex: number;
  currentPOI: PixelPOI | null;
  hasDrink: 'coffee' | 'water' | null;
  drinkTimer: number;
  blinkTimer: number;
  isBlinking: boolean;
  skin: string;
  hair: string;
  gender: 'male' | 'female';
  glasses: boolean;
  tieColor: string | null;
  workSub: 'typing' | 'mouse' | 'sip' | 'phone';
  workSubTimer: number;
  chatPartnerIdx: number | null;
  isChatHost: boolean;
}

const SKIN_TONES = ['#f5cba7', '#e8b48a', '#f8d5b8', '#e2a97e', '#f0bf96', '#f7d1b2'];
const HAIR_TONES = ['#3b2518', '#241b16', '#5c3822', '#2f2119', '#4a2c1a', '#1f1a18'];
const TIE_TONES = ['#38bdf8', '#FFD416', '#60a5fa', '#34d399'];

// --- MAIN OFFICE (Kantor Utama — Badung) Logical Pixel Grid: 384 x 272 ---
const MAIN_W = 384;
const MAIN_H = 272;

const MAIN_DESKS: PixelDesk[] = [
  // Top Row: PC 1..4 (facing up toward TV/windows) — Widek, Ima, Diah, Ayu
  { id: 1, pic: 'widek', x: 64, y: 54, sitX: 64, sitY: 70, aisleX: 64, aisleY: 94, facing: 'up' },
  { id: 2, pic: 'ima', x: 144, y: 54, sitX: 144, sitY: 70, aisleX: 144, aisleY: 94, facing: 'up' },
  { id: 3, pic: 'diah', x: 224, y: 54, sitX: 224, sitY: 70, aisleX: 224, aisleY: 94, facing: 'up' },
  { id: 4, pic: 'ayu', x: 304, y: 54, sitX: 304, sitY: 70, aisleX: 304, aisleY: 94, facing: 'up' },
  // Middle Row: PC 5..7 (right below coffee cabinet, facing up) — Untung, Ferdi, Dimas
  { id: 5, pic: 'untung', x: 148, y: 148, sitX: 148, sitY: 164, aisleX: 148, aisleY: 184, facing: 'up' },
  { id: 6, pic: 'ferdi', x: 224, y: 148, sitX: 224, sitY: 164, aisleX: 224, aisleY: 184, facing: 'up' },
  { id: 7, pic: 'dimas', x: 300, y: 148, sitX: 300, sitY: 164, aisleX: 300, aisleY: 184, facing: 'up' },
  // Bottom Row: PC 8..11 (facing down toward AC wall) — Hendry, Syarif, Ilda, Novi
  { id: 8, pic: 'hendry', x: 64, y: 230, sitX: 64, sitY: 214, aisleX: 64, aisleY: 184, facing: 'down' },
  { id: 9, pic: 'syarif', x: 144, y: 230, sitX: 144, sitY: 214, aisleX: 144, aisleY: 184, facing: 'down' },
  { id: 10, pic: 'ilda', x: 224, y: 230, sitX: 224, sitY: 214, aisleX: 224, aisleY: 184, facing: 'down' },
  { id: 11, pic: 'novi', x: 304, y: 230, sitX: 304, sitY: 214, aisleX: 304, aisleY: 184, facing: 'down' },
  // Round Stools beside Water Dispenser (for Internship team when PCs are taken by other teams)
  { id: 12, isStool: true, x: 74, y: 118, sitX: 74, sitY: 118, aisleX: 50, aisleY: 118, facing: 'right' },
  { id: 13, isStool: true, x: 74, y: 138, sitX: 74, sitY: 138, aisleX: 50, aisleY: 138, facing: 'right' },
  { id: 14, isStool: true, x: 74, y: 158, sitX: 74, sitY: 158, aisleX: 50, aisleY: 158, facing: 'right' },
];

const MAIN_TOILET_POI: PixelPOI = {
  id: 'toilet',
  label: 'Ke Toilet',
  x: -16,
  y: 144,
  facing: 'left',
  icon: '🚻',
};

const STUDIO_TOILET_POI: PixelPOI = {
  id: 'toilet',
  label: 'Ke Toilet',
  x: 334,
  y: 162,
  facing: 'right',
  icon: '🚻',
};

function assignMainDeskSlots(roster: OfficeAvatarData[]): Array<OfficeAvatarData | null> {
  const slots: Array<OfficeAvatarData | null> = new Array(MAIN_DESKS.length).fill(null);
  const pcIndices = MAIN_DESKS.map((d, i) => (!d.isStool ? i : -1)).filter((i) => i >= 0);
  const stoolIndices = MAIN_DESKS.map((d, i) => (d.isStool ? i : -1)).filter((i) => i >= 0);

  const isInternship = (staff: OfficeAvatarData) =>
    (staff.role || '').toLowerCase().includes('inter');

  const regularStaff = roster.filter((s) => !isInternship(s));
  const internStaff = roster.filter((s) => isInternship(s));

  const findPicDesk = (staff: OfficeAvatarData, exactNicknameOnly: boolean): number => {
    const nick = (staff.nickname || '').trim().toLowerCase();
    if (nick) {
      const idx = pcIndices.find((i) => !slots[i] && MAIN_DESKS[i].pic === nick);
      if (idx !== undefined) return idx;
    }
    if (exactNicknameOnly) return -1;
    const tokens = `${staff.nickname || ''} ${staff.fullName || ''} ${staff.name || ''}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    const idx = pcIndices.find((i) => !slots[i] && MAIN_DESKS[i].pic && tokens.includes(MAIN_DESKS[i].pic!));
    return idx !== undefined ? idx : -1;
  };

  // 1. Regular staff get PC desks first: exact nickname PIC match -> word match -> remaining empty PCs
  const afterPass1: OfficeAvatarData[] = [];
  for (const staff of regularStaff) {
    const deskIdx = findPicDesk(staff, true);
    if (deskIdx >= 0) slots[deskIdx] = staff;
    else afterPass1.push(staff);
  }

  const unassignedRegular: OfficeAvatarData[] = [];
  for (const staff of afterPass1) {
    const deskIdx = findPicDesk(staff, false);
    if (deskIdx >= 0) slots[deskIdx] = staff;
    else unassignedRegular.push(staff);
  }

  for (const staff of unassignedRegular) {
    const freePc = pcIndices.find((i) => slots[i] === null);
    if (freePc !== undefined) {
      slots[freePc] = staff;
    } else {
      const freeStool = stoolIndices.find((i) => slots[i] === null);
      if (freeStool !== undefined) slots[freeStool] = staff;
    }
  }

  // 2. Internship team sits on round stools beside the water dispenser (or free PC if stools are full)
  for (const staff of internStaff) {
    const freeStool = stoolIndices.find((i) => slots[i] === null);
    if (freeStool !== undefined) {
      slots[freeStool] = staff;
    } else {
      const freePc = pcIndices.find((i) => slots[i] === null);
      if (freePc !== undefined) slots[freePc] = staff;
    }
  }

  return slots;
}

const CTSO_TEAM_QUOTES = [
  {
    quote: 'Kerja tim itu kayak koneksi stabil — nggak selalu kelihatan, tapi pas solid semuanya langsung lancar. Stay solid, CTSO squad!',
    tag: '#SolidTanpaDrama',
    mood: 'Team Energy',
  },
  {
    quote: 'Jangan lupa minum air & stretching bentar guys. Server aja butuh cooling, apalagi kamu yang jadi tulang punggung operasional.',
    tag: '#AntiBurnoutClub',
    mood: 'Self-Care Check',
  },
  {
    quote: 'Shift pagi, siang, sore, sampai malam — beda jam kerja, satu misi. You guys are literally the main characters keeping everything running!',
    tag: '#CTSOAlwaysOn',
    mood: 'Main Character Vibe',
  },
  {
    quote: 'Capek boleh, nyerah jangan. Kalau antrean lagi rame, tarik napas, sruput kopi, gas pelan bareng tim — no one fights alone di sini!',
    tag: '#GasPelanYangPentingAman',
    mood: 'Support System',
  },
  {
    quote: 'Bukan soal siapa paling jago sendirian, tapi soal siapa yang selalu siap backup pas temen lagi hectic. Respect buat tim Badung & Denpasar!',
    tag: '#MutualBackupEnergy',
    mood: 'Division Pride',
  },
  {
    quote: 'Progress kecil hari ini tetap progress. Nggak harus sempurna tiap detik, yang penting komunikasi jalan, saling jaga vibe, dan tetap happy.',
    tag: '#GoodVibesOnly',
    mood: 'Mindset Reset',
  },
  {
    quote: 'Kerja keras itu keren, tapi kerja cerdas bareng tim yang sefrekuensi itu next level. Keep slaying the shift, CTSO fam!',
    tag: '#NextLevelTeamwork',
    mood: 'Squad Goals',
  },
  {
    quote: 'Ingat: setiap kendala teknis pasti ada solusinya, dan setiap shift yang padat pasti ada jam pulangnya. Tetap semangat, tetap waras, tetap kompak!',
    tag: '#ShiftAmanHatiTenang',
    mood: 'Daily Reminder',
  },
];

const MAIN_POIS: PixelPOI[] = [
  { id: 'coffee', label: 'Seduh Kopi', x: 158, y: 112, facing: 'down', icon: '☕', givesDrink: 'coffee' },
  { id: 'bags', label: 'Cek Tas Kerja', x: 266, y: 112, facing: 'down', icon: '🎒' },
  { id: 'dispenser', label: 'Ambil Air Dispenser', x: 84, y: 126, facing: 'right', icon: '💧', givesDrink: 'water' },
  { id: 'window', label: 'Istirahat di Jendela', x: 348, y: 138, facing: 'right', icon: '🧘' },
  { id: 'chat', label: 'Diskusi Tim', x: 64, y: 144, facing: 'right', icon: '💬' },
];

// --- WOOD STUDIO ROOM (Ruang Kayu — Denpasar) Logical Pixel Grid: 320 x 232 ---
const STUDIO_W = 320;
const STUDIO_H = 232;

const STUDIO_DESKS: PixelDesk[] = [
  // Shared wooden table centered at (160, 140), 2x2 facing each other (1 & 2 on right facing left, 3 & 4 on left facing right)
  { id: 1, x: 186, y: 122, sitX: 204, sitY: 122, aisleX: 230, aisleY: 122, facing: 'left' },
  { id: 2, x: 186, y: 162, sitX: 204, sitY: 162, aisleX: 230, aisleY: 162, facing: 'left' },
  { id: 3, x: 134, y: 162, sitX: 116, sitY: 162, aisleX: 90, aisleY: 162, facing: 'right' },
  { id: 4, x: 134, y: 122, sitX: 116, sitY: 122, aisleX: 90, aisleY: 122, facing: 'right' },
];

const STUDIO_POIS: PixelPOI[] = [
  { id: 'wood_bottle', label: 'Ambil Minum di Kabinet', x: 128, y: 80, facing: 'up', icon: '💧', givesDrink: 'water' },
  { id: 'wood_bag', label: 'Cek Tas di Kabinet Kayu', x: 192, y: 80, facing: 'up', icon: '🎒' },
  { id: 'wood_stretch', label: 'Peregangan', x: 74, y: 140, facing: 'right', icon: '🧘' },
];

function createAgents(room: 'main' | 'studio', desks: PixelDesk[]): PixelAgent[] {
  return desks.map((desk, i) => ({
    index: i,
    room,
    desk,
    x: desk.sitX,
    y: desk.sitY,
    facing: desk.facing,
    state: 'WORKING',
    stateTimer: Math.random() * 6,
    workDuration: 8 + Math.random() * 12,
    breakDuration: 4 + Math.random() * 4,
    walkFrame: 0,
    walkAccum: 0,
    waypoints: [],
    wpIndex: 0,
    currentPOI: null,
    hasDrink: null,
    drinkTimer: 0,
    blinkTimer: 1.5 + Math.random() * 3.5,
    isBlinking: false,
    skin: SKIN_TONES[(i + (room === 'studio' ? 2 : 0)) % SKIN_TONES.length],
    hair: HAIR_TONES[(i + (room === 'studio' ? 1 : 0)) % HAIR_TONES.length],
    gender: i % 3 === 2 || (room === 'studio' && i % 2 === 1) ? 'female' : 'male',
    glasses: i % 2 === 0,
    tieColor: TIE_TONES[i % TIE_TONES.length],
    workSub: 'typing',
    workSubTimer: 3 + Math.random() * 4,
    chatPartnerIdx: null,
    isChatHost: false,
  }));
}

function buildPixelPath(room: 'main' | 'studio', from: Point, to: Point, fromAisleY: number, toAisleY: number): Point[] {
  if (room === 'studio') {
    const laneY = to.y < 110 || from.y < 110 ? 86 : 196;
    return [
      { x: from.x, y: laneY },
      { x: to.x, y: laneY },
      { x: to.x, y: to.y },
    ];
  }
  // Main office aisles: upper y = 94, lower y = 184, left corridor x = 44, right corridor x = 344
  if (Math.abs(fromAisleY - toAisleY) < 12) {
    return [
      { x: from.x, y: fromAisleY },
      { x: to.x, y: fromAisleY },
      { x: to.x, y: to.y },
    ];
  }
  const corridorX = from.x < 190 ? 44 : 344;
  return [
    { x: from.x, y: fromAisleY },
    { x: corridorX, y: fromAisleY },
    { x: corridorX, y: toAisleY },
    { x: to.x, y: toAisleY },
    { x: to.x, y: to.y },
  ];
}

// --- Stardew Valley Pixel Art Drawing Helpers ---
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawPixelPlant(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  px(ctx, cx - 6, cy + 2, 12, 4, 'rgba(30, 20, 10, 0.22)'); // shadow
  px(ctx, cx - 5, cy - 4, 10, 8, '#c27849'); // terracotta pot
  px(ctx, cx - 6, cy - 6, 12, 3, '#d98c5f');
  px(ctx, cx - 4, cy - 5, 8, 2, '#5c3a21'); // soil
  // Lush Stardew pixel leaves
  px(ctx, cx - 7, cy - 12, 5, 5, '#2e8b57');
  px(ctx, cx + 2, cy - 12, 5, 5, '#2e8b57');
  px(ctx, cx - 4, cy - 16, 8, 8, '#3cb371');
  px(ctx, cx - 2, cy - 18, 4, 4, '#66d98a');
}

function drawMainDesk(ctx: CanvasRenderingContext2D, d: PixelDesk, isActive: boolean, time: number) {
  const x = d.x;
  const y = d.y;
  // Shadow
  px(ctx, x - 27, y - 10, 54, 24, 'rgba(20, 25, 35, 0.16)');
  // Black matte desk top
  px(ctx, x - 26, y - 12, 52, 22, '#1e222b');
  px(ctx, x - 25, y - 11, 50, 19, '#262b36');
  // Privacy back lip
  if (d.facing === 'up') {
    px(ctx, x - 26, y - 13, 52, 3, '#13161d');
  } else {
    px(ctx, x - 26, y + 9, 52, 3, '#13161d');
  }
  // Monitor (glowing pixel screen!)
  const monY = d.facing === 'up' ? y - 9 : y + 1;
  px(ctx, x - 11, monY, 22, 8, '#0f172a');
  if (isActive) {
    const pulse = Math.floor(time * 4 + d.id) % 3;
    px(ctx, x - 9, monY + 1, 18, 5, '#0c4a6e');
    px(ctx, x - 7, monY + 2, 7 + pulse * 2, 1, '#38bdf8');
    px(ctx, x - 7, monY + 4, 11 - pulse, 1, '#FFD416');
  } else {
    px(ctx, x - 9, monY + 1, 18, 5, '#1e293b');
  }
  // Silver Mac Mini on top of desk!
  const macY = d.facing === 'up' ? y - 7 : y + 1;
  px(ctx, x + 14, macY, 7, 6, '#cbd5e1');
  px(ctx, x + 15, macY + 1, 5, 4, '#e2e8f0');
  px(ctx, x + 17, macY + 2, 1, 1, '#334155');
  // Keyboard & mouse
  const kbY = d.facing === 'up' ? y + 2 : y - 6;
  px(ctx, x - 9, kbY, 16, 4, '#111318');
  px(ctx, x + 10, kbY + 1, 3, 3, '#111318');
  // Small mug
  px(ctx, x - 21, kbY, 4, 4, '#ef4444');
}

function drawChair(ctx: CanvasRenderingContext2D, cx: number, cy: number, facing: Facing) {
  px(ctx, cx - 8, cy - 5, 16, 12, 'rgba(15, 20, 30, 0.18)');
  px(ctx, cx - 7, cy - 6, 14, 11, '#18181b');
  px(ctx, cx - 6, cy - 5, 12, 9, '#27272a');
  // Backrest bar depending on facing
  if (facing === 'up') px(ctx, cx - 7, cy + 3, 14, 4, '#111318');
  else if (facing === 'down') px(ctx, cx - 7, cy - 8, 14, 4, '#111318');
  else if (facing === 'left') px(ctx, cx + 4, cy - 6, 4, 12, '#111318');
  else px(ctx, cx - 8, cy - 6, 4, 12, '#111318');
}

function drawRoundStool(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  // Subtle floor shadow
  px(ctx, cx - 6, cy + 1, 12, 5, 'rgba(15, 20, 30, 0.22)');
  // Stool metal legs
  px(ctx, cx - 4, cy + 1, 2, 4, '#27272a');
  px(ctx, cx + 2, cy + 1, 2, 4, '#27272a');
  // Round wooden/dark seat cushion (pixel circle)
  px(ctx, cx - 5, cy - 4, 10, 8, '#18181b');
  px(ctx, cx - 6, cy - 3, 12, 6, '#18181b');
  px(ctx, cx - 4, cy - 3, 8, 6, '#b57b45');
  px(ctx, cx - 5, cy - 2, 10, 4, '#c99259');
  px(ctx, cx - 3, cy - 2, 4, 2, '#e2b483'); // highlight glint
}

/**
 * Draws a charming Stardew Valley-style 16x24 pixel-art character frame-by-frame!
 */
function drawPixelAgent(
  ctx: CanvasRenderingContext2D,
  agent: PixelAgent,
  meta: OfficeAvatarData | undefined,
  highlighted: boolean,
  time: number
) {
  const x = Math.round(agent.x);
  const y = Math.round(agent.y);
  const isWalking = agent.state === 'WALKING_TO_POI' || agent.state === 'WALKING_BACK';
  const isSitting = agent.state === 'WORKING';
  const effectiveGender = meta?.gender || agent.gender;

  // Golden CMS Jobdesk Highlight Ring (pulsing pixel oval!)
  if (highlighted) {
    const pulse = Math.sin(time * 6) * 0.25 + 0.75;
    ctx.strokeStyle = `rgba(255, 212, 22, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 12, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ground shadow
  px(ctx, x - 7, y + 4, 14, 4, 'rgba(20, 15, 10, 0.25)');

  // Walk cycle hop & leg stride (4-frame Stardew walk cycle!)
  const stride = isWalking ? [0, -1, 0, 1][agent.walkFrame % 4] : 0;
  const hop = isWalking && (agent.walkFrame % 2 === 1) ? -1 : 0;
  const breath = !isWalking && Math.floor(time * 2 + agent.index) % 2 === 0 ? 0 : 0;
  const by = y + hop + breath;

  // Legs / Shoes
  if (!isSitting) {
    px(ctx, x - 5, by + 1 + Math.max(0, stride), 4, 5, '#20242e');
    px(ctx, x + 1, by + 1 + Math.max(0, -stride), 4, 5, '#20242e');
    px(ctx, x - 5, by + 5 + Math.max(0, stride), 4, 2, '#0f1116');
    px(ctx, x + 1, by + 5 + Math.max(0, -stride), 4, 2, '#0f1116');
  } else {
    px(ctx, x - 5, by + 2, 10, 3, '#20242e');
  }

  // Dark formal blazer torso
  px(ctx, x - 6, by - 7, 12, 9, '#181b22');
  px(ctx, x - 5, by - 6, 10, 7, '#222631');

  // Front shirt & tie / Back yellow CTSO badge
  if (agent.facing === 'down') {
    px(ctx, x - 2, by - 7, 4, 5, '#f8fafc');
    if (effectiveGender === 'male' && agent.tieColor) {
      px(ctx, x - 1, by - 6, 2, 4, agent.tieColor);
    }
    px(ctx, x + 3, by - 5, 2, 2, '#FFD416'); // yellow CTSO chest badge
  } else if (agent.facing === 'up') {
    px(ctx, x - 2, by - 5, 4, 3, '#FFD416'); // yellow CTSO back badge
    px(ctx, x - 1, by - 4, 2, 1, '#181b22');
  }

  // Arms (typing wiggle / walking swing / carrying coffee cup)
  const typeWiggle = isSitting && agent.workSub === 'typing' ? (Math.floor(time * 9 + agent.index) % 2) : 0;
  const armL = isWalking ? -stride : (isSitting ? -typeWiggle : 0);
  const armR = isWalking ? stride : (isSitting ? typeWiggle : 0);
  px(ctx, x - 8, by - 6 + armL, 2, 6, '#181b22');
  px(ctx, x - 8, by - 1 + armL, 2, 2, agent.skin);
  px(ctx, x + 6, by - 6 + armR, 2, 6, '#181b22');
  px(ctx, x + 6, by - 1 + armR, 2, 2, agent.skin);

  // Held Coffee / Water Cup
  if (agent.hasDrink) {
    px(ctx, x + 7, by - 3, 4, 5, agent.hasDrink === 'water' ? '#7dd3fc' : '#f8fafc');
    if (agent.hasDrink === 'coffee') {
      px(ctx, x + 7, by - 1, 4, 2, '#b45309');
    }
  }

  // --- Stardew Valley Expressive Pixel Head (12x11) ---
  const hx = x - 6;
  const hy = by - 18;
  // Base head + warm outline
  px(ctx, hx - 1, hy, 14, 10, '#2a1c15'); // subtle dark pixel outline
  px(ctx, hx, hy - 1, 12, 12, '#2a1c15');
  px(ctx, hx, hy, 12, 10, agent.skin);

  // Hair & Face depending on facing direction
  if (agent.facing === 'up') {
    // Back of head covered in hair
    px(ctx, hx, hy, 12, 9, agent.hair);
    px(ctx, hx + 2, hy + 1, 8, 2, 'rgba(255,255,255,0.12)');
    if (effectiveGender === 'female') {
      px(ctx, hx, hy + 8, 12, 4, agent.hair);
    }
  } else if (agent.facing === 'left' || agent.facing === 'right') {
    const dir = agent.facing === 'right' ? 1 : -1;
    px(ctx, hx, hy, 12, 3, agent.hair);
    px(ctx, dir === 1 ? hx : hx + 7, hy + 3, 5, effectiveGender === 'female' ? 8 : 5, agent.hair);
    // Side eye
    const ex = dir === 1 ? hx + 8 : hx + 2;
    if (!agent.isBlinking) {
      px(ctx, ex, hy + 5, 2, 2, '#18181b');
      px(ctx, ex, hy + 5, 1, 1, '#ffffff');
    } else {
      px(ctx, ex, hy + 6, 2, 1, '#18181b');
    }
  } else {
    // Front facing: clearly visible Stardew face!
    px(ctx, hx, hy, 12, 3, agent.hair);
    px(ctx, hx, hy + 3, 2, effectiveGender === 'female' ? 7 : 3, agent.hair);
    px(ctx, hx + 10, hy + 3, 2, effectiveGender === 'female' ? 7 : 3, agent.hair);
    // Hair highlight
    px(ctx, hx + 2, hy + 1, 6, 1, 'rgba(255,255,255,0.18)');
    // Rosy cheeks
    if (effectiveGender === 'female') {
      px(ctx, hx + 1, hy + 7, 2, 1, '#f472b6');
      px(ctx, hx + 9, hy + 7, 2, 1, '#f472b6');
    }
    // Eyes
    if (agent.isBlinking) {
      px(ctx, hx + 2, hy + 6, 3, 1, '#18181b');
      px(ctx, hx + 7, hy + 6, 3, 1, '#18181b');
    } else {
      px(ctx, hx + 2, hy + 5, 3, 2, '#ffffff');
      px(ctx, hx + 7, hy + 5, 3, 2, '#ffffff');
      px(ctx, hx + 3, hy + 5, 2, 2, '#1e1b18');
      px(ctx, hx + 7, hy + 5, 2, 2, '#1e1b18');
      px(ctx, hx + 3, hy + 5, 1, 1, '#ffffff');
      px(ctx, hx + 7, hy + 5, 1, 1, '#ffffff');
    }
    // Optional pixel glasses
    if (agent.glasses) {
      px(ctx, hx + 2, hy + 4, 3, 1, '#1e293b');
      px(ctx, hx + 7, hy + 4, 3, 1, '#1e293b');
      px(ctx, hx + 5, hy + 5, 2, 1, '#1e293b');
    }
    // Smile
    px(ctx, hx + 5, hy + 8, 2, 1, '#a85548');
  }

  // Crisp HD names & status bubbles are rendered on the Retina HTML overlay layer
  // so they stay 100% razor-sharp while the pixel-art world remains crisp pixelated!
  void meta;
}

/**
 * Renders Stage 1: Kantor Utama (Badung) in Stardew Valley 2D Pixel Art!
 */
function renderMainOfficePixel(
  ctx: CanvasRenderingContext2D,
  agents: PixelAgent[],
  slots: Array<OfficeAvatarData | null>,
  selectedJobdesk: string | null,
  tvStats: OfficeTVStats,
  time: number
) {
  // Warm Stardew tiled floor
  for (let ty = 24; ty < MAIN_H - 12; ty += 16) {
    for (let tx = 12; tx < MAIN_W - 12; tx += 16) {
      const alt = ((tx / 16 + ty / 16) % 2) === 0;
      px(ctx, tx, ty, 16, 16, alt ? '#e9e2d0' : '#e2dac6');
      px(ctx, tx, ty, 16, 1, 'rgba(130, 115, 95, 0.16)');
      px(ctx, tx, ty, 1, 16, 'rgba(130, 115, 95, 0.16)');
    }
  }

  // Accent cozy rug on left corridor
  px(ctx, 26, 108, 44, 62, '#c8d4e0');
  px(ctx, 29, 111, 38, 56, '#d8e2ec');

  // --- Back Wall (Top: 2 outer windows + solid center with BIG CTSO Live TV!) ---
  px(ctx, 0, 0, MAIN_W, 30, '#d8d0c0');
  px(ctx, 0, 28, MAIN_W, 4, '#a69d8c'); // baseboard trim

  // Outer windows behind PC 1 & PC 4
  for (const wx of [22, 290]) {
    px(ctx, wx, 4, 72, 20, '#334155');
    px(ctx, wx + 2, 6, 68, 16, '#bae6fd');
    px(ctx, wx + 6, 8, 22, 4, 'rgba(255,255,255,0.55)'); // sunlit glass glint
    px(ctx, wx + 35, 4, 2, 20, '#334155');
    // Soft diagonal sunlight beam on floor!
    ctx.fillStyle = 'rgba(255, 248, 205, 0.22)';
    ctx.fillRect(wx + 4, 32, 64, 26);
  }

  // Large Wall TV above PC 2 & PC 3 (Animated NOC / Operational Monitoring Dashboard!)
  // Subtle ambient screen glow onto wall/floor below
  const glowAlpha = 0.09 + Math.sin(time * 2.5) * 0.025;
  ctx.fillStyle = `rgba(56, 189, 248, ${glowAlpha})`;
  ctx.fillRect(114, 27, 156, 6);

  // TV Bezel & Dark Monitoring Screen
  px(ctx, 115, 2, 154, 26, '#0b1120');
  px(ctx, 117, 4, 150, 22, '#060c18');

  // Top Status Bar on TV
  px(ctx, 117, 4, 150, 4, '#111c33');
  px(ctx, 117, 4, 3, 4, '#FFD416');
  // Pulsing LIVE indicator LED
  const liveOn = Math.floor(time * 3) % 2 === 0;
  px(ctx, 122, 5, 2, 2, liveOn ? '#22c55e' : '#14532d');
  // Mini pixel header label bars (simulated NOC header text)
  px(ctx, 126, 5, 16, 2, '#FFD416');
  px(ctx, 145, 5, 12, 2, '#94a3b8');
  px(ctx, 160, 5, 9, 2, '#38bdf8');
  // Top-right mini alert/link LEDs
  px(ctx, 250, 5, 2, 2, '#22c55e');
  px(ctx, 254, 5, 2, 2, '#22c55e');
  px(ctx, 258, 5, 2, 2, Math.floor(time * 4) % 5 === 0 ? '#facc15' : '#22c55e');
  px(ctx, 262, 5, 2, 2, liveOn ? '#38bdf8' : '#0284c7');

  // --- Panel 1 (Left): Real-Time Scrolling Network / Traffic Waveform ---
  const gx = 119;
  const gy = 10;
  const gw = 58;
  const gh = 14;
  px(ctx, gx, gy, gw, gh, '#0a1426');
  // Subtle grid lines
  px(ctx, gx, gy + 4, gw, 1, '#12243f');
  px(ctx, gx, gy + 9, gw, 1, '#12243f');
  const waveTick = Math.floor(time * 10);
  for (let i = 0; i < gw - 2; i += 2) {
    const sampleIdx = waveTick + i * 0.5;
    // Primary cyan traffic wave
    const v1 =
      Math.sin(sampleIdx * 0.35) * 3.2 +
      Math.cos(sampleIdx * 0.78) * 1.8 +
      (Math.sin(sampleIdx * 1.9) > 0.82 ? 2.4 : 0);
    const h1 = Math.max(2, Math.min(gh - 2, Math.round(6 + v1)));
    const barColor = h1 >= gh - 3 ? '#FFD416' : '#38bdf8';
    px(ctx, gx + 1 + i, gy + gh - h1, 2, h1, 'rgba(56, 189, 248, 0.22)');
    px(ctx, gx + 1 + i, gy + gh - h1, 2, 1, barColor);

    // Secondary green latency/uptime wave
    const v2 = Math.sin(sampleIdx * 0.25 + 2.1) * 2.2 + Math.cos(sampleIdx * 0.55) * 1.2;
    const h2 = Math.max(1, Math.min(gh - 4, Math.round(4 + v2)));
    px(ctx, gx + 1 + i, gy + gh - h2, 2, 1, '#22c55e');
  }
  // Bright live cursor pixel on right edge of waveform
  px(ctx, gx + gw - 2, gy + 5 + Math.round(Math.sin(time * 6) * 3), 2, 2, '#f8fafc');

  // --- Panel 2 (Center): Node / Server Health Matrix + Live Load Bar ---
  const nx = 180;
  const ny = 10;
  px(ctx, nx, ny, 40, 14, '#0a1426');
  // 4x2 server node status blocks
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const nodeId = row * 4 + col;
      const phase = Math.floor(time * 2.2 + nodeId * 1.7) % 11;
      let nodeColor = '#22c55e'; // healthy green
      if (phase === 0) nodeColor = '#facc15'; // brief warning/check
      else if (phase === 5) nodeColor = '#38bdf8'; // syncing blue
      px(ctx, nx + 2 + col * 9, ny + 2 + row * 4, 7, 3, nodeColor);
      px(ctx, nx + 2 + col * 9, ny + 2 + row * 4, 2, 1, 'rgba(255,255,255,0.45)');
    }
  }
  // Animated horizontal CPU / throughput meter below node matrix
  px(ctx, nx + 2, ny + 11, 36, 2, '#1e293b');
  const loadW = 14 + Math.round((Math.sin(time * 1.8) * 0.5 + 0.5) * 18);
  px(ctx, nx + 2, ny + 11, loadW, 2, loadW > 27 ? '#FFD416' : '#38bdf8');

  // --- Panel 3 (Right): Animated Real-Time Telemetry Bar Chart ---
  const bx = 223;
  const by = 10;
  px(ctx, bx, by, 42, 14, '#0a1426');
  const baseBars = tvStats.jobdeskBars.slice(0, 6);
  for (let idx = 0; idx < 6; idx++) {
    const baseCount = baseBars[idx]?.count ?? ((idx % 3) + 1);
    const wave = Math.sin(time * 3.2 + idx * 1.15) * 2.5 + Math.cos(time * 1.7 + idx) * 1.2;
    const bh = Math.max(2, Math.min(11, Math.round(3 + baseCount * 1.6 + wave)));
    const barX = bx + 2 + idx * 6 + (idx > 2 ? 1 : 0);
    const col = idx % 3 === 0 ? '#FFD416' : idx % 3 === 1 ? '#38bdf8' : '#22c55e';
    px(ctx, barX, by + 13 - bh, 4, bh, col);
    // Peak cap pixel
    px(ctx, barX, by + 12 - bh, 4, 1, '#f8fafc');
  }

  // Subtle CRT/LCD horizontal scanline sweep
  const scanY = 4 + (Math.floor(time * 8) % 22);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(117, scanY, 150, 1);

  // TV Power LED on bottom bezel
  px(ctx, 263, 27, 2, 1, liveOn ? '#22c55e' : '#15803d');

  // --- Right Wall (Frosted/Glass Windows) ---
  px(ctx, MAIN_W - 14, 0, 14, MAIN_H, '#d8d0c0');
  for (let wy = 34; wy < MAIN_H - 36; wy += 48) {
    px(ctx, MAIN_W - 12, wy, 10, 40, '#334155');
    px(ctx, MAIN_W - 10, wy + 2, 6, 36, '#bae6fd');
  }

  // --- Left border trim with Exit Doorway (to Toilet / Hallway) ---
  px(ctx, 0, 0, 12, 130, '#c5bca9');
  px(ctx, 0, 158, 12, MAIN_H - 158, '#c5bca9');
  // Doorway jambs & welcome mat
  px(ctx, 0, 128, 12, 3, '#78716c');
  px(ctx, 0, 157, 12, 3, '#78716c');
  px(ctx, 0, 131, 12, 26, '#e2dac6');
  px(ctx, 2, 135, 8, 18, '#94a3b8');
  px(ctx, 3, 137, 6, 14, '#cbd5e1');

  // --- Bottom Wall (Plain wall with Animated AC Unit!) ---
  px(ctx, 0, MAIN_H - 14, MAIN_W, 14, '#c5bca9');
  px(ctx, 166, MAIN_H - 12, 52, 10, '#f8fafc');
  px(ctx, 168, MAIN_H - 4, 48, 2, '#1e293b');
  px(ctx, 212, MAIN_H - 10, 3, 2, '#22c55e');
  // Cool pixel AC air wisps drifting up
  for (let i = 0; i < 3; i++) {
    const t = (time * 1.4 + i * 0.33) % 1;
    ctx.fillStyle = `rgba(186, 230, 253, ${Math.sin(t * Math.PI) * 0.55})`;
    ctx.fillRect(176 + i * 14, MAIN_H - 15 - t * 14, 6, 2);
  }

  // --- Potted Plants in 4 corners ---
  drawPixelPlant(ctx, 22, 42);
  drawPixelPlant(ctx, MAIN_W - 24, 42);
  drawPixelPlant(ctx, 22, MAIN_H - 24);
  drawPixelPlant(ctx, MAIN_W - 24, MAIN_H - 24);

  // --- Central Wooden Coffee & Bags Cabinet + Water Dispenser ---
  // Dispenser on left end of cabinet
  px(ctx, 97, 114, 15, 22, 'rgba(20, 15, 10, 0.2)');
  px(ctx, 98, 113, 13, 20, '#f8fafc');
  px(ctx, 100, 110, 9, 8, '#38bdf8'); // blue 19L gallon
  px(ctx, 102, 111, 3, 4, '#bae6fd');
  px(ctx, 101, 124, 2, 2, '#ef4444'); // hot tap
  px(ctx, 106, 124, 2, 2, '#3b82f6'); // cold tap

  // Long warm wooden coffee cabinet
  px(ctx, 114, 115, 212, 22, 'rgba(25, 15, 5, 0.22)');
  px(ctx, 114, 112, 212, 20, '#b57b45');
  px(ctx, 116, 114, 208, 16, '#c99259');
  // Espresso coffee machine + pixel steam!
  px(ctx, 148, 114, 18, 14, '#18181b');
  px(ctx, 150, 116, 14, 5, '#94a3b8');
  px(ctx, 154, 122, 6, 5, '#451a03'); // coffee carafe
  for (let s = 0; s < 3; s++) {
    const st = (time * 1.1 + s * 0.33) % 1;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.sin(st * Math.PI) * 0.65})`;
    ctx.fillRect(156 + Math.round(Math.sin(time * 4 + s) * 2), Math.round(112 - st * 12), 2, 2);
  }
  // Coffee cups + kettle + work bags on cabinet
  px(ctx, 174, 119, 4, 4, '#f8fafc');
  px(ctx, 180, 119, 4, 4, '#f8fafc');
  px(ctx, 204, 116, 9, 10, '#cbd5e1');
  px(ctx, 252, 115, 14, 12, '#7c2d12'); // leather briefcase
  px(ctx, 256, 113, 6, 2, '#1e293b');
  px(ctx, 276, 115, 13, 13, '#1d4ed8'); // backpack
  px(ctx, 298, 116, 14, 11, '#1e293b'); // dark work bag

  // --- Draw All 11 PC Desks & Chairs (PIC mapped) + 3 Round Stools beside Dispenser ---
  MAIN_DESKS.forEach((desk, idx) => {
    if (desk.isStool) {
      drawRoundStool(ctx, desk.sitX, desk.sitY);
    } else {
      drawChair(ctx, desk.sitX, desk.sitY, desk.facing);
      const active = Boolean(slots[idx]) && agents[idx].state === 'WORKING';
      drawMainDesk(ctx, desk, active, time);
    }
  });

  // --- Draw Active Agents sorted by Y (proper 2D top-down depth!) ---
  const visibleAgents = agents
    .map((agent, idx) => ({ agent, meta: slots[idx] ?? undefined }))
    .filter((item) => Boolean(item.meta) && item.agent.x > -10 && item.agent.x < MAIN_W + 10)
    .sort((a, b) => a.agent.y - b.agent.y);

  for (const { agent, meta } of visibleAgents) {
    const isHighlighted = Boolean(selectedJobdesk && meta && meta.jobdeskCode === selectedJobdesk);
    drawPixelAgent(ctx, agent, meta, isHighlighted, time);
  }
}

/**
 * Renders Stage 2: Ruang Kayu (Denpasar) in Stardew Valley 2D Pixel Art!
 */
function renderWoodStudioPixel(
  ctx: CanvasRenderingContext2D,
  agents: PixelAgent[],
  roster: OfficeAvatarData[],
  selectedJobdesk: string | null,
  time: number
) {
  // Rich warm walnut wood-plank pixel floor (filled edge-to-edge with zero empty gaps!)
  const plankColors = ['#8a5d3b', '#7f5333', '#936542', '#835737'];
  const floorLeft = 16;
  const floorRight = STUDIO_W - 18;
  for (let py = 54; py < STUDIO_H - 14; py += 12) {
    const row = Math.floor(py / 12);
    const offset = (row % 2) * 24;
    const plankH = Math.min(12, STUDIO_H - 14 - py);
    for (let pxX = floorLeft - offset; pxX < floorRight; pxX += 48) {
      const drawX = Math.max(floorLeft, pxX);
      const drawEnd = Math.min(floorRight, pxX + 48);
      const drawW = drawEnd - drawX;
      if (drawW <= 0) continue;
      const colIdx = Math.abs(row + Math.floor((pxX - floorLeft + 48) / 48)) % plankColors.length;
      px(ctx, drawX, py, drawW, plankH, plankColors[colIdx]);
      px(ctx, drawX, py + plankH - 1, drawW, 1, 'rgba(45, 24, 10, 0.35)');
      if (pxX >= floorLeft) {
        px(ctx, drawX, py, 1, plankH, 'rgba(45, 24, 10, 0.28)');
      }
    }
  }

  // --- Top Built-in Walnut Cabinet Wall (exact match to user's photo!) ---
  px(ctx, 16, 4, STUDIO_W - 32, 54, '#6d4428');
  // Left tall wardrobe + twin black handles
  px(ctx, 20, 8, 48, 48, '#7c4e2f');
  px(ctx, 41, 24, 2, 12, '#111318');
  px(ctx, 45, 24, 2, 12, '#111318');
  // Right tall wardrobe + twin black handles
  px(ctx, STUDIO_W - 68, 8, 48, 48, '#7c4e2f');
  px(ctx, STUDIO_W - 47, 24, 2, 12, '#111318');
  px(ctx, STUDIO_W - 43, 24, 2, 12, '#111318');

  // Center recessed beige niche + slatted dark wood AC vent on top
  px(ctx, 72, 18, STUDIO_W - 144, 28, '#ddd0be');
  px(ctx, 106, 8, 108, 10, '#2b1a0e');
  for (let gx = 108; gx < 212; gx += 5) {
    px(ctx, gx, 8, 2, 10, '#5a3820');
  }
  // Open shelving towers on both sides of niche
  for (const sx of [72, STUDIO_W - 96]) {
    px(ctx, sx, 18, 24, 28, '#6d4428');
    for (const sy of [20, 29, 38]) {
      px(ctx, sx + 2, sy, 20, 7, '#54321c');
    }
  }
  // Lower walnut credenza + white countertop
  px(ctx, 72, 46, STUDIO_W - 144, 12, '#7c4e2f');
  px(ctx, 72, 45, STUDIO_W - 144, 3, '#f8fafc');
  // Water bottle & black backpack on white counter
  px(ctx, 126, 37, 5, 9, '#94a3b8');
  px(ctx, 127, 36, 3, 2, '#334155');
  px(ctx, 186, 34, 12, 12, '#18181b');
  px(ctx, 188, 38, 8, 5, '#27272a');

  // --- Left Wall: Black-Framed Frosted Sliding Glass Wall ---
  px(ctx, 4, 4, 14, STUDIO_H - 18, '#111318');
  for (let gy = 10; gy < STUDIO_H - 22; gy += 34) {
    px(ctx, 6, gy, 10, 30, '#e8eef5');
    px(ctx, 8, gy + 3, 3, 22, 'rgba(255,255,255,0.65)');
  }

  // --- Right Wall: Frosted Glass Wall + Entrance/Exit Doorway (y = 144..182) ---
  const rightWallX = STUDIO_W - 18;
  // Upper section above door
  px(ctx, rightWallX, 4, 14, 140, '#111318');
  for (let gy = 10; gy < 138; gy += 34) {
    px(ctx, rightWallX + 2, gy, 10, 30, '#e8eef5');
    px(ctx, rightWallX + 4, gy + 3, 3, 22, 'rgba(255,255,255,0.65)');
  }
  // Lower section below door
  px(ctx, rightWallX, 182, 14, STUDIO_H - 196, '#111318');
  px(ctx, rightWallX + 2, 186, 10, STUDIO_H - 204, '#e8eef5');
  px(ctx, rightWallX + 4, 188, 3, Math.max(8, STUDIO_H - 210), 'rgba(255,255,255,0.65)');
  // Right Doorway (open wooden threshold + frame jambs + doormat + door leaf)
  px(ctx, rightWallX, 142, 14, 3, '#3b2415'); // top door jamb
  px(ctx, rightWallX, 181, 14, 3, '#3b2415'); // bottom door jamb
  px(ctx, rightWallX, 145, 14, 36, '#8a5d3b'); // wood floor threshold
  px(ctx, rightWallX + 2, 149, 10, 28, '#54321c'); // dark walnut doormat border
  px(ctx, rightWallX + 3, 151, 8, 24, '#7c4e2f'); // doormat inner
  px(ctx, rightWallX + 11, 145, 3, 36, '#18181b'); // sliding door edge
  px(ctx, rightWallX + 9, 160, 2, 6, '#FFD416'); // brass/gold door handle

  // --- Bottom Wall: Matching Warm Walnut Wood Panel Wall ---
  px(ctx, 4, STUDIO_H - 14, STUDIO_W - 8, 14, '#6d4428');
  px(ctx, 4, STUDIO_H - 14, STUDIO_W - 8, 3, '#472a16'); // crisp baseboard top trim
  px(ctx, 8, STUDIO_H - 10, STUDIO_W - 16, 8, '#7c4e2f'); // recessed walnut panel
  for (let wx = 44; wx < STUDIO_W - 24; wx += 48) {
    px(ctx, wx, STUDIO_H - 10, 2, 8, '#54321c'); // vertical wood panel seams
  }

  // --- Center Shared Warm Solid-Wood Table (4 seats facing 2x2) ---
  px(ctx, 120, 98, 84, 92, 'rgba(25, 14, 5, 0.25)');
  px(ctx, 122, 96, 76, 88, '#965c2e');
  px(ctx, 124, 98, 72, 84, '#b3743e');
  // Subtle wood grain lines on table
  for (let ty = 104; ty < 180; ty += 12) {
    px(ctx, 126, ty, 68, 1, 'rgba(80, 42, 15, 0.22)');
  }

  // Draw 4 headrest chairs + 4 monitors + Mac Minis
  STUDIO_DESKS.forEach((d, idx) => {
    drawChair(ctx, d.sitX, d.sitY, d.facing);
    // Dark draped jacket on chair #4 (index 3)
    if (idx === 3) {
      px(ctx, d.sitX - 9, d.sitY - 6, 4, 12, '#272b36');
    }

    const active = idx < roster.length && agents[idx].state === 'WORKING';
    const isLeft = d.facing === 'right';
    const monX = isLeft ? d.x + 12 : d.x - 20;
    const kbX = isLeft ? d.x - 4 : d.x + 1;

    // Monitor
    px(ctx, monX, d.y - 10, 8, 20, '#0f172a');
    if (active) {
      const pulse = Math.floor(time * 4 + idx) % 3;
      px(ctx, monX + 1, d.y - 8, 6, 16, '#0c4a6e');
      px(ctx, monX + 2, d.y - 6 + pulse * 3, 4, 2, '#FFD416');
      px(ctx, monX + 2, d.y + 1, 4, 4, '#38bdf8');
    }
    // Keyboard & mouse
    px(ctx, kbX, d.y - 7, 5, 14, '#111318');
    px(ctx, kbX + 1, d.y + 9, 3, 3, '#111318');
    // Silver Mac Mini
    px(ctx, isLeft ? d.x + 3 : d.x - 10, d.y - 13, 6, 6, '#e2e8f0');
    px(ctx, isLeft ? d.x + 5 : d.x - 8, d.y - 11, 2, 2, '#334155');
  });

  // --- Draw Active Studio Agents sorted by Y ---
  const visibleAgents = agents
    .map((agent, idx) => ({ agent, meta: roster[idx] }))
    .filter((item) => Boolean(item.meta))
    .sort((a, b) => a.agent.y - b.agent.y);

  for (const { agent, meta } of visibleAgents) {
    const isHighlighted = Boolean(selectedJobdesk && meta && meta.jobdeskCode === selectedJobdesk);
    drawPixelAgent(ctx, agent, meta, isHighlighted, time);
  }
}

export const PixelOfficeStage: React.FC<PixelOfficeStageProps> = ({
  resetCounter,
  mainRoster,
  studioRoster,
  selectedJobdesk,
  tvStats,
}) => {
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainLabelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const studioLabelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mainStatusRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const studioStatusRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const mainSlots = useMemo(() => assignMainDeskSlots(mainRoster), [mainRoster]);
  const mainSlotsRef = useRef(mainSlots);
  const studioRosterRef = useRef(studioRoster);
  const selectedJobdeskRef = useRef(selectedJobdesk);
  const tvStatsRef = useRef(tvStats);

  mainSlotsRef.current = mainSlots;
  studioRosterRef.current = studioRoster;
  selectedJobdeskRef.current = selectedJobdesk;
  tvStatsRef.current = tvStats;

  const [inspectedMain, setInspectedMain] = useState<(OfficeAvatarData & { status: string }) | null>(null);
  const [inspectedStudio, setInspectedStudio] = useState<(OfficeAvatarData & { status: string }) | null>(null);
  const [mainZoom, setMainZoom] = useState(1);
  const [studioZoom, setStudioZoom] = useState(1);
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * CTSO_TEAM_QUOTES.length));

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuoteIdx((prev) => (prev + 1) % CTSO_TEAM_QUOTES.length);
    }, 10000);
    return () => window.clearTimeout(t);
  }, [quoteIdx]);

  useEffect(() => {
    if (resetCounter > 0) {
      setMainZoom(1);
      setStudioZoom(1);
      setInspectedMain(null);
      setInspectedStudio(null);
    }
  }, [resetCounter]);

  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    const studioCanvas = studioCanvasRef.current;
    if (!mainCanvas || !studioCanvas) return;

    mainCanvas.width = MAIN_W;
    mainCanvas.height = MAIN_H;
    studioCanvas.width = STUDIO_W;
    studioCanvas.height = STUDIO_H;

    const mainCtx = mainCanvas.getContext('2d');
    const studioCtx = studioCanvas.getContext('2d');
    if (!mainCtx || !studioCtx) return;

    mainCtx.imageSmoothingEnabled = false;
    studioCtx.imageSmoothingEnabled = false;

    const mainAgents = createAgents('main', MAIN_DESKS);
    const studioAgents = createAgents('studio', STUDIO_DESKS);
    const allAgents = [...mainAgents, ...studioAgents];

    // Kick off initial activity right away
    const kickTimer = window.setTimeout(() => {
      const firstActiveMainIdx = mainSlotsRef.current.findIndex((s) => Boolean(s));
      if (firstActiveMainIdx >= 0) {
        const a = mainAgents[firstActiveMainIdx];
        a.currentPOI = MAIN_POIS[0];
        a.waypoints = buildPixelPath('main', { x: a.x, y: a.y }, MAIN_POIS[0], a.desk.aisleY, 94);
        a.wpIndex = 0;
        a.state = 'WALKING_TO_POI';
      }
      if (studioRosterRef.current.length > 0) {
        const s = studioAgents[0];
        s.currentPOI = STUDIO_POIS[0];
        s.waypoints = buildPixelPath('studio', { x: s.x, y: s.y }, STUDIO_POIS[0], s.desk.aisleY, 86);
        s.wpIndex = 0;
        s.state = 'WALKING_TO_POI';
      }
    }, 600);

    const getStatusLabel = (a: PixelAgent) => {
      if (a.state === 'WORKING') return a.workSub === 'sip' ? 'Minum Kopi/Air' : 'Bekerja';
      if (a.state === 'AT_POI') return a.currentPOI?.label || 'Istirahat';
      if (a.state === 'WALKING_BACK') {
        if (a.currentPOI?.id === 'toilet') return 'Kembali dari Toilet';
        return a.hasDrink ? 'Bawa Minuman ke Meja' : 'Kembali ke Meja';
      }
      return a.currentPOI ? `Menuju ${a.currentPOI.label}` : 'Berjalan';
    };

    const handleCanvasClick = (
      ev: MouseEvent,
      canvas: HTMLCanvasElement,
      logicalW: number,
      logicalH: number,
      agents: PixelAgent[],
      slots: Array<OfficeAvatarData | null | undefined>,
      setter: React.Dispatch<React.SetStateAction<(OfficeAvatarData & { status: string }) | null>>
    ) => {
      const rect = canvas.getBoundingClientRect();
      const lx = ((ev.clientX - rect.left) / rect.width) * logicalW;
      const ly = ((ev.clientY - rect.top) / rect.height) * logicalH;

      let closestIdx = -1;
      let bestDist = 20;
      agents.forEach((a, idx) => {
        if (!slots[idx]) return;
        const d = Math.hypot(a.x - lx, (a.y - 6) - ly);
        if (d < bestDist) {
          bestDist = d;
          closestIdx = idx;
        }
      });

      const found = closestIdx >= 0 ? slots[closestIdx] : null;
      if (found) {
        setter({ ...found, status: getStatusLabel(agents[closestIdx]) });
      } else {
        setter(null);
      }
    };

    const onMainClick = (e: MouseEvent) =>
      handleCanvasClick(e, mainCanvas, MAIN_W, MAIN_H, mainAgents, mainSlotsRef.current, setInspectedMain);
    const onStudioClick = (e: MouseEvent) =>
      handleCanvasClick(e, studioCanvas, STUDIO_W, STUDIO_H, studioAgents, studioRosterRef.current, setInspectedStudio);

    mainCanvas.addEventListener('click', onMainClick);
    studioCanvas.addEventListener('click', onStudioClick);

    const updateAgent = (a: PixelAgent, dt: number, activeList: PixelAgent[], maxAway: number) => {
      a.stateTimer += dt;

      // Blink timer
      a.blinkTimer -= dt;
      if (a.blinkTimer <= 0) {
        a.isBlinking = a.blinkTimer > -0.14;
        if (a.blinkTimer <= -0.14) a.blinkTimer = 2.4 + Math.random() * 3.5;
      }

      if (a.state === 'WORKING') {
        a.x = a.desk.sitX;
        a.y = a.desk.sitY;
        a.facing = a.desk.facing;

        if (a.hasDrink) {
          a.drinkTimer -= dt;
          if (a.drinkTimer <= 0) a.hasDrink = null;
        }

        a.workSubTimer -= dt;
        if (a.workSubTimer <= 0) {
          const r = Math.random();
          if (a.hasDrink && r < 0.35) a.workSub = 'sip';
          else if (r < 0.7) a.workSub = 'typing';
          else a.workSub = 'mouse';
          a.workSubTimer = 3 + Math.random() * 4;
        }

        if (a.stateTimer >= a.workDuration && !a.isChatHost) {
          const awayCount = activeList.filter((x) => x.state !== 'WORKING').length;
          if (awayCount < maxAway) {
            const pois = a.room === 'studio' ? STUDIO_POIS : MAIN_POIS;
            let poi = pois[Math.floor(Math.random() * pois.length)];

            // In Badung: "Diskusi Tim" involves 2 people — 1 stays seated at desk, 1 walks over to their desk!
            if (a.room === 'main' && poi.id === 'chat') {
              const candidates = activeList.filter(
                (p) => p.index !== a.index && p.state === 'WORKING' && p.chatPartnerIdx === null
              );
              if (candidates.length > 0) {
                const partner = candidates[Math.floor(Math.random() * candidates.length)];
                const standOnLeft = partner.desk.sitX > 280;
                const standX = standOnLeft ? partner.desk.sitX - 20 : partner.desk.sitX + 20;
                const standY = partner.desk.sitY + (partner.desk.facing === 'up' ? 3 : -3);
                const chatPoi: PixelPOI = {
                  id: 'chat',
                  label: 'Diskusi Tim',
                  x: standX,
                  y: standY,
                  facing: standOnLeft ? 'right' : 'left',
                  icon: '💬',
                };
                a.chatPartnerIdx = partner.index;
                a.isChatHost = false;
                partner.chatPartnerIdx = a.index;
                partner.isChatHost = true;
                a.currentPOI = chatPoi;
                a.hasDrink = null;
                a.waypoints = buildPixelPath(
                  'main',
                  { x: a.desk.aisleX, y: a.desk.aisleY },
                  chatPoi,
                  a.desk.aisleY,
                  partner.desk.aisleY
                );
                a.wpIndex = 0;
                a.state = 'WALKING_TO_POI';
                a.stateTimer = 0;
                a.workDuration = 10 + Math.random() * 14;
                return;
              } else {
                // Fallback to non-chat POI if no seated coworker is available
                const nonChat = pois.filter((p) => p.id !== 'chat');
                poi = nonChat[Math.floor(Math.random() * nonChat.length)];
              }
            }

            a.currentPOI = poi;
            a.hasDrink = null;
            const toAisle = a.room === 'studio' ? 86 : (poi.y < 140 ? 94 : 184);
            a.waypoints = buildPixelPath(a.room, { x: a.desk.aisleX, y: a.desk.aisleY }, poi, a.desk.aisleY, toAisle);
            a.wpIndex = 0;
            a.state = 'WALKING_TO_POI';
            a.stateTimer = 0;
            a.workDuration = 10 + Math.random() * 14;
          } else {
            a.stateTimer = a.workDuration - 2.5;
          }
        }
      } else if (a.state === 'WALKING_TO_POI' || a.state === 'WALKING_BACK') {
        const target = a.waypoints[a.wpIndex];
        if (!target) {
          if (a.state === 'WALKING_TO_POI') {
            a.state = 'AT_POI';
            a.stateTimer = 0;
            a.breakDuration = 4 + Math.random() * 4;
            if (a.currentPOI) a.facing = a.currentPOI.facing;
          } else {
            a.state = 'WORKING';
            a.stateTimer = 0;
            a.currentPOI = null;
            a.x = a.desk.sitX;
            a.y = a.desk.sitY;
            a.facing = a.desk.facing;
          }
          return;
        }

        const dx = target.x - a.x;
        const dy = target.y - a.y;
        const dist = Math.hypot(dx, dy);
        const speed = 42; // crisp Stardew pixel walk speed (px/sec)

        if (dist < 2.2) {
          a.x = target.x;
          a.y = target.y;
          a.wpIndex++;
        } else {
          a.x += (dx / dist) * speed * dt;
          a.y += (dy / dist) * speed * dt;
          if (Math.abs(dx) > Math.abs(dy)) {
            a.facing = dx > 0 ? 'right' : 'left';
          } else {
            a.facing = dy > 0 ? 'down' : 'up';
          }
        }

        // Frame-by-frame walk animation (6 FPS crisp pixel stride!)
        a.walkAccum += dt;
        if (a.walkAccum >= 0.16) {
          a.walkAccum = 0;
          a.walkFrame = (a.walkFrame + 1) % 4;
        }
      } else if (a.state === 'AT_POI') {
        if (a.currentPOI?.givesDrink && !a.hasDrink && a.stateTimer > 1.5) {
          a.hasDrink = a.currentPOI.givesDrink;
          a.drinkTimer = 24;
        }
        if (a.stateTimer >= a.breakDuration) {
          // Release 2-person chat partner if this was a desk discussion
          if (a.chatPartnerIdx !== null) {
            const partner = activeList.find((p) => p.index === a.chatPartnerIdx);
            if (partner) {
              partner.chatPartnerIdx = null;
              partner.isChatHost = false;
            }
            a.chatPartnerIdx = null;
            a.isChatHost = false;
          }
          if (a.currentPOI?.id === 'toilet') {
            if (a.room === 'main') {
              a.waypoints = [
                { x: 44, y: 144 },
                { x: 44, y: a.desk.aisleY },
                { x: a.desk.aisleX, y: a.desk.aisleY },
                { x: a.desk.sitX, y: a.desk.sitY },
              ];
            } else {
              a.waypoints = [
                { x: 256, y: 162 },
                { x: 256, y: 196 },
                { x: a.desk.aisleX, y: 196 },
                { x: a.desk.aisleX, y: a.desk.aisleY },
                { x: a.desk.sitX, y: a.desk.sitY },
              ];
            }
          } else {
            const fromAisle = a.room === 'studio' ? 86 : (a.y < 140 ? 94 : 184);
            a.waypoints = buildPixelPath(
              a.room,
              { x: a.x, y: a.y },
              { x: a.desk.sitX, y: a.desk.sitY },
              fromAisle,
              a.desk.aisleY
            );
          }
          a.wpIndex = 0;
          a.state = 'WALKING_BACK';
          a.stateTimer = 0;
        }
      }
    };

    const sendToToilet = (activeList: PixelAgent[], room: 'main' | 'studio') => {
      const workingPool = activeList.filter((a) => a.state === 'WORKING' && !a.isChatHost);
      if (workingPool.length === 0) return false;
      const chosen = workingPool[Math.floor(Math.random() * workingPool.length)];
      chosen.hasDrink = null;
      chosen.stateTimer = 0;
      chosen.breakDuration = 6; // stays outside in toilet for 6 seconds
      if (room === 'main') {
        chosen.currentPOI = MAIN_TOILET_POI;
        chosen.waypoints = [
          { x: chosen.desk.aisleX, y: chosen.desk.aisleY },
          { x: 44, y: chosen.desk.aisleY },
          { x: 44, y: 144 },
          { x: MAIN_TOILET_POI.x, y: MAIN_TOILET_POI.y },
        ];
      } else {
        chosen.currentPOI = STUDIO_TOILET_POI;
        chosen.waypoints = [
          { x: chosen.desk.aisleX, y: chosen.desk.aisleY },
          { x: chosen.desk.aisleX, y: 196 },
          { x: 256, y: 196 },
          { x: 256, y: 162 },
          { x: STUDIO_TOILET_POI.x, y: STUDIO_TOILET_POI.y },
        ];
      }
      chosen.wpIndex = 0;
      chosen.state = 'WALKING_TO_POI';
      return true;
    };

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    // 1x per 60 seconds toilet trip per room (first trip after 18s so visible quickly, then every 60s)
    let mainToiletTimer = 18;
    let studioToiletTimer = 32;

    const loop = (now: number) => {
      rafId = window.requestAnimationFrame(loop);
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      elapsed += dt;

      const activeMain = mainAgents.filter((_, idx) => Boolean(mainSlotsRef.current[idx]));
      const activeStudio = studioAgents.slice(0, studioRosterRef.current.length);

      // Scheduled 1x/minute toilet break (avatar exits room and returns)
      mainToiletTimer -= dt;
      if (mainToiletTimer <= 0) {
        if (sendToToilet(activeMain, 'main')) {
          mainToiletTimer = 60;
        } else {
          mainToiletTimer = 5;
        }
      }
      studioToiletTimer -= dt;
      if (studioToiletTimer <= 0) {
        if (sendToToilet(activeStudio, 'studio')) {
          studioToiletTimer = 60;
        } else {
          studioToiletTimer = 5;
        }
      }

      for (const a of activeMain) updateAgent(a, dt, activeMain, 3);
      for (const a of activeStudio) updateAgent(a, dt, activeStudio, 1);

      renderMainOfficePixel(
        mainCtx,
        mainAgents,
        mainSlotsRef.current,
        selectedJobdeskRef.current,
        tvStatsRef.current,
        elapsed
      );
      renderWoodStudioPixel(
        studioCtx,
        studioAgents,
        studioRosterRef.current,
        selectedJobdeskRef.current,
        elapsed
      );

      // Update crisp Retina HD overlay positions & live status text at 60fps (zero React re-renders!)
      const syncHdLabels = (
        agentsList: PixelAgent[],
        rosterList: Array<OfficeAvatarData | null | undefined>,
        labelNodes: Array<HTMLDivElement | null>,
        statusNodes: Array<HTMLSpanElement | null>,
        w: number,
        h: number
      ) => {
        for (let i = 0; i < agentsList.length; i++) {
          const el = labelNodes[i];
          if (!el) continue;
          const meta = rosterList[i];
          if (!meta) {
            el.style.opacity = '0';
            continue;
          }
          const a = agentsList[i];
          // Hide pill cleanly when avatar has stepped outside the room (toilet break)
          if (a.x < 4 || a.x > w - 4 || a.y < 4 || a.y > h - 4) {
            el.style.opacity = '0';
            continue;
          }
          const leftPct = (a.x / w) * 100;
          const topPct = (a.y / h) * 100;
          el.style.opacity = '1';
          el.style.left = `${leftPct.toFixed(2)}%`;
          el.style.top = `${topPct.toFixed(2)}%`;

          const statusEl = statusNodes[i];
          if (statusEl) {
            let statusIcon = '💻';
            const visitorPartner =
              a.isChatHost && a.chatPartnerIdx !== null ? agentsList[a.chatPartnerIdx] : null;
            if (a.currentPOI?.id === 'toilet' && a.state !== 'WORKING') {
              statusIcon = '🚻';
            } else if (visitorPartner && visitorPartner.state === 'AT_POI') {
              statusIcon = '💬';
            } else if (a.state === 'AT_POI' && a.currentPOI) {
              statusIcon = a.currentPOI.icon;
            } else if (a.state === 'WALKING_TO_POI') {
              statusIcon = '🚶';
            } else if (a.state === 'WALKING_BACK') {
              statusIcon = a.hasDrink ? (a.hasDrink === 'water' ? '💧' : '☕') : '🚶';
            } else if (a.workSub === 'sip' && a.hasDrink) {
              statusIcon = a.hasDrink === 'water' ? '💧' : '☕';
            }
            if (statusEl.textContent !== statusIcon) {
              statusEl.textContent = statusIcon;
            }
          }
        }
      };

      syncHdLabels(mainAgents, mainSlotsRef.current, mainLabelRefs.current, mainStatusRefs.current, MAIN_W, MAIN_H);
      syncHdLabels(studioAgents, studioRosterRef.current, studioLabelRefs.current, studioStatusRefs.current, STUDIO_W, STUDIO_H);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.clearTimeout(kickTimer);
      window.cancelAnimationFrame(rafId);
      mainCanvas.removeEventListener('click', onMainClick);
      studioCanvas.removeEventListener('click', onStudioClick);
      void allAgents;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
      {/* Stage 1: Kantor Utama (Badung) — 2D Pixel Art */}
      <div className="flex flex-col gap-2.5">
        <article className="relative aspect-[384/272] lg:aspect-auto lg:h-[500px] xl:h-[540px] rounded-xl sm:rounded-2xl overflow-hidden bg-[#c5bca9] border border-slate-200 dark:border-neutral-800 shadow-clean-xl flex items-center justify-center">
          <div
            style={{
              transform: `scale(${mainZoom})`,
              transition: 'transform 120ms ease-out',
            }}
            className="relative w-full h-full"
          >
            <canvas
              ref={mainCanvasRef}
              onWheel={(e) => {
                e.preventDefault();
                setMainZoom((z) => Math.max(1, Math.min(2, z + (e.deltaY < 0 ? 0.15 : -0.15))));
              }}
              style={{ imageRendering: 'pixelated' }}
              className="w-full h-full object-fill cursor-pointer block"
            />
            {/* Crisp Retina HD Pill (Icon on Left + Name) centered on Avatar */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {mainSlots.map((staff, idx) => {
                if (!staff) return null;
                const displayName = (staff.nickname || staff.name).trim().split(/\s+/)[0];
                return (
                  <div
                    key={staff.id}
                    ref={(el) => { mainLabelRefs.current[idx] = el; }}
                    style={{ opacity: 0, transform: 'translate(-50%, -50%)' }}
                    className="absolute inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[8.5px] sm:text-[10px] leading-none font-extrabold whitespace-nowrap shadow-md border bg-[#18181b]/90 text-white border-white/25"
                  >
                    <span
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ring-1 ring-white/50"
                      style={{ backgroundColor: staff.shiftColor || '#FFD416' }}
                      title={`Shift: ${staff.shiftCode}`}
                    />
                    <span
                      ref={(el) => { mainStatusRefs.current[idx] = el; }}
                      className="text-[9px] sm:text-[10.5px] leading-none"
                    >
                      💻
                    </span>
                    <span>{displayName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pointer-events-none absolute top-2 sm:top-3 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 z-10 flex items-center justify-between gap-2">
            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-extrabold bg-[#FFD416] text-[#202020] shadow-gx">
              Badung
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#202020]/85 text-white border border-white/15">
              {mainRoster.length} Staff
            </span>
          </div>

          {inspectedMain && (
            <div className="absolute bottom-3 left-3.5 right-3.5 z-10 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white/95 text-[#202020] border border-slate-200 shadow-clean-lg text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: inspectedMain.shiftColor || '#FFD416' }}
                />
                <strong className="truncate">{inspectedMain.name}</strong>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                  {inspectedMain.shiftCode}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#FFF8C4] text-[#5E4C00] font-bold text-[10.5px]">
                  {inspectedMain.jobdeskCode}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 shrink-0">{inspectedMain.status}</span>
            </div>
          )}
        </article>
      </div>

      {/* Stage 2: Ruang Kayu (Denpasar) — 2D Pixel Art */}
      <div className="flex flex-col gap-2.5">
        <article className="relative aspect-[320/232] lg:aspect-auto lg:h-[500px] xl:h-[540px] rounded-xl sm:rounded-2xl overflow-hidden bg-[#3b2415] border border-slate-200 dark:border-neutral-800 shadow-clean-xl flex items-center justify-center">
          <div
            style={{
              transform: `scale(${studioZoom})`,
              transition: 'transform 120ms ease-out',
            }}
            className="relative w-full h-full"
          >
            <canvas
              ref={studioCanvasRef}
              onWheel={(e) => {
                e.preventDefault();
                setStudioZoom((z) => Math.max(1, Math.min(2, z + (e.deltaY < 0 ? 0.15 : -0.15))));
              }}
              style={{ imageRendering: 'pixelated' }}
              className="w-full h-full object-fill cursor-pointer block"
            />
            {/* Crisp Retina HD Pill (Icon on Left + Name) centered on Avatar */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {studioRoster.map((staff, idx) => {
                const firstName = staff.name.trim().split(/\s+/)[0];
                return (
                  <div
                    key={staff.id}
                    ref={(el) => { studioLabelRefs.current[idx] = el; }}
                    style={{ opacity: 0, transform: 'translate(-50%, -50%)' }}
                    className="absolute inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10.5px] leading-none font-extrabold whitespace-nowrap shadow-md border bg-[#18181b]/90 text-white border-white/25"
                  >
                    <span
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ring-1 ring-white/50"
                      style={{ backgroundColor: staff.shiftColor || '#FFD416' }}
                      title={`Shift: ${staff.shiftCode}`}
                    />
                    <span
                      ref={(el) => { studioStatusRefs.current[idx] = el; }}
                      className="text-[9.5px] sm:text-[11px] leading-none"
                    >
                      💻
                    </span>
                    <span>{firstName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pointer-events-none absolute top-2 sm:top-3 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 z-10 flex items-center justify-between gap-2">
            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-extrabold bg-[#202020] text-[#FFD416] border border-[#FFD416]/40 shadow-clean-md">
              Denpasar
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#202020]/85 text-white border border-white/15">
              {studioRoster.length} Staff
            </span>
          </div>

          {inspectedStudio && (
            <div className="absolute bottom-3 left-3.5 right-3.5 z-10 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white/95 text-[#202020] border border-slate-200 shadow-clean-lg text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: inspectedStudio.shiftColor || '#FFD416' }}
                />
                <strong className="truncate">{inspectedStudio.name}</strong>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                  {inspectedStudio.shiftCode}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#FFF8C4] text-[#5E4C00] font-bold text-[10.5px]">
                  {inspectedStudio.jobdeskCode}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 shrink-0">{inspectedStudio.status}</span>
            </div>
          )}
        </article>
      </div>

      {/* Gen-Z Relatable CTSO Team & Division Motivation Strip (Seamless, fixed 2-line height on desktop) */}
      <div className="lg:col-span-2 w-full border-t border-slate-200/80 dark:border-neutral-800/90 mt-1 sm:mt-2 pt-4 sm:pt-6 pb-2 px-0.5 sm:px-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full">
          <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="text-sm sm:text-[17px] font-black tracking-tight text-[#202020] dark:text-[#FFD416]">
                CTSO Daily Vibes
              </span>
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#FFD416]/15 text-[#5E4C00] dark:text-[#FFD416]">
                {CTSO_TEAM_QUOTES[quoteIdx].mood}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-neutral-500">
                {CTSO_TEAM_QUOTES[quoteIdx].tag}
              </span>
            </div>
            <p className="text-[13px] sm:text-base font-medium text-slate-500 dark:text-neutral-400 leading-relaxed min-h-[3.75rem] sm:min-h-[3.1rem] sm:line-clamp-2 pt-0.5">
              “{CTSO_TEAM_QUOTES[quoteIdx].quote}”
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              {CTSO_TEAM_QUOTES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Motivasi ${idx + 1}`}
                  onClick={() => setQuoteIdx(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === quoteIdx
                      ? 'w-5 bg-[#FFD416]'
                      : 'w-1.5 bg-slate-300 dark:bg-neutral-700 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setQuoteIdx((prev) => (prev + 1) % CTSO_TEAM_QUOTES.length)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-neutral-800 text-[11px] font-bold text-[#647084] dark:text-neutral-400 hover:text-[#202020] dark:hover:text-white transition-colors cursor-pointer"
              title="Ganti quotes motivasi"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Next</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
