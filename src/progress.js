const COMPLETE_RE = /^(completed|complete|done|passed)$/i;
const PENDING_RE = /^(not started|pending|incomplete|to do)$/i;

export function normalizeStatus(raw) {
  const value = String(raw ?? '').trim();
  if (COMPLETE_RE.test(value)) return 'completed';
  if (PENDING_RE.test(value)) return 'pending';
  if (/in progress|started|current/i.test(value)) return 'in-progress';
  return 'unknown';
}

export function calculateProgress(items) {
  const verified = items.filter(item => ['completed', 'pending', 'in-progress'].includes(item.status));
  const completed = verified.filter(item => item.status === 'completed').length;
  const percentage = verified.length ? Math.round((completed / verified.length) * 100) : 0;
  return { total: verified.length, completed, percentage, verified: verified.length > 0 };
}

export function mergeChecklist(items, checklist) {
  return items.map(item => {
    const manual = checklist[item.id];
    if (item.status !== 'unknown') return item;
    if (manual === true) return { ...item, status: 'completed', source: 'manual' };
    if (manual === false) return { ...item, status: 'pending', source: 'manual' };
    return item;
  });
}

export function discoverCourseItems(root = document) {
  const candidates = [...root.querySelectorAll('a[href]')];
  const seen = new Set();
  const items = [];
  for (const anchor of candidates) {
    const href = anchor.href || '';
    if (!href.includes('/learn/')) continue;
    const text = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 2 || text.length > 180) continue;
    const id = href.split('#')[0];
    if (seen.has(id)) continue;
    seen.add(id);
    const statusNode = anchor.closest('[data-testid], li, article, div')?.querySelector('[aria-label*="complete" i], [data-testid*="complete" i], [class*="complete" i]');
    const rawStatus = statusNode?.getAttribute('aria-label') || statusNode?.textContent || '';
    const status = normalizeStatus(rawStatus);
    const type = /quiz|assignment|exam|assessment/i.test(text) ? 'assessment' : /reading|article|supplement/i.test(text) ? 'reading' : 'lesson';
    items.push({ id, title: text, url: id, type, status, source: status === 'unknown' ? 'unverified' : 'page' });
  }
  return items.slice(0, 200);
}

export const __testing = { normalizeStatus, calculateProgress, mergeChecklist };
