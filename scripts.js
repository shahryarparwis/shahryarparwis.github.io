(() => {
  'use strict';
  const all = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  document.body.append(status);
  const german = () => document.documentElement.lang === 'de';
  let announcement;
  const announce = text => {
    clearTimeout(announcement);
    status.textContent = '';
    announcement = setTimeout(() => { status.textContent = text; }, 30);
  };

  // These are personal favourites saved in this browser, not public totals.
  all('[data-project-like]').forEach(button => {
    const key = `portfolio-like-${button.dataset.projectLike}`;
    let liked = false;
    try { liked = localStorage.getItem(key) === 'true'; } catch {}
    const render = () => {
      button.classList.toggle('liked', liked);
      button.setAttribute('aria-pressed', String(liked));
      button.querySelector('[data-like-count]').textContent = liked ? '1' : '0';
      button.title = german() ? 'In diesem Browser gespeichert' : 'Saved in this browser';
    };
    render();
    button.addEventListener('click', () => {
      liked = !liked;
      try { localStorage.setItem(key, String(liked)); } catch {}
      render();
      button.classList.remove('pop');
      if (liked && !reducedMotion.matches) {
        void button.offsetWidth;
        button.classList.add('pop');
      }
    });
    button.addEventListener('animationend', () => button.classList.remove('pop'));
    window.addEventListener('storage', event => {
      if (event.key === key || event.key === null) {
        try { liked = localStorage.getItem(key) === 'true'; } catch {}
        render();
      }
    });
    new MutationObserver(render).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  });

  const projects = all('.project[data-category]');
  const filters = all('[data-filter]');
  filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    projects.forEach(project => {
      const visible = button.dataset.filter === 'all' || project.dataset.category.split(/\s+/).includes(button.dataset.filter);
      project.hidden = !visible;
      if (visible) {
        count++;
        project.classList.remove('reveal-pending');
      }
    });
    announce(german() ? `${count} Projekte angezeigt.` : `${count} projects shown.`);
    updateScroll();
  }));

  all('[data-copy-email]').forEach(button => {
    button.addEventListener('click', async () => {
      const email = button.dataset.copyEmail;
      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email);
          copied = true;
        }
      } catch {}
      if (!copied) {
        const input = document.createElement('textarea');
        input.value = email;
        input.setAttribute('readonly', '');
        input.style.cssText = 'position:fixed;top:0;left:-9999px';
        document.body.append(input);
        input.select();
        try { copied = document.execCommand('copy'); } catch {}
        input.remove();
        button.focus({preventScroll: true});
      }
      if (copied) {
        button.classList.add('copied');
        announce(german() ? 'E-Mail-Adresse kopiert.' : 'Email address copied.');
        setTimeout(() => button.classList.remove('copied'), 1800);
      } else {
        announce(german() ? `Bitte kopiere die Adresse manuell: ${email}` : `Please copy the address manually: ${email}`);
        window.prompt(german() ? 'E-Mail-Adresse kopieren:' : 'Copy email address:', email);
      }
    });
  });

  const navigation = document.querySelector('.navigation');
  const progress = document.querySelector('.scroll-progress-bar');
  const topButton = document.querySelector('[data-floating-top]');
  const links = all('.navigation nav a[href^="#"]');
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  function updateScroll() {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${distance > 0 ? Math.min(100, Math.max(0, window.scrollY / distance * 100)) : 0}%`;
    navigation?.classList.toggle('scrolled', window.scrollY > 12);
    topButton?.classList.toggle('visible', window.scrollY > 450);
    let current = -1;
    const offset = (navigation?.offsetHeight || 0) + 60;
    sections.forEach((section, index) => { if (section && section.getBoundingClientRect().top <= offset) current = index; });
    if (distance > 0 && window.scrollY >= distance - 2) current = links.length - 1;
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let frame = 0;
  function scheduleScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; updateScroll(); });
  }
  window.addEventListener('scroll', scheduleScroll, {passive: true});
  window.addEventListener('resize', scheduleScroll);
  window.addEventListener('load', scheduleScroll);
  document.addEventListener('toggle', scheduleScroll, true);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleScroll).observe(document.body);
  topButton?.addEventListener('click', () => {
    window.scrollTo({top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    document.querySelector('.navigation .wordmark')?.focus({preventScroll: true});
  });
  updateScroll();

  // Content stays visible if JavaScript or observer support is unavailable.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.05});
    all('[data-reveal]').forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add('reveal-pending');
        observer.observe(element);
      }
    });
    document.addEventListener('focusin', event => event.target.closest('[data-reveal]')?.classList.remove('reveal-pending'));
  }
  // Evidence links also work when their project is filtered out.
  all('.skill-evidence').forEach(link => link.addEventListener('click', () => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target?.matches('.project')) {
      if (target.hidden) document.querySelector('[data-filter="all"]')?.click();
      target.classList.remove('reveal-pending');
      const details = target.querySelector('details');
      if (details) details.open = true;
    }
  }));
  // Tool icons retain readable fallbacks when local image files are missing.
  all('.tool-art img').forEach(img => {
    const update = () => img.parentElement.classList.toggle('asset-loaded', img.complete && img.naturalWidth > 0);
    img.addEventListener('load', update);
    img.addEventListener('error', update);
    update();
  });
  const toolFilters = all('[data-tool-filter]');
  const toolTiles = all('[data-tool]');
  toolFilters.forEach(button => button.addEventListener('click', () => {
    toolFilters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    let count = 0;
    toolTiles.forEach(tile => {
      tile.hidden = button.dataset.toolFilter !== 'all' && tile.dataset.toolCategory !== button.dataset.toolFilter;
      if (!tile.hidden) count++;
    });
    const total = document.querySelector('.tool-total');
    if (total) total.textContent = String(count).padStart(2, '0');
    announce(german() ? `${count} Tools angezeigt.` : `${count} tools shown.`);
  }));
  const toolDialog = document.getElementById('tool-dialog');
  if (toolDialog) {
    let opener;
    toolTiles.forEach(tile => tile.addEventListener('click', () => {
      opener = tile;
      all('[data-tool-detail]').forEach(panel => { panel.hidden = panel.dataset.toolDetail !== tile.dataset.tool; });
      toolDialog.setAttribute('aria-labelledby', `tool-title-${tile.dataset.tool}`);
      toolDialog.showModal();
      document.body.classList.add('tool-modal-open');
      toolDialog.querySelector('.tool-dialog-close').focus();
    }));
    toolDialog.querySelector('.tool-dialog-close').addEventListener('click', () => toolDialog.close());
    let startedOutside = false;
    const outside = event => {
      const rect = toolDialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    toolDialog.addEventListener('pointerdown', event => { startedOutside = outside(event); });
    toolDialog.addEventListener('click', event => {
      if (event.target === toolDialog && startedOutside && outside(event)) toolDialog.close();
    });
    toolDialog.addEventListener('close', () => {
      document.body.classList.remove('tool-modal-open');
      opener?.focus({preventScroll: true});
    });
    all('.tool-project-link').forEach(link => link.addEventListener('click', () => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target?.matches('.project')) {
        if (target.hidden) document.querySelector('[data-filter="all"]')?.click();
        target.classList.remove('reveal-pending');
        const details = target.querySelector('details');
        if (details) details.open = true;
      }
      toolDialog.close();
    }));
  }
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
