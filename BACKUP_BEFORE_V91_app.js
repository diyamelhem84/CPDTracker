const APP_BUILD_VERSION="20260510goldv90_clean_rebuild_stable_core";
/* CPD Tracker - Full Reliable Rebuild */
const app = document.getElementById('app');


// V23 FIX: global KPI card renderer used by Reports.
// Kept on window intentionally so reportsBody() never throws "card is not defined".
window.card = function(title, value, subtitle='') {
  return `<div class="card kpi-card">
    <div class="kpi-title">${esc(String(title ?? ''))}</div>
    <div class="kpi-value">${esc(String(value ?? ''))}</div>
    <div class="kpi-subtitle">${esc(String(subtitle ?? ''))}</div>
  </div>`;
};
var card = window.card;

let supabaseClient = null;
let current = null;
let currentRoute = 'dashboard';
let dbReady = false;

function isCurrentAdmin(){
  return !!(current && current.role === 'admin');
}
function isCurrentStaff(){
  return !!(current && current.role === 'staff');
}


function getDb(){
  if (window.supabaseClient) return window.supabaseClient;
  if (supabaseClient) return supabaseClient;
  const url = window.CPD_SUPABASE_URL;
  const key = window.CPD_SUPABASE_ANON_KEY;
  if (!window.supabase || !window.supabase.createClient || !url || !key) throw new Error("Supabase is not configured or library is not loaded.");
  supabaseClient = window.supabase.createClient(url, key);
  window.supabaseClient = supabaseClient;
  return supabaseClient;
}

const state = {
  users: [], notifications: [], activities: [], activityRegistrations: [],
  targetTotal: 80, targetCategory1: 40, targetCategory23: 40, reminderMonthsBefore: 4,
  emailSettings: { adminEmail:'', emailServiceId:'', emailTemplateId:'', emailPublicKey:'' }, smartReportFilter: ''
};

const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));
const todayISO = () => new Date().toISOString();
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : 'Missing';
const isTrainee = u => String(u?.dhpLicense || '').trim().toUpperCase().startsWith('TN');
const total = u => isTrainee(u) ? 0 : Number(u.category1 || 0) + Number(u.category23 || 0);
const traineeText = '<span class="trainee-text trainee-pill"><b>T.Nurse</b></span>';
const traineeShortText = '<span class="trainee-text trainee-pill trainee-short"><b>T.Nurse</b></span>';
const STAFF_AREA_ORDER = ['OPD','Dental','CSSD','OR','Day Ward'];
const STAFF_AREA_MAP = {
  "honeylore siman": "OPD",
  "luvill ciriaco": "OPD",
  "glenda palisoc": "OPD",
  "may basilio": "OPD",
  "ivy edralin": "OPD",
  "adriene joy velasquez": "OPD",
  "rejoy guillermo": "OPD",
  "may oppus": "OPD",
  "rejoyce guillermo": "OPD",
  "deepa rose": "OPD",
  "teslin tom": "OPD",
  "cheryl montes": "OPD",
  "kiara ramirez": "OPD",
  "karen mae englis": "OPD",
  "mishell marcellana": "OPD",
  "agnes mangawang": "OPD",
  "elaine a. sali": "OPD",
  "mary klaudine papio": "OPD",
  "may angela nicolas": "OPD",
  "maria soriano": "OPD",
  "veranica ambat": "OPD",
  "ambrielle abion": "OPD",
  "diana porquerino": "OPD",
  "angelie casio": "OPD",
  "jissa ann joseph": "OPD",
  "jasana james": "OPD",
  "lady rosepink tubon": "OPD",
  "neethu jose": "OPD",
  "sanika naiju": "OPD",
  "nittu jhons": "OPD",
  "anjuna pilaparambath": "OPD",
  "ajisha mary": "OPD",
  "cheanne byenconsejo": "OPD",
  "emelita manuel perez": "OPD",
  "mae penelope banes": "OPD",
  "jasmin romero marcos": "OPD",
  "arlyn gana": "OPD",
  "wilma reales": "OPD",
  "jimmylyn de la paz": "OPD",
  "bincy varghese": "OPD",
  "millie anne david brisones": "OPD",
  "alphonsa thomas": "OPD",
  "nolinda catahan": "OPD",
  "marilou miranda": "OPD",
  "margierette simbre": "OPD",
  "marian escobar": "Dental",
  "cherrielyn fabito": "Dental",
  "kevin andal": "Dental",
  "chona sabandal": "Dental",
  "annaliza nocete": "Dental",
  "michelle echon": "Dental",
  "deepa vijayan": "Dental",
  "ivy mora": "Dental",
  "alona elano balacuit": "Dental",
  "liberty guzman": "CSSD",
  "arabella acob": "CSSD",
  "vener centeno": "CSSD",
  "ahmad al najjar": "OR",
  "aleha santos": "OR",
  "editha castro": "OR",
  "efua benson": "OR",
  "felora micheal": "OR",
  "jeffrey gadia": "OR",
  "christy mariam": "OR",
  "alfred balo": "OR",
  "rueben agunat": "OR",
  "bilga george": "OR",
  "abdel rahman taher": "OR",
  "arweda sapii": "Day Ward",
  "virna aranez": "Day Ward",
  "ma. katrina cuyno": "Day Ward",
  "fe casareno": "Day Ward",
  "ruby baby": "Day Ward",
  "aswathi kollacheri meethal": "Day Ward",
  "jincy varghese": "Day Ward"
};
function staffNameKey(name){return String(name||'').trim().replace(/\s+/g,' ').toLowerCase();}
function displayArea(u){const mapped=STAFF_AREA_MAP[staffNameKey(u?.fullName)];const currentArea=(u?.area||'').trim();if(mapped && (!currentArea || currentArea==='Nursing' || currentArea==='Nursing Department')) return mapped;return currentArea || mapped || u?.department || 'Unassigned';}
const activeStaff = () => state.users.filter(u => u.role === 'staff' && u.active !== false);
function toast(msg,center=false){const t=document.createElement('div');t.className=center?'toast toast-center':'toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3000)}
function showError(title,msg){app.innerHTML=`<div class="error-panel"><h1>${esc(title)}</h1><p>${esc(msg)}</p><button class="btn" onclick="location.reload()">Reload</button></div>`}

function dbToUser(r){return {
  id:r.id, username:r.username||'', password:r.password||'1234', role:r.role||'staff', active:r.active!==false,
  fullName:r.full_name||r.fullName||'', department:r.department||'', area:r.area||'', assignedDoctor:r.assigned_doctor||'', joiningDate:r.joining_date||'',
  dhpLicense:r.dhp_license||'', qid:r.qid||'', dhpExpiry:r.dhp_expiry||'', category1:Number((r.category1_points ?? r.category1 ?? 0)), category23:Number((r.category23_points ?? r.category23 ?? 0)),
  email:r.email||'', mobile:r.mobile||'', notes:r.notes||'', lastEmailSent:r.last_email_sent||null, lastLogin:r.last_login||r.lastLogin||null, updatedAt:r.updated_at||''
}}
function userToDb(u){return {
  username:(u.username||'').toLowerCase(), password:u.password||'1234', role:u.role||'staff', active:u.active!==false,
  full_name:u.fullName||'', department:u.department||'', area:u.area||'', assigned_doctor:u.assignedDoctor||'', joining_date:u.joiningDate||null,
  dhp_license:u.dhpLicense||'', qid:u.qid||'', dhp_expiry:u.dhpExpiry||null, category1_points:Number(u.category1||0), category23_points:Number(u.category23||0),
  email:u.email||'', mobile:u.mobile||'', notes:u.notes||'', last_login:u.lastLogin||u.last_login||null, updated_at:todayISO()
}}


function dbToActivity(r){return {
  id:r.id, title:r.title||'', provider:r.provider||'', type:r.activity_type||r.type||'',
  eventDate:r.event_date||r.date||'', eventMode:r.event_mode||'single', sessionsJson:r.sessions_json||'', sessions:parseActivitySessions({sessionsJson:r.sessions_json,eventDate:r.event_date,startTime:r.start_time,endTime:r.end_time}), startTime:r.start_time||'', endTime:r.end_time||'', multipleDates:r.multiple_dates||'', durationHours:Number(r.duration_hours||0), points:r.points_text||r.points||'', pointsText:r.points_text||String(r.points||''),
  category:r.category||'', feeType:r.fee_type||'Free', feeAmount:r.fee_amount||'', location:r.location||'',
  registrationLink:r.registration_link||r.link||'', imageUrl:r.image_url||'', description:r.description||'', status:r.status||'active', createdAt:r.created_at||''
}}
function activityToDb(a){return {
  title:a.title||'', provider:a.provider||'', activity_type:a.type||'', event_date:a.eventDate||null,
  event_mode:a.eventMode||'single', sessions_json:JSON.stringify(a.sessions||[]),
  start_time:(a.sessions&&a.sessions[0]&&a.sessions[0].start)||'', end_time:(a.sessions&&a.sessions[0]&&a.sessions[0].end)||'',
  multiple_dates:a.multipleDates||activityScheduleTextForDb(a.sessions||[]),
  duration_hours:Number(a.durationHours||0), points_text:String(a.points||a.pointsText||''), points:parseFloat(a.points)||0, category:a.category||'',
  fee_type:a.feeType||'Free', fee_amount:a.feeAmount||'', location:a.location||'',
  registration_link:a.registrationLink||'', image_url:a.imageUrl||'', description:a.description||'', status:a.status||'active'
}}
function fmtActivityDate(d){return d ? new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'Date TBA'}
function activityFee(a){return (String(a.feeType||'').toLowerCase()==='paid') ? (a.feeAmount ? `Paid - ${esc(a.feeAmount)}` : 'Paid') : 'Free'}


function saveSessionUser(u){try{if(u&&u.username)localStorage.setItem('cpd_current_username',u.username)}catch(e){}}
function clearSessionUser(){try{localStorage.removeItem('cpd_current_username')}catch(e){}}
function restoreSessionUser(){try{const username=localStorage.getItem('cpd_current_username');if(!username)return null;return (state.users||[]).find(function(u){return String(u.username).toLowerCase()===String(username).toLowerCase()})||null}catch(e){return null}}

function withTimeout(promise, ms=18000, label='Loading') {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' timed out. Please check connection and retry.')), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

function safeInitialRender() {
  try {
    const reset = new URLSearchParams(location.search).get('reset') === '1';
    if(reset && typeof clearSessionUser === 'function') clearSessionUser();

    const restored = (typeof restoreSessionUser === 'function') ? restoreSessionUser() : null;
    if(restored) {
      current = restored;
      renderShell(current.role === 'admin' ? 'dashboard' : 'profile');
      startNotificationSync();
      return;
    }
    landingView('home');
  } catch(e) {
    console.error('safeInitialRender failed', e);
    try { current = null; if(typeof clearSessionUser === 'function') clearSessionUser(); } catch(_) {}
    try { landingView('home'); } catch(err) { showStartupFailure('Startup error', err.message || String(err)); }
  }
}

function splashLoading(message='Loading CPD Tracker dashboard…') {
  return `<div class="splash-ultra">
    <div class="splash-orb splash-orb-a"></div>
    <div class="splash-orb splash-orb-b"></div>
    <div class="splash-orb splash-orb-c"></div>
    <div class="splash-shell">
      <div class="splash-brand">
        <div class="splash-icon-frame">
          <img class="splash-icon" src="icons/icon-192.png?v=20260510goldv90_clean_rebuild_stable_core" onerror="this.style.display='none'">
        </div>
        <div class="splash-pulse"></div>
      </div>
      <div class="splash-text">
        <h1>CPD Tracker</h1>
        <p>${esc(message)}</p>
      </div>
      <div class="splash-progress"><span></span></div>
      <div class="splash-steps">
        <span>Secure connection</span><i></i><span>Loading dashboard</span><i></i><span>Syncing CPD data</span>
      </div>
      <small>Nursing CPD • West Bay Medicare</small>
      <button id="splashRetryBtn" class="btn ghost splash-retry" onclick="location.href='/?v=20260510goldv90_clean_rebuild_stable_core&reset=1'">Retry / Reset</button>
    </div>
  </div>`;
}

function showSplash(message) {
  try {
    app.innerHTML = splashLoading(message || 'Loading CPD Tracker dashboard…');
    setTimeout(() => {
      const b = document.getElementById('splashRetryBtn');
      if(b) b.style.display = 'inline-flex';
    }, 10000);
  } catch(e) {
    console.error('showSplash failed', e);
  }
}

function showStartupFailure(title,msg) {
  try {
    app.innerHTML = `<div class="splash-ultra">
      <div class="splash-orb splash-orb-a"></div>
      <div class="splash-orb splash-orb-b"></div>
      <div class="splash-shell splash-error">
        <div class="splash-brand"><div class="splash-icon-frame"><img class="splash-icon" src="icons/icon-192.png?v=20260510goldv90_clean_rebuild_stable_core" onerror="this.style.display='none'"></div></div>
        <h1>${esc(title || 'Startup error')}</h1>
        <p>${esc(msg || 'Something went wrong while loading the app.')}</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px">
          <button class="btn" onclick="location.href='/?v=20260510goldv90_clean_rebuild_stable_core&reset=1'">Retry</button>
          <a class="btn ghost" href="/clear-cache.html">Clear Cache</a>
        </div>
      </div>
    </div>`;
  } catch(e) {}
}

window.addEventListener('error',function(e){
  console.error('Global JavaScript error', e.message || e.error || e);
  const html = app?.innerHTML || '';
  if(!current && (html.includes('splash-ultra') || html.trim()==='')) showStartupFailure('JavaScript error',e.message||String(e.error||e));
});
window.addEventListener('unhandledrejection',function(e){
  console.error('Global promise rejection', e.reason || e);
  const html = app?.innerHTML || '';
  if(!current && (html.includes('splash-ultra') || html.trim()==='')) showStartupFailure('Startup error',(e.reason&&e.reason.message)||String(e.reason||e));
});

async function init(){
  showSplash('Loading CPD Tracker dashboard…');
  try{
    if(!window.supabase || !window.supabase.createClient) {
      return showStartupFailure('Supabase library not loaded','Check internet connection and index.html CDN script.');
    }
    const url = window.CPD_SUPABASE_URL;
    const key = window.CPD_SUPABASE_ANON_KEY;
    if(!url || !key || String(url).includes('YOUR_') || String(key).includes('YOUR_')) {
      return showStartupFailure('Connection setup needed','Open supabase-config.js and add Project URL + Publishable key.');
    }
    supabaseClient = window.supabase.createClient(url, key);
    window.supabaseClient = supabaseClient;
    console.log("Supabase config loaded:", url);
    await withTimeout(loadAll(), 18000, 'Database loading');
    dbReady = true;
  }catch(e){
    console.error('Init/loadAll failed', e);
    dbReady = false;
    try{
      state.users = (window.CPD_SEED_USERS || state.users || []);
      Object.assign(state, window.CPD_SEED_SETTINGS || {});
      if(typeof mergeImportedStaffIntoState === 'function') mergeImportedStaffIntoState();
    }catch(seedError){ console.error('Seed fallback failed', seedError); }
  }
  safeInitialRender();
}

async function loadAll(){
  const {data:settings,error:se}=await getDb().from('app_settings').select('*').eq('id','main').maybeSingle();
  if(se) throw se;
  if(settings){
    state.targetTotal = settings.target_total ?? 80;
    state.targetCategory1 = settings.target_category1 ?? 40;
    state.targetCategory23 = settings.target_category23 ?? 40;
    state.reminderMonthsBefore = settings.reminder_months_before ?? 4;
    state.emailSettings = {
      adminEmail: settings.admin_email || '', emailServiceId: settings.email_service_id || '',
      emailTemplateId: settings.email_template_id || '', emailPublicKey: settings.email_public_key || ''
    };
  }
  const {data:users,error:ue}=await getDb().from('staff_cpd').select('*').order('role',{ascending:true}).order('full_name',{ascending:true});
  if(ue) throw ue;
  state.users=(users||[]).map(dbToUser);
  const {data:notifs,error:ne}=await getDb().from('notifications').select('*').order('created_at',{ascending:false});
  if(!ne) state.notifications = notifs || [];
  try{
    const {data:acts,error:ae}=await getDb().from('cpd_activities').select('*').order('event_date',{ascending:true});
    if(!ae) state.activities=(acts||[]).map(dbToActivity);
  }catch(e){console.warn('CPD activities table not ready yet',e);state.activities=[];}
  try{
    const {data:regs,error:re}=await getDb().from('cpd_activity_registrations').select('*').order('registered_at',{ascending:false});
    if(!re) state.activityRegistrations=regs||[];
  }catch(e){console.warn('CPD registrations table not ready yet',e);state.activityRegistrations=[];}
  mergeImportedStaffIntoState();

}


function mergeImportedStaffIntoState(){
  // If Supabase is empty or unavailable, show uploaded Excel staff data locally.
  if((state.users||[]).filter(u=>u.role==='staff').length === 0 && Array.isArray(window.CPD_IMPORTED_STAFF)){
    state.users = [
      ...(state.users||[]).filter(u=>u.role==='admin'),
      ...window.CPD_IMPORTED_STAFF.map((u,i)=>({...u,id:u.id||('excel-staff-'+i)}))
    ];
  }
}



function visibleUnreadNotifications(){ return visibleNotifications().filter(n => (n.status||'unread')==='unread' && !n.read && !n.is_read); }
function notificationOwnerLabel(n){
  if(current?.role !== 'admin') return current?.username || '';
  return n.username || n.staff_username || n.recipient_username || n.staff_id || '';
}
function smartInsightsForUser(u){
  const pct = Math.min(100, Math.round((total(u)/(state.targetTotal||80))*100));
  const insights = [];
  const m = monthsUntil(u.dhpExpiry);
  if(!u.dhpExpiry) insights.push({level:'danger',title:'Missing DHP expiry',text:'Please update your DHP license expiry date.'});
  else if(m !== null && m < 0) insights.push({level:'danger',title:'DHP expired',text:'Your DHP license expiry date has passed.'});
  else if(m !== null && m <= state.reminderMonthsBefore) insights.push({level:'warn',title:'DHP renewal soon',text:`DHP renewal is due within ${m} month(s).`});
  if(pct < 50) insights.push({level:'warn',title:'Low CPD progress',text:`Current CPD progress is ${pct}%. More CPD points are recommended.`});
  if(Number(u.category1||0) < state.targetCategory1) insights.push({level:'info',title:'Category 1 target pending',text:`Category 1: ${Number(u.category1||0)}/${state.targetCategory1}.`});
  if(Number(u.category23||0) < state.targetCategory23) insights.push({level:'info',title:'Category 2&3 target pending',text:`Category 2&3: ${Number(u.category23||0)}/${state.targetCategory23}.`});
  if(!insights.length) insights.push({level:'good',title:'On track',text:'CPD and DHP profile look on track.'});
  return insights;
}
function smartInsightsPanel(){
  if(!current) return '';
  const users = current.role === 'admin' ? activeStaff() : [current];
  const atRisk = users.filter(u => Math.round((total(u)/(state.targetTotal||80))*100) < 50).length;
  const missingDhp = users.filter(u => !u.dhpExpiry).length;
  const renewalSoon = users.filter(u => {const m=monthsUntil(u.dhpExpiry); return m !== null && m >= 0 && m <= state.reminderMonthsBefore;}).length;
  if(current.role === 'admin'){
    return `<div class="smart-alert-panel">
      <div class="smart-alert-head">
        <h2>Leadership Focus</h2>
        ${state.smartReportFilter ? `<button class="btn ghost small" onclick="CPD.clearSmartFilter()">Clear Smart Filter</button>` : ''}
      </div>
      <div class="smart-alert-grid">
        <button class="smart-alert-card warn ${state.smartReportFilter==='atRisk'?'active':''}" onclick="CPD.applySmartFilter('atRisk')"><b>${atRisk}</b><span>At-risk staff below 50%</span><small>Click to view staff</small></button>
        <button class="smart-alert-card danger ${state.smartReportFilter==='missingDhp'?'active':''}" onclick="CPD.applySmartFilter('missingDhp')"><b>${missingDhp}</b><span>Missing DHP expiry</span><small>Click to view staff</small></button>
        <button class="smart-alert-card info ${state.smartReportFilter==='renewalSoon'?'active':''}" onclick="CPD.applySmartFilter('renewalSoon')"><b>${renewalSoon}</b><span>DHP renewal soon</span><small>Click to view staff</small></button>
      </div>
      ${state.smartReportFilter ? `<div class="smart-filter-note">Showing: ${state.smartReportFilter==='atRisk'?'At-risk staff below 50%':state.smartReportFilter==='missingDhp'?'Staff missing DHP expiry':'Staff with DHP renewal soon'}</div>` : ''}
    </div>`;
  }
  const insights = smartInsightsForUser(current);
  return `<div class="smart-alert-panel">
    <h2>My Leadership Focus</h2>
    ${insights.map(i=>`<div class="smart-alert-line ${i.level}"><b>${esc(i.title)}</b><span>${esc(i.text)}</span></div>`).join('')}
  </div>`;
}

function monthsUntil(dateStr){ if(!dateStr) return null; const d=new Date(dateStr+'T00:00:00'); if(isNaN(d)) return null; const n=new Date(); return (d.getFullYear()-n.getFullYear())*12 + (d.getMonth()-n.getMonth()) + ((d.getDate()-n.getDate())/31); }
function daysUntil(dateStr){ if(!dateStr) return null; const d=new Date(dateStr+'T00:00:00'); if(isNaN(d)) return null; return Math.ceil((d - new Date())/86400000); }
function categoryStatus(u){ if(isTrainee(u)) return {c1Remain:'Not required now',c23Remain:'Not required now',totalRemain:'Not required now'}; const c1Remain=Math.max(0,state.targetCategory1-Number(u.category1||0)); const c23Remain=Math.max(0,state.targetCategory23-Number(u.category23||0)); return {c1Remain,c23Remain,totalRemain:Math.max(0,state.targetTotal-total(u))}; }
function status(u){ if(isTrainee(u)) return ['NO CPD Required Now','trainee']; const m=monthsUntil(u.dhpExpiry); if(m!==null&&m<0) return ['DHP Expired','bad']; if(m!==null&&m<=state.reminderMonthsBefore) return ['DHP Renewal Soon','warn']; if(total(u)>=state.targetTotal) return ['Completed','good']; return ['In Progress','info']; }

function landingNav(active='home'){return `<div class="topnav">
  <button class="${active==='home'?'active':''}" onclick="landingView('home')">Home</button>
  <button class="${active==='login'?'active':''}" onclick="landingView('login')">Login</button>
  <button class="${active==='about'?'active':''}" onclick="landingView('about')">About</button>
  <button class="${active==='activities'?'active':''}" onclick="landingView('activities')">CPD Activities</button>
  <button class="${active==='diya'?'active':''}" onclick="landingView('diya')">About Diya</button>
</div>`}
function landingView(tab='home'){
  if(tab==='login') return loginView();
  if(tab==='about') return aboutView();
  if(tab==='activities') return publicActivitiesView();
  if(tab==='diya') return diyaView();
  app.innerHTML = `<div class="landing">${landingNav('home')}
    <section class="hero">
      <div class="hero-left"><div class="orb one"></div><div class="orb two"></div><div class="glass">
        <span class="pill">♡ CPD Tracker</span><h1>Track CPD Progress <span>Beautifully.</span></h1>
        <div class="author-info"><p class="author-name">Diya Milhem</p><p>Head of Nursing Department</p><p>West Bay Medicare, Qatar-Doha</p></div>
        <p class="lead">One unified dashboard for DHP renewal dates, CPD points, staff progress, reports, and smart reminders.</p>
        <div class="hero-cards"><div class="mini-card">🎯<b>Track</b><span>CPD & DHP in one place</span></div><div class="mini-card">🔔<b>Stay</b><span>Updated with reminders</span></div><div class="mini-card">📊<b>Monitor</b><span>Staff progress effortlessly</span></div></div>
      </div></div>
      <div class="hero-right"><div class="login-card cpd-login-card"><div class="cpd-login-logo"><img src="icons/icon-192.png?v=20260510goldv90_clean_rebuild_stable_core" alt="CPD Tracker"></div><span class="pill">CPD Monitor</span><h2>Welcome back</h2><p class="muted">Please sign in to continue.</p><button class="btn login-btn" style="width:100%;margin-top:20px" onclick="landingView('login')">Login</button></div></div>
    </section>
    <section class="landing-section"><h2 class="section-title">Everything you need, in one simple platform.</h2><p class="muted" style="text-align:center">Designed for Nursing Leaders. Built for Results.</p>
      <div class="feature-grid"><div class="feature"><div class="ico">📅</div><h3>DHP Renewal Monitoring</h3><p class="muted">Stay ahead of expirations.</p></div><div class="feature"><div class="ico">🏆</div><h3>CPD Points Tracking</h3><p class="muted">Track Category 1, 2 & 3 points.</p></div><div class="feature"><div class="ico">👥</div><h3>Staff Progress Overview</h3><p class="muted">See progress across your team.</p></div><div class="feature"><div class="ico">📊</div><h3>Reports & Analytics</h3><p class="muted">Generate reports quickly.</p></div><div class="feature"><div class="ico">🔔</div><h3>Smart Reminders</h3><p class="muted">Automated alerts keep everyone on track.</p></div></div>
      <div class="bottom-strip"><h2>Empower your team.<br>Ensure compliance. Elevate care.</h2><div><b class="gold">CPD Tracker</b><br><span class="muted">Continuous Professional Development, Made Simple.</span></div></div>
      <div class="footer-icons"><div>🛡️ Secure & Reliable</div><div>☁️ Cloud Based</div><div>📱 Access Anywhere</div><div>👥 Built for Healthcare</div></div>
    </section></div>`;
}

function publicActivitiesView(){
  const acts=sortActivitiesByNearest((state.activities||[]).filter(a=>a.status!=='inactive'));
  app.innerHTML=`<div class="landing">${landingNav('activities')}
    <section class="activities-public">
      <div class="activities-hero-card">
        <span class="pill">📚 CPD Activities</span>
        <h1>Upcoming CPD Activities</h1>
        <p class="lead">Explore workshops, webinars, seminars, courses and learning opportunities relevant to nursing CPD in Qatar.</p>
      </div>
      ${acts.length?`<div class="activity-grid public-grid">${sortActivitiesByNearest(acts).map(activityCard).join('')}</div>`:`<div class="card empty-activities"><h2>No activities listed yet</h2><p class="muted">Upcoming CPD activities will appear here once added by the admin.</p></div>`}
    </section>
  </div>`;
}

function sortActivitiesByNearest(list){
  const today=new Date(); today.setHours(0,0,0,0);
  return [...(list||[])].sort((a,b)=>{
    const ad=firstActivityDate(a); const da=ad?new Date(ad+'T00:00:00'):new Date('9999-12-31');
    const bd=firstActivityDate(b); const db=bd?new Date(bd+'T00:00:00'):new Date('9999-12-31');
    const aPast=da<today, bPast=db<today;
    if(aPast!==bPast) return aPast?1:-1;
    return da-db;
  });
}

function normalizeExternalUrl(url){
  let u = String(url || '').trim();
  if(!u) return '';
  u = u.replace(/\s+/g,'');
  if(/^mailto:/i.test(u) || /^tel:/i.test(u) || /^https?:\/\//i.test(u)) return u;
  if(/^www\./i.test(u)) return 'https://' + u;
  if(/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(u)) return 'https://' + u;
  return u;
}
function openExternalUrl(url){
  const u = normalizeExternalUrl(url);
  if(!u){ toast('No registration link available'); return; }
  const w = window.open(u, '_blank');
  if(!w){ window.location.href = u; }
}
function parseActivitySessions(a){
  if(Array.isArray(a.sessions)) return a.sessions;
  const raw = a.sessionsJson || a.sessions_json || "";
  if(raw){
    try{
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if(Array.isArray(parsed)) return parsed;
    }catch(e){}
  }
  if(a.eventDate || a.startTime || a.endTime) return [{date:a.eventDate||"", start:a.startTime||"", end:a.endTime||""}];
  return [];
}
function sessionsToText(sessions){
  const list = (sessions||[]).filter(function(s){ return s && (s.date || s.start || s.end); });
  if(!list.length) return "Date TBA";
  return list.map(function(s,i){
    const d = s.date ? fmtActivityDate(s.date) : "Date TBA";
    const t = [s.start,s.end].filter(Boolean).join(" - ");
    return (list.length>1 ? ("Day " + (i+1) + ": ") : "") + d + (t ? (" • " + t) : "");
  }).join("\n");
}
function activityDatesText(a){
  const sessions = parseActivitySessions(a);
  if(sessions.length) return sessionsToText(sessions);
  if(a.multipleDates && String(a.multipleDates).trim()) return String(a.multipleDates).trim();
  return fmtActivityDate(a.eventDate);
}
function firstActivityDate(a){
  const sessions = parseActivitySessions(a).filter(function(s){ return s.date; });
  return sessions.length ? sessions[0].date : (a.eventDate || "");
}
function activityPointsText(a){
  return esc(a.pointsText || a.points || 0);
}
function getActivitySessionsFromForm(){
  const mode = document.getElementById("aEventMode")?.value || "single";
  if(mode === "single"){
    return [{date:document.getElementById("aDate")?.value || "", start:document.getElementById("aStartTime")?.value || "", end:document.getElementById("aEndTime")?.value || ""}].filter(function(s){return s.date || s.start || s.end;});
  }
  return Array.from(document.querySelectorAll(".session-row")).map(function(row){
    return {date:row.querySelector(".session-date")?.value || "", start:row.querySelector(".session-start")?.value || "", end:row.querySelector(".session-end")?.value || ""};
  }).filter(function(s){return s.date || s.start || s.end;});
}
function sessionRowHtml(n,s){
  s = s || {date:"", start:"", end:""};
  return '<div class="session-row">' +
    '<div class="session-label">Session ' + n + '</div>' +
    '<div class="field"><label>Date</label><input class="session-date" type="date" value="' + esc(s.date||"") + '"></div>' +
    '<div class="field"><label>Start</label><input class="session-start" type="time" value="' + esc(s.start||"") + '"></div>' +
    '<div class="field"><label>End</label><input class="session-end" type="time" value="' + esc(s.end||"") + '"></div>' +
    (n>1 ? '<button type="button" class="btn ghost small remove-session" onclick="this.parentElement.remove();CPD.renumberSessions()">Remove</button>' : '') +
  '</div>';
}
function renderSessionRows(mode,sessions){
  mode = mode || "single";
  sessions = sessions || [];
  const wrap = document.getElementById("sessionRows");
  const addBtn = document.getElementById("addSessionBtn");
  if(!wrap) return;
  let list = sessions.length ? sessions : [{date:"", start:"", end:""}];
  if(mode === "multiple" && list.length < 2) list = [...list, {date:"", start:"", end:""}];
  if(mode === "single"){
    wrap.innerHTML = '<div class="session-row single">' +
      '<div class="field"><label>Date</label><input class="session-date" id="aDate" type="date" value="' + esc(list[0].date||"") + '"></div>' +
      '<div class="field"><label>Start Time</label><input class="session-start" id="aStartTime" type="time" value="' + esc(list[0].start||"") + '"></div>' +
      '<div class="field"><label>End Time</label><input class="session-end" id="aEndTime" type="time" value="' + esc(list[0].end||"") + '"></div>' +
    '</div>';
    if(addBtn) addBtn.style.display = "none";
  }else{
    wrap.innerHTML = list.map(function(s,i){ return sessionRowHtml(i+1,s); }).join("");
    if(addBtn) addBtn.style.display = "";
  }
}
function setActivityMode(mode,sessions){
  renderSessionRows(mode,sessions || getActivitySessionsFromForm());
}
function activityScheduleTextForDb(sessions){
  return sessionsToText(sessions || []);
}


function activityCard(a){
  const registrations=state.activityRegistrations.filter(r=>r.activity_id===a.id).length;
  const poster = a.imageUrl ? `<div class="activity-poster-wrap" onclick="CPD.viewActivity('${a.id}')"><img class="activity-poster" src="${esc(a.imageUrl)}" alt="${esc(a.title)} poster" onerror="this.parentElement.style.display='none'"></div>` : '';
  return `<div class="activity-card">
    ${poster}
    <div class="activity-top"><span class="activity-type">${esc(a.type||'CPD Activity')}</span><span class="activity-fee ${String(a.feeType).toLowerCase()==='paid'?'paid':'free'}">${activityFee(a)}</span></div>
    <h3 class="activity-title-click" onclick="CPD.viewActivity('${a.id}')">${esc(a.title)}</h3>
    <p class="muted">${esc(a.provider||'')}</p>
    <div class="activity-meta"><span>📅 ${esc(activityDatesText(a))}</span>${(a.eventMode||'single')==='multiple'?`<span>🗓️ Multiple sessions</span>`:'' }<span>⏱️ ${a.durationHours||0} hours</span><span>⭐ ${activityPointsText(a)}</span><span>🏷️ ${esc(a.category||'Category TBA')}</span><span>📍 ${esc(a.location||'Online / TBA')}</span></div>
    ${a.description?`<p>${esc(a.description)}</p>`:''}
    <div class="activity-actions">
      <button class="btn small" onclick="CPD.viewActivity('${a.id}')">View Details</button>
      ${a.registrationLink?`<button class="btn small" onclick="CPD.registerActivity('${a.id}',true)">Register & Open Link</button>`:`<button class="btn small" onclick="CPD.registerActivity('${a.id}',false)">I'm Interested</button>`}
      ${current?.role==='admin'?`<button class="btn ghost small" onclick="CPD.openActivityModal('${a.id}')">Edit</button>`:''}
    </div>
  </div>`
}

function aboutView(){app.innerHTML=`<div class="landing">${landingNav('about')}<section class="about-page"><div class="about-card"><h1>About the CPD Tracker</h1><p class="lead">CPD Tracker is a synchronized monitoring platform designed to help nursing teams stay prepared for DHP renewal and professional development compliance.</p><div class="feature-grid"><div class="feature"><div class="ico">🎯</div><h3>Purpose</h3><p class="muted">Centralize staff CPD, DHP expiry, and renewal readiness.</p></div><div class="feature"><div class="ico">👩‍⚕️</div><h3>For Staff</h3><p class="muted">Clear profile view, progress status, and reminders.</p></div><div class="feature"><div class="ico">🧑‍💼</div><h3>For Admin</h3><p class="muted">Live overview, staff management, and reports.</p></div><div class="feature"><div class="ico">🔄</div><h3>Synchronization</h3><p class="muted">Updates are stored in Supabase and visible across devices.</p></div><div class="feature"><div class="ico">🔔</div><h3>Alerts</h3><p class="muted">Email and in-system notifications support proactive follow-up.</p></div></div><button class="btn" onclick="landingView('login')">Login to System</button></div></section></div>`}
function diyaView(){
  app.innerHTML=`<div class="landing diya-landing">${landingNav('diya')}
    <section class="diya-linkedin-page">
      <div class="diya-profile-card">
        <div class="diya-cover"></div>
        <div class="diya-profile-top">
          <img class="diya-avatar" src="diya.jpg" alt="Diya Milhem">
          <div class="diya-title-block">
            <h1>Diya <span>Milhem</span></h1>
            <h2>Head of Nursing Department</h2>
            <h3>Healthcare Quality & IPC Leader</h3>
            <div class="diya-badges">
              <span>MPH Holder</span>
              <span>IPC Leader</span>
              <span>Nursing Leadership</span>
            </div>
          </div>
          <a class="whatsapp-action" href="https://wa.me/97466852603?text=Hello%20Diya%2C%20I%20would%20like%20to%20connect%20regarding%20CPD%20Tracker." target="_blank" rel="noopener">💬 Contact via WhatsApp</a>
        </div>

        <div class="diya-profile-body">
          <div class="diya-main">
            <div class="diya-panel">
              <h2>About Diya</h2>
              <p>Diya Milhem is a nursing leader with extensive experience in managing nursing services, infection prevention programs, healthcare quality improvement, staff development, and clinical operations across outpatient clinics, CSSD, operating theatre, and inpatient services.</p>
              <p>He has a strong background in KPIs, accreditation, competencies, patient safety, risk management, and MOPH-aligned policy development.</p>
            </div>

            <div class="diya-panel">
              <h2>Why I created this system</h2>
              <p>CPD Tracker was created to support nursing staff in monitoring professional development progress, DHP renewal readiness, and CPD compliance in one simple, synchronized, and accessible platform.</p>
            </div>

            <div class="diya-panel">
              <h2>Core Focus Areas</h2>
              <div class="diya-focus-grid">
                <div class="diya-focus">🛡️<b>Infection Prevention & Control</b><span>IPC programs, surveillance, compliance</span></div>
                <div class="diya-focus">🏆<b>Healthcare Quality & Accreditation</b><span>KPIs, audits, policies, standards</span></div>
                <div class="diya-focus">👥<b>Nursing Leadership & Operations</b><span>Staffing, performance, governance</span></div>
                <div class="diya-focus">⚕️<b>Patient Safety & Risk Management</b><span>Incident review, RCA, safe care</span></div>
              </div>
            </div>

            <div class="diya-panel">
              <h2>Professional Experience</h2>
              <div class="timeline">
                <div><b>Head of Nursing Department – West Bay Medicare</b><span>2019 – Present | Doha, Qatar</span></div>
                <div><b>Charge Nurse – Primary Health Care Corporation (PHCC)</b><span>2018 | Doha, Qatar</span></div>
                <div><b>Staff Nurse / CNE Coordinator / Team Leader – PHCC</b><span>2015 – 2018 | Doha, Qatar</span></div>
                <div><b>Charge Nurse – Emergency Department</b><span>2011 – 2015 | Jordan</span></div>
              </div>
            </div>
          </div>

          <aside class="diya-sidebar-card">
            <h2>Contact Information</h2>
            <div class="contact-row">📧 <span>d.milhem@westbaymedicare.com</span></div>
            <div class="contact-row">📱 <span>+974 66852603</span></div>
            <div class="contact-row">☎ <span>Office: +974 4020 6336</span></div>
            <div class="contact-row">📠 <span>Fax: +974 4020 6339</span></div>
            <div class="contact-row">📍 <span>West Bay Medicare, Doha – Qatar</span></div>
            <a class="whatsapp-full" href="https://wa.me/97466852603?text=Hello%20Diya%2C%20I%20would%20like%20to%20connect%20regarding%20CPD%20Tracker." target="_blank" rel="noopener">Contact via WhatsApp</a>

            <h2 style="margin-top:24px">Education</h2>
            <div class="mini-list"><b>Master of Public Health (MPH)</b><span>University of Jordan</span></div>
            <div class="mini-list"><b>Bachelor of Science in Nursing (BSc)</b><span>Hashemite University</span></div>

            <h2 style="margin-top:24px">Core Values</h2>
            <div class="value-tags"><span>Compassion</span><span>Integrity</span><span>Excellence</span><span>Teamwork</span><span>Impact</span></div>
          </aside>
        </div>
      </div>
    </section>
  </div>`;
}
function loginView(){app.innerHTML=`<div class="landing">${landingNav('login')}<section class="hero"><div class="hero-left"><div class="orb one"></div><div class="orb two"></div><div class="glass"><span class="pill">♡ CPD Tracker</span><h1>Track CPD Progress <span>Beautifully.</span></h1><div class="author-info"><p class="author-name">Diya Milhem</p><p>Head of Nursing Department</p><p>West Bay Medicare, Qatar-Doha</p></div><p class="lead">One synchronized dashboard for DHP renewal dates, Category 1 points, Category 2&3 points, staff progress, reports, and reminders.</p><div class="hero-cards"><div class="mini-card">🎯<b>CPD</b><span>80 Points</span></div><div class="mini-card">📅<b>DHP</b><span>Renewal alerts</span></div><div class="mini-card">📊<b>Reports</b><span>Admin view</span></div></div></div></div><div class="hero-right"><div class="login-card cpd-login-card"><div class="cpd-login-logo"><img src="icons/icon-192.png?v=20260510goldv90_clean_rebuild_stable_core" alt="CPD Tracker"></div><span class="pill">CPD Monitor</span><h2>Welcome back</h2><p class="muted">Please sign in to continue.</p><form id="loginForm"><div class="field"><label>Username</label><input id="username" autocomplete="username" required></div><div class="field"><label>Password</label><input id="password" type="password" autocomplete="current-password" required></div><button class="btn login-btn" style="width:100%" type="submit">Login</button><button type="button" class="forgot-link" onclick="forgotPasswordModal()">Forgot Password?</button><div id="loginMsg"></div></form></div></div></section></div>`;document.getElementById('loginForm').onsubmit=async e=>{e.preventDefault();const u=document.getElementById('username').value.trim().toLowerCase(),p=document.getElementById('password').value;try{await loadAll()}catch(err){console.error("Login loadAll failed:",err);document.getElementById("loginMsg").innerHTML="<div class=\"msg\">Could not connect to Supabase. Please check supabase-config.js and Netlify deploy.<\/div>";return}const user=state.users.find(x=>String(x.username).toLowerCase()===u && String(x.password)===p && x.active!==false);if(!user){document.getElementById('loginMsg').innerHTML='<div class="msg">Invalid username or password.</div>';return}current=user;saveSessionUser(current);
try{
  const now=new Date().toISOString();
  current.lastLogin=now;
  const payload={last_login:now, updated_at:todayISO()};
  await getDb().from('staff_cpd').update(payload).eq('id',current.id);
}catch(e){console.warn('Could not update last login',e)}
if(current.role==='staff'&&current.password==='1234'){changePasswordModal(true);startNotificationSync()}else{renderShell(current.role==='admin'?'dashboard':'profile');startNotificationSync();await checkAndSendAlerts();}}}


function safeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function forgotPasswordModal(){
  const html=`<div class="modal"><div class="modal-card reset-card reset-card-v57">
    <button class="reset-back-btn" onclick="closeModal()">← Back to Login</button>
    <div id="resetStepOne" class="reset-step active">
      <div class="reset-mobile-helper">Forgot your password? Request a reset code, then continue to set a new password.</div>
      <div class="reset-head">
        <div class="reset-icon">🔐</div>
        <div>
          <h2>Password Reset</h2>
          <p class="muted">Enter your username or registered email. A reset code will be sent to the registered email. If no email is saved, it will be sent to the administrator.</p>
        </div>
      </div>
      <form id="resetRequestForm">
        <div class="field"><label>Username or Email</label><input id="resetIdentifier" placeholder="e.g. d.milhem or email@domain.com" autocomplete="username"></div>
        <button class="btn login-btn" style="width:100%" type="submit" id="sendResetBtn">Send Reset Code</button>
        <div id="resetMsg"></div>
      </form>
    </div>
    <div id="resetStepTwo" class="reset-step">
      <div class="reset-head">
        <div class="reset-icon success">✅</div>
        <div>
          <h2>Enter Reset Code</h2>
          <p class="muted">Enter the reset code received and choose your new password.</p>
        </div>
      </div>
      <div class="success-panel">✅ Code sent successfully. Please check the registered email or admin email.</div>
      <form id="resetConfirmForm">
        <div class="field"><label>Reset Code</label><input id="resetCode" placeholder="6-digit code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div>
        <div class="field"><label>New Password</label><input id="newResetPassword" type="password" placeholder="Enter your new password" autocomplete="new-password"></div>
        <button class="btn login-btn" style="width:100%" type="submit">Set New Password</button>
        <button class="btn soft-btn" style="width:100%;margin-top:10px" type="button" onclick="showResetStep(1)">← Change username/email</button>
        <div id="resetConfirmMsg"></div>
      </form>
    </div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  document.getElementById('resetRequestForm').onsubmit=requestPasswordReset;
  document.getElementById('resetConfirmForm').onsubmit=confirmPasswordReset;
}

function showResetStep(step){
  const one=document.getElementById('resetStepOne');
  const two=document.getElementById('resetStepTwo');
  if(!one || !two) return;
  one.classList.toggle('active', step===1);
  two.classList.toggle('active', step===2);
}
async function requestPasswordReset(e){
  e.preventDefault();
  const identifier=document.getElementById('resetIdentifier').value.trim();
  const box=document.getElementById('resetMsg');
  const btn=document.getElementById('sendResetBtn');
  if(!identifier){ box.innerHTML='<div class="msg">❌ Please enter your username or registered email.</div>'; return; }
  btn.disabled=true; btn.textContent='Sending...';
  box.innerHTML='<div class="msg info">Sending reset code...</div>';
  try{
    const res=await fetch('/.netlify/functions/request-password-reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'Could not send reset code');
    box.innerHTML='<div class="msg success">✅ Code sent successfully.</div>';
    setTimeout(()=>showResetStep(2),450);
  }catch(err){
    box.innerHTML='<div class="msg">❌ Error: '+safeHtml(err.message||err)+'</div>';
  }finally{
    btn.disabled=false; btn.textContent='Send Reset Code';
  }
}

async function confirmPasswordReset(e){
  e.preventDefault();
  const identifier=document.getElementById('resetIdentifier').value.trim();
  const code=document.getElementById('resetCode').value.trim();
  const newPassword=document.getElementById('newResetPassword').value;
  const box=document.getElementById('resetConfirmMsg');
  if(!code || code.length<6){ box.innerHTML='<div class="msg">❌ Please enter the 6-digit reset code.</div>'; return; }
  if(!newPassword || newPassword.length<4){ box.innerHTML='<div class="msg">❌ Please enter a new password.</div>'; return; }
  box.innerHTML='<div class="msg info">Updating password...</div>';
  try{
    const res=await fetch('/.netlify/functions/confirm-password-reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,code,newPassword})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'Could not reset password');
    box.innerHTML='<div class="msg success">✅ Password updated successfully. Click Back to Login and sign in with your new password.</div>';
  }catch(err){
    box.innerHTML='<div class="msg">❌ Error: '+safeHtml(err.message||err)+'</div>';
  }
}



function getSiteClockParts(){
  const now=new Date();
  return {
    time: now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}),
    date: now.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})
  };
}
function siteClockWidget(){
  const c=getSiteClockParts();
  return `<div class="site-clock" aria-label="Current date and time"><span class="site-clock-icon">🕒</span><span class="site-clock-text"><b id="siteClockTime">${c.time}</b><small id="siteClockDate">${c.date}</small></span></div>`;
}
function updateSiteClock(){
  try{
    const now=new Date();
    const timeEl=document.getElementById('siteClockTime');
    const dateEl=document.getElementById('siteClockDate');
    if(!timeEl||!dateEl) return;
    timeEl.textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    dateEl.textContent=now.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  }catch(e){}
}
let siteClockTimer=null;
function startSiteClock(){
  updateSiteClock();
  if(siteClockTimer) clearInterval(siteClockTimer);
  siteClockTimer=setInterval(updateSiteClock,1000);
}

function navButton(route,icon,label){return `<button class="${currentRoute===route?'active':''}" onclick="renderShell('${route}')">${icon} ${label}</button>`}

async function cleanLogout(){
  try{ stopNotificationSync(); }catch(e){}
  try{ if(window.supabaseClient?.auth?.signOut) await window.supabaseClient.auth.signOut(); }catch(e){}
  try{ if(window.supabase?.auth?.signOut) await window.supabase.auth.signOut(); }catch(e){}
  try{ current = null; }catch(e){}
  try{ if(typeof currentUser !== 'undefined') currentUser = null; }catch(e){}
  try{ if(state) state.currentUser = null; }catch(e){}
  try{ clearSessionUser(); }catch(e){}
  try{
    Object.keys(localStorage).forEach(k=>{
      if(/cpd_current_username|supabase|sb-|auth|session|current/i.test(k)) localStorage.removeItem(k);
    });
  }catch(e){}
  try{ sessionStorage.clear(); }catch(e){}
  try{ landingView('home'); }catch(e){ location.href = location.pathname + '?v=20260510goldv90_clean_rebuild_stable_core#home'; }
}

function renderShell(route='dashboard'){
  if(current?.role!=='admin' && ['dashboard','staff','reminders','email'].includes(route)) route='profile';
  currentRoute=route;
  const displayName = current?.fullName || current?.username || 'User';
  const adminNav = current?.role==='admin'
    ? `${navButton('dashboard','🏠','Dashboard')}${navButton('staff','👥','Staff')}${navButton('reports','📊','Reports')}${navButton('reminders','🔔','Reminders')}${navButton('email','⚙️','Email Settings')}`
    : `${navButton('reports','📊','Reports')}`;
  app.innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand cpd-brand"><div class="logo cpd-logo-img"><img src="icons/icon-192.png?v=20260510goldv90_clean_rebuild_stable_core" alt="CPD Tracker"></div><div><b>CPD Tracker</b><div class="muted" style="font-size:12px">CPD Leadership Dashboard</div><div class="muted" style="font-size:11px">${esc(displayName)}</div></div></div>${siteClockWidget()}<nav class="nav">${adminNav}${navButton('activities','📚','CPD Activities')}${navButton('notification-settings','🔊','Notification Settings')}${navButton('profile','🙋','My Profile')}<button class="logout stable-logout-btn" onclick="cleanLogout();return false;">🚪 Logout</button></nav></aside><main class="main"><div id="view"></div></main></div>`;
  renderRoute();
  startSiteClock();
}


function pageHead(title,subtitle,buttons=''){return `<div class="page-head"><div><h1>${title}</h1><p class="muted">${subtitle}</p></div><div class="actions">${notificationBell()}${buttons}<button class="btn ghost" onclick="CPD.refresh()">Refresh</button></div></div>`}

async function createInAppNotification(user, type, message, extra={}){
  try{
    if(!user || !user.id) return;
    const nowIso = new Date().toISOString();
    const row={
      // user_id is the actual recipient used by the current app and older database schema.
      user_id:user.id,
      // These fields keep the notification readable and future-proof if the Supabase table is upgraded.
      recipient_user_id:user.id,
      recipient_username:user.username || '',
      recipient_role:user.role || 'staff',
      sender_username:current?.username || 'system',
      staff_id:extra.staff_id || user.id,
      staff_name:extra.staff_name || user.fullName || user.username || '',
      username:extra.username || user.username || '',
      type:type,
      title:extra.title || type,
      message:message,
      status:'unread',
      is_read:false,
      created_at:nowIso
    };
    const {error}=await getDb().from('notifications').insert(row);
    if(error){
      // Fallback for older notifications table that has only the legacy columns.
      const legacy={user_id:row.user_id,staff_id:row.staff_id,staff_name:row.staff_name,username:row.username,type:row.type,message:row.message,status:'unread',created_at:nowIso};
      const {error:legacyError}=await getDb().from('notifications').insert(legacy);
      if(legacyError) throw legacyError;
    }
  }catch(e){console.warn('Notification helper failed', e);}
}
async function notifyStaffAboutActivity(activityTitle){
  const staff=(state.users||[]).filter(u=>u.role==='staff' && u.active!==false);
  await Promise.all(staff.map(u=>createInAppNotification(u,'New CPD Activity',`New CPD activity added to your profile: ${activityTitle||'Untitled activity'}`,{staff_id:u.id,staff_name:u.fullName,username:u.username,title:'New CPD Activity'})));
  await refreshNotificationsOnly(false);
}
async function notifyAdminsAboutProfileUpdate(staffUser){
  if(!staffUser || staffUser.role!=='staff') return;
  const admins=(state.users||[]).filter(u=>u.role==='admin' && u.active!==false);
  await Promise.all(admins.map(a=>createInAppNotification(a,'Staff Profile Updated',`${staffUser.fullName||staffUser.username} updated My Profile`,{staff_id:staffUser.id,staff_name:staffUser.fullName,username:staffUser.username,title:'Staff Profile Updated'})));
  await refreshNotificationsOnly(false);
}

let notificationSyncStarted=false;
let notificationSyncTimer=null;
let notificationRealtimeChannel=null;
async function refreshNotificationsOnly(updateUi=true){
  try{
    if(!current || !dbReady) return;
    const {data,error}=await getDb().from('notifications').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    state.notifications=data||[];
    if(updateUi){
      const overlay=document.getElementById('goldNotifOverlay');
      const currentBell=document.querySelector('.notif-bell');
      if(overlay) goldRenderNotifications();
      else if(currentBell) renderRoute();
      watchNewNotificationsForSound();
    }
  }catch(e){console.warn('Notification refresh failed', e);}
}
function startNotificationSync(){
  try{
    if(notificationSyncStarted || !current || !window.supabaseClient) return;
    notificationSyncStarted=true;
    refreshNotificationsOnly(false);
    if(notificationSyncTimer) clearInterval(notificationSyncTimer);
    notificationSyncTimer=setInterval(()=>refreshNotificationsOnly(true),12000);
    try{
      notificationRealtimeChannel=window.supabaseClient
        .channel('cpd-notifications-live-'+String(current.id||current.username||Date.now()))
        .on('postgres_changes',{event:'*',schema:'public',table:'notifications'},payload=>{
          refreshNotificationsOnly(true);
        })
        .subscribe();
    }catch(rtErr){console.warn('Realtime notifications fallback polling active', rtErr);}
  }catch(e){console.warn('Notification sync start failed', e);}
}
function stopNotificationSync(){
  try{notificationSyncStarted=false;if(notificationSyncTimer) clearInterval(notificationSyncTimer);notificationSyncTimer=null;if(notificationRealtimeChannel&&window.supabaseClient) window.supabaseClient.removeChannel(notificationRealtimeChannel);notificationRealtimeChannel=null;}catch(e){}
}

function notifSoundEnabled(){return localStorage.getItem('cpd_notification_sound_enabled') === 'true';}
function setNotifSoundEnabled(v){localStorage.setItem('cpd_notification_sound_enabled', v ? 'true' : 'false');}
function playNotificationSound(){
  try{
    if(!notifSoundEnabled()) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!AudioContext) return;
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.10, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.3);
  }catch(e){}
}
let goldLastUnreadCount = null;
function watchNewNotificationsForSound(){
  try{
    const unread = visibleNotifications().filter(x=>(x.status||'unread')==='unread').length;
    if(goldLastUnreadCount===null){goldLastUnreadCount=unread;return;}
    if(unread>goldLastUnreadCount) playNotificationSound();
    goldLastUnreadCount=unread;
  }catch(e){}
}
setInterval(watchNewNotificationsForSound, 2500);

function notificationBell(){
  const n=visibleUnreadNotifications().length;
  return `<button class="notif-bell" onclick="goldToggleNotifications();return false;">🔔${n?`<span class="notif-count">${n}</span>`:''}</button>`;
}
function notificationBox(){return '';}
function goldToggleNotifications(){
  const existing=document.getElementById('goldNotifOverlay');
  if(existing){existing.remove();return;}
  goldRenderNotifications();
}
function goldCloseNotifications(){document.getElementById('goldNotifOverlay')?.remove();}
function goldRenderNotifications(){
  const old=document.getElementById('goldNotifOverlay'); if(old) old.remove();
  const list=visibleNotifications();
  const unread=visibleUnreadNotifications().length;
  const overlay=document.createElement('div');
  overlay.id='goldNotifOverlay';
  overlay.className='gold-notif-overlay';
  overlay.addEventListener('click', e=>{ if(e.target===overlay) goldCloseNotifications(); });
  overlay.innerHTML=`
    <div class="gold-notif-panel" onclick="event.stopPropagation()">
      <div class="gold-notif-head">
        <h3>Notifications (${unread} unread)</h3>
        <button class="gold-notif-close" onclick="goldCloseNotifications()">×</button>
      </div>
      <div class="gold-notif-actions">
        <button class="btn ghost small" onclick="CPD.markAllRead()">Mark all read</button>
        <button class="btn danger small" onclick="goldDeleteNotificationsHistory()">Delete history</button>
      </div>
      <div class="gold-notif-list">
        ${list.length?list.map(n=>`
          <div class="notif-item ${(n.status||'unread')==='unread'?'unread':''}">
            <b>${esc(n.type||'Notification')}</b>
            <div>${esc(n.message||'')}</div>
            <div class="notif-meta">${esc(n.username||'')} • ${n.created_at?new Date(n.created_at).toLocaleString('en-GB'):''}</div>
            ${(n.status||'unread')==='unread'?`<button class="btn good small" onclick="CPD.markRead('${n.id}')">Mark read</button>`:''}
          </div>
        `).join(''):'<p class="muted">No notifications.</p>'}
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function goldDeleteNotificationsHistory(){
  if(!confirm('Delete notifications history?')) return;
  try{
    const db=getDb();
    await db.from('notifications').delete().eq('user_id', current.id);
    if(current.username) await db.from('notifications').delete().eq('recipient_username', current.username);
    state.notifications=(state.notifications||[]).filter(n=>{
      const rid=String(n.recipient_user_id || n.user_id || n.userId || '');
      const run=String(n.recipient_username || '').toLowerCase();
      return !(rid===String(current.id||'') || (!!run && run===String(current.username||'').toLowerCase()));
    });
    goldRenderNotifications();
    renderRoute();
    toast('Notifications history deleted');
  }catch(e){console.error(e);toast('Could not delete notifications history. Check Supabase delete policy.', false);}
}
function notificationSettings(){
  const enabled=notifSoundEnabled();
  document.getElementById('view').innerHTML=pageHead('Notification Settings','Control notification sound and notification history')+
  `<section class="card notif-settings-card">
    <div class="notif-setting-row">
      <div><h2>🔔 Notification Bell Sound</h2><p class="muted">Play a soft sound when a new notification arrives inside CPD Tracker.</p></div>
      <label class="sound-toggle"><input type="checkbox" id="notifSoundToggle" ${enabled?'checked':''}><span></span></label>
    </div>
    <div class="notif-test-row">
      <button class="btn" onclick="setNotifSoundEnabled(true);document.getElementById('notifSoundToggle').checked=true;playNotificationSound();toast('Notification sound enabled')">Enable & Test Sound</button>
      <button class="btn ghost" onclick="CPD.markAllRead()">Mark all as read</button>
    </div>
    <hr class="soft-divider">
    <div class="danger-zone">
      <h2>Delete Notifications History</h2>
      <p class="muted">Delete the notification history for the currently logged-in user.</p>
      <button class="btn danger" onclick="goldDeleteNotificationsHistory()">Delete notifications history</button>
    </div>
  </section>`;
  document.getElementById('notifSoundToggle').onchange=e=>{setNotifSoundEnabled(e.target.checked);if(e.target.checked)playNotificationSound();toast(e.target.checked?'Notification sound enabled':'Notification sound disabled')};
}


/* GOLD V66+V58B: DHP email in-app notification helper */
async function goldCreateDhpInAppNotificationForAdmin(staff, stage){
  try{
    const admins=(state.users||[]).filter(u=>u && u.role==='admin' && u.active!==false);
    const targetAdmins = admins.length ? admins : (current?.role==='admin' ? [current] : []);
    for(const admin of targetAdmins){
      if(typeof createInAppNotification === 'function'){
        await createInAppNotification(
          admin,
          'DHP Email Reminder Sent',
          `${staff.fullName||staff.username||'Staff'} reached ${stage} days before DHP expiry. Email was sent to ${GOLD_ADMIN_DHP_EMAIL}.`,
          {staff_id:staff.id, staff_name:staff.fullName||staff.username||'', username:staff.username||'', title:'DHP Email Reminder Sent'}
        );
      }else{
        await getDb().from('notifications').insert({
          user_id:admin.id,
          username:current?.username || 'system',
          type:'DHP Email Reminder Sent',
          message:`${staff.fullName||staff.username||'Staff'} reached ${stage} days before DHP expiry. Email was sent to ${GOLD_ADMIN_DHP_EMAIL}.`,
          status:'unread',
          created_at:new Date().toISOString()
        });
      }
    }
    await loadAll();
    return true;
  }catch(e){
    console.error('DHP in-app notification failed', e);
    return false;
  }
}


async function dhpEmailStageAlreadySent(staff, stage){
  try{
    const {data,error}=await getDb().from('notifications')
      .select('id')
      .eq('staff_id', staff.id)
      .eq('type', 'DHP Email Sent')
      .eq('status', 'sent_log')
      .eq('message', 'stage:'+String(stage))
      .limit(1);
    if(!error && data && data.length) return true;
  }catch(e){}
  return false;
}
async function dhpEmailLogSent(staff, stage){
  try{
    await getDb().from('notifications').insert({
      user_id: current?.id || staff.id,
      recipient_user_id: current?.id || staff.id,
      recipient_username: current?.username || '',
      staff_id: staff.id,
      staff_name: staff.fullName || staff.username || '',
      username: staff.username || '',
      type: 'DHP Email Sent',
      message: 'stage:'+String(stage),
      status: 'sent_log',
      is_read: true,
      created_at: new Date().toISOString()
    });
  }catch(e){ console.warn('DHP log insert failed', e); }
}

function goldDhpStage(days){
  if(days===120) return '120';
  if(days===90) return '90';
  if(days===60) return '60';
  if(days===30) return '30';
  return null;
}
async function goldSendDhpEmail(staff,days){
  try{
    if(typeof emailjs==='undefined') return false;
    await emailjs.send(GOLD_EMAILJS_SERVICE_ID,GOLD_EMAILJS_TEMPLATE_ID,{
      to_email:GOLD_ADMIN_DHP_EMAIL,
      staff_name:staff.fullName||staff.username||'Staff',
      days_left:String(days),
      dhp_expiry:staff.dhpExpiry||'Unknown',
      message:`${staff.fullName||staff.username||'Staff'} DHP license expires in ${days} days. Expiry: ${staff.dhpExpiry||'Unknown'}`
    },GOLD_EMAILJS_PUBLIC_KEY);
    return true;
  }catch(e){console.error('DHP EmailJS failed',e);return false;}
}
async function goldRunDhpEmailReminders(){
  try{
    if(!current || current.role!=='admin') return;
    const today=new Date();
    for(const u of (state.users||[])){
      if(!u || u.role!=='staff' || !u.dhpExpiry || isTrainee(u)) continue;
      const exp=new Date(u.dhpExpiry);
      if(isNaN(exp)) continue;
      const days=Math.ceil((exp-today)/(1000*60*60*24));
      const stage=goldDhpStage(days);
      if(!stage) continue;
      if(await dhpEmailStageAlreadySent(u, stage)) continue;
      const sent=await goldSendDhpEmail(u,days);
      if(sent){
        await dhpEmailLogSent(u, stage);
        await goldCreateDhpInAppNotificationForAdmin(u, stage);
      }
    }
  }catch(e){console.error('DHP reminder scan failed',e);}
}
setTimeout(goldRunDhpEmailReminders, 9000);
setInterval(goldRunDhpEmailReminders, 1000*60*60*6);

function setGoldPageClass(){
  try{
    document.body.classList.add('gold-theme');
    document.body.classList.remove('gold-page-dashboard','gold-page-staff','gold-page-reminders','gold-page-profile','gold-page-reports','gold-page-activities');
    const r = String(currentRoute || '').toLowerCase();
    if(r.includes('dashboard')) document.body.classList.add('gold-page-dashboard');
    if(r.includes('staff')) document.body.classList.add('gold-page-staff');
    if(r.includes('reminder')) document.body.classList.add('gold-page-reminders');
    if(r.includes('profile')) document.body.classList.add('gold-page-profile');
    if(r.includes('report')) document.body.classList.add('gold-page-reports');
    if(r.includes('activit')) document.body.classList.add('gold-page-activities');
  }catch(e){}
}

function renderRoute(){ setGoldPageClass();
  if(current?.role!=='admin' && ['dashboard','staff','reminders','email'].includes(currentRoute)){
    currentRoute='profile';
  }
  if(currentRoute==='dashboard') return dashboard();
  if(currentRoute==='staff') return staffPage();
  if(currentRoute==='reports') return reports();
  if(currentRoute==='activities') return activitiesPage();
  if(currentRoute==='reminders') return reminders();
  if(currentRoute==='email') return emailSettings();
  if(currentRoute==='notification-settings') return notificationSettings();
  if(currentRoute==='profile') return profile();
}
function progress(u){
  if(isTrainee(u)) return traineeShortText;
  const target=Number(state.targetTotal||80);
  const pct=target?Math.min(100,Math.max(0,Math.round((total(u)/target)*100))):0;
  /* GOLD V63: one exact conic ring. The green sector equals the displayed percentage; the remaining sector is clearly grey. */
  return `<div class="circle-progress progress-ring-exact" style="--pct:${pct}" data-pct="${pct}"><div><b>${pct}%</b></div></div><small class="circle-points">${total(u)}/${target} points</small>`
}
function row(u){const [s,c]=status(u);const tr=isTrainee(u);return `<tr class="${progressAccentClass(u)}"><td><b>${esc(u.fullName)}</b><br><small>${esc(u.department)}</small><br><small class="last-login">Last login: ${fmtDateTime(u.lastLogin)}</small></td><td>${esc(u.username)}</td><td>${esc(displayArea(u))}</td><td><span class="badge ${u.dhpExpiry?'infob':'bad'}">${fmtDate(u.dhpExpiry)}</span></td><td>${tr?traineeShortText:u.category1+'/'+state.targetCategory1}</td><td>${tr?traineeShortText:u.category23+'/'+state.targetCategory23}</td><td><b>${tr?traineeShortText:total(u)+'/'+state.targetTotal}</b></td><td>${progress(u)}</td><td><span class="badge ${c}b">${s}</span></td><td>${current?.role==='admin'?`<button class="btn ghost small" onclick="CPD.openStaffModal('${u.id}')">Edit</button>`:''}</td></tr>`}
function table(users){return `<div class="card table-card"><table class="table"><thead><tr><th>Name</th><th>Username</th><th>Area</th><th>DHP Expiry</th><th>Cat 1</th><th>Cat 2&3</th><th>Total</th><th>Progress</th><th>Status</th><th></th></tr></thead><tbody>${users.map(row).join('')}</tbody></table></div>`}

function dashboardMiniBar(label,value,max){
  const pct=max?Math.min(100,Math.max(3,Math.round((value/max)*100))):3;
  return `<div class="dash-mini-row"><div><b>${esc(label)}</b><span>${value}${max===100?'%':''}</span></div><div class="dash-mini-bar"><i style="width:${pct}%"></i></div></div>`;
}
function dashboardActivityItem(a){
  return `<div class="dash-activity-item">
    ${a.imageUrl?`<img src="${esc(a.imageUrl)}" onerror="this.style.display='none'">`:'<div class="activity-placeholder">CPD</div>'}
    <div><b>${esc(a.title||'Untitled activity')}</b><small>${esc(a.provider||'')} • ${esc(activityDatesText(a))}</small><small>${activityPointsText(a)} • ${esc(a.category||'')}</small></div>
  </div>`;
}
function dashboardAlertItem(u,type){
  return `<div class="dash-alert-item"><b>${esc(u.fullName||u.username)}</b><span>${esc(type)}</span><small>${esc(displayArea(u))}</small></div>`;
}

function dashboard(){
  const isAdmin = isCurrentAdmin();

  const staff=activeStaff();
  const metricStaff=staff.filter(u=>!isTrainee(u));
  const complete=metricStaff.filter(u=>total(u)>=state.targetTotal).length;
  const renew=staff.filter(u=>{const m=monthsUntil(u.dhpExpiry);return m!==null&&m<=state.reminderMonthsBefore&&m>=0}).length;
  const avg=metricStaff.length?Math.round(metricStaff.reduce((a,u)=>a+(total(u)/state.targetTotal*100),0)/metricStaff.length):0;
  const traineeCount=staff.filter(isTrainee).length;
  const atRisk=metricStaff.filter(u=>Math.round((total(u)/state.targetTotal)*100)<50).length;
  const noDhp=staff.filter(u=>!u.dhpExpiry).length;
  const depts=reportDepartments(staff).slice(0,5);
  const maxDept=Math.max(1,...depts.map(d=>d.avg));
  const upcoming=(state.activities||[]).filter(a=>(a.status||'active')==='active').sort((a,b)=>{
    const ad=firstActivityDate(a)||'9999-12-31';
    const bd=firstActivityDate(b)||'9999-12-31';
    return ad.localeCompare(bd);
  }).slice(0,4);
  const top=[...metricStaff].sort((a,b)=>total(b)-total(a)).slice(0,5);
  const alertList=[
    ...metricStaff.filter(u=>Math.round((total(u)/state.targetTotal)*100)<50).slice(0,4).map(u=>({u,type:'Low CPD progress'})),
    ...staff.filter(u=>!u.dhpExpiry).slice(0,3).map(u=>({u,type:'Missing DHP expiry'})),
    ...staff.filter(u=>{const m=monthsUntil(u.dhpExpiry);return m!==null&&m>=0&&m<=state.reminderMonthsBefore}).slice(0,3).map(u=>({u,type:'DHP renewal soon'}))
  ].slice(0,6);
  document.getElementById('view').innerHTML=pageHead('CPD Tracker Enterprise Dashboard','Executive overview, DHP compliance and CPD performance monitoring')+`
  
  <div class="v50-enterprise-hero">
    <div>
      <span class="v50-chip">Enterprise CPD Monitoring</span>
      <h2>Track. Comply. Excel.</h2>
      <p>Monthly DHP reminders, CPD progress analytics, staff risk insights and printable reports in one leadership dashboard.</p>
    </div>
  </div>
  <div class="cards dashboard-kpis">
    <div class="card stat"><span>Total Staff</span><b>${staff.length}</b><span class="badge infob">Active registry</span></div>
    <div class="card stat"><span>Average CPD</span><b>${avg}%</b><span class="badge infob">Excluding trainee nurses</span></div>
    <div class="card stat"><span>Completed CPD</span><b>${complete}</b><span class="badge goodb">80 points achieved</span></div>
    <div class="card stat"><span>At Risk Staff</span><b>${atRisk}</b><span class="badge warnb">Below 50%</span></div>
    <div class="card stat"><span>DHP Renewal Soon</span><b>${renew}</b><span class="badge warnb">Within ${state.reminderMonthsBefore} months</span></div>
    <div class="card stat"><span>Trainee Nurses</span><b>${traineeCount}</b><span class="badge traineeb">TN licenses</span></div>
  </div>

  <div class="dashboard-grid">
    <div class="card dashboard-panel">
      <h2>🟢 CPD Completion Overview</h2>
      <div class="donut-row">${reportDonut('Completed',complete,Math.max(1,metricStaff.length),'green')}${reportDonut('Need Follow-up',Math.max(0,metricStaff.length-complete),Math.max(1,metricStaff.length),'blue')}</div>
    </div>
    <div class="card dashboard-panel">
      <h2>📊 Department Performance</h2>
      ${depts.length?depts.map(d=>dashboardMiniBar(`${d.name} (${d.completed}/${d.total})`,d.avg,maxDept)).join(''):'<p class="muted">No department data.</p>'}
    </div>
  </div>

  <div class="dashboard-grid">
    <div class="card dashboard-panel">
      <h2>📌 Leadership Focus</h2>
      <div class="smart-alert-row">
        <div><b>${atRisk}</b><span>Below 50%</span></div>
        <div><b>${noDhp}</b><span>Missing DHP expiry</span></div>
        <div><b>${renew}</b><span>Renewal soon</span></div>
      </div>
      ${alertList.length?alertList.map(x=>dashboardAlertItem(x.u,x.type)).join(''):'<p class="muted">No urgent follow-up items.</p>'}
    </div>
    <div class="card dashboard-panel">
      <h2>🏆 Top CPD Progress</h2>
      ${top.length?top.map((u,i)=>dashboardMiniBar(`${i+1}. ${u.fullName||u.username} - ${total(u)}/${state.targetTotal}`,Math.round((total(u)/state.targetTotal)*100),100)).join(''):'<p class="muted">No CPD data yet.</p>'}
    </div>
  </div>

  <div class="card dashboard-panel">
    <div class="dash-panel-head"><h2>📚 Upcoming CPD Activities</h2><button class="btn ghost small" onclick="currentRoute='activities';renderRoute()">View Activities</button></div>
    <div class="dash-activities">${upcoming.length?upcoming.map(dashboardActivityItem).join(''):'<p class="muted">No active activities.</p>'}</div>
  </div>`;
}
function staffPage(){document.getElementById('view').innerHTML=pageHead('Staff Management','Add, edit, deactivate and monitor nursing staff','<button class="btn" onclick="CPD.openStaffModal()">➕ Add Staff</button><button class="btn ghost" onclick="CPD.exportUsers()">Export CSV</button>')+`<div class="search-row"><input id="staffSearch" placeholder="Search by name, username, area, DHP..." oninput="CPD.filterStaff()"><select id="statusFilter" onchange="CPD.filterStaff()"><option>All status</option><option>Completed</option><option>In Progress</option><option>DHP Renewal Soon</option><option>DHP Expired</option></select></div><div id="staffTable">${table(activeStaff())}</div>`}



function reportStaffBase(){
  return (state.users||[]).filter(u => u.role === 'staff' && u.active !== false);
}
function reportPct(u){
  if(isTrainee(u)) return 0;
  const target = Number(state.targetTotal || 80);
  return target ? Math.min(100, Math.round((total(u)/target)*100)) : 0;
}
function reportAreas(){const existing=[...new Set(reportStaffBase().map(u=>displayArea(u)))].filter(Boolean);return [...STAFF_AREA_ORDER, ...existing.filter(a=>!STAFF_AREA_ORDER.includes(a)).sort()];}
function reportFilteredStaff(){
  let list = reportStaffBase();
  const dep = document.getElementById('repDepartment')?.value || 'All';
  const st = document.getElementById('repStatus')?.value || 'All';
  const cat = document.getElementById('repCategory')?.value || 'All';
  const period = document.getElementById('repPeriod')?.value || 'All';
  const q = (document.getElementById('repSearch')?.value || '').toLowerCase();
  if(dep !== 'All') list = list.filter(u => (displayArea(u)) === dep || (u.department || '') === dep);
  if(st !== 'All') list = list.filter(u => status(u)[0] === st);
  if(cat === 'Cat 1') list = list.filter(u => Number(u.category1 || 0) > 0);
  if(cat === 'Cat 2&3') list = list.filter(u => Number(u.category23 || 0) > 0);
  if(period !== 'All'){
    const now = new Date();
    const months = period === '3 months' ? 3 : period === '6 months' ? 6 : 12;
    const end = new Date(now.getFullYear(), now.getMonth()+months, now.getDate());
    list = list.filter(u => {
      if(!u.dhpExpiry) return false;
      const d = new Date(u.dhpExpiry + 'T00:00:00');
      return d >= now && d <= end;
    });
  }
  if(q) list = list.filter(u => [u.fullName,u.username,displayArea(u),u.department].join(' ').toLowerCase().includes(q));
  if(state.smartReportFilter === 'atRisk') list = list.filter(u => reportPct(u) < 50);
  if(state.smartReportFilter === 'missingDhp') list = list.filter(u => !u.dhpExpiry);
  if(state.smartReportFilter === 'renewalSoon') list = list.filter(u => { const m = monthsUntil(u.dhpExpiry); return m !== null && m >= 0 && m <= state.reminderMonthsBefore; });
  return list;
}
function reportSummary(list){
  const metricList=list.filter(u=>!isTrainee(u));
  const target = Number(state.targetTotal || 80);
  const completed = metricList.filter(u => total(u) >= target).length;
  const inProgress = metricList.filter(u => total(u) > 0 && total(u) < target).length;
  const missing = metricList.filter(u => total(u) === 0).length;
  const avg = metricList.length ? Math.round(metricList.reduce((a,u)=>a+reportPct(u),0)/metricList.length) : 0;
  const compliance = metricList.length ? Math.round((completed/metricList.length)*100) : 0;
  const atRisk = metricList.filter(u => reportPct(u) < 50).length;
  const renew = list.filter(u => { const m = monthsUntil(u.dhpExpiry); return m !== null && m >= 0 && m <= state.reminderMonthsBefore; }).length;
  return {completed,inProgress,missing,need:Math.max(0,metricList.length-completed),avg,compliance,atRisk,renew,trainees:list.filter(isTrainee).length};
}
function reportDepartments(list){
  const groups = {};
  list.forEach(u => {
    const k = displayArea(u);
    if(!groups[k]) groups[k] = [];
    groups[k].push(u);
  });
  return Object.entries(groups).map(([name,users]) => {
    const metricUsers=users.filter(u=>!isTrainee(u));
    return {
      name, users, total:users.length,
      completed:metricUsers.filter(u=>total(u) >= (state.targetTotal||80)).length,
      avg:metricUsers.length ? Math.round(metricUsers.reduce((a,u)=>a+reportPct(u),0)/metricUsers.length) : 0
    };
  }).sort((a,b)=>b.avg-a.avg);
}
function reportDonut(label,value,totalCount,cls){
  const pct = totalCount ? Math.round((value/totalCount)*100) : 0;
  return `<div class="report-donut ${cls}" style="--p:${pct}"><div><b>${pct}%</b><span>${esc(label)}</span><small>${value}/${totalCount}</small></div></div>`;
}
function reportBar(label,value,max,cls='',onclick=''){
  const pct = max ? Math.min(100, Math.max(2, Math.round((value/max)*100))) : 2;
  return `<div class="rbar-row ${cls}" ${onclick?`onclick="${onclick}"`:''}><div class="rbar-label"><span>${esc(label)}</span><b>${value}${max===100?'%':''}</b></div><div class="rbar"><span style="width:${pct}%"></span></div></div>`;
}
function reportLine(list){
  const ranges = [['0%',0,0],['1-25%',1,25],['26-50%',26,50],['51-75%',51,75],['76-99%',76,99],['100%',100,100]];
  const vals = ranges.map(r => list.filter(u => reportPct(u) >= r[1] && reportPct(u) <= r[2]).length);
  const max = Math.max(1, ...vals);
  const pts = vals.map((v,i)=>`${45+i*95},${155-(v/max)*115}`).join(' ');
  return `<svg class="line-chart" viewBox="0 0 570 190" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${vals.map((v,i)=>`<circle cx="${45+i*95}" cy="${155-(v/max)*115}" r="6" fill="#22c55e"></circle><text x="${45+i*95}" y="180" text-anchor="middle">${ranges[i][0]}</text><text x="${45+i*95}" y="${140-(v/max)*115}" text-anchor="middle">${v}</text>`).join('')}
  </svg>`;
}
function reportTable(list,isAdmin){
  if(isAdmin){
    return `<div class="card table-card"><table class="table"><thead><tr><th>Name</th><th>Area</th><th>Last Login</th><th>DHP Expiry</th><th>Cat 1</th><th>Cat 2&3</th><th>Total</th><th>Progress</th><th>Status</th></tr></thead><tbody>${list.map(u=>{const tr=isTrainee(u);return `<tr><td><b>${esc(u.fullName||u.username)}</b><br><small>${esc(u.username)}</small></td><td>${esc(displayArea(u))}</td><td>${fmtDateTime(u.lastLogin)}</td><td>${fmtDate(u.dhpExpiry)}</td><td>${tr?traineeText:Number(u.category1||0)+'/'+state.targetCategory1}</td><td>${tr?traineeText:Number(u.category23||0)+'/'+state.targetCategory23}</td><td><b>${tr?traineeText:total(u)+'/'+state.targetTotal}</b></td><td>${progress(u)}</td><td><span class="badge ${status(u)[1]}b">${status(u)[0]}</span></td></tr>`}).join('')}</tbody></table></div>`;
  }
  return `<div class="card table-card"><table class="table"><thead><tr><th>Name</th><th>Area</th><th>Progress</th><th>Status</th></tr></thead><tbody>${list.map(u=>`<tr><td><b>${esc(u.fullName||u.username)}</b><br><small>${esc(u.username)}</small></td><td>${esc(displayArea(u))}</td><td>${progress(u)}</td><td><span class="badge ${status(u)[1]}b">${status(u)[0]}</span></td></tr>`).join('')}</tbody></table></div>`;
}
function reportsBody(){
  try{
    const list = reportFilteredStaff();
    const isAdmin = current?.role === 'admin';
    const s = reportSummary(list);
    const depts = reportDepartments(list);
    const metricList=list.filter(u=>!isTrainee(u));
    const top = [...metricList].sort((a,b)=>total(b)-total(a)).slice(0,5);
    const bottom = [...metricList].sort((a,b)=>total(a)-total(b)).slice(0,5);
    const maxDept = Math.max(1, ...depts.map(d=>d.avg));
    const alerts = isAdmin
      ? list.filter(u => !u.dhpExpiry || (!isTrainee(u)&&reportPct(u)<50) || ((monthsUntil(u.dhpExpiry)??99) <= state.reminderMonthsBefore)).slice(0,10)
      : list.filter(u => !isTrainee(u) && reportPct(u)<50).slice(0,10);
    return `${!isAdmin?'<div class="privacy-note">Privacy mode: staff can view percentages and insights only. Other staff DHP expiry dates and exact remaining points are hidden.</div>':''}
    <div class="report-kpis">
      ${window.card('Average CPD',s.avg+'%','Department average')}
      ${window.card('Compliance Rate',s.compliance+'%','80 points achieved')}
      ${window.card('At Risk Staff',s.atRisk,'Below 50% progress')}
      ${isAdmin?card('Upcoming Renewals',s.renew,'Within '+state.reminderMonthsBefore+' months'):card('Staff Included',list.length,'Current report view')}
    </div>
    <div class="report-visual-grid">
      <div class="card report-chart"><h2>🟢 Completion Donut</h2><div class="donut-row">${reportDonut('Completed',s.completed,list.length,'green')}${reportDonut('Need Points',s.need,list.length,'blue')}${reportDonut('Missing',s.missing,list.length,'red')}</div></div>
      <div class="card report-chart"><h2>📊 Department Bar Chart</h2>${depts.length?depts.map(d=>reportBar(`${d.name} (${d.completed}/${d.total})`,d.avg,maxDept,'',`CPD.drillDepartment('${String(d.name).replace(/'/g,"\\'")}')`)).join(''):'<p class="muted">No department data.</p>'}</div>
    </div>
    <div class="card report-chart"><h2>📈 Progress Distribution Line Chart</h2>${reportLine(list)}</div>
    <div class="report-visual-grid">
      <div class="card report-chart"><h2>🥇 Top 5 Staff</h2>${top.length?top.map((u,i)=>reportBar(`${i+1}. ${u.fullName||u.username} - ${total(u)}/${state.targetTotal}`,isAdmin?total(u):reportPct(u),isAdmin?(state.targetTotal||80):100,'good')).join(''):'<p class="muted">No data.</p>'}</div>
      <div class="card report-chart"><h2>⚠️ Bottom 5 / Follow-up</h2>${bottom.length?bottom.map((u,i)=>reportBar(`${i+1}. ${u.fullName||u.username} - ${total(u)}/${state.targetTotal}`,isAdmin?total(u):reportPct(u),isAdmin?(state.targetTotal||80):100,'warn')).join(''):'<p class="muted">No data.</p>'}</div>
    </div>
    ${isAdmin?`<div class="card report-chart"><h2>🚨 Report Alerts</h2>${alerts.length?alerts.map(u=>`<div class="alert-line"><b>${esc(u.fullName||u.username)}</b><span>${!u.dhpExpiry?'Missing DHP':reportPct(u)<50?'Low CPD progress':'DHP renewal soon'}</span><small>${total(u)}/${state.targetTotal} points • ${fmtDate(u.dhpExpiry)}</small></div>`).join(''):'<p class="muted">No alerts for current filters.</p>'}</div>
    <h2 style="margin-top:24px">Filtered CPD Completion</h2>${reportTable(list,true)}`:`<div class="privacy-note">🔒 Detailed staff list and report alerts are restricted to admin only.</div>`}`;
  }catch(err){
    console.error('reportsBody error',err);
    return `<div class="card"><h2>Reports could not load</h2><p class="muted">${esc(err.message||String(err))}</p><button class="btn" onclick="CPD.refreshReports()">Try again</button></div>`;
  }
}
function reports(){
  const view = document.getElementById('view');
  if(!view) return;
  try{
    const areas = reportAreas();
    const buttons = '<button class="btn" onclick="window.print()">Print</button><button class="btn ghost" onclick="CPD.exportFilteredReport()">Export CSV</button><button class="btn ghost" onclick="CPD.exportReportExcel()">Export Excel</button><button class="btn ghost" onclick="CPD.exportReportPDF()">Print / Save PDF</button>';
    view.innerHTML = pageHead('Reports','CPD analytics, department comparison, alerts, and progress insights',buttons) +
    `<div class="report-filters labeled-filters">
      <label><span>Search</span><input id="repSearch" placeholder="Search staff, username, area..." oninput="CPD.refreshReports()"></label>
      <label><span>Area / Department</span><select id="repDepartment" onchange="CPD.refreshReports()"><option>All</option>${areas.map(a=>`<option>${esc(a)}</option>`).join('')}</select></label>
      <label><span>Status</span><select id="repStatus" onchange="CPD.refreshReports()"><option>All</option><option>Completed</option><option>In Progress</option><option>DHP Renewal Soon</option><option>DHP Expired</option><option>T.Nurse</option></select></label>
      <label><span>Category</span><select id="repCategory" onchange="CPD.refreshReports()"><option>All</option><option>Cat 1</option><option>Cat 2&3</option></select></label>
      <label><span>DHP Period</span><select id="repPeriod" onchange="CPD.refreshReports()"><option>All</option><option>3 months</option><option>6 months</option><option>12 months</option></select></label>
    </div>
    <div id="reportsBody">${smartInsightsPanel()+reportsBody()}</div>`;
  }catch(err){
    console.error('reports error',err);
    view.innerHTML = `<div class="card"><h2>Reports error</h2><p class="muted">${esc(err.message||String(err))}</p></div>`;
  }
}

function activitiesPage(){
  const acts=sortActivitiesByNearest((state.activities||[]).filter(a=>a.status!=='inactive'));
  const addBtn=current?.role==='admin'?'<button class="btn" onclick="CPD.openActivityModal()">➕ Add Activity</button><button class="btn ghost" onclick="CPD.exportActivities()">Export CSV</button>':'';
  document.getElementById('view').innerHTML=pageHead('CPD Activities','Workshops, webinars, seminars and CPD opportunities',addBtn)+
  `<div class="activity-filter-row"><input id="activitySearch" placeholder="Search activities, provider, category, location..." oninput="CPD.filterActivities()"><select id="activityTypeFilter" onchange="CPD.filterActivities()"><option>All types</option><option>Workshop</option><option>Webinar</option><option>Seminar</option><option>Course</option><option>Conference</option></select><select id="activityFeeFilter" onchange="CPD.filterActivities()"><option>All fees</option><option>Free</option><option>Paid</option></select></div><div id="activitiesList">${acts.length?`<div class="activity-grid">${sortActivitiesByNearest(acts).map(activityCard).join('')}</div>`:'<div class="card"><h2>No activities added yet</h2><p class="muted">Admin can add CPD activities using the Add Activity button.</p></div>'}</div>`;
}


function progressAccentClass(u){
  try{
    if(isTrainee(u)) return 'progress-accent-trainee';
    const target = Number(state.targetTotal || 80);
    const points = Number(total(u) || 0);
    if(points >= target) return 'progress-accent-complete';
    if(points <= 0) return 'progress-accent-danger';
    return 'progress-accent-good';
  }catch(e){
    return 'progress-accent-danger';
  }
}

function reminders(){const staff=activeStaff().filter(u=>{const m=monthsUntil(u.dhpExpiry);return m!==null&&m<=state.reminderMonthsBefore&&m>=0}).sort((a,b)=>(daysUntil(a.dhpExpiry)||9999)-(daysUntil(b.dhpExpiry)||9999));document.getElementById('view').innerHTML=pageHead('Reminders','Upcoming DHP expiry and CPD follow-up','<button class="btn" onclick="CPD.testEmail()">Send Test Alerts</button><button class="btn ghost" onclick="CPD.exportReminderList()">Export CSV</button>')+`${staff.length?table(staff):'<div class="card"><h2>No renewal alerts</h2><p class="muted">No active staff currently within the configured reminder window.</p></div>'}`}
function emailSettings(){const s=state.emailSettings;document.getElementById('view').innerHTML=pageHead('Email Settings','Admin notification setup')+`<div class="card"><div class="form-grid"><div class="field"><label>Admin Email</label><input id="adminEmail" value="${esc(s.adminEmail)}"></div><div class="field"><label>Reminder Months Before</label><input id="reminderMonths" type="number" min="1" max="24" value="${state.reminderMonthsBefore}"></div><div class="field"><label>EmailJS Service ID</label><input id="emailServiceId" value="${esc(s.emailServiceId)}"></div><div class="field"><label>EmailJS Template ID</label><input id="emailTemplateId" value="${esc(s.emailTemplateId)}"></div><div class="field"><label>EmailJS Public Key</label><input id="emailPublicKey" value="${esc(s.emailPublicKey)}"></div></div><button class="btn" onclick="CPD.saveSettings()">Save Settings</button><button class="btn ghost" onclick="CPD.testEmail()">Send Test Alerts</button></div>`}
function profile(){
  const u=current;
  const tr=isTrainee(u);
  const c1Target=Number(state.targetCategory1||40);
  const c23Target=Number(state.targetCategory23||40);
  const totalTarget=Number(state.targetTotal||80);
  const c1=Number(u.category1||0);
  const c23=Number(u.category23||0);
  const ttl=total(u);
  const ttlPct=tr?0:Math.min(100,Math.round((ttl/totalTarget)*100));
  const c1Pct=tr?0:Math.min(100,Math.round((c1/c1Target)*100));
  const c23Pct=tr?0:Math.min(100,Math.round((c23/c23Target)*100));
  const days=daysUntil(u.dhpExpiry);
  const dhpText = days===null ? 'Missing' : `${days} days`;
  const alertText = days===null ? 'DHP expiry date is missing' : `DHP renewal attention: ${days} days remaining`;
  document.getElementById('view').innerHTML=
  `<section class="gold-profile-hero">
    <div>
      <span class="gold-chip">${current?.role==='admin'?'Admin CPD Dashboard':'Staff CPD Dashboard'}</span>
      <h1>Welcome, ${esc(u.fullName || u.username)} 👋</h1>
      <p>Track your CPD progress and DHP renewal readiness in one place.</p>
    </div>
    <div class="gold-hero-ring" style="--pct:${ttlPct}"><strong>${ttlPct}%</strong></div>
  </section>

  <section class="gold-profile-kpis">
    <div class="gold-kpi gold-kpi-blue">
      <h3>📊 Total CPD</h3>
      <b>${tr?'Not Required':ttl+'/'+totalTarget}</b>
      <div class="gold-progress"><i style="width:${ttlPct}%"></i></div>
      <small>${tr?'Currently not required':ttlPct+'% completed'}</small>
    </div>
    <div class="gold-kpi gold-kpi-cyan">
      <h3>📘 Category 1</h3>
      <b>${tr?'N/A':c1+'/'+c1Target}</b>
      <div class="gold-progress"><i style="width:${c1Pct}%"></i></div>
      <small>${tr?'T.Nurse':c1Pct+'% completed'}</small>
    </div>
    <div class="gold-kpi gold-kpi-green">
      <h3>📗 Category 2&3</h3>
      <b>${tr?'N/A':c23+'/'+c23Target}</b>
      <div class="gold-progress green"><i style="width:${c23Pct}%"></i></div>
      <small>${tr?'T.Nurse':c23Pct+'% completed'}</small>
    </div>
    <div class="gold-kpi gold-kpi-orange">
      <h3>⏳ DHP Renewal</h3>
      <b>${dhpText}</b>
      <div class="gold-progress orange"><i style="width:${days===null?0:Math.max(5,Math.min(100,100-(days/180*100)))}%"></i></div>
      <small>${esc(u.dhpExpiry || 'Missing expiry')}</small>
    </div>
  </section>


  <div class="page-head gold-profile-head"><div><h1>My Profile</h1><p class="muted">Update your DHP license expiry and CPD points</p></div><div class="actions">${notificationBell()}<button class="btn ghost" onclick="CPD.refresh()">Refresh</button></div></div>

  <section class="gold-profile-form card">
    ${tr?'<div class="trainee-note">You are not required to collect CPD points currently. Once your permanent DHP license is issued, you can start tracking Category 1 and Category 2&3 points here.</div>':''}
    <div class="form-grid">
      <div class="field"><label>DHP License #</label><input id="pDhplic" value="${esc(u.dhpLicense)}"></div>
      <div class="field"><label>DHP Expiry</label><input id="pDhpExpiry" type="date" value="${esc(u.dhpExpiry)}"></div>
      <div class="field"><label>Category 1 Points</label><input id="pCat1" type="number" min="0" max="999" value="${Number(u.category1||0)}"></div>
      <div class="field"><label>Category 2&3 Points</label><input id="pCat23" type="number" min="0" max="999" value="${Number(u.category23||0)}"></div>
      <div class="field"><label>Email</label><input id="pEmail" value="${esc(u.email)}"></div>
      <div class="field"><label>Mobile</label><input id="pMobile" value="${esc(u.mobile)}"></div>
    </div>
    <div class="modal-actions-row"><button class="btn" onclick="CPD.saveProfile()">Save Updates</button><button class="btn ghost" onclick="CPD.changePassword()">Change Password</button></div>
  </section>`;
}
async function saveUser(u){const payload=userToDb(u); if(u.id){const {data,error}=await getDb().from('staff_cpd').update(payload).eq('id',u.id).select().single();if(error) throw error; return dbToUser(data)} const {data,error}=await getDb().from('staff_cpd').insert(payload).select().single();if(error) throw error;return dbToUser(data)}
function modal(html){const d=document.createElement('div');d.className='modal';d.innerHTML=html;document.body.appendChild(d)}
function closeModal(){document.querySelectorAll('.modal').forEach(m=>m.remove())}
function changePasswordModal(force=false){modal(`<div class="modal-card"><div class="modal-head"><h2>Change password</h2>${force?'':'<button class="btn ghost small" onclick="closeModal()">Close</button>'}</div><p class="muted">${force?'You are using the initial password. You can change it now or postpone it.':'Update your password.'}</p><div class="field"><label>New Password</label><input id="newPass" type="password"></div><div class="modal-actions-row"><button class="btn" onclick="CPD.savePassword(${force})">Save Password</button>${force?'<button class="btn ghost" onclick="CPD.skipPasswordChange()">Later</button>':''}</div></div>`)}
function downloadCSV(filename,rows){if(!rows.length){toast('No data to export');return}const headers=Object.keys(rows[0]);const csv=[headers.join(',')].concat(rows.map(r=>headers.map(h=>'"'+String(r[h]??'').replace(/"/g,'""')+'"').join(','))).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=filename;a.click();URL.revokeObjectURL(a.href)}
async function checkAndSendAlerts(){
  try{
    await loadAll();
    if(!current || current.role!=='admin') return;
    let sentCount=0;
    for(const staff of activeStaff()){
      if(!staff.dhpExpiry || isTrainee(staff)) continue;
      const days=daysUntil(staff.dhpExpiry);
      const stage=goldDhpStage(days);
      if(!stage) continue;
      if(await dhpEmailStageAlreadySent(staff, stage)) continue;
      let sent=false;
      if(window.emailjs) sent = await goldSendDhpEmail(staff, days);
      if(sent){
        sentCount++;
        await dhpEmailLogSent(staff, stage);
        await goldCreateDhpInAppNotificationForAdmin(staff, stage);
      }
    }
    await loadAll();
    if(sentCount) toast(`DHP email alert sent: ${sentCount}`);
  }catch(err){console.error('Email check error:',err)}
}
function reportRows(){
  return reportFilteredStaff().map(u=>current?.role==='admin'?({
    Name:u.fullName, Username:u.username, Area:displayArea(u), Department:u.department,
    DHP_Expiry:u.dhpExpiry||'', Category1:isTrainee(u)?'Not required now':u.category1, Category23:isTrainee(u)?'Not required now':u.category23,
    Total:isTrainee(u)?'Not required now':total(u), Progress:isTrainee(u)?'Not required now':reportPct(u)+'%', Status:status(u)[0]
  }):({Name:u.fullName, Username:u.username, Area:displayArea(u), Department:u.department, Progress:isTrainee(u)?'Not required now':reportPct(u)+'%', Status:status(u)[0]}));
}
function reportExportFileName(ext){
  const t=currentReportTitle().title.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  return `${t || 'cpd_report'}_${new Date().toISOString().slice(0,10)}.${ext}`;
}


function isStandalonePWA(){
  return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
}
function isMobileDevice(){
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}
function openHtmlReportWindow(html, title='CPD Report'){
  // In PWA/mobile, use a data URL in a new external context where possible.
  // This avoids trapping the user in the PWA without a back button.
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
}
function pwaBackButton(){
  return `<button class="btn ghost pwa-back-btn" onclick="CPD.goBack()">← Back</button>`;
}

window.CPD={
  deleteNotificationsHistory:goldDeleteNotificationsHistory,
  playNotificationSound:playNotificationSound,
  enterpriseInfo:()=>toast('Enterprise mode: Monthly DHP summary emails require Netlify Scheduled Function environment variables.', true),

  goBack:()=>{ if(history.length>1){history.back()}else{currentRoute='dashboard';renderRoute()} },
  addSessionRow:()=>{const wrap=document.getElementById('sessionRows');if(!wrap)return;const n=wrap.querySelectorAll('.session-row').length+1;wrap.insertAdjacentHTML('beforeend',sessionRowHtml(n));},
  renumberSessions:()=>{document.querySelectorAll('.session-row .session-label').forEach((el,i)=>el.textContent='Session '+(i+1));},
  refresh:async()=>{await loadAll(); mergeImportedStaffIntoState(); if(current) current=state.users.find(u=>u.id===current.id)||current; renderRoute(); toast('Synced from Supabase')},
  importExcelStaff:async()=>{
    if(current?.role!=='admin'){toast('Admin only');return}
    const staff = window.CPD_IMPORTED_STAFF || [];
    if(!staff.length){toast('No imported staff data found');return}
    const answer = confirm(`Import/update ${staff.length} staff records from the uploaded Excel sheet? Existing usernames will be updated.`);
    if(!answer) return;
    let ok=0, fail=0;
    for(const u of staff){
      try{
        const payload = userToDb(u);
        const {data:existing,error:findErr}=await getDb().from('staff_cpd').select('id').eq('username',payload.username).maybeSingle();
        if(findErr) throw findErr;
        if(existing?.id){
          const {error}=await getDb().from('staff_cpd').update(payload).eq('id',existing.id);
          if(error) throw error;
        }else{
          const {error}=await getDb().from('staff_cpd').insert(payload);
          if(error) throw error;
        }
        ok++;
      }catch(e){console.error('Import failed for',u.username,e);fail++;}
    }
    await loadAll();renderRoute();toast(`Excel staff import finished: ${ok} saved${fail?`, ${fail} failed`:''}`);
  },
  toggleNotifications:goldToggleNotifications,
  markRead:async(id)=>{await getDb().from('notifications').update({status:'read',is_read:true}).eq('id',id); await refreshNotificationsOnly(false); renderRoute()},
  markAllRead:async()=>{await getDb().from('notifications').update({status:'read',is_read:true}).eq('user_id',current.id).eq('status','unread'); await refreshNotificationsOnly(false); renderRoute()},
  filterStaff:()=>{const q=document.getElementById('staffSearch').value.toLowerCase(),sf=document.getElementById('statusFilter').value;let users=activeStaff().filter(u=>[u.fullName,u.username,displayArea(u),u.department,u.dhpLicense].join(' ').toLowerCase().includes(q));if(sf!=='All status')users=users.filter(u=>status(u)[0]===sf);document.getElementById('staffTable').innerHTML=table(users)},
  openStaffModal:(id)=>{const u=id?state.users.find(x=>x.id===id):{role:'staff',active:true,password:'1234',category1:0,category23:0};const isNew=!id;modal(`<div class="modal-card"><div class="modal-head"><h2>${isNew?'Add Staff':'Edit Staff'}</h2><button class="btn ghost small" onclick="closeModal()">Close</button></div><div class="form-grid"><div class="field"><label>Full Name</label><input id="mName" value="${esc(u.fullName||'')}"></div><div class="field"><label>Username</label><input id="mUsername" value="${esc(u.username||'')}"></div><div class="field"><label>Department</label><input id="mDept" value="${esc(u.department||'')}"></div><div class="field"><label>Area</label><input id="mArea" value="${esc(u.area||'')}"></div><div class="field"><label>DHP License #</label><input id="mDhplic" value="${esc(u.dhpLicense||'')}"></div><div class="field"><label>DHP Expiry</label><input type="date" id="mDhpExpiry" value="${esc(u.dhpExpiry||'')}"></div><div class="field"><label>Category 1</label><input type="number" id="mCat1" value="${Number(u.category1||0)}"></div><div class="field"><label>Category 2&3</label><input type="number" id="mCat23" value="${Number(u.category23||0)}"></div><div class="field"><label>Email</label><input id="mEmail" value="${esc(u.email||'')}"></div><div class="field"><label>Mobile</label><input id="mMobile" value="${esc(u.mobile||'')}"></div><div class="field"><label>Password</label><input id="mPassword" value="${esc(u.password||'1234')}"></div><div class="field"><label>Status</label><select id="mActive"><option value="true" ${u.active!==false?'selected':''}>Active</option><option value="false" ${u.active===false?'selected':''}>Inactive</option></select></div><div class="field" style="grid-column:1/-1"><label>Notes</label><textarea id="mNotes">${esc(u.notes||'')}</textarea></div></div><div class="modal-actions-row"><button class="btn" onclick="CPD.saveStaff('${u.id||''}')">Save Staff</button>${(!isNew && current?.role==='admin' && String(current?.username||'').toLowerCase()==='d.milhem' && String(u.username||'').toLowerCase()!=='d.milhem')?`<button class="btn danger" onclick="CPD.deleteStaff('${u.id||''}')">Delete Staff Record</button>`:''}</div></div>`)},
  saveStaff:async(id)=>{const old=id?state.users.find(x=>x.id===id):{};const u={...old,id:id||undefined,role:'staff',fullName:document.getElementById('mName').value.trim(),username:document.getElementById('mUsername').value.trim().toLowerCase(),department:document.getElementById('mDept').value.trim(),area:document.getElementById('mArea').value.trim(),dhpLicense:document.getElementById('mDhplic').value.trim(),dhpExpiry:document.getElementById('mDhpExpiry').value||null,category1:Number(document.getElementById('mCat1').value||0),category23:Number(document.getElementById('mCat23').value||0),email:document.getElementById('mEmail').value.trim(),mobile:document.getElementById('mMobile').value.trim(),password:document.getElementById('mPassword').value||'1234',active:document.getElementById('mActive').value==='true',notes:document.getElementById('mNotes').value};try{await saveUser(u);closeModal();await loadAll();renderRoute();toast('Staff saved')}catch(e){toast(e.message||'Save failed')}},
  deleteStaff:async(id)=>{
    try{
      if(current?.role!=='admin' || String(current?.username||'').toLowerCase()!=='d.milhem'){toast('Delete permission is restricted to Diya Milhem only');return}
      const u=state.users.find(x=>x.id===id);
      if(!u){toast('Staff not found');return}
      if(String(u.username||'').toLowerCase()==='d.milhem'){toast('You cannot delete the main admin account');return}
      const answer=prompt(`This will permanently delete ${u.fullName||u.username} and related records. Type DELETE to confirm.`);
      if(answer!=='DELETE'){toast('Delete cancelled');return}
      await getDb().from('notifications').delete().eq('staff_id',id);
      await getDb().from('notifications').delete().eq('username',u.username);
      await getDb().from('cpd_activity_registrations').delete().eq('staff_id',id);
      await getDb().from('cpd_activity_registrations').delete().eq('username',u.username);
      const {error}=await getDb().from('staff_cpd').delete().eq('id',id);
      if(error) throw error;
      closeModal();
      await loadAll();
      renderRoute();
      toast('Staff record deleted permanently');
    }catch(e){toast(e.message||'Delete failed')}
  },
  saveProfile:async()=>{const u={...current,dhpLicense:document.getElementById('pDhplic').value,dhpExpiry:document.getElementById('pDhpExpiry').value||null,category1:Number(document.getElementById('pCat1').value||0),category23:Number(document.getElementById('pCat23').value||0),email:document.getElementById('pEmail').value,mobile:document.getElementById('pMobile').value};try{const saved=await saveUser(u);current=saved;await loadAll();await notifyAdminsAboutProfileUpdate(saved);await loadAll();renderRoute();toast('Profile updated and admin notified')}catch(e){toast(e.message||'Update failed')}},
  changePassword:()=>changePasswordModal(false),
  skipPasswordChange:()=>{closeModal();renderShell(current?.role==='admin'?'dashboard':'profile');toast('Password change postponed. You can update it later from My Profile.')},
  savePassword:async(force)=>{const p=document.getElementById('newPass').value;if(!p||p.length<4){toast('Password must be at least 4 characters');return}current.password=p;try{current=await saveUser(current);closeModal();await loadAll();renderShell(current?.role==='admin'?'dashboard':'profile');toast('Password updated')}catch(e){toast(e.message||'Password update failed')}},
  saveSettings:async()=>{const payload={id:'main',target_total:state.targetTotal,target_category1:state.targetCategory1,target_category23:state.targetCategory23,reminder_months_before:Number(document.getElementById('reminderMonths').value||4),admin_email:document.getElementById('adminEmail').value.trim(),email_service_id:document.getElementById('emailServiceId').value.trim(),email_template_id:document.getElementById('emailTemplateId').value.trim(),email_public_key:document.getElementById('emailPublicKey').value.trim(),updated_at:todayISO()};try{const {error}=await getDb().from('app_settings').upsert(payload);if(error)throw error;await loadAll();renderRoute();toast('Settings saved to Supabase')}catch(e){toast(e.message||'Settings save failed')}},
  testEmail:async()=>{await checkAndSendAlerts();await loadAll();renderRoute();toast('Reminder check completed')},

  drillDepartment:(name)=>{document.getElementById('repDepartment').value=name;CPD.refreshReports();document.getElementById('reportsBody')?.scrollIntoView({behavior:'smooth'});toast('Filtered by '+name)},
  exportReportExcel:()=>{
    const rows=reportRows();
    if(!rows.length){toast('No data to export');return}
    const meta=currentReportTitle();
    const headers=Object.keys(rows[0]);
    const html=`<html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif}
      table{border-collapse:collapse;width:100%}
      th{background:#1d4ed8;color:white;font-weight:700}
      td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}
      .title{font-size:22px;font-weight:800;color:#0f172a;background:#dbeafe}
      .sub{font-size:13px;color:#475569;background:#f8fafc}
    </style></head><body>
    <table>
      <tr><td class="title" colspan="${headers.length}">CPD Tracker - ${esc(meta.title)}</td></tr>
      <tr><td class="sub" colspan="${headers.length}">${esc(meta.subtitle)} | Generated: ${esc(meta.date)}</td></tr>
      <tr>${headers.map(h=>`<th>${esc(h.replace(/_/g,' '))}</th>`).join('')}</tr>
      ${rows.map(r=>`<tr>${headers.map(h=>`<td>${esc(r[h]??'')}</td>`).join('')}</tr>`).join('')}
    </table></body></html>`;
    const blob=new Blob([html],{type:'application/vnd.ms-excel'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=reportExportFileName('xls');a.click();URL.revokeObjectURL(a.href)
  },
  exportReportPDF:()=>{
    const meta=currentReportTitle();
    const report=document.getElementById('reportsBody');
    if(!report){toast('Report is not ready', false);return;}
    const styles=[...document.querySelectorAll('link[rel="stylesheet"],style')].map(x=>x.outerHTML).join('\n');
    const body=report.outerHTML;
    const html=`<!doctype html><html><head><title>${esc(meta.title)}</title><meta charset="utf-8">${styles}<style>
      @page{size:A4 portrait;margin:10mm}
      html,body{background:#eef7ff!important;color:#0f172a!important;font-family:Inter,Arial,sans-serif!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{padding:12px!important}
      .print-header{background:linear-gradient(135deg,#eff6ff,#ffffff)!important;border:1px solid #dbeafe!important;border-radius:22px!important;padding:18px 22px!important;margin-bottom:16px!important;box-shadow:0 10px 30px rgba(15,23,42,.08)!important}
      .print-header h1{margin:0 0 6px!important;font-size:24px!important;color:#0f172a!important}.print-header p{margin:0!important;color:#475569!important}
      .no-print{position:sticky;top:0;z-index:50;background:white;padding:10px;border-radius:14px;margin-bottom:12px;box-shadow:0 8px 24px rgba(15,23,42,.12)}
      .report-kpis,.report-visual-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}.card,.report-chart{break-inside:avoid!important;page-break-inside:avoid!important}
      table{font-size:10px!important} th{background:#1d4ed8!important;color:white!important} td,th{padding:6px!important;border-color:#dbeafe!important}
      .circle-progress{--deg:calc(var(--p)*3.6deg);background:conic-gradient(#16a34a var(--deg),#e5e7eb 0)!important}
      .sidebar,.page-head,.report-filters,.privacy-note,.actions,.btn:not(.print-btn){display:none!important}
      @media print{.no-print{display:none!important} body{padding:0!important}.table-card{overflow:visible!important}.table{min-width:0!important;width:100%!important}}
    </style></head><body>
      <div class="no-print"><button class="print-btn" onclick="window.print()" style="padding:12px 18px;border:0;background:#2563eb;color:white;border-radius:12px;font-weight:800;cursor:pointer">Print / Save as PDF</button></div>
      <div class="print-header"><h1>CPD Tracker - ${esc(meta.title)}</h1><p>${esc(meta.subtitle)} | Generated: ${esc(meta.date)}</p></div>${body}
      <script>setTimeout(()=>{try{window.focus();window.print()}catch(e){}},700);</script>
    </body></html>`;
    const w=window.open('','_blank');
    if(!w){toast('Popup blocked. Please allow popups to print/save PDF.', false);return;}
    w.document.open();w.document.write(html);w.document.close();toast('Print report opened with report styling');
  },
  applySmartFilter:(type)=>{
    state.smartReportFilter = state.smartReportFilter === type ? '' : type;
    const body=document.getElementById('reportsBody');
    if(body) body.innerHTML=smartInsightsPanel()+reportsBody();
    toast(state.smartReportFilter ? 'Smart filter applied' : 'Smart filter cleared');
  },
  clearSmartFilter:()=>{
    state.smartReportFilter='';
    const body=document.getElementById('reportsBody');
    if(body) body.innerHTML=smartInsightsPanel()+reportsBody();
    toast('Smart filter cleared');
  },
  refreshReports:()=>{const el=document.getElementById('reportsBody'); if(el) el.innerHTML=smartInsightsPanel()+reportsBody();},
  exportFilteredReport:()=>downloadCSV(reportExportFileName('csv'),reportRows()),
  filterActivities:()=>{const q=(document.getElementById('activitySearch')?.value||'').toLowerCase();const type=document.getElementById('activityTypeFilter')?.value||'All types';const fee=document.getElementById('activityFeeFilter')?.value||'All fees';let acts=(state.activities||[]).filter(a=>a.status!=='inactive').filter(a=>[a.title,a.provider,a.type,a.category,a.location,a.description].join(' ').toLowerCase().includes(q));if(type!=='All types')acts=acts.filter(a=>String(a.type).toLowerCase()===type.toLowerCase());if(fee!=='All fees')acts=acts.filter(a=>String(a.feeType).toLowerCase()===fee.toLowerCase());document.getElementById('activitiesList').innerHTML=acts.length?`<div class="activity-grid">${sortActivitiesByNearest(acts).map(activityCard).join('')}</div>`:'<div class="card"><p class="muted">No matching activities.</p></div>'},
  openActivityModal:(id)=>{
    const a=id?state.activities.find(x=>x.id===id):{feeType:'Free',status:'active',eventMode:'single'};
    const sessions=parseActivitySessions(a);
    const mode=a.eventMode || (sessions.length>1?'multiple':'single');
    modal(`<div class="modal-card"><div class="modal-head"><h2>${id?'Edit Activity':'Add CPD Activity'}</h2><button class="btn ghost small" onclick="closeModal()">Close</button></div><div class="form-grid">
      <div class="field"><label>Activity Title</label><input id="aTitle" value="${esc(a.title||'')}"></div>
      <div class="field"><label>Provider / Organizer</label><input id="aProvider" value="${esc(a.provider||'')}"></div>
      <div class="field"><label>Type</label><select id="aType"><option ${a.type==='Workshop'?'selected':''}>Workshop</option><option ${a.type==='Webinar'?'selected':''}>Webinar</option><option ${a.type==='Seminar'?'selected':''}>Seminar</option><option ${a.type==='Course'?'selected':''}>Course</option><option ${a.type==='Conference'?'selected':''}>Conference</option></select></div>
      <div class="field"><label>Event Mode</label><select id="aEventMode" onchange="setActivityMode(this.value,getActivitySessionsFromForm())"><option value="single" ${mode==='single'?'selected':''}>Single event / session</option><option value="multiple" ${mode==='multiple'?'selected':''}>Multiple days / sessions</option></select></div>
      <div class="field session-field" style="grid-column:1/-1"><label>Date & Time</label><div id="sessionRows" class="session-rows"></div><button id="addSessionBtn" type="button" class="btn ghost small" onclick="CPD.addSessionRow()">+ Add next date / session</button><small class="muted">For multiple sessions, add each date with start and end time. The first date is used for sorting.</small></div>
      <div class="field"><label>Duration Hours</label><input type="number" step="0.5" id="aDuration" value="${Number(a.durationHours||0)}"></div>
      <div class="field"><label>CPD Points</label><input type="text" id="aPoints" placeholder="Example: 3, 3.5, 2 CPD points" value="${esc(a.pointsText||a.points||'')}"></div>
      <div class="field"><label>Category</label><select id="aCategory"><option ${a.category==='Category 1'?'selected':''}>Category 1</option><option ${a.category==='Category 2&3'?'selected':''}>Category 2&3</option><option ${a.category==='General CPD'?'selected':''}>General CPD</option></select></div>
      <div class="field"><label>Fee</label><select id="aFeeType"><option ${a.feeType==='Free'?'selected':''}>Free</option><option ${a.feeType==='Paid'?'selected':''}>Paid</option></select></div>
      <div class="field"><label>Fee Amount / Notes</label><input id="aFeeAmount" value="${esc(a.feeAmount||'')}"></div>
      <div class="field"><label>Location / Online</label><input id="aLocation" value="${esc(a.location||'')}"></div>
      <div class="field" style="grid-column:1/-1"><label>Registration Link</label><input id="aLink" placeholder="https://example.com or www.example.com" value="${esc(a.registrationLink||'')}"></div>
      <div class="field" style="grid-column:1/-1"><label>Activity Poster Image</label><input id="aImageUrl" type="hidden" value="${esc(a.imageUrl||'')}"><div class="image-upload-row"><button type="button" class="btn ghost small" onclick="document.getElementById('aImageFile').click()">Upload poster image</button><input id="aImageFile" type="file" accept="image/*" style="display:none" onchange="CPD.handleActivityImage(this)"><button type="button" class="btn ghost small" onclick="document.getElementById('aImageUrl').value='';document.getElementById('aImagePreview').innerHTML=''">Remove image</button></div><div id="aImagePreview" class="activity-image-preview">${a.imageUrl?`<img src="${esc(a.imageUrl)}" onerror="this.style.display='none'">`:''}</div><small class="muted">Recommended: JPG/PNG under 1 MB. The image will appear for staff and admin.</small></div>
      <div class="field" style="grid-column:1/-1"><label>Description</label><textarea id="aDesc">${esc(a.description||'')}</textarea></div>
    </div><button class="btn" onclick="CPD.saveActivity('${a.id||''}')">Save Activity</button>${id?`<button class="btn ghost" onclick="CPD.deactivateActivity('${a.id}')">Deactivate</button>`:''}</div>`);
    setTimeout(()=>renderSessionRows(mode,sessions),0);
  },
  saveActivity:async(id)=>{
    const sessions=getActivitySessionsFromForm();
    const first=sessions[0]||{};
    const a={id:id||undefined,title:document.getElementById('aTitle').value.trim(),provider:document.getElementById('aProvider').value.trim(),type:document.getElementById('aType').value,eventMode:document.getElementById('aEventMode').value,sessions:sessions,eventDate:first.date||null,startTime:first.start||'',endTime:first.end||'',multipleDates:activityScheduleTextForDb(sessions),durationHours:Number(document.getElementById('aDuration').value||0),points:document.getElementById('aPoints').value.trim(),pointsText:document.getElementById('aPoints').value.trim(),category:document.getElementById('aCategory').value,feeType:document.getElementById('aFeeType').value,feeAmount:document.getElementById('aFeeAmount').value.trim(),location:document.getElementById('aLocation').value.trim(),registrationLink:normalizeExternalUrl(document.getElementById('aLink').value.trim()),imageUrl:document.getElementById('aImageUrl').value.trim(),description:document.getElementById('aDesc').value.trim(),status:'active'};
    try{const payload=activityToDb(a);let savedActivity=null;if(id){const {data,error}=await getDb().from('cpd_activities').update(payload).eq('id',id).select().single();if(error)throw error;savedActivity=dbToActivity(data)}else{const {data,error}=await getDb().from('cpd_activities').insert(payload).select().single();if(error)throw error;savedActivity=dbToActivity(data);state.activities=[savedActivity,...(state.activities||[])];await notifyStaffAboutActivity(savedActivity.title)}closeModal();await loadAll();if(currentRoute!=='activities') currentRoute='activities';renderRoute();toast('CPD activity saved')}catch(e){console.error(e);toast(e.message||'Activity save failed')}
  },
  deactivateActivity:async(id)=>{try{await getDb().from('cpd_activities').update({status:'inactive'}).eq('id',id);closeModal();await loadAll();renderRoute();toast('Activity deactivated')}catch(e){toast(e.message||'Could not deactivate')}},
  handleActivityImage:(input)=>{
    const file=input.files&&input.files[0];
    if(!file) return;
    if(!file.type.startsWith('image/')){toast('Please choose an image file');return}
    if(file.size>1500000){toast('Image is large. Please use an image under 1.5 MB.');return}
    const reader=new FileReader();
    reader.onload=e=>{
      document.getElementById('aImageUrl').value=e.target.result;
      document.getElementById('aImagePreview').innerHTML=`<img src="${e.target.result}">`;
      toast('Image attached');
    };
    reader.readAsDataURL(file);
  },
  viewActivity:(id)=>{
    const a=state.activities.find(x=>x.id===id);
    if(!a){toast('Activity not found');return}
    const registrations=state.activityRegistrations.filter(r=>r.activity_id===a.id).length;
    modal(`<div class="modal-card activity-detail-modal">
      <div class="modal-head"><h2>${esc(a.title)}</h2><button class="btn ghost small" onclick="closeModal()">Close</button></div>
      ${a.imageUrl?`<img class="activity-detail-img" src="${esc(a.imageUrl)}" alt="${esc(a.title)} poster" onerror="this.style.display='none'">`:''}
      <div class="activity-detail-grid">
        <div><b>Type</b><span>${esc(a.type||'CPD Activity')}</span></div>
        <div><b>Date / Schedule</b><span>${esc(activityDatesText(a)).replace(/\n/g,'<br>')}</span></div>
        <div><b>Duration</b><span>${a.durationHours||0} hours</span></div>
        <div><b>Points</b><span>${activityPointsText(a)}</span></div>
        <div><b>Category</b><span>${esc(a.category||'Category TBA')}</span></div>
        <div><b>Fee</b><span>${activityFee(a)}</span></div>
        <div><b>Location</b><span>${esc(a.location||'Online / TBA')}</span></div>
        <div><b>Interested</b><span>${registrations}</span></div>
      </div>
      <div class="activity-detail-desc"><h3>Description</h3><p>${esc(a.description||'No description provided.')}</p></div>
      <div class="activity-actions">
        ${a.registrationLink?`<button class="btn" onclick="CPD.registerActivity('${a.id}',true)">Register & Open Link</button>`:`<button class="btn" onclick="CPD.registerActivity('${a.id}',false)">I'm Interested</button>`}
        ${current?.role==='admin'?`<button class="btn ghost" onclick="closeModal();CPD.openActivityModal('${a.id}')">Edit Activity</button>`:''}
      </div>
    </div>`)
  },
  registerActivity:async(id,openLink=false)=>{try{const a=state.activities.find(x=>x.id===id);if(!a){toast('Activity not found');return}if(!current){landingView('login');toast('Please login to register', true);return}const exists=state.activityRegistrations.find(r=>r.activity_id===id&&(r.staff_id===current.id||r.username===current.username));if(!exists){const {error}=await getDb().from('cpd_activity_registrations').insert({activity_id:id,staff_id:current.id,staff_name:current.fullName,username:current.username,status:'registered'});if(error)throw error}const url=normalizeExternalUrl(a.registrationLink);if(openLink&&url){openExternalUrl(url)}await loadAll();renderRoute();toast(openLink&&url?'Registration saved and link opened':'Interest saved')}catch(e){toast(e.message||'Registration failed')}},
  exportActivities:()=>downloadCSV('cpd_activities.csv',(state.activities||[]).map(a=>({title:a.title,provider:a.provider,type:a.type,date:a.eventDate,multiple_dates:a.multipleDates,duration_hours:a.durationHours,points:a.pointsText||a.points,category:a.category,fee:activityFee(a),location:a.location,link:a.registrationLink,status:a.status}))),
  exportUsers:()=>downloadCSV('staff_usernames.csv',activeStaff().map(u=>({full_name:u.fullName,username:u.username,password:u.password,department:u.department,area:u.area,dhp_license:u.dhpLicense,email:u.email,mobile:u.mobile}))),
  exportReport:()=>downloadCSV('cpd_report.csv',activeStaff().map(u=>{const r=categoryStatus(u),s=status(u);return{full_name:u.fullName,username:u.username,department:u.department,area:u.area,dhp_expiry:u.dhpExpiry,category1:u.category1,category23:u.category23,total:total(u),remaining_total:r.totalRemain,status:s[0]}})),
  exportReminderList:()=>downloadCSV('dhp_email_reminders.csv',activeStaff().filter(u=>{const m=monthsUntil(u.dhpExpiry);return m!==null&&m<=state.reminderMonthsBefore&&m>=0}).map(u=>({full_name:u.fullName,email:u.email,dhp_expiry:u.dhpExpiry,days_remaining:daysUntil(u.dhpExpiry),mobile:u.mobile})))
};
window.landingView=landingView; window.closeModal=closeModal; window.checkAndSendAlerts=checkAndSendAlerts;
window.CPD_DEBUG = function(){ return {url: window.CPD_SUPABASE_URL, hasKey: !!window.CPD_SUPABASE_ANON_KEY, supabaseLoaded: !!window.supabase, clientReady: !!window.supabaseClient}; };
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{setTimeout(init,0)}function fmtDateTime(v){return v ? new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Never'}



function enhanceStaffDashboard(){
  try{
    const shell=document.querySelector('.main, main, #app, .content, .page-content');
    if(!shell || shell.dataset.staffDashEnhanced==='1') return;
    let u=null;
    try{ u=window.current || window.currentUser || current; }catch(e){ u=window.current || window.currentUser; }
    if(!u || u.role !== 'staff') return;
    const cat1=Number(u.cat1||u.category1||u.cat_1||0);
    const cat23=Number(u.cat23||u.cat2_3||u.category23||0);
    const total=Number(u.total||u.total_cpd||(cat1+cat23))||0;
    const expiry=u.dhp_expiry||u.dhpExpiry||u.license_expiry||'';
    let days=''; if(expiry){ const d=Math.ceil((new Date(expiry)-new Date())/86400000); if(!Number.isNaN(d)) days=d; }
    const pct=Math.max(0,Math.min(100,Math.round((total/80)*100)));
    const name=u.full_name||u.fullName||u.name||u.username||'Staff';
    const alert=(days!==''&&days<=120)?`DHP renewal attention: ${days} days remaining`:(pct<50?'CPD progress below target':'Your profile is on track');
    const html=`<section class="staff-v57-hero"><div><span class="pill">Staff CPD Dashboard</span><h1>Welcome, ${safeHtml(name)} 👋</h1><p>Track your CPD progress, DHP renewal readiness, and quick actions in one place.</p></div><div class="staff-v57-ring" style="--pct:${pct}"><div>${pct}%</div></div></section>
<section class="staff-v57-cards"><div class="staff-v57-card"><b>📊 Total CPD</b><strong>${total}/80</strong><span>${pct}% completed</span></div><div class="staff-v57-card"><b>📘 Category 1</b><strong>${cat1}/40</strong><span>Required category</span></div><div class="staff-v57-card"><b>📗 Category 2&3</b><strong>${cat23}/40</strong><span>Combined category</span></div><div class="staff-v57-card alert"><b>⏳ DHP Renewal</b><strong>${days===''?'Update':days+' days'}</strong><span>${expiry||'Expiry date missing'}</span></div></section>
<section class="staff-v57-alert"><b>🔔 Smart Alert</b><span>${safeHtml(alert)}</span></section>
<section class="staff-v57-actions"><button class="btn login-btn" onclick="go('myprofile')">👤 My Profile</button><button class="btn soft-btn" onclick="go('cpd')">📚 CPD Activities</button><button class="btn soft-btn" onclick="window.print()">🖨️ Print Summary</button></section>`;
    shell.insertAdjacentHTML('afterbegin',html);
    shell.dataset.staffDashEnhanced='1';
  }catch(e){}
}
setInterval(enhanceStaffDashboard,1200);

setInterval(setGoldPageClass, 800);

function applyProgressAccentRows(){
  try{
    document.querySelectorAll('tbody tr').forEach(tr=>{
      if(tr.classList.contains('progress-accent-complete') || tr.classList.contains('progress-accent-good') || tr.classList.contains('progress-accent-warning') || tr.classList.contains('progress-accent-danger') || tr.classList.contains('progress-accent-trainee')) return;
      const text=(tr.textContent||'').toLowerCase();
      const match=(tr.textContent||'').match(/(\d{1,3})\s*%/);
      let pct = match ? Number(match[1]) : null;
      if(text.includes('trainee nurse') || text.includes('not required')) tr.classList.add('progress-accent-trainee');
      else if(pct!==null && pct>=100) tr.classList.add('progress-accent-complete');
      else if(pct!==null && pct>=75) tr.classList.add('progress-accent-good');
      else if(pct!==null && pct>=50) tr.classList.add('progress-accent-warning');
      else tr.classList.add('progress-accent-danger');
    });
  }catch(e){}
}
setInterval(applyProgressAccentRows, 900);


/* GOLD V66+V58B: safe activity list rendering guard */
setTimeout(()=>{
  try{
    if(window.CPD && typeof window.CPD.filterActivities === 'function' && !window.CPD.__goldSafeFilterApplied){
      const originalFilterActivities = window.CPD.filterActivities;
      window.CPD.filterActivities = function(){
        if(!document.getElementById('activitiesList')) return;
        return originalFilterActivities();
      };
      window.CPD.__goldSafeFilterApplied = true;
    }
  }catch(e){}
}, 1000);


/* GOLD V68 Responsive Enterprise - mobile/tablet layer only */
function goldV68ResponsiveEnhance(){
  try{
    document.body.classList.add('gold-v68-responsive');
    const route = String(currentRoute || '').toLowerCase();
    document.body.classList.toggle('gold-v68-staff-route', route === 'staff');
    document.body.classList.toggle('gold-v68-reminders-route', route === 'reminders');
    document.body.classList.toggle('gold-v68-profile-route', route === 'profile');
    document.body.classList.toggle('gold-v68-activities-route', route === 'activities');
    document.querySelectorAll('table').forEach(table=>{
      if(table.__goldV68Labelled) return;
      table.__goldV68Labelled = true;
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => (th.textContent || '').trim());
      table.querySelectorAll('tbody tr').forEach(tr=>{
        Array.from(tr.children).forEach((td, i)=>{
          if(headers[i]) td.setAttribute('data-label', headers[i]);
        });
      });
    });
    document.querySelectorAll('.circle-progress, .gold-hero-ring').forEach(r=>r.classList.add('gold-v68-ring'));
  }catch(e){}
}
setInterval(goldV68ResponsiveEnhance, 700);
setTimeout(goldV68ResponsiveEnhance, 150);


/* V90 final notification visibility override */
function visibleNotifications(){
  try{
    if(!current) return [];
    const currentId = String(current.id || '');
    const currentUsername = String(current.username || '').toLowerCase();
    return (state.notifications || [])
      .filter(n => {
        const type=String(n.type || '').toLowerCase();
        const status=String(n.status || '').toLowerCase();
        if(status==='sent_log' || type.includes('email sent') || type.includes('email log')) return false;
        const rid=String(n.recipient_user_id || n.user_id || n.userId || '');
        const run=String(n.recipient_username || '').toLowerCase();
        return rid===currentId || (!!run && run===currentUsername);
      })
      .sort((a,b)=>new Date(b.created_at || b.createdAt || 0)-new Date(a.created_at || a.createdAt || 0));
  }catch(e){return [];}
}
function visibleUnreadNotifications(){ return visibleNotifications().filter(n => (n.status||'unread')==='unread' && !n.read && !n.is_read); }
