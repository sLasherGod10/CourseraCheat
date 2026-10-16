import { getSettings, updateSettings } from './storage.js';
import { GeminiProvider, buildStudyPrompt } from './gemini.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let settings;
let activeMode = 'explain';
let courseState = { items: [], progress: { percentage: 0 } };

async function getTab() { const tabs = await chrome.tabs.query({ active: true, currentWindow: true }); return tabs[0]; }
async function sendToPage(message) { const tab = await getTab(); if (!tab?.id) throw new Error('No active tab.'); return chrome.tabs.sendMessage(tab.id, message); }

function renderState() {
  const { items, progress } = courseState;
  $('#progressPct').textContent = `${progress.percentage}%`;
  $('#progressMeter').style.width = `${progress.percentage}%`;
  $('#progressMeta').textContent = progress.verified ? `${progress.completed} of ${progress.total} verified items completed.` : 'No verified course status yet.';
  $('#progressStatus').textContent = progress.verified ? 'Verified' : 'Unverified';
  $('#progressStatus').className = `pill ${progress.verified ? 'positive' : 'neutral'}`;
  const lessons = items.filter(x => x.type === 'lesson');
  const activities = items.filter(x => x.type === 'assessment' || x.type === 'reading');
  $('#lessonCount').textContent = lessons.length;
  $('#lessonDone').textContent = `${lessons.filter(x => x.status === 'completed').length} completed`;
  $('#activityCount').textContent = activities.length;
  $('#activityTodo').textContent = `${activities.filter(x => x.status !== 'completed').length} need attention`;
  renderList($('#nextList'), items.filter(x => x.status !== 'completed').slice(0, 5), false);
  renderList($('#itemList'), items, true);
}

function renderList(container, items, allowCheck) {
  if (!items.length) { container.className = 'list empty'; container.textContent = 'Nothing discovered yet.'; return; }
  container.className = 'list';
  container.innerHTML = '';
  for (const item of items) {
    const row = document.createElement('div'); row.className = 'list-item';
    const check = document.createElement('button'); check.className = `check ${item.status === 'completed' ? 'done' : ''}`; check.textContent = item.status === 'completed' ? '✓' : ''; check.title = item.source === 'page' ? 'Verified by page' : 'Manual checklist';
    if (allowCheck && item.source !== 'page') check.addEventListener('click', () => toggleManual(item));
    else if (!allowCheck) check.disabled = true;
    const title = document.createElement('div'); title.className = 'item-title'; title.textContent = item.title;
    const meta = document.createElement('div'); meta.className = 'item-meta'; meta.textContent = item.status === 'completed' ? 'Completed' : item.status === 'in-progress' ? 'In progress' : item.status === 'pending' ? 'Pending' : 'Unverified';
    row.append(check, title, meta); container.append(row);
  }
}

async function toggleManual(item) {
  const next = item.status !== 'completed';
  await sendToPage({ type: 'CHECKLIST_UPDATE', id: item.id, completed: next });
  await scan();
}

async function scan() {
  try {
    const state = await sendToPage({ type: 'GET_COURSE_STATE' });
    courseState = state;
    $('#courseTitle').textContent = state.title?.replace(/\s*[|–-]\s*Coursera.*$/i, '') || 'Coursera course';
    $('#courseUrl').textContent = state.url || '';
    renderState();
    $('#playerPill').textContent = 'HTML5 player ready';
    $('#notice').classList.add('hidden');
  } catch (error) {
    $('#courseTitle').textContent = 'Open a Coursera course';
    $('#courseUrl').textContent = error.message.includes('Receiving end') ? 'Reload the Coursera tab after installing the extension.' : error.message;
    $('#notice').textContent = 'CoursePilot could not connect to the current page. Some features require a Coursera lesson tab.';
    $('#notice').classList.remove('hidden');
    $('#playerPill').textContent = 'No player';
  }
}

async function savePlayback() {
  settings = await getSettings();
  await sendToPage({ type: 'SET_PLAYBACK', speed: settings.playbackSpeed, autoSpeed: settings.autoSpeed, autoNext: settings.autoNext });
}

function renderSettings() {
  $('#autoSpeed').checked = settings.autoSpeed;
  $('#autoNext').checked = settings.autoNext;
  $$('#speedGrid button').forEach(btn => btn.classList.toggle('selected', Number(btn.dataset.speed) === settings.playbackSpeed));
  $('#aiPill').textContent = settings.ai.endpoint ? 'Ready' : 'Not configured';
}

async function askAi() {
  const output = $('#aiOutput');
  const input = $('#aiInput').value.trim();
  if (!input) { output.textContent = 'Add notes or a study question first.'; return; }
  output.textContent = 'Thinking…';
  try {
    const provider = new GeminiProvider(settings.ai);
    output.textContent = await provider.generate({ prompt: buildStudyPrompt(activeMode, input), mode: activeMode });
  } catch (error) { output.textContent = error.message; }
}

function bind() {
  $$('.tab').forEach(tab => tab.addEventListener('click', () => { $$('.tab').forEach(t => t.classList.remove('active')); $$('.panel').forEach(p => p.classList.remove('active')); tab.classList.add('active'); $(`[data-panel="${tab.dataset.tab}"]`).classList.add('active'); }));
  $('#refreshBtn').addEventListener('click', scan); $('#scanBtn').addEventListener('click', scan); $('#progressRefresh').addEventListener('click', scan);
  for (const speed of [1,1.25,1.5,1.75,2,2.5,3,3.5,4]) { const b = document.createElement('button'); b.dataset.speed = speed; b.textContent = `${speed}×`; b.addEventListener('click', async () => { settings = await updateSettings({ playbackSpeed: speed }); renderSettings(); await savePlayback(); }); $('#speedGrid').append(b); }
  $('#autoSpeed').addEventListener('change', async e => { settings = await updateSettings({ autoSpeed: e.target.checked }); await savePlayback(); });
  $('#autoNext').addEventListener('change', async e => { settings = await updateSettings({ autoNext: e.target.checked }); await savePlayback(); });
  $('#themeBtn').addEventListener('click', async () => { settings = await updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }); applyTheme(); });
  $$('#aiModes button').forEach(b => b.addEventListener('click', () => { $$('#aiModes button').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); activeMode = b.dataset.mode; }));
  $('#askAi').addEventListener('click', askAi);
  $('#settingsBtn').addEventListener('click', () => alert('Configure the AI endpoint by editing extension settings in chrome.storage.local or add an options page in a future release. For public distribution, use a backend proxy so the API key never ships with the extension.'));
}
function applyTheme() { document.body.classList.toggle('light', settings.theme === 'light'); }

(async function init(){ settings = await getSettings(); applyTheme(); bind(); renderSettings(); await scan(); })();
