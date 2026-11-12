/* SBAC Compiler — app shell: router, theme, boot */
(function (S) {
  'use strict';
  const U = S.util;
  const PAGES = ['editor', 'templates', 'tutorial', 'tables', 'exercises'];
  const TITLES = { editor: 'Compiler', templates: 'แม่แบบ', tutorial: 'บทเรียน', tables: 'ตาราง', exercises: 'แบบฝึกหัด' };
  let current = null;

  function parse() {
    const raw = location.hash.replace(/^#\/?/, '');
    const qi = raw.indexOf('?');
    const path = qi < 0 ? raw : raw.slice(0, qi);
    const qs = qi < 0 ? '' : raw.slice(qi + 1);
    const parts = path.split('/').filter(Boolean);
    const page = PAGES.includes(parts[0]) ? parts[0] : 'editor';
    return { page, params: parts.slice(1), query: new URLSearchParams(qs) };
  }

  function route() {
    U.closeMenus();
    const r = parse();
    PAGES.forEach((p) => { document.getElementById('page-' + p).hidden = p !== r.page; });
    U.$$('.mainnav a').forEach((a) => a.classList.toggle('active', a.dataset.page === r.page));
    const center = U.$('#topCenter'), right = U.$('#topRight');
    if (current !== r.page) {
      center.innerHTML = ''; right.innerHTML = '';
      const top = S.pages[r.page].top ? S.pages[r.page].top() : null;
      if (top) { center.append(...top.center); right.append(...top.right); }
    }
    current = r.page;
    document.title = `${TITLES[r.page]} · SBAC Compiler`;
    S.pages[r.page].show(r);
  }

  /* ---------- theme ---------- */
  function isDark() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function paintThemeBtn() {
    const b = U.$('#themeBtn');
    b.innerHTML = '';
    b.append(U.icon(isDark() ? 'sun' : 'moon'));
    b.title = isDark() ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด';
  }
  function toggleTheme() {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    S.store.set('theme', next);
    paintThemeBtn();
    PAGES.forEach((p) => S.pages[p] && S.pages[p].onTheme && S.pages[p].onTheme());
  }

  S.app = { toggleTheme, isDark, route };

  async function boot() {
    paintThemeBtn();
    U.$('#themeBtn').addEventListener('click', toggleTheme);
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { paintThemeBtn(); PAGES.forEach((p) => S.pages[p].onTheme && S.pages[p].onTheme()); });
    try {
      if (typeof initSqlJs !== 'function' || typeof CodeMirror !== 'function') throw new Error('โหลดไลบรารีจาก cdnjs ไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      await S.ws.init();
      PAGES.forEach((p) => S.pages[p].init(document.getElementById('page-' + p)));
      window.addEventListener('hashchange', route);
      route();
      U.$('#boot').remove();
    } catch (e) {
      console.error(e);
      U.$('#boot .boot-card').innerHTML = '';
      U.$('#boot .boot-card').append(U.h('div', { style: { maxWidth: '460px', lineHeight: '1.7' } },
        U.h('b', null, 'เริ่มระบบไม่สำเร็จ'), U.h('br'), String(e.message || e),
        U.h('br'), U.h('button', { class: 'btn btn-sm', style: { marginTop: '12px' }, onclick: () => location.reload() }, 'ลองใหม่')));
    }
  }

  boot();
})(window.SBAC);
