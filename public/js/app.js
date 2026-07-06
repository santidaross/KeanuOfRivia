/*
 * KeanuOfRivia — lógica del hub.
 * SEGURIDAD: el config viene de una API editable (admin). El DOM se construye con
 * createElement + textContent + setAttribute (NUNCA innerHTML con datos del config) para
 * que name/icon no puedan inyectar HTML/scripts (XSS almacenado). Las URLs se abren solo
 * si son http/https (safeHref).
 */
(function () {
  'use strict';

  let siteConfig = null;
  let mcPill = null; // referencia a la pill de estado del server

  // Fallback del lado del cliente: si /api/site-config falla, la página igual muestra los links.
  const DEFAULT_CONFIG = {
    title: 'Keanu Of Rivia',
    description: 'Mi server, mis juegos y cómo encontrarme.',
    links: [
      { name: 'Minecraft Server', url: 'https://mc.keanuofrivia.com', icon: '/images/icons/minecraft.svg', type: 'minecraft' },
      { name: 'Steam', url: 'https://steamcommunity.com/profiles/76561197993066934', icon: '/images/icons/steam.svg', type: 'steam' },
      { name: 'Buy Me A Coffee', url: 'https://buymeacoffee.com/keanuofrivia', icon: '/images/icons/buy-me-a-coffee.svg', type: 'coffee' }
    ]
  };

  // --- Carga de configuración ---
  async function loadSiteConfig() {
    try {
      const response = await fetch('/api/site-config');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      siteConfig = await response.json();
    } catch (error) {
      console.error('Error loading site config, usando fallback:', error);
      siteConfig = DEFAULT_CONFIG;
    }
    updatePageContent();
  }

  function updatePageContent() {
    if (!siteConfig) return;
    if (siteConfig.title) {
      document.title = siteConfig.title;
      const nameEl = document.getElementById('site-name');
      if (nameEl) nameEl.textContent = siteConfig.title;
    }
    if (siteConfig.description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = siteConfig.description;
      const taglineEl = document.querySelector('.tagline');
      if (taglineEl) taglineEl.textContent = siteConfig.description;
    }
    updateLinks();
  }

  // Solo permitir abrir URLs http/https (evita esquemas peligrosos como javascript:).
  function safeHref(u) {
    try {
      const parsed = new URL(u, window.location.origin);
      return (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? parsed.href : null;
    } catch {
      return null;
    }
  }

  function makeIcon(link) {
    const img = document.createElement('img');
    img.className = 'icon';
    img.setAttribute('aria-hidden', 'true');
    img.setAttribute('loading', 'lazy');
    if (typeof link.icon === 'string') img.setAttribute('src', link.icon);
    img.alt = '';
    return img;
  }

  function updateLinks() {
    if (!siteConfig?.links) return;
    const stack = document.querySelector('.button-stack');
    if (!stack) return;

    stack.textContent = '';
    mcPill = null;

    siteConfig.links.forEach((link, i) => {
      const button = document.createElement('button');
      button.className = `button button-${link.type} reveal`;
      button.type = 'button';
      button.style.animationDelay = `${0.06 * i + 0.05}s`;

      const href = safeHref(link.url);
      if (href) {
        button.addEventListener('click', () => window.open(href, '_blank', 'noopener'));
      } else {
        button.disabled = true;
      }

      if (link.type === 'minecraft') {
        // Fila principal (icono + nombre) + pill de estado en vivo debajo.
        const row = document.createElement('div');
        row.className = 'mc-row';
        row.appendChild(makeIcon(link));
        row.appendChild(document.createTextNode(link.name ?? ''));

        const pill = document.createElement('span');
        pill.className = 'mc-status-pill is-loading';
        const dot = document.createElement('span');
        dot.className = 'dot';
        const text = document.createElement('span');
        text.className = 'mc-status-text';
        text.textContent = 'Comprobando estado…';
        pill.append(dot, text);
        mcPill = pill;

        button.append(row, pill);
      } else {
        button.appendChild(makeIcon(link));
        button.appendChild(document.createTextNode(link.name ?? ''));
      }

      stack.appendChild(button);
    });
  }

  // --- Estado del server de Minecraft ---
  async function checkMinecraftStatus() {
    try {
      const response = await fetch('/api/mc/status');
      const data = await response.json();
      renderStatus(data);
    } catch (error) {
      console.error('Error checking Minecraft status:', error);
      renderStatus({ online: false });
    }
  }

  function renderStatus(data) {
    if (!mcPill) return;
    const textEl = mcPill.querySelector('.mc-status-text');
    mcPill.classList.remove('is-loading', 'is-online', 'is-offline');

    if (data && data.online) {
      const players = data.players?.online ?? 0;
      const max = data.players?.max;
      mcPill.classList.add('is-online');
      if (textEl) {
        textEl.textContent = max
          ? `Online · ${players}/${max} jugando`
          : `Online · ${players} jugando`;
      }
    } else {
      mcPill.classList.add('is-offline');
      if (textEl) textEl.textContent = 'Offline';
    }
  }

  // --- Theme toggle (auto → dark → light) ---
  const THEMES = ['theme-auto', 'theme-dark', 'theme-light'];
  const THEME_ICON = { 'theme-auto': '🌓', 'theme-dark': '☀️', 'theme-light': '🌙' };
  const THEME_LABEL = { 'theme-auto': 'Tema: automático', 'theme-dark': 'Tema: oscuro', 'theme-light': 'Tema: claro' };

  function applyTheme(theme, toggle) {
    document.documentElement.className = theme;
    if (toggle) {
      const span = toggle.querySelector('span');
      if (span) span.textContent = THEME_ICON[theme] ?? '🌓';
      toggle.setAttribute('aria-label', THEME_LABEL[theme] ?? 'Cambiar tema');
      toggle.setAttribute('title', THEME_LABEL[theme] ?? 'Cambiar tema');
    }
  }

  function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    let saved = localStorage.getItem('theme');
    if (!THEMES.includes(saved)) saved = 'theme-auto';
    applyTheme(saved, toggle);

    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = THEMES.includes(document.documentElement.className)
          ? document.documentElement.className : 'theme-auto';
        const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
        localStorage.setItem('theme', next);
        applyTheme(next, toggle);
      });
    }
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', async () => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    initThemeToggle();
    await loadSiteConfig();
    checkMinecraftStatus();
    setInterval(checkMinecraftStatus, 120000);
  });
})();
