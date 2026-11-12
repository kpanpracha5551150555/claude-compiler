/* SBAC Compiler — Templates page */
(function (S) {
  'use strict';
  const U = S.util;
  const { h, icon, toast, modal, confirmBox } = U;
  let root;

  async function useTemplate(tpl) {
    const ws = S.ws;
    const hasWork = ws.files().some((f) => f.content.trim()) && !ws.data.projectId;
    const msg = `โหลดแม่แบบ <b>${U.esc(tpl.title)}</b> เข้า Compiler?<br>` +
      (tpl.dataset ? 'ระบบจะรีเซ็ตฐานข้อมูลและรัน <code>init.sql</code> ให้อัตโนมัติ' : 'ระบบจะรีเซ็ตฐานข้อมูลของ workspace') +
      (hasWork ? '<br><br><b>งานปัจจุบันยังไม่ได้บันทึก</b> — จะถูกบันทึกเก็บเป็นโปรเจกต์สำรองให้' : '');
    if (!(await confirmBox('ใช้แม่แบบ', msg, 'ใช้แม่แบบนี้'))) return;
    if (hasWork) ws.saveProject((ws.data.name || 'งานเดิม') + ' (สำรอง)');
    const r = ws.applyTemplate(tpl);
    S.pages.editor.resetOutput();
    location.hash = '#/editor';
    toast(r && !r.ok ? 'โหลดแล้ว แต่ init.sql มีข้อผิดพลาด' : `โหลดแม่แบบ "${tpl.title}" แล้ว`, r && !r.ok ? 'err' : 'ok');
  }

  function preview(tpl) {
    const body = h('div');
    tpl.files.forEach((f) => body.append(h('div', { class: 'out-label', style: { marginTop: '10px' } }, icon('db'), f.name), h('pre', { class: 'code-block', style: { maxHeight: '260px', overflow: 'auto' } }, f.content)));
    if (tpl.dataset) {
      const db = S.engine.datasetDb(tpl.dataset);
      try {
        body.append(h('div', { class: 'out-label', style: { marginTop: '16px' } }, 'ตารางที่ได้'));
        S.engine.schema(db).forEach((t) => {
          const d = S.engine.tableData(db, t.name, { limit: 6 });
          body.append(h('div', { class: 'tbl-card' }, h('h3', null, t.name, h('span', { class: 'meta' }, `${t.rowCount} แถว`)), U.dataGrid(d.columns, d.rows)));
        });
      } finally { db.close(); }
    }
    modal({ title: tpl.title, body, wide: true, actions: [{ label: 'ปิด' }, { label: 'ใช้แม่แบบนี้', primary: true, onClick: () => useTemplate(tpl) }] });
  }

  function insertSnippet(sn) {
    location.hash = '#/editor';
    setTimeout(() => { S.pages.editor.insertSnippet(sn.code); toast(`แทรก "${sn.title}" ในแท็บ ${S.ws.activeFile().name}`, 'ok'); }, 50);
  }

  function render() {
    root.innerHTML = '';
    const c = h('div', { class: 'container' });
    c.append(h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'แม่แบบ'), h('p', null, 'เริ่มโปรเจกต์ได้ทันทีพร้อมตารางและข้อมูลตัวอย่าง — กด "ใช้แม่แบบนี้" แล้วระบบจะสร้างตารางให้เลย'))));

    const cards = h('div', { class: 'cards' });
    S.templates.forEach((t) => {
      cards.append(h('div', { class: 'card' },
        h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
          h('div', { class: 'card-ico', style: { background: t.color } }, t.letter),
          h('div', null, h('h3', null, t.title), t.dialect === 'tsql' ? h('span', { class: 'badge tsql' }, 'SQL Server') : null)),
        h('p', null, t.desc),
        h('div', { class: 'chips' }, t.tags.map((x) => h('span', { class: 'chip' }, x))),
        h('div', { class: 'card-foot' },
          h('button', { class: 'btn btn-primary btn-sm', onclick: () => useTemplate(t) }, 'ใช้แม่แบบนี้'),
          h('button', { class: 'btn btn-sm', onclick: () => preview(t) }, icon('eye'), 'ดูตัวอย่าง'))));
    });
    c.append(cards);

    c.append(h('h2', { class: 'section-title' }, icon('code'), 'โค้ดสำเร็จรูป (Snippets)'),
      h('p', { class: 'muted', style: { marginTop: '-4px' } }, 'คลิกเพื่อแทรกโค้ดลงในแท็บที่เปิดอยู่ใน Compiler'));
    const snips = h('div', { class: 'cards' });
    S.snippets.forEach((sn) => snips.append(h('div', { class: 'card' },
      h('h3', null, sn.title),
      h('pre', { class: 'code-block', style: { fontSize: '12.5px', maxHeight: '150px', overflow: 'auto' } }, sn.code),
      h('div', { class: 'card-foot' }, h('button', { class: 'btn btn-sm', onclick: () => insertSnippet(sn) }, icon('plus'), 'แทรกใน Compiler')))));
    c.append(snips);
    root.append(c);
  }

  S.pages = S.pages || {};
  S.pages.templates = {
    init(el) { root = el; },
    show() { render(); },
  };
})(window.SBAC);
