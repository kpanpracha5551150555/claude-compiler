/* SBAC Compiler — persistence (localStorage) */
(function (S) {
  'use strict';
  const P = 'sbac:';

  function get(key, def) {
    try {
      const v = localStorage.getItem(P + key);
      return v == null ? def : JSON.parse(v);
    } catch (e) { return def; }
  }
  function set(key, val) {
    try { localStorage.setItem(P + key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  function remove(key) { try { localStorage.removeItem(P + key); } catch (e) { /* ignore */ } }

  const DEFAULT_SETTINGS = { fontSize: 15, wrap: false, autocomplete: true, runMode: 'persist' };

  const store = {
    get, set, remove,

    settings() { return Object.assign({}, DEFAULT_SETTINGS, get('settings', {})); },
    setSettings(patch) { const s = Object.assign(store.settings(), patch); set('settings', s); return s; },

    /* Current workspace: { name, dialect, files:[{id,name,content}], activeFileId, projectId } */
    loadWorkspace() { return get('workspace', null); },
    saveWorkspace(ws) { return set('workspace', ws); },

    /* Database snapshot of the current workspace (binary → base64) */
    saveDb(bytes) {
      if (!bytes) { remove('db'); return true; }
      if (bytes.length > 3.5 * 1024 * 1024) return false;
      return set('db', S.util.bytesToB64(bytes));
    },
    loadDb() {
      const b = get('db', null);
      if (!b) return null;
      try { return S.util.b64ToBytes(b); } catch (e) { return null; }
    },

    /* Saved projects */
    projects() { return get('projects', []); },
    saveProject(p) {
      const list = store.projects();
      const i = list.findIndex((x) => x.id === p.id);
      p.savedAt = Date.now();
      if (i >= 0) list[i] = p; else list.unshift(p);
      set('projects', list);
      return p;
    },
    deleteProject(id) { set('projects', store.projects().filter((p) => p.id !== id)); },

    /* Learning progress */
    progress() { return Object.assign({ lessons: {}, exercises: {} }, get('progress', {})); },
    markLesson(id, done) {
      const p = store.progress();
      if (done === false) delete p.lessons[id]; else p.lessons[id] = Date.now();
      set('progress', p);
    },
    exerciseState(id) { return store.progress().exercises[id] || {}; },
    saveExercise(id, patch) {
      const p = store.progress();
      p.exercises[id] = Object.assign({}, p.exercises[id] || {}, patch);
      set('progress', p);
    },
    resetProgress() { remove('progress'); },

    /* Run history */
    history() { return get('history', []); },
    addHistory(entry) {
      const list = store.history();
      list.unshift(entry);
      set('history', list.slice(0, 40));
    },
    clearHistory() { remove('history'); },
  };

  S.store = store;
})(window.SBAC);
