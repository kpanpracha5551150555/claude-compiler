/* SBAC Compiler — dialect layer
 * Runs on SQLite (sql.js) but lets people write SQL Server (T-SQL) or MySQL.
 *  - split(code, dialect): statements with line numbers (handles GO, `;`, and T-SQL
 *    statements that have no semicolons)
 *  - translate(text, dialect, ctx): rewrites one statement into SQLite SQL
 */
(function (S) {
  'use strict';

  const DIALECTS = [
    { id: 'tsql', label: 'Microsoft SQL Server', short: 'SQL Server', cmMode: 'text/x-mssql' },
    { id: 'mysql', label: 'MySQL', short: 'MySQL', cmMode: 'text/x-mysql' },
    { id: 'sqlite', label: 'SQLite', short: 'SQLite', cmMode: 'text/x-sqlite' },
  ];

  class SqlError extends Error {
    constructor(message, hint) { super(message); this.hint = hint; }
  }

  /* =========================================================
     1) Split a script into statements
     ========================================================= */
  const STARTERS = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'PRINT',
    'DECLARE', 'USE', 'EXEC', 'EXECUTE', 'WITH', 'SET', 'BEGIN', 'COMMIT', 'ROLLBACK', 'IF', 'MERGE']);
  const NO_SPLIT_AFTER = new Set(['UNION', 'ALL', 'EXCEPT', 'INTERSECT', 'AS', '(', ',', 'THEN', 'ELSE', '=', 'IN',
    'EXISTS', 'AND', 'OR', 'NOT', 'ON', 'FROM', 'WHERE', 'INTO', 'TABLE', 'VIEW']);

  function shouldSplit(w, st) {
    if (!STARTERS.has(w)) return false;
    const f = st.first, l = st.last;
    if (NO_SPLIT_AFTER.has(l)) return false;
    if (f === 'IF') return !!st.ifBody;
    if (w === 'SELECT') {
      if (f === 'INSERT' && !st.sawValues && !st.sawSelect) return false;
      if (f === 'WITH' && !st.sawSelect) return false;
      return true;
    }
    if (w === 'SET') return f !== 'UPDATE' && f !== 'MERGE';
    if ((w === 'INSERT' || w === 'UPDATE' || w === 'DELETE') && f === 'WITH' && !st.sawSelect) return false;
    return true;
  }

  function split(code, dialect) {
    const tsql = dialect === 'tsql', mysql = dialect === 'mysql';
    const out = [];
    const n = code.length;
    let i = 0, line = 1, depth = 0, lineStart = true, batch = 0;
    let st;
    const GO_RE = /GO[ \t]*(\d+)?[ \t]*(?:--[^\n]*)?(?=\r?\n|$)/iy;
    const begin = (idx) => { st = { start: idx, line: null, first: null, last: null, sawSelect: false, sawValues: false, ifBody: false }; };
    const finish = (endIdx, nextStart) => {
      if (st.line !== null) out.push({ text: code.slice(st.start, endIdx), line: st.line, batch });
      begin(nextStart);
    };
    const mark = () => { if (st.line === null) st.line = line; };
    const adv = (to) => { to = Math.min(to, n); for (; i < to; i++) if (code[i] === '\n') line++; };
    begin(0);

    while (i < n) {
      const c = code[i];
      if (c === '\n') { line++; i++; lineStart = true; continue; }
      if (lineStart && (c === ' ' || c === '\t' || c === '\r')) { i++; continue; }
      if (lineStart) {
        lineStart = false;
        if (depth === 0 && tsql) {
          GO_RE.lastIndex = i;
          const g = GO_RE.exec(code);
          if (g) { finish(i, i + g[0].length); i += g[0].length; batch++; continue; }
          if (st.line !== null) {
            const w = /^[A-Za-z_]+/.exec(code.slice(i, i + 12));
            if (w && shouldSplit(w[0].toUpperCase(), st)) finish(i, i);
          }
        }
      }
      const d = code[i + 1];
      if ((c === '-' && d === '-') || (mysql && c === '#')) { while (i < n && code[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') { const e = code.indexOf('*/', i + 2); adv(e < 0 ? n : e + 2); continue; }
      if (c === "'" || c === '"' || c === '`' || (c === '[' && !mysql)) {
        const close = c === '[' ? ']' : c;
        let j = i + 1;
        while (j < n) {
          if (mysql && code[j] === '\\' && c !== '`') { j += 2; continue; }
          if (code[j] === close) { if (code[j + 1] === close) { j += 2; continue; } break; }
          j++;
        }
        mark(); st.last = c === "'" ? 'STR' : 'ID';
        adv(j + 1); continue;
      }
      if (c === ';' && depth === 0) { finish(i, i + 1); i++; continue; }
      if (/[A-Za-z_@#]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w@#$]/.test(code[j])) j++;
        const w = code.slice(i, j).toUpperCase();
        mark();
        if (!st.first) st.first = w;
        if (depth === 0) {
          if (w === 'SELECT') st.sawSelect = true;
          else if (w === 'VALUES') st.sawValues = true;
          if (st.first === 'IF' && w !== 'IF' && STARTERS.has(w)) st.ifBody = true;
        }
        st.last = w; i = j; continue;
      }
      if (c === '(') depth++;
      else if (c === ')') depth = Math.max(0, depth - 1);
      if (!/\s/.test(c)) { mark(); st.last = c; }
      i++;
    }
    finish(n, n);
    return out;
  }

  /* =========================================================
     2) Masking: hide string literals, quoted identifiers and comments
        so regex rewrites never touch them.
        strings  → \x01N\x01      identifiers → \x02N\x02
     ========================================================= */
  function mask(text, dialect) {
    const mysql = dialect === 'mysql';
    const strs = [], ids = [];
    let out = '', i = 0;
    const n = text.length;
    while (i < n) {
      const c = text[i], d = text[i + 1];
      if ((c === '-' && d === '-') || (mysql && c === '#')) { while (i < n && text[i] !== '\n') i++; out += ' '; continue; }
      if (c === '/' && d === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; out += ' '; continue; }
      if ((c === 'N' || c === 'n') && d === "'" && !/\w/.test(text[i - 1] || '')) { i++; continue; }
      if (c === "'" || (mysql && c === '"')) {
        let j = i + 1, val = '';
        while (j < n) {
          const ch = text[j];
          if (mysql && ch === '\\' && j + 1 < n) {
            const nx = text[j + 1];
            val += ({ n: '\n', t: '\t', r: '\r', 0: '\0', b: '\b', Z: '\x1a' })[nx] || nx; j += 2; continue;
          }
          if (ch === c) { if (text[j + 1] === c) { val += c; j += 2; continue; } break; }
          val += ch; j++;
        }
        if (j >= n) throw new SqlError(`Unclosed quotation mark after the character string '${val.slice(0, 30)}'.`, 'ลืมปิดเครื่องหมาย \' ของข้อความ');
        strs.push(val); out += '\x01' + (strs.length - 1) + '\x01'; i = j + 1; continue;
      }
      if (c === '"' || c === '`' || (c === '[' && !mysql)) {
        const close = c === '[' ? ']' : c;
        let j = i + 1, val = '';
        while (j < n) {
          if (text[j] === close) { if (text[j + 1] === close) { val += close; j += 2; continue; } break; }
          val += text[j]; j++;
        }
        if (j >= n) throw new SqlError(`Unclosed quoted identifier ${c}${val.slice(0, 30)}`);
        ids.push({ name: val, sql: '"' + val.replace(/"/g, '""') + '"' });
        out += '\x02' + (ids.length - 1) + '\x02'; i = j + 1; continue;
      }
      out += c; i++;
    }
    return { code: out, strs, ids };
  }
  const sqlStr = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  function unmask(code, m) {
    return code
      .replace(/\x01(\d+)\x01/g, (_, k) => sqlStr(m.strs[+k]))
      .replace(/\x02(\d+)\x02/g, (_, k) => m.ids[+k].sql);
  }
  function lit(m, s) { m.strs.push(String(s)); return '\x01' + (m.strs.length - 1) + '\x01'; }
  function strVal(m, piece) {
    const x = /^\s*\x01(\d+)\x01\s*$/.exec(piece || '');
    return x ? m.strs[+x[1]] : null;
  }
  function identName(m, piece) {
    const p = (piece || '').trim();
    const x = /^\x02(\d+)\x02$/.exec(p);
    return x ? m.ids[+x[1]].name : p;
  }

  /* ---------- paren helpers on masked code ---------- */
  function findClose(code, open) {
    let depth = 0;
    for (let j = open; j < code.length; j++) {
      if (code[j] === '(') depth++;
      else if (code[j] === ')') { depth--; if (depth === 0) return j; }
    }
    return -1;
  }
  function findOpenBack(code, close) {
    let depth = 0;
    for (let j = close; j >= 0; j--) {
      if (code[j] === ')') depth++;
      else if (code[j] === '(') { depth--; if (depth === 0) return j; }
    }
    return -1;
  }
  function splitTop(s, sep) {
    const parts = []; let depth = 0, last = 0;
    for (let j = 0; j < s.length; j++) {
      const c = s[j];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === sep && depth === 0) { parts.push(s.slice(last, j)); last = j + 1; }
    }
    parts.push(s.slice(last));
    return parts;
  }
  /** Rewrite every call NAME(args) — innermost/last first. fn(name, args[]) → string|null */
  function rewriteCall(code, names, fn) {
    const re = new RegExp('(^|[^\\w.@#\\x02])(' + names + ')\\s*\\(', 'ig');
    const hits = [];
    let m;
    while ((m = re.exec(code))) {
      hits.push({ idx: m.index + m[1].length, name: m[2].toUpperCase(), open: m.index + m[0].length - 1 });
      re.lastIndex = m.index + m[0].length;
    }
    for (let k = hits.length - 1; k >= 0; k--) {
      const hc = hits[k];
      const close = findClose(code, hc.open);
      if (close < 0) continue;
      const inner = code.slice(hc.open + 1, close);
      const args = inner.trim() === '' ? [] : splitTop(inner, ',').map((a) => a.trim());
      const rep = fn(hc.name, args, inner);
      if (rep == null) continue;
      code = code.slice(0, hc.idx) + rep + code.slice(close + 1);
    }
    return code;
  }

  /* =========================================================
     3) Shared rewrites
     ========================================================= */
  const PART = {
    year: 'year', yy: 'year', yyyy: 'year', quarter: 'quarter', qq: 'quarter', q: 'quarter',
    month: 'month', mm: 'month', m: 'month', dayofyear: 'dayofyear', dy: 'dayofyear', y: 'dayofyear',
    day: 'day', dd: 'day', d: 'day', week: 'week', wk: 'week', ww: 'week', weekday: 'weekday', dw: 'weekday',
    hour: 'hour', hh: 'hour', minute: 'minute', mi: 'minute', n: 'minute', second: 'second', ss: 'second', s: 'second',
  };
  function datePart(m, p) {
    const raw = strVal(m, p) || identName(m, p);
    const v = PART[String(raw).toLowerCase()];
    if (!v) throw new SqlError(`'${raw}' is not a recognized datepart option.`, 'ใช้ year, month, day, hour, minute, second');
    return v;
  }
  const yr = (m, x) => `CAST(strftime(${lit(m, '%Y')}, ${x}) AS INTEGER)`;
  const mo = (m, x) => `CAST(strftime(${lit(m, '%m')}, ${x}) AS INTEGER)`;
  const dy = (m, x) => `CAST(strftime(${lit(m, '%d')}, ${x}) AS INTEGER)`;

  function datePartExpr(m, part, x) {
    const f = (fmt) => `CAST(strftime(${lit(m, fmt)}, ${x}) AS INTEGER)`;
    switch (part) {
      case 'year': return f('%Y');
      case 'month': return f('%m');
      case 'day': return f('%d');
      case 'hour': return f('%H');
      case 'minute': return f('%M');
      case 'second': return f('%S');
      case 'dayofyear': return f('%j');
      case 'weekday': return `(${f('%w')} + 1)`;
      case 'quarter': return `((${f('%m')} + 2) / 3)`;
      case 'week': return `(${f('%W')} + 1)`;
    }
    return 'NULL';
  }

  function castExpr(m, expr, type) {
    const t = type.trim().toUpperCase().replace(/\s+/g, ' ');
    if (/^DATE$/.test(t)) return `date(${expr})`;
    if (/^(DATETIME2?|SMALLDATETIME|DATETIMEOFFSET|TIMESTAMP)\b/.test(t)) return `datetime(${expr})`;
    if (/^TIME\b/.test(t)) return `time(${expr})`;
    if (/^(N?VARCHAR|N?CHAR|N?TEXT|CHAR|VARCHAR|TEXT|STRING)\b/.test(t)) return `CAST(${expr} AS TEXT)`;
    if (/^(BIG|SMALL|TINY)?INT(EGER)?\b|^BIT$|^SIGNED|^UNSIGNED/.test(t)) return `CAST(${expr} AS INTEGER)`;
    const dec = /^(DECIMAL|NUMERIC|MONEY|SMALLMONEY)\s*(?:\(\s*\d+\s*(?:,\s*(\d+)\s*)?\))?/.exec(t);
    if (dec) {
      const scale = dec[2] != null ? +dec[2] : (/MONEY/.test(dec[1]) ? 4 : 0);
      return `ROUND(CAST(${expr} AS REAL), ${scale})`;
    }
    if (/^(FLOAT|REAL|DOUBLE)\b/.test(t)) return `CAST(${expr} AS REAL)`;
    return `CAST(${expr} AS ${type})`;
  }

  function commonFunctions(code, m, dialect) {
    const tsql = dialect === 'tsql', mysql = dialect === 'mysql';

    code = code
      .replace(/\b(GETDATE|SYSDATETIME|CURRENT_TIMESTAMP|GETUTCDATE|NOW|SYSDATE|LOCALTIME|LOCALTIMESTAMP)\s*\(\s*\)/ig,
        () => `datetime(${lit(m, 'now')}, ${lit(m, 'localtime')})`)
      .replace(/\b(CURDATE|CURRENT_DATE)\s*\(\s*\)/ig, () => `date(${lit(m, 'now')}, ${lit(m, 'localtime')})`)
      .replace(/\b(CURTIME|CURRENT_TIME)\s*\(\s*\)/ig, () => `time(${lit(m, 'now')}, ${lit(m, 'localtime')})`)
      .replace(/\b(LEN|CHAR_LENGTH|CHARACTER_LENGTH)\s*\(/ig, 'LENGTH(')
      .replace(/\bISNULL\s*\(/ig, 'IFNULL(')
      .replace(/\bSUBSTRING\s*\(/ig, 'SUBSTR(')
      .replace(/\bSTRING_AGG\s*\(/ig, 'GROUP_CONCAT(')
      .replace(/\bTRY_CAST\s*\(/ig, 'CAST(')
      .replace(/\bTRY_CONVERT\s*\(/ig, 'CONVERT(')
      .replace(/\bSCOPE_IDENTITY\s*\(\s*\)|@@IDENTITY|\bLAST_INSERT_ID\s*\(\s*\)/ig, 'last_insert_rowid()')
      .replace(/@@ROWCOUNT|\bROW_COUNT\s*\(\s*\)/ig, 'changes()')
      .replace(/@@VERSION|\bVERSION\s*\(\s*\)/ig, () => `(${lit(m, 'SBAC Compiler · SQLite ')} || sqlite_version() || ${lit(m, ' · ' + (tsql ? 'T-SQL' : mysql ? 'MySQL' : 'SQLite') + ' mode')})`)
      .replace(/\bWITHIN\s+GROUP\s*\(\s*ORDER\s+BY[^)]*\)/ig, '')
      .replace(/\bFORMAT\s*\(/ig, tsql ? 'SBAC_FORMAT(' : 'FORMAT(')
      .replace(/\bCOLLATE\s+(\w+)/ig, (all, name) => /^(NOCASE|BINARY|RTRIM)$/i.test(name) ? all : (/(_|^)ci(_|$)/i.test(name) ? 'COLLATE NOCASE' : 'COLLATE BINARY'));

    if (mysql) {
      code = code
        .replace(/\bLOCATE\s*\(/ig, 'SBAC_LOCATE(')
        .replace(/\bGROUP_CONCAT\s*\(([^()]*?)\s+SEPARATOR\s+(\x01\d+\x01)\s*\)/ig, 'GROUP_CONCAT($1, $2)')
        .replace(/\bRAND\s*\(\s*\)/ig, '(ABS(RANDOM()) / 9223372036854775807.0)')
        .replace(/\bTRUNCATE\s*\(/ig, 'SBAC_TRUNCATE(');
      code = rewriteCall(code, 'DATEDIFF', (n, a) => a.length === 2
        ? `CAST(julianday(date(${a[0]})) - julianday(date(${a[1]})) AS INTEGER)` : null);
      code = rewriteCall(code, 'DATE_FORMAT', (n, a) => {
        const fmt = strVal(m, a[1]);
        if (fmt == null) return null;
        const map = { '%Y': '%Y', '%y': '%Y', '%m': '%m', '%c': '%m', '%d': '%d', '%e': '%d', '%H': '%H', '%h': '%H', '%i': '%M', '%s': '%S', '%S': '%S', '%j': '%j', '%W': '%w', '%%': '%%' };
        const f2 = fmt.replace(/%[a-zA-Z%]/g, (x) => map[x] || x);
        return `strftime(${lit(m, f2)}, ${a[0]})`;
      });
      code = rewriteCall(code, 'IF', (n, a) => a.length === 3 ? `iif(${a.join(', ')})` : null);
    }

    if (tsql) {
      code = code.replace(/\bRAND\s*\(\s*\)/ig, '(ABS(RANDOM()) / 9223372036854775807.0)');
      code = rewriteCall(code, 'DATEPART', (n, a) => datePartExpr(m, datePart(m, a[0]), a[1]));
      code = rewriteCall(code, 'DATENAME', (n, a) => {
        const p = datePart(m, a[0]);
        if (p === 'month') return `SBAC_MONTHNAME(${a[1]})`;
        if (p === 'weekday') return `SBAC_DAYNAME(${a[1]})`;
        return `CAST(${datePartExpr(m, p, a[1])} AS TEXT)`;
      });
      code = rewriteCall(code, 'DATEDIFF', (n, a) => {
        if (a.length !== 3) return null;
        const p = datePart(m, a[0]), x = a[1], y = a[2];
        switch (p) {
          case 'year': return `(${yr(m, y)} - ${yr(m, x)})`;
          case 'quarter': return `((${yr(m, y)} * 4 + (${mo(m, y)} - 1) / 3) - (${yr(m, x)} * 4 + (${mo(m, x)} - 1) / 3))`;
          case 'month': return `((${yr(m, y)} - ${yr(m, x)}) * 12 + ${mo(m, y)} - ${mo(m, x)})`;
          case 'week': return `CAST((julianday(date(${y})) - julianday(date(${x}))) / 7 AS INTEGER)`;
          case 'hour': return `CAST(ROUND((julianday(${y}) - julianday(${x})) * 24) AS INTEGER)`;
          case 'minute': return `CAST(ROUND((julianday(${y}) - julianday(${x})) * 1440) AS INTEGER)`;
          case 'second': return `CAST(ROUND((julianday(${y}) - julianday(${x})) * 86400) AS INTEGER)`;
          default: return `CAST(julianday(date(${y})) - julianday(date(${x})) AS INTEGER)`;
        }
      });
      code = rewriteCall(code, 'DATEADD', (n, a) => {
        if (a.length !== 3) return null;
        const p = datePart(m, a[0]), num = a[1], x = a[2];
        const unit = { year: 'years', quarter: 'months', month: 'months', week: 'days', day: 'days', dayofyear: 'days', weekday: 'days', hour: 'hours', minute: 'minutes', second: 'seconds' }[p];
        const amount = p === 'quarter' ? `((${num}) * 3)` : p === 'week' ? `((${num}) * 7)` : `(${num})`;
        const mod = `${amount} || ${lit(m, ' ' + unit)}`;
        if (/^(hour|minute|second)$/.test(p)) return `datetime(${x}, ${mod})`;
        return `CASE WHEN LENGTH(${x}) > 10 THEN datetime(${x}, ${mod}) ELSE date(${x}, ${mod}) END`;
      });
      code = rewriteCall(code, 'EOMONTH', (n, a) => `date(${a[0]}, ${lit(m, 'start of month')}, ${lit(m, '+1 month')}, ${lit(m, '-1 day')})`);
      code = rewriteCall(code, 'DATEFROMPARTS', (n, a) => `printf(${lit(m, '%04d-%02d-%02d')}, ${a.join(', ')})`);
      code = rewriteCall(code, 'CHARINDEX', (n, a) => {
        if (a.length === 2) return `INSTR(${a[1]}, ${a[0]})`;
        if (a.length === 3) return `(CASE WHEN INSTR(SUBSTR(${a[1]}, ${a[2]}), ${a[0]}) = 0 THEN 0 ELSE INSTR(SUBSTR(${a[1]}, ${a[2]}), ${a[0]}) + (${a[2]}) - 1 END)`;
        return null;
      });
      code = rewriteCall(code, 'SQUARE', (n, a) => `((${a[0]}) * (${a[0]}))`);
      code = rewriteCall(code, 'CHOOSE', (n, a) => `(CASE ${a[0]} ${a.slice(1).map((v, k) => `WHEN ${k + 1} THEN ${v}`).join(' ')} END)`);
      code = rewriteCall(code, 'CONVERT', (n, a) => {
        if (a.length < 2) return null;
        const type = a[0], expr = a[1], style = a[2] && +a[2];
        if (style && /CHAR|TEXT/i.test(type)) {
          const fmts = { 101: '%m/%d/%Y', 103: '%d/%m/%Y', 104: '%d.%m.%Y', 105: '%d-%m-%Y', 111: '%Y/%m/%d', 112: '%Y%m%d', 108: '%H:%M:%S', 23: '%Y-%m-%d', 120: '%Y-%m-%d %H:%M:%S', 121: '%Y-%m-%d %H:%M:%f', 126: '%Y-%m-%dT%H:%M:%f' };
          if (fmts[style]) return `strftime(${lit(m, fmts[style])}, ${expr})`;
        }
        return `CAST(${expr} AS ${type})`;
      });
    }

    // YEAR/MONTH/DAY — T-SQL and MySQL
    if (tsql || mysql) {
      code = rewriteCall(code, 'YEAR', (n, a) => yr(m, a[0]));
      code = rewriteCall(code, 'MONTH', (n, a) => mo(m, a[0]));
      code = rewriteCall(code, 'DAY|DAYOFMONTH', (n, a) => dy(m, a[0]));
      code = rewriteCall(code, 'LEFT', (n, a) => a.length === 2 ? `SUBSTR(${a[0]}, 1, ${a[1]})` : null);
      code = rewriteCall(code, 'RIGHT', (n, a) => a.length === 2 ? `SUBSTR(${a[0]}, -(${a[1]}))` : null);
      code = rewriteCall(code, 'CONCAT', (n, a) => '(' + a.map((x) => `IFNULL(${x}, '')`).join(' || ') + ')');
      code = rewriteCall(code, 'CAST', (n, a, inner) => {
        const mm = /^([\s\S]*)\s+AS\s+([\s\S]+)$/i.exec(inner.trim());
        if (!mm) return null;
        return castExpr(m, mm[1], mm[2]);
      });
    }
    return code;
  }

  /* `+` → `||` when one side is clearly text (T-SQL string concatenation) */
  const STRING_FN = new Set(['UPPER', 'LOWER', 'LTRIM', 'RTRIM', 'TRIM', 'SUBSTRING', 'SUBSTR', 'LEFT', 'RIGHT', 'REPLACE',
    'CONCAT', 'CONCAT_WS', 'FORMAT', 'STR', 'REPLICATE', 'REVERSE', 'SPACE', 'STUFF', 'CHAR', 'NCHAR', 'QUOTENAME',
    'DATENAME', 'STRING_AGG', 'GROUP_CONCAT', 'TRANSLATE']);
  function plusConcat(code, m, textCols) {
    const isText = (name) => textCols && textCols.has(String(name).toLowerCase());
    const leftStringy = (k) => {
      let j = k - 1;
      while (j >= 0 && /\s/.test(code[j])) j--;
      if (j < 0) return false;
      const c = code[j];
      if (c === '\x01') return true;
      if (c === '\x02') { const s = code.lastIndexOf('\x02', j - 1); return isText(m.ids[+code.slice(s + 1, j)].name); }
      if (c === ')') {
        const o = findOpenBack(code, j);
        if (o < 0) return false;
        let e = o - 1; while (e >= 0 && /\s/.test(code[e])) e--;
        let b = e; while (b >= 0 && /\w/.test(code[b])) b--;
        const fn = code.slice(b + 1, e + 1).toUpperCase();
        if (STRING_FN.has(fn)) return true;
        if (fn === 'CAST' || fn === 'CONVERT') return /\b(N?VARCHAR|N?CHAR|N?TEXT|TEXT)\b/i.test(code.slice(o, j));
        return false;
      }
      if (/\w/.test(c)) {
        let b = j; while (b >= 0 && /\w/.test(code[b])) b--;
        return isText(code.slice(b + 1, j + 1));
      }
      return false;
    };
    const rightStringy = (k) => {
      let j = k + 1;
      while (j < code.length && /\s/.test(code[j])) j++;
      const c = code[j];
      if (c === '\x01') return true;
      if (c === '\x02') { const e = code.indexOf('\x02', j + 1); return isText(m.ids[+code.slice(j + 1, e)].name); }
      if (c && /\w/.test(c)) {
        let e = j; while (e < code.length && /[\w.]/.test(code[e])) e++;
        const word = code.slice(j, e);
        let p = e; while (p < code.length && /\s/.test(code[p])) p++;
        if (code[p] === '(') {
          const fn = word.toUpperCase();
          if (STRING_FN.has(fn)) return true;
          if (fn === 'CAST' || fn === 'CONVERT') {
            const cl = findClose(code, p);
            return /\b(N?VARCHAR|N?CHAR|N?TEXT|TEXT)\b/i.test(code.slice(p, cl < 0 ? code.length : cl));
          }
          return false;
        }
        if (code[e] === '\x02') { const e2 = code.indexOf('\x02', e + 1); return isText(m.ids[+code.slice(e + 1, e2)].name); }
        const last = word.split('.').pop();
        return isText(last);
      }
      return false;
    };
    let out = '';
    for (let k = 0; k < code.length; k++) {
      const c = code[k];
      if (c === '+' && code[k + 1] !== '=' && (leftStringy(k) || rightStringy(k))) out += '||';
      else out += c;
    }
    return out;
  }

  /* SELECT TOP n → LIMIT n (scoped to the enclosing parentheses) */
  function rewriteTop(code) {
    const re = /\bSELECT(\s+(?:DISTINCT|ALL))?\s+TOP\s*(?:\(\s*([^()]+?)\s*\)|(\d+))(\s+PERCENT)?(\s+WITH\s+TIES)?/ig;
    const hits = [];
    let mm;
    while ((mm = re.exec(code))) hits.push({ idx: mm.index, len: mm[0].length, distinct: mm[1] || '', n: (mm[2] || mm[3]).trim() });
    for (let k = hits.length - 1; k >= 0; k--) {
      const hit = hits[k];
      let depth = 0, end = code.length;
      for (let j = hit.idx + hit.len; j < code.length; j++) {
        const ch = code[j];
        if (ch === '(') depth++;
        else if (ch === ')') { if (depth === 0) { end = j; break; } depth--; }
      }
      const bodyRaw = code.slice(hit.idx + hit.len, end);
      const body = bodyRaw.replace(/\s+$/, '');
      code = code.slice(0, hit.idx) + 'SELECT' + hit.distinct + body + ` LIMIT ${hit.n}` + bodyRaw.slice(body.length) + code.slice(end);
    }
    return code;
  }

  /* CREATE TABLE: IDENTITY / AUTO_INCREMENT, case-insensitive text, inline FK, MySQL table options */
  function rewriteCreateTable(code, m, dialect) {
    const head = /^(\s*CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[^\s(]+\s*)\(/i.exec(code);
    if (!head) return code;
    const open = head[0].length - 1;
    const close = findClose(code, open);
    if (close < 0) return code;
    const defs = splitTop(code.slice(open + 1, close), ',');
    const CONSTRAINT_RE = /^\s*(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|KEY|INDEX|FULLTEXT|SPATIAL)\b/i;
    const tablePk = [];
    defs.forEach((d) => {
      const pk = /PRIMARY\s+KEY\s*(?:CLUSTERED|NONCLUSTERED)?\s*\(([^)]*)\)/i.exec(d);
      if (CONSTRAINT_RE.test(d) && pk) pk[1].split(',').forEach((c) => tablePk.push(identName(m, c.replace(/\s+(ASC|DESC)\s*$/i, '')).toLowerCase()));
    });
    const out = [];
    defs.forEach((d) => {
      let x = d.replace(/\b(NON)?CLUSTERED\b/ig, '');
      if (CONSTRAINT_RE.test(x)) {
        if (/^\s*(KEY|INDEX|FULLTEXT|SPATIAL)\b/i.test(x)) return; // MySQL inline index → drop
        x = x.replace(/^\s*UNIQUE\s+(?:KEY|INDEX)\s+(?:\x02\d+\x02|\w+)?\s*\(/i, 'UNIQUE (');
        out.push(x);
        return;
      }
      const nameM = /^(\s*)(\x02\d+\x02|[\w#$]+)/.exec(x);
      const colName = nameM ? identName(m, nameM[2]).toLowerCase() : '';
      const identity = /\bIDENTITY\b(\s*\(\s*-?\d+\s*,\s*-?\d+\s*\))?|\bAUTO_INCREMENT\b|\bAUTOINCREMENT\b/i;
      if (identity.test(x) && nameM) {
        const inlinePk = /\bPRIMARY\s+KEY\b/i.test(x);
        if (inlinePk || tablePk.length === 0) { out.push(`${nameM[1]}${nameM[2]} INTEGER PRIMARY KEY AUTOINCREMENT`); return; }
        out.push(`${nameM[1]}${nameM[2]} INTEGER NOT NULL`);
        return;
      }
      x = x.replace(/\bFOREIGN\s+KEY\s+REFERENCES\b/ig, 'REFERENCES')
        .replace(/\bUNSIGNED\b|\bZEROFILL\b/ig, '')
        .replace(/\bENUM\s*\([^)]*\)/ig, 'TEXT')
        .replace(/\bON\s+UPDATE\s+CURRENT_TIMESTAMP\b/ig, '')
        .replace(/\bCOMMENT\s+\x01\d+\x01/ig, '')
        .replace(/\b(CHARACTER\s+SET|CHARSET)\s+\w+/ig, '')
        .replace(/\bDEFAULT\s+([A-Za-z_]\w*\s*\((?:[^()]|\([^()]*\))*\))/ig, 'DEFAULT ($1)');
      if (dialect !== 'sqlite' && !/\bCOLLATE\b/i.test(x)) {
        x = x.replace(/^(\s*(?:\x02\d+\x02|[\w#$]+)\s+(?:N?VARCHAR2?|N?CHAR|NTEXT|TEXT|TINYTEXT|MEDIUMTEXT|LONGTEXT|CHARACTER(?:\s+VARYING)?)\b(?:\s*\(\s*\d+\s*\))?)/i, '$1 COLLATE NOCASE');
      }
      out.push(x);
    });
    let tail = code.slice(close + 1);
    if (/^\s*(ENGINE|DEFAULT|CHARSET|CHARACTER|COLLATE|AUTO_INCREMENT|COMMENT|ROW_FORMAT|ON\s)/i.test(tail)) tail = '';
    return code.slice(0, open + 1) + out.join(',') + ')' + tail;
  }

  /* =========================================================
     4) translate one statement
     ========================================================= */
  const INFO_TABLES = "(SELECT 'sbac' AS TABLE_CATALOG, 'dbo' AS TABLE_SCHEMA, name AS TABLE_NAME, CASE type WHEN 'view' THEN 'VIEW' ELSE 'BASE TABLE' END AS TABLE_TYPE FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%')";
  const INFO_COLUMNS = "(SELECT 'sbac' AS TABLE_CATALOG, 'dbo' AS TABLE_SCHEMA, m.name AS TABLE_NAME, p.name AS COLUMN_NAME, p.cid + 1 AS ORDINAL_POSITION, p.dflt_value AS COLUMN_DEFAULT, CASE p.\"notnull\" WHEN 1 THEN 'NO' ELSE 'YES' END AS IS_NULLABLE, p.type AS DATA_TYPE FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%')";
  const LIST_TABLES = "SELECT name AS TABLE_NAME, CASE type WHEN 'view' THEN 'VIEW' ELSE 'TABLE' END AS TABLE_TYPE FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name";
  const describe = (t) => `SELECT name AS Column_name, type AS Type, CASE "notnull" WHEN 1 THEN 'NO' ELSE 'YES' END AS Nullable, CASE WHEN pk > 0 THEN 'PK' ELSE '' END AS "Key", dflt_value AS "Default" FROM pragma_table_info(${sqlStr(t)})`;

  const UNSUPPORTED = (what) => new SqlError(`คำสั่ง ${what} ยังไม่รองรับในโหมดรันบนเบราว์เซอร์`,
    'โหมดนี้รองรับ SELECT / INSERT / UPDATE / DELETE / CREATE / ALTER / DROP, ตัวแปร DECLARE/SET และ PRINT — ส่วน IF/WHILE/PROCEDURE จะรองรับเมื่อต่อ SQL Server จริง (เฟส 2)');

  function substituteVars(code, m, ctx, dialect) {
    return code.replace(/(^|[^@\w])@(\w+)/g, (all, pre, name) => {
      const key = name.toLowerCase();
      if (!ctx.vars || !ctx.vars.has(key)) {
        if (dialect === 'mysql') return pre + 'NULL';
        throw new SqlError(`Must declare the scalar variable "@${name}".`, 'ต้องประกาศตัวแปรก่อนด้วย DECLARE @' + name + ' INT = ...');
      }
      const v = ctx.vars.get(key);
      if (v === null || v === undefined) return pre + 'NULL';
      if (typeof v === 'number') return pre + String(v);
      return pre + lit(m, v);
    });
  }

  function translate(text, dialect, ctx) {
    ctx = ctx || {};
    if (dialect === 'sqlite') { const sm = mask(text, 'sqlite'); return { kind: 'sql', sqls: [unmask(sm.code, sm)] }; }
    const tsql = dialect === 'tsql';
    const m = mask(text, dialect);
    let code = m.code.trim();
    const fw = ((/^[A-Za-z_]+/.exec(code) || [''])[0]).toUpperCase();
    const U = (re) => re.test(code);

    /* ----- statements handled without SQLite ----- */
    if (fw === 'USE') {
      const db = identName(m, code.slice(3).trim());
      return { kind: 'noop', message: `Changed database context to '${db}'. (จำลอง — ทุกไฟล์ใช้ฐานข้อมูลเดียวกันของ workspace)` };
    }
    if (U(/^(CREATE|DROP|ALTER)\s+(DATABASE|SCHEMA)\b/i)) return { kind: 'noop', message: 'Commands completed successfully. (จำลอง — โหมดเบราว์เซอร์ใช้ฐานข้อมูลเดียว)' };
    if (fw === 'SET') {
      const nc = /^SET\s+NOCOUNT\s+(ON|OFF)\s*$/i.exec(code);
      if (nc) return { kind: 'setopt', nocount: nc[1].toUpperCase() === 'ON' };
      const sv = /^SET\s+@(\w+)\s*(?::=|=)\s*([\s\S]+)$/i.exec(code);
      if (sv) return { kind: 'set', name: sv[1], expr: unmask(sv[2], m) };
      return { kind: 'noop', message: '' };
    }
    if (fw === 'DECLARE') {
      const body = code.slice(7);
      const vars = splitTop(body, ',').map((piece) => {
        const dm = /^\s*@(\w+)\s+(?:AS\s+)?([A-Za-z_]\w*(?:\s*\([^)]*\))?)\s*(?:=\s*([\s\S]+))?$/i.exec(piece);
        if (!dm) throw new SqlError(`Incorrect syntax near DECLARE.`, 'รูปแบบ: DECLARE @ชื่อ ชนิด = ค่า');
        if (/^TABLE$/i.test(dm[2])) throw UNSUPPORTED('DECLARE @t TABLE');
        return { name: dm[1], type: dm[2], expr: dm[3] != null ? unmask(dm[3], m) : null };
      });
      return { kind: 'declare', vars };
    }
    if (fw === 'PRINT') return { kind: 'print', expr: unmask(code.slice(5), m) };
    const sa = /^SELECT\s+@(\w+)\s*(?::=|=)\s*([\s\S]+)$/i.exec(code);
    if (sa && !/,\s*@\w+\s*=/.test(sa[2])) return { kind: 'selectAssign', name: sa[1], sql: 'SELECT ' + unmask(sa[2], m) };

    // T-SQL: IF OBJECT_ID('x') IS NOT NULL DROP TABLE x  → DROP TABLE IF EXISTS x
    if (fw === 'IF') {
      const ifd = /^IF\s+(?:OBJECT_ID\s*\([^)]*\)\s+IS\s+NOT\s+NULL|EXISTS\s*\([\s\S]*\))\s+DROP\s+(TABLE|VIEW)\s+([^\s;]+)\s*$/i.exec(code);
      if (ifd) code = `DROP ${ifd[1]} IF EXISTS ${ifd[2]}`;
      else throw UNSUPPORTED('IF … ELSE');
    }
    if (/^(BEGIN\s+TRAN(SACTION)?)\b/i.test(code)) return { kind: 'sql', sqls: ['BEGIN TRANSACTION'] };
    if (/^START\s+TRANSACTION\b/i.test(code)) return { kind: 'sql', sqls: ['BEGIN TRANSACTION'] };
    if (/^COMMIT\b/i.test(code)) return { kind: 'sql', sqls: ['COMMIT'] };
    if (/^ROLLBACK\b/i.test(code)) return { kind: 'sql', sqls: ['ROLLBACK'] };
    if (U(/^(BEGIN|END|WHILE|GOTO|RETURN|TRY|CATCH|THROW|RAISERROR|MERGE|BREAK|CONTINUE)\b/i)) throw UNSUPPORTED(fw);
    if (U(/^(CREATE|ALTER)\s+(OR\s+ALTER\s+)?(PROC|PROCEDURE|FUNCTION|TRIGGER)\b/i)) throw UNSUPPORTED('CREATE PROCEDURE/FUNCTION/TRIGGER');

    if (fw === 'EXEC' || fw === 'EXECUTE') {
      const ex = /^EXEC(?:UTE)?\s+(?:dbo\.)?(\w+)\s*([\s\S]*)$/i.exec(code);
      const proc = ex ? ex[1].toLowerCase() : '';
      const args = ex ? splitTop(ex[2], ',').map((a) => strVal(m, a) || identName(m, a)).filter(Boolean) : [];
      if (proc === 'sp_tables') return { kind: 'sql', sqls: [LIST_TABLES] };
      if (proc === 'sp_help' || proc === 'sp_columns') return { kind: 'sql', sqls: [args[0] ? describe(args[0]) : LIST_TABLES] };
      if (proc === 'sp_rename' && args.length >= 2) {
        const parts = args[0].split('.');
        if (parts.length === 2) return { kind: 'sql', sqls: [`ALTER TABLE "${parts[0]}" RENAME COLUMN "${parts[1]}" TO "${args[1]}"`] };
        return { kind: 'sql', sqls: [`ALTER TABLE "${args[0]}" RENAME TO "${args[1]}"`] };
      }
      throw UNSUPPORTED('EXEC ' + (ex ? ex[1] : ''));
    }

    // MySQL helpers
    if (!tsql) {
      if (U(/^SHOW\s+(FULL\s+)?TABLES\b/i)) return { kind: 'sql', sqls: ["SELECT name AS Tables_in_sbac FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"] };
      if (U(/^SHOW\s+DATABASES\b/i)) return { kind: 'sql', sqls: ["SELECT 'sbac' AS `Database`"] };
      const sc = /^(?:DESCRIBE|DESC|SHOW\s+(?:FULL\s+)?COLUMNS\s+FROM)\s+(\S+)\s*$/i.exec(code);
      if (sc) return { kind: 'sql', sqls: [describe(identName(m, sc[1]))] };
      if (U(/^SHOW\s+CREATE\s+TABLE\s+(\S+)/i)) {
        const t = identName(m, /^SHOW\s+CREATE\s+TABLE\s+(\S+)/i.exec(code)[1]);
        return { kind: 'sql', sqls: [`SELECT name AS "Table", sql AS "Create Table" FROM sqlite_master WHERE name = ${sqlStr(t)}`] };
      }
      if (U(/^ALTER\s+TABLE\s+\S+\s+(MODIFY|CHANGE)\b/i)) throw UNSUPPORTED('ALTER TABLE … MODIFY');
    }
    if (U(/^ALTER\s+TABLE\s+\S+\s+ALTER\s+COLUMN\b/i)) throw UNSUPPORTED('ALTER COLUMN');

    /* ----- general rewrites on masked code ----- */
    code = code
      .replace(/(^|[^\w])#(#?\w+)/g, (all, pre, name) => { m.ids.push({ name: '#' + name, sql: `"#${name}"` }); return pre + '\x02' + (m.ids.length - 1) + '\x02'; })
      .replace(/\bdbo\s*\.\s*/ig, '')
      .replace(/\bINFORMATION_SCHEMA\s*\.\s*TABLES\b/ig, INFO_TABLES)
      .replace(/\bINFORMATION_SCHEMA\s*\.\s*COLUMNS\b/ig, INFO_COLUMNS)
      .replace(/\b(N?VARCHAR|VARBINARY)\s*\(\s*MAX\s*\)/ig, '$1')
      .replace(/^TRUNCATE\s+TABLE\s+/i, 'DELETE FROM ')
      .replace(/^INSERT\s+IGNORE\s+INTO\b/i, 'INSERT OR IGNORE INTO')
      .replace(/^INSERT\s+(?!INTO\b|OR\b)/i, 'INSERT INTO ')
      .replace(/^DELETE\s+(?!FROM\b|TOP\b)/i, 'DELETE FROM ');
    // remove `[dbo].` placeholders
    code = code.replace(/\x02(\d+)\x02\s*\.\s*(?=\x02|\w)/g, (all, k) => (m.ids[+k].name.toLowerCase() === 'dbo' ? '' : all));

    // variables
    code = substituteVars(code.replace(/@@(\w+)/g, '\x03$1'), m, ctx, dialect).replace(/\x03(\w+)/g, '@@$1');

    if (tsql) code = plusConcat(code, m, ctx.textCols);
    code = commonFunctions(code, m, dialect);

    if (tsql) {
      code = rewriteTop(code);
      code = code
        .replace(/\bOFFSET\s+(\S+)\s+ROWS?\s+FETCH\s+(?:NEXT|FIRST)\s+(\S+)\s+ROWS?\s+ONLY\b/ig, 'LIMIT $2 OFFSET $1')
        .replace(/\bOFFSET\s+(\S+)\s+ROWS?\b/ig, 'LIMIT -1 OFFSET $1')
        .replace(/\bWITH\s*\(\s*NOLOCK\s*\)/ig, '');
      const into = /^(SELECT\b[\s\S]*?)\bINTO\s+(\x02\d+\x02|[\w.]+)\s+(FROM\b[\s\S]*)$/i.exec(code);
      if (into && !/\bINSERT\b/i.test(into[1])) code = `CREATE TABLE ${into[2]} AS ${into[1]} ${into[3]}`;
    }

    // T-SQL #temp tables live only for this run
    code = code.replace(/^CREATE\s+TABLE\s+(?=\x02(\d+)\x02)/i, (all, k) => (m.ids[+k].name.startsWith('#') ? 'CREATE TEMP TABLE ' : all));
    if (/^CREATE\s+(TEMP(ORARY)?\s+)?TABLE\b/i.test(code) && !/^CREATE[\s\S]*?\bAS\s+SELECT\b/i.test(code)) {
      code = rewriteCreateTable(code, m, dialect);
    }

    // T-SQL allows several columns in one ALTER TABLE … ADD
    const alt = /^(ALTER\s+TABLE\s+\S+\s+)ADD\s+(?!CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)([\s\S]+)$/i.exec(code);
    if (alt) {
      const cols = splitTop(alt[2], ',').map((c) => c.trim()).filter(Boolean);
      return { kind: 'sql', sqls: cols.map((c) => unmask(`${alt[1]}ADD COLUMN ${c.replace(/^COLUMN\s+/i, '')}`, m)) };
    }
    if (/^ALTER\s+TABLE\s+\S+\s+ADD\s+(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)/i.test(code)) throw UNSUPPORTED('ALTER TABLE … ADD CONSTRAINT');

    return { kind: 'sql', sqls: [unmask(code, m)] };
  }

  S.dialects = { list: DIALECTS, get: (id) => DIALECTS.find((d) => d.id === id) || DIALECTS[0], split, translate, SqlError, mask };
})(window.SBAC);
