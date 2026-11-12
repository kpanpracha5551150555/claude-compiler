/* SBAC Compiler — current workspace (files + shared database) */
(function (S) {
  'use strict';
  const { store, engine } = S;
  const U = S.util;
  const listeners = new Set();
  const isInit = (f) => /^init\.sql$/i.test(f.name);

  function fromTemplate(tpl) {
    const files = tpl.files.map((f) => ({ id: U.uid(), name: f.name, content: f.content }));
    return {
      name: tpl.title, dialect: tpl.dialect || 'tsql', files,
      activeFileId: files[0].id, projectId: null, templateId: tpl.id,
    };
  }

  const ws = {
    data: null,
    db: null,

    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(type, detail) { listeners.forEach((fn) => { try { fn(type, detail); } catch (e) { console.error(e); } }); },

    async init() {
      await engine.init();
      const saved = store.loadWorkspace();
      if (saved && Array.isArray(saved.files) && saved.files.length) {
        this.data = saved;
        if (!this.data.files.some((f) => f.id === this.data.activeFileId)) this.data.activeFileId = this.data.files[0].id;
        let bytes = store.loadDb();
        try { this.db = engine.createDb(bytes); } catch (e) { this.db = engine.createDb(); }
      } else {
        this.db = engine.createDb();
        this.applyTemplate(S.templates.find((t) => t.id === 'shop'), { silent: true });
      }
    },

    /* ---------- files ---------- */
    files() { return this.data.files; },
    file(id) { return this.data.files.find((f) => f.id === id); },
    activeFile() { return this.file(this.data.activeFileId) || this.data.files[0]; },
    initFile() { return this.data.files.find(isInit) || null; },
    setActive(id) { this.data.activeFileId = id; this.save(); this.emit('active'); },
    setContent(id, content) { const f = this.file(id); if (f) { f.content = content; this.saveSoon(); } },
    uniqueName(base) {
      const names = new Set(this.data.files.map((f) => f.name.toLowerCase()));
      if (!names.has(base.toLowerCase())) return base;
      const m = /^(.*?)(\.sql)?$/i.exec(base);
      for (let i = 2; ; i++) { const n = `${m[1]}${i}${m[2] || '.sql'}`; if (!names.has(n.toLowerCase())) return n; }
    },
    addFile(name, content) {
      const f = { id: U.uid(), name: this.uniqueName(name || 'query.sql'), content: content || '' };
      this.data.files.push(f);
      this.data.activeFileId = f.id;
      this.save();
      this.emit('files');
      return f;
    },
    renameFile(id, name) {
      const f = this.file(id);
      if (!f || !name) return;
      name = name.trim();
      if (!/\.\w+$/.test(name)) name += '.sql';
      if (this.data.files.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) { U.toast('มีไฟล์ชื่อนี้แล้ว', 'err'); return; }
      f.name = name; this.save(); this.emit('files');
    },
    removeFile(id) {
      if (this.data.files.length <= 1) { U.toast('ต้องมีอย่างน้อย 1 ไฟล์', 'err'); return; }
      const i = this.data.files.findIndex((f) => f.id === id);
      this.data.files.splice(i, 1);
      if (this.data.activeFileId === id) this.data.activeFileId = this.data.files[Math.max(0, i - 1)].id;
      this.save(); this.emit('files');
    },
    setDialect(d) { this.data.dialect = d; this.save(); this.emit('dialect'); },

    /* ---------- persistence ---------- */
    save() { store.saveWorkspace(this.data); },
    saveSoon: U.debounce(function () { ws.save(); }, 400),
    persistDb() {
      try {
        const bytes = engine.exportDb(this.db);
        if (!store.saveDb(bytes)) U.toast('ฐานข้อมูลใหญ่เกินกว่าจะบันทึกในเบราว์เซอร์ (ยังใช้งานได้จนกว่าจะปิดหน้า)', 'err');
      } catch (e) { console.warn(e); }
    },
    resetDb(silent) {
      try { this.db.close(); } catch (e) { /* ignore */ }
      this.db = engine.createDb();
      store.saveDb(null);
      this.emit('db');
      if (!silent) U.toast('รีเซ็ตฐานข้อมูลแล้ว', 'ok');
    },

    /* ---------- running ---------- */
    exec(code, opts) {
      const r = engine.execute(this.db, code, this.data.dialect, opts);
      return r;
    },
    /**
     * Run one file (the ACTIVE tab by default). opts: {code, lineOffset, label}
     * In "fresh" mode the database is rebuilt and init.sql runs first.
     */
    runFile(file, opts) {
      opts = opts || {};
      const settings = store.settings();
      const out = { file: file.name, label: opts.label || file.name, sections: [] };
      if (settings.runMode === 'fresh') {
        this.resetDb(true);
        const init = this.initFile();
        if (init && init.id !== file.id) {
          const r0 = this.exec(init.content);
          out.sections.push({ title: `${init.name} (รันให้ก่อนอัตโนมัติ — โหมดเริ่มใหม่ทุกครั้ง)`, result: r0, collapsed: r0.ok });
        }
      }
      // Running the whole init.sql again = start from a clean database (avoids "table already exists")
      const autoReset = settings.runMode !== 'fresh' && isInit(file) && opts.code == null;
      if (autoReset) this.resetDb(true);
      const r = this.exec(opts.code != null ? opts.code : file.content, { lineOffset: opts.lineOffset || 0 });
      if (autoReset) r.items.unshift({ kind: 'msg', text: `↻ รีเซ็ตฐานข้อมูลก่อนรัน ${file.name} อัตโนมัติ`, tone: 'muted' });
      out.sections.push({ title: null, result: r });
      out.result = r;
      out.ok = out.sections.every((s) => s.result.ok);
      out.ms = out.sections.reduce((a, s) => a + s.result.ms, 0);
      this.afterRun(out, opts.code != null ? opts.code : file.content);
      return out;
    },
    /** Run every tab from left to right (init.sql first if it exists). */
    runAll() {
      const settings = store.settings();
      if (settings.runMode === 'fresh') this.resetDb(true);
      const ordered = [...this.data.files].sort((a, b) => (isInit(b) ? 1 : 0) - (isInit(a) ? 1 : 0));
      const out = { file: 'ทุกแท็บ', label: 'ทุกแท็บ', sections: [] };
      for (const f of ordered) {
        const r = this.exec(f.content);
        out.sections.push({ title: f.name, result: r, fileId: f.id });
        if (!r.ok) break;
      }
      out.ok = out.sections.every((s) => s.result.ok);
      out.ms = out.sections.reduce((a, s) => a + s.result.ms, 0);
      out.result = out.sections[out.sections.length - 1].result;
      this.afterRun(out, ordered.map((f) => `-- ${f.name}\n${f.content}`).join('\n'));
      return out;
    },
    afterRun(out, code) {
      this.persistDb();
      store.addHistory({ t: Date.now(), file: out.label, dialect: this.data.dialect, ok: out.ok, ms: Math.round(out.ms), code: String(code).slice(0, 4000) });
      this.emit('db');
      this.emit('history');
    },

    /* ---------- load / templates / projects ---------- */
    load(data, opts) {
      opts = opts || {};
      this.data = data;
      this.save();
      if (opts.resetDb !== false) this.resetDb(true);
      this.emit('files');
      this.emit('dialect');
      if (opts.runInit !== false) {
        const init = this.initFile();
        if (init) {
          const r = this.exec(init.content);
          this.persistDb();
          this.emit('db');
          if (!r.ok && !opts.silent) U.toast('init.sql มีข้อผิดพลาด — ดูที่แท็บ init.sql', 'err');
          return r;
        }
      }
      this.emit('db');
      return null;
    },
    applyTemplate(tpl, opts) {
      const data = fromTemplate(tpl);
      const q = data.files.find((f) => !isInit(f));
      if (q) data.activeFileId = q.id;
      return this.load(data, opts);
    },
    snapshot() {
      return { name: this.data.name, dialect: this.data.dialect, files: this.data.files.map((f) => ({ name: f.name, content: f.content })) };
    },
    saveProject(name) {
      const p = { id: this.data.projectId || U.uid(), name: name || this.data.name || 'โปรเจกต์', dialect: this.data.dialect, files: this.data.files.map((f) => ({ name: f.name, content: f.content })) };
      store.saveProject(p);
      this.data.projectId = p.id;
      this.data.name = p.name;
      this.save();
      this.emit('projects');
      return p;
    },
    openProject(p) {
      const files = p.files.map((f) => ({ id: U.uid(), name: f.name, content: f.content }));
      const q = files.find((f) => !isInit(f)) || files[0];
      return this.load({ name: p.name, dialect: p.dialect || 'tsql', files, activeFileId: q.id, projectId: p.id || null });
    },
  };

  S.ws = ws;
  S.isInitFile = isInit;
})(window.SBAC);
