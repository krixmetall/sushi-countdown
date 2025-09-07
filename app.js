// ===== Helpers =====
const $ = (sel) => document.querySelector(sel);
function parseDate(str){
  if(!str) return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)){ const [y,m,d]=str.split('-').map(Number); return new Date(y, m-1, d, 0,0,0,0); }
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(str)){ const [d,m,y]=str.split('/').map(Number); return new Date(y, m-1, d, 0,0,0,0); }
  const d = new Date(str); return isNaN(d) ? null : d;
}
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
  const d = document.getElementById('d')?.textContent || '';
  document.title = state.target ? `Cuenta atrás${who} — ${d} días` : 'Cuenta atrás: ¡vuelta al sushi!';
}
function updateShareAvailability(){ const share = document.getElementById('share'); if(share) share.style.opacity = 1; }

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
  const m = Math.floor(absMs/60000) % 60;
  const h = Math.floor(absMs/3600000) % 24;
  const d = Math.floor(absMs/86400000);

  const D=document.getElementById('d'), H=document.getElementById('h'), M=document.getElementById('m'), S=document.getElementById('s');
  const BD=document.getElementById('bigDays'), BL=document.getElementById('bigLabel');
  if(D) D.textContent=d; if(H) H.textContent=h; if(M) M.textContent=m; if(S) S.textContent=s;
  if(BD) BD.textContent=d; if(BL) BL.textContent = d === 1 ? 'día' : 'días';

  const st = document.getElementById('status');
  const who = state.name ? `${state.name} ` : '';
  if(st){
    if(past){ st.innerHTML = `<span class="success">Ya es el Día del Sushi. ${who}—¡maki a estribor!</span>`; celebrate(); }
    else{
      const pretty = t.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
      st.innerHTML = `Objetivo: <b>${pretty}</b>${state.name?` para <b>${state.name}</b>`:''}`;
    }
  }

  const ring = document.getElementById('ring');
  const R=52, C = 2*Math.PI*R;
  let pct = 0.0001;
  if(state.start && t > state.start){ const total=t-state.start, done=now-state.start; pct = Math.min(1, Math.max(0.0001, done/total)); }
  if(ring) ring.setAttribute('stroke-dasharray', `${C*pct} ${C}`);
}
function fillPlaceholders(){
  ['d','h','m','s','bigDays'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='–'; });
  const st = document.getElementById('status'); if(st) st.textContent='Elige una fecha y dale a Guardar.';
}

// ===== Load =====
function loadInitial(){
  const params = new URLSearchParams(location.search);
  const name = params.get('name') || localStorage.getItem('sushi_name') || '';
  const dateStr = params.get('date') || localStorage.getItem('sushi_date') || '';
  const startStr = localStorage.getItem('sushi_start') || '';

  if(name){ const n=document.getElementById('name'); if(n) n.value=name; state.name=name; }
  if(dateStr){ const d=document.getElementById('date'); if(d) d.value=dateStr; state.target=parseDate(dateStr); }
  if(startStr){ const t=new Date(startStr); if(!isNaN(t)) state.start=t; }

  if(!state.target){
    const d = new Date(); d.setDate(d.getDate()+42);
    const di = document.getElementById('date'); if(di) di.value = toDateInputValue(d);
  }

  tick(); updateTitle(); updateShareAvailability(); updateShareView();
}

// ===== Events =====
document.getElementById('save')?.addEventListener('click', () => {
  const name = document.getElementById('name')?.value.trim() || '';
  const dateVal = document.getElementById('date')?.value || '';
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

document.getElementById('share')?.addEventListener('click', async () => {
  const url = location.href;
  const title = 'Cuenta atrás: ¡vuelta al sushi!';
  const d = document.getElementById('d')?.textContent || '';
  const text = state.name ? `Faltan ${d} días para el sushi de ${state.name}.` : `Faltan ${d} días para el sushi.`;
  if(navigator.share){ try{ await navigator.share({title, text, url}); }catch(e){} }
  else { try{ await navigator.clipboard.writeText(url); flash('Enlace copiado.'); }catch(e){} }
});

document.getElementById('ics')?.addEventListener('click', () => {
  if(!state.target){ alert('Primero elige y guarda una fecha.'); return; }
  const title = state.name ? `Día del sushi de ${state.name}` : 'Día del sushi';
  const dt = state.target;
  const dtStart = formatICSDate(dt);
  const dtEnd = formatICSDate(new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()+1));
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//sushi-countdown//ES
BEGIN:VEVENT
DTSTAMP:${formatICSDate(new Date())}Z
UID:${(crypto && crypto.randomUUID)?crypto.randomUUID():('sushi-'+Date.now())}
DTSTART;VALUE=DATE:${dtStart}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:${escapeICS(title)}
DESCRIPTION:${escapeICS('Cuenta atrás: ¡vuelta al sushi!')}
END:VEVENT
END:VCALENDAR`;
  const blob = new Blob([ics], {type:'text/calendar'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'dia-del-sushi.ics'; a.click(); URL.revokeObjectURL(a.href);
});

document.getElementById('reset')?.addEventListener('click', () => {
  localStorage.removeItem('sushi_name');
  localStorage.removeItem('sushi_date');
  localStorage.removeItem('sushi_start');
  state.name=''; state.target=null; state.start=null;
  const n=document.getElementById('name'); if(n) n.value='';
  const d=document.getElementById('date'); if(d) d.value='';
  history.replaceState({}, '', location.pathname);
  tick(); updateTitle(); updateShareView();
  flash('Reiniciado.');
});

document.getElementById('aboutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  alert('1) Pon nombre y fecha.\n2) Guarda.\n3) Comparte.\n4) Cuando llegue el día: confeti y 🍣.');
});

// ===== Confetti =====
let celebrated=false;
function celebrate(){
  if(celebrated) return; celebrated=true;
  const conf = document.getElementById('confetti'); if(!conf) return;
  const icons = ['🍣','🍙','🥢','🧡','✨']; const N=120;
  for(let i=0;i<N;i++){
    const span=document.createElement('span'); span.className='piece'; span.textContent=icons[Math.floor(Math.random()*icons.length)];
    const startX=Math.random()*100; const dx=(Math.random()*2-1)*40+'vw'; const rot=(Math.random()*720-360)+'deg';
    span.style.left=startX+'vw'; span.style.top='-5vh'; span.style.setProperty('--x',dx); span.style.setProperty('--rot',rot);
    span.style.animationDuration=(2.2+Math.random()*1.6)+'s'; span.style.opacity=0.7; conf.appendChild(span); setTimeout(()=>span.remove(),4000);
  }
}

// ===== Kickoff =====
loadInitial();
startTimer();
