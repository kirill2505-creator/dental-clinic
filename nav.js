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
