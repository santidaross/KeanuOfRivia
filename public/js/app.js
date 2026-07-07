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
      // Por ahora solo Steam (Minecraft y Coffee re-activables por API o acá).
      { name: 'Steam', url: 'https://steamcommunity.com/profiles/76561197993066934', icon: '/images/icons/steam.svg', type: 'steam' }
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

  // Poster de fondo: elige un frame random del set en cada carga (variedad por visita).
  // Se ve cuando el video está pausado / mientras carga / con reduce-motion.
  const POSTER_FRAMES = [
    'f-0028', 'f-0052', 'f-0084', 'f-0107', 'f-0150', 'f-0374', 'f-0575',
    'f-0698', 'f-0804', 'f-1005', 'f-1143', 'f-1855', 'f-1870'
  ];
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function initPoster() {
    const layers = Array.from(document.querySelectorAll('.bg-poster'));
    if (layers.length === 0) return;

    const url = (n) => `url("/images/frames/${n}.jpg")`;
    const preload = (n) => { const i = new Image(); i.src = `/images/frames/${n}.jpg`; };
    let order = shuffle(POSTER_FRAMES.slice());
    let idx = 0;
    let active = 0;

    // Primer frame inmediato (sin crossfade).
    layers[0].style.backgroundImage = url(order[0]);
    layers[0].classList.add('is-active');

    // Reduce-motion o una sola capa: sin slideshow, queda el frame fijo.
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || layers.length < 2) return;

    preload(order[1]);

    function crossfadeTo(n) {
      const next = layers[1 - active];
      next.style.backgroundImage = url(n);
      next.classList.add('is-active');
      layers[active].classList.remove('is-active');
      active = 1 - active;
    }

    // Solo avanza cuando el video está PAUSADO (en reproducción el video tapa el poster).
    setInterval(() => {
      if (document.body.classList.contains('video-playing')) return;
      idx = (idx + 1) % order.length;
      if (idx === 0) order = shuffle(order);
      crossfadeTo(order[idx]);
      preload(order[(idx + 1) % order.length]);
    }, 5500);
  }

  // Control del video de fondo: play/pause manual, con default segun la preferencia de
  // movimiento reducido del usuario, y recordado en localStorage.
  // - Sin preferencia guardada: arranca PAUSADO si el usuario pidio reduce-motion, si no reproduce.
  // - El boton del footer togglea y guarda la eleccion (que gana sobre el default).
  // - Transicion de ~2s (fade). Al pausar, se deja correr el fade-out y recien se pausa (corta el decode).
  function initVideo() {
    const video = document.querySelector('.bg-video');
    const btn = document.getElementById('video-toggle');
    if (!video) return;

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saved = localStorage.getItem('video-playback'); // 'play' | 'pause' | null
    let playing = saved === 'play' ? true : saved === 'pause' ? false : !reduce;
    let fadeTimer = null;

    function apply(p) {
      playing = p;
      document.body.classList.toggle('video-playing', p);
      if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
      if (p) {
        video.play().catch(() => { /* autoplay bloqueado: queda el fondo sin video */ });
      } else {
        // dejar correr el fade-out (~2s) y recien pausar → corta el decode/CPU sin cortar la transicion
        fadeTimer = setTimeout(() => { try { video.pause(); } catch (e) { /* noop */ } }, 2000);
      }
      // La visibilidad del ícono la maneja el CSS via body.video-playing (SVG no refleja .hidden).
      if (btn) {
        btn.setAttribute('aria-pressed', String(p));
        const label = p ? 'Pausar video de fondo' : 'Reproducir video de fondo';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
      }
    }

    apply(playing);

    if (btn) {
      btn.addEventListener('click', () => {
        localStorage.setItem('video-playback', !playing ? 'play' : 'pause');
        apply(!playing);
      });
    }
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', async () => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    initPoster();
    initVideo();
    await loadSiteConfig();
    checkMinecraftStatus();
    setInterval(checkMinecraftStatus, 120000);
  });
})();
