# egor.dev — сайт-визитка: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Статичный сайт-визитка egor.dev «Делаю сайты, которые приводят клиентов» с витриной концептов, тремя пакетами цен и формой заявки в Telegram.

**Architecture:** Один `index.html` + `privacy.html`, стили в двух CSS-файлах, классические скрипты без сборки. Логика заявки (валидация + текст сообщения) — в общем модуле `js/lead-core.js`, который используют и браузер, и Vercel-функция `api/lead.js`. Логика покрыта тестами `node:test`; вёрстка проверяется в браузере.

**Tech Stack:** HTML, CSS, vanilla JS (ES2017, классические скрипты), Node 24 (`node:test`, встроенный `fetch`), Vercel Functions, Google Fonts (Unbounded, Onest, JetBrains Mono).

Спецификация: `docs/superpowers/specs/2026-09-11-egor-dev-site-design.md`.

## Global Constraints

- Никаких npm-зависимостей и сборщиков; `package.json` только для скриптов `test` и `dev`.
- Скрипты подключаются классически (`<script src defer>`), не как ES-модули — сайт должен работать через `file://`.
- Палитра: `#0B1220` фон тёмных секций, `#111B2E`/`#16223A` карточки, `#3B82F6` кнопки, `#60A5FA` акцентный текст на тёмном, `#38BDF8` только свечения и поток, `#1D4ED8` акцент на светлом, `#F5F8FC` фон светлых секций, `#0F172A` текст на светлом.
- Шрифты: Unbounded — заголовки (с ограничением), Onest — текст, JetBrains Mono — «системные» строки (поисковый запрос, метаданные уведомления, UTM).
- Контакты — только в `js/config.js`; в HTML — заглушки `@your_username`, `+7 (900) 000-00-00`, `hello@example.com`.
- Копирайт: без выдуманных отзывов, цифр результатов, гарантий позиций, зачёркнутых цен; работы — с плашкой «Концепт»; уведомление в hero подписано «пример уведомления».
- Нумерация 01–05 — только у этапов процесса (реальная последовательность). Ниши без номеров.
- Брейкпоинты: ≥1200, 1024, 768, ≤480. Видимый `:focus-visible`. `prefers-reduced-motion` отключает все анимации и показывает финальные состояния.
- Пакеты (точные названия): `Визитка` 5 000 ₽, `Сайт + поиск` 9 000 ₽, `Сайт + клиенты` 15 000 ₽, в форме ещё `Пока не знаю`.

## Файлы

| Файл | Ответственность |
|---|---|
| `package.json`, `.gitignore`, `.vercelignore` | скрипты `test`/`dev`, исключения для git и деплоя |
| `js/lead-core.js` | `validateLead`, `formatLeadMessage`, `PACKAGES` — общий код браузера и API |
| `tests/lead-core.test.js`, `tests/api-lead.test.js` | тесты логики заявки и функции |
| `api/lead.js` | Vercel-функция: заявка → Telegram Bot API |
| `scripts/dev-server.js` | локальный сервер: статика + `/api/lead` |
| `js/config.js` | `window.SITE_CONFIG` |
| `js/cases.js` | `window.CASES` — данные 10 концептов |
| `js/main.js` | контакты из конфига, меню, reveal, hero, схема-путь, работы+модалка, выбор пакета, форма, Метрика |
| `css/base.css` | токены, сброс, типографика, кнопки, чипы, секции, сетка-фон, reveal |
| `css/sections.css` | стили всех секций + адаптив |
| `index.html`, `privacy.html` | разметка |
| `assets/img/cases/*.jpg`, `assets/favicon.svg`, `assets/og.jpg` | изображения |
| `robots.txt`, `sitemap.xml`, `README.md` | SEO и инструкция |

---

### Task 1: Каркас проекта и логика заявки (TDD)

**Files:**
- Create: `package.json`, `.gitignore`, `.vercelignore`, `js/lead-core.js`
- Test: `tests/lead-core.test.js`

**Interfaces:**
- Produces: `LeadCore.PACKAGES: string[]`; `LeadCore.validateLead(input: object) → { ok: boolean, errors: { name?, contact?, consent?: string }, value: { name, contact, package, message: string, consent: boolean } }`; `LeadCore.formatLeadMessage(value) → string` (HTML для Telegram); `LeadCore.escapeHtml(text) → string`. В браузере — `window.LeadCore`, в Node — `require('../js/lead-core.js')`.

- [ ] **Step 1: Каркас**

`package.json`:
```json
{
  "name": "egor-dev",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test tests/",
    "dev": "node --env-file-if-exists=.env scripts/dev-server.js"
  }
}
```
`.gitignore`: `.env`, `.vercel`, `node_modules`. `.vercelignore`: `docs`, `tests`, `scripts`, `.env`.

- [ ] **Step 2: Написать падающие тесты** — `tests/lead-core.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLead, formatLeadMessage, PACKAGES } = require('../js/lead-core.js');

const valid = { name: 'Анна', contact: '+7 (900) 123-45-67', package: 'Сайт + поиск', message: 'Нужен сайт для барбершопа', consent: true };

test('принимает корректную заявку с телефоном', () => {
  const r = validateLead(valid);
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, {});
  assert.equal(r.value.package, 'Сайт + поиск');
});

test('принимает ник Telegram и ссылку t.me', () => {
  assert.equal(validateLead({ ...valid, contact: '@egor_dev' }).ok, true);
  assert.equal(validateLead({ ...valid, contact: 'https://t.me/egor_dev' }).ok, true);
});

test('требует имя, контакт и согласие', () => {
  const r = validateLead({ name: ' ', contact: '123', consent: false });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['consent', 'contact', 'name']);
});

test('подставляет «Пока не знаю» для неизвестного пакета', () => {
  assert.equal(validateLead({ ...valid, package: 'VIP' }).value.package, 'Пока не знаю');
});

test('обрезает пробелы и слишком длинный текст', () => {
  const r = validateLead({ ...valid, name: '  Анна  ', message: 'а'.repeat(1500) });
  assert.equal(r.value.name, 'Анна');
  assert.equal(r.value.message.length, 1000);
});

test('принимает согласие из формы в виде "on"', () => {
  assert.equal(validateLead({ ...valid, consent: 'on' }).ok, true);
});

test('экранирует HTML в сообщении для Telegram', () => {
  const text = formatLeadMessage(validateLead({ ...valid, name: '<b>Анна</b>' }).value);
  assert.match(text, /Имя: &lt;b&gt;Анна&lt;\/b&gt;/);
  assert.match(text, /Пакет: Сайт \+ поиск/);
});

test('не добавляет строку задачи, если она пустая', () => {
  const text = formatLeadMessage(validateLead({ ...valid, message: '' }).value);
  assert.doesNotMatch(text, /Задача:/);
});

test('экспортирует список пакетов', () => {
  assert.deepEqual(PACKAGES, ['Визитка', 'Сайт + поиск', 'Сайт + клиенты', 'Пока не знаю']);
});
```

- [ ] **Step 3: Запустить — убедиться, что падает.** Run: `npm test` → FAIL `Cannot find module '../js/lead-core.js'`.

- [ ] **Step 4: Реализация** — `js/lead-core.js`:

```js
/* Общая логика заявки: валидация и текст сообщения.
   В браузере доступна как window.LeadCore, в Node — через require(). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LeadCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PACKAGES = ['Визитка', 'Сайт + поиск', 'Сайт + клиенты', 'Пока не знаю'];
  var DEFAULT_PACKAGE = 'Пока не знаю';

  function str(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function isContact(value) {
    var digits = value.replace(/\D/g, '');
    var phone = /^[\d\s()+-]+$/.test(value) && digits.length >= 10 && digits.length <= 15;
    var username = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value);
    var link = /^(https?:\/\/)?t\.me\/[A-Za-z][A-Za-z0-9_]{4,31}\/?$/.test(value);
    return phone || username || link;
  }

  function validateLead(input) {
    var data = input || {};
    var pkg = str(data.package);
    var value = {
      name: str(data.name).slice(0, 60),
      contact: str(data.contact).slice(0, 64),
      package: PACKAGES.indexOf(pkg) !== -1 ? pkg : DEFAULT_PACKAGE,
      message: str(data.message).slice(0, 1000),
      consent: data.consent === true || data.consent === 'on' || data.consent === 'true'
    };
    var errors = {};
    if (value.name.length < 2) errors.name = 'Укажите имя';
    if (!isContact(value.contact)) errors.contact = 'Укажите телефон или ник в Telegram';
    if (!value.consent) errors.consent = 'Отметьте согласие на обработку данных';
    return { ok: Object.keys(errors).length === 0, errors: errors, value: value };
  }

  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatLeadMessage(value) {
    var lines = [
      '<b>Новая заявка с egor.dev</b>',
      'Имя: ' + escapeHtml(value.name),
      'Контакт: ' + escapeHtml(value.contact),
      'Пакет: ' + escapeHtml(value.package)
    ];
    if (value.message) lines.push('Задача: ' + escapeHtml(value.message));
    return lines.join('\n');
  }

  return { PACKAGES: PACKAGES, validateLead: validateLead, formatLeadMessage: formatLeadMessage, escapeHtml: escapeHtml };
});
```

- [ ] **Step 5: Запустить — PASS.** Run: `npm test` → `# pass 9`, `# fail 0`.
- [ ] **Step 6: Commit** — `git add package.json .gitignore .vercelignore js/lead-core.js tests/lead-core.test.js && git commit -m "feat: логика заявки с тестами"`.

---

### Task 2: Vercel-функция `/api/lead` и dev-сервер (TDD)

**Files:**
- Create: `api/lead.js`, `scripts/dev-server.js`
- Test: `tests/api-lead.test.js`

**Interfaces:**
- Consumes: `validateLead`, `formatLeadMessage` из Task 1.
- Produces: `POST /api/lead` (JSON `{ name, contact, package, message, consent, website }`) → `200 {ok:true}` | `400 {ok:false, error:'bad_request'|'invalid', errors?}` | `405` | `503 {error:'not_configured'}` | `502 {error:'telegram_failed'}`. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Функция использует только Node API (`res.statusCode`, `res.setHeader`, `res.end`) — работает и на Vercel, и в dev-сервере.

- [ ] **Step 1: Падающие тесты** — `tests/api-lead.test.js`:

```js
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
```

- [ ] **Step 2: Запустить — FAIL** (`Cannot find module '../api/lead.js'`).

- [ ] **Step 3: Реализация** — `api/lead.js`:

```js
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
```

- [ ] **Step 4: `scripts/dev-server.js`** — статика из корня проекта + `/api/lead` → `handler`:

```js
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/lead.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json'
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/lead') return handler(req, res);

  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');

  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => console.log('egor.dev → http://localhost:' + PORT));
```

- [ ] **Step 5: PASS.** Run: `npm test` → `# pass 17`, `# fail 0`.
- [ ] **Step 6: Commit** — `feat: api/lead — заявки в Telegram, dev-сервер`.

---

### Task 3: Скриншоты концептов и данные кейсов

**Files:**
- Create: `assets/img/cases/{id}-card.jpg` (640×400), `{id}-desktop.jpg` (1280×800), `{id}-mobile.jpg` (600 px по ширине, первый экран), `js/cases.js`

**Interfaces:**
- Produces: `window.CASES: Array<{ id, title, niche, cat: 'services'|'build'|'delivery'|'experts', summary, about, leads: string[] }>`; изображения по шаблону `assets/img/cases/${id}-{card|desktop|mobile}.jpg`. `CASE_CATS = { services: 'Услуги', build: 'Стройка и ремонт', delivery: 'Доставка', experts: 'Эксперты' }`.

- [ ] **Step 1:** Досъёмка проблемных кадров (ТочкаДрайв — прелоадер, Дачный цех mobile — анимация) через реальное время ожидания (CDP-скрипт в scratchpad или Browser-панель), кроп `pravo-mobile` до первого экрана, ресайз `pravo-desktop` 2880→1440.
- [ ] **Step 2:** Конвертация PNG → JPEG (System.Drawing, качество 80) в три размера; проверить, что `card` ≤ 70 КБ, `desktop` ≤ 200 КБ.
- [ ] **Step 3:** `js/cases.js` — 10 записей. Пункты `leads` — только то, что реально есть в проекте (сверено по разметке 2026-09-11):
  - `britva` «Бритва & Латунь», Барбершоп, services — запись с выбором услуги (с ценами), мастера, даты и времени; оффер «Первый визит — −20%»; прайс-лист; портфолио и отзывы.
  - `brovi` «Бровистки», Студия бровей, services — онлайн-запись с выбором услуги, мастера и времени; подбор формы бровей; слайдер «до/после»; прайс.
  - `lapami` «Лапами вверх», Ветклиника, services — запись на приём (питомец, услуга, дата); кнопка экстренного вызова; базовый прайс; врачи и отзывы.
  - `tochkadrive` «ТочкаДрайв», Автосервис, services — калькулятор (класс авто, работы с ценами, срочность); пакеты обслуживания; письменная гарантия; запись с маркой авто и описанием проблемы.
  - `dacha` «Дачный цех», Дома и бани, build — калькулятор бюджета (тип постройки, площадь, опции); объекты бригады; этапы; заявка на бесплатный замер.
  - `potolki` «ПотолокПро», Натяжные потолки, build — калькулятор на первом экране (площадь, фактура, светильники); выбор полотна; «Жду звонок» и запись на замер.
  - `stroydom` «СтройДом», Частные дома, build — кнопки заказа под каждый тип постройки; график работ на объектах; техника; сертификаты и разрешения.
  - `gruzline` «ГРУЗЛАЙН», Грузоперевозки, delivery — «Рассчитать доставку» на первом экране; отдельная страница оформления заказа; номер 8 800 в шапке; документы и партнёры.
  - `racion` «Рацион», Доставка питания, delivery — подбор рациона по цели; конструктор меню по блюдам; гибкие тарифы подписки; FAQ.
  - `pravo` «Право и защита», Юрист, experts — «Получить консультацию» и «Описать ситуацию» на первом экране; WhatsApp и Telegram в один клик; форма с описанием ситуации.
- [ ] **Step 4:** Проверка: `node -e "global.window={};require('./js/cases.js');const c=window.CASES;console.log(c.length, c.every(x=>x.leads.length>=3))"` → `10 true`; все 30 файлов изображений существуют.
- [ ] **Step 5: Commit** — `feat: скриншоты и данные концептов`.

---

### Task 4: Основа страницы — токены, шапка, футер, конфиг

**Files:** Create `css/base.css`, `css/sections.css` (пустые разделы-комментарии), `js/config.js`, `js/main.js` (модули `contacts`, `nav`, `reveal`), `index.html` (head, header, пустые `section` с id, footer), `assets/favicon.svg`.

**Interfaces:**
- Produces: CSS-классы `.container`, `.section`, `.section--dark`, `.section--light`, `.btn`, `.btn--primary`, `.btn--ghost`, `.chip`, `.h2`, `.lead`, `.meta` (моно-строка), `[data-reveal]`/`.is-visible`; `window.SITE_CONFIG = { siteUrl, telegram, telegramUrl, phone, phoneHref, email, metrikaId }`; атрибут `data-contact="telegram|phone|email"`.
- Секции в `index.html` (порядок фиксирован): `#hero`, `#how`, `#niches`, `#works`, `#prices`, `#process`, `#trust`, `#about`, `#faq`, `#cta`, `#contacts`.

- [ ] Step 1: `js/config.js` с заглушками (`@your_username`, `https://t.me/your_username`, `+7 (900) 000-00-00`, `+79000000000`, `hello@example.com`, `siteUrl: 'https://egor-dev.vercel.app'`, `metrikaId: ''`).
- [ ] Step 2: `css/base.css` — токены из Global Constraints, типографическая шкала (H1 `clamp(2.6rem, 7vw, 6.4rem)` Unbounded 800, H2 `clamp(2rem, 4vw, 3.4rem)` Unbounded 700, текст 17/1.6 Onest), кнопки со свечением у primary, фон-сетка `.grid-bg`, reveal (fade-up 24px, 0.7s), `@media (prefers-reduced-motion: reduce)`.
- [ ] Step 3: шапка (sticky, блюр при скролле, бургер с `aria-expanded`), футер (логотип, описание, навигация, контакты, © 2026, ссылка на политику).
- [ ] Step 4: `main.js`: `applyContacts()` (заполняет `data-contact`), `initNav()` (бургер, закрытие по клику на ссылку и Esc, класс `header--scrolled`), `initReveal()` (IntersectionObserver, threshold 0.15; при reduced motion — сразу `is-visible`).
- [ ] Step 5: Проверка в браузере: шапка/футер на 1440 и 375, бургер открывается/закрывается, консоль чистая. Commit `feat: основа страницы`.

### Task 5: Hero

**Files:** Modify `index.html#hero`, `css/sections.css`, `js/main.js` (`initHero`).

- [ ] Step 1: Разметка: бейдж «Открыт для новых проектов» (пульс-точка); `h1.hero__title` из трёх `span.hero__line` «Делаю сайты,» / «которые приводят» / «клиентов» (последняя строка — градиент `#60A5FA → #38BDF8`); подзаголовок из спецификации; кнопки «Обсудить проект →» (`#contacts`) и «Смотреть работы» (`#works`); `ul.hero__facts` в моно: «от 5 000 ₽ · от 3 дней · заявки в Telegram».
- [ ] Step 2: 4 карточки `figure.hero-card` (britva, lapami слева; potolki, dacha справа) с `style="--tilt:-8deg; --depth:.6"`; изображения `-card.jpg`, `decoding="async"`, декоративные (`alt=""`, `aria-hidden`).
- [ ] Step 3: `div.tg-note` — макет уведомления: иконка бота, «Заявки · egor.dev», «Новая заявка с сайта», строки в моно `Имя: Марина`, `Услуга: замер потолка`, `Источник: Яндекс.Карты`; подпись «пример уведомления».
- [ ] Step 4: Анимация загрузки: строки заголовка поднимаются по очереди (0/120/240 мс), карточки выплывают (stagger 90 мс), уведомление появляется через 1.4 с. Параллакс карточек от мыши (`--mx`, `--my`, только pointer: fine, rAF). ≤768: карточки — горизонтальный ряд под кнопками, уведомление — статично под заголовком.
- [ ] Step 5: Проверка 1440/768/375 + reduced motion. Commit `feat: hero`.

### Task 6: Сигнатурный блок «Как сайт находит клиентов»

**Files:** Modify `index.html#how`, `css/sections.css`, `js/main.js` (`initJourney`).

- [ ] Step 1: Разметка `div.journey`: три канала `article.journey__channel` — «Поиск» (строка поиска с печатающимся запросом `[data-typing]`: «натяжные потолки цена», «барбершоп рядом», «ремонт ходовой»), «Карты» (метка + карточка организации), «Реклама» (объявление с плашкой «Реклама»); `svg.journey__wires` с тремя путями к `div.journey__site` (рамка браузера со скриншотом `potolki-desktop.jpg`); путь к `div.journey__lead` (уведомление «Новая заявка · Источник: Поиск»); `div.journey__metrika` — три полосы «Поиск / Карты / Реклама» без чисел, подпись «Метрика показывает, какой канал сработал».
- [ ] Step 2: Под схемой — 4 карточки-пояснения: «Сайт в поиске», «Карточка на Картах», «Реклама в Директе», «Заявки и аналитика» (что делаю — одной строкой, без обещаний позиций).
- [ ] Step 3: Оркестровка при входе в экран (`.journey.is-playing`): печать запроса (JS, 55 мс/символ) → каналы подсвечиваются по очереди → точки бегут по линиям (`stroke-dashoffset`, 1.6 с) → сайт «вспыхивает» → уведомление выпрыгивает → полосы Метрики растут. Цикл запросов каждые 6 с, пока блок в экране. ≤768: вертикальная схема, линии вертикальные.
- [ ] Step 4: Reduced motion — финальное состояние без печати и потоков. Проверка. Commit `feat: схема «как сайт находит клиентов»`.

### Task 7: Ниши и работы

**Files:** Modify `index.html#niches`, `#works`, `css/sections.css`, `js/main.js` (`initWorks`, `openCase`, `closeCase`).

- [ ] Step 1: Ниши — 4 карточки без номеров (иконка SVG, заголовок, описание, 3 тега) по спецификации §4.4; каждая ссылается на фильтр работ (`data-filter-link="services"` и т.д.).
- [ ] Step 2: Работы — строка `.meta` «10 концептов · реальные кейсы появятся после первых клиентов»; фильтры `button[data-filter]` (Все, Услуги, Стройка и ремонт, Доставка, Эксперты) с `aria-pressed`; `#worksGrid` заполняется из `window.CASES`: `button.work-card` (скриншот `-card.jpg`, плашка «Концепт», название, ниша, `summary`).
- [ ] Step 3: Модалка `div#caseModal[role=dialog][aria-modal=true]`: desktop- и mobile-скриншоты, ниша, `about`, список «Что работает на заявки» (`leads`), кнопка «Хочу такой сайт» → закрыть и прокрутить к `#contacts`. Закрытие: крестик, фон, Esc; фокус возвращается на карточку; `body` без прокрутки.
- [ ] Step 4: Проверка фильтров, модалки (клавиатура), 375. Commit `feat: ниши и витрина концептов`.

### Task 8: Цены и доверие (светлые секции)

**Files:** Modify `index.html#prices`, `#trust`, `css/sections.css`, `js/main.js` (`initPlanPicker`).

- [ ] Step 1: Три карточки `article.plan` (данные и списки — спецификация §4.6), средняя — `plan--featured` с плашкой «Популярный»; кнопка `button.js-choose-plan[data-plan="…"]` «Выбрать пакет»; строка о рекламном бюджете у третьего пакета.
- [ ] Step 2: Баннер бонуса; таблица доп. опций (5 строк); строка оплаты 50/50.
- [ ] Step 3: `#trust` — 6 карточек (спецификация §4.8), иконки SVG.
- [ ] Step 4: `initPlanPicker()` — выбирает радио `package` в форме с тем же значением и плавно прокручивает к `#contacts`, фокус на поле «Имя».
- [ ] Step 5: Проверка. Commit `feat: цены и доверие`.

### Task 9: Процесс, обо мне, FAQ, CTA

**Files:** Modify `index.html#process`, `#about`, `#faq`, `#cta`, `css/sections.css`.

- [ ] Step 1: Процесс — `ol.timeline` из 5 шагов (номер в кружке, заголовок, срок в моно, описание, «Результат: …»).
- [ ] Step 2: Обо мне — монограмма «Е» (Unbounded, градиентная обводка, орбита точек), текст и строки «Связь / Подход / Инструменты», кнопка.
- [ ] Step 3: FAQ — `details.faq__item` × 7 (нативный аккордеон, анимация иконки), ответы из спецификации §4.10.
- [ ] Step 4: CTA — тёмная карточка на светлом фоне, «Пусть сайт начнёт работать на вас», кнопка «Оставить заявку».
- [ ] Step 5: Проверка. Commit `feat: процесс, обо мне, FAQ, CTA`.

### Task 10: Контакты, форма, политика

**Files:** Modify `index.html#contacts`, `css/sections.css`, `js/main.js` (`initLeadForm`, `initMetrika`); Create `privacy.html`.

**Interfaces:** Consumes `window.LeadCore.validateLead`, `POST /api/lead`, `SITE_CONFIG.telegramUrl`, `SITE_CONFIG.metrikaId`.

- [ ] Step 1: Разметка формы `#leadForm` (`novalidate`): радио-чипы `name="package"` (4 значения из `PACKAGES`), `name`, `contact`, `message`, `consent` (ссылка на `privacy.html`), ловушка `website` (скрыта через `.visually-hidden`, `tabindex=-1`, `autocomplete=off`), кнопка «Отправить заявку», `p#formStatus[aria-live=polite]`.
- [ ] Step 2: `initLeadForm()`: собрать данные → `LeadCore.validateLead` → показать ошибки у полей (`aria-invalid`, `.field__error`) → если `location.protocol === 'file:'` — сразу fallback → `fetch('/api/lead')` → `200`: «Заявка отправлена. Отвечу в течение дня.» + сброс + цель Метрики `lead`; `503/502/сеть`: «Не получилось отправить заявку. Напишите мне в Telegram — ссылка ниже» со ссылкой из конфига; `400`: ошибки полей.
- [ ] Step 3: `initMetrika()` — если `metrikaId` задан, вставить стандартный тег Метрики.
- [ ] Step 4: `privacy.html` — шаблон политики (оператор — самозанятый/ИП «[ФИО]», какие данные, цели, срок хранения, права, контакты из конфига) в стиле сайта.
- [ ] Step 5: Проверка через `npm run dev`: пустая форма → ошибки; валидная без env → fallback-сообщение; с фиктивным env и заглушкой — не проверяем реальный Telegram. Commit `feat: форма заявки и политика`.

### Task 11: SEO и документация

**Files:** Modify `index.html` (head); Create `robots.txt`, `sitemap.xml`, `assets/og.jpg`, `README.md`.

- [ ] Step 1: head — title «Егор — делаю сайты, которые приводят клиентов | egor.dev», description, canonical, OG/Twitter, `theme-color`, preconnect к шрифтам, JSON-LD `ProfessionalService` с `makesOffer` на 3 пакета (цены 5000/9000/15000 RUB).
- [ ] Step 2: `robots.txt`, `sitemap.xml` (URL из `siteUrl`), `og.jpg` 1200×630 (скриншот hero через Edge).
- [ ] Step 3: `README.md`: как заменить контакты, подключить бота (@BotFather → токен, chat_id, env на Vercel), запустить `npm run dev`/`npm test`, задеплоить.
- [ ] Step 4: Commit `feat: SEO и README`.

### Task 12: Финальная проверка

- [ ] Step 1: `npm test` → все тесты зелёные.
- [ ] Step 2: Браузер 1440 / 768 / 375: каждая секция, консоль без ошибок и 404, горизонтального скролла нет.
- [ ] Step 3: Клавиатура: Tab по шапке, фильтрам, карточкам, модалке, FAQ, форме — фокус виден.
- [ ] Step 4: Reduced motion (эмуляция) — анимации выключены, контент виден.
- [ ] Step 5: Сверка копирайта с правилами честности (поиск по «гарант», «топ», «%», «отзыв»).
- [ ] Step 6: Commit исправлений.
