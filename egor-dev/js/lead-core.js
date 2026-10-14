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
