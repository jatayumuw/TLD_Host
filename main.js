document.addEventListener('DOMContentLoaded', () => {
  const dict = window.TLD_I18N || {};
  const presets = window.TLD_PRESETS || [];

  function resolveInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const paramLang = params.get('lang');
    if (paramLang === 'id' || paramLang === 'en') {
      try {
        localStorage.setItem('tld_lang', paramLang);
      } catch (_) {}
      return paramLang;
    }
    try {
      const saved = localStorage.getItem('tld_lang');
      if (saved === 'id' || saved === 'en') return saved;
    } catch (_) {}
    return 'id';
  }

  let currentLang = resolveInitialLang();
  let activePresetId = 'mystic-sanctum';
  let isAudioPlaying = false;
  let audioCtx = null;
  let activeAudioStop = null;

  function stopSynthPreview() {
    if (activeAudioStop) {
      try {
        activeAudioStop();
      } catch (_) {}
      activeAudioStop = null;
    }
    isAudioPlaying = false;
  }

  function startSynthPreview(profile) {
    stopSynthPreview();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.001, audioCtx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.14, audioCtx.currentTime + 0.4);
    master.connect(audioCtx.destination);

    const nodes = [];
    if (profile === 'pink-library' || profile === 'rain-hush' || profile === 'brown-current') {
      const sampleCount = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
      const out = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let lastOut = 0;
      for (let i = 0; i < sampleCount; i++) {
        const white = Math.random() * 2 - 1;
        if (profile === 'brown-current') {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          out[i] = lastOut * 2.8;
        } else {
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          out[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
        }
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = profile === 'brown-current' ? 280 : profile === 'rain-hush' ? 680 : 900;

      src.connect(filter);
      filter.connect(master);
      src.start();
      nodes.push(src);
    } else {
      const freqs = profile === 'piano-pad' ? [220, 277.18, 329.63] : [174.61, 220, 261.63];
      freqs.forEach((f) => {
        const osc = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        subGain.gain.value = 0.28 / freqs.length;
        osc.connect(subGain);
        subGain.connect(master);
        osc.start();
        nodes.push(osc);
      });
    }

    isAudioPlaying = true;
    activeAudioStop = () => {
      try {
        master.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.08);
      } catch (_) {}
      setTimeout(() => {
        nodes.forEach((n) => {
          try {
            n.stop();
          } catch (_) {}
        });
        master.disconnect();
      }, 150);
    };
  }

  // Hero Time + Purpose Preset Finder (index.html) -> jumps straight to matched preset
  const finderForm = document.querySelector('[data-preset-finder]');
  const timeSelect = document.getElementById('finder-time');
  const purposeSelect = document.getElementById('finder-purpose');

  if (finderForm) {
    finderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!timeSelect || !purposeSelect || typeof window.matchTemaramPreset !== 'function') return;
      const match = window.matchTemaramPreset(timeSelect.value, purposeSelect.value);
      const targetPreset = match ? encodeURIComponent(match.id) : 'mystic-sanctum';
      window.location.href = `presets.html?preset=${targetPreset}`;
    });
  }

  // Dedicated Presets Page (presets.html)
  const presetsStage = document.querySelector('[data-presets-stage]');
  const roomSvgMount = document.querySelector('[data-anatomy-room-svg]');

  if (presetsStage && roomSvgMount && window.TEMARAM_ROOM_SVG) {
    roomSvgMount.innerHTML = window.TEMARAM_ROOM_SVG;
    if (window.TEMARAM_ROOM_META) {
      document.body.style.setProperty('--lamp-x', `${window.TEMARAM_ROOM_META.lampPctX}%`);
      document.body.style.setProperty('--lamp-y', `${window.TEMARAM_ROOM_META.lampPctY}%`);
    }
  }

  const roomCone = document.querySelector('[data-room-cone]');
  let currentConeR = 0;
  let targetConeR = 0;
  let coneAnimId = null;
  let lastConeTs = 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function tickRoomCone(ts) {
    if (!roomCone) {
      coneAnimId = null;
      return;
    }
    const dt = lastConeTs ? Math.min(0.064, (ts - lastConeTs) / 1000) : 0.016;
    lastConeTs = ts;
    if (prefersReducedMotion.matches || Math.abs(targetConeR - currentConeR) <= 0.6) {
      currentConeR = targetConeR;
      roomCone.setAttribute('r', currentConeR.toFixed(1));
      coneAnimId = null;
      lastConeTs = 0;
      return;
    }
    currentConeR += (targetConeR - currentConeR) * (1 - Math.exp(-dt * 4.5));
    roomCone.setAttribute('r', currentConeR.toFixed(1));
    coneAnimId = requestAnimationFrame(tickRoomCone);
  }

  function syncPreviewAtmosphere(active) {
    if (!presetsStage || !active) return;
    const body = document.body;
    const I = typeof active.lightIntensity === 'number' ? active.lightIntensity : 0.5;
    body.style.setProperty('--preview-hex', active.accentHex);
    body.style.setProperty('--preview-rgb', active.rgb || '224, 150, 72');
    body.style.setProperty('--bg-glow-alpha', (0.09 + I * 0.34).toFixed(3));
    body.style.setProperty('--room-opacity', (0.26 + I * 0.92).toFixed(3));

    if (isAudioPlaying) {
      body.classList.add('is-previewing');
      body.style.setProperty('--lamp-core-opacity', (0.35 + I * 0.92).toFixed(3));
      targetConeR = Math.round(155 + I * 880);
    } else {
      body.classList.remove('is-previewing');
      body.style.setProperty('--lamp-core-opacity', '0');
      targetConeR = 0;
    }

    if (roomCone && prefersReducedMotion.matches) {
      currentConeR = targetConeR;
      roomCone.setAttribute('r', String(targetConeR));
    } else if (roomCone && !coneAnimId && Math.abs(targetConeR - currentConeR) > 0.4) {
      lastConeTs = 0;
      coneAnimId = requestAnimationFrame(tickRoomCone);
    }
  }

  function renderPresetPageState() {
    if (!presetsStage || !presets.length) return;
    const t = dict[currentLang] || dict.id || {};
    const active = presets.find((p) => p.id === activePresetId) || presets[1];

    presetsStage.style.setProperty('--preset-glow', active.accentHex);
    presetsStage.style.setProperty('--preset-glow-soft', active.glowSoft);
    syncPreviewAtmosphere(active);

    document.querySelectorAll('[data-preset-card]').forEach((card) => {
      const pid = card.getAttribute('data-preset-card');
      const item = presets.find((p) => p.id === pid);
      if (!item) return;
      const isSelected = pid === active.id;
      card.classList.toggle('is-active', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));
      card.style.setProperty('--preset-glow', item.accentHex);

      const kicker = card.querySelector('[data-card-kicker]');
      if (kicker) {
        kicker.textContent = item.category[currentLang] || item.category.id;
      }
    });

    const detail = document.querySelector('[data-preset-detail]');
    if (detail) {
      detail.style.setProperty('--preset-glow', active.accentHex);
      const detailCat = detail.querySelector('[data-detail-cat]');
      const detailTitle = detail.querySelector('[data-detail-title]');
      const detailRec = detail.querySelector('[data-detail-rec]');
      const detailNotes = detail.querySelector('[data-detail-notes]');
      const detailLight = detail.querySelector('[data-detail-light]');
      const detailAudio = detail.querySelector('[data-detail-audio]');
      const detailScent = detail.querySelector('[data-detail-scent]');
      const detailPlay = detail.querySelector('[data-detail-play]');
      const mediaBox = detail.querySelector('[data-detail-media]');

      if (detailCat) detailCat.textContent = active.category[currentLang] || active.category.id;
      if (detailTitle) detailTitle.textContent = active.title;
      if (detailRec) detailRec.textContent = active.recommended[currentLang] || active.recommended.id;
      if (detailNotes) detailNotes.innerHTML = active.notesHtml[currentLang] || active.notesHtml.id;
      if (detailLight) detailLight.textContent = active.lightSpec[currentLang] || active.lightSpec.id;
      if (detailAudio) detailAudio.textContent = active.audioSpec[currentLang] || active.audioSpec.id;
      if (detailScent) detailScent.textContent = active.scentSpec[currentLang] || active.scentSpec.id;
      if (detailPlay) {
        detailPlay.classList.toggle('is-playing', isAudioPlaying);
        detailPlay.setAttribute('aria-pressed', String(isAudioPlaying));
        detailPlay.textContent = isAudioPlaying
          ? t['presets.pauseLabel'] || 'Pause Audio'
          : t['presets.playLabel'] || 'Play Preview';
      }

      if (mediaBox && active.image) {
        mediaBox.innerHTML = `<img src="${active.image}" alt="${active.title}" width="338" height="544" decoding="async">`;
      }
    }
  }

  if (presetsStage) {
    const urlPreset = new URLSearchParams(window.location.search).get('preset');
    if (urlPreset && presets.some((p) => p.id === urlPreset)) {
      activePresetId = urlPreset;
    }

    const togglePlayFor = (pid) => {
      const target = presets.find((p) => p.id === pid) || presets[0];
      if (isAudioPlaying && activePresetId === target.id) {
        stopSynthPreview();
      } else {
        activePresetId = target.id;
        startSynthPreview(target.audioProfile);
      }
      renderPresetPageState();
    };

    document.querySelectorAll('[data-preset-card]').forEach((card) => {
      card.addEventListener('click', () => {
        const pid = card.getAttribute('data-preset-card');
        if (!pid) return;
        activePresetId = pid;
        if (isAudioPlaying) {
          const target = presets.find((p) => p.id === activePresetId);
          if (target) startSynthPreview(target.audioProfile);
        }
        renderPresetPageState();
      });
    });

    document.querySelector('[data-detail-play]')?.addEventListener('click', () => {
      togglePlayFor(activePresetId);
    });
  }

  function applyLanguage(lang) {
    const t = dict[lang] || dict.id || {};
    currentLang = lang;
    document.documentElement.lang = lang;

    const titleKey = document.body.getAttribute('data-i18n-title');
    if (titleKey && t[titleKey]) {
      document.title = t[titleKey];
    }

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && t[key] !== undefined) {
        el.textContent = t[key];
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (key && t[key] !== undefined) {
        el.innerHTML = t[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && t[key] !== undefined) {
        el.setAttribute('placeholder', t[key]);
      }
    });

    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      const active = btn.getAttribute('data-lang-btn') === lang;
      btn.setAttribute('aria-pressed', String(active));
    });

    const nav = document.querySelector('[data-site-nav]');
    const navToggle = document.querySelector('[data-nav-toggle]');
    if (nav && navToggle) {
      const isOpen = nav.classList.contains('is-open');
      navToggle.textContent = isOpen ? (t['nav.close'] || 'Close') : (t['nav.menu'] || 'Menu');
    }

    renderPresetPageState();
  }

  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-lang-btn');
      if (next !== 'id' && next !== 'en') return;
      try {
        localStorage.setItem('tld_lang', next);
      } catch (_) {}
      applyLanguage(next);
    });
  });

  // Mobile navigation toggle
  const nav = document.querySelector('[data-site-nav]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  if (nav && navToggle) {
    navToggle.addEventListener('click', () => {
      const t = dict[currentLang] || dict.id || {};
      const isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.textContent = isOpen ? (t['nav.close'] || 'Close') : (t['nav.menu'] || 'Menu');
    });
  }

  // Maker illustration <-> portrait tap toggle on about.html
  document.querySelectorAll('[data-maker-card]').forEach((card) => {
    const media = card.querySelector('.maker-media');
    if (!media) return;
    media.addEventListener('click', () => {
      card.classList.toggle('is-flipped');
    });
    media.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.classList.toggle('is-flipped');
      }
    });
  });

  // Apply initial language & dynamic widgets
  applyLanguage(currentLang);

  // Newsletter subscription confirmation
  document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const t = dict[currentLang] || dict.id || {};
      const nameInput = form.querySelector('input[name="fullname"]');
      const emailInput = form.querySelector('input[name="email"]');
      const statusEl = form.parentElement?.querySelector('[data-form-status]');

      const name = nameInput?.value.trim() || '';
      const email = emailInput?.value.trim() || '';

      if (!name || !email) {
        if (statusEl) {
          statusEl.textContent = t['js.formError'] || 'Please enter both your name and email address.';
        }
        return;
      }

      if (statusEl) {
        const template =
          t['js.formSuccess'] ||
          'Newsletter subscription for "{name}" ({email}) saved in this local preview.';
        statusEl.textContent = template.replace('{name}', name).replace('{email}', email);
      }
      form.reset();
    });
  });
});
