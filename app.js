/**
 * HÔM NAY XEM GÌ - NORDIC MINIMALIST APPLICATION CONTROLLER
 * Curated Animated & Donghua Films from 8 YouTube Channels
 * Features: 24h Newfeed Live Updates & Notification Tracker
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // APPLICATION STATE
  // -------------------------------------------------------------------------
  const state = {
    allFilms: [],
    channels: [],
    channelGroups: [],
    channelEntries: [],
    channelToEntryMap: new Map(),
    genres: [],
    recent24hFilms: [],
    notifications: [],
    activeTab: 'all',
    selectedGenres: new Set(),
    selectedChannels: new Set(),
    genreMatchMode: 'or',
    sortBy: 'recent',
    timeRange: 'all',
    leaderboardMetric: 'views',
    leaderboardTime: 'week',
    searchQuery: '',
    currentPage: 1,
    pageSize: 24,
    favorites: new Set(),
    history: [],
    progress: {},
    durationFilter: 'all',
    currentPlayingFilm: null,
    currentPlayingPartIndex: 1,
    randomCandidate: null,
    spotlightIndex: 0,
    spotlightTimer: null,
    isSpotlightPaused: false,
    _activeBgSlot: 'A',
    _spotlightPreloaded: false,
    _spotlightCache: null,
    _cachedHeroHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
    _lastScrollY: 0,
    _scrollDir: 'down',
    _deepScrollUpGuardUntil: 0,
    _inBrowse: false,
    _isGliding: false,
    _wheelCooldownUntil: 0,
    _glideReleaseTimer: null,
    autoNextEnabled: (function() { try { return localStorage.getItem('homnayxemgi_autonext') !== '0'; } catch(e) { return true; } })(),
    autoNextCountdownTimer: null,
    isTheaterWide: false,
    isAmbientDim: false
  };

  // DOM Elements Cache
  const el = {};

  // -------------------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    cacheDomElements();
    loadStoredData();
    normalizeAndIngestData();
    setupProgressiveEnhancements();
    setupNotificationsEngine();
    setupEventListeners();
    renderSidebar();
    renderMobileChips();
    applyFiltersAndRender(1);
    renderContinueShelf();
    applyDeepLinkFromUrl();
    syncLiveYouTubeFeed();
  });

  function isOverlayOpen() {
    if (el.theaterModal?.classList.contains('active')) return true;
    if (el.randomModal?.classList.contains('active')) return true;
    if (el.qrModal?.classList.contains('active')) return true;
    try {
      if (el.channelDrawer?.matches(':popover-open') || el.mobileFilterDrawer?.matches(':popover-open')) return true;
    } catch (e) {}
    return false;
  }

  function refreshCachedHeroHeight(options = {}) {
    const { force = false } = options;
    const nextH = (el.spotlightHeroShell && el.spotlightHeroShell.offsetHeight > 0)
      ? Math.round(el.spotlightHeroShell.offsetHeight)
      : (window.innerHeight || 900);
    if (force || window.scrollY < 20 || Math.abs(nextH - state._cachedHeroHeight) > 80) {
      state._cachedHeroHeight = nextH;
    }
  }

  function setBrowseChromeVisible(inBrowse) {
    if (inBrowse === state._inBrowse) return;
    state._inBrowse = inBrowse;

    if (el.siteHeader) {
      el.siteHeader.classList.toggle('is-hero-hidden', !inBrowse);
      el.siteHeader.inert = !inBrowse;
    }
    if (el.mobileBottomBar) {
      el.mobileBottomBar.classList.toggle('is-hero-hidden', !inBrowse);
      el.mobileBottomBar.inert = !inBrowse;
    }
    document.body.classList.toggle('in-browse-zone', inBrowse);

    if (!inBrowse && el.notificationPopover?.classList.contains('active')) {
      el.notificationPopover.classList.remove('active');
    }
  }

  function syncHeaderWithScroll() {
    const curY = window.scrollY;
    if (Math.abs(curY - state._lastScrollY) >= 2) {
      state._scrollDir = curY > state._lastScrollY ? 'down' : 'up';
      state._lastScrollY = curY;
    }
    if (state._isGliding) return;

    const boundary = state._cachedHeroHeight || window.innerHeight || 900;
    const inBrowse = curY >= boundary * 0.52;
    setBrowseChromeVisible(inBrowse);
  }

  function releaseGlideLock() {
    if (!state._isGliding) return;
    state._isGliding = false;
    clearTimeout(state._glideReleaseTimer);
    document.body.classList.remove('is-scroll-gliding');
    const boundary = state._cachedHeroHeight || window.innerHeight || 900;
    setBrowseChromeVisible(window.scrollY >= boundary * 0.52);
  }

  function scrollToCinemaZone(zone, options = {}) {
    const { instant = false } = options;
    refreshCachedHeroHeight({ force: window.scrollY < 20 });
    const targetY = zone === 'browse' ? state._cachedHeroHeight : 0;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (Math.abs(window.scrollY - targetY) <= 2) {
      setBrowseChromeVisible(zone === 'browse');
      return;
    }

    if (instant || reduced) {
      releaseGlideLock();
      window.scrollTo({ top: targetY, behavior: 'instant' });
      state._lastScrollY = targetY;
      setBrowseChromeVisible(zone === 'browse');
      return;
    }

    state._scrollDir = zone === 'browse' ? 'down' : 'up';
    state._isGliding = true;
    state._wheelCooldownUntil = performance.now() + 720;
    document.body.classList.add('is-scroll-gliding');
    setBrowseChromeVisible(zone === 'browse');
    clearTimeout(state._glideReleaseTimer);
    state._glideReleaseTimer = setTimeout(releaseGlideLock, 760);

    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  function settleHeroSeamIfNeeded() {
    if (state._isGliding || isOverlayOpen() || performance.now() < state._wheelCooldownUntil) return;
    const boundary = state._cachedHeroHeight || window.innerHeight || 900;
    const y = window.scrollY;
    if (y > 8 && y < boundary - 8) {
      if (state._scrollDir === 'up') {
        scrollToCinemaZone(y < boundary * 0.88 ? 'hero' : 'browse');
      } else {
        scrollToCinemaZone(y > boundary * 0.12 ? 'browse' : 'hero');
      }
    }
  }

  function setupProgressiveEnhancements() {
    refreshCachedHeroHeight({ force: true });
    state._lastScrollY = window.scrollY;
    state._inBrowse = null;
    syncHeaderWithScroll();

    if (typeof ResizeObserver === 'function' && el.spotlightHeroShell) {
      const ro = new ResizeObserver(() => {
        refreshCachedHeroHeight();
        syncHeaderWithScroll();
      });
      ro.observe(el.spotlightHeroShell);
    } else {
      window.addEventListener('resize', () => {
        refreshCachedHeroHeight();
        syncHeaderWithScroll();
      }, { passive: true });
    }

    window.addEventListener('scroll', syncHeaderWithScroll, { passive: true });

    if ('onscrollend' in window) {
      window.addEventListener('scrollend', () => {
        releaseGlideLock();
        settleHeroSeamIfNeeded();
      });
    } else {
      let fallbackTimer = null;
      window.addEventListener('scroll', () => {
        clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(() => {
          releaseGlideLock();
          settleHeroSeamIfNeeded();
        }, 130);
      }, { passive: true });
    }

    window.addEventListener('wheel', e => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (isOverlayOpen()) return;
      if (e.target.closest('.m3-titles-grid, .continue-row, .app-sidebar, .notification-popover')) return;

      const boundary = state._cachedHeroHeight || window.innerHeight || 900;
      const y = window.scrollY;
      const now = performance.now();

      if (y > boundary + 24) {
        if (e.deltaY < 0) state._deepScrollUpGuardUntil = now + 260;
        return;
      }

      if (state._isGliding || (now < state._wheelCooldownUntil && y <= boundary + 24)) {
        e.preventDefault();
        return;
      }

      if (y < boundary - 8 && e.deltaY > 4) {
        e.preventDefault();
        scrollToCinemaZone('browse');
      } else if (y > 4 && y <= boundary + 16 && e.deltaY < -4) {
        e.preventDefault();
        if (now < state._deepScrollUpGuardUntil) {
          if (y < boundary - 4) {
            scrollToCinemaZone('browse');
          } else {
            window.scrollTo({ top: boundary, behavior: 'instant' });
            state._lastScrollY = boundary;
            state._wheelCooldownUntil = now + 240;
            setBrowseChromeVisible(true);
          }
          return;
        }
        scrollToCinemaZone('hero');
      }
    }, { passive: false });

    let seamTouchY = null;
    let seamTouchX = null;
    window.addEventListener('touchstart', e => {
      if (e.touches.length !== 1 || isOverlayOpen()) {
        seamTouchY = null;
        return;
      }
      if (e.target.closest('#spotlightTitleRail, .continue-row, .app-sidebar, .notification-popover')) {
        seamTouchY = null;
        return;
      }
      seamTouchY = e.touches[0].clientY;
      seamTouchX = e.touches[0].clientX;
    }, { passive: true });

    window.addEventListener('touchend', e => {
      if (seamTouchY === null || e.changedTouches.length !== 1 || isOverlayOpen()) return;
      const dy = e.changedTouches[0].clientY - seamTouchY;
      const dx = e.changedTouches[0].clientX - seamTouchX;
      seamTouchY = null;
      seamTouchX = null;
      if (Math.abs(dy) < 54 || Math.abs(dy) <= Math.abs(dx) * 1.4) return;

      const boundary = state._cachedHeroHeight || window.innerHeight || 900;
      const y = window.scrollY;
      if (y <= 14 && dy < -54) {
        scrollToCinemaZone('browse');
      } else if (y >= boundary - 12 && y <= boundary + 20 && dy > 54) {
        scrollToCinemaZone('hero');
      }
    }, { passive: true });

    if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js';
      s.async = true;
      document.head.appendChild(s);
    }
  }

  function hidePopoverSafe(node) {
    if (node && typeof node.hidePopover === 'function') {
      try { node.hidePopover(); } catch (err) {}
    }
  }

  function cacheDomElements() {
    el.siteHeader = document.getElementById('siteHeader');
    el.catalogSection = document.getElementById('catalogSection');
    el.channelDrawer = document.getElementById('channelDrawer');
    el.channelSearchInput = document.getElementById('channelSearchInput');
    el.channelSelectionSummary = document.getElementById('channelSelectionSummary');
    el.btnClearChannels = document.getElementById('btnClearChannels');
    el.btnApplyChannels = document.getElementById('btnApplyChannels');
    el.channelLabel = document.getElementById('channelLabel');
    el.sidebarStudioLabel = document.getElementById('sidebarStudioLabel');
    el.sidebarDurationChips = document.getElementById('sidebarDurationChips');
    el.mobileFilterDrawer = document.getElementById('mobileFilterDrawer');
    el.mobileFilterSummary = document.getElementById('mobileFilterSummary');
    el.btnClearGenresDrawer = document.getElementById('btnClearGenresDrawer');
    el.btnApplyMobileFilter = document.getElementById('btnApplyMobileFilter');
    el.mobileFilterBody = document.getElementById('mobileFilterBody');
    el.continueShelf = document.getElementById('continueShelf');
    el.continueRow = document.getElementById('continueRow');
    el.btnClearContinue = document.getElementById('btnClearContinue');
    el.durationSelect = document.getElementById('durationSelect');
    el.btnPrevEp = document.getElementById('btnPrevEp');
    el.btnNextEp = document.getElementById('btnNextEp');
    el.btnShareFilm = document.getElementById('btnShareFilm');
    el.btnOpenYoutube = document.getElementById('btnOpenYoutube');
    el.modalTags = document.getElementById('modalTags');
    el.modalSynopsis = document.getElementById('modalSynopsis');
    el.relatedBlock = document.getElementById('relatedBlock');
    el.relatedTitle = document.getElementById('relatedTitle');
    el.relatedRow = document.getElementById('relatedRow');
    el.brandHomeBtn = document.getElementById('brandHomeBtn');
    el.footerHomeBtn = document.getElementById('footerHomeBtn');
    el.btnDiceRandom = document.getElementById('btnDiceRandom');
    el.btnFavoritesOpen = document.getElementById('btnFavoritesOpen');
    el.favCountBadge = document.getElementById('favCountBadge');

    // Notification Elements
    el.notifWrapper = document.getElementById('notifWrapper');
    el.btnNotifOpen = document.getElementById('btnNotifOpen');
    el.notifCountBadge = document.getElementById('notifCountBadge');
    el.notificationPopover = document.getElementById('notificationPopover');
    el.notifListContainer = document.getElementById('notifListContainer');
    el.btnMarkAllRead = document.getElementById('btnMarkAllRead');

    // Sidebar & Navigation
    el.genreNavList = document.getElementById('genreNavList');
    el.channelNavList = document.getElementById('channelNavList');
    el.mobileChipsRow = document.getElementById('mobileChipsRow');

    el.searchInput = document.getElementById('searchInput');
    el.searchClearBtn = document.getElementById('searchClearBtn');
    el.categoryTabsGroup = document.getElementById('categoryTabsGroup');
    el.tabRecentBadge = document.getElementById('tabRecentBadge');
    el.feedCountSummary = document.getElementById('feedCountSummary');
    el.inlineFilterBar = document.getElementById('inlineFilterBar');
    el.sortBySelect = document.getElementById('sortBySelect');
    el.timeRangeSelect = document.getElementById('timeRangeSelect');
    el.activeScopeBadges = document.getElementById('activeScopeBadges');
    el.leaderboardPanel = document.getElementById('leaderboardPanel');
    el.lbSubheading = document.getElementById('lbSubheading');
    el.lbMetricGroup = document.getElementById('lbMetricGroup');
    el.lbTimeGroup = document.getElementById('lbTimeGroup');
    el.btnLbChannels = document.getElementById('btnLbChannels');
    el.lbChannelBtnLabel = document.getElementById('lbChannelBtnLabel');
    el.btnLbGenres = document.getElementById('btnLbGenres');
    el.lbGenreBtnLabel = document.getElementById('lbGenreBtnLabel');
    el.leaderboardShowcase = document.getElementById('leaderboardShowcase');
    el.cardsWidescreenGrid = document.getElementById('cardsWidescreenGrid');
    el.paginationBar = document.getElementById('paginationBar');

    // Spotlight Hero Container (PA C · MUBI Full-Screen Cinema)
    el.spotlightHeroShell = document.getElementById('spotlightHeroShell');
    el.spotlightBgA = document.getElementById('spotlightBgA');
    el.spotlightBgB = document.getElementById('spotlightBgB');
    el.spotlightHero = document.getElementById('spotlightHero');
    el.spotlightTitleRail = document.getElementById('spotlightTitleRail');
    el.btnSpotlightPause = document.getElementById('btnSpotlightPause');
    el.btnHeroExplore = document.getElementById('btnHeroExplore');
    el.browseWorkspace = document.getElementById('browseWorkspace');

    // Theater Modal & Toolbar Controls
    el.theaterModal = document.getElementById('theaterModal');
    el.modalBackdrop = document.getElementById('modalBackdrop');
    el.modalCloseBtn = document.getElementById('modalCloseBtn');
    el.modalFilmTitle = document.getElementById('modalFilmTitle');
    el.modalChannelKicker = document.getElementById('modalChannelKicker');
    el.youtubeIframe = document.getElementById('youtubeIframe');
    el.modalEpCounter = document.getElementById('modalEpCounter');
    el.modalEpMatrix = document.getElementById('modalEpMatrix');
    el.btnModalBookmark = document.getElementById('btnModalBookmark');
    el.btnTheaterWide = document.getElementById('btnTheaterWide');
    el.btnAmbientDim = document.getElementById('btnAmbientDim');
    el.btnAmbientUndim = document.getElementById('btnAmbientUndim');
    el.btnToggleAutoNext = document.getElementById('btnToggleAutoNext');
    el.autoNextOverlay = document.getElementById('autoNextOverlay');
    el.autoNextTimer = document.getElementById('autoNextTimer');
    el.autoNextTitle = document.getElementById('autoNextTitle');
    el.btnAutoNextCancel = document.getElementById('btnAutoNextCancel');
    el.btnAutoNextNow = document.getElementById('btnAutoNextNow');
    el.btnQrCode = document.getElementById('btnQrCode');

    // QR Code Modal
    el.qrModal = document.getElementById('qrModal');
    el.qrBackdrop = document.getElementById('qrBackdrop');
    el.btnCloseQrModal = document.getElementById('btnCloseQrModal');
    el.qrCodeFrame = document.getElementById('qrCodeFrame');
    el.qrTargetTitle = document.getElementById('qrTargetTitle');
    el.btnCopyQrUrl = document.getElementById('btnCopyQrUrl');
    el.btnCopyQrUrlText = document.getElementById('btnCopyQrUrlText');

    // Random Modal
    el.randomModal = document.getElementById('randomModal');
    el.randomBackdrop = document.getElementById('randomBackdrop');
    el.btnCloseRandom = document.getElementById('btnCloseRandom');
    el.randomThumbImg = document.getElementById('randomThumbImg');
    el.randomPartsBadge = document.getElementById('randomPartsBadge');
    el.randomTimeBadge = document.getElementById('randomTimeBadge');
    el.randomDurationBadge = document.getElementById('randomDurationBadge');
    el.randomFilmTitle = document.getElementById('randomFilmTitle');
    el.randomTagsRow = document.getElementById('randomTagsRow');
    el.randomStatDuration = document.getElementById('randomStatDuration');
    el.randomStatParts = document.getElementById('randomStatParts');
    el.randomStatViews = document.getElementById('randomStatViews');
    el.randomStatLikes = document.getElementById('randomStatLikes');
    el.randomFilmSynopsis = document.getElementById('randomFilmSynopsis');
    el.btnRandomWatchNow = document.getElementById('btnRandomWatchNow');
    el.btnRandomRollAgain = document.getElementById('btnRandomRollAgain');
    el.btnRandomBookmark = document.getElementById('btnRandomBookmark');

    // Toast & Mobile Dock
    el.toastPill = document.getElementById('toastPill');
    el.mobileBottomBar = document.getElementById('mobileBottomBar');
  }

  const SCHEMA_VERSION = '20261125_v8_ambient_hybrid';

  const NON_3D_CLIENT_RE = /\b(?:episode|tập)\s*\d{3,}\b|ngự thú sư mạnh nhất|the strongest beast tamer|\b2d\b|\baudio\b|truyện tranh|review truyện|review manhua|review manga|review manhwa|manhua\s*audio|comic\s*audio|audio truyện|đọc truyện|kể truyện|bộ truyện|\[phim ngắn\]|\bchap\s*\d+|\bchương\s*\d+|nhạc\s*phim\s*(?:cổ\s*phong|không\s*lời)|nhạc\s*không\s*lời|\bost\b|\bbgm\b/i;
  const BANNED_CHANNELS_CLIENT = new Set(['besuastudio', 'gavangtutien', 'thaolac', 'tydemuoi', 'thongocstudio', 'muoimuoilamphim', 'thietreview']);

  function isValid3dFilmClient(film) {
    if (!film) return false;
    if (BANNED_CHANNELS_CLIENT.has(film.channelId)) return false;
    const dur = Number(film.totalDurationSec) || 0;
    if (dur > 0 && dur < 1200) return false;
    if (film.channelId === 'chiuchiusubtv' && String(film.publishedAt || '').startsWith('2025-')) return false;
    if (NON_3D_CLIENT_RE.test(film.title || '')) return false;
    return true;
  }

  function filmMatchesGenre(film, genre) {
    if (!genre || genre === 'all') return true;
    if (Array.isArray(film.genres) && film.genres.includes(genre)) return true;
    return film.genre === genre;
  }

  function filmMatchesChannel(film, channelId) {
    if (!channelId || channelId === 'all') return true;
    if (film.channelId === channelId) return true;
    return Array.isArray(film.channelIds) && film.channelIds.includes(channelId);
  }

  function resolveChannelSelectionId(channelId) {
    if (!channelId || channelId === 'all') return 'all';
    return state.channelToEntryMap.get(channelId) || channelId;
  }

  function buildChannelEntries() {
    const chMap = new Map(state.channels.map(c => [c.id, c]));
    const groupedMembers = new Set();
    const entryMap = new Map();
    const entries = [];

    (state.channelGroups || []).forEach(grp => {
      const memberIds = (grp.memberIds || []).filter(id => chMap.has(id));
      if (memberIds.length <= 1) return;
      memberIds.forEach(id => {
        groupedMembers.add(id);
        entryMap.set(id, grp.id);
      });
      entryMap.set(grp.id, grp.id);
      const memberNames = memberIds.map(id => chMap.get(id)?.name || id);
      const memberSet = new Set(memberIds);
      const filmCount = state.allFilms.filter(f => {
        if (memberSet.has(f.channelId)) return true;
        return Array.isArray(f.channelIds) && f.channelIds.some(cid => memberSet.has(cid));
      }).length;
      entries.push({
        id: grp.id,
        name: grp.name,
        isGroup: true,
        memberIds,
        memberNames,
        filmCount
      });
    });

    state.channels.forEach(ch => {
      if (groupedMembers.has(ch.id)) return;
      entryMap.set(ch.id, ch.id);
      const filmCount = state.allFilms.filter(f => filmMatchesChannel(f, ch.id)).length;
      entries.push({
        id: ch.id,
        name: ch.name,
        isGroup: false,
        memberIds: [ch.id],
        memberNames: [ch.name],
        filmCount
      });
    });

    entries.sort((a, b) => (b.filmCount - a.filmCount) || a.name.localeCompare(b.name));
    state.channelEntries = entries;
    state.channelToEntryMap = entryMap;
  }

  function filmMatchesChannelEntry(film, entryId) {
    if (!entryId || entryId === 'all') return true;
    const entry = state.channelEntries.find(e => e.id === entryId);
    if (!entry) return filmMatchesChannel(film, entryId);
    if (entry.memberIds.includes(film.channelId)) return true;
    return Array.isArray(film.channelIds) && film.channelIds.some(cid => entry.memberIds.includes(cid));
  }

  function filmMatchesSelectedChannels(film) {
    if (state.selectedChannels.size === 0) return true;
    for (const entryId of state.selectedChannels) {
      if (filmMatchesChannelEntry(film, entryId)) return true;
    }
    return false;
  }

  function filmMatchesSelectedGenres(film) {
    if (state.selectedGenres.size === 0) return true;
    const list = Array.from(state.selectedGenres);
    if (state.genreMatchMode === 'and') {
      return list.every(g => filmMatchesGenre(film, g));
    }
    return list.some(g => filmMatchesGenre(film, g));
  }

  function toggleSelectedChannel(entryId) {
    if (!entryId || entryId === 'all') {
      state.selectedChannels.clear();
      return;
    }
    const resolved = resolveChannelSelectionId(entryId);
    if (state.selectedChannels.has(resolved)) {
      state.selectedChannels.delete(resolved);
    } else {
      state.selectedChannels.add(resolved);
    }
  }

  function toggleSelectedGenre(genre) {
    if (!genre || genre === 'all') {
      state.selectedGenres.clear();
      return;
    }
    if (state.selectedGenres.has(genre)) {
      state.selectedGenres.delete(genre);
    } else {
      state.selectedGenres.add(genre);
    }
  }

  function loadStoredData() {
    try {
      const v = localStorage.getItem('homnayxemgi_version');
      if (v !== SCHEMA_VERSION) {
        localStorage.removeItem('homnayxemgi_notifs');
        localStorage.setItem('homnayxemgi_version', SCHEMA_VERSION);
      }

      const favs = localStorage.getItem('homnayxemgi_favs');
      if (favs) {
        state.favorites = new Set(JSON.parse(favs));
      } else {
        state.favorites = new Set();
      }
      const hist = localStorage.getItem('homnayxemgi_hist');
      if (hist) {
        state.history = JSON.parse(hist);
      }
      const notifs = localStorage.getItem('homnayxemgi_notifs');
      const prog = localStorage.getItem('homnayxemgi_progress');
      if (prog) {
        state.progress = JSON.parse(prog) || {};
      }
      if (notifs) {
        state.notifications = JSON.parse(notifs);
      }
    } catch (e) {
      console.warn('Storage load failed', e);
    }
    updateBadgeCounts();
  }

  function updateBadgeCounts() {
    if (el.favCountBadge) {
      el.favCountBadge.textContent = state.favorites.size;
      el.favCountBadge.classList.toggle('empty', state.favorites.size === 0);
    }
  }

  // -------------------------------------------------------------------------
  // DATA INGESTION & REAL-TIME YOUTUBE SYNC
  // -------------------------------------------------------------------------
  const GENERIC_FILLER_CLIENT_RE = /\b(?:tổng|hợp|trọn|bộ|siêu|hay|hài|phẩm|full|dài|video|phim|hoạt|hình|3d|ai|thuyết|minh|vietsub|review|tóm|tắt|tập|phần|mùa|end|kết|bản|đẹp|hd|4k|1080p|version|fix|hot|mới|nhất|cực)\b/gi;

  function isGenericTitleSegmentClient(seg) {
    if (!seg) return true;
    const stripped = String(seg)
      .replace(/[│｜¦]/g, '|')
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:h|giờ|tiếng|phút|p)\b/gi, ' ')
      .replace(GENERIC_FILLER_CLIENT_RE, ' ')
      .replace(/[^\p{L}]/gu, '');
    return stripped.length < 4;
  }

  function cleanCoreTitleClient(title) {
    const unwrapBracket = (_, innerRaw) => {
      const inner = (innerRaw || '').trim();
      if (/^(?:Ful+l\s*)?(?:Trọn\s*Bộ\s*)?(?:Version\s*)?(?:Phần|Tập|Mùa|Bộ|P|S|EP|V)?\s*\d*(?:\s*[-–+~]\s*(?:P|Phần|Tập|Mùa|S|EP)?\s*\d+)?(?:\s*\(\s*END\s*\)|\s*END|\s*Kết)?$/i.test(inner) || isGenericTitleSegmentClient(inner)) {
        return ' ';
      }
      return ` ${inner} `;
    };
    let s = (title || '')
      .replace(/[│｜¦]/g, '|')
      .replace(/^[\s🔥⚡🎬💥✨🌟⭐📌▶️]+/u, '')
      .replace(/【([^】]*)】/g, unwrapBracket)
      .replace(/\[([^\]]*)\]/g, unwrapBracket)
      .replace(/^(?:\s*(?:\((?:Tổng\s*Hợp[^)]*|Trọn\s*Bộ[^)]*|Siêu\s*Hay[^)]*|Siêu\s*Hài[^)]*|FIX|END|Full[^)]*|\d+(?:[.,]\d+)?\s*(?:H|Giờ|Tiếng)[^)]*|(?:Phần|Tập|Mùa)\s*\d+[^)]*)\)|(?:Tổng\s*Hợp|Trọn\s*Bộ|Siêu\s*(?:Hay|Hài|Phẩm)|Ful+l(?:\s*Dài(?:\s*\d+(?:[.,]\d+)?\s*(?:H|Giờ|Tiếng)?)?|\s*Video|\s*Bộ|\s*Kết|\s*END|\s*Version(?:\s*\d+(?:\s*[-–+]\s*\d+)*)?)?)\s*(?:(?:Phần|Tập|Mùa|P|S|SS)\s*\d+(?:\s*[-–+~]\s*(?:P|SS)?\s*\d+)?(?:\s*END)?)?(?:\s*\([^)]*\))?\s*[\|\-:–,]?)\s*)+/i, '')
      .replace(/\s*\((?:Phần|Tập|Mùa)\s*\d+[^)]*\)\s*$/i, '')
      .replace(/\s*[\|\-]\s*(?:Kas\s*Vietsub|MyCherrySub|Egg\s*Vietsub|Lara\s*Sub|Bản\s*Tin\s*Cherry|HiCherrySub|Sora\s*Dub|CibiiSub|Đậu\s*Đậu\s*Vietsub|GodSub|Win\s*Vietsub|Thế\s*Vietsub|Vietsub\s*Phim|Akatsuki\s*Review|2K\s*Sub|Zzzphim|Não\s*Phẳng\s*Tu\s*Tiên|Thiên\s*Ảnh\s*Studio|Mộng\s*Ảnh\s*Studio|Vân\s*Mộng\s*Studio|Nhật\s*Ảnh\s*Studio|Vạn\s*Ảnh\s*Studio|Mị\s*Ảnh\s*Studio|Trùm\s*Phim\s*Sinh\s*Tồn(?:\s*New)?|Sinh\s*Tồn\s*Tận\s*Thế|ChiuChiuSubTV|Tiểu\s*Hồ\s*Review(?:\s*\(Dorovietsub\))?|Mễ\s*Lạc\s*Review|HHANIME\s*CHANNEL|Hoa\s*Trên\s*Mây|Phim\s*Zoo\s*AI|Nguyễn\s*Tường\s*Vietsub|Huyền\s*Sư\s*Tiểu\s*Muội|Tiểu\s*Muội\s*Ngôn\s*Tình)\s*$/i, '')
      .replace(/^[\|\-:\s]+|[\|\-:\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (s.includes('|')) {
      const kept = s.split('|').map(x => x.trim()).filter(x => x && !isGenericTitleSegmentClient(x));
      if (kept.length > 0) s = kept.join(' | ');
    }
    return s;
  }

  function seriesGroupingKeyClient(title) {
    let ct = cleanCoreTitleClient(title);
    if (ct.includes('|')) {
      for (const seg of ct.split('|')) {
        const cand = cleanCoreTitleClient(seg);
        if (cand.length >= 6 && !isGenericTitleSegmentClient(cand)) {
          ct = cand;
          break;
        }
      }
    }
    if (isGenericTitleSegmentClient(ct)) return '';
    return ct
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parsePartInfoClient(text) {
    const s = String(text || '')
      .replace(/\(\s*gộp trùng[^)]*\)/gi, '')
      .replace(/[\[\]【】]/g, ' ')
      .trim();
    const mSeasonPart = s.match(/\bMùa\s*(\d+)\s*[-–|]\s*(?:Phần|P)\s*(\d+)/i);
    if (mSeasonPart) {
      const seasonNum = parseInt(mSeasonPart[1], 10);
      const partNum = parseInt(mSeasonPart[2], 10);
      return {
        prefix: 'Mùa',
        startNum: partNum,
        endNum: partNum,
        seasonNum,
        subNum: 0,
        isMerged: false,
        label: `Mùa ${seasonNum} - P${partNum}`
      };
    }

    const mDec = s.match(/\b(Phần|Tập|Mùa|P)\s*(\d+)\.(\d+)\b/i);
    if (mDec) {
      const kw = mDec[1].toLowerCase();
      const prefix = kw === 'tập' ? 'Tập' : (kw === 'mùa' ? 'Mùa' : 'Phần');
      const a = parseInt(mDec[2], 10);
      const b = parseInt(mDec[3], 10);
      return {
        prefix,
        startNum: a,
        endNum: a,
        seasonNum: 0,
        subNum: b,
        isMerged: false,
        label: `${prefix} ${a}.${b}`
      };
    }

    const mEp = s.match(/(?:\b|(?<=Full))(Phần|Tập|Mùa|P|SS|Full\s*-?\s*SS?|Full(?=\s+\d+\b)|Version)\s*(\d+)((?:\s*[+\-–&]\s*(?:(?:Phần|Tập|Mùa|P|SS)\s*)?\d+)*)/i);
    if (!mEp) return null;

    const kw = mEp[1].toLowerCase().replace(/\s+/g, '');
    const prefix = kw === 'tập' ? 'Tập' : ((kw === 'mùa' || kw === 'ss' || kw === 'full-s' || kw === 'fulls' || kw === 'fullss' || kw === 'full-ss') ? 'Mùa' : 'Phần');
    const firstNum = parseInt(mEp[2], 10);
    const tail = mEp[3] || '';
    const tokens = Array.from(tail.matchAll(/([+\-–&])\s*(?:(?:Phần|Tập|Mùa|P)\s*)?(\d+)/gi));

    if (tokens.length === 0) {
      return {
        prefix,
        startNum: firstNum,
        endNum: firstNum,
        seasonNum: 0,
        subNum: 0,
        isMerged: false,
        label: `${prefix} ${firstNum}`
      };
    }

    const nums = [firstNum, ...tokens.map(t => parseInt(t[2], 10))];
    if (tokens.length === 1 && (tokens[0][1] === '-' || tokens[0][1] === '–') && nums[1] < firstNum) {
      return {
        prefix,
        startNum: firstNum,
        endNum: firstNum,
        seasonNum: 0,
        subNum: nums[1],
        isMerged: false,
        label: `${prefix} ${firstNum}.${nums[1]}`
      };
    }

    if (nums[nums.length - 1] > firstNum) {
      const formattedTail = tokens.map(t => `${t[1] === '–' ? '-' : t[1]}${t[2]}`).join('');
      return {
        prefix,
        startNum: firstNum,
        endNum: nums[nums.length - 1],
        seasonNum: 0,
        subNum: 0,
        isMerged: true,
        label: `${prefix} ${firstNum}${formattedTail}`
      };
    }

    return {
      prefix,
      startNum: firstNum,
      endNum: firstNum,
      seasonNum: 0,
      subNum: 0,
      isMerged: false,
      label: `${prefix} ${firstNum}`
    };
  }

  function parsePartNumberClient(title) {
    const info = parsePartInfoClient(title);
    return info ? info.endNum : null;
  }

  function comparePartsClient(a, b, posA, posB) {
    const infoA = parsePartInfoClient(a.label) || parsePartInfoClient(a.title);
    const infoB = parsePartInfoClient(b.label) || parsePartInfoClient(b.title);
    if (infoA && infoB) {
      if ((infoA.seasonNum || 0) !== (infoB.seasonNum || 0)) return (infoA.seasonNum || 0) - (infoB.seasonNum || 0);
      if (infoA.endNum !== infoB.endNum) return infoA.endNum - infoB.endNum;
      if (infoA.isMerged !== infoB.isMerged) return infoA.isMerged ? 1 : -1;
      if (infoA.startNum !== infoB.startNum) return infoA.startNum - infoB.startNum;
      if ((infoA.subNum || 0) !== (infoB.subNum || 0)) return (infoA.subNum || 0) - (infoB.subNum || 0);
    }
    return posA - posB;
  }

  function formatTotalDurationViClient(sec) {
    if (!sec || sec <= 0) return 'Đang cập nhật';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h} giờ ${m < 10 ? '0' : ''}${m} phút`;
    if (m > 0) return s > 0 ? `${m} phút ${s < 10 ? '0' : ''}${s} giây` : `${m} phút`;
    return `${s} giây`;
  }

  function formatPartDurationHmsClient(sec) {
    if (!sec || sec <= 0) return '';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = n => (n < 10 ? '0' + n : String(n));
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function formatCompactCountVi(num) {
    const n = Number(num) || 0;
    if (n <= 0) return '0';
    if (n < 1000) return String(Math.round(n));
    if (n < 1000000) {
      const val = n >= 100000 ? Math.round(n / 1000).toString() : (n / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '');
      return `${val}N`;
    }
    const val = n >= 10000000 ? (n / 1000000).toFixed(1) : (n / 1000000).toFixed(2);
    return `${val.replace('.', ',').replace(/,0+$/, '')}Tr`;
  }

  function formatExactCountVi(num) {
    return (Number(num) || 0).toLocaleString('vi-VN');
  }

  function recomputeFilmEngagementTotals(film) {
    const parts = film.parts || [];
    const active = parts.filter(p => !p.isRedundant);
    const pool = active.length > 0 ? active : parts;
    film.totalViews = pool.reduce((sum, p) => sum + (Number(p.views) || 0), 0);
    film.totalLikes = pool.reduce((sum, p) => sum + (Number(p.likes) || 0), 0);
  }

  const TIME_WINDOW_MS = {
    day: 86400000,
    week: 7 * 86400000,
    month: 30 * 86400000,
    year: 365 * 86400000
  };

  function getFilmPeriodMetrics(film, timeRange) {
    if (!timeRange || timeRange === 'all' || !TIME_WINDOW_MS[timeRange]) {
      return {
        matches: true,
        views: film.totalViews || 0,
        likes: film.totalLikes || 0
      };
    }
    const cutoff = Date.now() - TIME_WINDOW_MS[timeRange];
    const parts = film.parts || [];
    const matchingParts = parts.filter(p => {
      if (!p.publishedAt) return false;
      const ts = new Date(p.publishedAt).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    });
    if (matchingParts.length > 0) {
      const activeMatching = matchingParts.filter(p => !p.isRedundant);
      const pool = activeMatching.length > 0 ? activeMatching : matchingParts;
      return {
        matches: true,
        views: pool.reduce((s, p) => s + (Number(p.views) || 0), 0),
        likes: pool.reduce((s, p) => s + (Number(p.likes) || 0), 0)
      };
    }
    const filmRef = film.updatedAt || film.publishedAt;
    const filmTs = filmRef ? new Date(filmRef).getTime() : 0;
    if (!Number.isNaN(filmTs) && filmTs >= cutoff) {
      return {
        matches: true,
        views: film.totalViews || 0,
        likes: film.totalLikes || 0
      };
    }
    return { matches: false, views: 0, likes: 0 };
  }

  function normalizeAndIngestData() {
    const rootData = window.FILMS_DATA || {};
    const rawFilms = Array.isArray(rootData) ? rootData : (rootData.films || []);
    const rawChannels = rootData.channels || window.CHANNELS_DATA || [];

    state.channels = rawChannels.filter(c => !BANNED_CHANNELS_CLIENT.has(c.id));
    state.channelGroups = Array.isArray(rootData.channelGroups) ? rootData.channelGroups : [];

    const seenFilmIds = new Set();
    state.allFilms = rawFilms
      .filter(f => f && !BANNED_CHANNELS_CLIENT.has(f.channelId) && isValid3dFilmClient(f))
      .map((film, index) => {
        let uniqueId = film.id || `film_${index + 1}`;
        if (seenFilmIds.has(uniqueId)) {
          uniqueId = `${uniqueId}_${film.channelId || index + 1}`;
        }
        seenFilmIds.add(uniqueId);

        const totalSec = film.totalDurationSec !== undefined
          ? film.totalDurationSec
          : parseDurationToSec(film.totalDurationStr || film.totalDuration);
        const cleanDuration = cleanDurationStr(film.totalDurationStr || film.totalDuration, totalSec);
        const genreName = Array.isArray(film.genres) && film.genres.length > 0 ? film.genres[0] : (film.genre || 'Hoạt hình 2D/3D');
        const firstPartId = film.parts && film.parts.length > 0 ? (film.parts[0].id || film.parts[0].videoId) : (film.videoId || 'p7xLcOrLvbo');
        const thumb = film.thumbnail || film.thumbnailUrl || `https://i.ytimg.com/vi/${firstPartId}/hqdefault.jpg`;

        const normalizedParts = (film.parts && film.parts.length > 0) ? film.parts.map((p, pIdx) => ({
          partNumber: p.index || (pIdx + 1),
          label: p.label || `Phần ${p.index || (pIdx + 1)}`,
          title: p.title || `Tập ${p.index || (pIdx + 1)}`,
          videoId: p.id || p.videoId || firstPartId,
          duration: cleanDurationStr(p.durationStr, p.duration || 0),
          durationSec: p.duration || 0,
          views: Number(p.views) || 0,
          likes: Number(p.likes) || 0,
          publishedAt: p.publishedAt || null,
          isRedundant: !!p.isRedundant
        })) : [{
          partNumber: 1,
          label: 'Phần 1',
          title: film.title,
          videoId: firstPartId,
          duration: cleanDuration,
          durationSec: totalSec,
          views: Number(film.totalViews) || 0,
          likes: Number(film.totalLikes) || 0,
          publishedAt: film.publishedAt || null,
          isRedundant: false
        }];

        const activeParts = normalizedParts.filter(p => !p.isRedundant);
        const statsPool = activeParts.length > 0 ? activeParts : normalizedParts;
        const computedViews = statsPool.reduce((acc, p) => acc + (p.views || 0), 0);
        const computedLikes = statsPool.reduce((acc, p) => acc + (p.likes || 0), 0);

        return {
          id: uniqueId,
          title: film.title || 'Phim hoạt hình 3D',
          channelId: film.channelId || 'channel_1',
          channelIds: Array.isArray(film.channelIds) && film.channelIds.length > 0 ? film.channelIds : [film.channelId || 'channel_1'],
          channelName: film.channelName || 'Review Phim',
          genre: genreName,
          genres: film.genres || [genreName],
          partsCount: film.totalParts || normalizedParts.length,
          parts: normalizedParts,
          totalDuration: cleanDuration,
          totalDurationSec: totalSec,
          totalViews: Number(film.totalViews) || computedViews,
          totalLikes: Number(film.totalLikes) || computedLikes,
          thumbnailUrl: thumb,
          synopsis: film.review || film.synopsis || 'Một bộ phim hoạt hình đặc sắc tuyển chọn.',
          publishedAt: film.publishedAt || null,
          updatedAt: film.updatedAt || null,
          isRecent24h: false,
          recentUpdate: null
        };
      });

    rebuildRecentFeedAndGenres();
  }

  function rebuildRecentFeedAndGenres() {
    state._spotlightCache = null;
    // Extract unique genres sorted by prevalence (descending)
    const genreCounts = new Map();
    state.allFilms.forEach(f => {
      const list = Array.isArray(f.genres) && f.genres.length > 0 ? f.genres : (f.genre ? [f.genre] : []);
      list.forEach(g => {
        genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      });
    });
    state.genres = Array.from(genreCounts.keys()).sort((a, b) => (genreCounts.get(b) - genreCounts.get(a)) || a.localeCompare(b));

    // Build timeline strictly from real YouTube timestamps
    const now = Date.now();
    const filmsWithRealDate = state.allFilms.filter(f => f.updatedAt || f.publishedAt);

    filmsWithRealDate.sort((a, b) => {
      const tA = new Date(a.updatedAt || a.publishedAt).getTime();
      const tB = new Date(b.updatedAt || b.publishedAt).getTime();
      return tB - tA;
    });

    filmsWithRealDate.forEach(film => {
      const pubIso = film.updatedAt || film.publishedAt;
      let latestPart = film.parts && film.parts.length > 0 ? film.parts[film.parts.length - 1] : null;
      if (film.parts && film.parts.length > 1) {
        let bestTs = -1;
        film.parts.forEach(p => {
          const ts = p.publishedAt ? new Date(p.publishedAt).getTime() : 0;
          if (!Number.isNaN(ts) && ts >= bestTs) {
            bestTs = ts;
            latestPart = p;
          }
        });
      }
      const partIdx = latestPart ? latestPart.partNumber : (film.partsCount > 1 ? film.partsCount : 1);
      const partLabel = film.partsCount > 1
        ? (latestPart && latestPart.label ? latestPart.label : `Phần ${partIdx}`)
        : 'Bản Full';
      film.isRecent24h = true;
      film.recentUpdate = {
        partIndex: partIdx,
        partLabel: partLabel,
        videoId: latestPart ? latestPart.videoId : null,
        timeAgo: formatRealTimeAgo(pubIso),
        timestamp: new Date(pubIso).getTime()
      };
    });

    // "Mới Cập Nhật 24h" strictly shows updates within 24h (falls back to 48h only if < 6)
    const within24h = filmsWithRealDate.filter(f => (now - f.recentUpdate.timestamp) <= 86400000);
    const within48h = filmsWithRealDate.filter(f => (now - f.recentUpdate.timestamp) <= 172800000);
    state.recent24hFilms = within24h.length >= 6
      ? within24h
      : (within48h.length > 0 ? within48h : filmsWithRealDate.slice(0, 32));

    if (el.tabRecentBadge) {
      el.tabRecentBadge.textContent = state.recent24hFilms.length;
    }
    buildChannelEntries();
  }

  async function syncLiveYouTubeFeed() {
    if (!window.location.protocol.startsWith('http')) return;
    try {
      const resp = await fetch('/api/live-feed');
      if (!resp.ok) return;
      const payload = await resp.json();
      const liveVideos = Array.isArray(payload.videos) ? payload.videos : [];
      if (liveVideos.length === 0) return;

      // Map all currently known video IDs to their film/part references
      const knownVideoMap = new Map();
      state.allFilms.forEach(film => {
        film.parts.forEach(p => {
          if (p.videoId) knownVideoMap.set(p.videoId, { film, part: p });
        });
      });

      let changed = false;
      const newFilmsBatch = [];

      // Process oldest -> newest so multi-part merges stay ordered
      const chronological = [...liveVideos].sort(
        (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );

      chronological.forEach(v => {
        const existing = knownVideoMap.get(v.videoId);
        if (existing) {
          // Repair missing/placeholder durations and sync live views/likes
          const { film, part } = existing;
          if (v.durationSec > 0 && (part.durationSec === 0 || (part.durationSec === 7200 && part.duration === '2:00:00'))) {
            part.durationSec = v.durationSec;
            part.duration = v.durationStr || formatPartDurationHmsClient(v.durationSec);
            const sumSec = film.parts.reduce((acc, p) => acc + (!p.isRedundant && p.durationSec ? p.durationSec : 0), 0);
            if (sumSec > 0) {
              film.totalDurationSec = sumSec;
              film.totalDuration = formatTotalDurationViClient(sumSec);
            }
            changed = true;
          }
          if ((Number(v.views) > 0 && v.views !== part.views) || (Number(v.likes) > 0 && v.likes !== part.likes)) {
            if (Number(v.views) > 0) part.views = Number(v.views);
            if (Number(v.likes) > 0) part.likes = Number(v.likes);
            recomputeFilmEngagementTotals(film);
            changed = true;
          }
          return;
        }

        // Brand-new video discovered live via YouTube — enforce 3D film filter
        if (!isValid3dFilmClient({ title: v.title, totalDurationSec: v.durationSec, channelId: v.channelId, publishedAt: v.publishedAt })) {
          return;
        }
        const partInfo = parsePartInfoClient(v.title);
        const partNum = partInfo ? partInfo.endNum : null;
        const partLabel = partInfo ? partInfo.label : null;
        const coreTitle = cleanCoreTitleClient(v.title);
        const sKey = seriesGroupingKeyClient(v.title);
        let matchedFilm = null;

        if (sKey.length >= 6) {
          matchedFilm = state.allFilms.concat(newFilmsBatch).find(ef => {
            const efKey = seriesGroupingKeyClient(ef.title);
            if (efKey === sKey) return true;
            if (ef.channelId !== v.channelId || !partNum || partNum <= 1 || coreTitle.length < 10) return false;
            const efCore = cleanCoreTitleClient(ef.title);
            return efCore.length >= 10 && (efCore.includes(coreTitle) || coreTitle.includes(efCore));
          }) || null;
        }

        if (matchedFilm) {
          if (v.channelId && Array.isArray(matchedFilm.channelIds) && !matchedFilm.channelIds.includes(v.channelId)) {
            matchedFilm.channelIds.push(v.channelId);
          }
          const fallbackIdx = matchedFilm.parts.length + 1;
          const resolvedLabel = partLabel || `Phần ${fallbackIdx}`;
          const newPart = {
            partNumber: fallbackIdx,
            label: resolvedLabel,
            title: v.title,
            videoId: v.videoId,
            duration: v.durationStr || formatPartDurationHmsClient(v.durationSec),
            durationSec: v.durationSec || 0,
            views: Number(v.views) || 0,
            likes: Number(v.likes) || 0,
            publishedAt: v.publishedAt,
            isRedundant: false
          };
          matchedFilm.parts.push(newPart);
          matchedFilm.parts = matchedFilm.parts
            .map((p, idx) => ({ p, idx }))
            .sort((a, b) => comparePartsClient(a.p, b.p, a.idx, b.idx))
            .map((item, idx) => ({ ...item.p, partNumber: idx + 1 }));
          const sortedPart = matchedFilm.parts.find(p => p.videoId === v.videoId) || newPart;
          const newIdx = sortedPart.partNumber;
          matchedFilm.partsCount = matchedFilm.parts.length;
          const prevTs = matchedFilm.updatedAt ? new Date(matchedFilm.updatedAt).getTime() : 0;
          const nextTs = new Date(v.publishedAt).getTime();
          if (!isNaN(nextTs) && nextTs >= prevTs) {
            matchedFilm.updatedAt = v.publishedAt;
          }
          const sumSec = matchedFilm.parts.reduce((acc, p) => acc + (!p.isRedundant && p.durationSec ? p.durationSec : 0), 0);
          if (sumSec > 0) {
            matchedFilm.totalDurationSec = sumSec;
            matchedFilm.totalDuration = formatTotalDurationViClient(sumSec);
          }
          recomputeFilmEngagementTotals(matchedFilm);
          knownVideoMap.set(v.videoId, { film: matchedFilm, part: sortedPart });

          // Notify immediately if user follows this series
          if (state.favorites.has(matchedFilm.id)) {
            const notifId = `notif_${matchedFilm.id}_${newIdx}`;
            if (!state.notifications.some(n => n.id === notifId)) {
              state.notifications.unshift({
                id: notifId,
                filmId: matchedFilm.id,
                filmTitle: matchedFilm.title,
                partIndex: newIdx,
                partLabel: resolvedLabel,
                videoId: v.videoId,
                channelName: matchedFilm.channelName,
                thumbnailUrl: matchedFilm.thumbnailUrl,
                timeAgo: formatRealTimeAgo(v.publishedAt),
                timestamp: nextTs,
                isRead: false
              });
              saveNotifications();
            }
          }
          changed = true;
        } else {
          const newFilm = {
            id: `live_${v.videoId}`,
            title: v.title,
            channelId: v.channelId,
            channelName: v.channelName,
            genre: (v.genres && v.genres[0]) || 'Hoạt hình 2D/3D',
            genres: v.genres || ['Hoạt hình 2D/3D'],
            partsCount: 1,
            parts: [{
              partNumber: 1,
              label: partLabel || 'Phần 1',
              title: v.title,
              videoId: v.videoId,
              duration: v.durationStr || formatPartDurationHmsClient(v.durationSec),
              durationSec: v.durationSec || 0,
              views: Number(v.views) || 0,
              likes: Number(v.likes) || 0,
              publishedAt: v.publishedAt,
              isRedundant: false
            }],
            totalDuration: v.totalDurationStr || formatTotalDurationViClient(v.durationSec),
            totalDurationSec: v.durationSec || 0,
            totalViews: Number(v.views) || 0,
            totalLikes: Number(v.likes) || 0,
            thumbnailUrl: v.thumbnail,
            synopsis: v.review || `Phim hoạt hình mới tuyển chọn từ kênh ${v.channelName}.`,
            publishedAt: v.publishedAt,
            updatedAt: v.publishedAt,
            isRecent24h: true,
            recentUpdate: null
          };
          newFilmsBatch.unshift(newFilm);
          knownVideoMap.set(v.videoId, { film: newFilm, part: newFilm.parts[0] });
          changed = true;
        }
      });

      if (changed) {
        if (newFilmsBatch.length > 0) {
          state.allFilms = [...newFilmsBatch, ...state.allFilms];
        }
        rebuildRecentFeedAndGenres();
        setupNotificationsEngine();
        renderSidebar();
        renderMobileChips();
        applyFiltersAndRender(state.currentPage);
      }
    } catch (err) {
      // Fail quietly when /api/live-feed is unavailable (e.g. file:// protocol)
    }
  }

  // -------------------------------------------------------------------------
  // NOTIFICATION ENGINE (FEATURE 2)
  // -------------------------------------------------------------------------
  function setupNotificationsEngine() {
    // Detect and purge any stale legacy notifications that contained fake mock data
    const hasLegacyFakeNotifs = state.notifications && state.notifications.some(n => n.timeAgo === '15 phút trước' && n.filmId === 'film_2');
    if (hasLegacyFakeNotifs) {
      state.notifications = [];
      try { localStorage.removeItem('homnayxemgi_notifs'); } catch (e) {}
    }

    // If notifications array is empty, populate from followed films or seed with genuine latest uploads
    if (!state.notifications || state.notifications.length === 0) {
      state.notifications = [];

      // If user has favorites, generate notifications for any that have real recent updates
      state.recent24hFilms.forEach(film => {
        if (state.favorites.has(film.id)) {
          state.notifications.push({
            id: `notif_${film.id}_${film.recentUpdate.partIndex}`,
            filmId: film.id,
            filmTitle: film.title,
            partIndex: film.recentUpdate.partIndex,
            partLabel: film.recentUpdate.partLabel,
            videoId: film.recentUpdate.videoId || null,
            channelName: film.channelName,
            thumbnailUrl: film.thumbnailUrl,
            timeAgo: film.recentUpdate.timeAgo,
            timestamp: film.recentUpdate.timestamp,
            isRead: false
          });
        }
      });

      // If no notifications yet and we have real recent films, seed 2 films that were ACTUALLY uploaded today on YouTube
      if (state.notifications.length === 0 && state.recent24hFilms.length >= 2) {
        for (let i = 0; i < 2; i++) {
          const f = state.recent24hFilms[i];
          state.favorites.add(f.id);
          state.notifications.push({
            id: `notif_${f.id}_${f.recentUpdate.partIndex}`,
            filmId: f.id,
            filmTitle: f.title,
            partIndex: f.recentUpdate.partIndex,
            partLabel: f.recentUpdate.partLabel,
            videoId: f.recentUpdate.videoId || null,
            channelName: f.channelName,
            thumbnailUrl: f.thumbnailUrl,
            timeAgo: f.recentUpdate.timeAgo,
            timestamp: f.recentUpdate.timestamp,
            isRead: false
          });
        }
        try {
          localStorage.setItem('homnayxemgi_favs', JSON.stringify(Array.from(state.favorites)));
        } catch (e) {}
        updateBadgeCounts();
      }

      saveNotifications();
    } else {
      // Recompute real timeAgo dynamically from actual YouTube timestamps
      state.notifications.forEach(n => {
        const film = state.allFilms.find(f => f.id === n.filmId);
        if (film && (film.updatedAt || film.publishedAt)) {
          n.timeAgo = formatRealTimeAgo(film.updatedAt || film.publishedAt);
        }
      });
      saveNotifications();
    }

    renderNotificationList();
    updateNotificationBadge();
  }

  function saveNotifications() {
    try {
      localStorage.setItem('homnayxemgi_notifs', JSON.stringify(state.notifications));
    } catch (e) {}
  }

  function updateNotificationBadge() {
    const unreadCount = state.notifications.filter(n => !n.isRead).length;
    if (el.notifCountBadge) {
      el.notifCountBadge.textContent = unreadCount;
      el.notifCountBadge.classList.toggle('empty', unreadCount === 0);
      el.notifCountBadge.classList.toggle('has-unread', unreadCount > 0);
    }
  }

  function renderNotificationList() {
    if (!el.notifListContainer) return;

    if (!state.notifications || state.notifications.length === 0) {
      el.notifListContainer.innerHTML = `
        <div class="notif-empty">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: var(--sky-50); color: var(--sky-500); margin-bottom: 0.65rem;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <p style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">Chưa có thông báo tập mới</p>
          <p style="font-size: 0.75rem;">Hãy bấm nút trái tim để theo dõi các bộ phim bạn yêu thích. Khi có tập mới, bạn sẽ nhận được thông báo ngay tại đây!</p>
        </div>
      `;
      return;
    }

    const html = state.notifications.map(item => `
      <div class="notif-item ${item.isRead ? '' : 'unread'}" data-notif-id="${item.id}" data-film-id="${item.filmId}" data-part-index="${item.partIndex}" data-video-id="${escapeHtml(item.videoId || '')}">
        <img class="notif-thumb" src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.filmTitle)}" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80'">
        <div class="notif-body">
          <h4 class="notif-title">${escapeHtml(item.filmTitle)}</h4>
          <div class="notif-badge-row">
            <span class="notif-part-pill">Vừa ra ${escapeHtml(item.partLabel)}</span>
            <span>•</span>
            <span class="notif-channel">${escapeHtml(item.channelName)}</span>
          </div>
          <span class="notif-time">${item.timeAgo}</span>
        </div>
      </div>
    `).join('');

    el.notifListContainer.innerHTML = html;
  }

  function markNotificationAsRead(notifId) {
    const item = state.notifications.find(n => n.id === notifId);
    if (item) {
      item.isRead = true;
      saveNotifications();
      renderNotificationList();
      updateNotificationBadge();
    }
  }

  function markAllNotificationsAsRead() {
    state.notifications.forEach(n => { n.isRead = true; });
    saveNotifications();
    renderNotificationList();
    updateNotificationBadge();
    showToast('Đã đánh dấu tất cả thông báo là đã đọc');
  }

  function formatRealTimeAgo(isoString) {
    if (!isoString) return null;
    const past = new Date(isoString).getTime();
    if (isNaN(past)) return null;
    const now = Date.now();
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 0) return 'Vừa xong';
    if (diffSec < 60) return `${Math.max(1, diffSec)} giây trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return 'Hôm qua';
    if (diffDay < 7) return `${diffDay} ngày trước`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek} tuần trước`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth} tháng trước`;
    return `${Math.floor(diffDay / 365)} năm trước`;
  }

  function cleanDurationStr(str, fallbackSec) {
    if (!str || typeof str !== 'string') return formatSecToHms(fallbackSec);
    // Remove parenthetical verbose notes like "(đã trừ video gộp trùng; ...)"
    const cleaned = str.replace(/\s*\([^)]*\)/g, '').trim();
    return cleaned || formatSecToHms(fallbackSec);
  }

  function parseDurationToSec(str) {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  function formatSecToHms(sec) {
    if (!sec || isNaN(sec) || sec <= 0) return '';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m < 10 ? '0' : ''}${m}p`;
    return `${m} phút`;
  }

  // -------------------------------------------------------------------------
  // SIDEBAR & CHIPS RENDERING
  // -------------------------------------------------------------------------
  const CHECK_ICON_SVG = '<span class="multi-check" aria-hidden="true"><svg viewBox="0 0 16 16"><polyline points="3.2 8.4 6.6 11.8 12.8 4.6"></polyline></svg></span>';

  function renderChannelDrawerList() {
    if (!el.channelNavList) return;
    const rawQ = (el.channelSearchInput?.value || '').trim().toLowerCase();
    const q = removeVietnameseTones(rawQ);
    const list = state.channelEntries.filter(entry => {
      if (!q) return true;
      const hay = removeVietnameseTones(`${entry.name} ${entry.memberNames.join(' ')}`.toLowerCase());
      return hay.includes(q);
    });
    const allActive = state.selectedChannels.size === 0;
    const visibleStudioCount = state.channelEntries.length || state.channels.length || '';
    let cHtml = `
      <button type="button" class="sidebar-menu-btn ${allActive ? 'active' : ''}" data-channel="all">
        <span class="sidebar-btn-left">
          ${CHECK_ICON_SVG}
          <span>Tất cả kênh (${visibleStudioCount} mục · ${state.channels.length || 35} kênh)</span>
        </span>
        <span class="sidebar-count-tag">${state.allFilms.length}</span>
      </button>
    `;
    list.forEach(entry => {
      const active = state.selectedChannels.has(entry.id);
      if (entry.isGroup) {
        const membersLabel = entry.memberNames.join(' · ');
        cHtml += `
          <button type="button" class="sidebar-menu-btn is-group-entry ${active ? 'active' : ''}" data-channel="${escapeHtml(entry.id)}" title="${escapeHtml(membersLabel)}">
            <span class="sidebar-btn-left">
              ${CHECK_ICON_SVG}
              <span class="studio-text-col">
                <span class="studio-name-line">
                  <span class="truncate">${escapeHtml(entry.name)}</span>
                  <span class="studio-group-pill">${entry.memberIds.length} kênh</span>
                </span>
                <span class="studio-group-sub">${escapeHtml(membersLabel)}</span>
              </span>
            </span>
            <span class="sidebar-count-tag">${entry.filmCount}</span>
          </button>
        `;
      } else {
        cHtml += `
          <button type="button" class="sidebar-menu-btn ${active ? 'active' : ''}" data-channel="${escapeHtml(entry.id)}">
            <span class="sidebar-btn-left">
              ${CHECK_ICON_SVG}
              <span class="truncate">${escapeHtml(entry.name)}</span>
            </span>
            <span class="sidebar-count-tag">${entry.filmCount}</span>
          </button>
        `;
      }
    });
    el.channelNavList.innerHTML = cHtml;
  }

  function renderSidebar() {
    if (el.genreNavList) {
      const allActive = state.selectedGenres.size === 0;
      let gHtml = `
        <button type="button" class="sidebar-menu-btn ${allActive ? 'active' : ''}" data-genre="all">
          <span class="sidebar-btn-left">
            ${CHECK_ICON_SVG}
            <span>Tất cả thể loại</span>
          </span>
          <span class="sidebar-count-tag">${state.allFilms.length}</span>
        </button>
      `;
      state.genres.forEach(g => {
        const count = state.allFilms.filter(f => filmMatchesGenre(f, g)).length;
        const active = state.selectedGenres.has(g);
        gHtml += `
          <button type="button" class="sidebar-menu-btn ${active ? 'active' : ''}" data-genre="${escapeHtml(g)}">
            <span class="sidebar-btn-left">
              ${CHECK_ICON_SVG}
              <span class="truncate">${escapeHtml(g)}</span>
            </span>
            <span class="sidebar-count-tag">${count}</span>
          </button>
        `;
      });
      el.genreNavList.innerHTML = gHtml;
    }

    renderChannelDrawerList();

    // Mirror sidebar attribute groups inside Multi-Select Genre & Duration Drawer
    const desktopSidebar = document.getElementById('appSidebar');
    if (el.mobileFilterBody && desktopSidebar) {
      el.mobileFilterBody.innerHTML = desktopSidebar.innerHTML;
    }

    populateLeaderboardSelects();
    syncAllScopeControls();
  }

  function populateLeaderboardSelects() {
    if (el.lbChannelBtnLabel) {
      el.lbChannelBtnLabel.textContent = getChannelSummaryLabel('full');
    }
    if (el.lbGenreBtnLabel) {
      el.lbGenreBtnLabel.textContent = getGenreSummaryLabel();
    }
  }

  function renderMobileChips() {
    if (!el.mobileChipsRow) return;
    const allActive = state.selectedGenres.size === 0;
    let html = `
      <button type="button" class="mobile-chip-btn ${allActive ? 'active' : ''}" data-genre="all">
        Tất cả
      </button>
    `;
    state.genres.forEach(g => {
      const active = state.selectedGenres.has(g);
      html += `
        <button type="button" class="mobile-chip-btn ${active ? 'active' : ''}" data-genre="${escapeHtml(g)}">
          ${escapeHtml(g)}
        </button>
      `;
    });
    el.mobileChipsRow.innerHTML = html;
  }

  // -------------------------------------------------------------------------
  // FILTERING, LEADERBOARD & 3-VARIANT CARD RENDERING
  // -------------------------------------------------------------------------
  const ICON_EYE_XS = '<svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const ICON_HEART_XS = '<svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
  const TIME_RANGE_LABELS = {
    all: 'All-time',
    day: 'Hôm nay (24h)',
    week: 'Tuần này (7 ngày)',
    month: 'Tháng này (30 ngày)',
    year: 'Năm nay (365 ngày)'
  };

  function getChannelDisplayName(chId) {
    if (!chId || chId === 'all') return 'Tất cả kênh';
    const entry = state.channelEntries.find(e => e.id === chId);
    if (entry) return entry.name;
    const found = state.channels.find(c => c.id === chId);
    return found ? found.name : chId;
  }

  function getChannelSummaryLabel(style = 'compact') {
    const chTotal = state.channels.length || 35;
    if (state.selectedChannels.size === 0) {
      return style === 'compact' ? `${chTotal} Kênh` : `Tất cả ${chTotal} kênh`;
    }
    if (state.selectedChannels.size === 1) {
      const onlyId = Array.from(state.selectedChannels)[0];
      return getChannelDisplayName(onlyId);
    }
    return `Đã chọn ${state.selectedChannels.size} studio`;
  }

  function getGenreSummaryLabel() {
    if (state.selectedGenres.size === 0) return 'Tất cả thể loại';
    if (state.selectedGenres.size === 1) return Array.from(state.selectedGenres)[0];
    return `${state.selectedGenres.size} thể loại (${state.genreMatchMode === 'and' ? 'Và' : 'Hoặc'})`;
  }

  function renderActiveScopeBadges() {
    if (!el.activeScopeBadges) return;
    const pills = [];
    state.selectedChannels.forEach(entryId => {
      const entry = state.channelEntries.find(e => e.id === entryId);
      const label = getChannelDisplayName(entryId);
      const suffix = entry && entry.isGroup ? ` (${entry.memberIds.length} kênh)` : '';
      pills.push(`
        <button type="button" class="scope-active-chip" data-remove-channel="${escapeHtml(entryId)}" title="Bấm để bỏ lọc studio này">
          <span>Studio: ${escapeHtml(label + suffix)}</span>
          <span class="scope-clear-x" aria-hidden="true">×</span>
        </button>
      `);
    });
    state.selectedGenres.forEach(g => {
      pills.push(`
        <button type="button" class="scope-active-chip" data-remove-genre="${escapeHtml(g)}" title="Bấm để bỏ lọc thể loại này">
          <span>Thể loại: ${escapeHtml(g)}</span>
          <span class="scope-clear-x" aria-hidden="true">×</span>
        </button>
      `);
    });
    if (state.timeRange !== 'all') {
      pills.push(`
        <button type="button" class="scope-active-chip scope-chip-time" data-clear-scope="time" title="Bấm để xem mọi thời đại">
          <span>${escapeHtml(TIME_RANGE_LABELS[state.timeRange] || state.timeRange)}</span>
          <span class="scope-clear-x" aria-hidden="true">×</span>
        </button>
      `);
    }
    if (state.durationFilter !== 'all') {
      const durLabels = { short: '< 1.5h', medium: '1.5h - 3h', long: '3h - 6h', marathon: '> 6h' };
      pills.push(`
        <button type="button" class="scope-active-chip" data-clear-scope="duration" title="Bấm để bỏ lọc thời lượng">
          <span>Thời lượng: ${durLabels[state.durationFilter] || state.durationFilter}</span>
          <span class="scope-clear-x" aria-hidden="true">×</span>
        </button>
      `);
    }
    if (pills.length >= 2) {
      pills.push(`
        <button type="button" class="scope-clear-all-btn" data-clear-all-scopes="1">Xóa tất cả</button>
      `);
    }
    el.activeScopeBadges.innerHTML = pills.join('');
    el.activeScopeBadges.classList.toggle('hidden', pills.length === 0);
  }

  function applyFiltersAndRender(targetPage = 1) {
    state.currentPage = targetPage;
    const isLeaderboard = state.activeTab === 'leaderboard';
    const activeTimeWindow = isLeaderboard ? state.leaderboardTime : state.timeRange;

    if (el.leaderboardPanel) el.leaderboardPanel.classList.toggle('hidden', !isLeaderboard);
    if (el.inlineFilterBar) el.inlineFilterBar.classList.toggle('hidden', isLeaderboard);

    // Annotate period metrics (views & likes within selected day/week/month/year/all window)
    let scored = [];
    for (const film of state.allFilms) {
      // 1. Search filter
      if (state.searchQuery.trim()) {
        const q = removeVietnameseTones(state.searchQuery.toLowerCase().trim());
        const titleMatch = removeVietnameseTones(film.title.toLowerCase()).includes(q);
        const genresText = (Array.isArray(film.genres) ? film.genres.join(' ') : film.genre).toLowerCase();
        const genreMatch = removeVietnameseTones(genresText).includes(q);
        const resolvedGroup = resolveChannelSelectionId(film.channelId);
        const groupName = resolvedGroup !== film.channelId ? getChannelDisplayName(resolvedGroup) : '';
        const chMatch = removeVietnameseTones(`${film.channelName} ${groupName}`.toLowerCase()).includes(q);
        if (!titleMatch && !genreMatch && !chMatch) continue;
      }

      // 2. Multi-Select Genre & Channel/Group filters (shared across normal tabs and Leaderboard)
      if (!filmMatchesSelectedGenres(film)) continue;
      if (!filmMatchesSelectedChannels(film)) continue;

      // 3. Tab filter
      if (state.activeTab === 'recent24h') {
        const recentIds = new Set(state.recent24hFilms.map(f => f.id));
        if (!recentIds.has(film.id)) continue;
      } else if (state.activeTab === 'hot' && (film.totalDurationSec || 0) < 21600) {
        continue;
      } else if (state.activeTab === 'multipart' && film.partsCount <= 1) {
        continue;
      } else if (state.activeTab === 'single' && film.partsCount !== 1) {
        continue;
      } else if (state.activeTab === 'favorites' && !state.favorites.has(film.id)) {
        continue;
      }

      // 3b. Duration filter
      if (state.durationFilter !== 'all') {
        const hrs = (film.totalDurationSec || 0) / 3600;
        const bucket = hrs < 1.5 ? 'short' : (hrs < 3 ? 'medium' : (hrs < 6 ? 'long' : 'marathon'));
        if (bucket !== state.durationFilter) continue;
      }

      // 4. Time window filter & period views/likes calculation
      const pm = getFilmPeriodMetrics(film, activeTimeWindow);
      if (!pm.matches) continue;

      scored.push({
        film,
        periodViews: pm.views,
        periodLikes: pm.likes,
        updatedTs: film.updatedAt ? new Date(film.updatedAt).getTime() : (film.publishedAt ? new Date(film.publishedAt).getTime() : 0)
      });
    }

    // 5. Sorting
    const effectiveSort = isLeaderboard
      ? state.leaderboardMetric
      : (state.activeTab === 'hot' && state.sortBy === 'recent' ? 'duration' : state.sortBy);

    if (effectiveSort === 'views') {
      scored.sort((a, b) => (b.periodViews - a.periodViews) || (b.periodLikes - a.periodLikes) || (b.updatedTs - a.updatedTs));
    } else if (effectiveSort === 'likes') {
      scored.sort((a, b) => (b.periodLikes - a.periodLikes) || (b.periodViews - a.periodViews) || (b.updatedTs - a.updatedTs));
    } else if (effectiveSort === 'duration') {
      scored.sort((a, b) => (b.film.totalDurationSec - a.film.totalDurationSec) || (b.periodViews - a.periodViews));
    } else if (state.activeTab === 'recent24h') {
      scored.sort((a, b) => (b.film.recentUpdate?.timestamp || 0) - (a.film.recentUpdate?.timestamp || 0));
    } else {
      if (state.timeRange !== 'all') {
        scored.sort((a, b) => (b.updatedTs - a.updatedTs) || (b.periodViews - a.periodViews));
      }
    }

    const showRanks = isLeaderboard || effectiveSort === 'views' || effectiveSort === 'likes';
    const totalCount = scored.length;
    const totalPages = Math.ceil(totalCount / state.pageSize) || 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalCount);
    let pageItems = scored.slice(startIndex, endIndex).map((item, idx) => ({
      ...item,
      rank: startIndex + idx + 1
    }));

    if (isLeaderboard && el.lbSubheading) {
      const metricLabel = state.leaderboardMetric === 'likes' ? 'Yêu thích nhất' : 'Xem nhiều nhất';
      const timeLabel = TIME_RANGE_LABELS[state.leaderboardTime] || 'Tuần này';
      const chLabel = getChannelSummaryLabel('full');
      const genLabel = getGenreSummaryLabel();
      el.lbSubheading.textContent = `${metricLabel} • ${timeLabel} • ${chLabel} • ${genLabel}`;
    }

    renderActiveScopeBadges();
    if (state.urlReady) syncScopeToUrl();
    if (el.feedCountSummary) {
      el.feedCountSummary.textContent = totalCount === 0
        ? '0 BỘ PHIM'
        : `${totalCount.toLocaleString('en-US')} BỘ PHIM`;
    }
    if (el.btnApplyChannels) {
      el.btnApplyChannels.textContent = `Xem ${totalCount.toLocaleString('en-US')} kết quả`;
    }
    if (el.btnApplyMobileFilter) {
      el.btnApplyMobileFilter.textContent = `Xem ${totalCount.toLocaleString('en-US')} kết quả`;
    }

    const isChartListMode = isLeaderboard && totalCount > 0;
    if (el.cardsWidescreenGrid) {
      el.cardsWidescreenGrid.classList.toggle('chart-list-mode', isChartListMode);
    }

    // AMBIENT HERO ALWAYS MOUNTED -> ZERO JUMP WHEN FILTERING OR SWITCHING TABS
    if (el.spotlightHeroShell) {
      el.spotlightHeroShell.classList.remove('hidden');
      renderSpotlightHero();
    }

    if (isLeaderboard) {
      renderLeaderboardShowcase(totalCount);
    } else if (el.leaderboardShowcase) {
      el.leaderboardShowcase.innerHTML = '';
    }

    if (isChartListMode) {
      renderChartRows(pageItems);
    } else {
      renderCards(pageItems, { showRanks, emptyAlreadyShown: isLeaderboard && totalCount === 0 });
    }
    renderPagination(totalPages);
  }

  function renderCardStatsHtml(views, likes) {
    const vText = formatCompactCountVi(views);
    const lText = formatCompactCountVi(likes);
    const vExact = `${formatExactCountVi(views)} lượt xem`;
    const lExact = `${formatExactCountVi(likes)} lượt thích`;

    return `
      <div class="card-bento-stats">
        <div class="bento-stat-pill bento-views" title="${vExact}">
          ${ICON_EYE_XS}
          <span class="bento-num">${vText}</span>
          <span class="bento-lbl">xem</span>
        </div>
        <div class="bento-stat-pill bento-likes" title="${lExact}">
          ${ICON_HEART_XS}
          <span class="bento-num">${lText}</span>
          <span class="bento-lbl">thích</span>
        </div>
      </div>
    `;
  }

  function buildCardMarkup(entry, options = {}) {
    const { film, periodViews, periodLikes, rank } = entry;
    const { showRank = false, extraClass = '' } = options;
    const isFav = state.favorites.has(film.id);
    const partsLabel = film.partsCount > 1 ? `${film.partsCount} phần` : 'Full';
    const hasRecentBadge = film.isRecent24h && film.recentUpdate;
    const viewsVal = periodViews !== undefined ? periodViews : (film.totalViews || 0);
    const rankClass = rank === 1 ? 'rank-gold' : (rank === 2 ? 'rank-silver' : (rank === 3 ? 'rank-bronze' : ''));
    const coreTitle = cleanCoreTitleClient(film.title) || film.title;

    // Watch Progress indicator on card
    const progressEntry = state.progress[film.id];
    let progressBarMarkup = '';
    let hasProgressClass = '';
    if (progressEntry) {
      hasProgressClass = 'has-progress';
      const currentPos = Number.isInteger(progressEntry.pos) ? progressEntry.pos : 0;
      const totalParts = progressEntry.total || film.partsCount || 1;
      const pct = Math.min(100, Math.max(10, Math.round(((currentPos + 1) / totalParts) * 100)));
      const timeNote = progressEntry.timeSec > 60 ? ` • ${Math.floor(progressEntry.timeSec / 60)}p` : '';
      progressBarMarkup = `
        <div class="card-progress-bar-wrap" title="Đang xem ${escapeHtml(progressEntry.label || `Tập ${currentPos + 1}`)} / ${totalParts}">
          <div class="card-progress-bar-track">
            <div class="card-progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
          <span class="card-progress-label">
            <span>Đang xem ${escapeHtml(progressEntry.label || `Tập ${currentPos + 1}`)}${totalParts > 1 ? ` / ${totalParts}` : ''}</span>
            <span>${pct}%${timeNote}</span>
          </span>
        </div>
      `;
    }

    return `
      <article class="film-card ${extraClass} ${rankClass} ${hasProgressClass}" data-film-id="${film.id}" title="${escapeHtml(film.title)}">
        <div class="card-thumbnail-box">
          <img
            class="card-img"
            src="${escapeHtml(film.thumbnailUrl)}"
            alt="${escapeHtml(film.title)}"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80'"
          >
          <div class="card-vignette"></div>

          ${showRank && rank ? `
            <div class="card-rank-badge ${rankClass}" aria-label="Hạng ${rank}">#${rank}</div>
          ` : (hasRecentBadge ? `
            <div class="card-update-pill" title="Cập nhật ${escapeHtml(film.recentUpdate.timeAgo)}">MỚI · ${escapeHtml(film.recentUpdate.timeAgo)}</div>
          ` : '')}

          ${film.totalDuration ? `
            <div class="card-duration-badge">${escapeHtml(film.totalDuration)}</div>
          ` : ''}

          <button type="button" class="card-fav-btn ${isFav ? 'active' : ''}" data-fav-id="${film.id}" aria-label="Lưu phim" title="${isFav ? 'Đang theo dõi (Bấm để hủy)' : 'Lưu phim để nhận thông báo tập mới'}">
            <svg class="icon icon-xs" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>

          <div class="card-hover-actions">
            <span class="hover-play-pill">${film.partsCount > 1 ? 'Xem Tập 1' : 'Xem Ngay'}</span>
            <button type="button" class="card-info-btn" data-info-id="${film.id}" aria-label="Xem tóm tắt cốt truyện">Chi Tiết</button>
          </div>

          ${progressBarMarkup}
        </div>

        <h3 class="card-title">${escapeHtml(coreTitle)}</h3>
        <div class="card-meta-row">${escapeHtml(film.channelName)} · ${formatCompactCountVi(viewsVal)} xem · ${partsLabel}</div>
      </article>
    `;
  }

  function renderLeaderboardShowcase(totalCount) {
    if (!el.leaderboardShowcase) return;

    if (totalCount === 0) {
      el.leaderboardShowcase.innerHTML = `
        <div class="lb-empty-state">
          <p class="lb-empty-title">Chưa có phim nào được xếp hạng trong khung thời gian này</p>
          <p class="lb-empty-sub">Hãy thử mở rộng khoảng thời gian hoặc đặt lại bộ lọc kênh/thể loại.</p>
          <div class="lb-empty-actions">
            ${state.leaderboardTime !== 'month' ? '<button type="button" class="lb-reset-btn" data-lb-quick-time="month">Xem BXH Tháng Này</button>' : ''}
            <button type="button" class="lb-reset-btn lb-reset-primary" data-lb-quick-time="all">Xem BXH All-time</button>
            ${(state.selectedChannels.size > 0 || state.selectedGenres.size > 0) ? '<button type="button" class="lb-reset-btn" data-lb-clear-scope="1">Hiện Tất Cả Kênh &amp; Thể Loại</button>' : ''}
          </div>
        </div>
      `;
      return;
    }

    el.leaderboardShowcase.innerHTML = `
      <div class="chart-table-head" aria-hidden="true">
        <span class="cth-rank">Hạng</span>
        <span class="cth-film">Phim &amp; Kênh phát hành</span>
        <span class="cth-stat">Lượt Xem</span>
        <span class="cth-stat">Lượt Thích</span>
      </div>
    `;
  }

  function renderChartRows(items) {
    if (!el.cardsWidescreenGrid) return;
    const html = items.map(entry => {
      const { film, periodViews, periodLikes, rank } = entry;
      const isFav = state.favorites.has(film.id);
      const rankClass = rank === 1 ? 'rank-gold' : (rank === 2 ? 'rank-silver' : (rank === 3 ? 'rank-bronze' : ''));
      const partsLabel = film.partsCount > 1 ? `${film.partsCount} Phần` : 'Full';
      const timeLabel = film.updatedAt ? formatRealTimeAgo(film.updatedAt) : '';

      return `
        <article class="chart-row-card ${rankClass}" data-film-id="${film.id}">
          <div class="chart-rank-cell">
            <span class="chart-rank-num ${rankClass}">#${rank}</span>
          </div>
          <div class="chart-film-cell">
            <div class="chart-thumb-wrap">
              <img class="chart-thumb" src="${escapeHtml(film.thumbnailUrl)}" alt="${escapeHtml(film.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80'">
              <span class="chart-dur-chip">${escapeHtml(film.totalDuration || partsLabel)}</span>
            </div>
            <div class="chart-meta-col">
              <h3 class="chart-title">${escapeHtml(film.title)}</h3>
              <div class="chart-submeta">
                <span class="chart-channel">${escapeHtml(film.channelName)}</span>
                <span>•</span>
                <span>${escapeHtml(film.genre)}</span>
                <span>•</span>
                <span>${partsLabel}${timeLabel ? ` • ${escapeHtml(timeLabel)}` : ''}</span>
              </div>
            </div>
          </div>
          <div class="chart-stats-cells">
            <div class="chart-metric-col chart-metric-views ${state.leaderboardMetric === 'views' ? 'is-primary' : ''}" title="${formatExactCountVi(periodViews)} lượt xem">
              <span class="chart-m-val">${formatCompactCountVi(periodViews)}</span>
              <span class="chart-m-lbl">${ICON_EYE_XS} xem</span>
            </div>
            <div class="chart-metric-col chart-metric-likes ${state.leaderboardMetric === 'likes' ? 'is-primary' : ''}" title="${formatExactCountVi(periodLikes)} lượt thích">
              <span class="chart-m-val">${formatCompactCountVi(periodLikes)}</span>
              <span class="chart-m-lbl">${ICON_HEART_XS} thích</span>
            </div>
            <button type="button" class="card-fav-btn chart-fav-btn ${isFav ? 'active' : ''}" data-fav-id="${film.id}" title="Lưu phim">
              <svg class="icon icon-xs" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
          </div>
        </article>
      `;
    }).join('');
    el.cardsWidescreenGrid.innerHTML = html;
  }

  function renderCards(items, opts = {}) {
    if (!el.cardsWidescreenGrid) return;
    if (opts.emptyAlreadyShown) {
      el.cardsWidescreenGrid.innerHTML = '';
      return;
    }
    if (items.length === 0) {
      el.cardsWidescreenGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4.5rem 1rem; color: var(--text-muted);">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px; background: var(--sky-50); color: var(--sky-500); margin-bottom: 0.75rem;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <p style="font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
            Không tìm thấy phim phù hợp với tiêu chí lọc
          </p>
          <p style="font-size: 0.875rem;">Hãy thử xóa từ khóa tìm kiếm, chọn khung thời gian rộng hơn hoặc bấm tab khác.</p>
        </div>
      `;
      return;
    }

    el.cardsWidescreenGrid.innerHTML = items.map(entry =>
      buildCardMarkup(entry, { showRank: !!opts.showRanks })
    ).join('');
  }

  function renderPagination(totalPages) {
    if (!el.paginationBar) return;
    if (totalPages <= 1) {
      el.paginationBar.innerHTML = '';
      return;
    }

    const cur = state.currentPage;
    let html = '';

    if (cur > 1) {
      html += `<button type="button" class="page-num-btn" data-page="${cur - 1}" title="Trang trước">«</button>`;
    }

    const maxShown = 5;
    let startPage = Math.max(1, cur - Math.floor(maxShown / 2));
    let endPage = Math.min(totalPages, startPage + maxShown - 1);
    if (endPage - startPage + 1 < maxShown) {
      startPage = Math.max(1, endPage - maxShown + 1);
    }

    if (startPage > 1) {
      html += `<button type="button" class="page-num-btn" data-page="1">1</button>`;
      if (startPage > 2) html += `<span style="color:var(--text-muted); padding:0 0.25rem;">...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `<button type="button" class="page-num-btn ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span style="color:var(--text-muted); padding:0 0.25rem;">...</span>`;
      html += `<button type="button" class="page-num-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    if (cur < totalPages) {
      html += `<button type="button" class="page-num-btn" data-page="${cur + 1}" title="Trang sau">»</button>`;
    }

    el.paginationBar.innerHTML = html;
  }

  // -------------------------------------------------------------------------
  // CINEMA THEATER MODAL
  // -------------------------------------------------------------------------
  function openPlayer(film, partTarget = null) {
    if (!film || !film.parts || film.parts.length === 0) return;
    let currentPart = null;
    if (partTarget && typeof partTarget === 'object') {
      if (partTarget.videoId) {
        currentPart = film.parts.find(p => p.videoId === partTarget.videoId) || null;
      }
      if (!currentPart && Number.isInteger(partTarget.partPos) && film.parts[partTarget.partPos]) {
        currentPart = film.parts[partTarget.partPos];
      }
      if (!currentPart && Number.isInteger(partTarget.partNumber)) {
        currentPart = film.parts.find(p => p.partNumber === partTarget.partNumber) || null;
      }
    } else if (typeof partTarget === 'number') {
      currentPart = film.parts.find(p => p.partNumber === partTarget)
        || film.parts[partTarget - 1]
        || null;
    }
    if (!currentPart) currentPart = film.parts[0];

    const resolvedPos = film.parts.indexOf(currentPart);
    const resolvedPartNum = currentPart.partNumber || (resolvedPos + 1);
    state.currentPlayingFilm = film;
    state.currentPlayingPartIndex = resolvedPartNum;

    const videoId = currentPart.videoId || 'p7xLcOrLvbo';

    if (el.modalFilmTitle) {
      el.modalFilmTitle.textContent = film.partsCount > 1
        ? `[${currentPart.label || `Tập ${resolvedPartNum}`}] ${film.title}`
        : film.title;
    }
    if (el.modalChannelKicker) {
      const viewsStr = film.totalViews > 0 ? ` • ${formatExactCountVi(film.totalViews)} lượt xem` : '';
      const likesStr = film.totalLikes > 0 ? ` • ${formatExactCountVi(film.totalLikes)} lượt thích` : '';
      el.modalChannelKicker.textContent = `${film.channelName} • ${film.genre}${viewsStr}${likesStr}`;
    }
    if (el.modalEpCounter) el.modalEpCounter.textContent = `${film.partsCount} Tập`;

    // Check saved timestamp to resume where left off (> 15 seconds)
    let startParam = '';
    const existingProg = state.progress[film.id];
    if (existingProg && existingProg.videoId === videoId && existingProg.timeSec > 15) {
      startParam = `&start=${Math.floor(existingProg.timeSec)}`;
    }

    // Embed YouTube Player with autoplay, enablejsapi=1, and start timestamp
    if (el.youtubeIframe) {
      el.youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1${startParam}`;
    }

    // Render Episode Capsules Matrix with exact array position & videoId to avoid partNumber collisions
    if (el.modalEpMatrix) {
      const epHtml = film.parts.map((p, idx) => {
        const epNum = p.partNumber || (idx + 1);
        const isActive = idx === resolvedPos;
        const isNewEp = Boolean(
          film.recentUpdate && (
            film.recentUpdate.videoId
              ? p.videoId === film.recentUpdate.videoId
              : epNum === film.recentUpdate.partIndex
          )
        );
        const epStatsText = (p.views > 0 || p.likes > 0)
          ? `${formatCompactCountVi(p.views)} xem • ${formatCompactCountVi(p.likes)} thích`
          : '';
        return `
          <button type="button" class="ep-capsule-btn ${isActive ? 'active' : ''} ${isNewEp ? 'is-new' : ''}" data-ep-pos="${idx}" data-video-id="${escapeHtml(p.videoId || '')}" data-ep-index="${epNum}" title="${escapeHtml(p.title || `Tập ${epNum}`)}">
            <span>${escapeHtml(p.label || `Tập ${epNum}`)}</span>
            <span class="ep-dur-note">${escapeHtml(p.duration || '')}</span>
            ${epStatsText ? `<span class="ep-stats-note">${epStatsText}</span>` : ''}
            ${isNewEp ? '<span class="ep-new-badge">MỚI</span>' : ''}
          </button>
        `;
      }).join('');
      el.modalEpMatrix.innerHTML = epHtml;
    }

    addToHistory(film.id);
    saveProgress(film, currentPart, resolvedPos);
    renderPlayerExtras(film, currentPart, resolvedPos);
    syncUrl({ film: film.id, ep: resolvedPos > 0 ? resolvedPos + 1 : null });
    el.theaterModal?.classList.add('active');
  }

  function closePlayer() {
    if (el.youtubeIframe) {
      el.youtubeIframe.src = ''; // stop audio immediately
    }
    if (state.autoNextCountdownTimer) {
      clearInterval(state.autoNextCountdownTimer);
      state.autoNextCountdownTimer = null;
    }
    el.autoNextOverlay?.classList.add('hidden');
    if (state.isAmbientDim) {
      toggleAmbientDim();
    }
    el.theaterModal?.classList.remove('active');
    state.currentPlayingFilm = null;
    renderContinueShelf();
    applyFiltersAndRender(state.currentPage);
    syncUrl({ film: null, ep: null });
  }

  // ---- Watch progress (Continue Watching) ----
  function saveProgress(film, part, pos, timeSec = null) {
    const prevTimeSec = state.progress[film.id]?.timeSec || 0;
    state.progress[film.id] = {
      videoId: part.videoId,
      pos,
      label: part.label || `Tập ${pos + 1}`,
      total: film.parts.length,
      timeSec: timeSec !== null ? Math.floor(timeSec) : prevTimeSec,
      ts: Date.now()
    };
    const ids = Object.keys(state.progress).sort((a, b) => state.progress[b].ts - state.progress[a].ts);
    ids.slice(30).forEach(id => delete state.progress[id]);
    try { localStorage.setItem('homnayxemgi_progress', JSON.stringify(state.progress)); } catch (e) {}
  }

  function renderContinueShelf() {
    if (!el.continueShelf || !el.continueRow) return;
    const items = Object.entries(state.progress)
      .map(([id, p]) => ({ film: state.allFilms.find(f => f.id === id), p }))
      .filter(x => x.film)
      .sort((a, b) => b.p.ts - a.p.ts)
      .slice(0, 12);
    el.continueShelf.classList.toggle('hidden', items.length === 0);
    el.continueRow.innerHTML = items.map(({ film, p }) => `
      <button type="button" class="continue-card" data-continue-film="${escapeHtml(film.id)}" title="${escapeHtml(film.title)}">
        <span class="continue-thumb"><img src="${escapeHtml(film.thumbnailUrl)}" alt="" loading="lazy"><span class="continue-badge">${escapeHtml(p.label)}${p.total > 1 ? ` / ${p.total}` : ''}</span></span>
        <span class="continue-meta">
          <span class="continue-film-title">${escapeHtml(film.title)}</span>
          <span class="continue-sub">Xem tiếp • ${escapeHtml(formatRealTimeAgo(new Date(p.ts).toISOString()) || 'vừa xong')}</span>
        </span>
      </button>`).join('');
  }

  // ---- Theater extras: tags, synopsis, prev/next, related films ----
  function renderPlayerExtras(film, part, pos) {
    const genres = Array.isArray(film.genres) && film.genres.length ? film.genres : [film.genre];
    if (el.modalTags) {
      el.modalTags.innerHTML =
        `<button type="button" class="random-tag-pill tag-channel" data-scope-channel="${escapeHtml(film.channelId)}">${escapeHtml(film.channelName)}</button>` +
        genres.map(g => `<button type="button" class="random-tag-pill" data-scope-genre="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('') +
        `<span class="random-tag-pill tag-date">${escapeHtml(film.totalDuration || '')}</span>`;
    }
    if (el.modalSynopsis) el.modalSynopsis.textContent = formatSpotlightEditorial(film).synopsis;
    if (el.btnPrevEp) el.btnPrevEp.disabled = pos <= 0;
    if (el.btnNextEp) el.btnNextEp.disabled = pos >= film.parts.length - 1;
    if (el.btnOpenYoutube) el.btnOpenYoutube.href = `https://www.youtube.com/watch?v=${part.videoId}`;

    if (el.relatedRow && el.relatedBlock) {
      const sameCh = state.allFilms.filter(f => f.id !== film.id && f.channelId === film.channelId);
      let pool = state.allFilms.filter(f => f.id !== film.id && genres.some(g => filmMatchesGenre(f, g)));
      pool.sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));
      const related = pool.slice(0, 8);
      if (related.length < 8) {
        sameCh.slice(0, 8 - related.length).forEach(f => { if (!related.includes(f)) related.push(f); });
      }
      if (el.relatedTitle) el.relatedTitle.textContent = `PHIM 3D CÙNG THỂ LOẠI: ${genres[0].toUpperCase()}`;
      el.relatedBlock.classList.toggle('hidden', related.length === 0);
      el.relatedRow.innerHTML = related.map(f => `
        <button type="button" class="continue-card related-card" data-related-film="${escapeHtml(f.id)}" title="${escapeHtml(f.title)}">
          <span class="continue-thumb"><img src="${escapeHtml(f.thumbnailUrl)}" alt="" loading="lazy"><span class="continue-badge">${escapeHtml(f.totalDuration || '')}</span></span>
          <span class="continue-meta">
            <span class="continue-film-title">${escapeHtml(f.title)}</span>
            <span class="continue-sub">${escapeHtml(f.channelName)} • ${formatCompactCountVi(f.totalViews)} xem</span>
          </span>
        </button>`).join('');
    }
    const dlg = el.theaterModal?.querySelector('.cinema-dialog-shell');
    if (dlg) dlg.scrollTop = 0;
  }

  function stepEpisode(delta) {
    const film = state.currentPlayingFilm;
    if (!film) return;
    const curPos = film.parts.findIndex(p => p.videoId === state.progress[film.id]?.videoId) >= 0
      ? film.parts.findIndex(p => p.videoId === state.progress[film.id]?.videoId)
      : film.parts.findIndex(p => p.partNumber === state.currentPlayingPartIndex);
    const next = curPos + delta;
    if (next < 0 || next >= film.parts.length) return;
    openPlayer(film, { partPos: next, videoId: film.parts[next].videoId });
  }

  // -------------------------------------------------------------------------
  // THEATER WIDE MODE & AMBIENT DIM
  // -------------------------------------------------------------------------
  function toggleTheaterWide() {
    state.isTheaterWide = !state.isTheaterWide;
    const shell = el.theaterModal?.querySelector('.cinema-dialog-shell');
    if (shell) shell.classList.toggle('is-wide', state.isTheaterWide);
    el.btnTheaterWide?.classList.toggle('active', state.isTheaterWide);
    showToast(state.isTheaterWide ? 'Đã bật chế độ Rạp Chiếu Rộng' : 'Đã về chế độ tiêu chuẩn');
  }

  function toggleAmbientDim() {
    state.isAmbientDim = !state.isAmbientDim;
    const shell = el.theaterModal?.querySelector('.cinema-dialog-shell');
    if (shell) shell.classList.toggle('is-dimmed', state.isAmbientDim);
    el.theaterModal?.classList.toggle('is-dimmed', state.isAmbientDim);
    el.btnAmbientDim?.classList.toggle('active', state.isAmbientDim);
    el.btnAmbientUndim?.classList.toggle('hidden', !state.isAmbientDim);
    showToast(state.isAmbientDim ? 'Đã tắt đèn không gian' : 'Đã bật lại đèn rạp');
  }

  // -------------------------------------------------------------------------
  // AUTO-PLAY NEXT EPISODE ENGINE
  // -------------------------------------------------------------------------
  function toggleAutoNext() {
    state.autoNextEnabled = !state.autoNextEnabled;
    try { localStorage.setItem('homnayxemgi_autonext', state.autoNextEnabled ? '1' : '0'); } catch (e) {}
    el.btnToggleAutoNext?.classList.toggle('active', state.autoNextEnabled);
    showToast(state.autoNextEnabled ? 'Đã BẬT tự động chuyển tập tiếp theo' : 'Đã TẮT tự động chuyển tập');
  }

  function handleEpisodeEnded() {
    if (!state.autoNextEnabled || !state.currentPlayingFilm) return;
    const film = state.currentPlayingFilm;
    const currentPart = film.parts.find(p => p.videoId === state.progress[film.id]?.videoId) || film.parts[state.progress[film.id]?.pos || 0];
    const currentPos = film.parts.indexOf(currentPart);
    if (currentPos < 0 || currentPos >= film.parts.length - 1) {
      showToast('Bạn đã xem hết tập cuối của bộ phim này!');
      return;
    }
    const nextPart = film.parts[currentPos + 1];
    startAutoNextCountdown(film, nextPart, currentPos + 1);
  }

  function startAutoNextCountdown(film, nextPart, nextPos) {
    if (state.autoNextCountdownTimer) {
      clearInterval(state.autoNextCountdownTimer);
      state.autoNextCountdownTimer = null;
    }
    if (!el.autoNextOverlay) {
      openPlayer(film, { partPos: nextPos });
      return;
    }
    let countdown = 5;
    if (el.autoNextTimer) el.autoNextTimer.textContent = `${countdown}s`;
    if (el.autoNextTitle) el.autoNextTitle.textContent = `Chuẩn bị chiếu: ${nextPart.label || `Tập ${nextPos + 1}`}`;
    el.autoNextOverlay.classList.remove('hidden');

    state.autoNextCountdownTimer = setInterval(() => {
      countdown--;
      if (el.autoNextTimer) el.autoNextTimer.textContent = `${countdown}s`;
      if (countdown <= 0) {
        clearInterval(state.autoNextCountdownTimer);
        state.autoNextCountdownTimer = null;
        el.autoNextOverlay.classList.add('hidden');
        openPlayer(film, { partPos: nextPos });
      }
    }, 1000);
  }

  function cancelAutoNextCountdown() {
    if (state.autoNextCountdownTimer) {
      clearInterval(state.autoNextCountdownTimer);
      state.autoNextCountdownTimer = null;
    }
    el.autoNextOverlay?.classList.add('hidden');
    showToast('Đã dừng tự chuyển tập');
  }

  function executeAutoNextImmediately() {
    if (state.autoNextCountdownTimer) {
      clearInterval(state.autoNextCountdownTimer);
      state.autoNextCountdownTimer = null;
    }
    el.autoNextOverlay?.classList.add('hidden');
    stepEpisode(1);
  }

  // -------------------------------------------------------------------------
  // QR CODE CLIENT-SIDE MODAL (XEM TRÊN ĐIỆN THOẠI & TV)
  // -------------------------------------------------------------------------
  function openQrModal() {
    if (!state.currentPlayingFilm) return;
    const film = state.currentPlayingFilm;
    const prog = state.progress[film.id];
    const pos = (prog && Number.isInteger(prog.pos)) ? prog.pos : 0;
    const epNum = pos + 1;
    const part = film.parts[pos] || film.parts[0];
    const epLabel = part.label || `Tập ${epNum}`;

    const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
    const targetUrl = `${origin}${window.location.pathname}?film=${encodeURIComponent(film.id)}&ep=${epNum}`;

    if (el.qrTargetTitle) {
      el.qrTargetTitle.textContent = `[${epLabel}] ${film.title}`;
    }
    if (el.qrCodeFrame) {
      el.qrCodeFrame.innerHTML = generateQrSvg(targetUrl);
    }
    if (el.btnCopyQrUrl) {
      el.btnCopyQrUrl.dataset.url = targetUrl;
    }
    if (el.btnCopyQrUrlText) {
      el.btnCopyQrUrlText.textContent = 'Sao Chép Đường Dẫn';
    }
    el.qrModal?.classList.add('active');
  }

  function closeQrModal() {
    el.qrModal?.classList.remove('active');
  }

  async function copyQrUrl() {
    const url = el.btnCopyQrUrl?.dataset.url || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      if (el.btnCopyQrUrlText) el.btnCopyQrUrlText.textContent = 'Đã Sao Chép!';
      showToast('Đã sao chép đường dẫn xem phim');
      setTimeout(() => {
        if (el.btnCopyQrUrlText) el.btnCopyQrUrlText.textContent = 'Sao Chép Đường Dẫn';
      }, 2000);
    } catch (err) {
      showToast('Không thể sao chép, hãy copy trên thanh địa chỉ');
    }
  }

  // -------------------------------------------------------------------------
  // SPOTLIGHT HERO v2 (CURATED EDITORIAL STAGE + INTERACTIVE UP-NEXT RAIL)
  // -------------------------------------------------------------------------
  function getHiResPosterUrls(film) {
    let vid = film?.parts?.[0]?.videoId || film?.parts?.[0]?.id || '';
    if (!vid && film?.thumbnailUrl) {
      const m = String(film.thumbnailUrl).match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
      if (m) vid = m[1];
    }
    const hq = film?.thumbnailUrl || (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : '');
    if (!vid) {
      return { maxres: hq, sd: hq, mq: hq, hq };
    }
    return {
      maxres: `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`,
      sd: `https://i.ytimg.com/vi/${vid}/sddefault.jpg`,
      mq: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
      hq
    };
  }

  function handleSpotlightImgFallback(img) {
    if (!img) return;
    const step = img.dataset.fbStep || 'maxres';
    if (step === 'maxres' && img.dataset.sdSrc) {
      img.dataset.fbStep = 'sd';
      img.classList.add('is-letterbox-crop');
      img.src = img.dataset.sdSrc;
    } else if ((step === 'maxres' || step === 'sd') && img.dataset.hqSrc) {
      img.dataset.fbStep = 'hq';
      img.classList.add('is-letterbox-crop');
      img.src = img.dataset.hqSrc;
    } else {
      img.dataset.fbStep = 'done';
      img.src = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1280&auto=format&fit=crop&q=80';
    }
  }

  function extractCleanPlotSummary(film) {
    let raw = String(film?.synopsis || film?.review || '').trim();
    if (!raw) return '';

    raw = raw
      .replace(/^[📽🔥📌🚀👉❌\s•●\-–|】\]]*/u, '')
      .replace(/^(?:Ủng\s*hộ\s*AD[^)\n]*?(?:dưới\s*cmt|Tpbank|momo|tại\s*:?)|Donate\s*ủng\s*hộ[^:]*:|Nhớ\s*tăng\s*tốc\s*video[^!.]*[!.]\s*)/iu, '')
      .replace(/Cảnh\s*giới\s*:[^📌\n]*(?:Phong\s*Vương|Chí\s*Tôn|Đế\s*Cảnh)/iu, '')
      .replace(/📽?\s*Phim\s*:\s*[^|\n]+\|\s*[A-Za-z0-9\s]+/iu, '')
      .replace(/【[^】]{0,140}】/g, ' ')
      .replace(/\(\s*Nội\s*dung\s*giải\s*trí\s*hư\s*cấu[^)]*\)\s*/gi, '')
      .replace(/^Mùa\s*\d+\s*\|\s*[^(\n]{4,60}/iu, '')
      .replace(/^\*[^*]{4,90}\*\s*/g, '')
      .replace(/(?:📌\s*)?(?:tóm\s*tắt(?:\s*phim)?|nội\s*dung)\s*[:：\-]?\s*/giu, '')
      .replace(/^[\s•●\-–|:：!\]】]+/u, '')
      .replace(/\.\s*\(\s*(?:\d+\s*phần(?:\s*\/\s*\d+\s*video)?(?:\s*\([^)]*\))?|Đã hoàn[^)]*)\s*\)\s*\.?\s*$/i, '.')
      .replace(/\s+/g, ' ')
      .trim();

    if (!raw || raw.length < 75 ||
        /phim hoạt hình 3d thuyết minh trọn bộ từ kênh|tuyển tập hoạt hình 3d đặc sắc|một bộ phim hoạt hình đặc sắc|phân\s*loại\s*độ\s*tuổi|cảnh\s*báo\s*\(advisories\)|all\s*content\s*on\s*this\s*channel|all\s*music\s*,\s*pictures|xem\s*tập\s*mới\s*ở\s*đây|chào\s*mừng\s*bạn\s*đến\s*với\s*kênh|kênh\s*chuyên\s*review|copyright\s*disclaimer|phân\s*tích\s*các\s*nhân\s*vật|cập\s*nhật\s*(?:anime|những\s*bộ\s*phim)|video\s*được\s*dịch\s*và\s*thuyết\s*minh\s*bởi|hagtag|©/i.test(raw)) {
      return '';
    }

    const coreTitle = cleanCoreTitleClient(film?.title || '');
    if (coreTitle && raw.toLowerCase().includes(coreTitle.toLowerCase())) {
      const idx = raw.toLowerCase().indexOf(coreTitle.toLowerCase());
      if (idx >= 0 && idx <= 28) {
        const after = raw.slice(idx + coreTitle.length).replace(/^[\s.,:;\-–—|\]】]+/, '').trim();
        if (after.length >= 80) raw = after;
      }
    }

    raw = raw.charAt(0).toUpperCase() + raw.slice(1);
    if (raw.endsWith('...')) {
      raw = raw.slice(0, -3).replace(/\s+\S*$/, '').trim() + '…';
    }
    return raw;
  }

  function hasCleanPlotSynopsis(film) {
    return extractCleanPlotSummary(film).length >= 80;
  }

  function formatSpotlightEditorial(film, rankIdx = 0) {
    let rawTitle = cleanCoreTitleClient(film?.title || 'Phim hoạt hình 3D') || film?.title || 'Phim hoạt hình 3D';
    let mainTitle = rawTitle;
    let hook = '';

    // Split structured bilingual/hooked titles cleanly into Title + Hook
    const parenMatch = rawTitle.match(/^([^\(\)]{6,44}?)\s*\(([^()]{14,140})\)\s*$/);
    if (parenMatch) {
      mainTitle = parenMatch[1].trim();
      hook = parenMatch[2].trim();
    } else {
      const sepMatch = rawTitle.match(/^([^:|–—-]{6,40}?)\s*(?::|\||–|—|\s+-\s+)\s*(.{14,140})$/);
      if (sepMatch && !isGenericTitleSegmentClient(sepMatch[1])) {
        mainTitle = sepMatch[1].trim();
        hook = sepMatch[2].trim();
      } else {
        const commaMatch = rawTitle.match(/^([^,]{8,38}?),\s*(.{12,140})$/);
        const pivotMatch = !commaMatch && rawTitle.match(/^(.{10,36}?)\s+((?:Ta\s+(?:Xuyên|Trùng|Thức|Bất|Có|Dùng)|Tôi\s+(?:Xuyên|Trùng|Thức|Trở)|Lần\s+Này\s+Ta|Bắt\s+Đầu\s+Ta|Mở\s+Mắt\s+Ra)\b.{12,})$/i);
        if (commaMatch && !isGenericTitleSegmentClient(commaMatch[1])) {
          mainTitle = commaMatch[1].trim();
          hook = commaMatch[2].trim();
        } else if (pivotMatch && !isGenericTitleSegmentClient(pivotMatch[1])) {
          mainTitle = pivotMatch[1].trim();
          hook = pivotMatch[2].trim();
        }
      }
    }
    mainTitle = mainTitle.replace(/[\s\.!?,;:–—-]+$/g, '').trim() || rawTitle;
    hook = hook.replace(/^[\s\-:|–—]+|[\s\.]+$/g, '').trim();

    const genres = (Array.isArray(film?.genres) && film.genres.length ? film.genres : [film?.genre || 'Hoạt hình 3D']).slice(0, 2);
    const partsLabel = film?.partsCount > 1 ? `${film.partsCount} Phần` : 'Trọn bộ Full';
    const cleanPlot = extractCleanPlotSummary(film);
    const syn = cleanPlot || (
      `Bộ phim ${genres.join(', ')} gồm ${partsLabel}` +
      (film?.totalDuration ? ` (${film.totalDuration})` : '') +
      (film?.totalViews > 0 ? `, thu hút ${formatCompactCountVi(film.totalViews)} lượt xem trên kênh ${film.channelName}.` : ` được tuyển chọn trên kênh ${film?.channelName}.`)
    );

    const updatedMs = film?.updatedAt || film?.publishedAt ? new Date(film.updatedAt || film.publishedAt).getTime() : 0;
    const ageHours = updatedMs ? (Date.now() - updatedMs) / 3600000 : 9999;
    let kickerLabel = `ĐỀ CỬ #${rankIdx + 1}`;
    if (rankIdx === 0) kickerLabel = 'TOP 1 ĐỀ CỬ';
    else if (ageHours <= 72) kickerLabel = 'MỚI CẬP NHẬT';

    return { mainTitle, hook, synopsis: syn, genres, partsLabel, kickerLabel };
  }

  function getSpotlightCandidates() {
    if (!state.allFilms || state.allFilms.length === 0) return [];
    if (state._spotlightCache && state._spotlightCache.total === state.allFilms.length) {
      return state._spotlightCache.items;
    }

    const nowMs = Date.now();
    const scored = [];
    for (const f of state.allFilms) {
      if (!isValid3dFilmClient(f) || !f.thumbnailUrl || (f.totalDurationSec || 0) < 3600) continue;
      if ((f.totalViews || 0) < 20000) continue;
      const cleanT = cleanCoreTitleClient(f.title);
      if (!cleanT || cleanT.length < 6 || isGenericTitleSegmentClient(cleanT)) continue;

      const ts = f.updatedAt || f.publishedAt ? new Date(f.updatedAt || f.publishedAt).getTime() : 0;
      const ageDays = ts && !Number.isNaN(ts) ? Math.max(0, (nowMs - ts) / 86400000) : 180;
      const recencyBoost = ageDays <= 21 ? 1.85
        : (ageDays <= 60 ? 1.45
        : (ageDays <= 140 ? 1.05 : 0.7));
      const engagement = Math.log10((f.totalViews || 1) + 1) * 18
        + Math.log10((f.totalLikes || 0) * 15 + 1) * 8;
      const seriesBonus = f.partsCount >= 4 ? 10 : (f.partsCount >= 2 ? 6 : 0);
      const synopsisBonus = extractCleanPlotSummary(f).length >= 90 ? 45 : 0;
      const score = (engagement + seriesBonus + synopsisBonus) * recencyBoost;
      scored.push({ film: f, score });
    }

    scored.sort((a, b) => b.score - a.score);

    // Diversify: max 1 film per channel in pass 1, and prefer genre variety
    const picked = [];
    const seenChannels = new Set();
    const genreCounts = new Map();

    for (const item of scored) {
      const f = item.film;
      if (seenChannels.has(f.channelId)) continue;
      const primaryGenre = (Array.isArray(f.genres) && f.genres[0]) || f.genre || '';
      if (picked.length < 4 && (genreCounts.get(primaryGenre) || 0) >= 2 && scored.length > 12) continue;
      seenChannels.add(f.channelId);
      genreCounts.set(primaryGenre, (genreCounts.get(primaryGenre) || 0) + 1);
      picked.push(f);
      if (picked.length >= 6) break;
    }

    if (picked.length < 6) {
      for (const item of scored) {
        if (!picked.includes(item.film)) {
          picked.push(item.film);
          if (picked.length >= 6) break;
        }
      }
    }

    state._spotlightCache = { total: state.allFilms.length, items: picked };
    return picked;
  }

  function setSpotlightImgSrc(imgEl, posters) {
    if (!imgEl || !posters) return;
    imgEl.dataset.fbStep = 'maxres';
    imgEl.dataset.sdSrc = posters.sd || posters.hq;
    imgEl.dataset.hqSrc = posters.hq;
    if (!imgEl.dataset.fbBound) {
      imgEl.dataset.fbBound = '1';
      imgEl.addEventListener('error', () => handleSpotlightImgFallback(imgEl));
      imgEl.addEventListener('load', () => {
        if (imgEl.naturalWidth > 0 && imgEl.naturalWidth <= 160 && imgEl.dataset.fbStep !== 'done') {
          handleSpotlightImgFallback(imgEl);
        }
      });
    }
    imgEl.src = posters.maxres || posters.hq;
  }

  function crossFadeSpotlightBackdrop(posters) {
    if (!el.spotlightBgA || !el.spotlightBgB) return;
    const incoming = state._activeBgSlot === 'A' ? el.spotlightBgB : el.spotlightBgA;
    const outgoing = state._activeBgSlot === 'A' ? el.spotlightBgA : el.spotlightBgB;
    setSpotlightImgSrc(incoming, posters);
    incoming.classList.add('is-active');
    outgoing.classList.remove('is-active');
    state._activeBgSlot = state._activeBgSlot === 'A' ? 'B' : 'A';
  }

  function buildSpotlightStageBodyMarkup(film, idx) {
    const ed = formatSpotlightEditorial(film, idx);
    const primaryGenre = ed.genres[0] || 'Hoạt hình 3D';
    const timeAgo = film.recentUpdate?.timeAgo || (film.updatedAt ? formatRealTimeAgo(film.updatedAt) : '');

    const metaParts = [
      ed.partsLabel,
      film.totalDuration || '',
      film.totalViews > 0 ? `${formatCompactCountVi(film.totalViews)} lượt xem` : '',
      timeAgo ? `Cập nhật ${timeAgo}` : ''
    ].filter(Boolean);

    return `
      <div class="cinema-copy-col">
        <div class="cinema-kicker">
          <span class="cinema-kicker-accent">${escapeHtml(ed.kickerLabel)}</span>
          <span>·</span>
          <button type="button" class="spotlight-meta-link" data-spotlight-channel="${escapeHtml(film.channelId)}" title="Lọc phim kênh ${escapeHtml(film.channelName)}">
            ${escapeHtml(film.channelName)}
          </button>
          <span>·</span>
          <button type="button" class="spotlight-meta-link" data-spotlight-genre="${escapeHtml(primaryGenre)}" title="Lọc thể loại ${escapeHtml(primaryGenre)}">
            ${escapeHtml(primaryGenre)}
          </button>
        </div>

        <h1 class="cinema-title">${escapeHtml(ed.mainTitle)}</h1>
        ${ed.hook ? `<p class="cinema-hook">${escapeHtml(ed.hook)}</p>` : ''}
        <p class="cinema-story">${escapeHtml(ed.synopsis)}</p>
        <div class="cinema-meta-line">${escapeHtml(metaParts.join('  ·  '))}</div>

        <div class="cinema-actions">
          <button type="button" class="btn-cinema-play" data-spotlight-watch="${escapeHtml(film.id)}">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"></polygon></svg>
            <span>Xem Ngay</span>
          </button>
        </div>
      </div>
    `;
  }

  function syncSpotlightPauseBtn() {
    document.body.classList.toggle('is-hero-paused', state.isSpotlightPaused);
    if (!el.btnSpotlightPause) return;
    const lbl = state.isSpotlightPaused ? 'Tự chạy slides' : 'Tạm dừng slides';
    el.btnSpotlightPause.setAttribute('aria-label', lbl);
    el.btnSpotlightPause.title = lbl;
    el.btnSpotlightPause.innerHTML = state.isSpotlightPaused
      ? '<svg class="icon icon-xs" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"></polygon></svg>'
      : '<svg class="icon icon-xs" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"></rect><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"></rect></svg>';
  }

  function renderSpotlightHero() {
    if (!el.spotlightHero) return;
    const candidates = getSpotlightCandidates();
    if (candidates.length === 0) return;

    if (!state._spotlightPreloaded) {
      state._spotlightPreloaded = true;
      candidates.forEach(c => {
        const p = getHiResPosterUrls(c);
        if (p.maxres) { const img = new Image(); img.src = p.maxres; }
        if (p.hq) { const img2 = new Image(); img2.src = p.hq; }
      });
    }

    const idx = (state.spotlightIndex % candidates.length + candidates.length) % candidates.length;
    state.spotlightIndex = idx;
    const renderedSignature = candidates.map(f => f.id).join(',');

    if (el.spotlightHero.dataset.renderedKey === renderedSignature && el.spotlightHero.querySelector('.cinema-copy-col')) {
      updateSpotlightSlide(idx);
      return;
    }

    el.spotlightHero.dataset.renderedKey = renderedSignature;
    const activeFilm = candidates[idx];
    const activePosters = getHiResPosterUrls(activeFilm);

    crossFadeSpotlightBackdrop(activePosters);
    el.spotlightHero.innerHTML = buildSpotlightStageBodyMarkup(activeFilm, idx);

    if (el.spotlightTitleRail) {
      el.spotlightTitleRail.innerHTML = candidates.map((f, i) => {
        const ed = formatSpotlightEditorial(f, i);
        const act = i === idx;
        return `
          <button type="button" role="tab" aria-selected="${act ? 'true' : 'false'}" class="m3-title-btn ${act ? 'is-active' : ''}" data-spotlight-dot="${i}">
            <div class="m3-progress-line" aria-hidden="true">
              <div class="m3-progress-fill ${act ? 'is-animating' : ''}"></div>
            </div>
            <span class="m3-num">0${i + 1}</span>
            <span class="m3-name">${escapeHtml(ed.mainTitle)}</span>
          </button>
        `;
      }).join('');
    }

    syncSpotlightPauseBtn();
    syncActiveRailScroll(idx);
    startSpotlightTimer();
  }

  function syncActiveRailScroll(idx) {
    const rail = el.spotlightTitleRail;
    if (!rail || rail.scrollWidth <= rail.clientWidth + 4) return;
    const btn = rail.querySelector(`[data-spotlight-dot="${idx}"]`);
    if (!btn) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetLeft = Math.max(0, btn.offsetLeft - 12);
    rail.scrollTo({ left: targetLeft, behavior: reduced ? 'instant' : 'smooth' });
  }

  function updateSpotlightSlide(newIdx) {
    if (!el.spotlightHero) return;
    const candidates = getSpotlightCandidates();
    if (candidates.length === 0) return;

    const idx = (newIdx % candidates.length + candidates.length) % candidates.length;
    state.spotlightIndex = idx;
    const film = candidates[idx];
    const posters = getHiResPosterUrls(film);

    crossFadeSpotlightBackdrop(posters);
    el.spotlightHero.innerHTML = buildSpotlightStageBodyMarkup(film, idx);

    el.spotlightTitleRail?.querySelectorAll('.m3-title-btn').forEach((btn, i) => {
      const act = i === idx;
      btn.classList.toggle('is-active', act);
      btn.setAttribute('aria-selected', act ? 'true' : 'false');
      const fill = btn.querySelector('.m3-progress-fill');
      if (fill) {
        fill.classList.remove('is-animating');
        if (act) {
          void fill.offsetWidth;
          fill.classList.add('is-animating');
        }
      }
    });

    syncActiveRailScroll(idx);
    startSpotlightTimer();
  }

  function startSpotlightTimer() {
    if (state.spotlightTimer) clearInterval(state.spotlightTimer);
    if (state.isSpotlightPaused) return;
    state.spotlightTimer = setInterval(() => {
      if (el.spotlightHeroShell?.classList.contains('hidden')) return;
      if (window.scrollY > (state._cachedHeroHeight || window.innerHeight) * 0.7) return;
      const candidates = getSpotlightCandidates();
      if (candidates.length <= 1) return;
      updateSpotlightSlide(state.spotlightIndex + 1);
    }, 7000);
  }

  function pauseSpotlightTimer() {
    if (state.spotlightTimer) {
      clearInterval(state.spotlightTimer);
      state.spotlightTimer = null;
    }
  }

  function toggleSpotlightPause() {
    state.isSpotlightPaused = !state.isSpotlightPaused;
    syncSpotlightPauseBtn();
    if (state.isSpotlightPaused) pauseSpotlightTimer();
    else startSpotlightTimer();
  }

  // ---- URL deep-linking ----
  function syncUrl(patch) {
    if (!window.location.protocol.startsWith('http')) return;
    const params = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '' || v === 'all') params.delete(k); else params.set(k, v);
    });
    const qs = params.toString();
    try { history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '')); } catch (e) {}
  }

  function syncScopeToUrl() {
    syncUrl({
      tab: state.activeTab,
      channel: null,
      genre: null,
      channels: state.selectedChannels.size > 0 ? Array.from(state.selectedChannels).join(',') : null,
      genres: state.selectedGenres.size > 0 ? Array.from(state.selectedGenres).join(',') : null,
      gmode: state.selectedGenres.size >= 2 && state.genreMatchMode === 'and' ? 'and' : null,
      metric: state.activeTab === 'leaderboard' ? state.leaderboardMetric : null,
      range: state.activeTab === 'leaderboard' ? state.leaderboardTime : null
    });
  }

  function applyDeepLinkFromUrl() {
    const q = new URLSearchParams(window.location.search);
    const tab = q.get('tab');
    if (tab && document.querySelector(`.tab-pill[data-tab="${tab}"]`)) {
      state.activeTab = tab;
      el.categoryTabsGroup.querySelectorAll('.tab-pill').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    }

    const validEntryIds = new Set(state.channelEntries.map(e => e.id));
    const rawChannelsParam = q.get('channels') || q.get('channel') || '';
    if (rawChannelsParam && rawChannelsParam !== 'all') {
      rawChannelsParam.split(',').map(s => s.trim()).filter(Boolean).forEach(rawId => {
        const resolved = resolveChannelSelectionId(rawId);
        if (validEntryIds.has(resolved)) state.selectedChannels.add(resolved);
      });
    }

    const rawGenresParam = q.get('genres') || q.get('genre') || '';
    if (rawGenresParam && rawGenresParam !== 'all') {
      rawGenresParam.split(',').map(s => s.trim()).filter(Boolean).forEach(g => {
        if (state.genres.includes(g)) state.selectedGenres.add(g);
      });
    }

    if (q.get('gmode') === 'and') state.genreMatchMode = 'and';
    if (['views', 'likes'].includes(q.get('metric'))) {
      state.leaderboardMetric = q.get('metric');
      el.lbMetricGroup?.querySelectorAll('.lb-metric-btn').forEach(b => b.classList.toggle('active', b.dataset.metric === state.leaderboardMetric));
    }
    if (['day', 'week', 'month', 'year', 'all'].includes(q.get('range'))) {
      state.leaderboardTime = q.get('range');
      el.lbTimeGroup?.querySelectorAll('.lb-time-btn').forEach(b => b.classList.toggle('active', b.dataset.range === state.leaderboardTime));
    }
    syncAllScopeControls();
    syncMobileDockActive();
    state.urlReady = true;
    applyFiltersAndRender(1);
    const filmId = q.get('film');
    const film = filmId && state.allFilms.find(f => f.id === filmId);
    if (film) {
      const epPos = Math.max(0, (parseInt(q.get('ep'), 10) || 1) - 1);
      openPlayer(film, { partPos: Math.min(epPos, film.parts.length - 1) });
    } else if (state.selectedChannels.size > 0 || state.selectedGenres.size > 0 || state.activeTab !== 'all') {
      scrollToCinemaZone('browse', { instant: true });
    }
  }

  function addToHistory(filmId) {
    state.history = [filmId, ...state.history.filter(id => id !== filmId)].slice(0, 50);
    try {
      localStorage.setItem('homnayxemgi_hist', JSON.stringify(state.history));
    } catch (e) {}
    updateBadgeCounts();
  }

  function toggleFavorite(filmId) {
    const film = state.allFilms.find(f => f.id === filmId);

    if (state.favorites.has(filmId)) {
      state.favorites.delete(filmId);
      showToast('Đã hủy theo dõi phim');
      // Remove any notification for this film
      state.notifications = state.notifications.filter(n => n.filmId !== filmId);
      saveNotifications();
      renderNotificationList();
      updateNotificationBadge();
    } else {
      state.favorites.add(filmId);
      showToast(`Đã theo dõi: ${film ? film.title : 'Phim'} • Sẽ báo khi có tập mới!`);

      // If this film has a recent 24h update, create a notification immediately!
      if (film && film.recentUpdate) {
        const notifId = `notif_${film.id}_${film.recentUpdate.partIndex}`;
        if (!state.notifications.some(n => n.id === notifId)) {
          state.notifications.unshift({
            id: notifId,
            filmId: film.id,
            filmTitle: film.title,
            partIndex: film.recentUpdate.partIndex,
            partLabel: film.recentUpdate.partLabel,
            videoId: film.recentUpdate.videoId || null,
            channelName: film.channelName,
            thumbnailUrl: film.thumbnailUrl,
            timeAgo: film.recentUpdate.timeAgo,
            timestamp: film.recentUpdate.timestamp,
            isRead: false
          });
          saveNotifications();
          renderNotificationList();
          updateNotificationBadge();
        }
      }
    }

    try {
      localStorage.setItem('homnayxemgi_favs', JSON.stringify(Array.from(state.favorites)));
    } catch (e) {}
    updateBadgeCounts();

    // Update active button on card if visible
    const favBtns = document.querySelectorAll(`.card-fav-btn[data-fav-id="${filmId}"]`);
    favBtns.forEach(btn => {
      const isFav = state.favorites.has(filmId);
      btn.classList.toggle('active', isFav);
      btn.title = isFav ? 'Đang theo dõi (Bấm để hủy)' : 'Theo dõi phim này để nhận thông báo tập mới';
      btn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
    });

    // Sync Spotlight favorite button if currently showing this film
    document.querySelectorAll(`.btn-spotlight-fav[data-spotlight-fav="${filmId}"]`).forEach(btn => {
      const isFav = state.favorites.has(filmId);
      btn.classList.toggle('active', isFav);
      btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      const lbl = btn.querySelector('span');
      if (lbl) lbl.textContent = isFav ? 'Đã Lưu' : 'Lưu Phim';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
    });

    if (state.activeTab === 'favorites') {
      applyFiltersAndRender(state.currentPage);
    }
    syncRandomBookmarkBtn();
  }

  function syncRandomBookmarkBtn() {
    if (!el.btnRandomBookmark || !state.randomCandidate) return;
    const isFav = state.favorites.has(state.randomCandidate.id);
    el.btnRandomBookmark.classList.toggle('active', isFav);
    const labelEl = el.btnRandomBookmark.querySelector('span');
    if (labelEl) labelEl.textContent = isFav ? 'Đã lưu' : 'Lưu';
    const svg = el.btnRandomBookmark.querySelector('svg');
    if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
  }

  // -------------------------------------------------------------------------
  // RANDOMIZER SPOTLIGHT MODAL (GỢI Ý PHIM)
  // -------------------------------------------------------------------------
  function openRandomizer(forcedFilm) {
    const forced = forcedFilm && forcedFilm.parts ? forcedFilm : null;
    // Respect current multi-select channel/genre filter if active, otherwise pull high-quality 3D films >= 2h
    let scoped = state.allFilms.filter(f =>
      filmMatchesSelectedChannels(f) &&
      filmMatchesSelectedGenres(f)
    );
    if (scoped.length === 0) scoped = state.allFilms;
    const longPool = scoped.filter(f => f.totalDurationSec >= 7200);
    let candidates = longPool.length > 0 ? longPool : scoped;
    if (candidates.length > 1 && state.randomCandidate) {
      candidates = candidates.filter(f => f.id !== state.randomCandidate.id);
    }
    const pick = forced || candidates[Math.floor(Math.random() * candidates.length)];
    if (!pick) return;

    state.randomCandidate = pick;

    if (el.randomThumbImg) {
      const posters = getHiResPosterUrls(pick);
      el.randomThumbImg.dataset.hqFallback = posters.hq;
      el.randomThumbImg.onerror = function() {
        if (this.src !== posters.hq) this.src = posters.hq;
      };
      el.randomThumbImg.onload = function() {
        if (this.naturalWidth > 0 && this.naturalWidth <= 160 && this.src !== posters.hq) {
          this.src = posters.hq;
        }
      };
      el.randomThumbImg.src = posters.maxres || posters.hq || '';
      el.randomThumbImg.alt = pick.title;
    }
    if (el.randomPartsBadge) {
      el.randomPartsBadge.textContent = pick.partsCount > 1 ? `${pick.partsCount} Phần` : 'Trọn bộ 1 tập';
    }
    if (el.randomDurationBadge) {
      const span = el.randomDurationBadge.querySelector('span');
      if (span) span.textContent = pick.totalDuration || 'Đang cập nhật';
    }
    if (el.randomTimeBadge) {
      const relTime = pick.updatedAt ? formatRealTimeAgo(pick.updatedAt) : '';
      el.randomTimeBadge.textContent = relTime;
      el.randomTimeBadge.classList.toggle('hidden', !relTime);
    }
    if (el.randomFilmTitle) el.randomFilmTitle.textContent = pick.title;

    if (el.randomTagsRow) {
      const genrePills = (Array.isArray(pick.genres) && pick.genres.length > 0 ? pick.genres : [pick.genre])
        .map(g => `<span class="random-tag-pill">${escapeHtml(g)}</span>`)
        .join('');
      const dateStr = pick.updatedAt ? formatRealTimeAgo(pick.updatedAt) : '';
      el.randomTagsRow.innerHTML = `
        <span class="random-tag-pill tag-channel">${escapeHtml(pick.channelName)}</span>
        ${genrePills}
        ${dateStr ? `<span class="random-tag-pill tag-date">Cập nhật ${escapeHtml(dateStr)}</span>` : ''}
      `;
    }

    if (el.randomStatDuration) el.randomStatDuration.textContent = pick.totalDuration || 'Đang cập nhật';
    if (el.randomStatParts) el.randomStatParts.textContent = pick.partsCount > 1 ? `${pick.partsCount} phần` : 'Bản Full';
    if (el.randomStatViews) {
      el.randomStatViews.textContent = formatCompactCountVi(pick.totalViews || 0);
      el.randomStatViews.title = `${formatExactCountVi(pick.totalViews || 0)} lượt xem`;
    }
    if (el.randomStatLikes) {
      el.randomStatLikes.textContent = formatCompactCountVi(pick.totalLikes || 0);
      el.randomStatLikes.title = `${formatExactCountVi(pick.totalLikes || 0)} lượt thích`;
    }

    if (el.randomFilmSynopsis) {
      el.randomFilmSynopsis.textContent = formatSpotlightEditorial(pick).synopsis;
    }

    if (el.btnRandomWatchNow) {
      const btnText = el.btnRandomWatchNow.querySelector('span');
      if (btnText) btnText.textContent = pick.partsCount > 1 ? 'Xem Ngay Phần 1' : 'Xem Ngay Phim Này';
    }

    syncRandomBookmarkBtn();
    el.randomModal?.classList.add('active');
  }

  function closeRandomizer() {
    el.randomModal?.classList.remove('active');
    state.randomCandidate = null;
  }

  // -------------------------------------------------------------------------
  // EVENT LISTENERS
  // -------------------------------------------------------------------------
  function setupEventListeners() {
    // Notification Bell Click -> Toggle Popover
    el.btnNotifOpen?.addEventListener('click', e => {
      e.stopPropagation();
      el.notificationPopover?.classList.toggle('active');
    });

    // Mark All Read Button
    el.btnMarkAllRead?.addEventListener('click', e => {
      e.stopPropagation();
      markAllNotificationsAsRead();
    });

    // Notification Item Click -> Play updated episode!
    el.notifListContainer?.addEventListener('click', e => {
      const item = e.target.closest('.notif-item');
      if (!item) return;

      const notifId = item.dataset.notifId;
      const filmId = item.dataset.filmId;
      const partIndex = parseInt(item.dataset.partIndex, 10) || 1;
      const videoId = item.dataset.videoId || null;

      markNotificationAsRead(notifId);
      el.notificationPopover?.classList.remove('active');

      const film = state.allFilms.find(f => f.id === filmId);
      if (film) {
        openPlayer(film, { videoId, partNumber: partIndex });
      }
    });

    // Click Outside Notification Popover -> Close
    document.addEventListener('click', e => {
      if (el.notificationPopover?.classList.contains('active')) {
        if (!el.notifWrapper?.contains(e.target)) {
          el.notificationPopover.classList.remove('active');
        }
      }
    });

    // Search Input debounce
    let searchTimer = null;
    el.searchInput?.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      if (el.searchClearBtn) {
        el.searchClearBtn.classList.toggle('visible', !!state.searchQuery);
      }
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        applyFiltersAndRender(1);
        if (state.searchQuery.trim() && window.innerWidth <= 960 && el.feedCountSummary) {
          const top = el.feedCountSummary.getBoundingClientRect().top + window.scrollY - 140;
          if (window.scrollY < top) window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 160);
    });

    el.searchClearBtn?.addEventListener('click', () => {
      if (el.searchInput) el.searchInput.value = '';
      state.searchQuery = '';
      el.searchClearBtn.classList.remove('visible');
      applyFiltersAndRender(1);
      el.searchInput?.focus();
    });

    // Feed Tabs
    el.categoryTabsGroup?.addEventListener('click', e => {
      const tabBtn = e.target.closest('.tab-pill');
      if (!tabBtn) return;
      el.categoryTabsGroup.querySelectorAll('.tab-pill').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      state.activeTab = tabBtn.dataset.tab;
      if (state.activeTab === 'hot' && el.sortBySelect) {
        state.sortBy = 'duration';
        el.sortBySelect.value = 'duration';
      }
      syncMobileDockActive();
      applyFiltersAndRender(1);
    });

    // Inline Sort & Time Range Bar (within any Channel / Category)
    el.sortBySelect?.addEventListener('change', e => {
      state.sortBy = e.target.value || 'recent';
      applyFiltersAndRender(1);
    });

    el.timeRangeSelect?.addEventListener('change', e => {
      state.timeRange = e.target.value || 'all';
      applyFiltersAndRender(1);
    });

    el.activeScopeBadges?.addEventListener('click', e => {
      const rmCh = e.target.closest('[data-remove-channel]');
      if (rmCh) {
        state.selectedChannels.delete(rmCh.dataset.removeChannel);
        renderChannelDrawerList();
        syncAllScopeControls();
        applyFiltersAndRender(1);
        return;
      }
      const rmGenre = e.target.closest('[data-remove-genre]');
      if (rmGenre) {
        state.selectedGenres.delete(rmGenre.dataset.removeGenre);
        syncAllScopeControls();
        applyFiltersAndRender(1);
        return;
      }
      if (e.target.closest('[data-clear-all-scopes]')) {
        state.selectedChannels.clear();
        state.selectedGenres.clear();
        state.timeRange = 'all';
        state.durationFilter = 'all';
        if (el.timeRangeSelect) el.timeRangeSelect.value = 'all';
        if (el.durationSelect) el.durationSelect.value = 'all';
        renderChannelDrawerList();
        syncAllScopeControls();
        applyFiltersAndRender(1);
        return;
      }
      const btn = e.target.closest('[data-clear-scope]');
      if (!btn) return;
      const scope = btn.dataset.clearScope;
      if (scope === 'time') {
        state.timeRange = 'all';
        if (el.timeRangeSelect) el.timeRangeSelect.value = 'all';
      }
      if (scope === 'duration') {
        state.durationFilter = 'all';
        if (el.durationSelect) el.durationSelect.value = 'all';
      }
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Leaderboard Controls
    el.lbMetricGroup?.addEventListener('click', e => {
      const btn = e.target.closest('.lb-metric-btn');
      if (!btn || !btn.dataset.metric) return;
      state.leaderboardMetric = btn.dataset.metric;
      el.lbMetricGroup.querySelectorAll('.lb-metric-btn').forEach(b => b.classList.toggle('active', b === btn));
      applyFiltersAndRender(1);
    });

    el.lbTimeGroup?.addEventListener('click', e => {
      const btn = e.target.closest('.lb-time-btn');
      if (!btn || !btn.dataset.range) return;
      state.leaderboardTime = btn.dataset.range;
      el.lbTimeGroup.querySelectorAll('.lb-time-btn').forEach(b => b.classList.toggle('active', b === btn));
      applyFiltersAndRender(1);
    });

    el.leaderboardShowcase?.addEventListener('click', e => {
      const quickTimeBtn = e.target.closest('[data-lb-quick-time]');
      if (quickTimeBtn) {
        state.leaderboardTime = quickTimeBtn.dataset.lbQuickTime;
        el.lbTimeGroup?.querySelectorAll('.lb-time-btn').forEach(b => b.classList.toggle('active', b.dataset.range === state.leaderboardTime));
        applyFiltersAndRender(1);
        return;
      }
      const clearScopeBtn = e.target.closest('[data-lb-clear-scope]');
      if (clearScopeBtn) {
        state.selectedChannels.clear();
        state.selectedGenres.clear();
        renderChannelDrawerList();
        syncAllScopeControls();
        applyFiltersAndRender(1);
        return;
      }
    });

    // Genre multi-select mode toggle (Desktop Sidebar & Mobile Drawer)
    document.addEventListener('click', e => {
      const modeBtn = e.target.closest('[data-genre-mode]');
      if (!modeBtn) return;
      state.genreMatchMode = modeBtn.dataset.genreMode === 'and' ? 'and' : 'or';
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Sidebar Genre multi-select click
    el.genreNavList?.addEventListener('click', e => {
      const btn = e.target.closest('.sidebar-menu-btn');
      if (!btn) return;
      toggleSelectedGenre(btn.dataset.genre);
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Mobile Chips Genre multi-select click
    el.mobileChipsRow?.addEventListener('click', e => {
      const chip = e.target.closest('.mobile-chip-btn');
      if (!chip) return;
      toggleSelectedGenre(chip.dataset.genre);
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Clear all selected channels / genres inside Popover Drawers
    el.btnClearChannels?.addEventListener('click', () => {
      state.selectedChannels.clear();
      renderChannelDrawerList();
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });
    el.btnClearGenresDrawer?.addEventListener('click', () => {
      state.selectedGenres.clear();
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Studio Drawer search + multi-select toggle (stays open so user can pick multiple!)
    el.channelSearchInput?.addEventListener('input', renderChannelDrawerList);

    el.channelNavList?.addEventListener('click', e => {
      const btn = e.target.closest('.sidebar-menu-btn');
      if (!btn) return;
      toggleSelectedChannel(btn.dataset.channel);
      renderChannelDrawerList();
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Sidebar Duration Chips click
    el.sidebarDurationChips?.addEventListener('click', e => {
      const btn = e.target.closest('[data-duration]');
      if (!btn) return;
      state.durationFilter = btn.dataset.duration || 'all';
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Mobile/Leaderboard Filter Drawer delegated clicks (multi-select stays open!)
    el.mobileFilterBody?.addEventListener('click', e => {
      const gBtn = e.target.closest('[data-genre]');
      if (gBtn) {
        toggleSelectedGenre(gBtn.dataset.genre);
        syncAllScopeControls();
        applyFiltersAndRender(1);
        return;
      }
      const dBtn = e.target.closest('[data-duration]');
      if (dBtn) {
        state.durationFilter = dBtn.dataset.duration || 'all';
        syncAllScopeControls();
        applyFiltersAndRender(1);
      }
    });

    // Brand Home reset
    el.brandHomeBtn?.addEventListener('click', e => {
      e.preventDefault();
      state.activeTab = 'all';
      state.selectedGenres.clear();
      state.selectedChannels.clear();
      state.durationFilter = 'all';
      state.timeRange = 'all';
      state.searchQuery = '';
      if (el.searchInput) el.searchInput.value = '';
      if (el.timeRangeSelect) el.timeRangeSelect.value = 'all';
      el.categoryTabsGroup?.querySelectorAll('.tab-pill').forEach(b => b.classList.toggle('active', b.dataset.tab === 'all'));
      renderChannelDrawerList();
      syncAllScopeControls();
      syncMobileDockActive();
      applyFiltersAndRender(1);
      scrollToCinemaZone('hero');
    });

    el.footerHomeBtn?.addEventListener('click', e => {
      e.preventDefault();
      scrollToCinemaZone('hero');
    });

    // Film Card & Chart Row clicks
    el.cardsWidescreenGrid?.addEventListener('click', e => {
      const favBtn = e.target.closest('.card-fav-btn');
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.favId);
        return;
      }

      const infoBtn = e.target.closest('.card-info-btn');
      if (infoBtn) {
        e.stopPropagation();
        const f = state.allFilms.find(x => x.id === infoBtn.dataset.infoId);
        if (f) openRandomizer(f);
        return;
      }

      const card = e.target.closest('.film-card, .chart-row-card');
      if (card) {
        const filmId = card.dataset.filmId;
        const film = state.allFilms.find(f => f.id === filmId);
        if (film) {
          const prog = state.progress[film.id];
          const resumePos = prog && Number.isInteger(prog.pos) && film.parts[prog.pos] ? prog.pos : 0;
          openPlayer(film, { partPos: resumePos, videoId: film.parts[resumePos]?.videoId });
        }
      }
    });

    // Continue shelf + related films + modal toolbar
    el.continueRow?.addEventListener('click', e => {
      const c = e.target.closest('[data-continue-film]');
      if (!c) return;
      const f = state.allFilms.find(x => x.id === c.dataset.continueFilm);
      const p = f && state.progress[f.id];
      if (f) openPlayer(f, { videoId: p?.videoId, partPos: p?.pos });
    });
    el.btnClearContinue?.addEventListener('click', () => {
      state.progress = {};
      try { localStorage.removeItem('homnayxemgi_progress'); } catch (err) {}
      renderContinueShelf();
      showToast('Đã xóa lịch sử xem dở');
    });
    el.relatedRow?.addEventListener('click', e => {
      const c = e.target.closest('[data-related-film]');
      const f = c && state.allFilms.find(x => x.id === c.dataset.relatedFilm);
      if (f) openPlayer(f, { partPos: 0 });
    });
    el.modalTags?.addEventListener('click', e => {
      const chBtn = e.target.closest('[data-scope-channel]');
      const gBtn = e.target.closest('[data-scope-genre]');
      if (!chBtn && !gBtn) return;
      if (chBtn) {
        state.selectedChannels = new Set([resolveChannelSelectionId(chBtn.dataset.scopeChannel)]);
      }
      if (gBtn) {
        state.selectedGenres = new Set([gBtn.dataset.scopeGenre]);
      }
      closePlayer();
      renderChannelDrawerList();
      syncAllScopeControls();
      applyFiltersAndRender(1);
      scrollToCinemaZone('browse');
    });
    el.btnPrevEp?.addEventListener('click', () => stepEpisode(-1));
    el.btnNextEp?.addEventListener('click', () => stepEpisode(1));
    el.btnToggleAutoNext?.addEventListener('click', toggleAutoNext);
    el.btnTheaterWide?.addEventListener('click', toggleTheaterWide);
    el.btnAmbientDim?.addEventListener('click', toggleAmbientDim);
    el.btnAmbientUndim?.addEventListener('click', toggleAmbientDim);
    el.btnAutoNextCancel?.addEventListener('click', cancelAutoNextCountdown);
    el.btnAutoNextNow?.addEventListener('click', executeAutoNextImmediately);

    // QR Code Modal triggers
    el.btnQrCode?.addEventListener('click', openQrModal);
    el.btnCloseQrModal?.addEventListener('click', closeQrModal);
    el.qrBackdrop?.addEventListener('click', closeQrModal);
    el.btnCopyQrUrl?.addEventListener('click', copyQrUrl);

    // Spotlight Hero (PA C MUBI Editorial, Title Rail, Pause, Scroll Cue & Swipe)
    el.btnHeroExplore?.addEventListener('click', () => scrollToCinemaZone('browse'));
    el.btnSpotlightPause?.addEventListener('click', toggleSpotlightPause);
    el.spotlightTitleRail?.addEventListener('click', e => {
      const dotBtn = e.target.closest('[data-spotlight-dot]');
      if (!dotBtn) return;
      const targetIdx = parseInt(dotBtn.dataset.spotlightDot, 10) || 0;
      updateSpotlightSlide(targetIdx);
    });

    el.spotlightHero?.addEventListener('click', e => {
      const watchBtn = e.target.closest('[data-spotlight-watch]');
      if (watchBtn) {
        const f = state.allFilms.find(x => x.id === watchBtn.dataset.spotlightWatch);
        if (f) {
          const prog = state.progress[f.id];
          const resumePos = prog && Number.isInteger(prog.pos) && f.parts[prog.pos] ? prog.pos : 0;
          openPlayer(f, { partPos: resumePos, videoId: f.parts[resumePos]?.videoId });
        }
        return;
      }
      const chBtn = e.target.closest('[data-spotlight-channel]');
      if (chBtn) {
        const raw = chBtn.dataset.spotlightChannel;
        state.selectedChannels = raw && raw !== 'all' ? new Set([resolveChannelSelectionId(raw)]) : new Set();
        state.selectedGenres.clear();
        state.activeTab = 'all';
        renderChannelDrawerList();
        syncAllScopeControls();
        applyFiltersAndRender(1);
        scrollToCinemaZone('browse');
        return;
      }
      const genreBtn = e.target.closest('[data-spotlight-genre]');
      if (genreBtn) {
        const rawG = genreBtn.dataset.spotlightGenre;
        state.selectedGenres = rawG && rawG !== 'all' ? new Set([rawG]) : new Set();
        state.activeTab = 'all';
        syncAllScopeControls();
        applyFiltersAndRender(1);
        scrollToCinemaZone('browse');
      }
    });

    el.spotlightHero?.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateSpotlightSlide(state.spotlightIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateSpotlightSlide(state.spotlightIndex + 1);
      }
    });

    let spotlightTouchX = null;
    el.spotlightHeroShell?.addEventListener('touchstart', e => {
      if (e.target.closest('#spotlightTitleRail')) {
        spotlightTouchX = null;
        return;
      }
      spotlightTouchX = e.changedTouches?.[0]?.clientX ?? null;
    }, { passive: true });
    el.spotlightHeroShell?.addEventListener('touchend', e => {
      if (spotlightTouchX === null) return;
      const endX = e.changedTouches?.[0]?.clientX;
      const dx = typeof endX === 'number' ? endX - spotlightTouchX : 0;
      spotlightTouchX = null;
      if (Math.abs(dx) >= 48) {
        updateSpotlightSlide(state.spotlightIndex + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });

    // YouTube iframe postMessage listener for playback resume & auto-next
    window.addEventListener('message', evt => {
      if (!state.currentPlayingFilm) return;
      try {
        const data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
        if (!data) return;
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number' && data.info.currentTime > 5) {
            const film = state.currentPlayingFilm;
            if (film && state.progress[film.id]) {
              state.progress[film.id].timeSec = Math.floor(data.info.currentTime);
              const now = Date.now();
              if (!state._lastProgSync || now - state._lastProgSync > 6000) {
                state._lastProgSync = now;
                try { localStorage.setItem('homnayxemgi_progress', JSON.stringify(state.progress)); } catch (err) {}
              }
            }
          }
          if (data.info.playerState === 0) { // 0 = YT.PlayerState.ENDED
            handleEpisodeEnded();
          }
        }
      } catch (err) {}
    });

    el.youtubeIframe?.addEventListener('load', () => {
      try {
        el.youtubeIframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
      } catch (err) {}
    });

    el.btnShareFilm?.addEventListener('click', async () => {
      const url = window.location.href;
      try {
        if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
          await navigator.share({ title: state.currentPlayingFilm?.title || 'Hôm Nay Xem Gì', url });
        } else {
          await navigator.clipboard.writeText(url);
          showToast('Đã sao chép link phim');
        }
      } catch (err) {
        showToast('Không thể sao chép, hãy copy link trên thanh địa chỉ');
      }
    });
    el.durationSelect?.addEventListener('change', e => {
      state.durationFilter = e.target.value || 'all';
      applyFiltersAndRender(1);
    });

    // Pagination clicks (scrolls cleanly to catalog top, never back to Hero)
    el.paginationBar?.addEventListener('click', e => {
      const btn = e.target.closest('.page-num-btn');
      if (btn && btn.dataset.page) {
        applyFiltersAndRender(parseInt(btn.dataset.page, 10));
        if (el.catalogSection) {
          const catTop = Math.max(0, el.catalogSection.getBoundingClientRect().top + window.scrollY - 74);
          window.scrollTo({ top: catTop, behavior: 'smooth' });
        }
      }
    });

    // Dice Randomizer buttons
    el.btnDiceRandom?.addEventListener('click', openRandomizer);
    document.getElementById('dockDiceBtn')?.addEventListener('click', openRandomizer);

    // Modal Bookmark button
    el.btnModalBookmark?.addEventListener('click', () => {
      if (state.currentPlayingFilm) {
        toggleFavorite(state.currentPlayingFilm.id);
      }
    });

    // Episode Matrix clicks
    el.modalEpMatrix?.addEventListener('click', e => {
      const epBtn = e.target.closest('.ep-capsule-btn');
      if (epBtn && state.currentPlayingFilm) {
        const epPos = parseInt(epBtn.dataset.epPos, 10);
        const epIndex = parseInt(epBtn.dataset.epIndex, 10);
        const videoId = epBtn.dataset.videoId || null;
        openPlayer(state.currentPlayingFilm, {
          partPos: Number.isNaN(epPos) ? undefined : epPos,
          videoId,
          partNumber: Number.isNaN(epIndex) ? undefined : epIndex
        });
      }
    });

    // Theater Modal close
    el.modalCloseBtn?.addEventListener('click', closePlayer);
    el.modalBackdrop?.addEventListener('click', closePlayer);

    // Random Modal actions
    el.randomBackdrop?.addEventListener('click', closeRandomizer);
    el.btnCloseRandom?.addEventListener('click', closeRandomizer);
    el.btnRandomRollAgain?.addEventListener('click', openRandomizer);
    el.btnRandomBookmark?.addEventListener('click', () => {
      if (state.randomCandidate) toggleFavorite(state.randomCandidate.id);
    });
    el.btnRandomWatchNow?.addEventListener('click', () => {
      if (state.randomCandidate) {
        const pick = state.randomCandidate;
        closeRandomizer();
        openPlayer(pick, { partPos: 0, videoId: pick.parts[0]?.videoId });
      }
    });

    // Header Favorite Button
    el.btnFavoritesOpen?.addEventListener('click', () => {
      const favTab = document.querySelector('.tab-pill[data-tab="favorites"]');
      if (favTab) favTab.click();
    });

    // Mobile Bottom Bar clicks
    el.mobileBottomBar?.addEventListener('click', e => {
      const btn = e.target.closest('.dock-item');
      if (!btn || btn.id === 'dockDiceBtn') return;
      const targetTab = btn.dataset.dock;
      const feedTab = document.querySelector(`.tab-pill[data-tab="${targetTab}"]`);
      if (feedTab) feedTab.click();
      syncMobileDockActive();
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      const activeTag = document.activeElement?.tagName;
      const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      if (e.key === '/' && document.activeElement !== el.searchInput && !isTyping) {
        e.preventDefault();
        if (window.scrollY < (state._cachedHeroHeight || window.innerHeight) * 0.6) {
          scrollToCinemaZone('browse');
          const focusSearch = () => {
            if (el.siteHeader) el.siteHeader.inert = false;
            el.searchInput?.focus();
          };
          if ('onscrollend' in window) {
            window.addEventListener('scrollend', focusSearch, { once: true });
          }
          setTimeout(focusSearch, 520);
        } else {
          el.searchInput?.focus();
        }
      } else if (e.key === 'Escape') {
        if (el.theaterModal?.classList.contains('active')) closePlayer();
        if (el.randomModal?.classList.contains('active')) closeRandomizer();
        if (el.notificationPopover?.classList.contains('active')) el.notificationPopover.classList.remove('active');
      } else if (!isTyping && !isOverlayOpen()) {
        const boundary = state._cachedHeroHeight || window.innerHeight || 900;
        if ((e.key === 'ArrowDown' || e.key === 'PageDown') && window.scrollY < 16) {
          e.preventDefault();
          scrollToCinemaZone('browse');
        } else if ((e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') && window.scrollY <= boundary + 20 && window.scrollY > 4) {
          e.preventDefault();
          scrollToCinemaZone('hero');
        } else if (window.scrollY < boundary * 0.5 && e.key === 'ArrowLeft') {
          e.preventDefault();
          updateSpotlightSlide(state.spotlightIndex - 1);
        } else if (window.scrollY < boundary * 0.5 && e.key === 'ArrowRight') {
          e.preventDefault();
          updateSpotlightSlide(state.spotlightIndex + 1);
        }
      }
    });
  }

  function syncMobileDockActive() {
    el.mobileBottomBar?.querySelectorAll('.dock-item[data-dock]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dock === state.activeTab);
    });
  }

  function updateMobileChipActive() {
    const allG = state.selectedGenres.size === 0;
    el.mobileChipsRow?.querySelectorAll('.mobile-chip-btn').forEach(c => {
      const active = c.dataset.genre === 'all' ? allG : state.selectedGenres.has(c.dataset.genre);
      c.classList.toggle('active', active);
    });
  }

  function syncAllScopeControls() {
    updateMobileChipActive();
    updateSidebarGenreActive();
    updateSidebarChannelActive();
    document.querySelectorAll('[data-duration]').forEach(b => {
      b.classList.toggle('active', b.dataset.duration === state.durationFilter);
    });
    if (el.durationSelect) el.durationSelect.value = state.durationFilter;

    const chCompact = getChannelSummaryLabel('compact');
    const chFull = getChannelSummaryLabel('full');
    const genFull = getGenreSummaryLabel();

    if (el.channelLabel) el.channelLabel.textContent = chCompact;
    document.querySelectorAll('#sidebarStudioLabel').forEach(node => {
      node.textContent = chFull;
    });
    if (el.lbChannelBtnLabel) el.lbChannelBtnLabel.textContent = chFull;
    if (el.lbGenreBtnLabel) el.lbGenreBtnLabel.textContent = genFull;
    if (el.btnLbChannels) el.btnLbChannels.classList.toggle('is-filtered', state.selectedChannels.size > 0);
    if (el.btnLbGenres) el.btnLbGenres.classList.toggle('is-filtered', state.selectedGenres.size > 0);

    if (el.channelSelectionSummary) {
      el.channelSelectionSummary.textContent = state.selectedChannels.size > 0
        ? `Đang chọn ${state.selectedChannels.size} mục studio`
        : 'Đang hiện: Tất cả kênh';
    }
    if (el.btnClearChannels) {
      el.btnClearChannels.classList.toggle('hidden', state.selectedChannels.size === 0);
    }
    if (el.mobileFilterSummary) {
      el.mobileFilterSummary.textContent = state.selectedGenres.size > 0
        ? `Đang chọn ${state.selectedGenres.size} thể loại`
        : 'Tích chọn nhiều thể loại cùng lúc';
    }
    if (el.btnClearGenresDrawer) {
      el.btnClearGenresDrawer.classList.toggle('hidden', state.selectedGenres.size === 0);
    }

    const showModeToggle = state.selectedGenres.size >= 2;
    document.querySelectorAll('.genre-mode-toggle').forEach(t => {
      t.classList.toggle('hidden', !showModeToggle);
    });
    document.querySelectorAll('[data-genre-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.genreMode === state.genreMatchMode);
    });
  }

  function updateSidebarChannelActive() {
    const allC = state.selectedChannels.size === 0;
    el.channelNavList?.querySelectorAll('.sidebar-menu-btn').forEach(b => {
      const act = b.dataset.channel === 'all' ? allC : state.selectedChannels.has(b.dataset.channel);
      b.classList.toggle('active', act);
    });
  }

  function updateSidebarGenreActive() {
    const allG = state.selectedGenres.size === 0;
    document.querySelectorAll('[data-genre]').forEach(b => {
      const act = b.dataset.genre === 'all' ? allG : state.selectedGenres.has(b.dataset.genre);
      b.classList.toggle('active', act);
    });
  }

  // -------------------------------------------------------------------------
  // STANDALONE QR CODE GENERATOR (PURE JS SVG GENERATOR)
  // -------------------------------------------------------------------------
  var QRPolynomial = function(num, shift) {
    var offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    for (var j = num.length - offset; j < this.num.length; j++) this.num[j] = 0;
  };
  QRPolynomial.prototype = {
    get: function(index) { return this.num[index]; },
    getLength: function() { return this.num.length; },
    multiply: function(e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < this.getLength(); i++) {
        for (var j = 0; j < e.getLength(); j++) num[i + j] ^= QRMath.gmult(this.get(i), e.get(j));
      }
      return new QRPolynomial(num, 0);
    },
    mod: function(e) {
      if (this.getLength() - e.getLength() < 0) return this;
      var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      var num = new Array(this.getLength());
      for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (var j = 0; j < e.getLength(); j++) num[j] ^= QRMath.gexp(QRMath.glog(e.get(j)) + ratio);
      return new QRPolynomial(num, 0).mod(e);
    }
  };

  var QRMath = {
    glog: function(n) { if (n < 1) return 0; return QRMath.LOG_TABLE[n]; },
    gexp: function(n) { while (n < 0) n += 255; while (n >= 256) n -= 255; return QRMath.EXP_TABLE[n]; },
    gmult: function(a, b) { if (a === 0 || b === 0) return 0; return QRMath.gexp(QRMath.glog(a) + QRMath.glog(b)); },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };
  for (var i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
  for (var i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
  for (var i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

  var QRBitBuffer = function() { this.buffer = []; this.length = 0; };
  QRBitBuffer.prototype = {
    put: function(num, length) { for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1); },
    putBit: function(bit) {
      var bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      this.length++;
    }
  };

  function toUtf8ByteArray(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) { bytes.push(0xc0 | (code >> 6)); bytes.push(0x80 | (code & 0x3f)); }
      else { bytes.push(0xe0 | (code >> 12)); bytes.push(0x80 | ((code >> 6) & 0x3f)); bytes.push(0x80 | (code & 0x3f)); }
    }
    return bytes;
  }

  var RS_BLOCK_TABLE = [
    [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
    [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
    [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
    [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
    [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
    [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
    [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
    [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
    [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]
  ];

  var QRUtil = {
    PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54]],
    G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    getBCHTypeInfo: function(data) {
      var d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
      return ((data << 10) | d) ^ QRUtil.G15_MASK;
    },
    getBCHDigit: function(data) { var digit = 0; while (data !== 0) { digit++; data >>>= 1; } return digit; },
    getErrorCorrectPolynomial: function(errorCorrectLength) {
      var a = new QRPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i++) a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      return a;
    },
    getLostPoint: function(qrCode) {
      var moduleCount = qrCode.moduleCount, lostPoint = 0;
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount; col++) {
          var sameCount = 0, dark = qrCode.isDark(row, col);
          for (var r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) continue;
            for (var c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) continue;
              if (r === 0 && c === 0) continue;
              if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
            }
          }
          if (sameCount > 5) lostPoint += (3 + sameCount - 5);
        }
      }
      return lostPoint;
    }
  };

  var QRCodeModel = function(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataList = [];
  };
  QRCodeModel.prototype = {
    addData: function(data) {
      this.dataList.push({
        mode: 4,
        parsedData: toUtf8ByteArray(data),
        getLength: function() { return this.parsedData.length; },
        write: function(buffer) { for (var i = 0; i < this.parsedData.length; i++) buffer.put(this.parsedData[i], 8); }
      });
    },
    isDark: function(row, col) { return this.modules[row][col]; },
    make: function() {
      var minLostPoint = 0, pattern = 0;
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lostPoint = QRUtil.getLostPoint(this);
        if (i === 0 || minLostPoint > lostPoint) { minLostPoint = lostPoint; pattern = i; }
      }
      this.makeImpl(false, pattern);
    },
    makeImpl: function(test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (var row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (var col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      var dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
      this.mapData(dataCache, maskPattern);
    },
    setupPositionProbePattern: function(row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          this.modules[row + r][col + c] = ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4));
        }
      }
    },
    setupTimingPattern: function() {
      for (var r = 8; r < this.moduleCount - 8; r++) if (this.modules[r][6] == null) this.modules[r][6] = (r % 2 === 0);
      for (var c = 8; c < this.moduleCount - 8; c++) if (this.modules[6][c] == null) this.modules[6][c] = (c % 2 === 0);
    },
    setupPositionAdjustPattern: function() {
      var pos = QRUtil.PATTERN_POSITION_TABLE[this.typeNumber - 1];
      if (!pos) return;
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i], col = pos[j];
          if (this.modules[row][col] != null) continue;
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) this.modules[row + r][col + c] = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
          }
        }
      }
    },
    setupTypeInfo: function(test, maskPattern) {
      var data = (this.errorCorrectLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);
      for (var i = 0; i < 15; i++) {
        var mod = (!test && ((bits >> i) & 1) === 1);
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
      }
      for (var j = 0; j < 15; j++) {
        var mod2 = (!test && ((bits >> j) & 1) === 1);
        if (j < 8) this.modules[8][this.moduleCount - j - 1] = mod2;
        else if (j < 9) this.modules[8][15 - j] = mod2;
        else this.modules[8][15 - j - 1] = mod2;
      }
      this.modules[this.moduleCount - 8][8] = (!test);
    },
    mapData: function(data, maskPattern) {
      var inc = -1, row = this.moduleCount - 1, bitIndex = 7, byteIndex = 0;
      var maskFn = function(r, c) {
        switch (maskPattern) {
          case 0: return (r + c) % 2 === 0;
          case 1: return r % 2 === 0;
          case 2: return c % 3 === 0;
          case 3: return (r + c) % 3 === 0;
          case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
          case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
          case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
          case 7: return (((r * c) % 3) + ((r + c) % 2)) % 2 === 0;
          default: return false;
        }
      };
      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              var dark = false;
              if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
              if (maskFn(row, col - c)) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    }
  };

  QRCodeModel.createData = function(typeNumber, errorCorrectLevel, dataList) {
    var rsBlocks = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + errorCorrectLevel];
    var buffer = new QRBitBuffer();
    for (var i = 0; i < dataList.length; i++) {
      var data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), (1 <= typeNumber && typeNumber < 10) ? 8 : 16);
      data.write(buffer);
    }
    var totalDataCount = 0;
    for (var j = 0; j < rsBlocks.length; j += 3) totalDataCount += rsBlocks[j] * rsBlocks[j + 2];
    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }
    var offset = 0, maxDcCount = 0, maxEcCount = 0, dcdata = [], ecdata = [];
    for (var r = 0; r < rsBlocks.length; r += 3) {
      var count = rsBlocks[r], totalCount = rsBlocks[r + 1], dataCount = rsBlocks[r + 2];
      for (var c = 0; c < count; c++) {
        var dc = [];
        for (var k = 0; k < dataCount; k++) dc.push(0xff & buffer.buffer[k + offset]);
        offset += dataCount;
        var rsPoly = QRUtil.getErrorCorrectPolynomial(totalCount - dataCount);
        var rawPoly = new QRPolynomial(dc, rsPoly.getLength() - 1);
        var modPoly = rawPoly.mod(rsPoly);
        var ec = new Array(rsPoly.getLength() - 1);
        for (var m = 0; m < ec.length; m++) {
          var modIndex = m + modPoly.getLength() - ec.length;
          ec[m] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
        }
        dcdata.push(dc); ecdata.push(ec);
        maxDcCount = Math.max(maxDcCount, dc.length); maxEcCount = Math.max(maxEcCount, ec.length);
      }
    }
    var resData = [];
    for (var n = 0; n < maxDcCount; n++) {
      for (var r1 = 0; r1 < dcdata.length; r1++) if (n < dcdata[r1].length) resData.push(dcdata[r1][n]);
    }
    for (var n2 = 0; n2 < maxEcCount; n2++) {
      for (var r2 = 0; r2 < ecdata.length; r2++) if (n2 < ecdata[r2].length) resData.push(ecdata[r2][n2]);
    }
    return resData;
  };

  function generateQrSvg(text, cellSize) {
    cellSize = cellSize || 4;
    var utf8Bytes = toUtf8ByteArray(text);
    var typeNumber = 1;
    for (var t = 1; t <= 10; t++) {
      var rs = RS_BLOCK_TABLE[(t - 1) * 4 + 1];
      var cap = 0;
      for (var r = 0; r < rs.length; r += 3) cap += rs[r] * rs[r + 2];
      if (utf8Bytes.length + 3 <= cap) { typeNumber = t; break; }
    }
    var qr = new QRCodeModel(typeNumber, 1);
    qr.addData(text);
    qr.make();
    var count = qr.moduleCount, margin = 2;
    var size = (count + margin * 2) * cellSize;
    var d = [];
    for (var row = 0; row < count; row++) {
      for (var col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          var x = (col + margin) * cellSize, y = (row + margin) * cellSize;
          d.push("M" + x + " " + y + "h" + cellSize + "v" + cellSize + "h-" + cellSize + "z");
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="100%" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="' + d.join('') + '" fill="#0B0F17"/></svg>';
  }

  // -------------------------------------------------------------------------
  // UTILITIES
  // -------------------------------------------------------------------------
  let toastTimer = null;
  function showToast(msg) {
    if (!el.toastPill) return;
    el.toastPill.textContent = msg;
    el.toastPill.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toastPill.classList.remove('visible');
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    str = str.replace(/đ/g, 'd');
    return str;
  }

})();
