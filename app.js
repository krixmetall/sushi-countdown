// ===== Helpers =====
const $ = (sel) => document.querySelector(sel);
function parseDate(yyyyMMdd){ const [y,m,d]=yyyyMMdd.split('-').map(Number); return new Date(y, m-1, d, 0,0,0,0); }
function toDateInputValue(d){ const z=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
function formatICSDate(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}${m}${day}`; }
function escapeICS(s){ return s.replace(/\\/g,'\\\\').replace(/\\n/g,'\\\\n').replace(/,/g,'\\\\,').replace(/;/g,'\\\\;'); }
function flash(msg){ const el=document.createElement('div'); el.textContent=msg; el.style.position='fixed'; el.style.bottom='20px'; el.style.left='50%'; el.style.transform='translateX(-50%)'; el.style.background='#111827'; el.style.color='var(--text)'; el.style.padding='10px 14px'; el.style.border='1px solid #374151'; el.style.borderRadius='12px'; el.style.boxShadow='0 8px 24px rgba(0,0,0,.35)'; document.body.appendChild(el); setTimeout(()=>el.remove(),2200); }

// ===== State =====
const state = { name:'', target:null, start:null };

// ===== UI Toggles =====
function updateShareView(){
  const params = new URLSearchParams(location.search);
  const hasDate = params.has('date') || !!state.target;
  const tips = document.getElementById('tips');
  const art  = document.getElementById('shareArt');
  if(!tips || !art) return;
  if(hasDate){ tips.classList.add('hidden'); art.classList.remove('hidden'); }
  else { art.classList.add('hidden'); tips.classList.remove('hidden'); }
}

function updateTitle(){
  const who = state.name ? ` de ${state.name}` : '';
  const d = $('#d')?.textContent || '';
  document.title = state.target ? `Cuenta atrás${who} — ${d} días` : 'Cuenta atrás: ¡vuelta al sushi!';
}

function updateShareAvailability(){
  const share = $('#share');
  if(share) share.style.opacity = 1; // siempre habilitado (hay copia al portapapeles)
}

// ===== Countdown =====
let timer=null;
function startTimer(){ if(timer) clearInterval(timer); timer=setInterval(tick,1000); }

function tick(){
  const now = new Date();
  const t = state.target;
  if(!t){ fillPlaceholders(); return; }

  const diffMs = t - now;
  const past = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const s = Math.floor(absMs/1000) % 60;
  const m = Math.floor(absMs/6e4) % 60;
  const h = Math.floor(absMs/36e5) % 24;
  const d = Math.floor(absMs/864e5);

  $('#d').textContent = d; $('#h').textContent = h; $('#m').textContent = m; $('#s').textContent = s;
  $('#bigDays').textContent = d; $('#bigLabel').textContent = d === 1 ? 'día' : 'días';

  const who = state.name ? `${state.name} ` : '';
  if(past){
    $('#status').innerHTML = `<span class="success">Ya es el Día del Sushi. ${who}—¡maki a estribor!</span>`;
    celebrate();
  }else{
    const pretty = t.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    $('#status').innerHTML = `Objetivo: <b>${pretty}</b>${state.name?` para <b>${state.name}</b>`:''}`;
  }

  // Ring progress
  const start = state.start, ring = $('#ring'), R=52, C = 2*Math.PI*R;
  let pct = 0.0001;
  if(start && t > start){ const total=t-start, done=now-start; pct = Math.min(1, Math.max(0.0001, done/total)); }
  ring.setAttribute('stroke-dasharray', `${C*pct} ${C}`);
}

function fillPlaceholders(){
  ['#d','#h','#m','#s','#bigDays'].forEach(id => { const el=$(id); if(el) el.textContent='–'; });
  const st = $('#status'); if(st) st.textContent='Elige una fecha y dale a Guardar.';
}

// ===== Load =====
function loadInitial(){
  const params = new URLSearchParams(location.search);
  const name = params.get('name') || localStorage.getItem('sushi_name') || '';
  const dateStr = params.get('date') || localStorage.getItem('sushi_date') || '';
  const startStr = localStorage.getItem('sushi_start') || '';

  if(name){ const n=$('#name'); if(n) n.value=name; state.name=name; }
  if(dateStr){ const d=$('#date'); if(d) d.value=dateStr; state.target=parseDate(dateStr); }
  if(startStr){ state.start = new Date(startStr); }

  if(!state.target){
    const d = new Date(); d.setDate(d.getDate()+42);
    const di = $('#date'); if(di) di.value = toDateInputValue(d);
  }

  tick(); updateTitle(); updateShareAvailability(); updateShareView();
}

// ===== Events =====
$('#save')?.addEventListener('click', () => {
  const name = $('#name')?.value.trim() || '';
  const dateVal = $('#date')?.value || '';
  if(!dateVal){ alert('Elige una fecha válida.'); return; }
  state.name = name; state.target = parseDate(dateVal);
  if(!state.start) state.start = new Date();

  localStorage.setItem('sushi_name', name);
  localStorage.setItem('sushi_date', dateVal);
  localStorage.setItem('sushi_start', state.start.toISOString());

  const url = new URL(location.href);
  url.searchParams.set('date', dateVal);
  if(name) url.searchParams.set('name', name); else url.searchParams.delete('name');
  history.replaceState({}, '', url);

  tick(); updateTitle(); updateShareView();
  flash('Guardado. Enlace listo.');
});

$('#share')?.addEventListener('click', async () => {
  const url = location.href;
  const title = 'Cuenta atrás: ¡vuelta al sushi!';
  const text = state.name ? `Faltan ${$('#d').textContent} días par
