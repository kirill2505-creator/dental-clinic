'use strict';

// ── Scroll reveal ──────────────────────────────────────────────────────────────
const revealObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObs.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.reveal').forEach((el) => revealObs.observe(el));

// ── Counter animation ──────────────────────────────────────────────────────────
function animateCounter(el) {
  const raw    = el.dataset.count;
  const target = parseFloat(raw);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const isInt  = Number.isInteger(target);
  const dur    = 1800;
  const start  = performance.now();

  function ease(t) { return 1 - Math.pow(1 - t, 4); }

  function tick(now) {
    const t   = Math.min((now - start) / dur, 1);
    const val = target * ease(t);
    el.textContent = prefix + (isInt ? Math.round(val) : val.toFixed(1)) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const counterObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObs.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll('[data-count]').forEach((el) => counterObs.observe(el));

// ── Magnetic button effect ─────────────────────────────────────────────────────
if (window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.btn-primary').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width  / 2) * 0.2;
      const y = (e.clientY - r.top  - r.height / 2) * 0.3;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

// ── FAQ accordion ──────────────────────────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item  = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item.open').forEach((el) => {
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Open clicked (toggle)
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});
