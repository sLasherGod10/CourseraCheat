const SUPPORTED_SPEEDS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4];

export function clampSpeed(speed) {
  const n = Number(speed);
  if (!Number.isFinite(n)) return 1;
  return Math.min(4, Math.max(1, n));
}

export function findVideos(root = document) {
  return [...root.querySelectorAll('video')];
}

export function findNextControl(root = document) {
  const selectors = [
    'button[aria-label*="next" i]',
    'a[aria-label*="next" i]',
    'button[data-testid*="next" i]',
    '[role="button"][aria-label*="next" i]'
  ];
  for (const selector of selectors) {
    const node = root.querySelector(selector);
    if (node && !node.disabled && node.getAttribute('aria-disabled') !== 'true') return node;
  }
  return null;
}

export class PlaybackController {
  constructor({ onStateChange = () => {}, getAutoNext = () => false } = {}) {
    this.speed = 1;
    this.autoSpeed = true;
    this.getAutoNext = getAutoNext;
    this.onStateChange = onStateChange;
    this.observer = null;
    this.boundVideos = new WeakSet();
    this.handlers = new WeakMap();
  }

  setSpeed(speed) {
    this.speed = clampSpeed(speed);
    for (const video of findVideos()) video.playbackRate = this.speed;
    this.onStateChange({ speed: this.speed });
  }

  setAutoSpeed(enabled) {
    this.autoSpeed = Boolean(enabled);
    if (this.autoSpeed) this.setSpeed(this.speed);
  }

  bindVideo(video) {
    if (!(video instanceof HTMLMediaElement) || this.boundVideos.has(video)) return;
    const ended = () => {
      if (!this.getAutoNext()) return;
      const next = findNextControl();
      if (next) next.click();
      else this.onStateChange({ warning: 'Auto-next is enabled, but no identifiable next-lesson control was found.' });
    };
    video.addEventListener('ended', ended);
    this.boundVideos.add(video);
    this.handlers.set(video, ended);
    if (this.autoSpeed) video.playbackRate = this.speed;
  }

  scan() {
    findVideos().forEach(video => this.bindVideo(video));
  }

  start() {
    this.scan();
    this.observer?.disconnect();
    this.observer = new MutationObserver(() => this.scan());
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
  }
}

export const __testing = { SUPPORTED_SPEEDS, clampSpeed, findNextControl };
