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
