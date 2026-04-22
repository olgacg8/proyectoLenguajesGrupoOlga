// ============================================================
// db.js — Capa d'abstracció de base de dades
// Usa Firebase Realtime Database si FIREBASE_URL és configurat,
// o localStorage com a fallback offline.
// ============================================================

const DB = (() => {
  const BASE = () => window.FIREBASE_URL || '';
  const isOnline = () => (window.FIREBASE_URL || '').length > 5;

  const LOCAL_MATCHES = 'porraMatches';
  const LOCAL_PLAYED  = 'porraPlayedTeams';

  // Sanitize team names for Firebase keys (no dots, spaces, etc.)
  function toKey(name) {
    return name.replace(/[.#$/\[\]\s]/g, '_');
  }

  // ── Firebase REST helpers ─────────────────────────────────
  async function fbGet(path) {
    const r = await fetch(`${BASE()}/${path}.json`);
    if (!r.ok) throw new Error(`Firebase GET ${path} → ${r.status}`);
    return r.json();
  }
  async function fbSet(path, data) {
    await fetch(`${BASE()}/${path}.json`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
  async function fbPush(path, data) {
    const r = await fetch(`${BASE()}/${path}.json`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return r.json(); // { name: '-Firebase_key' }
  }
  async function fbPatch(path, data) {
    await fetch(`${BASE()}/${path}.json`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
  async function fbDelete(path) {
    await fetch(`${BASE()}/${path}.json`, { method: 'DELETE' });
  }

  // ── LocalStorage helpers ──────────────────────────────────
  function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  return {
    online: isOnline,

    // ── MATCHES ──────────────────────────────────────────────
    async getMatches() {
      if (isOnline()) {
        const data = await fbGet('matches');
        if (!data) return [];
        return Object.entries(data)
          .map(([key, val]) => ({ ...val, _key: key }))
          .sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);
      }
      return lsGet(LOCAL_MATCHES) || [];
    },

    async addMatch(match) {
      if (isOnline()) {
        const res = await fbPush('matches', match);
        // Cache locally too
        const ms = lsGet(LOCAL_MATCHES) || [];
        ms.push({ ...match, _key: res.name });
        lsSet(LOCAL_MATCHES, ms);
      } else {
        const ms = lsGet(LOCAL_MATCHES) || [];
        ms.push(match);
        lsSet(LOCAL_MATCHES, ms);
      }
    },

    async updateMatch(key, data) {
      if (isOnline()) {
        await fbSet('matches/' + key, data);
      }
      const ms = lsGet(LOCAL_MATCHES) || [];
      const idx = ms.findIndex(m => m._key === key || m.id === key);
      if (idx !== -1) { ms[idx] = { ...ms[idx], ...data }; lsSet(LOCAL_MATCHES, ms); }
    },

    async deleteMatch(key) {
      if (isOnline()) await fbDelete('matches/' + key);
      const ms = (lsGet(LOCAL_MATCHES) || []).filter(m => m._key !== key && m.id !== key);
      lsSet(LOCAL_MATCHES, ms);
      // Recalculate played teams from remaining matches
      const names = new Set();
      ms.forEach(m => { names.add(m.team1.name); names.add(m.team2.name); });
      lsSet(LOCAL_PLAYED, Array.from(names));
      if (isOnline()) {
        const obj = {};
        names.forEach(n => { obj[toKey(n)] = n; });
        await fbSet('playedTeams', names.size ? obj : null);
      }
    },

    // ── PLAYED TEAMS ─────────────────────────────────────────
    async getPlayedTeams() {
      if (isOnline()) {
        const data = await fbGet('playedTeams');
        if (!data) return [];
        return Object.values(data).filter(Boolean);
      }
      return lsGet(LOCAL_PLAYED) || [];
    },

    async markTeamsPlayed(teamNames) {
      // Update local cache immediately
      const current = lsGet(LOCAL_PLAYED) || [];
      teamNames.forEach(n => { if (!current.includes(n)) current.push(n); });
      lsSet(LOCAL_PLAYED, current);
      // Push to Firebase
      if (isOnline()) {
        const patch = {};
        teamNames.forEach(n => { patch[toKey(n)] = n; });
        await fbPatch('playedTeams', patch);
      }
    },

    async resetTeam(teamName) {
      const current = (lsGet(LOCAL_PLAYED) || []).filter(n => n !== teamName);
      lsSet(LOCAL_PLAYED, current);
      if (isOnline()) await fbDelete('playedTeams/' + toKey(teamName));
    },

    async resetAllTeams() {
      lsSet(LOCAL_PLAYED, []);
      if (isOnline()) await fbSet('playedTeams', null);
    },

    async clearAllMatches() {
      lsSet(LOCAL_MATCHES, []);
      if (isOnline()) await fbSet('matches', null);
    },

    async resetAll() {
      lsSet(LOCAL_MATCHES, []); lsSet(LOCAL_PLAYED, []);
      if (isOnline()) await Promise.all([fbSet('matches', null), fbSet('playedTeams', null)]);
    },

    // Sync Firebase → localStorage (called on game load)
    async syncToLocal() {
      if (!isOnline()) return;
      try {
        const [matches, played] = await Promise.all([this.getMatches(), this.getPlayedTeams()]);
        lsSet(LOCAL_MATCHES, matches);
        lsSet(LOCAL_PLAYED, played);
        return { matches, played };
      } catch (e) {
        console.warn('[DB] Sync failed:', e.message);
        return null;
      }
    },
  };
})();

console.log('[DB] Mode:', window.ONLINE_MODE ? '🌐 Firebase Online' : '💾 localStorage Offline');
