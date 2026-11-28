// Telegram Alert Notification Helper for CTSO Management System
// Format 2: Emoji Minimalis & Quick-Scan
import { API_BASE } from '../api/client';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  chatName?: string;
}

const STORAGE_KEY = 'ctso_cms_telegram_config';

export const getTelegramConfig = (): TelegramConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to read Telegram config from storage', e);
  }
  return {
    enabled: false,
    botToken: '',
    chatId: '',
    chatName: ''
  };
};

export const saveTelegramConfig = (config: TelegramConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save Telegram config to storage', e);
  }
};

export interface TelegramAlertData {
  nama: string;
  waktu: string;
  jenis: string;
  detail: string;
  date: string;
  hub?: string;
}

export const getTelegramRequestEmoji = (jenis: string): string => {
  const j = (jenis || '').toLowerCase();
  if (j.includes('tukar') || j.includes('swap') || j.includes('exchange')) return '🔄';
  if (j.includes('ganti shift') || j.includes('change shift')) return '🕒';
  if (j.includes('sakit')) return '🤒';
  if (j.includes('cuti')) return '🏖️';
  if (j.includes('izin') || j.includes('ijin')) return '📝';
  return '📌';
};

export const buildTelegramMessage = (data: TelegramAlertData): string => {
  const emoji = getTelegramRequestEmoji(data.jenis);
  return (
    `${emoji} <b>Pengajuan Baru CTSO</b>\n\n` +
    `Pemohon : <code>${data.nama}</code>\n` +
    `Jenis : <code>${data.jenis}</code>\n` +
    `Tanggal : <code>${data.date}</code>`
  );
};

export const sendTelegramAlert = async (
  data: TelegramAlertData,
  customConfig?: TelegramConfig
): Promise<{ success: boolean; message?: string }> => {
  const config = customConfig || getTelegramConfig();

  if (!config.enabled) {
    return { success: false, message: 'Notifikasi Telegram dinonaktifkan.' };
  }

  if (!config.botToken.trim() || !config.chatId.trim()) {
    return { success: false, message: 'Bot Token atau Chat ID belum dikonfigurasi.' };
  }

  const messageText = buildTelegramMessage(data);

  // Attempt 1: Try through backend API
  try {
    const backendRes = await fetch(`${API_BASE}/telegram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: config.botToken.trim(),
        chatId: config.chatId.trim(),
        text: messageText
      })
    });
    if (backendRes.ok) {
      const resJson = await backendRes.json();
      if (resJson.success) {
        return { success: true, message: 'Notifikasi berhasil dikirim via server.' };
      }
    }
  } catch {
    // If backend network fails, fallback to direct browser fetch
  }

  // Attempt 2: Direct browser fetch to api.telegram.org
  try {
    const telegramApiUrl = `https://api.telegram.org/bot${config.botToken.trim()}/sendMessage`;
    const res = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId.trim(),
        text: messageText,
        parse_mode: 'HTML'
      })
    });

    const json = await res.json();
    if (json.ok) {
      return { success: true, message: 'Notifikasi berhasil dikirim ke Telegram.' };
    } else {
      return { success: false, message: json.description || 'Gagal mengirim pesan Telegram.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menghubungi Telegram API.' };
  }
};
