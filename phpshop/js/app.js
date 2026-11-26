/* WaterCity template, stage 1 (static). Vanilla JS, no libraries. Everything is guarded by element checks.
   PHPSHOP: in the cut version keep the data-* hooks, replace the demo storage (localStorage "wc-req") with the engine cart
   (js/phpshop.js addToCartList and the mini-cart AJAX), and replace WC_PRODUCTS with the search hints from the engine. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RUB = '\u20BD', NBSP = '\u00a0', EASE = 'cubic-bezier(.22,1,.36,1)';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body, home = body.classList.contains('home');
  var Q = new URLSearchParams(location.search), FAIL = Q.get('fail') || '';
  var P = window.WC_PRODUCTS || [], byC = {};
  P.forEach(function (p) { byC[p.c] = p; });
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + NBSP + RUB; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ic = function (n, c) { return '<svg class="ic' + (c ? ' ' + c : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + n + '"/></svg>'; };
  var live = function (t) { var l = $('#live'); if (l) { l.textContent = ''; setTimeout(function () { l.textContent = t; }, 60); } };
  var anim = function (el, kf, o) { return reduce || !el.animate ? null : el.animate(kf, o); };
  var plural = function (n, a, b, c) { var m = n % 100, k = n % 10; return (m > 10 && m < 15) ? c : k === 1 ? a : (k > 1 && k < 5) ? b : c; };
  var STOCK = [['stock--ask', 'circle-help', 'Уточните наличие'], ['', 'check', 'В наличии'], ['stock--order', 'clock', 'Под заказ']];
  var stockHtml = function (s) { var t = STOCK[s]; return '<span class="stock ' + t[0] + '">' + ic(t[1]) + t[2] + '</span>'; };
  var codeHtml = function (p) { return '<span class="code"><span class="code-l">' + (p.a ? 'Арт.' : 'Код') + '</span> ' + esc(p.a || p.c) + '</span>'; };
  var phHtml = function (p) { return p.i ? '<span class="ph"><img src="img/p/' + p.i + '" alt=""' + (p.w ? ' width="' + p.w + '" height="' + p.h + '"' : '') + ' loading="lazy" decoding="async"></span>' : '<span class="ph ph--none">' + ic('image-off', 'ic-24') + '</span>'; };

  /* ---------- request (cart) state ---------- */
  var KEY = 'wc-req';
  var R = {
    items: (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })(),
    save: function () { try { localStorage.setItem(KEY, JSON.stringify(this.items)); } catch (e) { /* private mode */ } },
    count: function () { return Object.keys(this.items).length; },
    sum: function () { var s = 0, i = this.items; for (var c in i) if (byC[c]) s += byC[c].p * i[c]; return s; },
    has: function (c) { return c in this.items; },
    add: function (c, q) { this.items[c] = Math.max(1, q || 1); this.after(); },
    del: function (c) { delete this.items[c]; this.after(); },
    qty: function (c, q) { if (this.has(c)) { this.items[c] = Math.min(999, Math.max(1, q | 0 || 1)); this.after(); } },
    clear: function () { this.items = {}; this.after(); },
    after: function () { var prev = this.shown; this.save(); this.paint(prev); },
    shown: undefined,
    paint: function (prev) {
      var n = this.count(), bs = $$('.req-n'); // Б2: the strip button has its own counter
      $$('[data-req-n]').forEach(function (e) { if (bs.indexOf(e) < 0) e.textContent = n; });
      var sr = $('[data-req-sr]'); if (sr) sr.textContent = n ? ' (позиций: ' + n + ')' : '';
      $$('[data-drawer-n]').forEach(function (e) { e.hidden = !n; e.textContent = n; });
      bs.forEach(function (b) {
        var d = b.firstElementChild || (b.innerHTML = '<span></span>', b.firstElementChild);
        if (!n) { b.hidden = true; }
        else if (prev === undefined || prev === n || reduce) { d.textContent = n; b.hidden = false; }
        else if (!prev || b.hidden) { d.textContent = n; b.hidden = false; anim(b, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: EASE }); }
        else {
          /* M02: the old digit leaves (up when adding, down when removing), the new one comes from the other side; fast clicks animate only the last change */
          var dir = n > prev ? -1 : 1;
          d.getAnimations().forEach(function (a) { a.cancel(); });
          var out = anim(d, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(' + 8 * dir + 'px)', opacity: 0 }], { duration: 120, easing: 'cubic-bezier(.4,0,1,1)' });
          out.onfinish = function () { d.textContent = n; anim(d, [{ transform: 'translateY(' + -8 * dir + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: EASE }); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
        }
      });
      var sum = this.sum();
      $$('[data-req-sum]').forEach(function (e) { e.textContent = n && sum ? 'Ориентировочно ' + fmt(sum) : ''; });
      var bar = $('#reqbar'); if (bar) { bar.hidden = !n; body.classList.toggle('has-bar', !!n); }
      $$('[data-add]').forEach(function (btn) {
        var c = btn.dataset.add, on = R.has(c), nm = btn.dataset.n || (btn.dataset.n = (btn.getAttribute('aria-label') || '').split(': ').slice(1).join(': '));
        btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on);
        if (btn.classList.contains('add')) btn.setAttribute('aria-label', (on ? 'В запросе, убрать: ' : 'Добавить в запрос: ') + nm);
        var t = $('.tog-t', btn), word = on ? 'В запросе' : 'В запрос';
        if (t && t.textContent !== word) { t.textContent = word; anim(t, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 }); }
      });
      if (R.onchange) R.onchange(); this.shown = n;
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.add[data-add],.tog[data-add]'); if (!b) return;
    var c = b.dataset.add, was = R.has(c);
    b.setAttribute('aria-busy', 'true');
    if (was) R.del(c); else R.add(c, 1);
    b.removeAttribute('aria-busy');
    var p = byC[c]; live((was ? 'Убрано из запроса' : 'Добавлено в запрос') + '. Позиций: ' + R.count() + (p ? '. ' + p.n : ''));
  });
  addEventListener('storage', function (e) { if (e.key === KEY) { try { R.items = JSON.parse(e.newValue) || {}; } catch (x) { R.items = {}; } R.paint(R.shown); } });

  /* ---------- header: shadow, row 1 hide on scroll, home strip ---------- */
  var hdr = $('#hdr'), strip = $('#strip');
  (function () {
    var B3 = true; // Б3: false brings back the old home (row 1 never returns); delete the Б3 block in 80-paket-b.css too
    var UP_AT = 24, DOWN_AT = 8; // row 1 comes back after 24 px up, goes after 8 px down; a change of direction starts the count again
    var setUp = function (u) { hdr.classList.toggle('up', u); document.documentElement.classList.toggle('hdr-up', u); }; // Б7 reads .hdr-up
    var hh = function () { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 72; };
    var maxY = function () { return Math.max(0, document.documentElement.scrollHeight - innerHeight); };
    var prev = scrollY, acc = 0, free = 0, tick = false, lastClose = scrollY;
    var run = function () {
      tick = false;
      /* the position is kept inside the page: the rubber band of iOS (above 0 and below the end) is not a scroll up or down */
      var y = Math.min(Math.max(scrollY, 0), maxY()), dy = y - prev, up = hdr.classList.contains('up'); prev = y;
      hdr.classList.toggle('stuck', y > 8);
      if (dy) acc = dy * acc < 0 ? dy : acc + dy;
      if (!home || B3) {
        if (y <= 0) { if (up) { setUp(false); up = false; } acc = 0; } // the top: pinned and natural are the same picture, nothing moves
        else if (y >= hh() && performance.now() >= free) { // between 0 and the header height nothing is switched (no jump at the top)
          if (!up && acc <= -UP_AT) { setUp(true); up = true; acc = 0; flash('a-up'); }
          else if (up && acc >= DOWN_AT) { setUp(false); up = false; acc = 0; flash('a-down'); }
        }
      }
      hdr.classList.toggle('top-off', y > hh() && !up); // Б2: row 1 is gone, the strip shows its own "Запрос"
      if (Math.abs(y - lastClose) > 8) { closeMega(); closeDd(); lastClose = y; }
    };
    /* one slide (transform, 240 ms) for the header, the strip and the pinned filter row together; a new switch waits until it has finished */
    var flash = function (c) {
      if (reduce) return; var d = document.documentElement; free = performance.now() + 260;
      hdr.classList.remove('a-up', 'a-down'); d.classList.remove('hdr-a-up', 'hdr-a-down'); void hdr.offsetWidth; hdr.classList.add(c); d.classList.add('hdr-' + c);
      setTimeout(function () { hdr.classList.remove(c); d.classList.remove('hdr-' + c); }, 260);
    };
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    run();
    var hs = $('[data-hero-search]');
    if (home && hs && strip && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { var r = en[0]; strip.classList.toggle('show', !r.isIntersecting && r.boundingClientRect.bottom < 0); }, { threshold: 0 }).observe(hs);
    }
  })();

  /* ---------- mega menu and dropdowns ---------- */
  var mega = $('#mega'), megaBtns = $$('[data-mega]'), megaTimer;
  function openMega(trigger) {
    if (!mega || matchMedia('(max-width:1023px)').matches) return;
    closeDd(); clearTimeout(megaTimer);
    var host = trigger.closest('.strip') || trigger.closest('.top');
    mega.style.setProperty('--mega-top', Math.round(host.getBoundingClientRect().bottom) + 'px');
    mega.hidden = false; megaBtns.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var on = $('.ct>li.on', mega) || $('.ct>li', mega); setOn(on);
  }
  function closeMega(focusBack) {
    if (!mega || mega.hidden) return; mega.hidden = true;
    megaBtns.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focusBack) { var t = megaBtns.filter(function (b) { return b.offsetParent; })[0]; if (t) t.focus(); }
  }
  function setOn(li) { $$('.ct>li', mega).forEach(function (x) { x.classList.toggle('on', x === li); }); }
  if (mega) {
    megaBtns.forEach(function (b) {
      b.addEventListener('click', function () { if (mega.hidden) { openMega(b); var a = $('.ct>li>a', mega); if (a) a.focus(); } else closeMega(); });
      if (matchMedia('(hover:hover)').matches) {
        b.addEventListener('mouseenter', function () { clearTimeout(megaTimer); megaTimer = setTimeout(function () { openMega(b); }, 120); });
        b.addEventListener('mouseleave', function () { clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 200); });
      }
    });
    mega.addEventListener('mouseenter', function () { clearTimeout(megaTimer); });
    mega.addEventListener('mouseleave', function () { clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 200); });
    $$('.ct>li', mega).forEach(function (li) { li.addEventListener('mouseenter', function () { setOn(li); }); li.firstElementChild.addEventListener('focus', function () { setOn(li); }); });
    mega.addEventListener('keydown', function (e) {
      var a = document.activeElement, top = $$('.ct>li>a', mega), i = top.indexOf(a);
      if (e.key === 'Escape') { e.preventDefault(); closeMega(true); }
      else if (i > -1 && e.key === 'ArrowDown') { e.preventDefault(); (top[i + 1] || top[0]).focus(); }
      else if (i > -1 && e.key === 'ArrowUp') { e.preventDefault(); (top[i - 1] || top[top.length - 1]).focus(); }
      else if (i > -1 && e.key === 'ArrowRight') { var s = $('ul a', a.parentNode); if (s) { e.preventDefault(); s.focus(); } }
      else if (i < 0 && e.key === 'ArrowLeft') { var li = a.closest('.ct>li'); if (li) { e.preventDefault(); li.firstElementChild.focus(); } }
    });
    mega.addEventListener('focusout', function (e) { if (e.relatedTarget && !mega.contains(e.relatedTarget) && !megaBtns.some(function (b) { return b === e.relatedTarget; })) closeMega(); });
  }
  function closeDd(except) { $$('[data-dd]').forEach(function (b) { if (b === except) return; b.setAttribute('aria-expanded', 'false'); var t = document.getElementById(b.getAttribute('aria-controls')); if (t) t.hidden = true; }); }
  $$('[data-dd]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = document.getElementById(b.getAttribute('aria-controls')), open = t.hidden; closeDd(b); closeMega();
      t.hidden = !open; b.setAttribute('aria-expanded', open);
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-dd')) closeDd();
    if (mega && !mega.hidden && !e.target.closest('#mega') && !e.target.closest('[data-mega]')) closeMega();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var a = document.activeElement, open = $$('[data-dd]').filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
    if (mega && !mega.hidden) closeMega(mega.contains(a) || megaBtns.indexOf(a) > -1);
    if (open) { var inside = open.closest('.nav-dd').contains(a); closeDd(); if (inside) open.focus(); }
  });

  /* ---------- mobile drawer ---------- */
  var drawer = $('#drawer'), scrim = $('#scrim'), burger = $('.burger');
  if (drawer && mega) {
    var clone = $('.ct', mega).cloneNode(true), host = $('[data-tree-clone]', drawer);
    $$('.ct>li', clone).forEach(function (li) {
      if (!$('ul', li)) return;
      var t = document.createElement('button'); t.type = 'button'; t.className = 'ct-t'; t.setAttribute('aria-expanded', 'false');
      t.setAttribute('aria-label', 'Подразделы: ' + li.firstElementChild.textContent); t.innerHTML = ic('chevron-down');
      t.addEventListener('click', function () { var o = !li.classList.contains('open'); li.classList.toggle('open', o); t.setAttribute('aria-expanded', o); });
      li.appendChild(t);
    });
    host.appendChild(clone);
    var rest = function () { return $$('#main,.foot,#cookie,#reqbar,.pbar,.hdr'); };
    var focusables = function () { return $$('a[href],button:not([disabled]),input,summary,[tabindex="0"]', drawer).filter(function (x) { return x.offsetParent && !x.closest('[hidden]'); }); };
    var openDrawer = function () {
      closeMega(); closeDd(); drawer.removeAttribute('inert'); drawer.classList.add('open'); scrim.hidden = false; body.classList.add('lock');
      rest().forEach(function (x) { x.setAttribute('inert', ''); }); burger.setAttribute('aria-expanded', 'true');
      setTimeout(function () { drawer.focus({ preventScroll: true }); }, 50); // the drawer itself, not the search field: the phone keyboard opens only on a touch in the field
    };
    var closeDrawer = function (jump) {
      if (!drawer.classList.contains('open')) return;
      drawer.classList.remove('open'); drawer.setAttribute('inert', ''); scrim.hidden = true; body.classList.remove('lock');
      rest().forEach(function (x) { x.removeAttribute('inert'); }); burger.setAttribute('aria-expanded', 'false'); if (jump !== true) burger.focus();
    };
    burger.addEventListener('click', openDrawer); scrim.addEventListener('click', function () { closeDrawer(); });
    $('[data-drawer-close]', drawer).addEventListener('click', function () { closeDrawer(); });
    /* a link inside the drawer (an anchor on this page, "Подобрать по модели") closes it first, the page then jumps */
    drawer.addEventListener('click', function (e) { if (e.target.closest('a[href]')) closeDrawer(true); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key !== 'Tab') return; var f = focusables(), a = document.activeElement;
      if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    matchMedia('(min-width:1160px)').addEventListener('change', function (m) { if (m.matches) closeDrawer(); });
  }

  /* ---------- instant search ---------- */
  var phq = matchMedia('(max-width:767px)');
  var LAG = parseInt(Q.get('lag'), 10) || 0;
  $$('form[data-live]').forEach(function (f) {
    var inp = $('input[type=search]', f), drop = $('.drop', f), lb = $('.drop-l', drop), dx = $('.drop-x', drop), x = $('.search-x', f), timer, sel = -1, seq = 0;
    var items = function () { return $$('[role=option]', lb); };
    var close = function () { drop.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); sel = -1; seq++; idle(); };
    var find = function (q) {
      var w = q.toLowerCase().split(/\s+/).filter(Boolean);
      return P.filter(function (p) { var s = (p.n + ' ' + p.c + ' ' + p.a + ' ' + p.b).toLowerCase(); return w.every(function (k) { return s.indexOf(k) > -1; }); });
    };
    var foot = function (q, none) { // Б8: the selection window opens on this page with the query in "Модель"
      var pod = '<button type="button" class="btn-link" data-dialog="dlg-podbor" data-model="' + esc(q) + '">Подобрать запчасть по модели' + ic('arrow-right') + '</button>';
      if (none) return '<div class="drop-f"><button type="button" class="btn btn-blue btn-sm" data-dialog="dlg-podbor" data-model="' + esc(q) + '">Подобрать по модели</button></div>';
      return '<div class="drop-f"><span><a class="btn-link" href="search.html?words=' + encodeURIComponent(q) + '">Показать все результаты' + ic('arrow-right') + '</a><kbd>Enter</kbd></span><span>Нет нужного в списке? ' + pod + '</span></div>';
    };
    var hit = function (p, i) {
      var on = R.has(p.c);
      return '<div class="hit">' + phHtml(p) + '<div role="option" id="' + lb.id + '-' + i + '" aria-selected="false"><a class="hit-name" href="product.html">' + esc(p.n) + '</a><span class="hit-meta">' + codeHtml(p) + '<span class="hit-st">' + stockHtml(p.s) + '</span></span></div><span class="price num">' + fmt(p.p) + '</span>' +
        '<button type="button" class="tog' + (on ? ' on' : '') + '" data-add="' + p.c + '" aria-pressed="' + on + '" aria-label="' + (on ? 'В запросе, убрать: ' : 'Добавить в запрос: ') + esc(p.n) + '"><span class="tog-i">' + ic('plus', 'ic-plus') + ic('check', 'ic-check') + '</span><span class="tog-t">' + (on ? 'В запросе' : 'В запрос') + '</span></button></div>';
    };
    var idle = function () { f.classList.remove('is-busy'); drop.removeAttribute('aria-busy'); };
    /* the listbox holds only the options; the footer and the messages sit beside it. On a phone the list grows from the field down to the screen edge and the field is brought up first */
    var show = function (hits, extra, say) {
      idle(); var was = drop.hidden; lb.innerHTML = hits; lb.hidden = !hits; dx.innerHTML = extra; drop.hidden = false; inp.setAttribute('aria-expanded', 'true'); sel = -1; live(say);
      if (!phq.matches) { drop.style.maxHeight = ''; return; }
      if (was && !f.closest('.drawer')) f.scrollIntoView({ block: 'start', behavior: 'instant' });
      drop.style.maxHeight = Math.max(180, (window.visualViewport ? visualViewport.height : innerHeight) - drop.getBoundingClientRect().top - 16) + 'px';
    };
    var render = function () {
      var q = inp.value.trim(); x.hidden = !inp.value;
      if (q.length < 2) { close(); return; }
      /* M05: the wave shows only if the answer takes longer than 300 ms (CSS delay); a screen reader hears "Ищем" */
      var my = ++seq; f.classList.add('is-busy'); drop.setAttribute('aria-busy', 'true');
      var say = setTimeout(function () { if (my === seq) live('Ищем'); }, 300);
      setTimeout(function () {
        clearTimeout(say); if (my !== seq) return;
        if (FAIL === 'search') { show('', '<div class="drop-err">Поиск не ответил. Нажмите «Найти», покажем результаты на отдельной странице.</div>', 'Поиск не ответил. Нажмите «Найти»'); return; }
        var r = find(q).slice(0, 4);
        show(r.map(hit).join(''), (r.length ? '' : '<div class="drop-none">Ничего не нашли. Пришлите артикул или модель, проверим вручную.</div>') + foot(q, !r.length), r.length ? 'Подсказок: ' + r.length + '. Стрелки вверх и вниз для выбора' : 'Ничего не нашли');
      }, LAG > 0 ? LAG : 0);
    };
    inp.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 200); x.hidden = !inp.value; });
    inp.addEventListener('focus', function () { if (inp.value.trim().length > 1 && drop.hidden) render(); });
    inp.addEventListener('keydown', function (e) {
      var it = items();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (drop.hidden) { render(); return; } e.preventDefault(); if (!it.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + it.length) % it.length;
        it.forEach(function (h, i) { h.setAttribute('aria-selected', i === sel); }); inp.setAttribute('aria-activedescendant', it[sel].id); it[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && sel > -1 && it[sel]) { e.preventDefault(); location.href = $('a', it[sel]).href; }
      else if (e.key === 'Escape' && !drop.hidden) { e.stopPropagation(); close(); }
    });
    f.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drop.hidden) { close(); inp.focus(); } });
    f.addEventListener('submit', function (e) { if (!inp.value.trim()) { e.preventDefault(); inp.focus(); } });
    x.addEventListener('click', function () { inp.value = ''; x.hidden = true; close(); inp.focus(); });
    document.addEventListener('click', function (e) { if (!f.contains(e.target)) close(); });
    f.addEventListener('focusout', function (e) { if (e.relatedTarget && !f.contains(e.relatedTarget)) close(); });
    f.wcRender = render;
    drop.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
  });
  $$('.chips a[data-q]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); /* the document handler would close the list at once */ var f = $('.hero-search form[data-live]'); if (!f) return; var i = $('input[type=search]', f); i.value = a.dataset.q; i.focus(); f.wcRender(); });
  });

  /* ---------- request panel on the home page ---------- */
  var cart = $('[data-cart]');
  var line = function (c, q) {
    var p = byC[c]; if (!p) return '';
    return '<li data-code="' + c + '"><span class="cart-n">' + esc(p.n) + '</span><div class="qty" data-qty="' + c + '"><button type="button" aria-label="Уменьшить количество" data-step="-1"' + (q < 2 ? ' disabled' : '') + '>' + ic('minus') + '</button><input type="text" inputmode="numeric" value="' + q + '" aria-label="Количество: ' + esc(p.n) + '"><button type="button" aria-label="Увеличить количество" data-step="1">' + ic('plus') + '</button></div><span class="num" data-sum>' + fmt(p.p * q) + '</span></li>';
  };
  /* a quantity change is written into the existing line: the focus stays on the button; at 1 the disabled "minus" hands it to "plus" */
  var qtyLine = function (li) {
    var c = li.dataset.code, q = R.items[c], m = $('[data-step="-1"]', li);
    if (q < 2 && document.activeElement === m) $('[data-step="1"]', li).focus();
    $('input', li).value = q; $('[data-sum]', li).textContent = fmt(byC[c].p * q); m.disabled = q < 2;
  };
  var sayQty = function (c) { live(byC[c].n + ': ' + R.items[c] + NBSP + 'шт, ' + fmt(byC[c].p * R.items[c])); };
  var seen = {};
  var paintCart = function () {
    if (!cart) return; var n = R.count(), list = $('.cart-list', cart);
    $('.cart-empty', cart).hidden = !!n; list.hidden = !n; $('.cart-sum', cart).hidden = !n; $('.cart-note', cart).hidden = !n; $('.btn', cart).hidden = !n;
    var codes = Object.keys(R.items), have = $$('li', list).map(function (li) { return li.dataset.code; });
    if (codes.join() === have.join()) $$('li', list).forEach(qtyLine);
    else {
      list.innerHTML = codes.map(function (c) { return line(c, R.items[c]); }).join('');
      $$('li', list).forEach(function (li) { if (!seen[li.dataset.code] && R.shown !== undefined) li.classList.add('new'); seen[li.dataset.code] = 1; });
    }
    $('[data-cart-sum]', cart).textContent = fmt(R.sum());
  };
  if (cart) {
    cart.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (!b) return; var c = b.closest('[data-qty]').dataset.qty; R.qty(c, R.items[c] + (+b.dataset.step)); sayQty(c); });
    cart.addEventListener('change', function (e) { var q = e.target.closest('[data-qty]'); if (q) R.qty(q.dataset.qty, parseInt(e.target.value, 10)); });
  }
  var prevHook = R.onchange; R.onchange = function () { paintCart(); if (prevHook) prevHook(); };

  /* ---------- cookie banner ---------- */
  (function () {
    var c = $('#cookie'); if (!c) return;
    /* wc-cookie = {"v":"all"|"min","t":ms}; the old plain string and a choice older than 365 days count as no choice */
    var get = function () { try { var o = JSON.parse(localStorage.getItem('wc-cookie')); return o && (o.v === 'all' || o.v === 'min') && Date.now() - o.t < 365 * 864e5 ? o : null; } catch (e) { return null; } };
    var day = function (t) { var d = new Date(t), z = function (n) { return (n < 10 ? '0' : '') + n; }; return z(d.getDate()) + '.' + z(d.getMonth() + 1) + '.' + d.getFullYear(); };
    var state = function (o) { return o ? (o.v === 'all' ? 'Принять, ' : 'Только необходимые, ') + day(o.t) : 'Выбор ещё не сделан'; };
    /* PHPSHOP: сюда код счётчика Метрики, номер от заказчика (вопрос 16) */
    var startCounter = function () { };
    var clearYm = function () {
      var host = location.hostname, p = host.split('.'), dom = [''];
      if (p.length > 1) dom.push(';domain=' + host, ';domain=.' + (p.length > 2 ? p.slice(1).join('.') : host)); /* shortcut: a two-label parent, no .co.uk-style zones */
      document.cookie.split('; ').forEach(function (k) { var n = k.split('=')[0]; if (n.indexOf('_ym') === 0) dom.forEach(function (d) { document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/' + d; }); });
    };
    var h = function () { document.documentElement.style.setProperty('--cookie-h', (!c.hidden && matchMedia('(max-width:767px)').matches ? c.offsetHeight : 0) + 'px'); };
    var open = function (from) { c.hidden = false; h(); c.opener = from; $('[data-cookie]', c).focus({ preventScroll: true }); };
    if (!get()) setTimeout(function () { c.hidden = false; h(); }, 600); else if (get().v === 'all') startCounter();
    c.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cookie]'); if (!b) return;
      var v = b.dataset.cookie, o = { v: v, t: Date.now() };
      try { localStorage.setItem('wc-cookie', JSON.stringify(o)); } catch (x) { /* ignore */ }
      if (v === 'all') startCounter(); else clearYm();
      c.hidden = true; h(); live(v === 'all' ? 'Cookie приняты' : 'Оставлены только необходимые cookie');
      if (c.opener) { c.opener.focus(); c.opener = null; }
      $$('[data-cookie-state]').forEach(function (s) { s.textContent = state(o); });
    });
    $$('[data-cookie-reopen]').forEach(function (b) { b.addEventListener('click', function () { open(b); }); });
    $$('[data-cookie-state]').forEach(function (s) { s.textContent = state(get()); });
    addEventListener('resize', h);
  })();

  /* ---------- forms: options, file, validation, submit ---------- */
  $$('form[data-form]').forEach(function (f) { f.noValidate = true; }); /* without JS the native required check (consent) stays on */
  /* short search placeholder on narrow screens */
  var phs = $$('input[data-ph-s]');
  var phSet = function () { phs.forEach(function (i) { if (!i.dataset.phL) i.dataset.phL = i.placeholder; i.placeholder = phq.matches ? i.dataset.phS : i.dataset.phL; }); };
  phSet(); phq.addEventListener('change', phSet);
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.opts button'); if (!b) return;
    var g = b.parentNode, inp = $('input[type=hidden]', g), other = g.nextElementSibling, on = b.getAttribute('aria-checked') !== 'true'; /* a second press clears the choice */
    $$('button', g).forEach(function (x) { x.setAttribute('aria-checked', on && x === b); }); inp.value = on ? b.textContent.trim() : '';
    if (other && other.classList.contains('opts-other')) { other.hidden = !(on && b.hasAttribute('data-reveal')); if (!other.hidden) $('input', other).focus(); }
  });
  document.addEventListener('keydown', function (e) { /* radiogroup: arrows move the choice */
    var b = e.target.closest && e.target.closest('.opts button'), k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!b || !k) return;
    var bs = $$('button', b.parentNode), n = bs[(bs.indexOf(b) + k + bs.length) % bs.length]; e.preventDefault(); n.focus(); n.click();
  });
  $$('[data-file]').forEach(function (f) {
    var lab = f.closest('.photo'), t = $('[data-file-t]', lab), x = $('[data-file-x]', lab), err = lab.parentNode.parentNode.querySelector('[data-file-err]'), def = t.textContent;
    f.addEventListener('change', function () {
      var file = f.files[0]; if (!file) return;
      var bad = !/^image\/(jpeg|png)$/.test(file.type) || file.size > 10 * 1048576;
      if (err) err.hidden = !bad;
      if (bad) { f.value = ''; return; }
      t.textContent = file.name; lab.setAttribute('data-has', ''); x.hidden = false;
      var mdl = f.form.elements.model; if (mdl && mdl.getAttribute('aria-invalid') === 'true') check(mdl);
    });
    x.addEventListener('click', function (e) { e.preventDefault(); f.value = ''; t.textContent = def; lab.removeAttribute('data-has'); x.hidden = true; });
  });
  var telOk = function (v) { return v.replace(/\D/g, '').length >= 10 && /^[\d\s()+\-]+$/.test(v); };
  var mailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
  var errOf = function (el) { var d = (el.getAttribute('aria-describedby') || '').split(' ').pop(); return d && document.getElementById(d); };
  var check = function (el) {
    var k = el.dataset.v, v = el.type === 'checkbox' ? el.checked : el.value.trim(), ok = true;
    if (el.type === 'checkbox') ok = el.checked;
    else if (k === 'model') ok = !!v || !!(el.form.elements.plate && el.form.elements.plate.files.length); /* the model or the nameplate photo */
    else if (!v) ok = !el.required;
    else if (k === 'tel') ok = telOk(v);
    else if (k === 'email') ok = mailOk(v);
    else if (k === 'inn') ok = /^(\d{10}|\d{12})$/.test(v);
    el.setAttribute('aria-invalid', !ok); var er = errOf(el); if (er) er.hidden = ok; return !!ok;
  };
  var fieldsOf = function (f) { return $$('input,textarea', f).filter(function (el) { return el.dataset.v || el.required; }); };
  document.addEventListener('focusout', function (e) { var el = e.target; if (el.form && el.form.hasAttribute('data-form') && (el.dataset.v || el.required) && el.type !== 'checkbox') check(el); });
  document.addEventListener('input', function (e) { var el = e.target; if (el.form && el.getAttribute('aria-invalid') === 'true') check(el); });
  document.addEventListener('change', function (e) { var el = e.target; if (el.type === 'checkbox' && el.form && el.form.hasAttribute('data-form') && el.dataset.v) check(el); });
  var labelOf = function (el) { var l = el.type === 'checkbox' ? null : document.querySelector('label[for="' + el.id + '"]'); return l ? l.textContent.replace(/, если.*/, '').trim() : 'Согласие'; };
  var blockMsg = function (f, html, cls) { var o = $('.form-err', f); if (o) o.remove(); var d = document.createElement('div'); d.className = 'form-err'; d.setAttribute('role', 'alert'); d.innerHTML = ic('circle-alert') + '<span>' + html + '</span>'; var s = $('[type=submit]', f); s.parentNode.insertBefore(d, s); };
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.hasAttribute('data-form')) return; e.preventDefault();
    if (f.dataset.busy) return;
    var old = $('.form-sum', f); if (old) old.remove(); var oe = $('.form-err', f); if (oe) oe.remove();
    var bad = fieldsOf(f).filter(function (el) { return !check(el); });
    if (bad.length) {
      var s = document.createElement('p'); s.className = 'form-sum'; s.setAttribute('role', 'alert');
      s.innerHTML = 'Проверьте ' + bad.length + ' ' + plural(bad.length, 'поле', 'поля', 'полей') + ': ' + bad.map(function (el) { return '<a href="#' + el.id + '">' + esc(labelOf(el)) + '</a>'; }).join(', ');
      var sb = $('[type=submit]', f); sb.parentNode.insertBefore(s, sb); bad[0].focus(); return;
    }
    /* M04: the button is locked at its width, the label turns to "Отправляем", a T1 section runs along its edge (CSS) */
    var btn = $('[type=submit]', f);
    f.dataset.busy = 1; btn.style.width = btn.offsetWidth + 'px'; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); live('Отправляем');
    var send = document.body.hasAttribute('data-demo')
      ? new Promise(function (r) { setTimeout(function () { r(FAIL === 'form' ? false : FAIL === 'net' ? null : true); }, 700); })
      : (!f.getAttribute('action') || f.getAttribute('action') === '#')
        ? Promise.resolve(false) /* no handler is connected: an error, never a made-up success */
        : fetch(f.action, { method: 'POST', body: new FormData(f) }).then(function (r) { return r.ok; }).catch(function () { return null; });
    send.then(function (ok) {
      delete f.dataset.busy; btn.style.width = ''; btn.disabled = false; btn.removeAttribute('aria-busy');
      if (ok === true) sent(f);
      else blockMsg(f, ok === null ? 'Нет соединения. Проверьте интернет и попробуйте снова' : 'Не отправилось. Попробуйте снова или позвоните: <a href="tel:88002509329">8' + NBSP + '800' + NBSP + '250-93-29</a>');
    });
  });
  $$('[data-form] [type=submit]').forEach(function (b) {
    b.classList.add('send'); b.innerHTML = '<span class="l-idle">' + b.innerHTML + '</span><span class="l-busy" aria-hidden="true">Отправляем</span><i class="run" aria-hidden="true"></i>';
  });
  function sent(f) {
    if (f.hasAttribute('data-ok-event')) { f.dispatchEvent(new CustomEvent('wc:ok', { bubbles: true })); return; }
    var kids = Array.prototype.slice.call(f.childNodes), plane = f.classList.contains('plane'), d = document.createElement('div'), cs = getComputedStyle(f);
    /* the success block takes the height of the form, so the plane and panels do not jump */
    f.style.setProperty('--keep', Math.round(f.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) + 'px');
    d.className = 'form-ok'; d.tabIndex = -1; d.setAttribute('role', 'status');
    d.innerHTML = '<span class="form-ok-i"><svg viewBox="0 0 24 24" aria-hidden="true"><circle pathLength="1" cx="12" cy="12" r="10" transform="rotate(-90 12 12)"/><path pathLength="1" d="m16 9-5.5 5.5L8 12"/></svg></span><h3>' + (f.dataset.okTitle || 'Отправлено') + '</h3><p>' + (f.dataset.okText || '') + '</p><button type="button" class="btn ' + (plane ? 'btn-on-plane' : 'btn-line') + '">' + (f.dataset.okAgain || 'Отправить ещё') + '</button>';
    f.classList.add('is-fading');
    setTimeout(function () {
      f.classList.remove('is-fading'); f.replaceChildren(d); d.focus({ preventScroll: true }); live(f.dataset.okTitle || 'Отправлено');
    }, reduce ? 0 : 120);
    d.addEventListener('click', function (e) {
      if (!e.target.closest('button')) return;
      f.style.removeProperty('--keep'); f.replaceChildren.apply(f, kids); f.reset();
      $$('.opts', f).forEach(function (g) { $$('button', g).forEach(function (b) { b.setAttribute('aria-checked', 'false'); }); $('input[type=hidden]', g).value = ''; });
      $$('.opts-other', f).forEach(function (o) { o.hidden = true; });
      $$('.err', f).forEach(function (er) { er.hidden = true; }); $$('[aria-invalid]', f).forEach(function (x) { x.removeAttribute('aria-invalid'); });
      var first = $('input:not([type=hidden]),textarea', f); if (first) first.focus();
    });
  }

  /* ---------- request page ---------- */
  var rq = $('[data-request]');
  if (rq) {
    var st = Q.get('state') || '', list = $('.rq-lines', rq), form = $('.rq-form', rq);
    var show = function (name) { $$('[data-state]', rq).forEach(function (s) { s.hidden = s.dataset.state !== name; }); };
    if (st === 'filled' && !R.count()) { R.add('2475', 1); R.add('11347', 2); R.add('4141', 1); }
    var lineRq = function (c, q) {
      var p = byC[c], nm = esc(p.n);
      return '<li class="rq-line" data-code="' + c + '">' + phHtml(p) + '<div class="rq-name"><a href="product.html">' + nm + '</a>' + codeHtml(p) + '</div><span class="rq-price num">' + fmt(p.p) + '</span>' +
        '<div class="qty" data-qty="' + c + '"><button type="button" data-step="-1" aria-label="Уменьшить количество"' + (q < 2 ? ' disabled' : '') + '>' + ic('minus') + '</button><input type="text" inputmode="numeric" value="' + q + '" aria-label="Количество: ' + nm + '"><button type="button" data-step="1" aria-label="Увеличить количество">' + ic('plus') + '</button></div>' +
        '<b class="rq-sum num" data-sum>' + fmt(p.p * q) + '</b><button type="button" class="icon-btn rq-del" data-del="' + c + '" aria-label="Убрать из запроса: ' + nm + '">' + ic('trash-2') + '</button></li>';
    };
    var totals = function () { $$('[data-rq-sum]', rq).forEach(function (e) { e.textContent = fmt(R.sum()); }); $$('[data-rq-n]', rq).forEach(function (e) { e.textContent = R.count(); }); };
    var view = function () { if (rq.dataset.mode !== 'success') show(!R.count() && !$('.rq-undo', list) ? 'empty' : 'form'); };
    var renderRq = function () {
      list.innerHTML = Object.keys(R.items).map(function (c) { return lineRq(c, R.items[c]); }).join(''); totals(); view();
    };
    /* a change is written into the lines that exist (the focus stays); the list is rebuilt only when the set of positions differs (another tab) */
    R.onchange = (function (prev) {
      return function () {
        prev && prev();
        if (rq.dataset.mode === 'success') { totals(); return; }
        var have = $$('li[data-code]', list).map(function (li) { return li.dataset.code; }).sort().join();
        if (Object.keys(R.items).sort().join() !== have) renderRq(); else { $$('li[data-code]', list).forEach(qtyLine); totals(); view(); }
        if (R.count()) { var fe = $('.form-err[data-empty]', form); if (fe) fe.remove(); }
      };
    })(R.onchange);
    /* removing a line leaves its own "Убрано: … Вернуть" row, which stays until the page is left; "Вернуть" puts the same line back in its place */
    list.addEventListener('click', function (e) {
      var s = e.target.closest('[data-step]');
      if (s) { var c = s.closest('[data-qty]').dataset.qty; R.qty(c, R.items[c] + (+s.dataset.step)); sayQty(c); return; }
      var d = e.target.closest('[data-del]');
      if (d) {
        var li = d.closest('li'), c2 = d.dataset.del, q = R.items[c2], p = byC[c2];
        var u = document.createElement('li'); u.className = 'rq-undo';
        u.innerHTML = '<span>Убрано: ' + esc(p.n) + '</span> <button type="button" class="btn-link" aria-label="Вернуть в запрос: ' + esc(p.n) + '">Вернуть</button>';
        li.replaceWith(u); delete R.items[c2]; R.save(); R.paint(R.shown);
        $('button', u).addEventListener('click', function () { u.replaceWith(li); R.items[c2] = q; R.after(); $('[data-del]', li).focus(); live('Позиция возвращена в запрос: ' + p.n); });
        $('button', u).focus(); live('Позиция убрана из запроса: ' + p.n);
      }
    });
    list.addEventListener('change', function (e) { var q = e.target.closest('[data-qty]'); if (q) { R.qty(q.dataset.qty, parseInt(e.target.value, 10)); sayQty(q.dataset.qty); } });
    /* an empty request is not sent: this runs before the shared handler and stops it */
    form.addEventListener('submit', function (e) {
      if (R.count()) return;
      e.preventDefault(); e.stopPropagation();
      blockMsg(form, 'В запросе нет позиций. Верните убранные или добавьте товар из каталога'); $('.form-err', form).dataset.empty = 1;
      var back = $('.rq-undo button', list); if (back) back.focus();
    });
    form.addEventListener('wc:ok', function () {
      var snap = Object.keys(R.items).map(function (c) { return { p: byC[c], q: R.items[c] }; });
      $('[data-sent-list]', rq).innerHTML = snap.map(function (s) { return '<li><span>' + esc(s.p.n) + '</span><span class="num">' + s.q + NBSP + 'шт по ' + fmt(s.p.p) + '</span></li>'; }).join('');
      rq.dataset.mode = 'success'; R.clear(); show('success'); var h = $('[data-state=success] .rq-t', rq); if (h) { h.tabIndex = -1; h.focus(); } scrollTo(0, 0);
    });
    if (st === 'error') FAIL = 'form';
    renderRq();
    if (st === 'success') { rq.dataset.mode = 'success'; show('success'); }
    if (st === 'empty') { R.items = {}; renderRq(); show('empty'); }
    if (st === 'errors' || st === 'error') setTimeout(function () { if (!R.count()) { R.add('2475', 1); } form.requestSubmit(); }, 50);
  }

  /* ---------- search results page ---------- */
  var sp = $('[data-search-page]');
  if (sp) {
    var qw = (Q.get('words') || '').trim() || 'Lamborghini'; // demo default; the engine always has a query here
    var rowS = function (p) {
      var on = R.has(p.c);
      return '<article class="row" data-code="' + p.c + '" data-price="' + p.p + '" data-stock="' + p.s + '" data-new="' + (p.nw || 0) + '" data-power="' + (p.pw || 0) + '">' + phHtml(p) + '<div class="row-main"><h3 class="row-name"><a class="row-link" href="product.html">' + esc(p.n) + '</a></h3>' + codeHtml(p) + '</div><span class="row-st">' + stockHtml(p.s) + '</span><span class="price num">' + fmt(p.p) + '</span><button type="button" class="add" data-add="' + p.c + '" aria-pressed="' + on + '" aria-label="Добавить в запрос: ' + esc(p.n) + '">' + ic('plus', 'ic-plus') + ic('check', 'ic-check') + '</button></article>';
    };
    var words = qw.toLowerCase().split(/\s+/), res = P.filter(function (p) { var s = (p.n + ' ' + p.c + ' ' + p.a + ' ' + p.b).toLowerCase(); return words.every(function (k) { return s.indexOf(k) > -1; }); });
    $$('[data-q]', sp).forEach(function (e) { e.textContent = qw; });
    $$('[data-found]', sp).forEach(function (e) { e.textContent = res.length; });
    $$('input[name=words]').forEach(function (i) { i.value = qw; });
    $$('.search-x').forEach(function (b) { b.hidden = false; });
    if (res.length) { $('.plist', sp).innerHTML = res.map(rowS).join(''); $('[data-has]', sp).hidden = false; }
    else { $('[data-none]', sp).hidden = false; var m = $('[data-none] input[name=model]'); if (m) m.value = qw; }
    R.paint(R.shown);
  }

  /* ---------- catalog: filters, sort, view, sheet ---------- */
  var fl = $('[data-filters]');
  if (fl) {
    var pl = $('.plist'), rows = $$('.row', pl), cnt = $('[data-count]'), emp = $('[data-empty]'), chipsBox = $('[data-chips]'), pg = $('.pager');
    var vals = function (n) { return $$('input[name=' + n + ']:checked', fl).map(function (i) { return i.value; }); };
    var apply = function () {
      var br = vals('brand'), rg = vals('reg'), onlyStock = $('input[name=stock]', fl).checked, mn = parseInt($('input[name=pmin]', fl).value, 10) || 0, mx = parseInt($('input[name=pmax]', fl).value, 10) || 1e12, n = 0;
      rows.forEach(function (r) {
        var ok = (!br.length || br.indexOf(r.dataset.brand) > -1) && (!rg.length || rg.indexOf(r.dataset.reg) > -1) && (!onlyStock || r.dataset.stock === '1') && +r.dataset.price >= mn && +r.dataset.price <= mx;
        r.hidden = !ok; if (ok) n++;
      });
      cnt.textContent = 'Найдено: ' + n; emp.hidden = n > 0; pl.hidden = n === 0;
      var tags = br.map(function (v) { return { t: v, n: 'brand', v: v }; }).concat(rg.map(function (v) { return { t: v, n: 'reg', v: v }; }), onlyStock ? [{ t: 'Только в наличии', n: 'stock' }] : [], mn ? [{ t: 'от ' + fmt(mn), n: 'pmin' }] : [], mx < 1e12 ? [{ t: 'до ' + fmt(mx), n: 'pmax' }] : []);
      chipsBox.innerHTML = tags.map(function (g) { return '<button type="button" class="fchip" data-n="' + g.n + '" data-v="' + esc(g.v || '') + '" aria-label="Убрать фильтр: ' + esc(g.t) + '">' + esc(g.t) + ic('x') + '</button>'; }).join('');
      var act = tags.length; $$('[data-filters-n]').forEach(function (e) { e.textContent = act ? ' (' + act + ')' : ''; }); $$('[data-apply-n]').forEach(function (e) { e.textContent = n; });
      if (pg) pg.hidden = !!act;
    };
    /* the price is applied 400 ms after the last digit, the other filters at once */
    var ptm; fl.addEventListener('input', function (e) { clearTimeout(ptm); if (e.target.name === 'pmin' || e.target.name === 'pmax') ptm = setTimeout(apply, 400); else apply(); }); fl.addEventListener('change', function (e) { if (e.target.name !== 'pmin' && e.target.name !== 'pmax') apply(); });
    $$('[data-reset]').forEach(function (b) { b.addEventListener('click', function () { fl.reset(); apply(); }); });
    chipsBox.addEventListener('click', function (e) {
      var c = e.target.closest('.fchip'); if (!c) return; var n = c.dataset.n, at = $$('.fchip', chipsBox).indexOf(c);
      if (n === 'pmin' || n === 'pmax') $('input[name=' + n + ']', fl).value = '';
      else $$('input[name=' + n + ']', fl).forEach(function (i) { if (n === 'stock' || i.value === c.dataset.v) i.checked = false; });
      apply();
      /* the chip is gone: the focus goes to the next one, then the previous one, then to the count */
      var cs = $$('.fchip', chipsBox), nx = cs[at] || cs[at - 1]; if (!nx) { cnt.tabIndex = -1; nx = cnt; } nx.focus();
    });
    $$('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { var t = b.dataset.view === 'tile'; pl.classList.toggle('plist--tile', t); $$('[data-view]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); try { localStorage.setItem('wc-view', b.dataset.view); } catch (e) { /* ignore */ } });
    });
    var v0; try { v0 = localStorage.getItem('wc-view'); } catch (e) { /* ignore */ }
    if (v0 === 'tile') { var tb = $('[data-view=tile]'); if (tb) tb.click(); }
    $$('[data-more]').forEach(function (b) { b.addEventListener('click', function () { var box = b.parentNode; var o = box.classList.toggle('all'); b.setAttribute('aria-expanded', o); b.firstChild.textContent = o ? 'Свернуть' : 'Ещё ' + b.dataset.more; }); });
    var op = $('[data-filters-open]'), sheet = $('.filters-wrap');
    if (op) {
      /* below 1200 the filters are a sheet: dialog role, the rest of the page is inert (not #live: it must keep announcing), Tab cycles inside */
      var sq = matchMedia('(max-width:1199px)'), muted = [];
      var trap = function (on) {
        muted.forEach(function (x) { x.removeAttribute('inert'); }); muted = [];
        if (on) for (var n = sheet; n !== body; n = n.parentNode) Array.prototype.forEach.call(n.parentNode.children, function (x) { if (x !== n && x.tagName !== 'SCRIPT' && x.id !== 'live' && !x.classList.contains('sheet-scrim') && !x.hasAttribute('inert')) { x.setAttribute('inert', ''); muted.push(x); } });
        if (on) { sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Фильтры'); } else { sheet.removeAttribute('role'); sheet.removeAttribute('aria-modal'); sheet.removeAttribute('aria-label'); }
      };
      var oc = function (o, noFocus) { var m = o && sq.matches; sheet.classList.toggle('open', o); op.setAttribute('aria-expanded', o); body.classList.toggle('lock', m); trap(m); var sc = $('.sheet-scrim'); if (sc) sc.hidden = !o; if (noFocus) return; if (o) { var fc = $('summary,input', sheet); fc && fc.focus(); } else op.focus(); };
      op.addEventListener('click', function () { oc(!sheet.classList.contains('open')); });
      $$('[data-sheet-close]').forEach(function (b) { b.addEventListener('click', function () { oc(false); }); });
      var sc0 = $('.sheet-scrim'); if (sc0) sc0.addEventListener('click', function () { oc(false); });
      sheet.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { oc(false); return; }
        if (e.key !== 'Tab' || !sq.matches) return;
        var f = $$('summary,input,button:not([disabled])', sheet).filter(function (x) { return x.offsetParent; }), a = document.activeElement;
        if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      });
      sq.addEventListener('change', function () { if (sheet.classList.contains('open')) oc(false, true); });
    }
    apply();
  }

  /* ---------- product page ---------- */
  var pr = $('[data-product]');
  if (pr) {
    var code = pr.dataset.product, main = $('[data-add-main]'), qin = $('.qty input', pr), added = $('[data-added]'), openb = $('[data-open-request]'), qwrap = $('.qty', pr);
    var pb = $('.pbar'), pbAdd = pb && $('[data-pbar-add]', pb), pbOpen = pb && $('[data-pbar-open]', pb);
    var syncProd = function () {
      var on = R.has(code);
      main.hidden = on; openb.hidden = !on; added.hidden = !on; if (qwrap) qwrap.hidden = on;
      if (pb) { pbAdd.hidden = on; pbOpen.hidden = !on; }
    };
    /* the pressed button hides: the focus goes to "Открыть запрос" next to it, or to the bar's one while the bar stays (the page button is out of view) */
    var addP = function () {
      R.add(code, parseInt(qin.value, 10) || 1); live('Добавлено в запрос. Позиций: ' + R.count());
      var r = openb.getBoundingClientRect(); (pb && !pb.hidden && (r.bottom < 0 || r.top > innerHeight) ? pbOpen : openb).focus({ preventScroll: true });
    };
    main.addEventListener('click', addP); if (pbAdd) pbAdd.addEventListener('click', addP);
    $$('[data-step]', pr).forEach(function (b) { b.addEventListener('click', function () { var q = Math.max(1, (parseInt(qin.value, 10) || 1) + (+b.dataset.step)); qin.value = q; $('[data-step="-1"]', pr).disabled = q < 2; }); });
    var prevH = R.onchange; R.onchange = function () { syncProd(); prevH && prevH(); }; syncProd();
    if (pb && 'IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (en) { en.forEach(function (r) { if (r.target.hidden) return; pb.hidden = r.isIntersecting; body.classList.toggle('has-pbar', !pb.hidden); }); }, { threshold: 0 });
      io2.observe(main); io2.observe(openb);
    }
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.dataset.copy, done = function () { b.classList.add('ok'); var s = $('.copy-ok', b.parentNode); if (s) s.textContent = 'Скопировано'; setTimeout(function () { b.classList.remove('ok'); if (s) s.textContent = ''; }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); done(); }
      });
    });
    var ask = $('[data-ask-toggle]');
    if (ask) ask.addEventListener('click', function () { var f = document.getElementById(ask.getAttribute('aria-controls')), o = f.hidden; f.hidden = !o; ask.setAttribute('aria-expanded', o); if (o) { anim(f, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: EASE }); var i = $('input', f); i && i.focus(); } });
    var dlg = $('dialog.viewer'), ph = $('[data-viewer]');
    if (dlg && ph) {
      ph.addEventListener('click', function () { $('img', dlg).src = ph.dataset.viewer; dlg.showModal(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-viewer-close]')) dlg.close(); });
    }
    /* tabs: tablist on desktop, accordion on phones */
    var tabs = $('[data-tabs]');
    if (tabs) {
      var tb = $$('[data-tab]', tabs), mq = matchMedia('(max-width:767px)');
      var sel = function (btn, focus) {
        tb.forEach(function (b) { var on = b === btn, pn = document.getElementById(b.getAttribute('aria-controls')); b.setAttribute(mq.matches ? 'aria-expanded' : 'aria-selected', on); pn.hidden = !on; if (b.getAttribute('tabindex') !== null || !mq.matches) b.tabIndex = on || mq.matches ? 0 : -1; });
        if (focus) btn.focus();
      };
      var mode = function () {
        tb.forEach(function (b) {
          if (mq.matches) { b.removeAttribute('role'); b.removeAttribute('aria-selected'); document.getElementById(b.getAttribute('aria-controls')).removeAttribute('role'); } else { b.setAttribute('role', 'tab'); b.removeAttribute('aria-expanded'); document.getElementById(b.getAttribute('aria-controls')).setAttribute('role', 'tabpanel'); }
        });
        if (mq.matches) { tabs.removeAttribute('role'); tb.forEach(function (b, i) { var p = document.getElementById(b.getAttribute('aria-controls')); p.hidden = i > 0; b.setAttribute('aria-expanded', i === 0); b.tabIndex = 0; }); } else { tabs.setAttribute('role', 'tablist'); sel(tb[0]); }
      };
      tb.forEach(function (b, i) {
        b.addEventListener('click', function () {
          if (mq.matches) { var p = document.getElementById(b.getAttribute('aria-controls')), o = p.hidden; p.hidden = !o; b.setAttribute('aria-expanded', o); } else sel(b);
        });
        b.addEventListener('keydown', function (e) { if (mq.matches) return; var k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); sel(tb[(i + k + tb.length) % tb.length], true); } });
      });
      mq.addEventListener('change', mode); mode();
    }
  }

  /* ---------- M03: flow along the thread between the steps ---------- */
  var steps = $('#steps');
  if (steps) {
    var lis = $$('li', steps), fine = matchMedia('(hover:hover) and (pointer:fine)').matches, tm;
    var go = function (i) { /* i: step index from 0, -1 resets */
      lis.forEach(function (li, k) { li.classList.toggle('is-cur', k === i); });
      if (i > 0) { steps.dataset.to = i; steps.style.setProperty('--to', i); } else delete steps.dataset.to;
    };
    lis.forEach(function (li, i) {
      /* the reset waits 140 ms, so the flow does not drop while the pointer crosses the gap to the next step */
      if (fine) {
        li.addEventListener('pointerenter', function () { clearTimeout(tm); go(i); });
        li.addEventListener('pointerleave', function () { clearTimeout(tm); tm = setTimeout(function () { go(-1); }, 140); });
      } else li.addEventListener('click', function () { clearTimeout(tm); go(i); tm = setTimeout(function () { go(-1); }, i * 320 + 900); }); // touch: a tap runs the flow to the step, then it settles
      li.addEventListener('focus', function () { go(i); }); li.addEventListener('blur', function () { go(-1); });
    });
    /* touch screens have no hover: the flow runs once to the last step and back when the block first comes into view (not under reduced motion) */
    if (!fine && !reduce && 'IntersectionObserver' in window) {
      var sio2 = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { sio2.disconnect(); go(3); tm = setTimeout(function () { go(-1); }, 2200); } }, { threshold: 0.6 });
      sio2.observe(steps);
    }
  }

  /* ---------- sorting: buttons from 1024, a select below; the choice lives in ?sort= (PHPShop keeps its own parameter) ---------- */
  var sbar = $('[data-sort-bar]'), slist = $('.plist');
  if (sbar && slist) {
    var sbtn = $$('[data-sort-v]', sbar), ssel = $('select[data-sort]', sbar), snum = function (r, k) { return +r.dataset[k] || 0; };
    var SCMP = {
      'default': function (a, b) { return snum(a, 'i') - snum(b, 'i'); },
      'price-asc': function (a, b) { return snum(a, 'price') - snum(b, 'price'); },
      'price-desc': function (a, b) { return snum(b, 'price') - snum(a, 'price'); },
      stock: function (a, b) { var k = [2, 0, 1]; return k[snum(a, 'stock')] - k[snum(b, 'stock')]; },
      name: function (a, b) { return $('.row-name', a).textContent.localeCompare($('.row-name', b).textContent, 'ru'); },
      'new': function (a, b) { return snum(b, 'new') - snum(a, 'new'); },
      'power-desc': function (a, b) { return snum(b, 'power') - snum(a, 'power'); },
      'power-asc': function (a, b) { return (snum(a, 'power') || 1e9) - (snum(b, 'power') || 1e9); }
    };
    $$('.row', slist).forEach(function (r, i) { r.dataset.i = i; });
    var sortBy = function (k, push) {
      if (!SCMP[k]) k = 'default';
      var rows = $$('.row', slist).sort(function (a, b) { return SCMP[k](a, b) || snum(a, 'i') - snum(b, 'i'); });
      rows.forEach(function (r) { slist.appendChild(r); });
      sbtn.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sortV === k); }); ssel.value = k;
      var smb0 = $('.sortmore-b', sbar); if (smb0) smb0.classList.toggle('is-on', !!$('.sortmore-m [aria-pressed="true"]', sbar));
      if (push) { var u = new URL(location.href); if (k === 'default') u.searchParams.delete('sort'); else u.searchParams.set('sort', k); history.replaceState(null, '', u); }
    };
    /* the "Ещё" menu: a disclosure button, arrows move, Esc closes and returns the focus */
    var smore = $('.sortmore', sbar), smb = $('.sortmore-b', sbar), smm = $('.sortmore-m', sbar);
    var mclose = function (back) { if (!smm || smm.hidden) return; smm.hidden = true; smb.setAttribute('aria-expanded', 'false'); if (back) smb.focus(); };
    if (smore) {
      smb.addEventListener('click', function () { var o = smm.hidden; smm.hidden = !o; smb.setAttribute('aria-expanded', o); if (o) $('button', smm).focus(); });
      smore.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !smm.hidden) { e.stopPropagation(); mclose(true); }
        else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !smm.hidden) { var mb = $$('button', smm), i = mb.indexOf(document.activeElement); e.preventDefault(); mb[(i + (e.key === 'ArrowDown' ? 1 : -1) + mb.length) % mb.length].focus(); }
      });
      document.addEventListener('click', function (e) { if (!smore.contains(e.target)) mclose(false); });
      smore.addEventListener('focusout', function (e) { if (e.relatedTarget && !smore.contains(e.relatedTarget)) mclose(false); });
    }
    sbtn.forEach(function (b) { b.addEventListener('click', function () { sortBy(b.dataset.sortV, true); if (b.closest('.sortmore-m')) mclose(true); }); });
    ssel.addEventListener('change', function () { sortBy(ssel.value, true); });
    var s0 = Q.get('sort'); if (s0 && SCMP[s0]) sortBy(s0, false);
  }

  /* ---------- dialog with the selection form, brand filter ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dialog]'); if (!b) return;
    var d = document.getElementById(b.dataset.dialog); if (!d || !d.showModal) return;
    e.preventDefault(); d.showModal(); body.classList.add('lock-dlg'); d.returnTo = b;
    /* "Нет вашей марки?" opens the form on "Другая" with the cursor in the brand field (on the brands page it carries what was typed) */
    var other = b.dataset.brand === 'other' && $('.opts[data-opts=brand] [data-reveal]', d), f;
    if (other) { if (other.getAttribute('aria-checked') !== 'true') other.click(); f = $('.opts-other input', d); var bf = $('[data-brand-filter]'); if (bf && bf.value.trim()) f.value = bf.value.trim(); }
    else f = $('.opts button', d) || $('input:not([type=hidden]):not([type=file])', d);
    if (b.dataset.model) { var mi = $('input[name=model]', d); if (mi) mi.value = b.dataset.model; } // Б8: the query from the hints
    if (f) f.focus();
  });
  $$('dialog.dlg').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-dlg-close]')) d.close(); });
    d.addEventListener('close', function () { body.classList.remove('lock-dlg'); if (d.returnTo) d.returnTo.focus(); });
  });
  var bq = $('[data-brand-filter]');
  if (bq) {
    var bn = $('[data-brand-n]'), bnone = $('[data-brand-none]'), bitems = $$('li[data-b]'), bgroups = $$('[data-g]');
    var bfilter = function () {
      var q = bq.value.trim().toLowerCase(), n = 0;
      bitems.forEach(function (li) { var ok = !q || li.dataset.b.indexOf(q) > -1; li.hidden = !ok; if (ok) n++; });
      bgroups.forEach(function (g) { g.hidden = !$$('li:not([hidden])', g).length; });
      $$('[data-s]').forEach(function (s) { s.hidden = !$$('li:not([hidden])', s).length; });
      $$('.alpha a').forEach(function (a) { var r = document.getElementById(a.getAttribute('href').slice(1)); if (r && r.hidden) a.setAttribute('aria-disabled', 'true'); else a.removeAttribute('aria-disabled'); });
      bnone.hidden = n > 0; bn.textContent = q ? 'Найдено: ' + n : '';
    };
    bq.addEventListener('input', bfilter);
    var bq0 = Q.get('q'); if (bq0) { bq.value = bq0; bfilter(); }
  }
  /* alphabet bar: the current letter follows the scroll (IntersectionObserver), a click scrolls to the row and lights it */
  var alpha = $('.alpha'), brows = $$('.brow');
  if (alpha && brows.length) {
    var alinks = $$('a', alpha);
    /* 22.11 (Илья: «колбасит буквы»): the letter is recounted on every scroll frame against the real bottom of the bar
       (it moves with the header), changes only when the row really changes, and the bar slides to it smoothly;
       while the finger is on the bar it is not pulled back */
    var curId = null, touchT = 0;
    var keepHands = function () { touchT = Date.now(); };
    alpha.addEventListener('pointerdown', keepHands, { passive: true });
    alpha.addEventListener('touchmove', keepHands, { passive: true });
    var setCur = function (id) {
      if (id === curId) return; curId = id;
      alinks.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        if (on) {
          a.setAttribute('aria-current', 'true');
          if (Date.now() - touchT > 1200 && alpha.scrollWidth > alpha.clientWidth) alpha.scrollTo({ left: Math.max(0, a.offsetLeft - alpha.clientWidth / 2 + a.offsetWidth / 2), behavior: reduce ? 'auto' : 'smooth' });
        } else a.removeAttribute('aria-current');
      });
    };
    var recount = function () {
      var line = alpha.getBoundingClientRect().bottom + 8, cur = null, de = document.documentElement;
      var atEnd = window.scrollY + window.innerHeight >= de.scrollHeight - 2;
      // the last row whose top has passed the bar; at the very end of the page the last rows never reach it, so take the last row on screen
      var limit = atEnd ? window.innerHeight : line;
      brows.forEach(function (r) { if (!r.hidden && (!cur || r.getBoundingClientRect().top <= limit)) cur = r; });
      if (cur) setCur(cur.id);
    };
    var arq = 0;
    addEventListener('scroll', function () { if (!arq) arq = requestAnimationFrame(function () { arq = 0; recount(); }); }, { passive: true });
    recount();
    var hl = function (r) {
      brows.forEach(function (x) { x.classList.remove('is-hl'); }); void r.offsetWidth; r.classList.add('is-hl');
      setTimeout(function () { r.classList.remove('is-hl'); }, 1700);
    };
    alpha.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return; e.preventDefault();
      var r = document.getElementById(a.getAttribute('href').slice(1)); if (!r || a.getAttribute('aria-disabled') === 'true') return;
      r.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', a.getAttribute('href')); $('.bletter', r).focus({ preventScroll: true }); hl(r); setCur(r.id);
    });
    var fromHash = function () { var r = /^#g-/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null; if (r && !r.hidden) { hl(r); setCur(r.id); } };
    addEventListener('hashchange', fromHash); fromHash();
  }

  /* ---------- subcategory chips, phone: a chip opens another category and the page stays in place (as in Травница, 22.11) ----------
     on click the row's place on screen is saved; the next page scrolls so the row is in the same place and centres the current chip */
  var subs = $('.subs');
  if (subs) {
    var SK = 'wc-subs', smq = matchMedia('(max-width:767px)');
    var centerSub = function () { var c = $('a[aria-current="page"]', subs); if (c) subs.scrollLeft = c.offsetLeft - (subs.clientWidth - c.offsetWidth) / 2; };
    // demo only: in the static build every chip opens catalog.html?sub=N; PHPSHOP: the engine marks the current subcategory with aria-current="page"
    var subN = +Q.get('sub'); if (subN) { var subA = $$('a', subs)[subN - 1]; if (subA) subA.setAttribute('aria-current', 'page'); }
    var subSaved = null; try { subSaved = JSON.parse(sessionStorage.getItem(SK) || 'null'); sessionStorage.removeItem(SK); } catch (e) { subSaved = null; }
    if (smq.matches) {
      centerSub();
      if (subSaved && Date.now() - subSaved.t < 8000) {
        var keepSub = function () { window.scrollTo({ top: subs.getBoundingClientRect().top + window.scrollY - subSaved.top, left: 0, behavior: 'instant' }); };
        keepSub(); requestAnimationFrame(function () { centerSub(); keepSub(); });
      }
    }
    subs.addEventListener('click', function (e) {
      if (!e.target.closest('a') || !smq.matches) return;
      try { sessionStorage.setItem(SK, JSON.stringify({ top: subs.getBoundingClientRect().top, t: Date.now() })); } catch (err) { /* without storage the next page simply opens at the top */ }
    });
  }

  /* ---------- hero lead-in: a flow runs along T1 to the form while it is hovered or focused ---------- */
  var scene = $('.hero-scene'), pod = $('#podbor'), stm;
  if (scene && pod) {
    var flowOn = function () { clearTimeout(stm); scene.classList.add('is-flow'); };
    var flowOff = function () { clearTimeout(stm); stm = setTimeout(function () { scene.classList.remove('is-flow'); }, 140); };
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) { pod.addEventListener('pointerenter', flowOn); pod.addEventListener('pointerleave', flowOff); }
    pod.addEventListener('focusin', flowOn); pod.addEventListener('focusout', flowOff);
  }

  /* ---------- M06: scheme pipes are drawn once when 40 % of the scheme is visible ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    var figs = $$('.media--scheme');
    if (figs.length) {
      var sio = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('draw'); sio.unobserve(e.target); } }); }, { threshold: 0.4 });
      figs.forEach(function (f) { f.classList.add('is-pending'); sio.observe(f); });
    }
  }

  /* ---------- misc ---------- */
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { print(); }); });
  $$('[data-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.map'), f = document.createElement('iframe');
      f.src = 'https://yandex.ru/map-widget/v1/?text=' + encodeURIComponent('Санкт-Петербург, Московское шоссе, 23к2') + '&z=16'; f.title = 'Карта: Московское шоссе, д. 23, к. 2'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
      box.replaceChildren(f); f.focus();
    });
  });
  $$('[data-toc]').forEach(function (t) {
    var links = $$('a', t), secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) links.forEach(function (a) { a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + x.target.id); }); }); }, { rootMargin: '-96px 0px -70% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  });
  R.paint(undefined);
  R.shown = R.count();
})();
