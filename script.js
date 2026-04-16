/* ===========================================================================
   DENTAL CLINIC — SCROLL-DRIVEN FRAME ANIMATION
   ===========================================================================
   Architecture:
     1. Fetch frames/config.json  → learn totalFrames, dimensions
     2. Preload all Image objects  → progressive loading, progress bar
     3. When ready: hide loader, mark body.loaded, draw frame 0
     4. On scroll: map progress [0..1] → frameIndex → requestAnimationFrame
     5. Canvas is retina-aware (devicePixelRatio scaling)
     6. Frame is drawn with contain behavior + centered composition
   =========================================================================== */

'use strict';

// ── Configuration ─────────────────────────────────────────────────────────────
const CFG = {
  framesDir:      'frames',
  framePrefix:    'frame_',
  frameExt:       '.webp',
  framePad:       4,          // Zero-padding digits in filenames (frame_0001)
  textFadeEnd:    0.12,       // Scroll progress at which hero text is fully gone
  canvasPadding:  60,         // px of breathing room around animation (desktop)
  canvasPadMobile: 0,         // px on mobile (fills width fully)
  mobileBreak:    640,        // px — below this, use mobile padding
};

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  totalFrames:   0,
  frames:        [],          // Image[] — indexed 0 … totalFrames-1
  loadedCount:   0,
  currentIndex:  -1,
  isReady:       false,
  rafId:         null,
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas          = document.getElementById('hero-canvas');
const ctx             = canvas.getContext('2d');
const loadingOverlay  = document.getElementById('loading-overlay');
const loadingFill     = document.getElementById('loading-fill');
const loadingLabel    = document.getElementById('loading-label');
const loadingBar      = document.getElementById('loading-progressbar');
const heroText        = document.getElementById('hero-text');
const scrollIndicator = document.getElementById('scroll-indicator');
const heroSection     = document.getElementById('hero-section');
const mainNav         = document.getElementById('main-nav');

// ── Accessibility: reduced motion ─────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===========================================================================
   CANVAS — Retina / HiDPI setup
   We multiply the canvas's internal buffer by devicePixelRatio,
   then scale the drawing context so all coordinates remain in CSS pixels.
   =========================================================================== */

function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const W   = window.innerWidth;
  const H   = window.innerHeight;

  // Physical pixel buffer
  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  // CSS display size
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;

  // Scale context → all subsequent draw calls use CSS pixel units
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Image quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

/* ===========================================================================
   FRAME DRAWING — Contain + centered composition
   The dental animation fills as much space as possible while preserving
   its aspect ratio. White breathing room surrounds it on all sides.
   =========================================================================== */

function getPadding() {
  return window.innerWidth <= CFG.mobileBreak
    ? CFG.canvasPadMobile
    : CFG.canvasPadding;
}

function drawFrame(index) {
  if (index < 0 || index >= state.totalFrames) return;

  const img = state.frames[index];

  // Frame not yet loaded — show nearest available frame instead
  if (!img || !img.complete || img.naturalWidth === 0) {
    drawNearestLoaded(index);
    return;
  }

  const pad    = getPadding();
  const W      = window.innerWidth;
  const H      = window.innerHeight;
  const availW = W - pad * 2;
  const availH = H - pad * 2;

  // Aspect-ratio-preserving "contain" fit
  const imgRatio  = img.naturalWidth / img.naturalHeight;
  const availRatio = availW / availH;

  let drawW, drawH;
  if (imgRatio > availRatio) {
    // Landscape image in portrait-ish space → fit to width
    drawW = availW;
    drawH = availW / imgRatio;
  } else {
    // Portrait image in landscape-ish space → fit to height
    drawH = availH;
    drawW = availH * imgRatio;
  }

  // Center in viewport
  const drawX = (W - drawW) / 2;
  const drawY = (H - drawH) / 2;

  // Clear (transparent → white via CSS background)
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

/**
 * When the target frame isn't loaded yet, find the nearest one
 * that is available (search outward from target index).
 */
function drawNearestLoaded(targetIndex) {
  let lo = targetIndex - 1;
  let hi = targetIndex + 1;

  while (lo >= 0 || hi < state.totalFrames) {
    if (lo >= 0) {
      const img = state.frames[lo];
      if (img && img.complete && img.naturalWidth > 0) { drawFrame(lo); return; }
      lo--;
    }
    if (hi < state.totalFrames) {
      const img = state.frames[hi];
      if (img && img.complete && img.naturalWidth > 0) { drawFrame(hi); return; }
      hi++;
    }
  }
}

/* ===========================================================================
   SCROLL HANDLER
   Maps scroll progress within the hero section [0..1] to a frame index.
   =========================================================================== */

function getScrollProgress() {
  const sectionTop    = heroSection.offsetTop;
  const sectionHeight = heroSection.offsetHeight;
  const scrollRange   = sectionHeight - window.innerHeight;
  if (scrollRange <= 0) return 0;
  return Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollRange));
}

function onScroll() {
  // Nav frosted glass
  mainNav.classList.toggle('scrolled', window.scrollY > 10);

  const progress = getScrollProgress();

  // Fade hero text and scroll indicator during early scroll (0 → textFadeEnd)
  if (!prefersReducedMotion) {
    const textOpacity = Math.max(0, 1 - progress / CFG.textFadeEnd);
    heroText.style.opacity         = textOpacity;
    scrollIndicator.style.opacity  = textOpacity;
  }

  if (!state.isReady) return;

  // Map progress to frame index
  const targetIndex = Math.round(progress * (state.totalFrames - 1));

  if (targetIndex === state.currentIndex) return;
  state.currentIndex = targetIndex;

  // Coalesce rapid scroll events into one draw per animation frame
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = requestAnimationFrame(() => {
    drawFrame(state.currentIndex);
    state.rafId = null;
  });
}

/* ===========================================================================
   FRAME LOADING — Progressive preload
   All Image objects are created simultaneously so the browser can queue
   and pipeline requests efficiently (HTTP/2 or HTTP/1.1 connection pool).
   Progress updates as each individual frame resolves.
   =========================================================================== */

function frameSrc(index) {
  const num = String(index + 1).padStart(CFG.framePad, '0');
  return `${CFG.framesDir}/${CFG.framePrefix}${num}${CFG.frameExt}`;
}

function onFrameResolved() {
  state.loadedCount++;
  const pct = Math.round((state.loadedCount / state.totalFrames) * 100);

  // Update progress bar
  loadingFill.style.width = `${pct}%`;
  loadingBar.setAttribute('aria-valuenow', pct);
  loadingLabel.textContent = `Cargando  ${pct}%`;

  // Draw first available frame so the canvas isn't blank while loading
  if (state.loadedCount === 1) {
    const img = state.frames[0];
    if (img && img.complete && img.naturalWidth > 0) drawFrame(0);
  }

  if (state.loadedCount >= state.totalFrames) {
    onAllLoaded();
  }
}

function loadSingleFrame(index) {
  const img    = new Image();
  img.decoding = 'async';  // Allow browser to defer decode off main thread

  img.onload  = onFrameResolved;
  img.onerror = onFrameResolved;  // Missing frame → don't stall; just skip

  state.frames[index] = img;
  img.src = frameSrc(index);
}

function onAllLoaded() {
  state.isReady = true;

  // Draw the correct frame for the current scroll position
  const progress = getScrollProgress();
  state.currentIndex = Math.round(progress * (state.totalFrames - 1));
  drawFrame(state.currentIndex);

  // Fade out loading overlay
  loadingOverlay.classList.add('hidden');
  loadingOverlay.addEventListener(
    'transitionend',
    () => { loadingOverlay.style.display = 'none'; },
    { once: true }
  );

  // Reveal hero UI
  document.body.classList.add('loaded');
}

async function loadAllFrames() {
  // ── Read config.json ───────────────────────────────────────────────────────
  let config;
  try {
    const res = await fetch(`${CFG.framesDir}/config.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    config = await res.json();
  } catch (err) {
    showError(
      'Ejecuta <code>extract-frames.sh</code> para generar los fotogramas, ' +
      'luego sirve el proyecto con un servidor local.'
    );
    console.error('[DentalClinic] frames/config.json not found.', err);
    console.info('Run: chmod +x extract-frames.sh && ./extract-frames.sh');
    return;
  }

  state.totalFrames = config.totalFrames || 0;

  if (state.totalFrames < 1) {
    showError('No se encontraron fotogramas. Revisa frames/config.json.');
    return;
  }

  state.frames = new Array(state.totalFrames).fill(null);

  // ── Launch all loads simultaneously ───────────────────────────────────────
  // Browsers throttle concurrent requests automatically (connection pool).
  // Launching all at once ensures the browser fills its pipeline immediately.
  for (let i = 0; i < state.totalFrames; i++) {
    loadSingleFrame(i);
  }
}

function showError(message) {
  loadingLabel.innerHTML = message;
  loadingFill.style.background = '#dc2626';
  loadingFill.style.width = '100%';
}

/* ===========================================================================
   RESIZE — Recalculate canvas and redraw
   =========================================================================== */

let resizeTimer;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    setupCanvas();
    const idx = state.currentIndex >= 0 ? state.currentIndex : 0;
    if (state.isReady) drawFrame(idx);
  }, 120);
}

/* ===========================================================================
   SECTION REVEAL — IntersectionObserver
   Adds .in-view to .reveal elements as they enter the viewport.
   =========================================================================== */

function initReveal() {
  if (prefersReducedMotion) return;   // CSS already overrides to visible

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

/* ===========================================================================
   REDUCED MOTION — Static fallback
   Show first frame statically; keep hero text visible; skip all animations.
   =========================================================================== */

function applyReducedMotionFallback() {
  // Hero text starts visible, never fades
  heroText.style.opacity = '1';
  heroText.style.transition = 'none';
  scrollIndicator.style.display = 'none';

  // Remove scroll-section height so page scrolls normally
  heroSection.style.height = '100vh';

  // Remove sticky behaviour — just a normal full-viewport header
  document.querySelector('.sticky-container').style.position = 'relative';
}

/* ===========================================================================
   INIT
   =========================================================================== */

async function init() {
  if (prefersReducedMotion) {
    applyReducedMotionFallback();
  }

  setupCanvas();

  // Passive scroll listener — won't block scrolling
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  initReveal();
  onScroll();             // Sync nav + hero opacity on first paint

  await loadAllFrames();  // Async — kicks off preloading
}

// Run after DOM is interactive
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
