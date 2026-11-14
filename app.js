/**
 * HÔM NAY XEM GÌ - NORDIC MINIMALIST APPLICATION CONTROLLER
 * 1,564 Animated & Donghua Films from 8 Curated Channels
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
    searchQuery: '',
    currentPage: 1,
    pageSize: 24,
    favorites: new Set(),
    history: [],
    currentPlayingFilm: null,
    currentPlayingPartIndex: 1,
    randomCandidate: null
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
    syncLiveYouTubeFeed();
  });

  function cacheDomElements() {
    el.brandHomeBtn = document.getElementById('brandHomeBtn');
    el.liveAudienceBadge = document.getElementById('liveAudienceBadge');
    el.btnDiceRandom = document.getElementById('btnDiceRandom');
    el.btnFavoritesOpen = document.getElementById('btnFavoritesOpen');
    el.btnHistoryOpen = document.getElementById('btnHistoryOpen');
    el.favCountBadge = document.getElementById('favCountBadge');
    el.histCountBadge = document.getElementById('histCountBadge');

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
    el.cardsWidescreenGrid = document.getElementById('cardsWidescreenGrid');
    el.paginationBar = document.getElementById('paginationBar');

    // Theater Modal
    el.theaterModal = document.getElementById('theaterModal');
    el.modalBackdrop = document.getElementById('modalBackdrop');
    el.modalCloseBtn = document.getElementById('modalCloseBtn');
    el.modalFilmTitle = document.getElementById('modalFilmTitle');
    el.modalChannelKicker = document.getElementById('modalChannelKicker');
    el.youtubeIframe = document.getElementById('youtubeIframe');
    el.modalEpCounter = document.getElementById('modalEpCounter');
    el.modalEpMatrix = document.getElementById('modalEpMatrix');
    el.btnModalBookmark = document.getElementById('btnModalBookmark');

    // Random Modal
    el.randomModal = document.getElementById('randomModal');
    el.randomBackdrop = document.getElementById('randomBackdrop');
    el.randomFilmTitle = document.getElementById('randomFilmTitle');
    el.randomFilmMeta = document.getElementById('randomFilmMeta');
    el.btnRandomWatchNow = document.getElementById('btnRandomWatchNow');
    el.btnRandomRollAgain = document.getElementById('btnRandomRollAgain');

    // Toast & Mobile Dock
    el.toastPill = document.getElementById('toastPill');
    el.mobileBottomBar = document.getElementById('mobileBottomBar');
  }

  const SCHEMA_VERSION = '20261114_v4_browse_fix';

  function loadStoredData() {
    try {
      const v = localStorage.getItem('homnayxemgi_version');
      if (v !== SCHEMA_VERSION) {
        // Automatically purge any stale legacy notifications with mock timestamps
        localStorage.removeItem('homnayxemgi_notifs');
        localStorage.removeItem('homnayxemgi_favs');
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
    if (el.histCountBadge) el.histCountBadge.textContent = state.history.length;
  }

  // -------------------------------------------------------------------------
  // DATA INGESTION & REAL-TIME YOUTUBE SYNC
  // -------------------------------------------------------------------------
  function cleanCoreTitleClient(title) {
    return (title || '')
      .replace(/^(?:\s*(?:\[[^\]]*\]|【[^】]*】|\((?:Phần|Tập|Mùa)\s*\d+[^)]*\)|(?:Ful+l\s*)?(?:Phần|Tập|Mùa|P)\s*\d+(?:\s*[-–]\s*(?:P?\s*)?\d+)?\s*[\|\-:]?)\s*)+/i, '')
      .replace(/\s*\((?:Phần|Tập|Mùa)\s*\d+[^)]*\)\s*$/i, '')
      .replace(/^[\|\-:\s]+|[\|\-:\s]+$/g, '')
      .trim();
  }

  function parsePartInfoClient(text) {
    const s = String(text || '').replace(/\[.*?\]/g, '').trim();
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

    const mEp = s.match(/\b(Phần|Tập|Mùa|P)\s*(\d+)((?:\s*[+\-–&]\s*(?:(?:Phần|Tập|Mùa|P)\s*)?\d+)*)/i);
    if (!mEp) return null;

    const kw = mEp[1].toLowerCase();
    const prefix = kw === 'tập' ? 'Tập' : (kw === 'mùa' ? 'Mùa' : 'Phần');
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

  function normalizeAndIngestData() {
    const rootData = window.FILMS_DATA || {};
    const rawFilms = Array.isArray(rootData) ? rootData : (rootData.films || []);
    const rawChannels = rootData.channels || window.CHANNELS_DATA || [];

    state.channels = rawChannels;

    state.allFilms = rawFilms.map((film, index) => {
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
        publishedAt: p.publishedAt || null,
        isRedundant: !!p.isRedundant
      })) : [{
        partNumber: 1,
        label: 'Phần 1',
        title: film.title,
        videoId: firstPartId,
        duration: cleanDuration,
        durationSec: totalSec,
        publishedAt: film.publishedAt || null,
        isRedundant: false
      }];

      return {
        id: film.id || `film_${index + 1}`,
        title: film.title || 'Phim hoạt hình 3D',
        channelId: film.channelId || 'channel_1',
        channelName: film.channelName || 'Review Phim',
        genre: genreName,
        genres: film.genres || [genreName],
        partsCount: film.totalParts || normalizedParts.length,
        parts: normalizedParts,
        totalDuration: cleanDuration,
        totalDurationSec: totalSec,
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
    // Extract unique genres
    const genreSet = new Set();
    state.allFilms.forEach(f => {
      if (Array.isArray(f.genres)) {
        f.genres.forEach(g => genreSet.add(g));
      } else if (f.genre) {
        genreSet.add(f.genre);
      }
    });
    state.genres = Array.from(genreSet).sort();

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
          // Repair missing/placeholder durations or older timestamp if needed
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
          return;
        }

        // Brand-new video discovered live via YouTube RSS!
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
              publishedAt: v.publishedAt,
              isRedundant: false
            }],
            totalDuration: v.totalDurationStr || formatTotalDurationViClient(v.durationSec),
            totalDurationSec: v.durationSec || 0,
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
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔔</div>
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
            <span class="notif-part-pill">✨ Vừa ra ${item.partLabel}</span>
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
        const count = state.allFilms.filter(f => f.genre === g).length;
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
          <span>Tất cả 8 kênh</span>
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
  // FILTERING & CARD RENDERING
  // -------------------------------------------------------------------------
  function applyFiltersAndRender(targetPage = 1) {
    state.currentPage = targetPage;
    let list = state.allFilms;

    // 1. Search filter
    if (state.searchQuery.trim()) {
      const q = removeVietnameseTones(state.searchQuery.toLowerCase().trim());
      list = list.filter(f => {
        const titleMatch = removeVietnameseTones(f.title.toLowerCase()).includes(q);
        const genreMatch = removeVietnameseTones(f.genre.toLowerCase()).includes(q);
        const chMatch = removeVietnameseTones(f.channelName.toLowerCase()).includes(q);
        return titleMatch || genreMatch || chMatch;
      });
    }

    // 2. Tab filter
    if (state.activeTab === 'recent24h') {
      const recentIds = new Set(state.recent24hFilms.map(f => f.id));
      list = list
        .filter(f => recentIds.has(f.id))
        .sort((a, b) => (b.recentUpdate?.timestamp || 0) - (a.recentUpdate?.timestamp || 0));
    } else if (state.activeTab === 'hot') {
      list = [...list].sort((a, b) => b.totalDurationSec - a.totalDurationSec);
    } else if (state.activeTab === 'multipart') {
      list = list.filter(f => f.partsCount > 1);
    } else if (state.activeTab === 'single') {
      list = list.filter(f => f.partsCount === 1);
    } else if (state.activeTab === 'favorites') {
      list = list.filter(f => state.favorites.has(f.id));
    }

    // 3. Genre filter
    if (state.selectedGenre !== 'all') {
      list = list.filter(f => f.genre === state.selectedGenre);
    }

    // 4. Channel filter
    if (state.selectedChannel !== 'all') {
      list = list.filter(f => f.channelId === state.selectedChannel);
    }

    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / state.pageSize) || 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalCount);
    const pageItems = list.slice(startIndex, endIndex);

    // Summary Text
    if (el.feedCountSummary) {
      if (totalCount === 0) {
        el.feedCountSummary.textContent = 'Không tìm thấy bộ phim phù hợp';
      } else if (state.activeTab === 'recent24h') {
        el.feedCountSummary.textContent = `Dòng thời gian: ${totalCount} phim mới cập nhật trong 24 giờ qua`;
      } else {
        el.feedCountSummary.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trên ${totalCount.toLocaleString('vi-VN')} phim`;
      }
    }

    renderCards(pageItems);
    renderPagination(totalPages);
  }

  function renderCards(items) {
    if (!el.cardsWidescreenGrid) return;
    if (items.length === 0) {
      el.cardsWidescreenGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.75rem; margin-bottom: 0.5rem;">🎬</div>
          <p style="font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
            Không tìm thấy phim phù hợp với tiêu chí lọc
          </p>
          <p style="font-size: 0.875rem;">Hãy thử xóa từ khóa tìm kiếm hoặc bấm chọn tab khác.</p>
        </div>
      `;
      return;
    }

    const html = items.map(film => {
      const isFav = state.favorites.has(film.id);
      const partsLabel = film.partsCount > 1 ? `${film.partsCount} Phần` : 'Trọn bộ 1 tập';
      const hasRecentBadge = film.isRecent24h && film.recentUpdate;

      return `
        <article class="film-card" data-film-id="${film.id}" title="${escapeHtml(film.title)}">
          <div class="card-thumbnail-box">
            <img 
              class="card-img" 
              src="${escapeHtml(film.thumbnailUrl)}" 
              alt="${escapeHtml(film.title)}"
              loading="lazy"
              onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80'"
            >
            <div class="card-vignette"></div>
            
            <!-- TOP-LEFT: High-Contrast Dark Frosted Capsule ("Trọn bộ 1 tập" / "N phần") -->
            <div class="card-parts-stamp">
              <svg class="icon icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon></svg>
              <span>${partsLabel}</span>
            </div>

            <!-- RECENT 24H LIVE UPDATE PILL -->
            ${hasRecentBadge ? `
              <div class="card-update-pill" title="Cập nhật ${film.recentUpdate.timeAgo}">
                <span>⚡ ${film.recentUpdate.timeAgo}</span>
              </div>
            ` : ''}

            <!-- BOTTOM-LEFT: High-Contrast Duration Badge with Amber Clock -->
            ${film.totalDuration ? `
              <div class="card-duration-badge">
                <svg class="icon icon-xs clock-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>${escapeHtml(film.totalDuration)}</span>
              </div>
            ` : ''}

            <!-- TOP-RIGHT: Heart Bookmark / Follow Button -->
            <button type="button" class="card-fav-btn ${isFav ? 'active' : ''}" data-fav-id="${film.id}" title="${isFav ? 'Đang theo dõi (Bấm để hủy)' : 'Theo dõi phim này để nhận thông báo tập mới'}">
              <svg class="icon icon-xs" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>

            <!-- Centered Hover Play Button -->
            <div class="card-hover-play">
              <div class="play-circle-halo">
                <svg class="icon icon-sm" viewBox="0 0 24 24" style="margin-left: 2px;"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon></svg>
              </div>
            </div>
          </div>

          <div class="card-body">
            <h3 class="card-title">${escapeHtml(film.title)}</h3>
            <div class="card-meta-row">
              <span class="card-channel-name">${escapeHtml(film.channelName)}</span>
              <span class="card-genre-text">${escapeHtml(film.genre)}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');

    el.cardsWidescreenGrid.innerHTML = html;
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
    if (el.modalChannelKicker) el.modalChannelKicker.textContent = `${film.channelName} • ${film.genre}`;
    if (el.modalEpCounter) el.modalEpCounter.textContent = `${film.partsCount} Tập`;

    // Embed YouTube Player with autoplay
    if (el.youtubeIframe) {
      el.youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
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
        return `
          <button type="button" class="ep-capsule-btn ${isActive ? 'active' : ''} ${isNewEp ? 'is-new' : ''}" data-ep-pos="${idx}" data-video-id="${escapeHtml(p.videoId || '')}" data-ep-index="${epNum}" title="${escapeHtml(p.title || `Tập ${epNum}`)}">
            <span>${escapeHtml(p.label || `Tập ${epNum}`)}</span>
            <span class="ep-dur-note">${escapeHtml(p.duration || '')}</span>
            ${isNewEp ? '<span class="ep-new-badge">MỚI</span>' : ''}
          </button>
        `;
      }).join('');
      el.modalEpMatrix.innerHTML = epHtml;
    }

    addToHistory(film.id);
    el.theaterModal?.classList.add('active');
  }

  function closePlayer() {
    if (el.youtubeIframe) {
      el.youtubeIframe.src = ''; // stop audio immediately
    }
    el.theaterModal?.classList.remove('active');
    state.currentPlayingFilm = null;
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
      showToast(`Đã theo dõi: ${film ? film.title : 'Phim'} • Bạn sẽ nhận được thông báo khi có tập mới! ❤️`);

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
  }

  // -------------------------------------------------------------------------
  // RANDOMIZER MODAL (GỢI Ý PHIM 🎲)
  // -------------------------------------------------------------------------
  function openRandomizer() {
    // Pick candidates with duration >= 2 hours for high-quality binging
    const pool = state.allFilms.filter(f => f.totalDurationSec >= 7200);
    const candidates = pool.length > 0 ? pool : state.allFilms;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (!pick) return;

    state.randomCandidate = pick;

    if (el.randomFilmTitle) el.randomFilmTitle.textContent = pick.title;
    if (el.randomFilmMeta) el.randomFilmMeta.textContent = `${pick.channelName} • ${pick.totalDuration} • ${pick.genre} • ${pick.partsCount} Tập`;

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
      applyFiltersAndRender(1);
    });

    // Sidebar Genre click
    el.genreNavList?.addEventListener('click', e => {
      const btn = e.target.closest('.sidebar-menu-btn');
      if (!btn) return;
      el.genreNavList.querySelectorAll('.sidebar-menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedGenre = btn.dataset.genre;
      updateMobileChipActive();
      applyFiltersAndRender(1);
    });

    // Mobile Chips Genre click
    el.mobileChipsRow?.addEventListener('click', e => {
      const chip = e.target.closest('.mobile-chip-btn');
      if (!chip) return;
      state.selectedGenre = chip.dataset.genre;
      updateMobileChipActive();
      updateSidebarGenreActive();
      applyFiltersAndRender(1);
    });

    // Sidebar Channel click
    el.channelNavList?.addEventListener('click', e => {
      const btn = e.target.closest('.sidebar-menu-btn');
      if (!btn) return;
      el.channelNavList.querySelectorAll('.sidebar-menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedChannel = btn.dataset.channel;
      applyFiltersAndRender(1);
    });

    // Film Card clicks
    el.cardsWidescreenGrid?.addEventListener('click', e => {
      const favBtn = e.target.closest('.card-fav-btn');
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.favId);
        return;
      }

      const card = e.target.closest('.film-card');
      if (card) {
        const filmId = card.dataset.filmId;
        const film = state.allFilms.find(f => f.id === filmId);
        if (film) openPlayer(film, { partPos: 0, videoId: film.parts[0]?.videoId, partNumber: film.parts[0]?.partNumber || 1 });
      }
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
    el.btnRandomRollAgain?.addEventListener('click', openRandomizer);
    el.btnRandomWatchNow?.addEventListener('click', () => {
      if (state.randomCandidate) {
        const pick = state.randomCandidate;
        closeRandomizer();
        openPlayer(pick, { partPos: 0, videoId: pick.parts[0]?.videoId });
      }
    });

    // Header Favorite and History Buttons
    el.btnFavoritesOpen?.addEventListener('click', () => {
      const favTab = document.querySelector('.tab-pill[data-tab="favorites"]');
      if (favTab) favTab.click();
    });

    // Mobile Bottom Bar clicks
    el.mobileBottomBar?.addEventListener('click', e => {
      const btn = e.target.closest('.dock-item');
      if (!btn || btn.id === 'dockDiceBtn') return;
      el.mobileBottomBar.querySelectorAll('.dock-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = btn.dataset.dock;
      const feedTab = document.querySelector(`.tab-pill[data-tab="${targetTab}"]`);
      if (feedTab) feedTab.click();
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

  function updateMobileChipActive() {
    el.mobileChipsRow?.querySelectorAll('.mobile-chip-btn').forEach(c => {
      c.classList.toggle('active', c.dataset.genre === state.selectedGenre);
    });
  }

  function updateSidebarGenreActive() {
    el.genreNavList?.querySelectorAll('.sidebar-menu-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.genre === state.selectedGenre);
    });
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
