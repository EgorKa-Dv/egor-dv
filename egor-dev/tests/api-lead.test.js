const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const handler = require('../api/lead.js');

const valid = { name: 'Анна', contact: '@anna_test', package: 'Визитка', message: 'Сайт', consent: true };

function mockRes() {
  return {
    statusCode: 0, headers: {}, body: '',
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    end(chunk) { this.body = chunk || ''; },
    json() { return JSON.parse(this.body); }
  };
}

function setup({ env = {}, fetchImpl } = {}) {
  const saved = { token: process.env.TELEGRAM_BOT_TOKEN, chat: process.env.TELEGRAM_CHAT_ID, fetch: global.fetch };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  Object.assign(process.env, env);
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return fetchImpl ? fetchImpl() : { ok: true }; };
  return {
    calls,
    restore() {
      if (saved.token === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = saved.token;
      if (saved.chat === undefined) delete process.env.TELEGRAM_CHAT_ID; else process.env.TELEGRAM_CHAT_ID = saved.chat;
      global.fetch = saved.fetch;
    }
  };
}

const ENV = { TELEGRAM_BOT_TOKEN: 'T0KEN', TELEGRAM_CHAT_ID: '42' };

test('отклоняет не-POST запросы', async () => {
  const res = mockRes();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
});

test('возвращает 400 на битый JSON', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: '{oops' }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error, 'bad_request');
});

test('молча принимает заявку с заполненной ловушкой и ничего не отправляет', async () => {
  const s = setup({ env: ENV });
  const res = mockRes();
  await handler({ method: 'POST', body: { ...valid, website: 'spam.ru' } }, res);
  s.restore();
  assert.equal(res.statusCode, 200);
  assert.equal(s.calls.length, 0);
});

test('возвращает ошибки полей на невалидную заявку', async () => {
  const s = setup({ env: ENV });
  const res = mockRes();
  await handler({ method: 'POST', body: { name: '', contact: '1', consent: false } }, res);
  s.restore();
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error, 'invalid');
  assert.ok(res.json().errors.contact);
});

test('возвращает 503, если бот не настроен', async () => {
  const s = setup();
  const res = mockRes();
  await handler({ method: 'POST', body: valid }, res);
  s.restore();
  assert.equal(res.statusCode, 503);
  assert.equal(res.json().error, 'not_configured');
});

test('отправляет заявку в Telegram', async () => {
  const s = setup({ env: ENV });
  const res = mockRes();
  await handler({ method: 'POST', body: valid }, res);
  s.restore();
  assert.equal(res.statusCode, 200);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].url, 'https://api.telegram.org/botT0KEN/sendMessage');
  const payload = JSON.parse(s.calls[0].options.body);
  assert.equal(payload.chat_id, '42');
  assert.equal(payload.parse_mode, 'HTML');
  assert.match(payload.text, /Имя: Анна/);
});

test('возвращает 502, если Telegram ответил ошибкой', async () => {
  const s = setup({ env: ENV, fetchImpl: () => ({ ok: false }) });
  const res = mockRes();
  await handler({ method: 'POST', body: valid }, res);
  s.restore();
  assert.equal(res.statusCode, 502);
});

test('читает тело из потока, если req.body не задан (dev-сервер)', async () => {
  const s = setup({ env: ENV });
  const req = Readable.from([Buffer.from(JSON.stringify(valid))]);
  req.method = 'POST';
  const res = mockRes();
  await handler(req, res);
  s.restore();
  assert.equal(res.statusCode, 200);
});
