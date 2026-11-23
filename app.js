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
    genres: [],
    recent24hFilms: [],
    notifications: [],
    activeTab: 'all',
    selectedGenre: 'all',
    selectedChannel: 'all',
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
    setupNotificationsEngine();
    setupEventListeners();
    renderSidebar();
    renderMobileChips();
    applyFiltersAndRender(1);
    renderContinueShelf();
    applyDeepLinkFromUrl();
    syncLiveYouTubeFeed();
  });

  function cacheDomElements() {
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
    el.lbChannelSelect = document.getElementById('lbChannelSelect');
    el.lbGenreSelect = document.getElementById('lbGenreSelect');
    el.leaderboardShowcase = document.getElementById('leaderboardShowcase');
    el.cardsWidescreenGrid = document.getElementById('cardsWidescreenGrid');
    el.paginationBar = document.getElementById('paginationBar');

    // Spotlight Hero Container
    el.spotlightHeroShell = document.getElementById('spotlightHeroShell');
    el.spotlightHero = document.getElementById('spotlightHero');

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

  const SCHEMA_VERSION = '20261116_v6_3d_genres_spotlight';

  const NON_3D_CLIENT_RE = /\b(?:episode|tập)\s*\d{3,}\b|ngự thú sư mạnh nhất|the strongest beast tamer|\b2d\b|truyện tranh|review truyện|review manhua|review manga|review manhwa|manhua\s*audio|comic\s*audio|audio truyện|đọc truyện|kể truyện|bộ truyện|\[phim ngắn\]|\bchap\s*\d+|\bchương\s*\d+/i;
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
    if (el.favCountBadge) el.favCountBadge.textContent = state.favorites.size;
  }

  // -------------------------------------------------------------------------
  // DATA INGESTION & REAL-TIME YOUTUBE SYNC
  // -------------------------------------------------------------------------
  function cleanCoreTitleClient(title) {
    const unwrapBracket = (_, innerRaw) => {
      const inner = (innerRaw || '').trim();
      if (/^(?:Ful+l\s*)?(?:Trọn\s*Bộ\s*)?(?:Version\s*)?(?:Phần|Tập|Mùa|Bộ|P|S|EP|V)?\s*\d*(?:\s*[-–+~]\s*(?:P|Phần|Tập|Mùa|S|EP)?\s*\d+)?(?:\s*\(\s*END\s*\)|\s*END|\s*Kết)?$/i.test(inner)) {
        return ' ';
      }
      return ` ${inner} `;
    };
    return (title || '')
      .replace(/【([^】]*)】/g, unwrapBracket)
      .replace(/\[([^\]]*)\]/g, unwrapBracket)
      .replace(/^(?:\s*(?:\((?:Phần|Tập|Mùa)\s*\d+[^)]*\)|(?:Ful+l(?:\s*Bộ|\s*Kết|\s*END|\s*Version)?\s*)?(?:Trọn\s*Bộ\s*)?(?:Phần|Tập|Mùa|P|S)\s*\d+(?:\s*[-–+~]\s*(?:P?\s*)?\d+)?(?:\s*\([^)]*\))?\s*[\|\-:–,]?)\s*)+/i, '')
      .replace(/^(?:Ful+l(?:\s*Bộ|\s*Kết|\s*END|\s*Version)?)\s*[\|\-:–]\s*/i, '')
      .replace(/\s*\((?:Phần|Tập|Mùa)\s*\d+[^)]*\)\s*$/i, '')
      .replace(/\s*[\|\-]\s*(?:Kas\s*Vietsub|MyCherrySub|Sora\s*Dub|CibiiSub|Đậu\s*Đậu\s*Vietsub|GodSub|Win\s*Vietsub|Thế\s*Vietsub|Vietsub\s*Phim)\s*$/i, '')
      .replace(/^[\|\-:\s]+|[\|\-:\s]+$/g, '')
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

    const mEp = s.match(/\b(Phần|Tập|Mùa|P|SS|Full\s*-\s*S|Full(?=\s+\d+\b)|Version)\s*(\d+)((?:\s*[+\-–&]\s*(?:(?:Phần|Tập|Mùa|P|SS)\s*)?\d+)*)/i);
    if (!mEp) return null;

    const kw = mEp[1].toLowerCase().replace(/\s+/g, '');
    const prefix = kw === 'tập' ? 'Tập' : ((kw === 'mùa' || kw === 'ss' || kw === 'full-s') ? 'Mùa' : 'Phần');
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
        let matchedFilm = null;

        if (partNum && partNum > 1 && coreTitle.length >= 10) {
          matchedFilm = state.allFilms.concat(newFilmsBatch).find(ef => {
            if (ef.channelId !== v.channelId) return false;
            const efCore = cleanCoreTitleClient(ef.title);
            return efCore.length >= 10 && (efCore.includes(coreTitle) || coreTitle.includes(efCore));
          }) || null;
        }

        if (matchedFilm) {
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
  function renderSidebar() {
    // Genres
    if (el.genreNavList) {
      let gHtml = `
        <button type="button" class="sidebar-menu-btn ${state.selectedGenre === 'all' ? 'active' : ''}" data-genre="all">
          <span>Tất cả thể loại</span>
          <span class="sidebar-count-tag">${state.allFilms.length}</span>
        </button>
      `;
      state.genres.forEach(g => {
        const count = state.allFilms.filter(f => filmMatchesGenre(f, g)).length;
        gHtml += `
          <button type="button" class="sidebar-menu-btn ${state.selectedGenre === g ? 'active' : ''}" data-genre="${escapeHtml(g)}">
            <span class="truncate">${escapeHtml(g)}</span>
            <span class="sidebar-count-tag">${count}</span>
          </button>
        `;
      });
      el.genreNavList.innerHTML = gHtml;
    }

    // Channels
    if (el.channelNavList) {
      let cHtml = `
        <button type="button" class="sidebar-menu-btn ${state.selectedChannel === 'all' ? 'active' : ''}" data-channel="all">
          <span>Tất cả ${state.channels.length || ''} kênh</span>
          <span class="sidebar-count-tag">${state.allFilms.length}</span>
        </button>
      `;
      state.channels.forEach(ch => {
        const count = state.allFilms.filter(f => f.channelId === ch.id).length;
        cHtml += `
          <button type="button" class="sidebar-menu-btn ${state.selectedChannel === ch.id ? 'active' : ''}" data-channel="${ch.id}">
            <span class="truncate">${escapeHtml(ch.name)}</span>
            <span class="sidebar-count-tag">${count}</span>
          </button>
        `;
      });
      el.channelNavList.innerHTML = cHtml;
    }

    populateLeaderboardSelects();
    syncAllScopeControls();
  }

  function populateLeaderboardSelects() {
    if (el.lbChannelSelect) {
      let html = `<option value="all">Tất cả ${state.channels.length || 8} kênh (${state.allFilms.length})</option>`;
      state.channels.forEach(ch => {
        const count = state.allFilms.filter(f => f.channelId === ch.id).length;
        html += `<option value="${escapeHtml(ch.id)}">${escapeHtml(ch.name)} (${count})</option>`;
      });
      el.lbChannelSelect.innerHTML = html;
      el.lbChannelSelect.value = state.selectedChannel;
    }

    if (el.lbGenreSelect) {
      let html = `<option value="all">Tất cả thể loại (${state.allFilms.length})</option>`;
      state.genres.forEach(g => {
        const count = state.allFilms.filter(f => filmMatchesGenre(f, g)).length;
        html += `<option value="${escapeHtml(g)}">${escapeHtml(g)} (${count})</option>`;
      });
      el.lbGenreSelect.innerHTML = html;
      el.lbGenreSelect.value = state.selectedGenre;
    }
  }

  function renderMobileChips() {
    if (!el.mobileChipsRow) return;
    let html = `
      <button type="button" class="mobile-chip-btn ${state.selectedGenre === 'all' ? 'active' : ''}" data-genre="all">
        Tất cả
      </button>
    `;
    state.genres.forEach(g => {
      html += `
        <button type="button" class="mobile-chip-btn ${state.selectedGenre === g ? 'active' : ''}" data-genre="${escapeHtml(g)}">
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
    const found = state.channels.find(c => c.id === chId);
    return found ? found.name : chId;
  }

  function renderActiveScopeBadges() {
    if (!el.activeScopeBadges) return;
    const pills = [];
    if (state.selectedChannel !== 'all') {
      pills.push(`
        <button type="button" class="scope-active-chip" data-clear-scope="channel" title="Bấm để bỏ lọc kênh">
          <span>Kênh: ${escapeHtml(getChannelDisplayName(state.selectedChannel))}</span>
          <span class="scope-clear-x" aria-hidden="true">×</span>
        </button>
      `);
    }
    if (state.selectedGenre !== 'all') {
      pills.push(`
        <button type="button" class="scope-active-chip" data-clear-scope="genre" title="Bấm để bỏ lọc thể loại">
          <span>Thể loại: ${escapeHtml(state.selectedGenre)}</span>
          <span class="scope-clear-x" aria-hidden="true">×</span>
        </button>
      `);
    }
    if (state.timeRange !== 'all') {
      pills.push(`
        <button type="button" class="scope-active-chip scope-chip-time" data-clear-scope="time" title="Bấm để xem mọi thời đại">
          <span>${escapeHtml(TIME_RANGE_LABELS[state.timeRange] || state.timeRange)}</span>
          <span class="scope-clear-x" aria-hidden="true">×</span>
        </button>
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
        const chMatch = removeVietnameseTones(film.channelName.toLowerCase()).includes(q);
        if (!titleMatch && !genreMatch && !chMatch) continue;
      }

      // 2. Genre & Channel filters (shared across both normal tabs and Leaderboard!)
      if (!filmMatchesGenre(film, state.selectedGenre)) continue;
      if (state.selectedChannel !== 'all' && film.channelId !== state.selectedChannel) continue;

      // 3. Tab filter
      if (state.activeTab === 'recent24h') {
        const recentIds = new Set(state.recent24hFilms.map(f => f.id));
        if (!recentIds.has(film.id)) continue;
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

      // 4. Time window filter &amp; period views/likes calculation
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
      // 'recent': preserve latest updates first, then original catalog order
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

    // Leaderboard Showcase Subheading & Top 1-3 Spotlight / Podium
    if (isLeaderboard && el.lbSubheading) {
      const metricLabel = state.leaderboardMetric === 'likes' ? 'Yêu thích nhất' : 'Xem nhiều nhất';
      const timeLabel = TIME_RANGE_LABELS[state.leaderboardTime] || 'Tuần này';
      const chLabel = getChannelDisplayName(state.selectedChannel);
      const genLabel = state.selectedGenre === 'all' ? 'Tất cả thể loại' : state.selectedGenre;
      el.lbSubheading.textContent = `${metricLabel} • ${timeLabel} • ${chLabel} • ${genLabel}`;
    }

    renderActiveScopeBadges();
    if (state.urlReady) syncScopeToUrl();
    if (el.feedCountSummary) {
      if (totalCount === 0) {
        el.feedCountSummary.textContent = 'Không tìm thấy bộ phim phù hợp';
      } else if (isLeaderboard) {
        el.feedCountSummary.textContent = `BXH Top ${totalCount.toLocaleString('vi-VN')} phim (${TIME_RANGE_LABELS[state.leaderboardTime] || 'Tuần này'})`;
      } else if (state.activeTab === 'recent24h') {
        el.feedCountSummary.textContent = `Dòng thời gian: ${totalCount} phim mới cập nhật trong 24 giờ qua`;
      } else {
        el.feedCountSummary.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trên ${totalCount.toLocaleString('vi-VN')} phim`;
      }
    }

    // Leaderboard uses high-density Chart List mode
    const isChartListMode = isLeaderboard && totalCount > 0;
    if (el.cardsWidescreenGrid) {
      el.cardsWidescreenGrid.classList.toggle('chart-list-mode', isChartListMode);
    }

    // Spotlight Hero Banner: visible on default view (page 1, tab 'all', without search or narrow filters)
    const shouldShowHero = !isLeaderboard && state.activeTab === 'all' && state.currentPage === 1 && !state.searchQuery.trim() && state.selectedGenre === 'all' && state.selectedChannel === 'all' && state.durationFilter === 'all';
    if (el.spotlightHeroShell) {
      el.spotlightHeroShell.classList.toggle('hidden', !shouldShowHero);
      if (shouldShowHero) {
        renderSpotlightHero();
      } else {
        pauseSpotlightTimer();
      }
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
    const partsLabel = film.partsCount > 1 ? `${film.partsCount} Phần` : 'Trọn bộ 1 tập';
    const hasRecentBadge = film.isRecent24h && film.recentUpdate;

    const viewsVal = periodViews !== undefined ? periodViews : (film.totalViews || 0);
    const likesVal = periodLikes !== undefined ? periodLikes : (film.totalLikes || 0);
    const rankClass = rank === 1 ? 'rank-gold' : (rank === 2 ? 'rank-silver' : (rank === 3 ? 'rank-bronze' : ''));
    const statsMarkup = renderCardStatsHtml(viewsVal, likesVal);

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
            <div class="card-rank-badge ${rankClass}" aria-label="Hạng ${rank}">
              <span>#${rank}</span>
            </div>
          ` : `
            <div class="card-parts-stamp">
              <svg class="icon icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon></svg>
              <span>${partsLabel}</span>
            </div>
          `}

          ${hasRecentBadge && !showRank ? `
            <div class="card-update-pill" title="Cập nhật ${escapeHtml(film.recentUpdate.timeAgo)}">
              <span>${escapeHtml(film.recentUpdate.timeAgo)}</span>
            </div>
          ` : ''}

          ${film.totalDuration ? `
            <div class="card-duration-badge">
              <svg class="icon icon-xs clock-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${escapeHtml(film.totalDuration)}</span>
            </div>
          ` : ''}

          <button type="button" class="card-fav-btn ${isFav ? 'active' : ''}" data-fav-id="${film.id}" title="${isFav ? 'Đang theo dõi (Bấm để hủy)' : 'Theo dõi phim này để nhận thông báo tập mới'}">
            <svg class="icon icon-xs" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>

          <div class="card-hover-play">
            <div class="play-circle-halo">
              <svg class="icon icon-sm" viewBox="0 0 24 24" style="margin-left: 2px;"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon></svg>
            </div>
          </div>

          ${progressBarMarkup}
        </div>

          <div class="card-body">
          <h3 class="card-title">${escapeHtml(film.title)}</h3>
          <div class="card-meta-row">
            <span class="card-channel-name">${escapeHtml(film.channelName)}</span>
            <button type="button" class="card-info-btn" data-info-id="${film.id}" aria-label="Xem tóm tắt cốt truyện" title="Xem tóm tắt cốt truyện">
              <svg class="icon icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <span>Tóm tắt</span>
            </button>
          </div>
          <div class="card-genre-tags">
            ${(Array.isArray(film.genres) && film.genres.length ? film.genres : [film.genre]).slice(0, 2).map(g => `<span class="card-genre-chip">${escapeHtml(g)}</span>`).join('')}
          </div>
          ${statsMarkup}
        </div>
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
            ${(state.selectedChannel !== 'all' || state.selectedGenre !== 'all') ? '<button type="button" class="lb-reset-btn" data-lb-clear-scope="1">Hiện Tất Cả Kênh &amp; Thể Loại</button>' : ''}
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
    if (el.modalSynopsis) el.modalSynopsis.textContent = film.synopsis || '';
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
  // SPOTLIGHT HERO BANNER LOGIC (TOP TRENDING 3D SHOWCASE)
  // -------------------------------------------------------------------------
  function getSpotlightCandidates() {
    if (!state.allFilms || state.allFilms.length === 0) return [];
    // Prioritize high-view, multi-part curated films with valid thumbnails
    const pool = state.allFilms
      .filter(f => f.thumbnailUrl && f.totalDurationSec > 1800)
      .slice();
    pool.sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));
    return pool.slice(0, 5);
  }

  function renderSpotlightHero() {
    if (!el.spotlightHero) return;
    const candidates = getSpotlightCandidates();
    if (candidates.length === 0) {
      el.spotlightHeroShell?.classList.add('hidden');
      return;
    }
    const idx = (state.spotlightIndex % candidates.length + candidates.length) % candidates.length;
    state.spotlightIndex = idx;
    const film = candidates[idx];
    const isFav = state.favorites.has(film.id);
    const partsLabel = film.partsCount > 1 ? `${film.partsCount} Phần` : 'Trọn bộ 1 tập';
    const genres = (Array.isArray(film.genres) && film.genres.length ? film.genres : [film.genre]).slice(0, 2);

    const dotsHtml = candidates.map((_, i) =>
      `<button type="button" class="spotlight-dot ${i === idx ? 'active' : ''}" data-spotlight-dot="${i}" aria-label="Xem phim nổi bật ${i + 1}"></button>`
    ).join('');

    el.spotlightHero.innerHTML = `
      <div class="spotlight-backdrop">
        <img class="spotlight-backdrop-img" src="${escapeHtml(film.thumbnailUrl)}" alt="${escapeHtml(film.title)}" loading="eager" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80'">
      </div>
      <div class="spotlight-vignette"></div>
      <div class="spotlight-vignette-bottom"></div>

      <div class="spotlight-content">
        <div class="spotlight-kicker-row">
          <span class="spotlight-kicker-badge">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"></polygon></svg>
            <span>PHIM 3D NỔI BẬT HÔM NAY</span>
          </span>
          <span class="spotlight-channel-pill">${escapeHtml(film.channelName)}</span>
        </div>

        <h2 class="spotlight-title">${escapeHtml(film.title)}</h2>

        <div class="spotlight-meta-row">
          <span class="spotlight-chip spotlight-chip-accent">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon></svg>
            <span>${partsLabel}</span>
          </span>
          ${film.totalDuration ? `
            <span class="spotlight-chip spotlight-chip-amber">
              <svg class="icon icon-xs clock-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${escapeHtml(film.totalDuration)}</span>
            </span>
          ` : ''}
          ${genres.map(g => `<span class="spotlight-chip">${escapeHtml(g)}</span>`).join('')}
          ${film.totalViews > 0 ? `
            <span class="spotlight-chip">
              <svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>${formatCompactCountVi(film.totalViews)} xem</span>
            </span>
          ` : ''}
        </div>

        ${film.synopsis ? `<p class="spotlight-synopsis">${escapeHtml(film.synopsis)}</p>` : ''}

        <div class="spotlight-actions">
          <button type="button" class="btn-spotlight-watch" data-spotlight-watch="${escapeHtml(film.id)}">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon></svg>
            <span>Xem Ngay Tập 1</span>
          </button>
          <button type="button" class="btn-spotlight-fav ${isFav ? 'active' : ''}" data-spotlight-fav="${escapeHtml(film.id)}" title="${isFav ? 'Đã lưu' : 'Lưu phim'}">
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            <span>${isFav ? 'Đã Lưu Vào Tủ Phim' : 'Lưu Vào Tủ Phim'}</span>
          </button>
        </div>
      </div>

      <div class="spotlight-nav-controls">
        <div class="spotlight-dots">${dotsHtml}</div>
        <button type="button" class="spotlight-arrow-btn" data-spotlight-dir="-1" aria-label="Phim trước">
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <button type="button" class="spotlight-arrow-btn" data-spotlight-dir="1" aria-label="Phim tiếp theo">
          <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    `;

    startSpotlightTimer();
  }

  function startSpotlightTimer() {
    if (state.spotlightTimer) clearInterval(state.spotlightTimer);
    state.spotlightTimer = setInterval(() => {
      const candidates = getSpotlightCandidates();
      if (candidates.length <= 1) return;
      state.spotlightIndex = (state.spotlightIndex + 1) % candidates.length;
      renderSpotlightHero();
    }, 7000);
  }

  function pauseSpotlightTimer() {
    if (state.spotlightTimer) {
      clearInterval(state.spotlightTimer);
      state.spotlightTimer = null;
    }
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
      channel: state.selectedChannel,
      genre: state.selectedGenre,
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
    if (q.get('channel') && state.channels.some(c => c.id === q.get('channel'))) state.selectedChannel = q.get('channel');
    if (q.get('genre') && state.genres.includes(q.get('genre'))) state.selectedGenre = q.get('genre');
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
    // Respect current channel/genre filter if active, otherwise pull high-quality 3D films >= 2h
    let scoped = state.allFilms.filter(f =>
      (state.selectedChannel === 'all' || f.channelId === state.selectedChannel) &&
      filmMatchesGenre(f, state.selectedGenre)
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
      el.randomThumbImg.src = pick.thumbnailUrl || '';
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
      el.randomFilmSynopsis.textContent = pick.synopsis || `${cleanCoreTitleClient(pick.title)} — Bộ phim hoạt hình 3D đặc sắc từ ${pick.channelName}.`;
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
      const btn = e.target.closest('[data-clear-scope]');
      if (!btn) return;
      const scope = btn.dataset.clearScope;
      if (scope === 'channel') state.selectedChannel = 'all';
      if (scope === 'genre') state.selectedGenre = 'all';
      if (scope === 'time') {
        state.timeRange = 'all';
        if (el.timeRangeSelect) el.timeRangeSelect.value = 'all';
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

    el.lbChannelSelect?.addEventListener('change', e => {
      state.selectedChannel = e.target.value || 'all';
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    el.lbGenreSelect?.addEventListener('change', e => {
      state.selectedGenre = e.target.value || 'all';
      syncAllScopeControls();
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
        state.selectedChannel = 'all';
        state.selectedGenre = 'all';
        syncAllScopeControls();
        applyFiltersAndRender(1);
        return;
      }
    });

    // Sidebar Genre click
    el.genreNavList?.addEventListener('click', e => {
      const btn = e.target.closest('.sidebar-menu-btn');
      if (!btn) return;
      state.selectedGenre = btn.dataset.genre;
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Mobile Chips Genre click
    el.mobileChipsRow?.addEventListener('click', e => {
      const chip = e.target.closest('.mobile-chip-btn');
      if (!chip) return;
      state.selectedGenre = chip.dataset.genre;
      syncAllScopeControls();
      applyFiltersAndRender(1);
    });

    // Sidebar Channel click
    el.channelNavList?.addEventListener('click', e => {
      const btn = e.target.closest('.sidebar-menu-btn');
      if (!btn) return;
      state.selectedChannel = btn.dataset.channel;
      syncAllScopeControls();
      applyFiltersAndRender(1);
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
      if (chBtn) state.selectedChannel = chBtn.dataset.scopeChannel;
      if (gBtn) state.selectedGenre = gBtn.dataset.scopeGenre;
      closePlayer();
      syncAllScopeControls();
      applyFiltersAndRender(1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
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

    // Spotlight Hero carousel interactions
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
      const favBtn = e.target.closest('[data-spotlight-fav]');
      if (favBtn) {
        toggleFavorite(favBtn.dataset.spotlightFav);
        renderSpotlightHero();
        return;
      }
      const dotBtn = e.target.closest('[data-spotlight-dot]');
      if (dotBtn) {
        state.spotlightIndex = parseInt(dotBtn.dataset.spotlightDot, 10) || 0;
        renderSpotlightHero();
        return;
      }
      const dirBtn = e.target.closest('[data-spotlight-dir]');
      if (dirBtn) {
        const step = parseInt(dirBtn.dataset.spotlightDir, 10) || 1;
        const candidates = getSpotlightCandidates();
        if (candidates.length > 0) {
          state.spotlightIndex = (state.spotlightIndex + step + candidates.length) % candidates.length;
          renderSpotlightHero();
        }
        return;
      }
    });

    el.spotlightHero?.addEventListener('mouseenter', pauseSpotlightTimer);
    el.spotlightHero?.addEventListener('mouseleave', startSpotlightTimer);

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

    // Pagination clicks
    el.paginationBar?.addEventListener('click', e => {
      const btn = e.target.closest('.page-num-btn');
      if (btn && btn.dataset.page) {
        applyFiltersAndRender(parseInt(btn.dataset.page, 10));
        window.scrollTo({ top: 120, behavior: 'smooth' });
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
      if (e.key === '/' && document.activeElement !== el.searchInput) {
        e.preventDefault();
        el.searchInput?.focus();
      } else if (e.key === 'Escape') {
        if (el.theaterModal?.classList.contains('active')) closePlayer();
        if (el.randomModal?.classList.contains('active')) closeRandomizer();
        if (el.notificationPopover?.classList.contains('active')) el.notificationPopover.classList.remove('active');
      }
    });
  }

  function syncMobileDockActive() {
    el.mobileBottomBar?.querySelectorAll('.dock-item[data-dock]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dock === state.activeTab);
    });
  }

  function updateMobileChipActive() {
    el.mobileChipsRow?.querySelectorAll('.mobile-chip-btn').forEach(c => {
      c.classList.toggle('active', c.dataset.genre === state.selectedGenre);
    });
  }

  function syncAllScopeControls() {
    updateMobileChipActive();
    updateSidebarGenreActive();
    updateSidebarChannelActive();
    if (el.lbChannelSelect) el.lbChannelSelect.value = state.selectedChannel;
    if (el.lbGenreSelect) el.lbGenreSelect.value = state.selectedGenre;
  }

  function updateSidebarChannelActive() {
    el.channelNavList?.querySelectorAll('.sidebar-menu-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.channel === state.selectedChannel);
    });
  }

  function updateSidebarGenreActive() {
    el.genreNavList?.querySelectorAll('.sidebar-menu-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.genre === state.selectedGenre);
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
