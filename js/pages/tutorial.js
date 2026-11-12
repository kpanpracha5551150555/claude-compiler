/* SBAC Compiler — Tutorial page */
(function (S) {
  'use strict';
  const U = S.util;
  const { h, icon, toast, confirmBox } = U;
  const engine = S.engine, store = S.store;
  let root, currentId = null, editors = [];

  /* ---------- shared helpers (also used by exercises) ---------- */
  function datasetTables(datasetId, limit) {
    const wrap = h('div');
    const db = engine.datasetDb(datasetId);
    try {
      engine.schema(db).forEach((t) => {
        const d = engine.tableData(db, t.name, limit ? { limit } : null);
        wrap.append(h('div', { class: 'tbl-card' },
          h('h3', null, t.name, h('span', { class: 'meta' }, `${t.rowCount} แถว${limit && t.rowCount > limit ? ` · แสดง ${limit} แถวแรก` : ''}`)),
          U.dataGrid(d.columns, d.rows, { big: true })));
      });
    } finally { db.close(); }
    return wrap;
  }

  function miniEditor(host, value, onRun) {
    const cm = U.codeEditor(host, { value, onRun, cm: { viewportMargin: Infinity, lineNumbers: true } });
    editors.push(cm);
    return cm;
  }

  /** Open code in the Compiler; offer to load the dataset if its tables are missing. */
  async function openInCompiler(code, datasetId) {
    const ds = S.datasets[datasetId];
    if (ds) {
      let names = [];
      try { names = engine.schema(S.ws.db).map((t) => t.name.toLowerCase()); } catch (e) { /* ignore */ }
      const missing = ds.tables.filter((t) => !names.includes(t.toLowerCase()));
      if (missing.length === ds.tables.length) {
        const ok = await confirmBox('เปิดใน Compiler', `ฐานข้อมูลใน Compiler ยังไม่มีตาราง <b>${ds.tables.join(', ')}</b><br>เพิ่มข้อมูลตัวอย่าง "${ds.name}" ลงในฐานข้อมูลด้วยไหม?`, 'เพิ่มข้อมูลและเปิด');
        if (ok) { const r = S.ws.exec(ds.sql); S.ws.persistDb(); S.ws.emit('db'); if (!r.ok) toast('เพิ่มข้อมูลไม่สำเร็จ: ' + r.items.find((i) => i.kind === 'error').message, 'err'); }
      }
    }
    location.hash = '#/editor';
    setTimeout(() => S.pages.editor.newTab('lesson.sql', code, false), 60);
  }

  function runnerBlock(title, code, datasetId) {
    const out = h('div', { class: 'runner-out' });
    const host = h('div');
    let cm;
    const runIt = () => {
      const r = engine.runIsolated(datasetId, cm.getValue(), 'tsql');
      out.innerHTML = '';
      out.append(U.renderItems(r.items, { noCopy: true }));
    };
    const box = h('div', { class: 'runner' },
      h('div', { class: 'runner-head' }, h('span', null, title),
        h('div', { class: 'btns' },
          h('button', { class: 'btn btn-xs', title: 'เปิดใน Compiler', onclick: () => openInCompiler(cm.getValue(), datasetId) }, icon('code'), h('span', { class: 'lbl-hide-sm' }, 'เปิดใน Compiler')),
          h('button', { class: 'btn btn-xs btn-run', onclick: runIt }, icon('play'), 'รัน'))),
      host, out);
    setTimeout(() => { cm = miniEditor(host, code, runIt); }, 0);
    return box;
  }

  /* ---------- page ---------- */
  function lessonIndex(id) { return S.lessons.findIndex((l) => l.id === id); }

  function render() {
    editors = [];
    root.innerHTML = '';
    const progress = store.progress();
    const doneCount = S.lessons.filter((l) => progress.lessons[l.id]).length;
    const lesson = S.lessons[Math.max(0, lessonIndex(currentId))];

    const nav = h('aside', { class: 'lesson-nav' },
      h('div', { class: 'progress-box' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('b', null, 'ความคืบหน้า'), `${doneCount}/${S.lessons.length} บท`),
        h('div', { class: 'progress' }, h('div', { style: { width: (doneCount / S.lessons.length * 100) + '%' } }))));
    S.chapters.forEach((ch) => {
      const ls = S.lessons.filter((l) => l.chapter === ch.id);
      if (!ls.length) return;
      nav.append(h('h4', null, ch.title));
      ls.forEach((l) => nav.append(h('a', { class: 'lesson-link' + (l.id === lesson.id ? ' active' : ''), href: '#/tutorial/' + l.id },
        h('span', { class: 'chk' + (progress.lessons[l.id] ? ' done' : '') }, progress.lessons[l.id] ? icon('check') : null),
        h('span', null, l.title))));
    });

    const main = h('div', { class: 'main' });
    root.append(h('div', { class: 'split' }, nav, main));
    main.append(lessonView(lesson, progress));
    main.scrollTop = 0;
  }

  function lessonView(l, progress) {
    const idx = lessonIndex(l.id);
    const ch = S.chapters.find((c) => c.id === l.chapter);
    const p = h('article', { class: 'prose' });
    p.append(h('div', { class: 'eyebrow' }, `บทที่ ${idx + 1} · ${ch ? ch.title : ''}`), h('h1', null, l.title));
    if (l.dataset) {
      const det = h('details', { class: 'dataset-box' }, h('summary', null, `ตารางที่ใช้ในบทนี้ — ${S.datasets[l.dataset].name}`));
      det.addEventListener('toggle', () => { if (det.open && det.children.length === 1) det.append(datasetTables(l.dataset)); }, { once: false });
      p.append(det);
    }
    p.append(h('div', { html: l.body }));
    if (l.syntax) p.append(h('h2', null, 'รูปแบบคำสั่ง'), h('pre', { class: 'code-block' }, l.syntax));
    if (l.examples && l.examples.length) {
      p.append(h('h2', null, 'ตัวอย่าง (แก้โค้ดแล้วกดรันได้)'));
      l.examples.forEach((ex) => p.append(runnerBlock(ex.title, ex.code, l.dataset)));
    }
    if (l.practice) p.append(practiceBlock(l));
    else {
      const done = !!progress.lessons[l.id];
      p.append(h('div', { style: { marginTop: '24px' } }, h('button', {
        class: 'btn ' + (done ? '' : 'btn-primary'),
        onclick: () => { store.markLesson(l.id, !done); render(); },
      }, icon(done ? 'checkCircle' : 'check'), done ? 'อ่านจบแล้ว (คลิกเพื่อยกเลิก)' : 'ทำเครื่องหมายว่าจบบทนี้')));
    }
    const prev = S.lessons[idx - 1], next = S.lessons[idx + 1];
    p.append(h('div', { class: 'lesson-pager' },
      prev ? h('a', { class: 'btn', href: '#/tutorial/' + prev.id }, icon('arrowLeft'), prev.title) : h('span'),
      next ? h('a', { class: 'btn btn-primary', href: '#/tutorial/' + next.id }, next.title, icon('arrowRight')) : h('a', { class: 'btn btn-primary', href: '#/exercises' }, 'ไปทำแบบฝึกหัด', icon('arrowRight'))));
    return p;
  }

  function practiceBlock(l) {
    const pr = l.practice;
    const out = h('div', { class: 'runner-out' });
    const host = h('div');
    let cm;
    const result = () => engine.runIsolated(l.dataset, cm.getValue(), 'tsql', pr.check);
    const runIt = () => {
      const r = result();
      out.innerHTML = '';
      out.append(U.renderItems(pr.check && r.check ? r.items.concat(r.check.items) : r.items, { noCopy: true }));
    };
    const check = () => {
      const user = result();
      const exp = engine.runIsolated(l.dataset, pr.solution, 'tsql', pr.check);
      out.innerHTML = '';
      if (!user.ok) {
        out.append(h('div', { class: 'verdict bad' }, icon('xCircle'), h('div', null, 'โค้ดยังมีข้อผิดพลาด')), U.renderItems(user.items, { noCopy: true }));
        return;
      }
      const ut = engine.lastTable(pr.check ? user.check : user), et = engine.lastTable(pr.check ? exp.check : exp);
      const v = engine.compare(ut, et, !!pr.ordered);
      if (v.ok) {
        store.markLesson(l.id, true);
        out.append(h('div', { class: 'verdict ok' }, icon('checkCircle'), h('div', null, 'ถูกต้อง! ผ่านบทนี้แล้ว 🎉', h('div', { class: 'sub' }, 'ไปบทถัดไปได้เลย'))));
        const link = root.querySelector('.lesson-link.active .chk');
        if (link) { link.classList.add('done'); link.innerHTML = ''; link.append(icon('check')); }
      } else {
        out.append(h('div', { class: 'verdict bad' }, icon('xCircle'), h('div', null, v.reason, v.sub ? h('div', { class: 'sub' }, v.sub) : null)));
      }
      if (ut) out.append(h('div', { class: 'out-label' }, 'ผลลัพธ์ของคุณ'), U.dataGrid(ut.columns, ut.rows));
      if (!v.ok && et) out.append(h('div', { class: 'out-label', style: { marginTop: '14px' } }, 'ผลลัพธ์ที่ควรได้'), U.dataGrid(et.columns, et.rows));
    };
    const box = h('div', { class: 'practice' },
      h('h2', null, '✍️ ลองทำ'),
      h('p', { html: pr.task }),
      h('div', { class: 'runner' },
        h('div', { class: 'runner-head' }, h('span', null, 'คำตอบของคุณ'),
          h('div', { class: 'btns' },
            h('button', { class: 'btn btn-xs', onclick: () => { cm.setValue(pr.solution); toast('ใส่เฉลยให้แล้ว ลองรันดู'); } }, icon('bulb'), 'ดูเฉลย'),
            h('button', { class: 'btn btn-xs', onclick: runIt }, icon('play'), 'รัน'),
            h('button', { class: 'btn btn-xs btn-primary', onclick: check }, icon('check'), 'ตรวจคำตอบ'))),
        host, out));
    setTimeout(() => { cm = miniEditor(host, '-- เขียนคำตอบที่นี่ แล้วกด "ตรวจคำตอบ"\n', check); }, 0);
    return box;
  }

  S.renderDataset = datasetTables;
  S.pages = S.pages || {};
  S.pages.tutorial = {
    init(el) { root = el; },
    show(route) {
      const id = route.params[0] || currentId || S.lessons[0].id;
      if (lessonIndex(id) < 0) { location.hash = '#/tutorial/' + S.lessons[0].id; return; }
      currentId = id;
      render();
    },
    onTheme() { editors.forEach((c) => c.refresh()); },
  };
})(window.SBAC);
