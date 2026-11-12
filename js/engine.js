/* SBAC Compiler — SQL engine (sql.js / SQLite WASM) */
(function (S) {
  'use strict';
  const D = S.dialects;
  const SQLJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/';
  const MAX_ROWS = 2000;
  let SQL = null, initP = null;

  function init() {
    if (!initP) {
      initP = initSqlJs({ locateFile: (f) => SQLJS_BASE + f }).then((s) => { SQL = s; return s; });
    }
    return initP;
  }

  /* ---------- extra functions (T-SQL / MySQL helpers) ---------- */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function parseDate(v) {
    if (v == null) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(v));
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  function fmtNumber(n, decimals, group) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: group });
  }
  function format(v, f) {
    if (v == null || f == null) return null;
    f = String(f);
    let m;
    if ((m = /^([NnFfCcPpDd])(\d*)$/.exec(f))) {
      const k = m[1].toUpperCase();
      const d = m[2] === '' ? (k === 'D' ? 0 : 2) : +m[2];
      const n = Number(v);
      if (k === 'N') return fmtNumber(n, d, true);
      if (k === 'F') return fmtNumber(n, d, false);
      if (k === 'C') return '$' + fmtNumber(n, d, true);
      if (k === 'P') return fmtNumber(n * 100, d, true) + '%';
      if (k === 'D') return String(Math.trunc(n)).padStart(d, '0');
    }
    if (/^[#0,.]+$/.test(f)) {
      const dec = f.includes('.') ? f.split('.')[1].length : 0;
      return fmtNumber(Number(v), dec, f.includes(','));
    }
    const dt = parseDate(v);
    if (!dt) return String(v);
    const p2 = (x) => String(x).padStart(2, '0');
    return f.replace(/yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|ss|tt/g, (t) => ({
      yyyy: dt.getFullYear(), yy: String(dt.getFullYear()).slice(-2), MMMM: MONTHS[dt.getMonth()], MMM: MONTHS[dt.getMonth()].slice(0, 3),
      MM: p2(dt.getMonth() + 1), M: dt.getMonth() + 1, dddd: DAYS[dt.getDay()], ddd: DAYS[dt.getDay()].slice(0, 3), dd: p2(dt.getDate()), d: dt.getDate(),
      HH: p2(dt.getHours()), H: dt.getHours(), hh: p2(dt.getHours() % 12 || 12), h: dt.getHours() % 12 || 12, mm: p2(dt.getMinutes()),
      ss: p2(dt.getSeconds()), tt: dt.getHours() < 12 ? 'AM' : 'PM',
    })[t]);
  }
  const n1 = (fn) => (x) => (x == null ? null : fn(Number(x)));
  const FUNCS = {
    SBAC_MONTHNAME: (d) => { const x = parseDate(d); return x ? MONTHS[x.getMonth()] : null; },
    SBAC_DAYNAME: (d) => { const x = parseDate(d); return x ? DAYS[x.getDay()] : null; },
    SBAC_FORMAT: (v, f) => format(v, f),
    SBAC_LOCATE: (sub, s) => (s == null || sub == null ? null : String(s).indexOf(String(sub)) + 1),
    SBAC_TRUNCATE: (x, d) => (x == null ? null : Math.trunc(Number(x) * Math.pow(10, d || 0)) / Math.pow(10, d || 0)),
    CEILING: n1(Math.ceil), CEIL: n1(Math.ceil), FLOOR: n1(Math.floor), SQRT: n1(Math.sqrt), EXP: n1(Math.exp),
    SIGN: n1(Math.sign), LOG10: n1(Math.log10),
    POWER: (x, y) => (x == null || y == null ? null : Math.pow(Number(x), Number(y))),
    POW: (x, y) => (x == null || y == null ? null : Math.pow(Number(x), Number(y))),
    PI: () => Math.PI,
    REPLICATE: (s, n) => (s == null || n == null ? null : String(s).repeat(Math.max(0, n | 0))),
    REPEAT: (s, n) => (s == null || n == null ? null : String(s).repeat(Math.max(0, n | 0))),
    SPACE: (n) => (n == null ? null : ' '.repeat(Math.max(0, n | 0))),
    REVERSE: (s) => (s == null ? null : Array.from(String(s)).reverse().join('')),
    NEWID: () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).toUpperCase(),
    UUID: () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)),
  };
  function registerFunctions(db) {
    for (const name in FUNCS) db.create_function(name, FUNCS[name]);
    db.run('PRAGMA foreign_keys = ON');
  }

  function createDb(bytes) {
    const db = bytes ? new SQL.Database(bytes) : new SQL.Database();
    registerFunctions(db);
    return db;
  }
  /** export() closes/reopens the db and drops custom functions → register again */
  function exportDb(db) {
    const bytes = db.export();
    registerFunctions(db);
    return bytes;
  }

  /* ---------- schema helpers ---------- */
  const qi = (name) => '"' + String(name).replace(/"/g, '""') + '"';
  function all(db, sql, params) {
    const st = db.prepare(sql);
    const rows = [];
    try {
      if (params) st.bind(params);
      while (st.step()) rows.push(st.getAsObject());
    } finally { st.free(); }
    return rows;
  }
  function schema(db) {
    const objs = all(db, "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, rowid");
    return objs.map((o) => {
      const columns = all(db, `PRAGMA table_info(${qi(o.name)})`).map((c) => ({
        name: c.name, type: c.type || '', notnull: !!c.notnull, pk: c.pk > 0, dflt: c.dflt_value,
      }));
      let fks = [];
      try { fks = all(db, `PRAGMA foreign_key_list(${qi(o.name)})`).map((f) => ({ from: f.from, table: f.table, to: f.to })); } catch (e) { /* view */ }
      let rowCount = null;
      try { rowCount = all(db, `SELECT COUNT(*) AS n FROM ${qi(o.name)}`)[0].n; } catch (e) { rowCount = null; }
      let indexes = [];
      try { indexes = all(db, `PRAGMA index_list(${qi(o.name)})`).filter((i) => !/^sqlite_autoindex/.test(i.name)).map((i) => i.name); } catch (e) { /* ignore */ }
      return { name: o.name, type: o.type, sql: o.sql, columns, fks, rowCount, indexes };
    });
  }
  function textColumns(db) {
    const set = new Set();
    try {
      all(db, "SELECT p.name AS name, p.type AS type FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type IN ('table','view') AND m.name NOT LIKE 'sqlite_%'")
        .forEach((r) => { if (/CHAR|TEXT|CLOB/i.test(r.type || '')) set.add(String(r.name).toLowerCase()); });
    } catch (e) { /* ignore */ }
    return set;
  }
  function hintTables(db) {
    const t = {};
    try { schema(db).forEach((s) => { t[s.name] = s.columns.map((c) => c.name); }); } catch (e) { /* ignore */ }
    return t;
  }
  function tableData(db, name, opts) {
    opts = opts || {};
    let sql = `SELECT * FROM ${qi(name)}`;
    if (opts.limit) sql += ` LIMIT ${opts.limit | 0} OFFSET ${opts.offset | 0}`;
    const st = db.prepare(sql);
    try {
      const columns = st.getColumnNames();
      const rows = [];
      while (st.step()) rows.push(st.get());
      return { columns, rows };
    } finally { st.free(); }
  }

  /* ---------- error hints (Thai) ---------- */
  function hintFor(msg) {
    let m;
    if ((m = /no such table: (\S+)/i.exec(msg))) return `ไม่พบตาราง ${m[1]} — ตรวจสอบชื่อ หรือรันไฟล์ที่สร้างตาราง (เช่น init.sql) ก่อน`;
    if ((m = /no such column: (\S+)/i.exec(msg))) return `ไม่พบคอลัมน์ ${m[1]} — ดูชื่อคอลัมน์ได้ที่แถบฐานข้อมูลด้านซ้าย หรือหน้า "ตาราง"`;
    if ((m = /table (\S+) already exists/i.exec(msg))) return `มีตาราง ${m[1]} อยู่แล้ว — กด Reset DB หรือใช้ DROP TABLE IF EXISTS ${m[1]} ก่อน CREATE`;
    if ((m = /UNIQUE constraint failed: (\S+)/i.exec(msg))) return `ค่าซ้ำในคอลัมน์ ${m[1]} (ละเมิด PRIMARY KEY / UNIQUE)`;
    if ((m = /NOT NULL constraint failed: (\S+)/i.exec(msg))) return `คอลัมน์ ${m[1]} ห้ามเป็นค่าว่าง (NULL)`;
    if (/FOREIGN KEY constraint failed/i.test(msg)) return 'ค่าที่อ้างอิงไม่มีอยู่ในตารางแม่ หรือยังมีข้อมูลลูกอ้างถึงอยู่ (FOREIGN KEY)';
    if (/CHECK constraint failed/i.test(msg)) return 'ข้อมูลไม่ผ่านเงื่อนไข CHECK ของตาราง';
    if ((m = /near "([^"]*)": syntax error/i.exec(msg))) return `ไวยากรณ์ผิดใกล้คำว่า "${m[1]}" — ตรวจสอบเครื่องหมาย , ( ) ' และการสะกดคำสั่ง`;
    if (/incomplete input/i.test(msg)) return 'คำสั่งยังไม่จบ — อาจลืมปิดวงเล็บหรือเครื่องหมาย \'';
    if (/misuse of aggregate/i.test(msg)) return 'ใช้ฟังก์ชันรวม (COUNT/SUM/…) ใน WHERE ไม่ได้ — ให้ใช้ HAVING แทน';
    if (/must appear in the GROUP BY|not an aggregate/i.test(msg)) return 'คอลัมน์ที่ SELECT ต้องอยู่ใน GROUP BY หรืออยู่ในฟังก์ชันรวม';
    if (/no such function: (\S+)/i.test(msg)) return 'ฟังก์ชันนี้ยังไม่รองรับในโหมดเบราว์เซอร์ — ลองดูฟังก์ชันที่รองรับในหน้าบทเรียน';
    if (/values for \d+ columns|has \d+ columns but \d+ values/i.test(msg)) return 'จำนวนค่าใน VALUES ไม่เท่ากับจำนวนคอลัมน์';
    return null;
  }

  /* ---------- execute a script ---------- */
  function coerce(v, type) {
    if (v == null || !type) return v;
    const t = type.toUpperCase();
    if (/^(BIG|SMALL|TINY)?INT/.test(t) || t === 'BIT') { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : v; }
    if (/^(DECIMAL|NUMERIC|FLOAT|REAL|MONEY)/.test(t)) { const n = Number(v); return Number.isFinite(n) ? n : v; }
    if (/CHAR|TEXT/.test(t)) {
      const s = String(v);
      const len = /\(\s*(\d+)\s*\)/.exec(t);
      return len ? s.slice(0, +len[1]) : s;
    }
    return v;
  }
  function firstSql(tr) {
    if (tr.kind !== 'sql' || !tr.sqls.length) throw new D.SqlError('Incorrect syntax.');
    return tr.sqls[0];
  }
  function evalScalar(db, expr, dialect, ctx) {
    const sql = firstSql(D.translate('SELECT ' + expr, dialect, ctx));
    const st = db.prepare(sql);
    try { return st.step() ? st.get()[0] : null; } finally { st.free(); }
  }
  function runSql(db, sql, ctx, items) {
    if (!sql || !sql.trim()) return;
    const st = db.prepare(sql);
    try {
      const cols = st.getColumnNames();
      if (cols.length) {
        const rows = [];
        let truncated = false;
        while (st.step()) {
          if (rows.length >= MAX_ROWS) { truncated = true; break; }
          rows.push(st.get());
        }
        items.push({ kind: 'table', columns: cols, rows, truncated });
      } else {
        st.step();
        if (/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql) && !ctx.nocount) {
          const n = db.getRowsModified();
          items.push({ kind: 'msg', text: `(${n} ${n === 1 ? 'row' : 'rows'} affected)`, tone: 'muted' });
        }
      }
    } finally { st.free(); }
  }
  function runTranslated(db, tr, dialect, ctx, items) {
    switch (tr.kind) {
      case 'noop':
        if (tr.message) items.push({ kind: 'msg', text: tr.message, tone: 'muted' });
        return;
      case 'setopt':
        ctx.nocount = tr.nocount;
        return;
      case 'declare':
        tr.vars.forEach((v) => {
          const key = v.name.toLowerCase();
          ctx.types.set(key, v.type);
          ctx.vars.set(key, v.expr != null ? coerce(evalScalar(db, v.expr, dialect, ctx), v.type) : null);
        });
        return;
      case 'set': {
        const key = tr.name.toLowerCase();
        if (dialect === 'tsql' && !ctx.vars.has(key)) throw new D.SqlError(`Must declare the scalar variable "@${tr.name}".`, 'ต้องประกาศตัวแปรก่อนด้วย DECLARE');
        ctx.vars.set(key, coerce(evalScalar(db, tr.expr, dialect, ctx), ctx.types.get(key)));
        return;
      }
      case 'print': {
        const v = evalScalar(db, tr.expr, dialect, ctx);
        items.push({ kind: 'msg', text: v == null ? '' : String(v), tone: 'print' });
        return;
      }
      case 'selectAssign': {
        const key = tr.name.toLowerCase();
        if (dialect === 'tsql' && !ctx.vars.has(key)) throw new D.SqlError(`Must declare the scalar variable "@${tr.name}".`);
        const st = db.prepare(firstSql(D.translate(tr.sql, dialect, ctx)));
        try { while (st.step()) ctx.vars.set(key, coerce(st.get()[0], ctx.types.get(key))); } finally { st.free(); }
        return;
      }
      default:
        tr.sqls.forEach((sql) => runSql(db, sql, ctx, items));
    }
  }

  /**
   * Run a whole script. Returns { items, ok, ms, statements }.
   * items: {kind:'table', columns, rows, truncated} | {kind:'msg', text, tone} | {kind:'error', message, hint, line, sql}
   */
  function execute(db, code, dialect, opts) {
    opts = opts || {};
    const t0 = performance.now();
    const items = [];
    let ok = true, statements = 0;
    const ctx = { vars: new Map(), types: new Map(), nocount: !!opts.nocount, textCols: textColumns(db) };
    let pieces = [];
    try { pieces = D.split(code, dialect); } catch (e) {
      items.push({ kind: 'error', message: e.message, hint: e.hint });
      return { items, ok: false, ms: performance.now() - t0, statements: 0 };
    }
    let batch = -1;
    for (const p of pieces) {
      if (p.batch !== batch) { batch = p.batch; ctx.vars = new Map(); ctx.types = new Map(); }
      try {
        const tr = D.translate(p.text, dialect, ctx);
        runTranslated(db, tr, dialect, ctx, items);
        statements++;
        if (/^\s*(CREATE|ALTER|DROP)\b/i.test(p.text)) ctx.textCols = textColumns(db);
      } catch (e) {
        const message = String(e && e.message ? e.message : e);
        items.push({ kind: 'error', message, hint: e.hint || hintFor(message), line: p.line + (opts.lineOffset || 0), sql: p.text.trim() });
        ok = false;
        break;
      }
    }
    if (ok && statements && !items.some((i) => i.kind === 'table' || i.kind === 'msg')) {
      items.push({ kind: 'msg', text: 'Commands completed successfully.', tone: 'okmsg' });
    }
    if (ok && !statements) items.push({ kind: 'msg', text: 'ไม่มีคำสั่งให้รัน', tone: 'muted' });
    return { items, ok, ms: performance.now() - t0, statements };
  }

  /* ---------- datasets / isolated runs (lessons & exercises) ---------- */
  const dsCache = {};
  function datasetDb(id) {
    if (!dsCache[id]) {
      const ds = S.datasets[id];
      const db = createDb();
      if (ds) {
        const r = execute(db, ds.sql, 'tsql');
        if (!r.ok) console.error('dataset failed', id, r.items);
      }
      dsCache[id] = db.export();
      db.close();
    }
    return createDb(dsCache[id]);
  }
  function runIsolated(datasetId, code, dialect, checkSql) {
    const db = datasetDb(datasetId);
    try {
      const r = execute(db, code, dialect || 'tsql');
      if (checkSql && r.ok) r.check = execute(db, checkSql, 'tsql');
      return r;
    } finally { db.close(); }
  }
  const lastTable = (r) => (r ? [...r.items].reverse().find((i) => i.kind === 'table') || null : null);

  /* ---------- compare result sets (exercise checker) ---------- */
  function norm(v) {
    if (v == null) return '∅';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
    const s = String(v).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) { const n = Number(s); return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); }
    return s.toLowerCase();
  }
  function compare(user, expected, ordered) {
    if (!expected) return { ok: false, reason: 'ไม่มีผลลัพธ์อ้างอิง' };
    if (!user) return { ok: false, reason: 'ยังไม่มีผลลัพธ์ตาราง', sub: 'คำตอบต้องจบด้วยคำสั่ง SELECT ที่แสดงข้อมูล' };
    if (user.columns.length !== expected.columns.length) {
      return { ok: false, reason: `จำนวนคอลัมน์ไม่ตรง: ได้ ${user.columns.length} คอลัมน์ แต่ควรได้ ${expected.columns.length} คอลัมน์`, sub: 'คอลัมน์ที่ควรได้: ' + expected.columns.join(', ') };
    }
    if (user.rows.length !== expected.rows.length) {
      return { ok: false, reason: `จำนวนแถวไม่ตรง: ได้ ${user.rows.length} แถว แต่ควรได้ ${expected.rows.length} แถว`, sub: 'ตรวจสอบเงื่อนไข WHERE / JOIN / GROUP BY อีกครั้ง' };
    }
    const key = (r) => r.map(norm).join('␟');
    const u = user.rows.map(key), e = expected.rows.map(key);
    const same = (a, b) => a.every((x, i) => x === b[i]);
    if (ordered) {
      if (same(u, e)) return { ok: true };
      if (same([...u].sort(), [...e].sort())) return { ok: false, reason: 'ข้อมูลถูกต้อง แต่ลำดับแถวยังไม่ตรง', sub: 'โจทย์ข้อนี้ต้องเรียงลำดับ — ลองใช้ ORDER BY' };
      const i = u.findIndex((x, k) => x !== e[k]);
      return { ok: false, reason: `ข้อมูลแถวที่ ${i + 1} ไม่ตรงกับที่ควรได้` };
    }
    const su = [...u].sort(), se = [...e].sort();
    if (same(su, se)) return { ok: true };
    return { ok: false, reason: 'ข้อมูลในผลลัพธ์ยังไม่ตรงกับที่ควรได้', sub: 'ลองเทียบกับตาราง "ผลลัพธ์ที่ควรได้"' };
  }

  S.engine = {
    init, createDb, exportDb, execute, schema, textColumns, hintTables, tableData, runIsolated, datasetDb,
    lastTable, compare, qi, hintFor, get ready() { return !!SQL; },
  };
})(window.SBAC);
