/* SBAC Compiler — Compiler page (OneCompiler-style IDE) */
(function (S) {
  'use strict';
  const U = S.util;
  const { h, icon, toast, modal, confirmBox, promptBox, popupMenu } = U;
  const ws = S.ws, store = S.store, engine = S.engine, D = S.dialects;

  let root, cm, els = {}, docs = new Map(), side = null, outTab = 'io', lastOut = null, errMark = null;
  let topCenter, topRight;

  /* ---------------- build ---------------- */
  function build() {
    const st = store.settings();
    els.ide = h('div', { class: 'ide' });
    if (st.outW) els.ide.style.setProperty('--out-w', st.outW + 'px');

    // left rail
    const railBtn = (id, ic, title) => h('button', { class: 'icon-btn', title, 'aria-label': title, dataset: { panel: id }, onclick: () => toggleSide(id) }, icon(ic));
    els.rail = h('div', { class: 'rail' },
      railBtn('files', 'files', 'ไฟล์และโปรเจกต์'),
      railBtn('search', 'search', 'ค้นหา / แทนที่'),
      railBtn('db', 'db', 'ฐานข้อมูล (ตารางและคอลัมน์)'),
      railBtn('snippets', 'code', 'โค้ดสำเร็จรูป'),
      h('div', { class: 'spacer' }),
      railBtn('history', 'history', 'ประวัติการรัน'),
      railBtn('settings', 'settings', 'ตั้งค่า'));
    els.side = h('div', { class: 'side' });

    // editor column
    els.tabs = h('div', { class: 'tabs', role: 'tablist' });
    els.host = h('div', { class: 'editor-host' });
    const editorCol = h('div', { class: 'editor-col' }, els.tabs, els.host);

    // splitter
    els.splitter = h('div', { class: 'splitter', title: 'ลากเพื่อปรับขนาด' });
    initSplitter();

    // output column
    els.outBody = h('div', { class: 'out-body' });
    els.outTabIO = h('button', { class: 'out-tab active', onclick: () => setOutTab('io') }, icon('terminal'), 'I/O');
    els.outTabDB = h('button', { class: 'out-tab', onclick: () => setOutTab('db') }, icon('table'), 'ตาราง');
    els.modePill = h('button', { class: 'mode-pill', title: 'สลับโหมดการรัน', onclick: toggleRunMode });
    const out = h('div', { class: 'out' },
      h('div', { class: 'out-tabs' }, els.outTabIO, els.outTabDB,
        h('div', { class: 'out-tools' },
          els.modePill,
          h('button', { class: 'icon-btn', title: 'ล้างผลลัพธ์', onclick: () => { lastOut = null; renderOut(); } }, icon('trash')))),
      els.outBody);

    els.ide.append(els.rail, els.side, editorCol, els.splitter, out);

    // status bar
    els.stState = h('span', { class: 'st ok' }, icon('checkCircle'), 'Ready');
    els.stPos = h('span', { class: 'st hide-sm' }, 'Ln 1, Col 1');
    els.stDialect = h('span', { class: 'st hide-sm' });
    els.stDb = h('span', { class: 'st hide-sm' });
    els.stTheme = h('button', { onclick: () => S.app.toggleTheme() });
    root.append(els.ide, h('div', { class: 'statusbar' },
      els.stState, els.stPos, els.stDialect, els.stDb, h('span', { class: 'grow' }),
      els.stTheme, h('a', { href: '#/tutorial', class: 'st' }, icon('book'), 'บทเรียน')));

    // editor
    cm = U.codeEditor(els.host, { onRun: () => run() });
    cm.addKeyMap({
      'Ctrl-S': () => saveProject(), 'Cmd-S': () => saveProject(),
      'Shift-Ctrl-Enter': () => run('all'),
      'Ctrl-F': () => toggleSide('search', true), 'Cmd-F': () => toggleSide('search', true),
    });
    cm.on('cursorActivity', () => {
      const c = cm.getCursor();
      els.stPos.textContent = `Ln ${c.line + 1}, Col ${c.ch + 1}`;
    });
    cm.on('change', () => clearErrMark());

    buildTop();
    rebuildDocs();
    refreshMeta();
    renderOut();
    ws.on(onWs);
  }

  function buildTop() {
    els.runFile = h('span', { class: 'run-file' });
    els.runBtn = h('button', { class: 'btn btn-run', title: 'รันไฟล์ที่เปิดอยู่ (Ctrl + Enter)', onclick: () => run() },
      h('span', null, 'Run'), icon('play'), els.runFile);
    els.dialect = h('select', { class: 'select-brand', 'aria-label': 'เลือกฐานข้อมูล', onchange: (e) => changeDialect(e.target.value) },
      D.list.map((d) => h('option', { value: d.id }, d.label)));
    topCenter = [
      h('a', { class: 'btn btn-green', href: '#/templates', title: 'เลือกแม่แบบ' }, icon('template'), h('span', { class: 'lbl-hide-sm' }, 'แม่แบบ')),
      h('div', { class: 'select-wrap' }, els.dialect),
      els.runBtn,
      h('button', { class: 'icon-btn', title: 'เมนูเพิ่มเติม', onclick: (e) => moreMenu(e.currentTarget) }, icon('more')),
    ];
    topRight = [
      h('button', { class: 'btn', onclick: () => saveProject(), title: 'บันทึก (Ctrl + S)' }, icon('save'), h('span', { class: 'btn-label' }, 'Save')),
      h('button', { class: 'icon-btn', onclick: share, title: 'แชร์ลิงก์' }, icon('share')),
    ];
  }

  /* ---------------- docs & tabs ---------------- */
  function modeFor() { return D.get(ws.data.dialect).cmMode; }
  function rebuildDocs() {
    docs = new Map();
    ws.files().forEach((f) => {
      const doc = CodeMirror.Doc(f.content, modeFor());
      doc.on('change', () => ws.setContent(f.id, doc.getValue()));
      docs.set(f.id, doc);
    });
    swapToActive();
    renderTabs();
  }
  function swapToActive() {
    const f = ws.activeFile();
    let doc = docs.get(f.id);
    if (!doc) { rebuildDocs(); return; }
    if (cm.getDoc() !== doc) cm.swapDoc(doc);
    cm.setOption('mode', modeFor());
    updateRunLabel();
  }
  function renderTabs() {
    els.tabs.innerHTML = '';
    const active = ws.activeFile();
    ws.files().forEach((f) => {
      const tab = h('div', {
        class: 'tab' + (f.id === active.id ? ' active' : ''), role: 'tab', 'aria-selected': String(f.id === active.id),
        title: f.name + ' — ดับเบิลคลิกเพื่อเปลี่ยนชื่อ',
        onclick: () => switchTo(f.id),
        ondblclick: () => renameInline(tab, f),
        onauxclick: (e) => { if (e.button === 1) closeFile(f); },
      }, icon('db', 'db-ico'), h('span', { class: 'tab-name' }, f.name),
      h('button', { class: 'close', title: 'ปิดไฟล์', 'aria-label': 'ปิด ' + f.name, onclick: (e) => { e.stopPropagation(); closeFile(f); } }, '×'));
      els.tabs.appendChild(tab);
    });
    els.tabs.appendChild(h('button', { class: 'tab-add', title: 'เพิ่มไฟล์ใหม่', 'aria-label': 'เพิ่มไฟล์ใหม่', onclick: () => newFile() }, '+'));
    updateRunLabel();
    if (side === 'files') renderSide();
  }
  function updateRunLabel() {
    const f = ws.activeFile();
    els.runFile.textContent = f.name;
    els.runBtn.title = `รัน ${f.name} (Ctrl + Enter)`;
  }
  function switchTo(id) {
    if (id === ws.data.activeFileId) return;
    ws.setActive(id);
    swapToActive();
    renderTabs();
    cm.focus();
  }
  function renameInline(tab, f) {
    const nameEl = tab.querySelector('.tab-name');
    const input = h('input', { value: f.name });
    nameEl.replaceWith(input);
    input.focus(); input.setSelectionRange(0, f.name.replace(/\.sql$/i, '').length);
    let done = false;
    const commit = (ok) => {
      if (done) return; done = true;
      if (ok && input.value.trim() && input.value.trim() !== f.name) ws.renameFile(f.id, input.value);
      else renderTabs();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(true); if (e.key === 'Escape') commit(false); });
    input.addEventListener('blur', () => commit(true));
    input.addEventListener('click', (e) => e.stopPropagation());
  }
  async function closeFile(f) {
    if (ws.files().length <= 1) return toast('ต้องมีอย่างน้อย 1 ไฟล์', 'err');
    if (f.content.trim() && !(await confirmBox('ปิดไฟล์', `ปิดและลบไฟล์ <b>${U.esc(f.name)}</b> ออกจาก workspace?`, 'ปิดไฟล์', true))) return;
    ws.removeFile(f.id);
  }
  function newFile(name, content) {
    ws.addFile(name || 'query.sql', content || '');
    cm.focus();
  }

  /* ---------------- run ---------------- */
  function run(mode) {
    const f = ws.activeFile();
    let opts = {};
    if (mode !== 'all' && mode !== 'file' && cm.somethingSelected()) {
      const from = cm.getCursor('from');
      opts = { code: cm.getSelection(), lineOffset: from.line, label: f.name + ' (เฉพาะส่วนที่เลือก)' };
    }
    if (mode === 'selection' && !opts.code) return toast('ยังไม่ได้เลือกโค้ด', 'err');
    setState('run');
    els.runBtn.disabled = true;
    setTimeout(() => {
      try {
        lastOut = mode === 'all' ? ws.runAll() : ws.runFile(f, opts);
      } catch (e) {
        lastOut = { label: f.name, ok: false, ms: 0, sections: [{ result: { ok: false, items: [{ kind: 'error', message: String(e.message || e) }], ms: 0, statements: 0 } }] };
      }
      els.runBtn.disabled = false;
      setState(lastOut.ok ? 'ok' : 'err');
      setOutTab('io');
      markError(lastOut);
    }, 15);
  }
  function markError(out) {
    clearErrMark();
    if (!out || out.ok) return;
    const sec = out.sections.find((s) => !s.result.ok);
    const err = sec && sec.result.items.find((i) => i.kind === 'error');
    if (!err || !err.line) return;
    const target = sec.fileId ? ws.file(sec.fileId) : (sec.title ? ws.initFile() : ws.activeFile());
    if (!target || target.id !== ws.activeFile().id) return;
    const ln = err.line - 1;
    if (ln >= 0 && ln < cm.lineCount()) errMark = cm.addLineClass(ln, 'background', 'cm-error-line');
  }
  function clearErrMark() {
    if (errMark) { try { cm.removeLineClass(errMark, 'background', 'cm-error-line'); } catch (e) { /* ignore */ } errMark = null; }
  }
  function setState(s) {
    els.stState.className = 'st ' + (s === 'ok' ? 'ok' : s === 'err' ? 'err' : '');
    els.stState.innerHTML = '';
    if (s === 'run') els.stState.append(h('span', { class: 'spinner', style: { width: '12px', height: '12px', borderWidth: '2px' } }), 'Running…');
    else if (s === 'err') els.stState.append(icon('xCircle'), 'Error');
    else els.stState.append(icon('checkCircle'), s === 'ok' ? 'Done' : 'Ready');
  }

  /* ---------------- output ---------------- */
  function setOutTab(t) {
    outTab = t;
    els.outTabIO.classList.toggle('active', t === 'io');
    els.outTabDB.classList.toggle('active', t === 'db');
    renderOut();
  }
  function renderOut() {
    const body = els.outBody;
    body.innerHTML = '';
    if (outTab === 'db') return renderDbOverview(body);
    if (!lastOut) {
      body.append(h('div', { class: 'out-label' }, 'Output:'),
        h('div', { class: 'out-placeholder' }, 'Click on RUN button to see the output'),
        h('p', { class: 'muted small', style: { marginTop: '18px', lineHeight: '1.7' } },
          'ปุ่ม Run จะรันเฉพาะแท็บที่เปิดอยู่ (', h('b', null, ws.activeFile().name), ') · ',
          h('kbd', null, 'Ctrl'), ' + ', h('kbd', null, 'Enter'), ' เพื่อรัน · เลือกข้อความแล้วรันเฉพาะส่วนนั้นได้'));
      return;
    }
    const meta = `${lastOut.label} · ${lastOut.sections.reduce((a, s) => a + s.result.statements, 0)} คำสั่ง · ${Math.max(1, Math.round(lastOut.ms))} ms`;
    body.append(h('div', { class: 'out-label' }, 'Output:', h('span', { class: 'run-meta' }, meta)));
    lastOut.sections.forEach((sec) => {
      const content = U.renderItems(sec.result.items);
      if (sec.title) {
        const det = h('details', { class: 'out-section', open: !sec.collapsed || !sec.result.ok },
          h('summary', { class: 'out-label', style: { cursor: 'pointer' } },
            h('span', { class: 'dot ' + (sec.result.ok ? 'ok' : 'err') }), sec.title), content);
        body.append(det);
      } else body.append(content);
    });
  }
  function renderDbOverview(body) {
    let sch = [];
    try { sch = engine.schema(ws.db); } catch (e) { /* ignore */ }
    if (!sch.length) {
      body.append(h('div', { class: 'side-empty' }, 'ยังไม่มีตารางในฐานข้อมูล — รันไฟล์ที่มี CREATE TABLE (เช่น init.sql) หรือเลือก ',
        h('a', { href: '#/templates' }, 'แม่แบบ')));
      return;
    }
    sch.forEach((t) => {
      let data = { columns: [], rows: [] };
      try { data = engine.tableData(ws.db, t.name, { limit: 5 }); } catch (e) { /* ignore */ }
      body.append(h('div', { class: 'tbl-card' },
        h('h3', null, h('a', { href: '#/tables/' + encodeURIComponent(t.name) }, t.name),
          h('span', { class: 'meta' }, `${t.type === 'view' ? 'VIEW · ' : ''}${t.rowCount ?? '?'} แถว${t.rowCount > 5 ? ' · แสดง 5 แถวแรก' : ''}`)),
        U.dataGrid(data.columns, data.rows)));
    });
  }

  /* ---------------- side panels ---------------- */
  function toggleSide(id, forceOpen) {
    side = side === id && !forceOpen ? null : id;
    els.ide.style.setProperty('--side-w', side ? '264px' : '0px');
    U.$$('.rail .icon-btn', root).forEach((b) => b.classList.toggle('active', b.dataset.panel === side));
    renderSide();
    setTimeout(() => cm.refresh(), 0);
  }
  function renderSide() {
    const el = els.side;
    el.innerHTML = '';
    if (!side) return;
    const titles = { files: 'Explorer', search: 'ค้นหา', db: 'ฐานข้อมูล', snippets: 'โค้ดสำเร็จรูป', history: 'ประวัติการรัน', settings: 'ตั้งค่า' };
    const head = h('div', { class: 'side-head' }, titles[side]);
    const body = h('div', { class: 'side-body' });
    el.append(head, body);
    ({ files: sideFiles, search: sideSearch, db: sideDb, snippets: sideSnippets, history: sideHistory, settings: sideSettings })[side](body, head);
  }

  function sideFiles(body, head) {
    head.append(h('button', { class: 'icon-btn', title: 'ไฟล์ใหม่', onclick: () => newFile() }, icon('plus')));
    body.append(h('div', { class: 'side-section' }, ws.data.name || 'Workspace'));
    ws.files().forEach((f) => body.append(h('button', {
      class: 'side-item' + (f.id === ws.activeFile().id ? ' active' : ''), onclick: () => switchTo(f.id),
    }, icon('db', 'db-ico'), h('span', { class: 'grow' }, f.name), S.isInitFile(f) ? h('span', { class: 'meta' }, 'init') : null)));
    body.append(h('div', { style: { display: 'flex', gap: '6px', margin: '8px 4px' } },
      h('button', { class: 'btn btn-xs', onclick: uploadFile }, icon('upload'), 'อัปโหลด .sql'),
      h('button', { class: 'btn btn-xs', onclick: () => saveProject(true) }, icon('save'), 'บันทึกเป็น…')));
    body.append(h('div', { class: 'side-section' }, 'โปรเจกต์ที่บันทึกไว้'));
    const projects = store.projects();
    if (!projects.length) body.append(h('div', { class: 'side-empty' }, 'ยังไม่มี — กด Save (Ctrl + S) เพื่อบันทึกงานนี้เป็นโปรเจกต์'));
    projects.forEach((p) => body.append(h('div', { class: 'side-item' + (p.id === ws.data.projectId ? ' active' : ''), role: 'button', tabindex: '0', onclick: () => openProject(p) },
      icon('files'), h('span', { class: 'grow', title: p.name }, p.name),
      h('span', { class: 'meta' }, new Date(p.savedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })),
      h('button', { class: 'x', title: 'ลบโปรเจกต์', onclick: async (e) => {
        e.stopPropagation();
        if (await confirmBox('ลบโปรเจกต์', `ลบโปรเจกต์ <b>${U.esc(p.name)}</b>? (ลบแล้วกู้คืนไม่ได้)`, 'ลบ', true)) {
          store.deleteProject(p.id);
          if (ws.data.projectId === p.id) { ws.data.projectId = null; ws.save(); }
          renderSide();
        }
      } }, '×'))));
  }

  function sideSearch(body) {
    const q = h('input', { class: 'input', placeholder: 'ค้นหา…', style: { height: '34px' } });
    const r = h('input', { class: 'input', placeholder: 'แทนที่ด้วย…', style: { height: '34px' } });
    const info = h('div', { class: 'muted small', style: { margin: '6px 2px' } });
    let marks = [];
    const clear = () => { marks.forEach((m) => m.clear()); marks = []; };
    const highlight = () => {
      clear();
      const term = q.value;
      if (!term) { info.textContent = ''; return; }
      const c = cm.getSearchCursor(term, CodeMirror.Pos(0, 0), { caseFold: true });
      let n = 0;
      while (c.findNext() && n < 2000) { marks.push(cm.markText(c.from(), c.to(), { className: 'cm-search-hit' })); n++; }
      info.textContent = n ? `พบ ${n} ตำแหน่ง` : 'ไม่พบ';
    };
    const find = (rev) => {
      if (!q.value) return;
      let c = cm.getSearchCursor(q.value, rev ? cm.getCursor('from') : cm.getCursor('to'), { caseFold: true });
      if (!(rev ? c.findPrevious() : c.findNext())) {
        c = cm.getSearchCursor(q.value, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(0, 0), { caseFold: true });
        if (!(rev ? c.findPrevious() : c.findNext())) return;
      }
      cm.setSelection(c.from(), c.to());
      cm.scrollIntoView({ from: c.from(), to: c.to() }, 80);
    };
    q.addEventListener('input', highlight);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') find(e.shiftKey); });
    body.append(h('div', { style: { display: 'grid', gap: '8px', padding: '4px' } }, q, r,
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
        h('button', { class: 'btn btn-xs', onclick: () => find(false) }, 'ถัดไป'),
        h('button', { class: 'btn btn-xs', onclick: () => find(true) }, 'ก่อนหน้า'),
        h('button', { class: 'btn btn-xs', onclick: () => {
          if (!q.value) return;
          const c = cm.getSearchCursor(q.value, CodeMirror.Pos(0, 0), { caseFold: true });
          let n = 0;
          cm.operation(() => { while (c.findNext()) { c.replace(r.value); n++; } });
          highlight(); toast(`แทนที่ ${n} ตำแหน่ง`, 'ok');
        } }, 'แทนที่ทั้งหมด')), info));
    setTimeout(() => q.focus(), 30);
  }

  function sideDb(body, head) {
    head.append(h('button', { class: 'icon-btn', title: 'รีเฟรช', onclick: renderSide }, icon('refresh')));
    let sch = [];
    try { sch = engine.schema(ws.db); } catch (e) { /* ignore */ }
    if (!sch.length) {
      body.append(h('div', { class: 'side-empty' }, 'ยังไม่มีตาราง — รัน init.sql หรือเลือกแม่แบบ'));
    }
    sch.forEach((t) => {
      const cols = h('div', { class: 'tree-cols' }, t.columns.map((c) => h('div', { title: 'คลิกเพื่อแทรกชื่อคอลัมน์', onclick: () => insert(c.name) },
        h('span', null, (c.pk ? '🔑 ' : '') + c.name), h('span', { class: 't' }, c.type.toLowerCase()))));
      body.append(h('button', { class: 'side-item', title: 'คลิกเพื่อแทรกชื่อตาราง', onclick: () => insert(t.name) },
        icon(t.type === 'view' ? 'eye' : 'table'), h('span', { class: 'grow' }, t.name), h('span', { class: 'meta' }, t.rowCount ?? '')), cols);
    });
    body.append(h('div', { style: { display: 'flex', gap: '6px', margin: '12px 4px', flexWrap: 'wrap' } },
      h('a', { class: 'btn btn-xs', href: '#/tables' }, icon('table'), 'เปิดหน้าตาราง'),
      h('button', { class: 'btn btn-xs btn-danger', onclick: resetDbAsk }, icon('reset'), 'Reset DB')));
  }
  function insert(text) { cm.replaceSelection(text); cm.focus(); }

  function sideSnippets(body) {
    S.snippets.forEach((sn) => body.append(h('button', { class: 'side-item', title: sn.code, onclick: () => insert(sn.code) }, icon('code'), h('span', { class: 'grow' }, sn.title))));
    body.append(h('a', { class: 'btn btn-xs', href: '#/templates', style: { margin: '10px 4px' } }, 'ดูแม่แบบโปรเจกต์ทั้งหมด'));
  }

  function sideHistory(body, head) {
    head.append(h('button', { class: 'icon-btn', title: 'ล้างประวัติ', onclick: () => { store.clearHistory(); renderSide(); } }, icon('trash')));
    const list = store.history();
    if (!list.length) body.append(h('div', { class: 'side-empty' }, 'ยังไม่มีประวัติการรัน'));
    list.forEach((it) => body.append(h('button', { class: 'hist-item', title: 'คลิกเพื่อเปิดโค้ดนี้ในแท็บใหม่', onclick: () => newFile('history.sql', it.code) },
      h('div', { class: 'top' }, h('span', null, h('span', { class: 'dot ' + (it.ok ? 'ok' : 'err') }), ' ', it.file),
        h('span', null, new Date(it.t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))),
      h('pre', null, it.code.trim().slice(0, 160)))));
  }

  function sideSettings(body) {
    const st = store.settings();
    const row = (label, control) => h('label', { class: 'field', style: { margin: '10px 4px' } }, label, control);
    const fontSel = h('select', { class: 'select', onchange: (e) => { store.setSettings({ fontSize: +e.target.value }); els.host.style.fontSize = e.target.value + 'px'; cm.refresh(); } },
      [13, 14, 15, 16, 18, 20].map((n) => h('option', { value: n, selected: st.fontSize === n }, n + ' px')));
    const chk = (key, label, apply) => {
      const c = h('input', { type: 'checkbox', checked: !!st[key], onchange: (e) => { store.setSettings({ [key]: e.target.checked }); apply && apply(e.target.checked); } });
      return h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', margin: '10px 6px', fontSize: '14px' } }, c, label);
    };
    const modeSel = h('select', { class: 'select', onchange: (e) => { store.setSettings({ runMode: e.target.value }); refreshMeta(); } },
      h('option', { value: 'persist', selected: st.runMode !== 'fresh' }, 'ต่อเนื่อง — ฐานข้อมูลคงอยู่ระหว่างการรัน'),
      h('option', { value: 'fresh', selected: st.runMode === 'fresh' }, 'เริ่มใหม่ — ล้าง DB + รัน init.sql ก่อนทุกครั้ง'));
    body.append(
      row('โหมดการรัน', modeSel),
      h('p', { class: 'muted small', style: { margin: '0 6px 8px', lineHeight: '1.6' } }, 'ทั้งสองโหมด ปุ่ม Run จะรันเฉพาะแท็บที่เปิดอยู่เสมอ'),
      row('ขนาดตัวอักษร', fontSel),
      chk('wrap', 'ตัดบรรทัดอัตโนมัติ (word wrap)', (v) => cm.setOption('lineWrapping', v)),
      chk('autocomplete', 'แนะนำคำอัตโนมัติขณะพิมพ์', () => toast('มีผลเมื่อรีโหลดหน้า')),
      h('div', { style: { margin: '18px 4px', display: 'grid', gap: '8px' } },
        h('button', { class: 'btn btn-sm', onclick: shortcuts }, 'คีย์ลัดทั้งหมด'),
        h('button', { class: 'btn btn-sm btn-danger', onclick: resetDbAsk }, icon('reset'), 'Reset ฐานข้อมูล')));
  }

  /* ---------------- actions ---------------- */
  function moreMenu(anchor) {
    popupMenu(anchor, [
      { label: 'รันเฉพาะส่วนที่เลือก', icon: 'play', key: 'Ctrl+Enter', onClick: () => run('selection') },
      { label: 'รันทั้งไฟล์ (ไม่สนส่วนที่เลือก)', icon: 'play', onClick: () => run('file') },
      { label: 'รันทุกแท็บตามลำดับ (init.sql ก่อน)', icon: 'files', key: 'Ctrl+Shift+Enter', onClick: () => run('all') },
      { label: 'Reset ฐานข้อมูล', icon: 'reset', danger: true, onClick: resetDbAsk },
      '-',
      { label: 'ไฟล์ใหม่', icon: 'plus', onClick: () => newFile() },
      { label: 'อัปโหลดไฟล์ .sql', icon: 'upload', onClick: uploadFile },
      { label: 'ดาวน์โหลดไฟล์นี้', icon: 'download', onClick: () => { const f = ws.activeFile(); U.downloadText(f.name, f.content, 'application/sql'); } },
      { label: 'ดาวน์โหลดทุกไฟล์รวมกัน', icon: 'download', onClick: () => U.downloadText((ws.data.name || 'project') + '.sql', ws.files().map((f) => `-- ===== ${f.name} =====\n${f.content}`).join('\n\n'), 'application/sql') },
      '-',
      { label: 'บันทึกเป็นโปรเจกต์ใหม่…', icon: 'save', onClick: () => saveProject(true) },
      { label: 'คีย์ลัด', icon: 'key', onClick: shortcuts },
    ]);
  }
  async function resetDbAsk() {
    if (await confirmBox('Reset ฐานข้อมูล', 'ลบตารางและข้อมูลทั้งหมดในฐานข้อมูลของ workspace นี้ (โค้ดในแท็บไม่หาย)<br>รันไฟล์ init.sql ใหม่ได้ภายหลัง', 'Reset', true)) {
      ws.resetDb();
      lastOut = null; renderOut(); setState('ready');
    }
  }
  function toggleRunMode() {
    const st = store.settings();
    store.setSettings({ runMode: st.runMode === 'fresh' ? 'persist' : 'fresh' });
    refreshMeta();
    toast(store.settings().runMode === 'fresh' ? 'โหมดเริ่มใหม่: ล้าง DB และรัน init.sql ก่อนทุกครั้ง' : 'โหมดต่อเนื่อง: ฐานข้อมูลคงอยู่ระหว่างการรัน');
    if (side === 'settings') renderSide();
  }
  function changeDialect(d) {
    ws.setDialect(d);
    toast(`เปลี่ยนเป็น ${D.get(d).label} — ฐานข้อมูลเดิมยังอยู่`);
  }
  async function uploadFile() {
    const f = await U.pickFile('.sql,.txt');
    if (f) newFile(f.name, f.text);
  }
  async function saveProject(asNew) {
    let name = ws.data.name;
    if (asNew === true || !ws.data.projectId) {
      name = await promptBox('บันทึกโปรเจกต์', 'ชื่อโปรเจกต์', ws.data.name || 'โปรเจกต์ของฉัน');
      if (!name) return;
      if (asNew === true) ws.data.projectId = null;
    }
    ws.saveProject(name);
    toast('บันทึกแล้ว: ' + name, 'ok');
    if (side === 'files') renderSide();
  }
  async function openProject(p) {
    if (p.id === ws.data.projectId) return;
    if (!(await confirmBox('เปิดโปรเจกต์', `เปิด <b>${U.esc(p.name)}</b>? ไฟล์ในแท็บตอนนี้จะถูกแทนที่ ${ws.data.projectId ? '' : '<br><b>งานปัจจุบันยังไม่ได้บันทึก</b>'}`, 'เปิด'))) return;
    ws.openProject(p);
    lastOut = null; renderOut();
  }
  async function share() {
    const data = ws.snapshot();
    const packed = await U.packShare(data);
    const url = location.href.split('#')[0] + '#/editor?s=' + packed;
    const input = h('input', { class: 'input', value: url, readonly: true });
    modal({
      title: 'แชร์โค้ด',
      body: h('div', null, h('p', { style: { marginTop: 0 } }, 'ลิงก์นี้ฝังโค้ดทุกแท็บไว้ในตัว (ไม่ได้อัปโหลดไปที่ไหน) คนที่เปิดลิงก์จะได้โค้ดชุดเดียวกัน'), input,
        h('p', { class: 'muted small' }, `ความยาวลิงก์ ${url.length.toLocaleString()} ตัวอักษร`)),
      actions: [{ label: 'ปิด' }, { label: 'คัดลอกลิงก์', primary: true, onClick: () => U.copyText(url).then(() => toast('คัดลอกลิงก์แล้ว', 'ok')) }],
    });
  }
  async function openShared(packed) {
    let data;
    try { data = await U.unpackShare(packed); } catch (e) { toast('ลิงก์แชร์ไม่ถูกต้อง', 'err'); return; }
    history.replaceState(null, '', '#/editor');
    if (!data || !Array.isArray(data.files)) return;
    const ok = await confirmBox('เปิดโค้ดที่แชร์มา', `เปิด <b>${U.esc(data.name || 'โค้ดที่แชร์')}</b> (${data.files.length} ไฟล์)?<br>งานปัจจุบันจะถูกบันทึกเก็บไว้ในโปรเจกต์อัตโนมัติ`, 'เปิด');
    if (!ok) return;
    if (!ws.data.projectId) ws.saveProject((ws.data.name || 'งานเดิม') + ' (สำรอง)');
    else ws.saveProject(ws.data.name);
    ws.openProject({ id: null, name: data.name || 'โค้ดที่แชร์', dialect: data.dialect, files: data.files });
    lastOut = null; renderOut();
    toast('เปิดโค้ดที่แชร์แล้ว', 'ok');
  }
  function shortcuts() {
    const rows = [['Ctrl + Enter / F5', 'รันแท็บที่เปิดอยู่ (หรือเฉพาะส่วนที่เลือก)'], ['Ctrl + Shift + Enter', 'รันทุกแท็บตามลำดับ'], ['Ctrl + S', 'บันทึกโปรเจกต์'],
      ['Ctrl + F', 'ค้นหา / แทนที่'], ['Ctrl + /', 'คอมเมนต์ / ยกเลิกคอมเมนต์'], ['Ctrl + Space', 'แนะนำคำ (ชื่อตาราง/คอลัมน์)'], ['ดับเบิลคลิกแท็บ', 'เปลี่ยนชื่อไฟล์'], ['คลิกกลางที่แท็บ', 'ปิดไฟล์']];
    modal({ title: 'คีย์ลัด', body: h('table', { class: 'grid', style: { width: '100%' } }, h('tbody', null, rows.map((r) => h('tr', null, h('td', null, h('kbd', null, r[0])), h('td', { style: { fontFamily: 'var(--font)' } }, r[1]))))) });
  }

  /* ---------------- splitter ---------------- */
  function initSplitter() {
    let startX, startW;
    const onMove = (e) => {
      const w = Math.max(260, Math.min(window.innerWidth - 420, startW - (e.clientX - startX)));
      els.ide.style.setProperty('--out-w', w + 'px');
    };
    const onUp = () => {
      els.splitter.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      const w = parseInt(getComputedStyle(els.ide).getPropertyValue('--out-w'), 10);
      if (w) store.setSettings({ outW: w });
      cm.refresh();
    };
    els.splitter.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      startW = els.splitter.nextSibling.getBoundingClientRect().width;
      els.splitter.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    });
  }

  /* ---------------- sync with workspace ---------------- */
  function refreshMeta() {
    els.dialect.value = ws.data.dialect;
    els.stDialect.textContent = D.get(ws.data.dialect).label;
    let n = 0;
    try { n = engine.schema(ws.db).length; } catch (e) { /* ignore */ }
    els.stDb.textContent = `DB: ${n} ตาราง`;
    const fresh = store.settings().runMode === 'fresh';
    els.modePill.textContent = fresh ? '↻ เริ่มใหม่ทุกครั้ง' : '● DB ต่อเนื่อง';
    els.modePill.title = fresh ? 'ล้างฐานข้อมูลและรัน init.sql ก่อนทุกครั้ง (คลิกเพื่อสลับ)' : 'ฐานข้อมูลคงอยู่ระหว่างการรัน (คลิกเพื่อสลับ)';
    els.stTheme.textContent = S.app ? (S.app.isDark() ? 'Dark' : 'Light') + ' ⇄' : '';
    cm.setOption('hintOptions', { tables: engine.hintTables(ws.db), completeSingle: false });
  }
  function onWs(type) {
    if (type === 'files') { rebuildDocs(); }
    else if (type === 'active') { swapToActive(); renderTabs(); }
    else if (type === 'dialect') { cm.setOption('mode', modeFor()); docs.forEach((d) => d.cm || null); refreshMeta(); }
    else if (type === 'db') { refreshMeta(); if (outTab === 'db') renderOut(); if (side === 'db') renderSide(); }
    else if (type === 'history' && side === 'history') renderSide();
    else if (type === 'projects' && side === 'files') renderSide();
  }

  S.pages = S.pages || {};
  S.pages.editor = {
    init(el) { root = el; build(); },
    show(route) {
      setTimeout(() => { cm.refresh(); }, 0);
      refreshMeta();
      const s = route.query.get('s');
      if (s) openShared(s);
      else if (route.query.get('run') === '1') { history.replaceState(null, '', '#/editor'); run('file'); }
    },
    top() { return { center: topCenter, right: topRight }; },
    onTheme() { refreshMeta(); },
    insertSnippet(code) { cm.replaceSelection(code); },
    newTab(name, content, runNow) {
      newFile(name, content);
      if (runNow) setTimeout(() => run('file'), 30);
    },
    resetOutput() { lastOut = null; renderOut(); },
    get cm() { return cm; },
  };
})(window.SBAC);
