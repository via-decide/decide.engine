import { getFirebaseConfig } from './firebase-config.js';

const APP_KEY = 'skillhex-v3';
const INTERVIEW_KEY = 'retroInterviewSession_v1';
const state = { score: 0, multiplier: 1, current: null, timer: null, secLeft: 0, missions: [], profile: {} };

const $ = (id) => document.getElementById(id);
const log = (msg) => { const el = $('log'); el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n` + el.textContent; };

function saveState() { localStorage.setItem(APP_KEY, JSON.stringify({ score: state.score, multiplier: state.multiplier, lastMission: state.current?.id || null })); }
function addInterviewEntry(entry) {
  const prior = JSON.parse(localStorage.getItem(INTERVIEW_KEY) || '{"entries":[]}');
  prior.entries = prior.entries || []; prior.entries.unshift({ at: Date.now(), ...entry });
  localStorage.setItem(INTERVIEW_KEY, JSON.stringify(prior));
}

function renderMissions() {
  $('missions').innerHTML = '';
  state.missions.forEach((m) => {
    const d = document.createElement('div');
    d.className = 'mission';
    d.innerHTML = `<strong>${m.id}</strong> — ${m.title}<div class="small">${m.seconds}s · ${m.type}</div><div class="row" style="margin-top:6px"><button data-id="${m.id}">Launch</button>${m.type === 'interview' ? '<span class="small">opens interview conversion</span>' : ''}</div>`;
    d.querySelector('button').onclick = () => launchMission(m.id);
    $('missions').appendChild(d);
  });
}

function tick() {
  state.secLeft -= 1; $('timer').textContent = `${state.secLeft}s`;
  if (state.secLeft <= 0) {
    clearInterval(state.timer); state.timer = null;
    const earned = Math.round((state.current.seconds / 10) * state.multiplier);
    state.score += earned; $('score').textContent = state.score;
    log(`${state.current.id} complete (+${earned}) with x${state.multiplier.toFixed(1)}`);
    saveState();
    pushLeaderboard().catch((e) => log(`Firebase write attempt failed: ${e.message}`));
  }
}

function launchMission(id) {
  const m = state.missions.find((x) => x.id === id); if (!m) return;
  state.current = m; state.secLeft = m.seconds; $('timer').textContent = `${state.secLeft}s`;
  clearInterval(state.timer); state.timer = setInterval(tick, 1000);
  log(`Mission ${m.id} launched`);
  if (['V07','V08','V09','V10'].includes(m.id)) openInterview(m);
}

function openInterview(m) { $('interviewMission').textContent = `${m.id} · ${m.title}`; $('interviewModal').style.display = 'flex'; }

function initWarmup() {
  $('applyWarmup').onclick = () => { state.multiplier = 1.25; $('mult').textContent = state.multiplier.toFixed(2); log('Warm-up applied (x1.25)'); saveState(); };
  $('skipWarmup').onclick = () => { state.multiplier = 0.9; $('mult').textContent = state.multiplier.toFixed(2); log('Warm-up skipped (x0.90)'); saveState(); };
}

function initInterview() {
  $('closeInterview').onclick = () => $('interviewModal').style.display = 'none';
  $('convertInterview').onclick = () => {
    const payload = {
      mission: $('interviewMission').textContent.split(' · ')[0],
      name: $('pName').value || state.profile.name || 'anonymous',
      company: $('pCompany').value || state.profile.company || '',
      role: $('pRole').value || state.profile.role || '',
      level: $('pLevel').value || state.profile.level || '',
      notes: $('pNotes').value
    };
    addInterviewEntry(payload);
    log(`Interview converted to ${INTERVIEW_KEY} (${payload.mission})`);
    $('interviewModal').style.display = 'none';
  };
}

function initProfileBridge() {
  const q = new URLSearchParams(location.search);
  ['name','company','role','level'].forEach((k) => { state.profile[k] = q.get(k) || ''; });
  window.addEventListener('message', (ev) => {
    if (!ev.data || ev.data.type !== 'skillhex-profile') return;
    state.profile = { ...state.profile, ...ev.data.payload };
    log('Profile bridge payload accepted via postMessage');
  });
}

function initKadaWheel() {
  const c = $('kada'); const ctx = c.getContext('2d'); let a = 0;
  function draw() {
    const w = c.width = c.clientWidth * devicePixelRatio; c.height = c.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const r = c.clientWidth / 2; ctx.translate(r, r); ctx.rotate(a);
    for (let i=0;i<6;i++) { ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r-8,(i*Math.PI/3),((i+1)*Math.PI/3)); ctx.closePath(); ctx.fillStyle = i%2 ? '#183055' : '#21416c'; ctx.fill(); }
    ctx.setTransform(1,0,0,1,0,0);
  }
  draw();
  $('spinKada').onclick = () => {
    a += Math.PI * (2 + Math.random() * 4); draw();
    const bonus = [0,5,10,15,20][Math.floor(Math.random()*5)];
    state.score += bonus; $('score').textContent = state.score; log(`KADA spin bonus +${bonus}`); saveState();
  };
}

async function pushLeaderboard() {
  const cfg = getFirebaseConfig();
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
  const { getFirestore, addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');
  const app = initializeApp(cfg, 'skillhex');
  const db = getFirestore(app);
  const name = state.profile.name || $('pName').value;
  if (!name) { log('Leaderboard skipped: no player identity set'); return; }
  await addDoc(collection(db, 'skillhexLeaderboard'), { name, score: state.score, mission: state.current?.id || null, ts: serverTimestamp() });
  log('Firebase leaderboard write attempt executed');
}

async function boot() {
  initProfileBridge();
  initWarmup();
  initInterview();
  initKadaWheel();
  const res = await fetch('./missions.json'); state.missions = await res.json();
  renderMissions();
  const cached = JSON.parse(localStorage.getItem(APP_KEY) || '{}');
  state.score = cached.score || 0; state.multiplier = cached.multiplier || 1;
  $('score').textContent = state.score; $('mult').textContent = state.multiplier.toFixed(2);
  log('SkillHex Mission Control booted');
}
boot();
