/* SBAC Compiler — Exercises page */
(function (S) {
  'use strict';
  const U = S.util;
  const { h, icon, toast, confirmBox } = U;
  const engine = S.engine, store = S.store;
  const LEVELS = { easy: 'ง่าย', medium: 'ปานกลาง', hard: 'ยาก' };
  let root, filter = { level: 'all', topic: 'all', q: '' }, cm = null;

  /* ---------------- list ---------------- */
  function renderList() {
    cm = null;
    root.innerHTML = '';
    root.classList.add('page-scroll');
    const prog = store.progress().exercises;
    const solved = (e) => prog[e.id] && prog[e.id].solved;
    const all = S.exercises;
    const c = h('div', { class: 'container' });
    c.append(h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'แบบฝึกหัด'), h('p', null, 'เขียน SQL ให้ได้ผลลัพธ์ตามโจทย์ ระบบตรวจโดยเทียบผลลัพธ์กับเฉลยบนฐานข้อมูลใหม่ทุกครั้ง')),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, `${all.filter(solved).length}/${all.length}`), h('span', null, 'ทำผ่านแล้ว')),
        ...Object.keys(LEVELS).map((lv) => { const xs = all.filter((e) => e.level === lv); return h('div', { class: 'stat' }, h('b', null, `${xs.filter(solved).length}/${xs.length}`), h('span', null, LEVELS[lv])); }))));

    const search = h('input', { class: 'input', placeholder: 'ค้นหาโจทย์…', value: filter.q });
    search.addEventListener('input', U.debounce(() => { filter.q = search.value; drawRows(); }, 200));
    const topicSel = h('select', { class: 'select', style: { width: 'auto', height: '34px' }, onchange: (e) => { filter.topic = e.target.value; drawRows(); } },
      h('option', { value: 'all' }, 'ทุกหัวข้อ'), S.exerciseTopics.map((t) => h('option', { value: t, selected: filter.topic === t }, t)));
    const levelBtns = h('div', { class: 'chips' });
    const drawLevels = () => {
      levelBtns.innerHTML = '';
      [['all', 'ทั้งหมด'], ...Object.entries(LEVELS)].forEach(([k, v]) => levelBtns.append(h('button', { class: 'chip' + (filter.level === k ? ' active' : ''), onclick: () => { filter.level = k; drawLevels(); drawRows(); } }, v)));
    };
    drawLevels();
    c.append(h('div', { class: 'filters' }, levelBtns, topicSel, search));

    const list = h('div', { class: 'ex-list' });
    c.append(list);
    function drawRows() {
      list.innerHTML = '';
      const q = filter.q.trim().toLowerCase();
      const rows = all.filter((e) => (filter.level === 'all' || e.level === filter.level) && (filter.topic === 'all' || e.topic === filter.topic) &&
        (!q || (e.title + ' ' + e.prompt.replace(/<[^>]+>/g, '')).toLowerCase().includes(q)));
      if (!rows.length) list.append(h('div', { class: 'empty' }, 'ไม่พบโจทย์ที่ตรงกับตัวกรอง'));
      rows.forEach((e) => {
        const n = all.indexOf(e) + 1;
        list.append(h('a', { class: 'ex-row', href: '#/exercises/' + e.id },
          h('div', { class: 'ex-num' + (solved(e) ? ' done' : '') }, solved(e) ? icon('check') : String(n)),
          h('div', { style: { minWidth: 0 } }, h('div', { class: 't' }, e.title), h('div', { class: 'd' }, e.prompt.replace(/<[^>]+>/g, ''))),
          h('span', { class: 'badge topic', style: { background: 'var(--bg-3)', color: 'var(--text-2)' } }, e.topic),
          h('span', { class: 'badge ' + e.level }, LEVELS[e.level])));
      });
    }
    drawRows();
    root.append(c);
  }

  /* ---------------- detail ---------------- */
  function renderDetail(ex) {
    root.innerHTML = '';
    root.classList.remove('page-scroll');
    const idx = S.exercises.indexOf(ex);
    const next = S.exercises[idx + 1];
    const st = store.exerciseState(ex.id);
    const ds = S.datasets[ex.dataset];

    // left: problem
    const hintBox = h('div', { class: 'hint-box', hidden: true }, '💡 ', ex.hint);
    const expectedBox = h('details', { class: 'dataset-box' }, h('summary', null, 'ผลลัพธ์ที่ควรได้'));
    expectedBox.addEventListener('toggle', () => {
      if (!expectedBox.open || expectedBox.children.length > 1) return;
      const exp = expected(ex);
      expectedBox.append(exp ? h('div', null, h('p', { class: 'muted small' }, `${exp.rows.length} แถว · ${ex.ordered ? 'ต้องเรียงลำดับตามนี้' : 'ลำดับแถวไม่สำคัญ'} · ชื่อคอลัมน์ตั้งเองได้`), U.dataGrid(exp.columns, exp.rows)) : h('p', null, '-'));
    });
    const dsBox = h('details', { class: 'dataset-box', open: true }, h('summary', null, `ตารางที่ใช้ — ${ds.name}`));
    dsBox.append(S.renderDataset(ex.dataset, 12));
    const left = h('div', { class: 'left' },
      h('a', { class: 'back-link', href: '#/exercises' }, icon('arrowLeft'), 'แบบฝึกหัดทั้งหมด'),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' } },
        h('span', { class: 'badge ' + ex.level }, LEVELS[ex.level]), h('span', { class: 'chip' }, ex.topic),
        st.solved ? h('span', { class: 'badge easy' }, '✓ ผ่านแล้ว') : null),
      h('h1', null, `${idx + 1}. ${ex.title}`),
      h('div', { class: 'ex-prompt', html: ex.prompt }),
      ex.check ? h('p', { class: 'muted small' }, 'ข้อนี้ตรวจจากข้อมูลในตารางหลังโค้ดของคุณทำงาน — ไม่ต้อง SELECT เอง') : null,
      hintBox, expectedBox, dsBox);

    // right: editor + output
    const host = h('div', { class: 'ex-editor' });
    const out = h('div', { class: 'ex-out' }, h('div', { class: 'out-placeholder' }, 'กด "รัน" เพื่อลองดูผล หรือ "ส่งคำตอบ" เพื่อตรวจ'));
    const run = () => {
      const r = engine.runIsolated(ex.dataset, cm.getValue(), 'tsql', ex.check);
      out.innerHTML = '';
      out.append(h('div', { class: 'out-label' }, 'Output:', h('span', { class: 'run-meta' }, `${r.statements} คำสั่ง · ${Math.max(1, Math.round(r.ms))} ms`)),
        U.renderItems(ex.check && r.check ? r.items.concat(r.check.items) : r.items));
    };
    const submit = () => {
      const code = cm.getValue();
      const user = engine.runIsolated(ex.dataset, code, 'tsql', ex.check);
      out.innerHTML = '';
      if (!user.ok) {
        out.append(h('div', { class: 'verdict bad' }, icon('xCircle'), h('div', null, 'โค้ดยังมีข้อผิดพลาด')), U.renderItems(user.items));
        return;
      }
      const ut = engine.lastTable(ex.check ? user.check : user);
      const et = expected(ex);
      const v = engine.compare(ut, et, !!ex.ordered);
      if (v.ok) {
        const first = !store.exerciseState(ex.id).solved;
        store.saveExercise(ex.id, { solved: true, code, solvedAt: Date.now() });
        out.append(h('div', { class: 'verdict ok' }, icon('checkCircle'), h('div', null, 'ถูกต้อง! 🎉', h('div', { class: 'sub' }, first ? 'บันทึกว่าทำผ่านแล้ว' : 'คุณเคยทำข้อนี้ผ่านแล้ว'))));
        if (next) out.append(h('a', { class: 'btn btn-primary btn-sm', href: '#/exercises/' + next.id, style: { marginBottom: '14px' } }, 'ข้อถัดไป: ' + next.title, icon('arrowRight')));
      } else {
        out.append(h('div', { class: 'verdict bad' }, icon('xCircle'), h('div', null, v.reason, v.sub ? h('div', { class: 'sub' }, v.sub) : null)));
      }
      if (ut) out.append(h('div', { class: 'out-label' }, 'ผลลัพธ์ของคุณ'), U.dataGrid(ut.columns, ut.rows), h('div', { style: { height: '14px' } }));
      if (!v.ok && et) out.append(h('div', { class: 'out-label' }, 'ผลลัพธ์ที่ควรได้'), U.dataGrid(et.columns, et.rows));
    };
    const actions = h('div', { class: 'ex-actions' },
      h('button', { class: 'btn btn-sm', onclick: run, title: 'Ctrl + Enter' }, icon('play'), 'รัน'),
      h('button', { class: 'btn btn-sm btn-run', onclick: submit }, icon('check'), 'ส่งคำตอบ'),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { hintBox.hidden = !hintBox.hidden; } }, icon('bulb'), 'คำใบ้'),
      h('button', { class: 'btn btn-sm btn-ghost', onclick: async () => {
        if (await confirmBox('ดูเฉลย', 'ใส่เฉลยลงในตัวแก้ไข? (โค้ดเดิมจะถูกแทนที่)', 'ดูเฉลย')) cm.setValue(ex.solution);
      } }, icon('eye'), 'เฉลย'),
      h('button', { class: 'btn btn-sm btn-ghost', title: 'ล้างโค้ด', onclick: async () => {
        if (await confirmBox('เริ่มใหม่', 'ล้างโค้ดในข้อนี้?', 'ล้างโค้ด', true)) cm.setValue(starter(ex));
      } }, icon('reset')));

    const right = h('div', { class: 'right' }, host, actions, out);
    root.append(h('div', { class: 'ex-detail' }, left, right));
    cm = U.codeEditor(host, { value: st.code || starter(ex), onRun: run });
    cm.addKeyMap({ 'Shift-Ctrl-Enter': submit });
    cm.setOption('hintOptions', { tables: hintFor(ex.dataset), completeSingle: false });
    cm.on('change', U.debounce(() => store.saveExercise(ex.id, { code: cm.getValue() }), 500));
    setTimeout(() => { cm.refresh(); cm.focus(); cm.setCursor(cm.lineCount(), 0); }, 0);
  }

  const expCache = {};
  function expected(ex) {
    if (!(ex.id in expCache)) {
      const r = engine.runIsolated(ex.dataset, ex.solution, 'tsql', ex.check);
      expCache[ex.id] = engine.lastTable(ex.check ? r.check : r);
      if (!r.ok) console.error('solution failed', ex.id, r.items);
    }
    return expCache[ex.id];
  }
  const hintCache = {};
  function hintFor(dsId) {
    if (!hintCache[dsId]) { const db = engine.datasetDb(dsId); try { hintCache[dsId] = engine.hintTables(db); } finally { db.close(); } }
    return hintCache[dsId];
  }
  function starter(ex) { return `-- ${ex.title}\n-- เขียนคำตอบด้านล่าง แล้วกด "ส่งคำตอบ"\n\n`; }

  S.pages = S.pages || {};
  S.pages.exercises = {
    init(el) { root = el; },
    show(route) {
      const id = route.params[0];
      const ex = id && S.exercises.find((e) => e.id === id);
      if (ex) renderDetail(ex); else renderList();
    },
    onTheme() { if (cm) cm.refresh(); },
    _expected: expected,
  };
})(window.SBAC);
