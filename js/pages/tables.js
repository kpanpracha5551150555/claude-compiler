/* SBAC Compiler — Tables page: browse the workspace database */
(function (S) {
  'use strict';
  const U = S.util;
  const { h, icon, toast, modal, confirmBox } = U;
  const engine = S.engine;
  let root, current = null, sub = 'data', state = { q: '', page: 0, sortCol: null, sortDir: 1 };
  const PAGE = 50;

  function schema() { try { return engine.schema(S.ws.db); } catch (e) { return []; } }

  function render() {
    root.innerHTML = '';
    const tables = schema();
    if (!tables.length) {
      root.append(h('div', { class: 'container' }, h('div', { class: 'empty' },
        h('div', { style: { color: 'var(--muted)', marginBottom: '10px' } }, icon('db')),
        h('h2', null, 'ยังไม่มีตารางในฐานข้อมูล'),
        h('p', null, 'รันไฟล์ที่มีคำสั่ง CREATE TABLE ใน Compiler, เลือกแม่แบบ หรือนำเข้าไฟล์ CSV'),
        h('div', { class: 'actions' },
          h('a', { class: 'btn btn-primary', href: '#/templates' }, icon('template'), 'เลือกแม่แบบ'),
          h('a', { class: 'btn', href: '#/editor' }, icon('code'), 'ไปที่ Compiler'),
          h('button', { class: 'btn', onclick: importCsv }, icon('upload'), 'นำเข้า CSV')))));
      return;
    }
    if (current && !tables.some((t) => t.name === current)) current = null;

    const aside = h('aside', { class: 'lesson-nav' },
      h('h4', null, 'ฐานข้อมูลของ workspace'),
      h('a', { class: 'lesson-link' + (!current ? ' active' : ''), href: '#/tables' }, icon('table'), h('span', { class: 'grow' }, 'ภาพรวมทุกตาราง')),
      h('h4', null, `ตาราง (${tables.length})`),
      tables.map((t) => h('a', { class: 'lesson-link' + (current === t.name ? ' active' : ''), href: '#/tables/' + encodeURIComponent(t.name) },
        icon(t.type === 'view' ? 'eye' : 'db'), h('span', { style: { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis' } }, t.name),
        h('span', { class: 'muted small' }, t.rowCount ?? ''))),
      h('div', { style: { display: 'grid', gap: '8px', margin: '18px 6px' } },
        h('button', { class: 'btn btn-sm', onclick: importCsv }, icon('upload'), 'นำเข้า CSV เป็นตาราง'),
        h('button', { class: 'btn btn-sm btn-danger', onclick: resetAll }, icon('reset'), 'Reset ฐานข้อมูล')));
    const main = h('div', { class: 'main' });
    root.append(h('div', { class: 'split' }, aside, main));
    const c = h('div', { class: 'container' });
    main.append(c);
    if (!current) overview(c, tables);
    else detail(c, tables.find((t) => t.name === current), tables);
  }

  function overview(c, tables) {
    const totalRows = tables.reduce((a, t) => a + (t.rowCount || 0), 0);
    c.append(h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'ตาราง'), h('p', null, `${tables.length} ตาราง · ${totalRows.toLocaleString()} แถว — ข้อมูลเดียวกับที่ใช้ใน Compiler (${S.ws.data.name || 'workspace'})`)),
      h('a', { class: 'btn', href: '#/editor' }, icon('code'), 'กลับไป Compiler')));
    tables.forEach((t) => {
      let d = { columns: [], rows: [] };
      try { d = engine.tableData(S.ws.db, t.name, { limit: 10 }); } catch (e) { /* ignore */ }
      c.append(h('div', { class: 'tbl-card' },
        h('h3', null, h('a', { href: '#/tables/' + encodeURIComponent(t.name), style: { color: 'var(--text)' } }, t.name),
          h('span', { class: 'meta' }, `${t.type === 'view' ? 'VIEW · ' : ''}${t.columns.length} คอลัมน์ · ${t.rowCount ?? '?'} แถว${t.rowCount > 10 ? ' · แสดง 10 แถวแรก' : ''}`)),
        U.dataGrid(d.columns, d.rows, { big: true })));
    });
  }

  function detail(c, t, tables) {
    c.append(h('a', { class: 'back-link', href: '#/tables' }, icon('arrowLeft'), 'ภาพรวมทุกตาราง'));
    c.append(h('div', { class: 'page-head', style: { marginTop: '10px' } },
      h('div', null, h('h1', null, t.name), h('p', null, `${t.type === 'view' ? 'VIEW · ' : ''}${t.columns.length} คอลัมน์ · ${t.rowCount ?? '?'} แถว`)),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        h('button', { class: 'btn btn-primary btn-sm', onclick: () => queryInEditor(t) }, icon('play'), 'Query ใน Compiler'),
        h('button', { class: 'btn btn-sm', onclick: () => exportCsv(t) }, icon('download'), 'ส่งออก CSV'),
        h('button', { class: 'btn btn-sm btn-danger', onclick: () => dropTable(t) }, icon('trash'), t.type === 'view' ? 'ลบ View' : 'ลบตาราง'))));
    const tabs = h('div', { class: 'subtabs' });
    [['data', 'ข้อมูล'], ['schema', 'โครงสร้าง'], ['sql', 'คำสั่ง SQL']].forEach(([id, label]) => tabs.append(h('button', { class: sub === id ? 'active' : '', onclick: () => { sub = id; render(); } }, label)));
    c.append(tabs);
    if (sub === 'data') dataView(c, t);
    else if (sub === 'schema') schemaView(c, t, tables);
    else c.append(h('pre', { class: 'code-block' }, t.sql || '-- ไม่มีคำสั่ง'));
  }

  function dataView(c, t) {
    let d;
    try { d = engine.tableData(S.ws.db, t.name, { limit: 10000 }); } catch (e) { c.append(U.errorBox({ message: e.message })); return; }
    let rows = d.rows;
    const q = state.q.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.some((v) => v != null && String(v).toLowerCase().includes(q)));
    if (state.sortCol != null && state.sortCol < d.columns.length) {
      const k = state.sortCol, dir = state.sortDir;
      rows = [...rows].sort((a, b) => {
        const x = a[k], y = b[k];
        if (x == null) return 1; if (y == null) return -1;
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
        return String(x).localeCompare(String(y), 'th') * dir;
      });
    }
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    state.page = Math.min(state.page, pages - 1);
    const search = h('input', { class: 'input', placeholder: 'ค้นหาในตาราง…', value: state.q, style: { maxWidth: '280px', height: '34px' } });
    search.addEventListener('input', U.debounce(() => { state.q = search.value; state.page = 0; render(); setTimeout(() => { const s = root.querySelector('.toolbar input'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 0); }, 250));
    c.append(h('div', { class: 'toolbar' }, search, h('span', { class: 'grow' }),
      h('span', { class: 'muted small' }, q ? `พบ ${rows.length.toLocaleString()} แถว` : `${rows.length.toLocaleString()} แถว`, ' · คลิกหัวคอลัมน์เพื่อเรียง')));
    c.append(U.dataGrid(d.columns, rows.slice(state.page * PAGE, (state.page + 1) * PAGE), {
      rowNumbers: true, rowOffset: state.page * PAGE, sortable: true, sortCol: state.sortCol, sortDir: state.sortDir,
      onSort: (i) => { if (state.sortCol === i) state.sortDir = -state.sortDir; else { state.sortCol = i; state.sortDir = 1; } render(); },
    }));
    if (pages > 1) {
      c.append(h('div', { class: 'pager' },
        h('button', { class: 'btn btn-xs', disabled: state.page === 0, onclick: () => { state.page--; render(); } }, '‹ ก่อนหน้า'),
        `หน้า ${state.page + 1} / ${pages}`,
        h('button', { class: 'btn btn-xs', disabled: state.page >= pages - 1, onclick: () => { state.page++; render(); } }, 'ถัดไป ›')));
    }
  }

  function schemaView(c, t, tables) {
    c.append(U.dataGrid(['#', 'คอลัมน์', 'ชนิดข้อมูล', 'คีย์', 'NULL ได้', 'ค่าเริ่มต้น'],
      t.columns.map((col, i) => {
        const fk = t.fks.find((f) => f.from === col.name);
        return [i + 1, col.name, col.type || '—', [col.pk ? 'PRIMARY KEY' : '', fk ? `FK → ${fk.table}.${fk.to}` : ''].filter(Boolean).join(', ') || '', col.notnull || col.pk ? 'NO' : 'YES', col.dflt];
      })));
    c.append(h('h2', { class: 'section-title' }, 'ความสัมพันธ์ (Foreign key)'));
    const rel = h('div', { class: 'fk-list' });
    t.fks.forEach((f) => rel.append(h('div', null, `${t.name}.${f.from}  →  ${f.table}.${f.to}`)));
    tables.forEach((o) => o.fks.filter((f) => f.table.toLowerCase() === t.name.toLowerCase()).forEach((f) => rel.append(h('div', null, `${o.name}.${f.from}  →  ${t.name}.${f.to}  (ตารางอื่นอ้างถึง)`))));
    if (!rel.children.length) rel.append(h('div', { class: 'muted' }, 'ไม่มีความสัมพันธ์กับตารางอื่น'));
    c.append(rel);
    if (t.indexes.length) {
      c.append(h('h2', { class: 'section-title' }, 'Index'), h('div', { class: 'chips' }, t.indexes.map((i) => h('span', { class: 'chip' }, i))));
    }
  }

  /* ---------- actions ---------- */
  function queryInEditor(t) {
    location.hash = '#/editor';
    setTimeout(() => S.pages.editor.newTab('query_' + t.name.toLowerCase() + '.sql', `SELECT TOP 100 *\nFROM ${/^\w+$/.test(t.name) ? t.name : '[' + t.name + ']'};\n`, true), 60);
  }
  function exportCsv(t) {
    const d = engine.tableData(S.ws.db, t.name);
    U.downloadText(t.name + '.csv', U.toCSV(d.columns, d.rows), 'text/csv');
  }
  async function dropTable(t) {
    if (!(await confirmBox(t.type === 'view' ? 'ลบ View' : 'ลบตาราง', `ลบ <b>${U.esc(t.name)}</b> และข้อมูลทั้งหมดในนั้น? (รันโค้ดสร้างตารางใหม่ได้ภายหลัง)`, 'ลบ', true))) return;
    try {
      S.ws.db.run(`DROP ${t.type === 'view' ? 'VIEW' : 'TABLE'} ${engine.qi(t.name)}`);
      S.ws.persistDb(); S.ws.emit('db');
      current = null; location.hash = '#/tables';
      toast('ลบแล้ว', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }
  async function resetAll() {
    if (await confirmBox('Reset ฐานข้อมูล', 'ลบตารางทั้งหมดในฐานข้อมูลของ workspace (โค้ดใน Compiler ไม่หาย)', 'Reset', true)) {
      S.ws.resetDb(); current = null; location.hash = '#/tables'; render();
    }
  }

  async function importCsv() {
    const file = await U.pickFile('.csv,text/csv');
    if (!file) return;
    const rows = U.parseCSV(file.text);
    if (rows.length < 2) return toast('ไฟล์ CSV ต้องมีหัวตารางและข้อมูลอย่างน้อย 1 แถว', 'err');
    const header = rows[0].map((x, i) => (x || '').trim() || 'col' + (i + 1));
    const data = rows.slice(1).map((r) => header.map((_, i) => (r[i] === undefined ? '' : r[i])));
    const types = header.map((_, i) => {
      const vals = data.map((r) => r[i].trim()).filter((v) => v !== '');
      if (vals.length && vals.every((v) => /^-?\d+$/.test(v) && v.length < 16)) return 'INT';
      if (vals.length && vals.every((v) => /^-?\d*\.?\d+$/.test(v))) return 'DECIMAL(18,2)';
      if (vals.length && vals.every((v) => /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(v))) return vals.some((v) => v.length > 10) ? 'DATETIME' : 'DATE';
      return 'NVARCHAR(255)';
    });
    const nameInput = h('input', { class: 'input', value: file.name.replace(/\.[^.]+$/, '').replace(/[^\w฀-๿]+/g, '_') });
    const preview = U.dataGrid(header.map((c, i) => `${c} (${types[i]})`), data.slice(0, 5));
    modal({
      title: 'นำเข้า CSV เป็นตาราง', wide: true,
      body: h('div', null, h('label', { class: 'field' }, 'ชื่อตาราง', nameInput),
        h('p', null, `${data.length.toLocaleString()} แถว · ${header.length} คอลัมน์ · ชนิดข้อมูลเดาจากค่าในไฟล์`), preview),
      actions: [{ label: 'ยกเลิก' }, { label: 'สร้างตาราง', primary: true, onClick: () => {
        const name = nameInput.value.trim();
        if (!name) { toast('ใส่ชื่อตาราง', 'err'); return false; }
        const db = S.ws.db;
        try {
          const cols = header.map((c, i) => `${engine.qi(c)} ${types[i]}${/CHAR/.test(types[i]) ? ' COLLATE NOCASE' : ''}`).join(', ');
          db.run('BEGIN');
          db.run(`CREATE TABLE ${engine.qi(name)} (${cols})`);
          const st = db.prepare(`INSERT INTO ${engine.qi(name)} VALUES (${header.map(() => '?').join(', ')})`);
          data.forEach((r) => st.run(r.map((v, i) => {
            if (v === '') return null;
            if (types[i] === 'INT') return parseInt(v, 10);
            if (types[i].startsWith('DECIMAL')) return parseFloat(v);
            return v;
          })));
          st.free();
          db.run('COMMIT');
        } catch (e) {
          try { db.run('ROLLBACK'); } catch (x) { /* ignore */ }
          toast(e.message, 'err');
          return false;
        }
        S.ws.persistDb(); S.ws.emit('db');
        toast(`สร้างตาราง ${name} (${data.length} แถว)`, 'ok');
        location.hash = '#/tables/' + encodeURIComponent(name);
        return true;
      } }],
    });
  }

  S.pages = S.pages || {};
  S.pages.tables = {
    init(el) { root = el; S.ws.on((type) => { if (type === 'db' && !root.hidden) render(); }); },
    show(route) {
      const name = route.params[0] ? decodeURIComponent(route.params[0]) : null;
      if (name !== current) { state = { q: '', page: 0, sortCol: null, sortDir: 1 }; sub = 'data'; }
      current = name;
      render();
    },
  };
})(window.SBAC);
