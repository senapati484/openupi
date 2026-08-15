import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function send(text: string, inlineKeyboard?: object[][]): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return; // Telegram is optional
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
    });
  } catch (err: any) {
    console.warn('[TelegramBot] Notification failed:', err.message);
  }
}

export async function notifyPaymentSettled(order: {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  utr: string;
}): Promise<void> {
  const time = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
  await send(
    `💰 <b>Payment Received!</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `<b>Order ID:</b> <code>${order.orderId}</code>\n` +
    `<b>Amount:</b> ₹${order.exactAmount.toFixed(2)}\n` +
    `<b>Bank UTR:</b> <code>${order.utr}</code>\n` +
    `<b>Time:</b> ${time} IST\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `Status: <b>SETTLED ✓</b>`
  );
}

export async function notifyDaemonOffline(
  lastSeenMinutes: number,
  batteryLevel?: number
): Promise<void> {
  await send(
    `🚨 <b>CRITICAL: OpenUPI Daemon Offline</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `Listener phone not seen for <b>${lastSeenMinutes} min</b>.\n` +
    (batteryLevel !== undefined ? `Last battery: <b>${batteryLevel}%</b>\n` : '') +
    `\n⚠️ <i>Ensure phone is on, Wi-Fi connected, and OpenUPI app is running.</i>`
  );
}

export async function notifyUnmatchedCredit(credit: {
  amount: number;
  utr: string;
  rawText: string;
}): Promise<void> {
  const snippet = credit.rawText.substring(0, 120);
  await send(
    `⚠️ <b>Unmatched Bank Credit</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `<b>Amount:</b> ₹${credit.amount.toFixed(2)}\n` +
    `<b>UTR:</b> <code>${credit.utr}</code>\n` +
    `<b>Snippet:</b> <i>${snippet}...</i>`,
    [[{ text: '🔍 View in Web Admin', url: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/admin` }]]
  );
}
