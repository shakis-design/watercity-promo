// shakis.cms для ВатерСити: статичное промо. Один файл с экранами, данные и контракт в store.js.
import * as S from './store.js';
import { K, AUTH, ST, stName, STOCKS, esc, rub, num, when, dateFull, pl, nb, nbDom, getReq, setReq, getOv, setOv, getSet, setSet } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const SELLER = '[реквизиты ВатерСити]';

let P = [], BY = new Map(), TREE = [], known = new Set(), view = null, dirty = false;
const app = $('#app');

// ---------- вход и запуск ----------
async function boot() {
  try {
    const c = await S.loadCatalog();
    P = c.products; BY = new Map(P.map((p) => [p.code, p])); TREE = S.buildTree(P, c.sections);
  } catch (e) {
    app.innerHTML = `<div class="login"><div class="card"><h1>Нет данных каталога</h1><p>Не удалось загрузить <span class="mono">../data/products.json</span>. Откройте демо через сервер, а не двойным щелчком по файлу.</p></div></div>`;
    return;
  }
  if (sessionStorage.getItem(AUTH)) enter(); else login();
}

function login() {
  app.innerHTML = `<main class="login"><div class="card">
    <div class="logo">${'<svg aria-hidden="true"><use href="#mark"/></svg>'}</div>
    <h1>shakis.cms</h1>
    <p>Управление сайтом ВатерСити: запросы, товары, цены. Это демо на ваших товарах.</p>
    <button class="btn dark" data-act="login" autofocus>Войти в демо</button>
    <small>Пароль не нужен. Данные хранятся только в этом браузере.</small>
  </div></main>`;
  document.title = 'Вход · shakis.cms';
  nbDom(app);
}

const NAV = [['dash', 'layout-dashboard', 'Сводка'], ['requests', 'inbox', 'Запросы'], ['products', 'package', 'Товары'], ['sections', 'folder-tree', 'Разделы'], ['settings', 'settings', 'Настройки сайта']];
function enter() {
  S.ensureSeed(P);
  known = new Set(getReq().map((r) => r.id));
  const link = ([h, i, t], cls = 'nav') => `<a class="${cls}" href="#/${h}" data-nav="${h}">${ic(i)}<span>${t}</span>${h === 'requests' ? '<b class="count" data-new></b>' : ''}</a>`;
  app.innerHTML = `<div class="shell">
    <aside class="side glass" aria-label="Меню">
      <div class="brand"><div class="logo"><svg aria-hidden="true"><use href="#mark"/></svg></div><div><b>ВатерСити</b><small>shakis.cms</small></div></div>
      ${link(NAV[0])}
      <div class="group">Магазин</div>${NAV.slice(1, 4).map((n) => link(n)).join('')}
      <div class="group">Система</div>${link(NAV[4])}
      <div class="grow"></div>
      <div class="me"><div class="ava" aria-hidden="true">ВС</div><div><b>Менеджер</b><small>Демо-доступ</small></div><button class="out" data-act="logout" aria-label="Выйти" title="Выйти">${ic('log-out')}</button></div>
    </aside>
    <main class="main glass" id="main"><div class="demo">${ic('triangle-alert')}<span>Демо: данные хранятся только в этом браузере</span><button data-act="reset">Сбросить демо</button></div><div id="view"></div></main>
  </div>
  <nav class="bottomnav" aria-label="Разделы">${NAV.map(([h, i, t]) => `<a href="#/${h}" data-nav="${h}">${ic(i)}<span>${h === 'settings' ? 'Настройки' : t}</span>${h === 'requests' ? '<b class="count" data-new></b>' : ''}</a>`).join('')}</nav>`;
  route();
}

// ---------- маршрутизация ----------
const VIEWS = { dash: vDash, requests: vRequests, products: vProducts, sections: vSections, settings: vSettings };
function route(keep) {
  if (!$('#view')) return;
  const [path, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const name = VIEWS[seg[0]] ? seg[0] : 'dash';
  const y = $('#main').scrollTop, wy = scrollY;
  dirty = false;
  view = VIEWS[name](seg.slice(1), new URLSearchParams(qs));
  $('#view').innerHTML = view.html;
  nbDom($('#view'));
  document.title = (view.title ? view.title + ' · ' : '') + 'shakis.cms';
  $$('[data-nav]').forEach((a) => (a.dataset.nav === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  view.mount?.();
  badges();
  if (keep) { $('#main').scrollTop = y; scrollTo(0, wy); } else { $('#main').scrollTop = 0; scrollTo(0, 0); $('#view h1')?.setAttribute('tabindex', '-1'); $('#view h1')?.focus({ preventScroll: true }); }
}
addEventListener('hashchange', () => $('#view') && route());

function badges() {
  const n = getReq().filter((r) => r.status === 'new').length;
  $$('[data-new]').forEach((b) => (b.textContent = n || ''));
  document.title = document.title.replace(/^\(\d+\) /, '');
  if (n) document.title = `(${n}) ${document.title}`;
}

// ---------- мелкие помощники ----------
const imgOf = (p) => (p && p.img ? `../data/${p.img}` : '');
const thumb = (p, cls = '') => (p && p.img ? `<img class="thumb ${cls}" src="${esc(imgOf(p))}" alt="" width="48" height="48" loading="lazy" decoding="async">` : `<span class="thumb ph ${cls}" aria-hidden="true">${ic('image-off')}</span>`);
const tag = (st) => `<span class="tag ${st}">${esc(stName[st] || st)}</span>`;
const head = (h1, sub, acts = '', back = '') => `<header class="head"><div>${back}<h1>${h1}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${acts ? `<div class="acts no-print">${acts}</div>` : ''}</header>`;
const backLink = (href, t) => `<a class="back no-print" href="${href}">${ic('chevron-left')}${t}</a>`;
const eff = (p) => S.eff(p, getOv());
const isoNow = () => new Date().toISOString();

function toast(text, undo, extra = '') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ic('circle-check')}<div class="tx">${text}</div>${undo ? '<button type="button">Вернуть</button>' : ''}${extra}`;
  nbDom(el);
  $('#toasts').append(el);
  const kill = () => el.remove();
  el.querySelector('button')?.addEventListener('click', () => { undo(); kill(); });
  setTimeout(kill, undo ? 8000 : 4000);
}
function confirmDlg(title, text, ok) {
  const d = $('#dlg');
  d.innerHTML = `<form method="dialog"><h2>${title}</h2><p>${text}</p><div class="acts"><button class="btn ghost" value="no">Отмена</button><button class="btn dark" value="yes">${ok}</button></div></form>`;
  nbDom(d);
  return new Promise((res) => { d.addEventListener('close', () => res(d.returnValue === 'yes'), { once: true }); d.returnValue = ''; d.showModal(); });
}

// ---------- запросы: изменения ----------
function mutReq(id, fn) {
  const list = getReq(), r = list.find((x) => x.id === id);
  if (!r) return null;
  const snap = JSON.stringify(r);
  fn(r); setReq(list);
  return snap;
}
const restoreReq = (snap) => { const o = JSON.parse(snap), list = getReq(), i = list.findIndex((x) => x.id === o.id); if (i > -1) { list[i] = o; setReq(list); } refresh(); };
function setStatus(id, st) {
  const snap = mutReq(id, (r) => { if (r.status === st) return; r.status = st; (r.history ||= []).push({ t: isoNow(), status: st, by: 'Менеджер' }); });
  if (!snap) return;
  if (JSON.parse(snap).status === st) return;
  toast(`Статус запроса ${esc(id)}: ${esc(stName[st])}`, () => restoreReq(snap));
  refresh();
}

// ---------- правки каталога ----------
const ORIG = { price: (p) => p.price, stock: (p) => p.stock, description: (p) => p.description || '', metaTitle: () => '', metaDesc: () => '' };
function setOverride(code, patch) {
  const ov = getOv(), prev = ov[code] ? { ...ov[code] } : undefined, p = BY.get(code);
  const next = { ...(ov[code] || {}), ...patch };
  Object.keys(ORIG).forEach((k) => { if (k in next && next[k] === ORIG[k](p)) delete next[k]; });
  if (!next.hidden) delete next.hidden;
  if (Object.keys(next).length) ov[code] = next; else delete ov[code];
  setOv(ov);
  return prev;
}
function restoreOv(code, prev) { const ov = getOv(); if (prev) ov[code] = prev; else delete ov[code]; setOv(ov); refresh(); }

// ---------- сводка ----------
function vDash() {
  const reqs = getReq(), now = new Date(), d0 = S.startOfDay().getTime();
  const live = reqs.filter((r) => r.status !== 'cancelled');
  const day = live.filter((r) => +new Date(r.createdAt) >= d0), week = live.filter((r) => +new Date(r.createdAt) >= d0 - 6 * 864e5);
  const sum = (a) => a.reduce((n, r) => n + (r.total || 0), 0);
  const fresh = reqs.filter((r) => r.status === 'new').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = [...reqs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const days = Array.from({ length: 7 }, (_, i) => { const t = d0 - (6 - i) * 864e5; return { t, n: live.filter((r) => { const c = +new Date(r.createdAt); return c >= t && c < t + 864e5; }).length }; });
  const mx = Math.max(1, ...days.map((x) => x.n));
  const pop = new Map();
  live.forEach((r) => r.items.forEach((i) => pop.set(i.code, (pop.get(i.code) || 0) + i.qty)));
  const top = [...pop].sort((a, b) => b[1] - a[1]).slice(0, 5), tmax = top[0]?.[1] || 1;
  const cnt = Object.fromEntries(ST.map(([s]) => [s, reqs.filter((r) => r.status === s).length]));
  const ov = getOv(), hidden = P.filter((p) => ov[p.code]?.hidden).length, edits = Object.values(ov).filter((o) => 'price' in o).length;
  const greet = now.getHours() < 5 ? 'Доброй ночи' : now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер';
  const dstr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  return {
    title: 'Сводка',
    html: `${head(greet, `${dstr[0].toUpperCase() + dstr.slice(1)}`)}
    <div class="top">
      <section class="hero" aria-label="Итог дня">
        <h2 style="margin-top:0">${fresh.length ? `${fresh.length} ${pl(fresh.length, 'новый запрос', 'новых запроса', 'новых запросов')} без ответа` : 'Все запросы обработаны'}</h2>
        <p>${last ? `Последний запрос ${esc(last.id)} пришёл ${when(last.createdAt)}.` : 'Запросов пока нет.'}</p>
        <div class="stats"><div><b class="num">${day.length}</b><small>за день</small></div><div><b class="num">${week.length}</b><small>за неделю</small></div><div><b class="num">${rub(sum(week))}</b><small>сумма за неделю</small></div></div>
        <div class="acts"><a class="btn white" href="#/requests?st=new">Открыть запросы ${ic('arrow-up-right')}</a><a class="btn line" href="#/products">Товары</a></div>
      </section>
      <section class="card pad">
        <div class="todo-h"><span class="big num">${fresh.length}</span><div><b>${fresh.length ? 'ждут счёта' : 'ничего не ждёт'}</b><small>${rub(sum(fresh))} в новых запросах</small></div></div>
        ${fresh.slice(0, 3).map((r) => `<a class="task" href="#/requests/${encodeURIComponent(r.id)}"><span class="bar"></span><span class="t"><b>${esc(r.customer.company || r.customer.name)}</b><small>${esc(r.id)} · ${when(r.createdAt)}</small></span><b class="num">${rub(r.total)}</b></a>`).join('') || '<p class="empty">Новых запросов нет</p>'}
      </section>
    </div>
    <div class="mid">
      <section class="card pad"><div class="panel-h"><h2>Запросы за 7 дней</h2></div>
        <div class="chart" role="img" aria-label="Запросы по дням: ${days.map((x) => x.n).join(', ')}">${days.map((x, i) => `<div class="col${i === 6 ? ' today' : ''}"><b class="num">${x.n}</b><div class="bar" style="height:${Math.max(3, (x.n / mx) * 100)}px;animation-delay:${i * 40}ms"></div><span>${new Date(x.t).toLocaleDateString('ru-RU', { weekday: 'short' })}</span></div>`).join('')}</div>
      </section>
      <section class="card pad"><div class="panel-h"><h2>Сумма запросов</h2></div>
        <div class="sums"><div><div class="big num">${rub(sum(day))}</div><small>за день, ${day.length} ${pl(day.length, 'запрос', 'запроса', 'запросов')}</small></div><div><div class="big num">${rub(sum(week))}</div><small>за неделю, ${week.length} ${pl(week.length, 'запрос', 'запроса', 'запросов')}</small></div><div><div class="big num">${rub(week.length ? Math.round(sum(week) / week.length) : 0)}</div><small>средний запрос за неделю</small></div></div>
      </section>
    </div>
    <div class="low">
      <section class="card pad"><div class="panel-h"><h2>Популярные товары</h2><a href="#/products">Все товары</a></div>
        ${top.map(([code, q]) => { const p = BY.get(code); return `<div class="hit">${thumb(p)}<div class="nm"><a href="#/products/${encodeURIComponent(code)}">${esc(p ? p.name : code)}</a><div class="meter"><i style="width:${(q / tmax) * 100}%"></i></div></div><span class="q num">${q} шт.</span></div>`; }).join('') || '<p class="empty">Пока нет данных</p>'}
      </section>
      <div class="stack" style="display:grid;gap:16px;align-content:start">
        <section class="card pad flow"><div class="panel-h"><h2>Запросы по статусам</h2><a href="#/requests">Все</a></div>
          ${ST.map(([s, n]) => `<div class="st"><span>${n}</span><span class="meter"><i style="width:${reqs.length ? (cnt[s] / reqs.length) * 100 : 0}%"></i></span><b class="num">${cnt[s]}</b></div>`).join('')}
        </section>
        <section class="card pad"><div class="panel-h"><h2>Каталог</h2><a href="#/products">Открыть</a></div>
          <div class="kv"><div><span>Товаров</span><b class="num">${P.length}</b></div><div><span>Скрыто с витрины</span><b class="num">${hidden}</b></div><div><span>Цен изменено</span><b class="num">${edits}</b></div></div>
        </section>
      </div>
    </div>`,
  };
}

// ---------- запросы: список ----------
const rf = { q: '', st: '' };
const reqHay = (r) => [r.id, r.customer?.name, r.customer?.company, r.customer?.phone, r.customer?.email, r.customer?.inn, ...(r.items || []).map((i) => `${i.code} ${i.name}`)].join(' ').toLowerCase();
function vRequests(_, q) {
  if (q.has('st')) rf.st = q.get('st');
  const rows = () => {
    const all = getReq().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const words = rf.q.toLowerCase().split(/\s+/).filter(Boolean);
    const base = all.filter((r) => words.every((w) => reqHay(r).includes(w)));
    const list = rf.st ? base.filter((r) => r.status === rf.st) : base;
    const tabs = [['', 'Все', base.length], ...ST.map(([s, n]) => [s, n, base.filter((r) => r.status === s).length])];
    return {
      tabs: tabs.map(([s, n, c]) => `<button class="chip${s === 'new' && c ? ' alert' : ''}" data-act="chip" data-v="${s}" aria-pressed="${rf.st === s}">${n}<b class="num">${c}</b></button>`).join(''),
      list: list.length ? `<table class="tbl t-req"><thead><tr><th>Номер</th><th>Дата</th><th>Клиент</th><th>Позиции</th><th class="r">Сумма</th><th>Статус</th></tr></thead><tbody>${list.map((r) => {
        const it = r.items || [];
        return `<tr class="go" data-href="#/requests/${encodeURIComponent(r.id)}"><td class="id"><a href="#/requests/${encodeURIComponent(r.id)}">${esc(r.id)}</a><span class="sub">${when(r.createdAt)}</span></td><td class="c-date num">${when(r.createdAt)}</td><td class="c-cust"><span class="nm">${esc(r.customer?.company || r.customer?.name)}</span><span class="sub">${esc(r.customer?.company ? r.customer.name : '')}</span></td><td class="c-items">${esc(it[0]?.name || '')}${it.length > 1 ? `<span class="sub">и ещё ${it.length - 1}</span>` : `<span class="sub">${it[0] ? `арт. ${esc(it[0].code)}` : ''}</span>`}</td><td class="c-sum r num">${rub(r.total)}</td><td class="c-st">${tag(r.status)}</td></tr>`;
      }).join('')}</tbody></table>` : `<div class="empty"><b>Ничего не найдено</b>Измените поиск или статус.</div>`,
    };
  };
  const draw = () => { const r = rows(); $('#rtabs').innerHTML = r.tabs; $('#rlist').innerHTML = r.list; nbDom($('#rlist')); };
  const n = getReq().length;
  return {
    title: 'Запросы',
    html: `${head('Запросы', `${n} ${pl(n, 'запрос', 'запроса', 'запросов')} от покупателей сайта`)}
      <div class="toolbar"><div class="search">${ic('search')}<label class="sr" for="rq">Поиск по запросам</label><input class="in" id="rq" type="search" placeholder="Номер, компания, артикул" value="${esc(rf.q)}" autocomplete="off"></div></div>
      <div class="tabs" id="rtabs" role="group" aria-label="Статусы"></div>
      <div class="card tbl-wrap" id="rlist"></div>`,
    mount() { draw(); $('#rq').addEventListener('input', (e) => { rf.q = e.target.value; draw(); }); },
    update: draw,
    redraw: draw,
  };
}

// ---------- запрос ----------
function vRequest(id, sub) {
  const r = getReq().find((x) => x.id === id);
  if (!r) return { title: 'Запрос', html: `${head('Запрос не найден', 'Возможно, демо было сброшено.', '', backLink('#/requests', 'Запросы'))}` };
  if (sub === 'invoice') return vInvoice(r);
  const c = r.customer || {};
  const hist = [...(r.history || [])].reverse();
  const canInv = r.status !== 'cancelled';
  return {
    title: r.id,
    html: `${head(`Запрос ${esc(r.id)}`, `${tag(r.status)} <span class="num">${when(r.createdAt)}</span>`, canInv ? `<button class="btn ${r.status === 'new' ? 'blue' : 'ghost'}" data-act="invoice" data-id="${esc(r.id)}">${ic('receipt-text')}${r.status === 'new' ? 'Выставить счёт' : 'Открыть счёт'}</button>` : '', backLink('#/requests', 'Запросы'))}
    <div class="rq"><div class="col">
      <section class="card a-items items"><div class="pad" style="padding-bottom:0"><h2>Позиции</h2></div>
        <table class="tbl t-items"><thead><tr><th></th><th>Товар</th><th class="r">Кол-во</th><th class="r">Цена</th><th class="r">Сумма</th></tr></thead><tbody>${(r.items || []).map((i) => { const p = BY.get(i.code); return `<tr><td class="c-img">${thumb(p)}</td><td class="c-nm"><span class="nm">${p ? `<a href="#/products/${encodeURIComponent(i.code)}">${esc(i.name)}</a>` : esc(i.name)}</span><span class="sub">арт. <span class="mono">${esc(i.code)}</span></span></td><td class="c-qty r num">${i.qty} шт.<span class="m-only"> × ${rub(i.price)}</span></td><td class="c-price r num">${rub(i.price)}</td><td class="c-sum r num">${rub((i.price || 0) * i.qty)}</td></tr>`; }).join('')}</tbody></table>
        <div class="tot"><span>Итого</span><b class="num">${rub(r.total)}</b></div></section>
      <section class="card a-note pad"><div class="fld"><label for="mnote"><h2>Комментарий менеджера</h2></label><textarea class="in" id="mnote" placeholder="Видят только сотрудники">${esc(r.managerNote || '')}</textarea></div><div class="acts" style="margin-top:12px"><button class="btn dark sm" data-act="note" data-id="${esc(r.id)}">Сохранить комментарий</button></div></section>
    </div><div class="col">
      <section class="card a-status pad"><h2 style="margin-bottom:12px">Статус</h2><div class="stbtns" role="group" aria-label="Сменить статус">${ST.map(([s, n]) => `<button class="stbtn s-${s}" data-act="status" data-id="${esc(r.id)}" data-v="${s}" aria-pressed="${r.status === s}">${n}</button>`).join('')}</div></section>
      <section class="card a-client pad"><h2 style="margin-bottom:12px">Клиент</h2><dl class="dl">
        <div><dt>Контакт</dt><dd>${esc(c.name)}</dd></div><div><dt>Компания</dt><dd>${esc(c.company || '—')}${c.inn ? ` <span class="sub mono">ИНН ${esc(c.inn)}</span>` : ''}</dd></div>
        <div><dt>Телефон</dt><dd><a href="tel:${esc((c.phone || '').replace(/[^+\d]/g, ''))}">${esc(c.phone || '—')}</a></dd></div><div><dt>Почта</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd></div>
        ${r.comment ? `<div><dt>Комментарий клиента</dt><dd>${esc(r.comment)}</dd></div>` : ''}</dl></section>
      <section class="card a-history pad"><h2 style="margin-bottom:14px">История</h2><ol class="tl">${hist.map((h) => `<li><b>${esc(stName[h.status] || h.status)}</b><small>${when(h.t)} · ${esc(h.by || '')}</small>${h.note ? `<q>${esc(h.note)}</q>` : ''}</li>`).join('')}</ol></section>
    </div></div>`,
  };
}

// ---------- печатная форма счёта ----------
function vInvoice(r) {
  const rq = getSet().requisites || {}, v = (k) => esc(rq[k]) || `<span class="tag-m">${SELLER}</span>`;
  const c = r.customer || {};
  const inv = (r.history || []).find((h) => h.status === 'invoice');
  const no = 'ВС-' + String(r.id).replace(/\D/g, ''), date = dateFull(inv ? inv.t : r.createdAt);
  return {
    title: 'Счёт ' + no,
    html: `${head(`Счёт ${esc(no)}`, '', `<button class="btn dark" data-act="print">${ic('printer')}Печать</button>`, backLink('#/requests/' + encodeURIComponent(r.id), 'К запросу ' + esc(r.id)))}
    <p class="note-demo no-print">Образец печатной формы. Реквизиты продавца берутся из раздела «Настройки сайта». Пока они не заполнены, в счёте стоят метки.</p>
    <article class="paper">
      <table><tr><td colspan="2"><b>Банк получателя:</b> ${v('bank')}</td><td>БИК</td><td>${v('bik')}</td></tr><tr><td colspan="2">Получатель: ${v('name')}</td><td>Корр. счёт</td><td>${v('ks')}</td></tr><tr><td>ИНН ${v('inn')}</td><td>КПП ${v('kpp')}</td><td>Расчётный счёт</td><td>${v('rs')}</td></tr></table>
      <h2>Счёт на оплату № ${esc(no)} от ${date}</h2>
      <table class="parties"><tr><td>Поставщик:</td><td>${v('name')}, ИНН ${v('inn')}, ${v('addr')}</td></tr><tr><td>Покупатель:</td><td>${esc(c.company || c.name)}${c.inn ? `, ИНН ${esc(c.inn)}` : ', ИНН [не указан в запросе]'}</td></tr><tr><td>Основание:</td><td>Запрос ${esc(r.id)} с сайта</td></tr></table>
      <table><thead><tr><th>№</th><th>Товар</th><th>Артикул</th><th class="r">Кол-во</th><th class="r">Цена</th><th class="r">Сумма</th></tr></thead><tbody>${(r.items || []).map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.name)}</td><td>${esc(i.code)}</td><td class="r">${i.qty} шт.</td><td class="r num">${num(i.price || 0)}</td><td class="r num">${num((i.price || 0) * i.qty)}</td></tr>`).join('')}</tbody></table>
      <p class="sum"><b>Итого к оплате: ${rub(r.total)}</b><br>НДС: <span class="tag-m">[ставка НДС: уточнить у ВатерСити]</span></p>
      <p class="words">Всего ${(r.items || []).length} ${pl((r.items || []).length, 'наименование', 'наименования', 'наименований')} на сумму ${rub(r.total)} (${esc(S.inWords(r.total || 0).toLowerCase())}).</p>
      <p style="margin-top:10px;color:#555">Срок оплаты и отгрузки: <span class="tag-m">[условия ВатерСити]</span></p>
      <div class="sign"><div>Руководитель <span class="tag-m">[подпись]</span></div><div>Бухгалтер <span class="tag-m">[подпись]</span></div></div>
    </article>`,
  };
}

// ---------- товары ----------
const pf = { q: '', sec: '', brand: '', stock: '', limit: 60 };
const hay = (p) => `${p.code} ${p.name} ${p.brand || ''} ${(p.specs || []).map((s) => s[1]).join(' ')}`.toLowerCase();
function prodRow(p0) {
  const p = eff(p0), o = getOv()[p0.code] || {}, ch = 'price' in o && o.price !== p0.price;
  const stocks = [...new Set([...STOCKS, p0.stock, p.stock].filter(Boolean))];
  return `<tr data-code="${esc(p0.code)}" class="${o.hidden ? 'is-hidden' : ''}${ch ? ' row-changed' : ''}">
    <td class="c-img">${thumb(p0)}</td>
    <td class="c-name"><span class="nm"><a href="#/products/${encodeURIComponent(p0.code)}">${esc(p0.name)}</a></span><span class="sub"><span class="mono">${esc(p0.code)}</span>${p0.brand ? ' · ' + esc(p0.brand) : ''}</span></td>
    <td class="c-sec">${esc(p0.section?.name || '')}</td>
    <td class="c-price r"><div class="price-cell"><label class="sr" for="pr-${esc(p0.code)}">Цена, ₽: ${esc(p0.name)}</label><input class="in price-in num" id="pr-${esc(p0.code)}" data-in="price" inputmode="numeric" autocomplete="off" placeholder="по запросу" value="${p.price == null ? '' : num(p.price)}"><span class="was">${ch ? `было <s class="num">${p0.price == null ? 'по запросу' : num(p0.price)}</s>` : ''}</span></div></td>
    <td class="c-stock"><label class="sr" for="st-${esc(p0.code)}">Наличие: ${esc(p0.name)}</label><select class="in sel-s" id="st-${esc(p0.code)}" data-in="stock">${stocks.map((s) => `<option${s === p.stock ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></td>
    <td class="c-vis"><div class="vis"><button type="button" class="switch sm" role="switch" aria-checked="${!o.hidden}" aria-label="На витрине: ${esc(p0.name)}" data-act="vis" data-code="${esc(p0.code)}"></button><span>${o.hidden ? 'Скрыт' : 'На витрине'}</span></div></td>
    <td class="c-go"><a class="go-lnk" href="#/products/${encodeURIComponent(p0.code)}" aria-label="Открыть товар">${ic('chevron-right')}</a></td></tr>`;
}
function vProducts(_, q) {
  if (q.has('section')) { Object.assign(pf, { sec: q.get('section'), q: '', brand: '', stock: '', limit: 60 }); }
  const brands = [...new Set(P.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const secs = TREE.flatMap((g) => g.list);
  const list = () => {
    const ov = getOv(), words = pf.q.toLowerCase().split(/\s+/).filter(Boolean);
    return P.filter((p) => (!pf.sec || p.section?.slug === pf.sec) && (!pf.brand || p.brand === pf.brand)
      && (!pf.stock || (pf.stock === '_hidden' ? ov[p.code]?.hidden : eff(p).stock === pf.stock)) && words.every((w) => hay(p).includes(w)));
  };
  const draw = () => {
    const all = list(), shown = all.slice(0, pf.limit), ov = getOv();
    $('#pcount').textContent = `${all.length} из ${P.length}`;
    $('#plist').innerHTML = shown.length ? `<table class="tbl t-prod"><thead><tr><th></th><th>Товар</th><th>Раздел</th><th class="r">Цена, ₽</th><th>Наличие</th><th>Витрина</th><th></th></tr></thead><tbody>${shown.map(prodRow).join('')}</tbody></table>${all.length > shown.length ? `<div class="more"><button class="btn ghost" data-act="more">Показать ещё ${Math.min(60, all.length - shown.length)}</button></div>` : ''}` : `<div class="empty"><b>Ничего не найдено</b>Измените поиск или фильтры.</div>`;
    nbDom($('#plist'));
    const hid = P.filter((p) => ov[p.code]?.hidden).length;
    $('#bulk').innerHTML = hid < P.length ? `<button class="btn ghost" data-act="hide-all">${ic('eye-off')}Скрыть все с витрины</button>` : '';
    $('#bulk').innerHTML += hid ? `<button class="btn ghost" data-act="show-all">${ic('eye')}Вернуть на витрину${hid < P.length ? ` (${hid})` : ' все'}</button>` : '';
  };
  const opts = (arr, cur, all) => `<option value="">${all}</option>${arr.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`).join('')}`;
  const stOpts = [...new Set([...STOCKS, ...P.map((p) => p.stock)].filter(Boolean))].map((s) => [s, s]).concat([['_hidden', 'Скрыты с витрины']]);
  return {
    title: 'Товары',
    html: `${head('Товары', `<span id="pcount" class="num"></span>, цены и наличие меняются прямо в строке`, '<span id="bulk" class="acts" style="display:contents"></span>')}
      <div class="toolbar"><div class="search">${ic('search')}<label class="sr" for="pq">Поиск по артикулу и названию</label><input class="in" id="pq" type="search" placeholder="Артикул или название" value="${esc(pf.q)}" autocomplete="off"></div>
        <label class="sr" for="fsec">Раздел</label><select class="in" id="fsec">${opts(secs.map((s) => [s.slug, `${s.name} (${s.count})`]), pf.sec, 'Все разделы')}</select>
        <label class="sr" for="fbr">Бренд</label><select class="in" id="fbr">${opts(brands.map((b) => [b, b]), pf.brand, 'Все бренды')}</select>
        <label class="sr" for="fst">Наличие</label><select class="in" id="fst">${opts(stOpts, pf.stock, 'Любое наличие')}</select></div>
      <div class="card tbl-wrap" id="plist" style="margin-top:14px"></div>`,
    mount() {
      draw();
      const bind = (id, k) => $(id).addEventListener('input', (e) => { pf[k] = e.target.value; pf.limit = 60; draw(); });
      bind('#pq', 'q'); bind('#fsec', 'sec'); bind('#fbr', 'brand'); bind('#fst', 'stock');
    },
    redraw: draw,
  };
}
// точечное обновление одной строки (фокус соседних полей не теряется)
function patchRow(code) {
  const tr = $(`#plist tr[data-code="${CSS.escape(code)}"]`);
  if (!tr) return;
  const t = document.createElement('tbody'); t.innerHTML = prodRow(BY.get(code));
  const n = t.firstElementChild;
  tr.className = n.className;
  ['.c-price', '.c-vis'].forEach((s) => { tr.querySelector(s).innerHTML = n.querySelector(s).innerHTML; });
  const sel = tr.querySelector('select'); sel.innerHTML = n.querySelector('select').innerHTML;
  nbDom(tr);
}

// ---------- товар ----------
const autoTitle = (p) => `${p.name}, артикул ${p.code} | ВатерСити`;
const autoDesc = (p) => `${p.name}${p.brand ? ' (' + p.brand + ')' : ''}. ${p.price != null ? 'Цена ' + rub(p.price) + '. ' : ''}Оформите запрос на счёт: наличие и срок поставки подтвердит менеджер.`;
function vProduct(code) {
  const p0 = BY.get(code);
  if (!p0) return { title: 'Товар', html: head('Товар не найден', 'Проверьте артикул в адресе.', '', backLink('#/products', 'Товары')) };
  const p = eff(p0), o = getOv()[code] || {};
  const stocks = [...new Set([...STOCKS, p0.stock, p.stock].filter(Boolean))];
  const mt = o.metaTitle || '', md = o.metaDesc || '';
  return {
    title: p0.name,
    html: `${head(esc(p0.name), `<span class="mono">${esc(code)}</span>${p0.brand ? ' · ' + esc(p0.brand) : ''}${p0.section ? ' · ' + esc(p0.section.name) : ''}`,
      `<a class="btn ghost" href="${esc(S.shopUrl(p0))}" target="_blank" rel="noopener">${ic('external-link')}Открыть на сайте</a><button class="btn ghost" data-act="vis" data-code="${esc(code)}" data-big>${ic(o.hidden ? 'eye' : 'eye-off')}${o.hidden ? 'Вернуть на витрину' : 'Скрыть с витрины'}</button>`, backLink('#/products', 'Товары'))}
    <form class="pr" data-form autocomplete="off" novalidate>
      <div class="stack"><section class="card pad"><div class="pimg${p0.img ? '' : ' ph'}">${p0.img ? `<img src="${esc(imgOf(p0))}" alt="${esc(p0.name)}"${p0.imgW ? ` width="${p0.imgW}" height="${p0.imgH}"` : ''}>` : `<span>${ic('image-off')}<br>Фото нет в каталоге</span>`}</div>
        <p style="margin-top:12px;color:var(--ink-3);font-size:12.5px">${o.hidden ? 'Товар скрыт с витрины.' : 'Товар виден на витрине.'}</p></section>
        <section class="card pad specs"><h2>Характеристики</h2><table class="tbl" style="margin-top:6px"><tbody>${(p0.specs || []).filter(([k]) => k).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v) || '—'}</td></tr>`).join('') || '<tr><td colspan="2">Не указаны</td></tr>'}</tbody></table></section></div>
      <div class="stack">
        <section class="card pad stk"><h2>Цена и наличие</h2><div class="grid2">
          <div class="fld"><label for="f-price">Цена, ₽</label><input class="in num" id="f-price" name="price" inputmode="numeric" placeholder="по запросу" value="${p.price == null ? '' : num(p.price)}"><span class="hint" id="h-price">${p0.price != null && p.price !== p0.price ? `Было ${rub(p0.price)}. ` : ''}Пусто: на сайте «Цена по запросу»</span></div>
          <div class="fld"><label for="f-stock">Наличие</label><select class="in" id="f-stock" name="stock">${stocks.map((s) => `<option${s === p.stock ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></div></div>
          <div class="fld"><label for="f-desc">Описание</label><textarea class="in" id="f-desc" name="description" rows="5" placeholder="Описание для карточки товара">${esc(p.description || '')}</textarea></div></section>
        <section class="card pad stk"><h2>Яндекс и поиск</h2>
          <div class="fld"><label for="f-mt">Заголовок страницы</label><input class="in" id="f-mt" name="metaTitle" value="${esc(mt)}" placeholder="${esc(autoTitle(p))}"><span class="cnt" id="c-mt"></span></div>
          <div class="fld"><label for="f-md">Описание страницы</label><textarea class="in" id="f-md" name="metaDesc" rows="3" placeholder="${esc(autoDesc(p))}">${esc(md)}</textarea><span class="cnt" id="c-md"></span></div>
          <div class="fld"><span class="lb">Так страница может выглядеть в Яндексе</span><div class="snip" aria-live="polite"><div class="u"><span class="fav" aria-hidden="true">В</span><span>watercity.ru <small>› каталог › ${esc(code)}</small></span></div><div class="t" id="s-t"></div><div class="d" id="s-d"></div></div></div></section>
      </div>
      <div class="savebar" data-bar hidden style="grid-column:1/-1"><span>Есть несохранённые изменения</span><button type="button" class="btn line sm" data-act="cancel">Отменить</button><button type="submit" class="btn white sm" data-act="save-product" data-code="${esc(code)}">Сохранить</button></div>
    </form>`,
    mount() {
      const f = $('form[data-form]'), snip = () => {
        const t = $('#f-mt').value.trim() || autoTitle(p), d = $('#f-md').value.trim() || autoDesc(p);
        $('#s-t').textContent = t; $('#s-d').textContent = d;
        const c = (id, n, lim) => { const e = $(id); e.textContent = `${n} из ${lim} знаков`; e.classList.toggle('over', n > lim); };
        c('#c-mt', $('#f-mt').value.length || t.length, 60); c('#c-md', $('#f-md').value.length || d.length, 160);
      };
      snip(); f.addEventListener('input', snip);
      f.addEventListener('submit', (e) => { e.preventDefault(); saveProduct(code); });
    },
  };
}
function saveProduct(code) {
  const v = (id) => $(id).value, raw = v('#f-price').replace(/[\s ₽]/g, '');
  if (raw && !/^\d+$/.test(raw)) { const h = $('#h-price'); h.textContent = 'Цена: только цифры'; h.style.color = 'var(--down)'; $('#f-price').focus(); return; }
  const prev = setOverride(code, { price: raw ? +raw : null, stock: v('#f-stock'), description: v('#f-desc').trim(), metaTitle: v('#f-mt').trim(), metaDesc: v('#f-md').trim() });
  dirty = false; route(true);
  toast('Товар сохранён, витрина покажет правки', () => restoreOv(code, prev));
}

// ---------- разделы ----------
function vSections() {
  const ov = getOv();
  const hid = (slug) => P.filter((p) => p.section?.slug === slug && ov[p.code]?.hidden).length;
  return {
    title: 'Разделы',
    html: `${head('Разделы', `${TREE.reduce((n, g) => n + g.list.length, 0)} ${pl(TREE.reduce((n, g) => n + g.list.length, 0), 'раздел', 'раздела', 'разделов')}, ${P.length} ${pl(P.length, 'товар', 'товара', 'товаров')}`)}
    <div class="tree">${TREE.map((g) => `<section class="card pad"><h2><span>${esc(g.name)}</span><small class="num">${g.total} ${pl(g.total, 'товар', 'товара', 'товаров')}</small></h2>
      ${g.list.map((s) => `<a class="sec" href="#/products?section=${encodeURIComponent(s.slug)}"><span class="nm">${esc(s.name)}</span>${hid(s.slug) ? `<span class="hd num">скрыто ${hid(s.slug)}</span>` : ''}<span class="cn num">${s.count}</span>${ic('chevron-right')}</a>`).join('')}</section>`).join('')}</div>`,
  };
}

// ---------- настройки ----------
const REQ_F = [['name', 'Название организации'], ['inn', 'ИНН'], ['kpp', 'КПП'], ['ogrn', 'ОГРН'], ['addr', 'Юридический адрес'], ['bank', 'Банк'], ['bik', 'БИК'], ['rs', 'Расчётный счёт'], ['ks', 'Корреспондентский счёт'], ['phone', 'Телефон'], ['email', 'Почта']];
function vSettings() {
  const s = getSet(), rq = s.requisites || {};
  const sw = (k, t, d) => `<div class="sw"><div class="t"><b id="l-${k}">${t}</b><small>${d}</small></div><button type="button" class="switch" role="switch" aria-labelledby="l-${k}" aria-checked="${!!s[k]}" data-act="sw" data-k="${k}"></button></div>`;
  return {
    title: 'Настройки сайта',
    html: `${head('Настройки сайта', 'Реквизиты для счетов и уведомления о новых запросах')}
    <div class="set">
      <form class="card pad stk" data-form autocomplete="off"><h2>Реквизиты ВатерСити</h2><p style="color:var(--ink-2)">Попадают в печатную форму счёта. Пока поле пустое, в счёте стоит метка ${SELLER}.</p>
        <div class="grid2">${REQ_F.map(([k, t]) => `<div class="fld"${k === 'name' || k === 'addr' ? ' style="grid-column:1/-1"' : ''}><label for="r-${k}">${t}</label><input class="in" id="r-${k}" name="${k}" value="${esc(rq[k] || '')}" placeholder="${SELLER}"></div>`).join('')}</div>
        <div class="savebar" data-bar hidden><span>Есть несохранённые изменения</span><button type="button" class="btn line sm" data-act="cancel">Отменить</button><button type="submit" class="btn white sm" data-act="save-set">Сохранить</button></div></form>
      <section class="card pad"><h2 style="margin-bottom:6px">Уведомления о новом запросе</h2>
        ${sw('sound', 'Звук в админке', 'Короткий сигнал, пока открыта вкладка. <button type="button" class="btn ghost sm" data-act="test-sound" style="margin-top:6px">Проверить звук</button>')}
        ${sw('telegram', 'Telegram', 'Номер запроса, сумма и ссылка. Без данных покупателя')}
        ${sw('email', 'Почта', 'Письмо менеджеру с составом запроса')}
        <p style="margin-top:12px;color:var(--ink-3);font-size:12.5px">В демо переключатели только сохраняются в этом браузере, ничего не отправляется.</p></section>
    </div>`,
    mount() { $('form[data-form]').addEventListener('submit', (e) => { e.preventDefault(); saveSettings(); }); },
  };
}
function saveSettings() {
  const s = getSet(); s.requisites = {};
  REQ_F.forEach(([k]) => { const v = $('#r-' + k).value.trim(); if (v) s.requisites[k] = v; });
  setSet(s); dirty = false; route(true); toast('Реквизиты сохранены');
}

// ---------- маршрут «запрос» и «товар» ----------
VIEWS.requests = (seg, q) => (seg[0] ? vRequest(seg[0], seg[1]) : vRequests(seg, q));
VIEWS.products = (seg, q) => (seg[0] ? vProduct(seg[0]) : vProducts(seg, q));

// ---------- обновление без перезагрузки ----------
function refresh() {
  if (!$('#view')) return;
  const a = document.activeElement;
  if (view?.update) view.update();
  else if (view?.redraw) view.redraw();
  else if (!dirty && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('#view').contains(a))) route(true);
  badges();
}
let ac;
function beep() {
  try {
    ac ||= new AudioContext(); if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    [[660, 0], [880, 0.16]].forEach(([f, d]) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.2, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.55); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + 0.6); });
  } catch { /* звук не обязателен */ }
}
function notify(r) {
  if (getSet().sound) beep();
  const el = document.createElement('div');
  el.className = 'toast alert';
  el.innerHTML = `${ic('bell')}<div class="tx"><b>Новый запрос ${esc(r.id)}</b><small>${esc(r.customer?.company || r.customer?.name || '')} · ${rub(r.total)}</small></div><a class="b" href="#/requests/${encodeURIComponent(r.id)}">Открыть</a>`;
  nbDom(el); $('#toasts').append(el);
  el.querySelector('a').addEventListener('click', () => el.remove());
  setTimeout(() => el.remove(), 12000);
}
addEventListener('storage', (e) => {
  if (!$('#view')) return;
  if (e.key === null) return location.reload();
  if (e.key === K.req) {
    const list = getReq();
    list.filter((r) => !known.has(r.id) && r.status === 'new').forEach(notify);
    known = new Set(list.map((r) => r.id));
    refresh();
  } else if (e.key === K.ov || e.key === K.set) refresh();
});

// ---------- события ----------
const ACT = {
  login() { sessionStorage.setItem(AUTH, '1'); enter(); },
  logout() { sessionStorage.removeItem(AUTH); login(); },
  async reset() { if (await confirmDlg('Сбросить демо?', 'Запросы, правки цен, наличия, скрытия и настройки вернутся к началу. Витрина в других вкладках тоже вернётся к исходному виду.', 'Сбросить')) { S.resetAll(); location.hash = ''; location.reload(); } },
  chip(el) { rf.st = el.dataset.v; view.redraw(); },
  status(el) { setStatus(el.dataset.id, el.dataset.v); },
  invoice(el) { const r = getReq().find((x) => x.id === el.dataset.id); if (r.status === 'new') setStatus(r.id, 'invoice'); location.hash = `#/requests/${encodeURIComponent(r.id)}/invoice`; },
  print() { print(); },
  note(el) { mutReq(el.dataset.id, (r) => { r.managerNote = $('#mnote').value.trim(); }); toast('Комментарий сохранён'); },
  more() { pf.limit += 60; view.redraw(); },
  vis(el) {
    const code = el.dataset.code, hidden = !getOv()[code]?.hidden, prev = setOverride(code, { hidden });
    toast(hidden ? 'Товар скрыт с витрины' : 'Товар снова на витрине', () => restoreOv(code, prev));
    if ('big' in el.dataset) route(true); else patchRow(code);
  },
  async 'hide-all'() { await bulk(true); },
  async 'show-all'() { await bulk(false); },
  sw(el) { const s = getSet(); s[el.dataset.k] = !s[el.dataset.k]; setSet(s); el.setAttribute('aria-checked', !!s[el.dataset.k]); toast('Настройка сохранена'); if (el.dataset.k === 'sound' && s.sound) beep(); },
  'test-sound'() { beep(); },
  cancel() { dirty = false; route(true); },
};
async function bulk(hide) {
  const ov = getOv(), snap = JSON.stringify(ov), n = hide ? P.filter((p) => !ov[p.code]?.hidden).length : P.filter((p) => ov[p.code]?.hidden).length;
  const ok = await confirmDlg(hide ? 'Скрыть все с витрины?' : 'Вернуть товары на витрину?', hide ? `${n} ${pl(n, 'товар исчезнет', 'товара исчезнут', 'товаров исчезнут')} с сайта, пока вы не вернёте их. Цены и описания сохранятся.` : `${n} ${pl(n, 'товар снова появится', 'товара снова появятся', 'товаров снова появятся')} на сайте.`, hide ? 'Скрыть все' : 'Вернуть');
  if (!ok) return;
  const next = { ...ov };
  P.forEach((p) => { if (hide) next[p.code] = { ...(next[p.code] || {}), hidden: true }; else if (next[p.code]) { delete next[p.code].hidden; if (!Object.keys(next[p.code]).length) delete next[p.code]; } });
  setOv(next);
  toast(hide ? 'Все товары скрыты с витрины' : 'Товары возвращены на витрину', () => { localStorage.setItem(K.ov, snap); refresh(); });
  view.redraw ? view.redraw() : route(true);
}
app.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act]) { if (a.type !== 'submit') e.preventDefault(); ACT[a.dataset.act](a); return; }
  const tr = e.target.closest('tr[data-href]');
  if (tr && !e.target.closest('a,button,input,select')) location.hash = tr.dataset.href;
});
app.addEventListener('input', (e) => { if (e.target.closest('[data-form]')) { dirty = true; $('[data-bar]')?.removeAttribute('hidden'); } });
app.addEventListener('change', (e) => {
  const el = e.target, tr = el.closest('tr[data-code]');
  if (!tr || !el.dataset.in) return;
  const code = tr.dataset.code, p = eff(BY.get(code));
  if (el.dataset.in === 'price') {
    const raw = el.value.replace(/[\s ₽]/g, '');
    if (raw && !/^\d+$/.test(raw)) { el.value = p.price == null ? '' : num(p.price); el.setCustomValidity('Только цифры'); el.reportValidity(); el.setCustomValidity(''); return; }
    const val = raw ? +raw : null;
    if (val === p.price) return;
    const prev = setOverride(code, { price: val });
    toast(`Цена: ${p.price == null ? 'по запросу' : rub(p.price)} → ${val == null ? 'по запросу' : rub(val)}`, () => { restoreOv(code, prev); patchRow(code); });
  } else {
    const prev = setOverride(code, { stock: el.value });
    toast(`Наличие: ${esc(el.value)}`, () => { restoreOv(code, prev); patchRow(code); });
  }
  patchRow(code);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset?.in === 'price') e.target.blur(); });

boot();
