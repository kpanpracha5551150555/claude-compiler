/* SBAC Compiler — shared UI helpers */
window.SBAC = window.SBAC || {};
(function (S) {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /** Tiny hyperscript: h('div', {class:'x', onclick: fn}, child, 'text') */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    for (const c of children) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) append(el, c);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    }
  }

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function debounce(fn, ms) {
    let t;
    return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  }

  /* ---------- Icons (inline SVG, stroke = currentColor) ---------- */
  const ICONS = {
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    db: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
    files: '<path d="M8 3h7l4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v4h4"/><path d="M4 7v12a2 2 0 0 0 2 2h9"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4v4h4"/><path d="M12 7.5V12l3 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    save: '<path d="M5 3.5h11l3.5 3.5v11.5a2 2 0 0 1-2 2h-12.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z"/><path d="M7.5 3.5v5h8v-5"/><rect x="7" y="13" width="10" height="7.5" rx="1"/>',
    share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',
    more: '<circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/>',
    template: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M17 13.5v7M13.5 17h7"/>',
    terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15h4.5"/>',
    check: '<path d="M4.5 12.5l5 5 10-11" stroke-width="3"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8 5.4-5.6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5a2 2 0 0 0 2 1.5h7a2 2 0 0 0 2-1.5l1-12.5M9 7V4.5h6V7"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
    upload: '<path d="M12 15.5V4.5M7 9l5-5 5 5M5 19.5h14"/>',
    book: '<path d="M4 5.5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20.5a2 2 0 0 1 2-2h13v2.5H6"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.6h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    code: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
    reset: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4v4h4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3"/>',
  };
  function icon(name, cls) {
    const span = document.createElement('span');
    span.style.display = 'contents';
    span.innerHTML = `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    return span.firstChild;
  }

  /* ---------- Toast ---------- */
  function toast(msg, type) {
    const box = $('#toasts');
    const t = h('div', { class: 'toast ' + (type || '') }, msg);
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(() => t.remove(), 3000);
  }

  /* ---------- Modal ---------- */
  function modal({ title, body, actions, wide, onClose }) {
    const overlay = h('div', { class: 'overlay' });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const foot = h('div', { class: 'modal-foot' });
    (actions || [{ label: 'ปิด' }]).forEach((a) => {
      const b = h('button', {
        class: 'btn ' + (a.primary ? 'btn-primary' : a.danger ? 'btn-run' : ''),
        onclick: async () => { const r = a.onClick ? await a.onClick() : undefined; if (r !== false) close(); },
      }, a.label);
      foot.appendChild(b);
    });
    const m = h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal-head' }, h('span', null, title || ''),
        h('button', { class: 'icon-btn', 'aria-label': 'ปิด', onclick: close }, icon('x'))),
      h('div', { class: 'modal-body' }, typeof body === 'string' ? h('div', { html: body }) : body),
      foot);
    overlay.appendChild(m);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    const first = m.querySelector('input, textarea, select');
    if (first) setTimeout(() => { first.focus(); first.select && first.select(); }, 30);
    return { close, el: m };
  }
  function confirmBox(title, message, okLabel, danger) {
    return new Promise((resolve) => {
      let done = false;
      modal({
        title, body: h('div', { html: message }),
        actions: [
          { label: 'ยกเลิก', onClick: () => { done = true; resolve(false); } },
          { label: okLabel || 'ตกลง', primary: !danger, danger: !!danger, onClick: () => { done = true; resolve(true); } },
        ],
        onClose: () => { if (!done) resolve(false); },
      });
    });
  }
  function promptBox(title, label, value) {
    return new Promise((resolve) => {
      let done = false;
      const input = h('input', { class: 'input', value: value || '' });
      const submit = () => { done = true; resolve(input.value.trim() || null); };
      const m = modal({
        title, body: h('label', { class: 'field' }, label, input),
        actions: [
          { label: 'ยกเลิก', onClick: () => { done = true; resolve(null); } },
          { label: 'ตกลง', primary: true, onClick: submit },
        ],
        onClose: () => { if (!done) resolve(null); },
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { submit(); m.close(); } });
    });
  }

  /* ---------- Popup menu ---------- */
  function popupMenu(anchor, items) {
    closeMenus();
    const menu = h('div', { class: 'menu', role: 'menu' });
    items.forEach((it) => {
      if (it === '-') return menu.appendChild(h('hr'));
      menu.appendChild(h('button', {
        class: it.danger ? 'danger' : '', role: 'menuitem',
        onclick: () => { closeMenus(); it.onClick(); },
      }, it.icon ? icon(it.icon) : null, h('span', null, it.label), it.key ? h('span', { class: 'k' }, it.key) : null));
    });
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth;
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.left)) + 'px';
    setTimeout(() => document.addEventListener('mousedown', outside), 0);
    function outside(e) { if (!menu.contains(e.target)) closeMenus(); }
    menu._outside = outside;
    return menu;
  }
  function closeMenus() {
    $$('.menu').forEach((m) => { document.removeEventListener('mousedown', m._outside); m.remove(); });
  }

  /* ---------- Values & result tables ---------- */
  function fmtValue(v) {
    if (v === null || v === undefined) return { text: 'NULL', cls: 'null' };
    if (v instanceof Uint8Array) {
      let hex = '0x';
      for (let i = 0; i < Math.min(v.length, 32); i++) hex += v[i].toString(16).padStart(2, '0').toUpperCase();
      if (v.length > 32) hex += '…';
      return { text: hex, cls: '' };
    }
    if (typeof v === 'number') {
      let t = Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
      return { text: t, cls: 'num' };
    }
    return { text: String(v), cls: '' };
  }

  /** Render a grid of rows. opts: {rowNumbers, big, sortable, maxRows} */
  function dataGrid(columns, rows, opts) {
    opts = opts || {};
    const table = h('table', { class: 'grid' + (opts.big ? ' big' : '') + (opts.sortable ? ' sortable' : '') });
    const thead = h('thead');
    const trh = h('tr');
    if (opts.rowNumbers) trh.appendChild(h('th', { class: 'rn' }, '#'));
    columns.forEach((c, i) => {
      const th = h('th', null, c === '' ? '(No column name)' : c);
      if (opts.sortable && opts.onSort) th.addEventListener('click', () => opts.onSort(i));
      if (opts.sortCol === i) th.appendChild(document.createTextNode(opts.sortDir > 0 ? ' ▲' : ' ▼'));
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    const tbody = h('tbody');
    const max = opts.maxRows || rows.length;
    const frag = document.createDocumentFragment();
    for (let r = 0; r < Math.min(rows.length, max); r++) {
      const tr = document.createElement('tr');
      if (opts.rowNumbers) {
        const td = document.createElement('td');
        td.className = 'rn'; td.textContent = (opts.rowOffset || 0) + r + 1; tr.appendChild(td);
      }
      const row = rows[r];
      for (let c = 0; c < columns.length; c++) {
        const f = fmtValue(row[c]);
        const td = document.createElement('td');
        if (f.cls) td.className = f.cls;
        td.textContent = f.text;
        if (f.text.length > 40) td.title = f.text;
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
    table.append(thead, tbody);
    return h('div', { class: 'grid-wrap' }, table);
  }

  /** Render the items of an engine result (tables, messages, errors). */
  function renderItems(items, opts) {
    opts = opts || {};
    const frag = h('div');
    let tableNo = 0;
    const tableCount = items.filter((i) => i.kind === 'table').length;
    items.forEach((it) => {
      if (it.kind === 'table') {
        tableNo++;
        const label = (tableCount > 1 ? `ผลลัพธ์ ${tableNo} · ` : '') + `${it.rows.length.toLocaleString()} แถว` + (it.truncated ? ` (แสดงเฉพาะ ${it.rows.length.toLocaleString()} แถวแรก)` : '');
        const copyBtn = h('button', { title: 'คัดลอกเป็น TSV (วางใน Excel ได้)', onclick: () => {
          const tsv = [it.columns.join('\t')].concat(it.rows.map((r) => r.map((v) => fmtValue(v).text).join('\t'))).join('\n');
          copyText(tsv).then(() => toast('คัดลอกผลลัพธ์แล้ว', 'ok'));
        } }, 'คัดลอก');
        frag.appendChild(h('div', { class: 'result' },
          h('div', { class: 'result-head' }, h('span', null, label), opts.noCopy ? null : copyBtn),
          dataGrid(it.columns, it.rows, { rowNumbers: opts.rowNumbers !== false })));
      } else if (it.kind === 'msg') {
        frag.appendChild(h('div', { class: 'msg ' + (it.tone || '') }, it.text));
      } else if (it.kind === 'error') {
        frag.appendChild(errorBox(it));
      }
    });
    return frag;
  }

  function errorBox(it) {
    const box = h('div', { class: 'err-box' },
      h('div', { class: 'title' }, it.line ? `ข้อผิดพลาด (บรรทัด ${it.line})` : 'ข้อผิดพลาด'),
      h('div', null, it.message));
    if (it.hint) box.appendChild(h('div', { class: 'hint' }, '💡 ' + it.hint));
    if (it.sql) box.appendChild(h('pre', null, it.sql.length > 400 ? it.sql.slice(0, 400) + '…' : it.sql));
    return box;
  }

  /* ---------- CSV / files / clipboard ---------- */
  function toCSV(columns, rows) {
    const q = (v) => {
      if (v === null || v === undefined) return '';
      const s = v instanceof Uint8Array ? fmtValue(v).text : String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [columns.map(q).join(',')].concat(rows.map((r) => r.map(q).join(','))).join('\r\n');
  }
  function parseCSV(text) {
    const rows = []; let row = []; let cur = ''; let i = 0; let inQ = false;
    text = text.replace(/^﻿/, '');
    while (i < text.length) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i += 2; continue; } inQ = false; i++; continue; }
        cur += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { row.push(cur); cur = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
      cur += c; i++;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.length > 1 || (r[0] || '').trim() !== '');
  }
  function downloadText(filename, text, mime) {
    const blob = new Blob(['﻿' + text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function pickFile(accept) {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'file', accept: accept || '*' });
      inp.addEventListener('change', () => {
        const f = inp.files[0];
        if (!f) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve({ name: f.name, text: String(r.result) });
        r.readAsText(f);
      });
      inp.click();
    });
  }
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = t;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    return Promise.resolve();
  }

  /* ---------- base64 helpers ---------- */
  function bytesToB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    const s = atob(b64); const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  async function packShare(obj) {
    const json = new TextEncoder().encode(JSON.stringify(obj));
    let bytes = json; let tag = 'j';
    if (window.CompressionStream) {
      try {
        const cs = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        bytes = new Uint8Array(await new Response(cs).arrayBuffer()); tag = 'z';
      } catch (e) { bytes = json; tag = 'j'; }
    }
    return tag + bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function unpackShare(str) {
    const tag = str[0];
    let b64 = str.slice(1).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    let bytes = b64ToBytes(b64);
    if (tag === 'z') {
      const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(ds).arrayBuffer());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /* ---------- CodeMirror factory ---------- */
  function codeEditor(host, opts) {
    opts = opts || {};
    const st = S.store ? S.store.settings() : {};
    const cm = CodeMirror(host, Object.assign({
      value: opts.value || '',
      mode: 'text/x-mssql',
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      lineWrapping: !!st.wrap,
      extraKeys: {
        'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment',
        'Ctrl-Space': 'autocomplete',
        Tab: (c) => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end'),
      },
      hintOptions: { completeSingle: false },
    }, opts.cm || {}));
    if (st.fontSize) host.style.setProperty('font-size', st.fontSize + 'px');
    if (opts.onRun) {
      cm.addKeyMap({ 'Ctrl-Enter': () => opts.onRun(), 'Cmd-Enter': () => opts.onRun(), F5: () => opts.onRun() });
    }
    if (st.autocomplete !== false) {
      cm.on('inputRead', (c, ch) => {
        if (ch.origin !== '+input' || c.state.completionActive) return;
        const t = ch.text.join('');
        if (/^[A-Za-z_.]$/.test(t)) {
          const cur = c.getCursor();
          const tok = c.getTokenAt(cur);
          if (t === '.' || (tok.string && tok.string.length >= 2)) c.showHint({ completeSingle: false });
        }
      });
    }
    return cm;
  }

  S.util = {
    $, $$, h, esc, uid, debounce, icon, toast, modal, confirmBox, promptBox, popupMenu, closeMenus,
    fmtValue, dataGrid, renderItems, errorBox, toCSV, parseCSV, downloadText, pickFile, copyText,
    bytesToB64, b64ToBytes, packShare, unpackShare, codeEditor,
  };
})(window.SBAC);
