'use strict';

// ── Hamburger menu ─────────────────────────────────────────────────────────────
const hamburgerBtn  = document.getElementById('nav-hamburger');
const menuOverlay   = document.getElementById('menu-overlay');
const mainNavEl     = document.getElementById('main-nav');

let menuOpen = false;

function openMenu() {
  menuOpen = true;
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  hamburgerBtn.setAttribute('aria-label', 'Cerrar menú');
  hamburgerBtn.classList.add('is-open');
  menuOverlay.classList.add('open');
  menuOverlay.removeAttribute('aria-hidden');
  document.body.classList.add('menu-is-open');
}

function closeMenu() {
  menuOpen = false;
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  hamburgerBtn.setAttribute('aria-label', 'Abrir menú');
  hamburgerBtn.classList.remove('is-open');
  menuOverlay.classList.remove('open');
  menuOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('menu-is-open');
}

hamburgerBtn?.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen) closeMenu();
});

// ── Nav scrolled state ─────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  mainNavEl?.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ── Custom cursor ──────────────────────────────────────────────────────────────
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = -100, my = -100, rx = -100, ry = -100;
  let rafRunning = false;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    if (!rafRunning) {
      rafRunning = true;
      requestAnimationFrame(lerpRing);
    }
  });

  function lerpRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    const d = Math.hypot(mx - rx, my - ry);
    rafRunning = d > 0.3;
    if (rafRunning) requestAnimationFrame(lerpRing);
  }

  const hoverables = 'a, button, [role="button"], input, label, select, textarea, .treatment-card, .faq-question';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverables)) {
      dot.classList.add('is-hovering');
      ring.classList.add('is-hovering');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverables)) {
      dot.classList.remove('is-hovering');
      ring.classList.remove('is-hovering');
    }
  });

  // Dark sections
  const menuOv = document.getElementById('menu-overlay');
  if (menuOv) {
    const mo = new MutationObserver(() => {
      const dark = menuOv.classList.contains('open');
      dot.classList.toggle('on-dark', dark);
      ring.classList.toggle('on-dark', dark);
    });
    mo.observe(menuOv, { attributes: true, attributeFilter: ['class'] });
  }
}

// ── Page transitions ───────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href) return;
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
  if (link.target === '_blank') return;
  if (href.includes('://') && !href.includes(window.location.hostname)) return;

  e.preventDefault();
  if (menuOpen) closeMenu();

  document.body.classList.add('page-exit');
  setTimeout(() => { window.location.href = href; }, 380);
});
