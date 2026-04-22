// ===========================
// LA PORRA DEL MUNDIAL 2026
// Main JS - Interactions
// ===========================

(function () {
  'use strict';

  // --- Navbar scroll effect ---
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');

  function handleScroll() {
    const scrollY = window.scrollY;

    // Navbar
    if (scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Back to top button
    if (scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Run on load

  // --- Back to top button ---
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Mobile nav toggle ---
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close menu when a nav link is clicked
  navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target) && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // --- Particle System (Hero) ---
  function createParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;

    const count = Math.min(30, Math.floor(window.innerWidth / 40));

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');

      const size = Math.random() * 4 + 2;
      const x = Math.random() * 100;
      const duration = Math.random() * 12 + 8;
      const delay = Math.random() * 10;
      const opacity = Math.random() * 0.5 + 0.2;

      // Some particles are football themed
      if (Math.random() > 0.85) {
        particle.textContent = '⚽';
        particle.style.fontSize = `${size * 3}px`;
        particle.style.background = 'none';
        particle.style.borderRadius = '0';
        particle.style.opacity = String(opacity * 0.3);
      } else {
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = Math.random() > 0.5
          ? `rgba(245, 197, 24, ${opacity})`
          : `rgba(21, 101, 255, ${opacity})`;
      }

      particle.style.left = `${x}%`;
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${delay}s`;

      container.appendChild(particle);
    }
  }

  createParticles();

  // --- Scroll Reveal ---
  function setupScrollReveal() {
    const revealTargets = [
      '.info-card',
      '.podium-card',
      '.timeline-item',
      '.scoring-rule-item',
      '.deadline-card',
      '.tiebreak-item',
      '.validity-card',
      '.general-rule-item',
      '.qnav-card',
      '.scoring-table-wrapper',
    ];

    const allTargets = document.querySelectorAll(revealTargets.join(', '));
    allTargets.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    });

    allTargets.forEach(el => observer.observe(el));
  }

  if ('IntersectionObserver' in window) {
    setupScrollReveal();
  } else {
    // Fallback for older browsers
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  // --- Active nav link on scroll ---
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function highlightActiveNavLink() {
    const scrollY = window.scrollY + window.innerHeight / 3;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('nav-link-active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('nav-link-active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightActiveNavLink, { passive: true });

  // --- Smooth anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // --- Podium hover effect ---
  document.querySelectorAll('.podium-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      if (card.classList.contains('podium-gold')) {
        card.style.boxShadow = '0 0 60px rgba(245,197,24,0.3), 0 20px 60px rgba(0,0,0,0.5)';
      }
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
    });
  });

  // --- Nav link active style ---
  const style = document.createElement('style');
  style.textContent = `
    .nav-link-active {
      color: var(--color-accent-gold) !important;
    }
    .nav-link-active::after {
      transform: translateX(-50%) scaleX(1) !important;
    }
  `;
  document.head.appendChild(style);

  // --- Stats counter animation ---
  function animateCounters() {
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
      const target = parseInt(stat.textContent, 10);
      if (isNaN(target)) return;

      let current = 0;
      const duration = 1500;
      const increment = target / (duration / 16);

      const timer = setInterval(() => {
        current = Math.min(current + increment, target);
        stat.textContent = Math.floor(current);
        if (current >= target) {
          stat.textContent = target;
          clearInterval(timer);
        }
      }, 16);
    });
  }

  // Run counter animation when hero section is visible
  const heroObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      setTimeout(animateCounters, 800);
      heroObserver.disconnect();
    }
  }, { threshold: 0.3 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) heroObserver.observe(heroStats);

  // --- Keyboard accessibility for mobile menu ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      navToggle.focus();
    }
  });

  console.log('🌍⚽ La Porra del Mundial 2026 — Reglament Oficial carregat!');

})();
