// Vercel-функция: принимает заявку с сайта и отправляет её в Telegram.
// Нужны переменные окружения TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
const { validateLead, formatLeadMessage } = require('../js/lead-core.js');

const MAX_BODY = 20000;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('too_large');
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return send(res, 400, { ok: false, error: 'bad_request' });
  }

  // Ловушка для ботов: люди это поле не видят.
  if (body && typeof body.website === 'string' && body.website.trim() !== '') {
    return send(res, 200, { ok: true });
  }

  const result = validateLead(body);
  if (!result.ok) return send(res, 400, { ok: false, error: 'invalid', errors: result.errors });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return send(res, 503, { ok: false, error: 'not_configured' });

  try {
    const tg = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatLeadMessage(result.value),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    if (!tg.ok) return send(res, 502, { ok: false, error: 'telegram_failed' });
  } catch (err) {
    return send(res, 502, { ok: false, error: 'telegram_failed' });
  }

  return send(res, 200, { ok: true });
};
