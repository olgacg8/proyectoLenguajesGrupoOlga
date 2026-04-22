// ============================================================
// CHAPAS DEL MUNDIAL 2026 — Physics-Based Football Game v2
// Hot-seat multiplayer | Tournament tracking | Admin support
// ============================================================

'use strict';

// ─── STORAGE KEYS ─────────────────────────────────────────────
const SK_MATCHES = 'porraMatches';
const SK_PLAYED  = 'porraPlayedTeams';

// ─── TEAMS DATA ──────────────────────────────────────────────
const TEAMS = [
  { name: 'Brasil',        abbr: 'BRA', flag: '🇧🇷', color: '#009C3B', accent: '#FFD700', textColor: '#FFD700' },
  { name: 'Argentina',     abbr: 'ARG', flag: '🇦🇷', color: '#74ACDF', accent: '#FFFFFF', textColor: '#003087' },
  { name: 'Espanya',       abbr: 'ESP', flag: '🇪🇸', color: '#AA151B', accent: '#F1BF00', textColor: '#F1BF00' },
  { name: 'França',        abbr: 'FRA', flag: '🇫🇷', color: '#003189', accent: '#FFFFFF', textColor: '#FFFFFF' },
  { name: 'Alemanya',      abbr: 'GER', flag: '🇩🇪', color: '#1C1C1C', accent: '#DD0000', textColor: '#FFD700' },
  { name: 'Anglaterra',    abbr: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#CF0A2C', accent: '#FFFFFF', textColor: '#FFFFFF' },
  { name: 'Portugal',      abbr: 'POR', flag: '🇵🇹', color: '#006600', accent: '#FF0000', textColor: '#FFD700' },
  { name: 'P. Baixos',     abbr: 'NED', flag: '🇳🇱', color: '#FF6300', accent: '#FFFFFF', textColor: '#FFFFFF' },
  { name: 'Itàlia',        abbr: 'ITA', flag: '🇮🇹', color: '#003580', accent: '#FFFFFF', textColor: '#FFFFFF' },
  { name: 'Japó',          abbr: 'JPN', flag: '🇯🇵', color: '#BC002D', accent: '#FFFFFF', textColor: '#FFFFFF' },
  { name: 'USA',           abbr: 'USA', flag: '🇺🇸', color: '#003366', accent: '#BF0A30', textColor: '#FFFFFF' },
  { name: 'Mèxic',         abbr: 'MEX', flag: '🇲🇽', color: '#006847', accent: '#CE1126', textColor: '#FFFFFF' },
  { name: 'Marroc',        abbr: 'MAR', flag: '🇲🇦', color: '#C1272D', accent: '#006233', textColor: '#FFFFFF' },
  { name: 'Senegal',       abbr: 'SEN', flag: '🇸🇳', color: '#00853F', accent: '#FDEF42', textColor: '#FDEF42' },
  { name: 'Colòmbia',      abbr: 'COL', flag: '🇨🇴', color: '#FCD116', accent: '#003087', textColor: '#003087' },
  { name: 'Uruguai',       abbr: 'URU', flag: '🇺🇾', color: '#5EB6E4', accent: '#FFFFFF', textColor: '#003580' },
  { name: 'Croàcia',       abbr: 'CRO', flag: '🇭🇷', color: '#CC0000', accent: '#FFFFFF', textColor: '#FFFFFF' },
  { name: 'Bèlgica',       abbr: 'BEL', flag: '🇧🇪', color: '#1C1C1C', accent: '#ED2939', textColor: '#FAE042' },
  { name: 'Equador',       abbr: 'ECU', flag: '🇪🇨', color: '#FFD100', accent: '#003893', textColor: '#003893' },
  { name: 'Ghana',         abbr: 'GHA', flag: '🇬🇭', color: '#006B3F', accent: '#FCD116', textColor: '#FCD116' },
];

// ─── PHYSICS CONSTANTS ───────────────────────────────────────
const FRICTION         = 0.980;   // token friction per frame
const BALL_FRICTION    = 0.984;   // ball is slightly slippier
const RESTITUTION      = 0.72;    // bounce energy retention
const STOP_VEL         = 0.05;    // velocity threshold to stop
const MAX_DRAG_PX      = 110;     // max drag distance in px (canvas space)
const MAX_SPEED        = 22;      // max launch speed
const TOKEN_R          = 17;      // token radius px (canvas) — smaller for better fit
const BALL_R           = 10;      // ball radius px (canvas)

// ─── GAME STATE ───────────────────────────────────────────────
let canvas, ctx;
let animId;
let CANVAS_W = 900, CANVAS_H = 540;

let state       = 'LOBBY';        // LOBBY | PLAYING | GOAL_ANIM | GAMEOVER
let turnPhase   = 'SELECT';       // SELECT | DRAGGING | MOVING
let currentPlayer = 0;
let score       = [0, 0];
let WIN_SCORE   = 5;
let TOKENS_EACH = 4;

let selectedTeams = [null, null];
let tokens  = [];
let ball    = {};
let initPos = [];

// Drag / slingshot
let drag = { active: false, tok: null, ox: 0, oy: 0, cx: 0, cy: 0 };
let movedTok = null;    // which token was shot this turn

// Goal celebration
let goalState    = { scoring: -1, timer: 0, particles: [] };
let goalJustDone = false;

// Pitch geometry (recalculated on resize)
let P = {};

// ─── FORMATIONS (fractions of pitch) ─────────────────────────
function getFormation(teamIdx, numTokens) {
  const LEFT = [
    // GK
    { fx: 0.10, fy: 0.50 },
    // Defenders
    { fx: 0.28, fy: 0.30 },
    { fx: 0.28, fy: 0.70 },
    // Mids
    { fx: 0.42, fy: 0.50 },
    // Forward
    { fx: 0.48, fy: 0.30 },
    { fx: 0.48, fy: 0.70 },
  ];
  const RIGHT = [
    { fx: 0.90, fy: 0.50 },
    { fx: 0.72, fy: 0.30 },
    { fx: 0.72, fy: 0.70 },
    { fx: 0.58, fy: 0.50 },
    { fx: 0.52, fy: 0.30 },
    { fx: 0.52, fy: 0.70 },
  ];
  return (teamIdx === 0 ? LEFT : RIGHT).slice(0, numTokens);
}

// ─── INIT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');

  // Sync played teams from Firebase (or localStorage) before building lobby
  if (window.DB) {
    showLobbyStatus('🌐 Connectant...');
    await refreshPlayedTeamsFromDB();
  }

  buildLobby();
  bindLobbyEvents();
  bindGameEvents();
  startLoop();

  // Auto-refresh played teams every 20s when in lobby (real-time multi-game support)
  setInterval(async () => {
    if (state === 'LOBBY' && window.DB) {
      await refreshPlayedTeamsFromDB();
      buildLobby();
    }
  }, 20000);
});

async function refreshPlayedTeamsFromDB() {
  if (!window.DB) return;
  try {
    const played = await DB.getPlayedTeams();
    localStorage.setItem(SK_PLAYED, JSON.stringify(played));
    const modeEl = document.getElementById('dbModeInfo');
    if (modeEl) modeEl.textContent = window.ONLINE_MODE ? '🌐 Mode Online' : '💾 Mode Local';
    showLobbyStatus('');
  } catch (e) {
    console.warn('[Game] DB sync failed:', e.message);
    showLobbyStatus('⚠️ Mode local (sense connexió)');
  }
}

function showLobbyStatus(msg) {
  const el = document.getElementById('teamsRemainingInfo');
  if (el && msg) el.textContent = msg;
}

// ─── CANVAS SIZING ────────────────────────────────────────────
function resizeCanvas() {
  const wrapper    = document.getElementById('canvasWrapper');
  if (!wrapper) return;
  const { clientWidth: W, clientHeight: H } = wrapper;
  // Maintain 5:3 aspect at most
  const aspect = 5 / 3;
  let cw = W, ch = W / aspect;
  if (ch > H) { ch = H; cw = H * aspect; }
  canvas.width  = CANVAS_W = Math.round(cw);
  canvas.height = CANVAS_H = Math.round(ch);
  canvas.style.width  = cw + 'px';
  canvas.style.height = ch + 'px';
  computePitch();
}
window.addEventListener('resize', () => { if (state === 'PLAYING' || state === 'GOAL_ANIM') resizeCanvas(); });

function computePitch() {
  const mg = Math.round(CANVAS_W * 0.022); // ultra-tight side margins
  P.x     = mg;
  P.y     = Math.round(CANVAS_H * 0.018); // ultra-tight top margin
  P.w     = CANVAS_W - mg * 2;
  P.h     = CANVAS_H - Math.round(CANVAS_H * 0.036); // 96% height used
  P.cx    = P.x + P.w / 2;
  P.cy    = P.y + P.h / 2;
  P.goalH = P.h * 0.28;
  P.goalD = Math.round(CANVAS_W * 0.032); // goal depth
}

// ─── LOBBY BUILDER ────────────────────────────────────────────
function buildLobby() {
  const playedTeams = getPlayedTeams();
  ['grid1', 'grid2'].forEach((id, panelIdx) => {
    const grid = document.getElementById(id);
    grid.innerHTML = '';
    TEAMS.forEach((t, ti) => {
      const card = document.createElement('div');
      card.className = 'team-card';
      card.dataset.ti = ti;
      card.dataset.panel = panelIdx;
      card.setAttribute('role', 'option');
      card.setAttribute('aria-label', t.name);
      const hasPlayed = playedTeams.includes(t.name);
      if (hasPlayed) card.classList.add('already-played');
      card.innerHTML = `<span class="tc-flag">${t.flag}</span><span class="tc-abbr">${t.abbr}</span>${hasPlayed ? '<span class="tc-played-badge">✓</span>' : ''}`;
      if (!hasPlayed) card.addEventListener('click', () => selectTeam(panelIdx, ti));
      grid.appendChild(card);
    });
  });
  // Show count
  const remaining = TEAMS.filter(t => !playedTeams.includes(t.name)).length;
  const infoEl = document.getElementById('teamsRemainingInfo');
  if (infoEl) infoEl.textContent = playedTeams.length > 0 ? `${remaining} equips disponibles — ${playedTeams.length} ja han jugat` : '';
}

function selectTeam(panelIdx, teamIdx) {
  // Prevent picking already-played team
  const playedTeams = getPlayedTeams();
  if (playedTeams.includes(TEAMS[teamIdx].name)) return;
  // Prevent picking same team as other player
  const otherIdx = panelIdx === 0 ? 1 : 0;
  if (selectedTeams[otherIdx] === teamIdx) return;

  selectedTeams[panelIdx] = teamIdx;
  const t = TEAMS[teamIdx];

  // Update selection display
  const selEl = document.getElementById(`sel${panelIdx + 1}`);
  selEl.innerHTML = `<span class="sel-flag">${t.flag}</span><span class="sel-name">${t.name}</span>`;

  // Refresh both grids
  ['grid1', 'grid2'].forEach((id, pi) => {
    const otherSelected = selectedTeams[pi === 0 ? 1 : 0];
    document.getElementById(id).querySelectorAll('.team-card').forEach(card => {
      const ci = parseInt(card.dataset.ti);
      card.classList.toggle('selected', selectedTeams[pi] === ci);
      // Mark as session-disabled if other player has it (but NOT already-played ones)
      if (!card.classList.contains('already-played')) {
        card.classList.toggle('disabled', ci === otherSelected);
      }
    });
  });

  // Enable start button
  const startBtn = document.getElementById('startBtn');
  const ready = selectedTeams[0] !== null && selectedTeams[1] !== null;
  startBtn.disabled = !ready;
  startBtn.setAttribute('aria-disabled', !ready);
}

// ─── LOBBY EVENTS ─────────────────────────────────────────────
function bindLobbyEvents() {
  let goalVal = 5, tokVal = 4;

  document.getElementById('goalUp').onclick   = () => { goalVal = Math.min(goalVal + 1, 10); document.getElementById('goalCount').textContent = goalVal; WIN_SCORE = goalVal; };
  document.getElementById('goalDown').onclick  = () => { goalVal = Math.max(goalVal - 1, 1);  document.getElementById('goalCount').textContent = goalVal; WIN_SCORE = goalVal; };
  document.getElementById('tokUp').onclick    = () => { tokVal  = Math.min(tokVal  + 1, 6);  document.getElementById('tokCount').textContent  = tokVal;  TOKENS_EACH = tokVal; };
  document.getElementById('tokDown').onclick  = () => { tokVal  = Math.max(tokVal  - 1, 2);  document.getElementById('tokCount').textContent  = tokVal;  TOKENS_EACH = tokVal; };

  document.getElementById('startBtn').onclick = startMatch;
}

// ─── GAME EVENTS ──────────────────────────────────────────────
function bindGameEvents() {
  // Mouse
  canvas.addEventListener('mousedown',  e => onPointerDown(getCanvasXY(e, canvas)));
  canvas.addEventListener('mousemove',  e => onPointerMove(getCanvasXY(e, canvas)));
  canvas.addEventListener('mouseup',    e => onPointerUp(getCanvasXY(e, canvas)));
  canvas.addEventListener('mouseleave', ()  => { if (drag.active) cancelDrag(); });

  // Touch
  canvas.addEventListener('touchstart',  e => { e.preventDefault(); onPointerDown(getTouchXY(e, canvas)); }, { passive: false });
  canvas.addEventListener('touchmove',   e => { e.preventDefault(); onPointerMove(getTouchXY(e, canvas)); }, { passive: false });
  canvas.addEventListener('touchend',    e => { e.preventDefault(); onPointerUp(getTouchXY(e, canvas)); },   { passive: false });

  // Buttons
  document.getElementById('handoffContinue').onclick = resumeAfterHandoff;
  document.getElementById('menuBtn').onclick          = goToMenu;
  document.getElementById('skipBtn').onclick          = skipTurn;
  document.getElementById('replayBtn').onclick        = replayMatch;
  document.getElementById('backLobbyBtn').onclick     = goToMenu;
}

// ─── MATCH START ──────────────────────────────────────────────
function startMatch() {
  WIN_SCORE   = parseInt(document.getElementById('goalCount').textContent);
  TOKENS_EACH = parseInt(document.getElementById('tokCount').textContent);

  showScreen('gameScreen');
  resizeCanvas();

  score         = [0, 0];
  currentPlayer = 0;
  state         = 'PLAYING';
  turnPhase     = 'SELECT';
  goalJustDone  = false;

  buildTokens();
  updateHUD();
  document.getElementById('winGoalText').textContent = `Primer a ${WIN_SCORE} gols guanya`;
  showHandoff(false); // Show who starts without "pass device" instruction
}

function buildTokens() {
  tokens = [];
  for (let t = 0; t < 2; t++) {
    const team  = TEAMS[selectedTeams[t]];
    const form  = getFormation(t, TOKENS_EACH);
    for (let i = 0; i < TOKENS_EACH; i++) {
      const f = form[i];
      tokens.push({
        x: P.x + P.w * f.fx, y: P.y + P.h * f.fy,
        vx: 0, vy: 0,
        r: TOKEN_R,
        team: t, id: i,
        color: team.color, accent: team.accent,
        flag: team.flag, abbr: team.abbr,
        name: team.name,
        alive: true,
      });
    }
  }
  ball = { x: P.cx, y: P.cy, vx: 0, vy: 0, r: BALL_R, isBall: true };
  saveInitPositions();
}

function saveInitPositions() {
  initPos = [
    ...tokens.map(t => ({ x: t.x, y: t.y })),
    { x: ball.x, y: ball.y }
  ];
}

// ─── INPUT HELPERS ────────────────────────────────────────────
function getCanvasXY(e, cvs) {
  const r = cvs.getBoundingClientRect();
  const scX = cvs.width  / r.width;
  const scY = cvs.height / r.height;
  return { x: (e.clientX - r.left) * scX, y: (e.clientY - r.top) * scY };
}
function getTouchXY(e, cvs) {
  const t = e.changedTouches[0];
  return getCanvasXY({ clientX: t.clientX, clientY: t.clientY }, cvs);
}

// ─── POINTER HANDLERS ─────────────────────────────────────────
function onPointerDown(pos) {
  if (state !== 'PLAYING' || turnPhase !== 'SELECT') return;

  const myTokens = tokens.filter(t => t.team === currentPlayer && t.alive);
  for (const tok of myTokens) {
    const dx = pos.x - tok.x, dy = pos.y - tok.y;
    if (Math.hypot(dx, dy) <= tok.r + 8) {
      drag = { active: true, tok, ox: tok.x, oy: tok.y, cx: pos.x, cy: pos.y };
      turnPhase = 'DRAGGING';
      return;
    }
  }
}

function onPointerMove(pos) {
  if (!drag.active) return;
  drag.cx = pos.x;
  drag.cy = pos.y;
}

function onPointerUp(pos) {
  if (!drag.active) return;
  drag.cx = pos.x;
  drag.cy = pos.y;

  const tok = drag.tok;
  const dx = tok.x - drag.cx;
  const dy = tok.y - drag.cy;
  const dist = Math.hypot(dx, dy);

  if (dist > 6) {
    const clamped = Math.min(dist, MAX_DRAG_PX);
    const speed   = (clamped / MAX_DRAG_PX) * MAX_SPEED;
    tok.vx = (dx / dist) * speed;
    tok.vy = (dy / dist) * speed;
    movedTok  = tok;
    turnPhase = 'MOVING';
  } else {
    turnPhase = 'SELECT';
  }

  drag = { active: false, tok: null, ox: 0, oy: 0, cx: 0, cy: 0 };
}

function cancelDrag() {
  drag = { active: false, tok: null, ox: 0, oy: 0, cx: 0, cy: 0 };
  if (turnPhase === 'DRAGGING') turnPhase = 'SELECT';
}

// ─── PHYSICS UPDATE ───────────────────────────────────────────
function physicsUpdate() {
  const all = [...tokens.filter(t => t.alive), ball];
  let anyMoving = false;

  for (const obj of all) {
    obj.x += obj.vx;
    obj.y += obj.vy;

    const fr = obj.isBall ? BALL_FRICTION : FRICTION;
    obj.vx *= fr;
    obj.vy *= fr;

    if (Math.abs(obj.vx) < STOP_VEL) obj.vx = 0;
    if (Math.abs(obj.vy) < STOP_VEL) obj.vy = 0;

    if (obj.vx !== 0 || obj.vy !== 0) anyMoving = true;

    // ── Wall collisions (pitch boundary with goal openings) ──
    const gTop    = P.cy - P.goalH / 2;
    const gBot    = P.cy + P.goalH / 2;
    const isInGoalZone = obj.y > gTop && obj.y < gBot;

    // Left wall
    if (obj.x - obj.r < P.x) {
      if (obj.isBall && isInGoalZone) {
        // Ball enters left goal
        if (obj.x < P.x - P.goalD) { triggerGoal(1); return; }
        // Allow the ball to slide in (don't bounce)
      } else {
        obj.x  = P.x + obj.r;
        obj.vx = Math.abs(obj.vx) * RESTITUTION;
      }
    }
    // Right wall
    if (obj.x + obj.r > P.x + P.w) {
      if (obj.isBall && isInGoalZone) {
        if (obj.x > P.x + P.w + P.goalD) { triggerGoal(0); return; }
      } else {
        obj.x  = P.x + P.w - obj.r;
        obj.vx = -Math.abs(obj.vx) * RESTITUTION;
      }
    }
    // Top wall
    if (obj.y - obj.r < P.y) {
      obj.y  = P.y + obj.r;
      obj.vy = Math.abs(obj.vy) * RESTITUTION;
    }
    // Bottom wall
    if (obj.y + obj.r > P.y + P.h) {
      obj.y  = P.y + P.h - obj.r;
      obj.vy = -Math.abs(obj.vy) * RESTITUTION;
    }
  }

  // Circle-circle collisions (N² but small N)
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      resolveCollision(all[i], all[j]);
    }
  }

  // Turn end — everything stopped
  if (!anyMoving && turnPhase === 'MOVING') {
    setTimeout(endTurn, 400);
  }
}

function resolveCollision(a, b) {
  const dx   = b.x - a.x;
  const dy   = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min  = a.r + b.r;
  if (dist < min && dist > 0.001) {
    const nx = dx / dist;
    const ny = dy / dist;
    // Separate
    const overlap = (min - dist) / 2;
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;
    // Elastic impulse
    const dvx = b.vx - a.vx;
    const dvy = b.vy - a.vy;
    const dot = dvx * nx + dvy * ny;
    if (dot < 0) {
      const imp = dot * (1 + RESTITUTION) * 0.5;
      a.vx += imp * nx; a.vy += imp * ny;
      b.vx -= imp * nx; b.vy -= imp * ny;
    }
  }
}

// ─── TURN END ─────────────────────────────────────────────────
function endTurn() {
  if (state !== 'PLAYING') return;
  turnPhase     = 'SELECT';
  movedTok      = null;
  currentPlayer = 1 - currentPlayer;
  updateHUD();

  // Show handoff screen
  showHandoff(true);
}

// ─── GOAL LOGIC ───────────────────────────────────────────────
function triggerGoal(scoringTeam) {
  state = 'GOAL_ANIM';
  score[scoringTeam]++;
  const team = TEAMS[selectedTeams[scoringTeam]];

  // Particles
  goalState.particles = [];
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = Math.random() * 12 + 3;
    goalState.particles.push({
      x: P.cx, y: P.cy,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 5,
      life: 1,
      decay: Math.random() * 0.018 + 0.008,
      color: Math.random() > 0.5 ? team.color : team.accent,
      r: Math.random() * 7 + 2,
    });
  }
  goalState.scoring = scoringTeam;
  goalState.timer   = 180;

  // Update goal overlay HTML
  document.getElementById('goalTeamName').textContent    = `${team.flag} ${team.name}`;
  document.getElementById('goalScoreDisplay').textContent = `${score[0]} – ${score[1]}`;
  document.getElementById('goalOverlay').style.display   = 'flex';

  updateScores();

  setTimeout(() => {
    document.getElementById('goalOverlay').style.display = 'none';

    if (score[0] >= WIN_SCORE || score[1] >= WIN_SCORE) {
      endGame();
    } else {
      resetPositions();
      // After a goal, the team that conceded kicks off
      currentPlayer = 1 - scoringTeam;
      state         = 'PLAYING';
      turnPhase     = 'SELECT';
      updateHUD();
      showHandoff(true);
    }
  }, 2800);
}

function resetPositions() {
  tokens.forEach((tok, i) => {
    tok.x = initPos[i].x;
    tok.y = initPos[i].y;
    tok.vx = 0; tok.vy = 0;
  });
  const bi = tokens.length;
  ball.x = initPos[bi].x;
  ball.y = initPos[bi].y;
  ball.vx = 0; ball.vy = 0;
  goalState.particles = [];
}

// ─── GAME OVER ────────────────────────────────────────────────
function endGame() {
  state = 'GAMEOVER';
  const w = score[0] >= WIN_SCORE ? 0 : 1;
  const t = TEAMS[selectedTeams[w]];

  // Save result to localStorage tournament system
  saveMatchResult();

  document.getElementById('goWinner').textContent    = `${t.flag} ${t.name} guanya!`;
  document.getElementById('goScore').textContent     = `${score[0]} – ${score[1]}`;
  document.getElementById('goBothFlags').textContent = `${TEAMS[selectedTeams[0]].flag}  ${TEAMS[selectedTeams[1]].flag}`;
  document.getElementById('gameoverScreen').style.display = 'flex';

  document.getElementById('replayBtn').onclick    = replayMatch;
  document.getElementById('backLobbyBtn').onclick = goToMenu;
}

function replayMatch() {
  document.getElementById('gameoverScreen').style.display = 'none';
  startMatch();
}
function goToMenu() {
  document.getElementById('gameoverScreen').style.display = 'none';
  cancelAnimationFrame(animId);
  state = 'LOBBY';
  selectedTeams = [null, null];
  buildLobby();
  showScreen('lobbyScreen');
}
function skipTurn() {
  if (state !== 'PLAYING' || turnPhase === 'MOVING') return;
  drag = { active: false, tok: null, ox: 0, oy: 0, cx: 0, cy: 0 };
  // Stop all motion
  tokens.forEach(t => { t.vx = 0; t.vy = 0; });
  ball.vx = 0; ball.vy = 0;
  endTurn();
}

// ─── HANDOFF SCREEN ───────────────────────────────────────────
function showHandoff(passDevice) {
  const team = TEAMS[selectedTeams[currentPlayer]];
  const pn   = currentPlayer + 1;
  document.getElementById('handoffIcon').textContent       = team.flag;
  document.getElementById('handoffPlayer').textContent     = `Jugador ${pn}`;
  document.getElementById('handoffTeam').textContent       = team.name;
  document.getElementById('handoffContinue').textContent   = passDevice ? '▶ Soc el Jugador ' + pn + ', Continuar!' : '▶ Iniciar Partit!';
  const instruction = document.querySelector('.handoff-instruction');
  instruction.style.display = passDevice ? 'block' : 'none';
  document.getElementById('handoffScreen').style.display   = 'flex';
}

function resumeAfterHandoff() {
  document.getElementById('handoffScreen').style.display = 'none';
}

// ─── HUD ─────────────────────────────────────────────────────
function updateHUD() {
  const t0 = TEAMS[selectedTeams[0]];
  const t1 = TEAMS[selectedTeams[1]];
  document.getElementById('hudFlag1').textContent  = t0.flag;
  document.getElementById('hudName1').textContent  = t0.name;
  document.getElementById('hudFlag2').textContent  = t1.flag;
  document.getElementById('hudName2').textContent  = t1.name;
  updateScores();
  updateTurnUI();
}

function updateScores() {
  document.getElementById('score1').textContent = score[0];
  document.getElementById('score2').textContent = score[1];
}

function updateTurnUI() {
  const dot    = document.getElementById('turnDot');
  const txt    = document.getElementById('turnText');
  const pcolor = currentPlayer === 0 ? '#60a5fa' : '#fb923c';
  dot.style.background = pcolor;
  document.getElementById('turnIndicator').style.borderColor = pcolor + '50';
  txt.textContent = `Torn J${currentPlayer + 1}`;
}

// ─── SCREEN SWITCH ────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.overlay-screen').forEach(s => {
    s.style.display = s.id === id ? 'flex' : 'none';
  });
}

// ─── DRAW: PITCH ─────────────────────────────────────────────
function drawPitch() {
  ctx.save();

  // ── Grass ──
  const stripes = 12;
  const sw = P.w / stripes;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, P.x, P.y, P.w, P.h, 6);
  ctx.clip();

  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2e8b3a' : '#339940';
    ctx.fillRect(P.x + i * sw, P.y, sw, P.h);
  }

  // ── Goals nets ──
  const gTop = P.cy - P.goalH / 2;
  const gBot = P.cy + P.goalH / 2;
  // Left goal zone
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(P.x - P.goalD, gTop, P.goalD, P.goalH);
  // Right goal zone
  ctx.fillRect(P.x + P.w, gTop, P.goalD, P.goalH);

  ctx.restore(); // clip restore

  // ── Pitch border ──
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, P.x, P.y, P.w, P.h, 6);
  ctx.stroke();

  // ── Center line ──
  ctx.beginPath();
  ctx.moveTo(P.cx, P.y);
  ctx.lineTo(P.cx, P.y + P.h);
  ctx.stroke();

  // ── Center circle ──
  const ccr = P.h * 0.14;
  ctx.beginPath();
  ctx.arc(P.cx, P.cy, ccr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(P.cx, P.cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // ── Penalty areas ──
  const paW = P.w * 0.17;
  const paH = P.h * 0.55;
  ctx.strokeRect(P.x, P.cy - paH / 2, paW, paH);
  ctx.strokeRect(P.x + P.w - paW, P.cy - paH / 2, paW, paH);

  // ── Goal frames ──
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  // Left goal
  ctx.beginPath();
  ctx.moveTo(P.x, gTop);
  ctx.lineTo(P.x - P.goalD, gTop);
  ctx.lineTo(P.x - P.goalD, gBot);
  ctx.lineTo(P.x, gBot);
  ctx.stroke();
  // Right goal
  ctx.beginPath();
  ctx.moveTo(P.x + P.w, gTop);
  ctx.lineTo(P.x + P.w + P.goalD, gTop);
  ctx.lineTo(P.x + P.w + P.goalD, gBot);
  ctx.lineTo(P.x + P.w, gBot);
  ctx.stroke();

  // ── Net lines (visual) ──
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  const netLines = 5;
  for (let i = 1; i <= netLines; i++) {
    // Left net
    ctx.beginPath();
    ctx.moveTo(P.x - P.goalD, gTop + (P.goalH / (netLines + 1)) * i);
    ctx.lineTo(P.x, gTop + (P.goalH / (netLines + 1)) * i);
    ctx.stroke();
    // Right net
    ctx.beginPath();
    ctx.moveTo(P.x + P.w, gTop + (P.goalH / (netLines + 1)) * i);
    ctx.lineTo(P.x + P.w + P.goalD, gTop + (P.goalH / (netLines + 1)) * i);
    ctx.stroke();
  }
  // Vertical net lines - Left
  for (let i = 1; i < netLines; i++) {
    ctx.beginPath();
    ctx.moveTo(P.x - (P.goalD / netLines) * i, gTop);
    ctx.lineTo(P.x - (P.goalD / netLines) * i, gBot);
    ctx.stroke();
  }

  // ── Team side labels ──
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = `bold ${Math.round(P.h * 0.08)}px Outfit, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (selectedTeams[0] !== null) ctx.fillText(TEAMS[selectedTeams[0]].abbr, P.x + P.w * 0.25, P.cy);
  if (selectedTeams[1] !== null) ctx.fillText(TEAMS[selectedTeams[1]].abbr, P.x + P.w * 0.75, P.cy);

  // ── Corner arcs ──
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  const corners = [[P.x, P.y], [P.x + P.w, P.y], [P.x, P.y + P.h], [P.x + P.w, P.y + P.h]];
  const arcAngles = [[0, Math.PI / 2], [Math.PI / 2, Math.PI], [-Math.PI / 2, 0], [Math.PI, 3 * Math.PI / 2]];
  corners.forEach(([cx2, cy2], i) => {
    ctx.beginPath();
    ctx.arc(cx2, cy2, 12, arcAngles[i][0], arcAngles[i][1]);
    ctx.stroke();
  });

  ctx.restore();
}

// ─── DRAW: TOKEN ──────────────────────────────────────────────
function drawToken(tok, selected, wasMoved) {
  ctx.save();

  // Shadow
  ctx.shadowColor = selected ? '#ffffff' : tok.color + '99';
  ctx.shadowBlur  = selected ? 20 : wasMoved ? 12 : 6;

  // Main circle (gradient)
  const grad = ctx.createRadialGradient(tok.x - tok.r * 0.3, tok.y - tok.r * 0.35, 0, tok.x, tok.y, tok.r);
  grad.addColorStop(0, lighten(tok.color, 45));
  grad.addColorStop(1, tok.color);

  ctx.beginPath();
  ctx.arc(tok.x, tok.y, tok.r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Accent ring
  ctx.strokeStyle = tok.accent;
  ctx.lineWidth   = tok.r * 0.18;
  ctx.stroke();

  // Selection ring
  if (selected) {
    ctx.beginPath();
    ctx.arc(tok.x, tok.y, tok.r + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Highlight shine
  ctx.beginPath();
  ctx.arc(tok.x - tok.r * 0.28, tok.y - tok.r * 0.3, tok.r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();

  // Flag emoji
  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(tok.r * 1.05)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tok.flag, tok.x, tok.y + tok.r * 0.04);

  ctx.restore();
}

// ─── DRAW: BALL ───────────────────────────────────────────────
function drawBall() {
  ctx.save();

  // Shadow
  ctx.beginPath();
  ctx.ellipse(ball.x + 3, ball.y + 5, ball.r * 0.9, ball.r * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();

  // Main gradient
  const grad = ctx.createRadialGradient(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, 0, ball.x, ball.y, ball.r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#e8e8e8');
  grad.addColorStop(1, '#999999');

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Black patches (pentagon-style)
  ctx.fillStyle = 'rgba(10,10,10,0.75)';
  const patches = [
    { ox:  0,              oy:  0,              r: ball.r * 0.36 },
    { ox:  ball.r * 0.55,  oy: -ball.r * 0.38,  r: ball.r * 0.196 },
    { ox: -ball.r * 0.55,  oy: -ball.r * 0.38,  r: ball.r * 0.196 },
    { ox:  ball.r * 0.34,  oy:  ball.r * 0.53,  r: ball.r * 0.196 },
    { ox: -ball.r * 0.34,  oy:  ball.r * 0.53,  r: ball.r * 0.196 },
  ];
  for (const p of patches) {
    ctx.beginPath();
    ctx.arc(ball.x + p.ox, ball.y + p.oy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shine
  ctx.beginPath();
  ctx.arc(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();

  ctx.restore();
}

// ─── DRAW: SLINGSHOT INDICATOR ───────────────────────────────
function drawSlingshot() {
  if (!drag.active || !drag.tok) return;
  const tok = drag.tok;
  const dx  = drag.cx - tok.x;
  const dy  = drag.cy - tok.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return;

  const clamped = Math.min(dist, MAX_DRAG_PX);
  const ratio   = clamped / dist;
  const pullX   = tok.x + dx * ratio;
  const pullY   = tok.y + dy * ratio;
  const power   = clamped / MAX_DRAG_PX;

  ctx.save();

  // ── Rubber band lines (from token edges to pull point) ──
  const angle  = Math.atan2(dy, dx);
  const perp   = angle + Math.PI / 2;
  const bw     = tok.r * 0.6;

  const ax1 = tok.x + Math.cos(perp) * bw;
  const ay1 = tok.y + Math.sin(perp) * bw;
  const ax2 = tok.x - Math.cos(perp) * bw;
  const ay2 = tok.y - Math.sin(perp) * bw;

  ctx.strokeStyle = `rgba(255,220,60,${0.5 + power * 0.5})`;
  ctx.lineWidth   = 3;
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.moveTo(ax1, ay1);
  ctx.lineTo(pullX, pullY);
  ctx.lineTo(ax2, ay2);
  ctx.stroke();

  // ── Pull dot ──
  ctx.beginPath();
  ctx.arc(pullX, pullY, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,220,60,0.9)';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Launch direction (dashed line) ──
  const shotNx = -dx / dist;
  const shotNy = -dy / dist;
  const shotLen = clamped * 2.8;

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(tok.x, tok.y);
  ctx.lineTo(tok.x + shotNx * shotLen, tok.y + shotNy * shotLen);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Power arc ──
  const arcColor = power < 0.45 ? '#4ade80' : power < 0.78 ? '#facc15' : '#f87171';
  ctx.beginPath();
  ctx.arc(tok.x, tok.y, tok.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * power);
  ctx.strokeStyle = arcColor;
  ctx.lineWidth   = 3.5;
  ctx.shadowColor = arcColor;
  ctx.shadowBlur  = 10;
  ctx.stroke();

  // ── Arrow head ──
  const arrowTip = { x: tok.x + shotNx * shotLen, y: tok.y + shotNy * shotLen };
  const aw = 10;
  ctx.beginPath();
  ctx.moveTo(arrowTip.x, arrowTip.y);
  ctx.lineTo(arrowTip.x - shotNx * aw + shotNy * aw * 0.5, arrowTip.y - shotNy * aw - shotNx * aw * 0.5);
  ctx.lineTo(arrowTip.x - shotNx * aw - shotNy * aw * 0.5, arrowTip.y - shotNy * aw + shotNx * aw * 0.5);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur = 0;
  ctx.fill();

  ctx.restore();
}

// ─── DRAW: PARTICLES ─────────────────────────────────────────
function drawParticles() {
  for (const p of goalState.particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.35; // gravity
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= p.decay;
  }
  goalState.particles = goalState.particles.filter(p => p.life > 0);
}

// ─── MAIN GAME LOOP ───────────────────────────────────────────
function startLoop() { animId = requestAnimationFrame(loop); }

function loop() {
  animId = requestAnimationFrame(loop);

  if (state === 'LOBBY') {
    drawLobbyCanvas();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#060b14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === 'PLAYING' || state === 'GOAL_ANIM') {
    drawPitch();

    // Particles (goal celebration behind tokens)
    if (goalState.particles.length > 0) drawParticles();

    // Tokens
    const myTokens = tokens.filter(t => t.team === currentPlayer && t.alive);
    for (const tok of tokens) {
      if (!tok.alive) continue;
      const isSelected = drag.active && drag.tok === tok;
      const wasMoved   = movedTok === tok;
      // Highlight current player's tokens subtly
      const isMine     = tok.team === currentPlayer;
      drawToken(tok, isSelected, wasMoved || (isMine && turnPhase === 'SELECT'));
    }

    drawBall();
    drawSlingshot();

    // Turn phase UI
    if (turnPhase === 'SELECT' && state === 'PLAYING') {
      drawTurnOverlay();
    }

    // Physics step
    if (turnPhase === 'MOVING' && state === 'PLAYING') {
      physicsUpdate();
    }

    // Update phase text
    const phaseMap = {
      'SELECT': 'Selecciona una fitxa i arrossega-la per llançar-la',
      'DRAGGING': 'Allibera per llançar — com una fona!',
      'MOVING': '⏳ Esperant...',
    };
    document.getElementById('phaseText').textContent = phaseMap[turnPhase] || '';
  }
}

// ─── LOBBY CANVAS DRAW (animated background) ─────────────────
let lobbyTime = 0;
function drawLobbyCanvas() {
  lobbyTime++;
  if (!canvas.width) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── TURN OVERLAY ────────────────────────────────────────────
function drawTurnOverlay() {
  // Highlight ring on current player's tokens
  const myToks = tokens.filter(t => t.team === currentPlayer && t.alive);
  ctx.save();
  const pcolor = currentPlayer === 0 ? 'rgba(96,165,250,0.25)' : 'rgba(251,146,60,0.25)';
  for (const tok of myToks) {
    ctx.beginPath();
    ctx.arc(tok.x, tok.y, tok.r + 14, 0, Math.PI * 2);
    ctx.strokeStyle = pcolor;
    ctx.lineWidth   = 2;
    ctx.stroke();
  }
  ctx.restore();
}

// ─── UTILITY ─────────────────────────────────────────────────
function lighten(hex, amount) {
  let n = parseInt(hex.replace('#', ''), 16);
  if (isNaN(n)) return hex;
  const r = Math.min(255, (n >> 16) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

// ─── TOURNAMENT STORAGE ───────────────────────────────────────
function getPlayedTeams() {
  try { return JSON.parse(localStorage.getItem(SK_PLAYED) || '[]'); }
  catch { return []; }
}

function saveMatchResult() {
  if (selectedTeams[0] === null || selectedTeams[1] === null) return;
  try {
    const t1 = TEAMS[selectedTeams[0]];
    const t2 = TEAMS[selectedTeams[1]];
    const matchData = {
      id: Date.now(),
      date: new Date().toISOString(),
      team1: { name: t1.name, flag: t1.flag, abbr: t1.abbr, color: t1.color },
      team2: { name: t2.name, flag: t2.flag, abbr: t2.abbr, color: t2.color },
      score1: score[0],
      score2: score[1],
      winner: score[0] > score[1] ? 'team1' : score[1] > score[0] ? 'team2' : 'draw'
    };

    // 1. Save to localStorage immediately (synchronous, instant)
    const matches = JSON.parse(localStorage.getItem(SK_MATCHES) || '[]');
    const played  = getPlayedTeams();
    matches.push(matchData);
    [t1.name, t2.name].forEach(n => { if (!played.includes(n)) played.push(n); });
    localStorage.setItem(SK_MATCHES, JSON.stringify(matches));
    localStorage.setItem(SK_PLAYED, JSON.stringify(played));

    // 2. Push to Firebase in background (async, fire-and-forget)
    if (window.DB) {
      DB.addMatch(matchData)
        .then(() => DB.markTeamsPlayed([t1.name, t2.name]))
        .then(() => console.log('[DB] Result pushed online ✓'))
        .catch(e => console.warn('[DB] Push failed:', e.message));
    }

    console.log('Result saved:', t1.name, score[0], '-', score[1], t2.name);
  } catch (e) { console.error('Could not save:', e); }
}

console.log('⚽ Chapas del Mundial 2026 — Game Engine v2.0 loaded!');
console.log('ℹ️  Admin panel: admin.html | Tournament: tournament.html');
console.log('🌐 Online mode:', window.ONLINE_MODE ? 'YES' : 'NO (configure firebase-config.js)');
