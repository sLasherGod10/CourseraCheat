const DEFAULTS = {
  playbackSpeed: 1,
  autoSpeed: true,
  autoNext: false,
  checklist: {}
};

async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...stored, checklist: stored.checklist || {} };
}
async function updateSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.local.set(next);
  return next;
}
function clampSpeed(speed) { const n = Number(speed); return Number.isFinite(n) ? Math.min(4, Math.max(1, n)) : 1; }
function normalizeStatus(raw) {
  const value = String(raw ?? '').trim();
  if (/^(completed|complete|done|passed)$/i.test(value)) return 'completed';
  if (/^(not started|pending|incomplete|to do)$/i.test(value)) return 'pending';
  if (/in progress|started|current/i.test(value)) return 'in-progress';
  return 'unknown';
}
function discoverCourseItems(root = document) {
  const candidates = [...root.querySelectorAll('a[href]')]; const seen = new Set(); const items = [];
  for (const anchor of candidates) {
    const href = anchor.href || ''; if (!href.includes('/learn/')) continue;
    const text = (anchor.textContent || '').replace(/\s+/g, ' ').trim(); if (!text || text.length < 2 || text.length > 180) continue;
    const id = href.split('#')[0]; if (seen.has(id)) continue; seen.add(id);
    const scope = anchor.closest('[data-testid], li, article, div');
    const statusNode = scope?.querySelector('[aria-label*="complete" i], [data-testid*="complete" i], [class*="complete" i]');
    const rawStatus = statusNode?.getAttribute('aria-label') || statusNode?.textContent || '';
    const status = normalizeStatus(rawStatus);
    const type = /quiz|assignment|exam|assessment/i.test(text) ? 'assessment' : /reading|article|supplement/i.test(text) ? 'reading' : 'lesson';
    items.push({ id, title: text, url: id, type, status, source: status === 'unknown' ? 'unverified' : 'page' });
  }
  return items.slice(0, 200);
}
function mergeChecklist(items, checklist) { return items.map(item => item.status !== 'unknown' ? item : checklist[item.id] === true ? { ...item, status: 'completed', source: 'manual' } : checklist[item.id] === false ? { ...item, status: 'pending', source: 'manual' } : item); }
function calculateProgress(items) {
  const verified = items.filter(item => ['completed','pending','in-progress'].includes(item.status));
  const completed = verified.filter(item => item.status === 'completed').length;
  return { total: verified.length, completed, percentage: verified.length ? Math.round(completed / verified.length * 100) : 0, verified: verified.length > 0 };
}
function findNextControl(root = document) {
  for (const selector of ['button[aria-label*="next" i]','a[aria-label*="next" i]','button[data-testid*="next" i]','[role="button"][aria-label*="next" i]']) {
    const node = root.querySelector(selector); if (node && !node.disabled && node.getAttribute('aria-disabled') !== 'true') return node;
  }
  return null;
}

class PlaybackController {
  constructor({ onStateChange = () => {}, getAutoNext = () => false } = {}) { this.speed=1; this.autoSpeed=true; this.getAutoNext=getAutoNext; this.onStateChange=onStateChange; this.observer=null; this.boundVideos=new WeakSet(); }
  setSpeed(speed) { this.speed=clampSpeed(speed); document.querySelectorAll('video').forEach(v => v.playbackRate=this.speed); this.onStateChange({speed:this.speed}); }
  setAutoSpeed(enabled) { this.autoSpeed=Boolean(enabled); if (this.autoSpeed) this.setSpeed(this.speed); }
  bindVideo(video) {
    if (!(video instanceof HTMLMediaElement) || this.boundVideos.has(video)) return;
    video.addEventListener('ended', () => {
      if (!this.getAutoNext()) return;
      const next=findNextControl();
      if (next) next.click(); else this.onStateChange({warning:'Auto-next is enabled, but no identifiable next-lesson control was found.'});
    });
    this.boundVideos.add(video); if (this.autoSpeed) video.playbackRate=this.speed;
  }
  scan() { document.querySelectorAll('video').forEach(v=>this.bindVideo(v)); }
  start() { this.scan(); this.observer?.disconnect(); this.observer=new MutationObserver(()=>this.scan()); this.observer.observe(document.documentElement,{childList:true,subtree:true}); }
}

let controller;
let runtimeSettings;
async function init() {
  runtimeSettings=await getSettings();
  controller=new PlaybackController({getAutoNext:()=>runtimeSettings.autoNext,onStateChange:state=>chrome.runtime.sendMessage({type:'PLAYBACK_STATE',state}).catch(()=>{})});
  controller.setSpeed(runtimeSettings.playbackSpeed); controller.setAutoSpeed(runtimeSettings.autoSpeed); controller.start();
}
chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  (async()=>{
    if(message.type==='GET_COURSE_STATE'){const settings=await getSettings();const items=mergeChecklist(discoverCourseItems(document),settings.checklist);sendResponse({ok:true,items,progress:calculateProgress(items),url:location.href,title:document.title});return;}
    if(message.type==='SET_PLAYBACK'){
      if(message.speed!=null){controller.setSpeed(message.speed);await updateSettings({playbackSpeed:controller.speed});}
      if(message.autoSpeed!=null){ runtimeSettings.autoSpeed=Boolean(message.autoSpeed); controller.setAutoSpeed(runtimeSettings.autoSpeed); await updateSettings({autoSpeed:runtimeSettings.autoSpeed}); }
      if(message.autoNext!=null){ runtimeSettings.autoNext=Boolean(message.autoNext); await updateSettings({autoNext:runtimeSettings.autoNext}); }
      sendResponse({ok:true,speed:controller.speed});return;
    }
    if(message.type==='CHECKLIST_UPDATE'){const current=await getSettings();await updateSettings({checklist:{...current.checklist,[message.id]:Boolean(message.completed)}});sendResponse({ok:true});return;}
    sendResponse({ok:false,error:'Unknown message.'});
  })().catch(error=>sendResponse({ok:false,error:error.message}));
  return true;
});
init().catch(error=>chrome.runtime.sendMessage({type:'CONTENT_ERROR',error:error.message}).catch(()=>{}));
