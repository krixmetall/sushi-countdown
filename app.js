// ===== Helper: qs =====
const $ = (sel) => document.querySelector(sel);

// ===== State =====
const state = {
  name: '',
  target: null,     // Date object
  start: null       // Date the countdown was set (for progress ring)
};

// ===== Load from URL / localStorage =====
function loadInitial(){
  const params = new URLSearchParams(location.search);
  const name = params.get('name') || localStorage.getItem('sushi_name') || '';
  const dateStr = params.get('date') || localStorage.getItem('sushi_date') || '';
  const startStr = localStorage.getItem('sushi_start') || '';

  if(name){ $('#name').value = name; state.name = name; }
  if(dateStr){ $('#date').value = dateStr; state.target = parseDate(dateStr); }
  if(startStr){ state.start = new Date(startStr); }

  // If nothing set, nudge a hint date ~6 semanas vista
  if(!state.target){
    const d = new Date(); d.setDate(d.getDate() + 42); // 6 semanas
    $('#date').value = toDateInputValue(d); // default suggestion
  }

  tick();
  updateTitle();
  updateShareAvailability();
}

function parseDate(yyyyMMdd){
  const [y,m,d] = yyyyMMdd.split('-').map(Number);
  return new Date(y, m-1, d, 0, 0, 0, 0);
}
function toDateInputValue(d){
  const z = (n) => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}

// ===== Countdown logic =====
let timer = null;
function startTimer(){
  if(timer) clearInterval(timer);
  timer = setInterval(tick, 1000);
}

function tick(){
  const now = new Date();
  const t = state.target;
  if(!t){ fillPlaceholders(); return; }

  const diffMs = t - now;
  const past = diffMs <= 0;

  const absMs = Math.abs(diffMs);
  const s = Math.floor(absMs / 1000) % 60;
  const m = Math.floor(absMs / (1000*60)) % 60;
  const h = Math.floor(absMs / (1000*60*60)) % 24;
  const d = Math.floor(absMs / (1000*60*60*24));

  $('#d').textContent = d;
  $('#h').textContent = h;
  $('#m').textContent = m;
  $('#s').textContent = s;
  $('#bigDays').textContent = d;
  $('#bigLabel').textContent = d === 1 ? 'día' : 'días';

  const who = state.name ? `${state.name} ` : '';
  if(past){
    $('#status').innerHTML = `<span class="success">Ya es el Día del Sushi. ${who}—¡maki a estribor!</span>`;
    celebrate();
  } else {
    const pretty = t.toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'});
    $('#status').innerHTML = `Objetivo: <b>${pretty}</b>${state.name ? ` para <b>${state.name}</b>`:''}`;
  }

  // Ring progress
  const start = state.start;
  const ring = $('#ring');
  const R = 52; const C = 2 * Math.PI * R;
  let pct = 0.0001;
  if(start && t > start){
    const total = t - start;
    const done = now - start;
    pct = Math.min(1, Math.max(0.0001, done / total));
  }
  const dash = C * pct;
  ring.setAttribute('stroke-dasharray', `${dash} ${C}`);
}

function fillPlaceholders(){
  ['#d','#h','#m','#s','#bigDays'].forEach(id => $(id).textContent = '–');
  $('#status').textContent = 'Elige una fecha objetivo y dale a Guardar.';
}

// ===== Actions =====
$('#save').addEventListener('click', () => {
  const name = $('#name').value.trim();
  const dateVal = $('#date').value;
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

  tick();
  updateTitle();
  flash('Guardado. Enlace listo para compartir.');
});

$('#share').addEventListener('click', async () => {
  const url = location.href;
  const title = 'Cuenta atrás: ¡vuelta al sushi!';
  const text = state.name ? `Faltan ${$('#d').textContent} días para el sushi de ${state.name}.` : `Faltan ${$('#d').textContent} días para el sushi.`;
  if(navigator.share){
    try{ await navigator.share({title, text, url}); }
    catch(e){ }
  } else {
    await navigator.clipboard.writeText(url);
    flash('Enlace copiado al portapapeles.');
  }
});

$('#ics').addEventListener('click', () => {
  if(!state.target){ alert('Primero elige y guarda una fecha.'); return; }
  const title = state.name ? `Día del sushi de ${state.name}` : 'Día del sushi';
  const dt = state.target;
  const dtStart = formatICSDate(dt);
  const dtEnd = formatICSDate(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()+1));
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//sushi-countdown//ES\nBEGIN:VEVENT\nDTSTAMP:${formatICSDate(new Date())}Z\nUID:${crypto.randomUUID()}\nDTSTART;VALUE=DATE:${dtStart}\nDTEND;VALUE=DATE:${dtEnd}\nSUMMARY:${escapeICS(title)}\nDESCRIPTION:${escapeICS('Cuenta atrás: ¡vuelta al sushi!')}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics], {type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dia-del-sushi.ics';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#reset').addEventListener('click', () => {
  localStorage.removeItem('sushi_name');
  localStorage.removeItem('sushi_date');
  localStorage.removeItem('sushi_start');
  state.name = ''; state.target = null; state.start = null;
  $('#name').value = '';
  $('#date').value = '';
  history.replaceState({}, '', location.pathname);
  tick(); updateTitle();
  flash('Reiniciado.');
});

$('#aboutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  alert('1) Pon nombre y fecha.\n2) Guarda para fijar el enlace.\n3) Comparte o añade al calendario.\n4) Cuando llegue el día: confeti y 🍣.');
});

function formatICSDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}${m}${day}`;
}
function escapeICS(s){
  return s.replace(/\\/g,'\\\\').replace(/\\n/g,'\\\\n').replace(/,/g,'\\\\,').replace(/;/g,'\\\\;');
}

// ===== UI helpers =====
function flash(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position='fixed'; el.style.bottom='20px'; el.style.left='50%'; el.style.transform='translateX(-50%)';
  el.style.background='#111827'; el.style.color='var(--text)'; el.style.padding='10px 14px'; el.style.border='1px solid #374151'; el.style.borderRadius='12px'; el.style.boxShadow='0 8px 24px rgba(0,0,0,.35)';
  document.body.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 2200);
}

function updateTitle(){
  const who = state.name ? ` de ${state.name}` : '';
  document.title = state.target ? `Cuenta atrás${who} — ${$('#d').textContent} días` : 'Cuenta atrás: ¡vuelta al sushi!';
}

function updateShareAvailability(){
  const share = $('#share');
  share.style.opacity = navigator.share ? 1 : 1;
}

// ===== Confetti =====
let celebrated = false;
function celebrate(){
  if(celebrated) return; celebrated = true;
  const conf = $('#confetti');
  const icons = ['🍣','🍙','🥢','🧡','✨'];
  const N = 120;
  for(let i=0;i<N;i++){
    const span = document.createElement('span');
    span.className='piece';
    span.textContent = icons[Math.floor(Math.random()*icons.length)];
    const startX = Math.random()*100;
    const dx = (Math.random()*2-1)*40 + 'vw';
    const rot = (Math.random()*720-360)+'deg';
    span.style.left = startX+'vw';
    span.style.top = '-5vh';
    span.style.setProperty('--x', dx);
    span.style.setProperty('--rot', rot);
    span.style.animationDuration = (2.2 + Math.random()*1.6)+'s';
    span.style.opacity = 0.7;
    conf.appendChild(span);
    setTimeout(()=>span.remove(), 4000);
  }
}

// ===== Kickoff =====
loadInitial();
startTimer();
