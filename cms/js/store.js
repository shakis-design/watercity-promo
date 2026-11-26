// Данные, localStorage-контракт с /shop/ (см. demo/docs/PLAN.md), форматирование.
export const K = { req: 'wcdemo.requests', ov: 'wcdemo.overrides', set: 'wcdemo.settings', acc: 'wcdemo.account', cart: 'wcdemo.cart', seeded: 'wcdemo.cmsSeeded' };
export const AUTH = 'wcdemo.cmsAuth'; // sessionStorage: вход в демо
// Адрес карточки товара в /shop/. Если у витрины другая схема, меняется только эта строка.
export const shopUrl = (p) => `../shop/product/${encodeURIComponent(p.code)}.html`;

export const ST = [['new', 'Новый запрос'], ['invoice', 'Счёт выставлен'], ['paid', 'Оплачен'], ['shipped', 'Отгружен'], ['done', 'Выполнен'], ['cancelled', 'Отменён']];
export const stName = Object.fromEntries(ST);
export const STOCKS = ['В наличии', 'Под заказ', 'Уточните наличие'];

const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const jset = (k, v) => localStorage.setItem(k, JSON.stringify(v));
export const getReq = () => { const r = jget(K.req, []); return Array.isArray(r) ? r : []; };
export const setReq = (v) => jset(K.req, v);
export const getOv = () => jget(K.ov, {});
export const setOv = (v) => jset(K.ov, v);
export const getSet = () => ({ sound: true, telegram: true, email: true, ...jget(K.set, {}) });
export const setSet = (v) => jset(K.set, v);
export const resetAll = () => { Object.values(K).forEach((k) => localStorage.removeItem(k)); sessionStorage.removeItem(AUTH); };

// ---- загрузка каталога ----
export async function loadCatalog() {
  const [products, sections] = await Promise.all([
    fetch('../data/products.json').then((r) => { if (!r.ok) throw new Error('products ' + r.status); return r.json(); }),
    fetch('../data/sections.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
  ]);
  return { products, sections };
}

// Дерево разделов строим из товаров; sections.json (если читается) добавляет пустые разделы и порядок.
export function buildTree(products, sections) {
  const map = new Map(); // slug -> {slug,name,parent,count}
  const add = (slug, name, parent) => { if (slug && !map.has(slug)) map.set(slug, { slug, name: name || slug, parent: parent || '', count: 0 }); };
  products.forEach((p) => { if (p.section) add(p.section.slug, p.section.name, p.section.parent); });
  const walk = (list, parent) => (Array.isArray(list) ? list : []).forEach((s) => {
    if (!s || typeof s !== 'object') return;
    add(s.slug || s.code || s.id, s.name || s.title, typeof s.parent === 'string' ? s.parent : parent);
    walk(s.children || s.items || s.sections, s.name || s.title || parent);
  });
  walk(Array.isArray(sections) ? sections : sections && (sections.sections || sections.items || Object.values(sections)), '');
  products.forEach((p) => { const s = p.section && map.get(p.section.slug); if (s) s.count++; });
  const nameOf = (x) => (map.get(x)?.name) || x; // parent может быть и названием, и slug
  const parents = new Set([...map.values()].map((s) => nameOf(s.parent)).filter(Boolean));
  const groups = new Map();
  [...map.values()].forEach((s) => {
    const par = nameOf(s.parent);
    if (!par && parents.has(s.name)) return; // верхний раздел показываем как группу
    const g = par || s.name;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(s);
  });
  return [...groups].map(([name, list]) => ({ name, list: list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru')), total: list.reduce((n, s) => n + s.count, 0) }));
}

// Товар с учётом правок из CMS
export const eff = (p, ov) => { const o = ov[p.code]; return o ? { ...p, ...o } : p; };
export const total = (items) => items.reduce((n, i) => n + (i.price || 0) * (i.qty || 0), 0);

// ---- формат ----
const nf = new Intl.NumberFormat('ru-RU');
export const num = (n) => nf.format(n);
export const rub = (n) => (n == null ? 'По запросу' : nf.format(n) + ' ₽');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const D = (x) => new Date(x);
const hm = (d) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const sameDay = (a, b) => a.toDateString() === b.toDateString();
export function when(iso) {
  const d = D(iso), now = new Date();
  if (sameDay(d, now)) return 'сегодня, ' + hm(d);
  if (sameDay(d, new Date(now - 864e5))) return 'вчера, ' + hm(d);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '') + ', ' + hm(d);
}
export const dateFull = (iso) => D(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const pl = (n, a, b, c) => { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };
export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Сумма прописью (рубли), до миллиардов
export function inWords(n) {
  const u = [['', ''], ['один', 'одна'], ['два', 'две'], ['три', 'три'], ['четыре', 'четыре'], ['пять', 'пять'], ['шесть', 'шесть'], ['семь', 'семь'], ['восемь', 'восемь'], ['девять', 'девять'], ['десять', 'десять'], ['одиннадцать', 'одиннадцать'], ['двенадцать', 'двенадцать'], ['тринадцать', 'тринадцать'], ['четырнадцать', 'четырнадцать'], ['пятнадцать', 'пятнадцать'], ['шестнадцать', 'шестнадцать'], ['семнадцать', 'семнадцать'], ['восемнадцать', 'восемнадцать'], ['девятнадцать', 'девятнадцать']];
  const t = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const h = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  const tri = (x, f) => { const r = []; r.push(h[Math.floor(x / 100)]); const y = x % 100; if (y < 20) r.push(u[y][f]); else { r.push(t[Math.floor(y / 10)]); r.push(u[y % 10][f]); } return r.filter(Boolean).join(' '); };
  if (n === 0) return 'ноль рублей';
  const parts = [[Math.floor(n / 1e9) % 1000, 0, ['миллиард', 'миллиарда', 'миллиардов']], [Math.floor(n / 1e6) % 1000, 0, ['миллион', 'миллиона', 'миллионов']], [Math.floor(n / 1e3) % 1000, 1, ['тысяча', 'тысячи', 'тысяч']], [n % 1000, 0, null]];
  const s = parts.filter(([x]) => x).map(([x, f, w]) => tri(x, f) + (w ? ' ' + pl(x, ...w) : '')).join(' ');
  const s2 = s + ' ' + pl(n, 'рубль', 'рубля', 'рублей');
  return s2.charAt(0).toUpperCase() + s2.slice(1);
}

// ---- демо-запросы при первом входе ----
const PEOPLE = [
  ['Виктор Лебедев', 'ООО «Теплосервис Север»', '0000000000'], ['Ирина Волкова', 'ИП Волкова И. А.', ''], ['Сергей Громов', 'ООО «КотельМонтаж»', '0000000001'],
  ['Андрей Мельник', 'ООО «Строй-Контур»', ''], ['Наталья Орлова', 'ООО «Энергия Дома»', '0000000002'], ['Павел Седов', 'Седов П. Н., частное лицо', ''],
  ['Олег Тихонов', 'ООО «Котельные Системы»', '0000000003'], ['Марина Журавлёва', 'ООО «Промтепло Сервис»', '0000000004'], ['Денис Ковалёв', 'ИП Ковалёв Д. В.', ''], ['Елена Фролова', 'ООО «ИнжТехСнаб»', '0000000005'],
];
const PLAN = [ // [статус, минут назад, позиции]
  ['new', 12, 2], ['new', 95, 1], ['new', 300, 3], ['invoice', 1500, 2], ['invoice', 1900, 1], ['paid', 3300, 2], ['paid', 4800, 1], ['shipped', 7000, 3], ['done', 10000, 2], ['cancelled', 8800, 1],
];
export function seedRequests(products) {
  const priced = products.filter((p) => p.price);
  if (!priced.length) return [];
  const flow = ['new', 'invoice', 'paid', 'shipped', 'done'];
  const now = Date.now();
  return PLAN.map(([status, ago, n], i) => {
    const [name, company, inn] = PEOPLE[i % PEOPLE.length];
    const items = Array.from({ length: n }, (_, j) => { const p = priced[(i * 7 + j * 13 + 3) % priced.length]; return { code: p.code, name: p.name, qty: 1 + ((i + j) % 3), price: p.price }; });
    const t0 = now - ago * 60000;
    const upto = status === 'cancelled' ? 1 : flow.indexOf(status);
    const history = [{ t: new Date(t0).toISOString(), status: 'new', by: 'Покупатель' }];
    for (let k = 1; k <= upto; k++) history.push({ t: new Date(t0 + k * 3.2e6).toISOString(), status: flow[k], by: 'Менеджер' });
    if (status === 'cancelled') history.push({ t: new Date(t0 + 4e6).toISOString(), status, by: 'Менеджер', note: 'Клиент нашёл позицию в наличии у себя' });
    return {
      id: '№ ' + (1041 - i), createdAt: new Date(t0).toISOString(), status,
      customer: { name, company, inn, phone: '+7 900 000-00-00', email: `zakaz${i + 1}@example.com` },
      items, total: total(items), comment: i % 3 === 0 ? 'Нужен счёт с НДС, самовывоз' : '', history, source: 'demo',
    };
  });
}
export function ensureSeed(products) {
  if (localStorage.getItem(K.seeded)) return;
  const have = getReq();
  setReq([...have, ...seedRequests(products)]);
  localStorage.setItem(K.seeded, '1');
}

// Неразрывный пробел после слов из 1-3 букв и частых союзов; «ли», «же», «бы» к предыдущему слову.
const RE1 = /(?<![\p{L}\p{N}])([А-Яа-яЁё]{1,3}|через|перед|после|около|между|чтобы|если|когда)[ \t]+(?=\S)/gu;
const RE2 = /[ \t]+(ли|же|бы)(?![\p{L}])/gu;
export const nb = (s) => s.replace(RE1, '$1 ').replace(RE2, ' $1');
export function nbDom(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|TEXTAREA|TITLE|OPTION)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  for (let n = w.nextNode(); n; n = w.nextNode()) { const v = nb(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
}
