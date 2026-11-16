/**
 * Vercel Serverless Function: GET /api/live-feed
 * Live-fetches the latest videos across all 8 YouTube partner channels
 * along with real video durations (lengthSeconds) and exact publish timestamps.
 * Cached on Vercel Edge CDN for 5 minutes (s-maxage=300).
 */

const CHANNELS = [
  { id: 'thienphatreview', name: 'Thiên Phạt Review', url: 'https://www.youtube.com/@thienphatreview', channelId: 'UClqQR_N39TFXI6JTcmbBG2Q' },
  { id: 'tieuho_review', name: 'Tiểu Hồ Review (Dorovietsub)', url: 'https://www.youtube.com/@Ti%E1%BB%83u-H%E1%BB%93_Review', channelId: 'UCoygEVORiacAS8QvzBzzMFA' },
  { id: 'chiuchiusubtv', name: 'ChiuChiuSubTV', url: 'https://www.youtube.com/@chiuchiusubtv', channelId: 'UCWsKmJAGnozzktv5A-duTaA' },
  { id: 'melacreview', name: 'Mễ Lạc Review', url: 'https://www.youtube.com/@M%E1%BB%85L%E1%BA%A1cReview', channelId: 'UCP0FzR9sme0lqUrM3OL_GIQ' },
  { id: 'thienanhstudio9', name: 'Thiên Ảnh Studio', url: 'https://www.youtube.com/@thienanhstudio9', channelId: 'UCVFqXLFQKYzCF0lusDImePA' },
  { id: 'hoathinhmonganh', name: 'Mộng Ảnh Studio', url: 'https://www.youtube.com/@HoatHinhMongAnh', channelId: 'UCcD7v0pn8RcMdOan9fo4Djw' },
  { id: 'vanmonggiao', name: 'Vân Mộng Studio', url: 'https://www.youtube.com/@vanmonggiao', channelId: 'UCwLnjvcUQTB4IDdSMYpYnew' },
  { id: 'tieusumuoi', name: 'Tiểu Sư Muội', url: 'https://www.youtube.com/@Tieusumuoi-u3e', channelId: 'UCQBvrD7zKqhK0l11iTN_HgA' }
];

const GENRE_RULES = [
  ['Tu tiên / Huyền huyễn', 3.0, 1.0, [
    'tu tiên', 'tu chân', 'đế tôn', 'tiên đế', 'kiếm tiên', 'kiếm thần', 'kiếm tông',
    'linh căn', 'trúc cơ', 'nguyên anh', 'kim đan', 'độ kiếp', 'phi thăng', 'lão tổ',
    'sư tôn', 'sư muội', 'đạo hữu', 'thánh địa', 'tông môn', 'ma tôn', 'nữ đế', 'thần ma',
    'trường sinh', 'cẩu đạo', 'vạn giới', 'chư thiên', 'đại đế', 'thần đỉnh', 'hồng hoang',
    'huyền huyễn', 'tiên giới', 'thần giới', 'huyết mạch'
  ]],
  ['Quỷ dị / Linh dị', 3.0, 1.0, [
    'quỷ dị', 'linh dị', 'lệ quỷ', 'quái đàm', 'quy tắc', 'trấn linh', 'bắt quỷ',
    'huyền học', 'phong thủy', 'bói toán', 'cương thi', 'minh hôn', 'diêm quân',
    'tà thần', 'yêu ma', 'trấn ma', 'quỷ thần', 'kinh dị'
  ]],
  ['Sinh tồn / Mạt thế', 3.0, 1.0, [
    'mạt thế', 'tận thế', 'sinh tồn', 'zombie', 'thiên tai', 'băng hà', 'cực hàn',
    'huyết nguyệt', 'đại hồng thủy', 'sương mù', 'biển sâu', 'đảo hoang', 'sa mạc',
    'tích trữ vật tư', 'nơi trú ẩn', 'bè gỗ', 'cao tốc'
  ]],
  ['Ngự thú / Tiến hóa', 3.0, 1.0, [
    'ngự thú', 'thần sủng', 'linh thú', 'thú cưng', 'khế ước thú', 'triệu hồi thú',
    'trùng tộc', 'tiến hóa', 'đột biến', 'thôn phệ', 'hóa long', 'cự long', 'bạch xà',
    'dị thú', 'quái thú', 'pokémon', 'sủng vật'
  ]],
  ['Trò chơi / Phó bản', 3.0, 1.0, [
    'trò chơi', 'phó bản', 'chuyển chức', 'toàn dân', 'người chơi', 'game', 'lãnh chúa',
    'lĩnh chủ', 'thẻ bài', 'vực sâu', 'cày cấp', 'boss', 'nghề nghiệp',
    'mạnh nhất server', 'quân đoàn', 'vong linh', 'triệu hồi'
  ]],
  ['Cao võ / Dị năng', 3.0, 1.0, [
    'cao võ', 'cao vũ', 'võ giả', 'võ đạo', 'võ hồn', 'dị năng', 'thức tỉnh năng lực',
    'học viện', 'cơ giáp', 'tinh tế', 'vũ trụ', 'khoa huyễn', 'siêu phàm', 'sát thủ', 'đặc công'
  ]],
  ['Đô thị / Ngôn tình', 3.0, 1.0, [
    'đô thị', 'tổng tài', 'phú nhị đại', 'thần hào', 'hào môn', 'thiên kim', 'phu nhân',
    'thất gia', 'bạc tỷ', 'vợ cũ', 'hôn nhân', 'ly hôn', 'kết hôn', 'sủng', 'thanh mai',
    'nam thần', 'hoa khôi', 'bác sĩ', 'nghịch tập', 'vả mặt', 'ở rể', 'phản diện',
    'nữ phụ', 'thế thân', 'bạch nguyệt quang'
  ]],
  ['Võ hiệp / Cổ trang', 3.0, 1.0, [
    'cổ đại', 'cổ trang', 'hoàng đế', 'vương gia', 'thái tử', 'hoàng tử', 'công chúa',
    'triều đình', 'giang hồ', 'kiếm hiệp', 'võ hiệp', 'nương tử', 'tướng quân', 'phò mã',
    'tể tướng', 'trường an', 'đại càn', 'lưu đày', 'khai hoang', 'biên ải', 'tửu lâu', 'quán ăn'
  ]],
  ['Hệ thống / Thức tỉnh', 1.5, 0.5, [
    'hệ thống', 'thức tỉnh', 'bảng trạng thái', 'bàn tay vàng', 'điểm danh', 'đăng nhập',
    'mô phỏng', 'quay thưởng', 'gacha', 'nâng cấp', 'cường hóa', 'thương thành',
    'bồi thường', 'vạn lần', 'tối cường', 'cấp sss', 'bật hack'
  ]],
  ['Xuyên không / Trọng sinh', 1.5, 0.5, [
    'xuyên không', 'trọng sinh', 'trùng sinh', 'chuyển sinh', 'xuyên sách', 'kiếp trước',
    'sống lại', 'xuyên về', 'luân hồi'
  ]]
];

const NON_3D_TITLE_RE = /\b(?:episode|tập)\s*\d{3,}\b|ngự thú sư mạnh nhất|the strongest beast tamer|\b2d\b|truyện tranh|manhua\s*audio|comic\s*audio|\[phim ngắn\]/i;

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+100'
};

function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

function cleanPlotSummary(desc) {
  if (!desc) return '';
  const skipLineRe = /ủng hộ kênh|ngân hàng|số tài khoản|\bstk\b|chủ tài khoản|vietinbank|vietcombank|mbbank|techcombank|momo\b|đăng ký kênh|subscribe|bản quyền|copyright|liên hệ quảng cáo|tất cả hình ảnh và âm thanh|mọi vấn đề|email:|gmail\.com|https?:\/\/|^\s*#\w+/i;
  const cleanedLines = [];
  for (const rawLine of String(desc).split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || skipLineRe.test(trimmed)) continue;
    const noUrl = trimmed.replace(/https?:\/\/\S+/g, '').trim();
    if (noUrl) cleanedLines.push(noUrl);
  }
  let summary = cleanedLines.join(' ').replace(/\s+/g, ' ').trim();
  if (summary.length > 360) {
    summary = `${summary.slice(0, 357).replace(/\s+\S*$/, '')}...`;
  }
  return summary;
}

function isValid3dFilmVideo(title, durationSec = 0, channelId = '', publishedAt = '') {
  const t = title || '';
  if (durationSec > 0 && durationSec < 1200) return false;
  if (channelId === 'chiuchiusubtv' && String(publishedAt || '').startsWith('2025-')) return false;
  if (NON_3D_TITLE_RE.test(t)) return false;
  return true;
}

function inferGenres(title, desc) {
  const tLow = (title || '').toLowerCase();
  const dLow = (desc || '').toLowerCase();
  const scored = [];
  for (const [genreName, wTitle, wDesc, kws] of GENRE_RULES) {
    let score = 0;
    for (const kw of kws) {
      if (tLow.includes(kw)) score += wTitle;
      else if (dLow && dLow.includes(kw)) score += wDesc;
    }
    if (score > 0) scored.push({ genreName, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.length > 0 ? scored.slice(0, 2).map(x => x.genreName) : ['Hoạt hình 3D Chọn Lọc'];
}

function formatTotalDurationVi(sec) {
  if (!sec || sec <= 0) return 'Đang cập nhật';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h} giờ ${m < 10 ? '0' : ''}${m} phút`;
  if (m > 0) return s > 0 ? `${m} phút ${s < 10 ? '0' : ''}${s} giây` : `${m} phút`;
  return `${s} giây`;
}

function formatPartDurationHms(sec) {
  if (!sec || sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = n => (n < 10 ? '0' + n : String(n));
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function parseHmsToSec(text) {
  if (!text) return 0;
  const nums = String(text).trim().split(':').map(n => parseInt(n, 10));
  if (nums.some(n => Number.isNaN(n))) return 0;
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] || 0;
}

function parseCompactNumber(text) {
  if (text == null) return 0;
  if (typeof text === 'number') return Math.round(text);
  const cleaned = String(text)
    .replace(/\u00a0/g, ' ')
    .replace(/\s*(?:views?|likes?|người xem|lượt xem|lượt thích)\b/gi, '')
    .trim();
  if (!cleaned) return 0;
  const abbr = cleaned.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(Tr|K|M|B|N)$/i);
  if (abbr) {
    const val = parseFloat(abbr[1].replace(',', '.'));
    const mult = { k: 1e3, n: 1e3, m: 1e6, tr: 1e6, b: 1e9 }[abbr[2].toLowerCase()] || 1;
    return Math.round(val * mult);
  }
  const digits = cleaned.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function parseIso8601Duration(durStr) {
  if (!durStr) return 0;
  const m = String(durStr).trim().match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return (parseInt(m[1] || '0', 10) * 3600) +
    (parseInt(m[2] || '0', 10) * 60) +
    parseInt(m[3] || '0', 10);
}

function parseEnDateToIso(text, refNow = new Date()) {
  if (!text) return null;
  const s = String(text).trim();
  const abs = s.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
  if (abs) {
    const dt = new Date(`${abs[1]} UTC`);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }
  const relEn = s.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (relEn) {
    const qty = parseInt(relEn[1], 10);
    const secMap = {
      second: 1, minute: 60, hour: 3600,
      day: 86400, week: 7 * 86400, month: 30 * 86400, year: 365 * 86400
    };
    const ms = qty * (secMap[relEn[2].toLowerCase()] || 0) * 1000;
    return new Date(refNow.getTime() - ms).toISOString();
  }
  const relVi = s.match(/(\d+)\s+(giây|phút|giờ|ngày|tuần|tháng|năm)\s+trước/i);
  if (relVi) {
    const qty = parseInt(relVi[1], 10);
    const secMapVi = {
      'giây': 1, 'phút': 60, 'giờ': 3600,
      'ngày': 86400, 'tuần': 7 * 86400, 'tháng': 30 * 86400, 'năm': 365 * 86400
    };
    const ms = qty * (secMapVi[relVi[2].toLowerCase()] || 0) * 1000;
    return new Date(refNow.getTime() - ms).toISOString();
  }
  return null;
}

/**
 * Fetch up to 100 latest video durations + views + fallback entries for a channel via Innertube browse.
 * Uses the channel's uploads playlist (VLUU...) because /youtubei/v1/browse is not gated
 * by /watch bot checks on cloud IPs and covers when YouTube RSS XML returns 404/500.
 */
async function fetchChannelBrowseData(channel) {
  const durationMap = new Map();
  const viewsMap = new Map();
  const fallbackEntries = [];
  const channelId = channel && channel.channelId;
  if (!channelId || !channelId.startsWith('UC')) {
    return { durationMap, viewsMap, fallbackEntries };
  }
  const uploadsPlaylistId = `VLUU${channelId.slice(2)}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);
    const resp = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': FETCH_HEADERS['User-Agent']
      },
      body: JSON.stringify({
        browseId: uploadsPlaylistId,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20241111.01.00',
            hl: 'vi',
            gl: 'VN'
          }
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok) return { durationMap, viewsMap, fallbackEntries };
    const text = await resp.text();

    const badgeRegex = /"thumbnailBadgeViewModel":\{"text":"([0-9:]+)"[^}]*"animationActivationTargetId":"([^"]+)"/g;
    let m;
    while ((m = badgeRegex.exec(text)) !== null) {
      const sec = parseHmsToSec(m[1]);
      if (sec > 0 && !durationMap.has(m[2])) {
        durationMap.set(m[2], sec);
      }
    }

    const pvrRegex = /"playlistVideoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,2000}?"lengthSeconds":"(\d+)"/g;
    while ((m = pvrRegex.exec(text)) !== null) {
      const sec = parseInt(m[2], 10);
      if (sec > 0 && !durationMap.has(m[1])) {
        durationMap.set(m[1], sec);
      }
    }

    const seen = new Set();
    const nowRef = new Date();
    const chunks = text.split('{"lockupViewModel":').slice(1, 20);
    for (const chunk of chunks) {
      const vidMatch =
        chunk.match(/"animationActivationTargetId":"([a-zA-Z0-9_-]{11})"/) ||
        chunk.match(/\/vi\/([a-zA-Z0-9_-]{11})\//) ||
        chunk.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (!vidMatch) continue;
      const videoId = vidMatch[1];
      if (seen.has(videoId)) continue;
      seen.add(videoId);

      const titleMatch = chunk.match(/"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"/);
      if (!titleMatch) continue;
      let title = titleMatch[1];
      try {
        title = JSON.parse(`"${titleMatch[1]}"`);
      } catch {
        // fallback raw string
      }

      const viewsMatch = chunk.match(/"metadataParts":\[\{"text":\{"content":"([^"]*(?:view|watching|lượt xem|đang xem)[^"]*)"\}/i);
      const views = viewsMatch ? parseCompactNumber(viewsMatch[1]) : 0;
      if (views > 0) viewsMap.set(videoId, views);

      let publishedAt = null;
      const relMatch = chunk.match(/"text":\{"content":"([^"]+(?:ago|trước))"\}/i);
      if (relMatch) {
        publishedAt = parseEnDateToIso(relMatch[1], nowRef);
      }

      if (fallbackEntries.length < 4) {
        fallbackEntries.push({
          videoId,
          title,
          publishedAt: publishedAt || nowRef.toISOString(),
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          description: '',
          channelId: channel.id,
          channelName: channel.name,
          channelUrl: channel.url
        });
      }
    }
  } catch {
    // Best-effort
  }
  return { durationMap, viewsMap, fallbackEntries };
}

function parseRssEntries(xml, channel, limit = 4) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null && entries.length < limit) {
    const block = match[1];
    const vidMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const pubMatch = block.match(/<published>([^<]+)<\/published>/);
    const thumbMatch = block.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    const descMatch = block.match(/<media:description>([\s\S]*?)<\/media:description>/);

    if (!vidMatch || !titleMatch) continue;
    const videoId = vidMatch[1].trim();
    const title = decodeXmlEntities(titleMatch[1]);
    const publishedAt = pubMatch ? pubMatch[1].trim() : new Date().toISOString();
    const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const description = descMatch ? decodeXmlEntities(descMatch[1]) : '';

    entries.push({
      videoId,
      title,
      publishedAt,
      thumbnail,
      description: description.slice(0, 200),
      channelId: channel.id,
      channelName: channel.name,
      channelUrl: channel.url
    });
  }
  return entries;
}

async function fetchVideoMetadata(videoId) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: FETCH_HEADERS,
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok) return { durationSec: 0, publishDate: null };
    const html = await resp.text();
    const lenMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const approxMatch = !lenMatch ? html.match(/"approxDurationMs":"(\d+)"/) : null;
    const pubMatch = html.match(/"publishDate":"([^"]+)"/) || html.match(/"uploadDate":"([^"]+)"/);
    const durationSec = lenMatch
      ? parseInt(lenMatch[1], 10)
      : (approxMatch ? Math.round(parseInt(approxMatch[1], 10) / 1000) : 0);
    return {
      durationSec,
      publishDate: pubMatch ? pubMatch[1] : null
    };
  } catch {
    return { durationSec: 0, publishDate: null };
  }
}

async function fetchVideoStatsNext(videoId) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': FETCH_HEADERS['User-Agent']
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20241111.01.00',
            hl: 'en',
            gl: 'US'
          }
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok) return { views: null, likes: null, publishDate: null };
    const txt = await resp.text();

    const mV = txt.match(/"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([^"]+)"/) ||
      txt.match(/"factoidRenderer":\{"value":\{"simpleText":"([^"]+)"\},"label":\{"simpleText":"Views"\}/);
    const views = mV ? parseCompactNumber(mV[1]) : null;

    let likes = null;
    const mLAcc = txt.match(/"accessibilityText":"[^"]*like this video along with ([0-9,]+) other/i);
    if (mLAcc) {
      likes = parseCompactNumber(mLAcc[1]);
    } else {
      const mLFac = txt.match(/"factoidRenderer":\{"value":\{"simpleText":"([^"]+)"\},"label":\{"simpleText":"Likes"\}/);
      if (mLFac) {
        likes = parseCompactNumber(mLFac[1]);
      } else {
        const mLBtn = txt.match(/"iconName":"LIKE","title":"([0-9.,KMBkmb]+)"/);
        if (mLBtn) likes = parseCompactNumber(mLBtn[1]);
      }
    }

    const mD = txt.match(/"dateText":\{"simpleText":"([^"]+)"\}/);
    const publishDate = mD ? parseEnDateToIso(mD[1]) : null;
    let description = '';
    const mDesc = txt.match(/"attributedDescriptionBodyText":\{"content":"((?:[^"\\]|\\.)*)"/);
    if (mDesc) {
      try {
        description = JSON.parse(`"${mDesc[1]}"`);
      } catch {
        description = mDesc[1];
      }
    }
    return { views, likes, publishDate, description };
  } catch {
    return { views: null, likes: null, publishDate: null, description: '' };
  }
}

async function fetchBatchYouTubeApiV3(videoIds, apiKey) {
  const map = new Map();
  if (!apiKey || !videoIds.length) return map;
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${chunk.join(',')}&key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const item of data.items || []) {
        const st = item.statistics || {};
        const cd = item.contentDetails || {};
        const sn = item.snippet || {};
        map.set(item.id, {
          views: st.viewCount != null ? parseInt(st.viewCount, 10) : null,
          likes: st.likeCount != null ? parseInt(st.likeCount, 10) : null,
          durationSec: parseIso8601Duration(cd.duration),
          publishDate: sn.publishedAt || null
        });
      }
    } catch {
      // Fallback to Innertube
    }
  }
  return map;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Edge cache for 5 minutes across all users, background revalidate for 10m
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    // 1. Fetch RSS feeds AND Innertube browse maps for all 8 channels concurrently
    const [rssResults, browseResults] = await Promise.all([
      Promise.allSettled(
        CHANNELS.map(async ch => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`, {
            headers: FETCH_HEADERS,
            signal: controller.signal
          });
          clearTimeout(timer);
          if (!resp.ok) return [];
          const xml = await resp.text();
          return parseRssEntries(xml, ch, 4);
        })
      ),
      Promise.allSettled(
        CHANNELS.map(ch => fetchChannelBrowseData(ch))
      )
    ]);

    const browseDurationMap = new Map();
    const browseViewsMap = new Map();
    const candidateVideos = [];

    CHANNELS.forEach((ch, idx) => {
      const bRes = browseResults[idx];
      let fallbackEntries = [];
      if (bRes && bRes.status === 'fulfilled' && bRes.value) {
        const { durationMap, viewsMap, fallbackEntries: fb } = bRes.value;
        durationMap.forEach((sec, vid) => {
          if (sec > 0 && !browseDurationMap.has(vid)) browseDurationMap.set(vid, sec);
        });
        viewsMap.forEach((vw, vid) => {
          if (vw > 0 && !browseViewsMap.has(vid)) browseViewsMap.set(vid, vw);
        });
        fallbackEntries = fb || [];
      }

      const rRes = rssResults[idx];
      const rssEntries = (rRes && rRes.status === 'fulfilled' && Array.isArray(rRes.value)) ? rRes.value : [];
      candidateVideos.push(...(rssEntries.length > 0 ? rssEntries : fallbackEntries));
    });

    // 2. Keep top 24 newest videos; enrich views/likes + missing durations
    candidateVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const topVideos = candidateVideos.slice(0, 24);
    const topIds = topVideos.map(v => v.videoId);

    const apiKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const apiStatsMap = apiKey ? await fetchBatchYouTubeApiV3(topIds, apiKey) : new Map();

    const missingNextIds = topIds.filter(vid => !apiStatsMap.has(vid) || apiStatsMap.get(vid).views == null);
    const nextStatsMap = new Map();
    if (missingNextIds.length > 0) {
      const nextRes = await Promise.allSettled(missingNextIds.map(vid => fetchVideoStatsNext(vid)));
      missingNextIds.forEach((vid, i) => {
        if (nextRes[i].status === 'fulfilled') nextStatsMap.set(vid, nextRes[i].value);
      });
    }

    const missingWatchVideos = topVideos.filter(v => {
      const dur = browseDurationMap.get(v.videoId) || apiStatsMap.get(v.videoId)?.durationSec || 0;
      return dur <= 0;
    });
    const fallbackMetaMap = new Map();
    if (missingWatchVideos.length > 0) {
      const watchResults = await Promise.allSettled(
        missingWatchVideos.map(v => fetchVideoMetadata(v.videoId))
      );
      missingWatchVideos.forEach((v, idx) => {
        if (watchResults[idx].status === 'fulfilled') {
          fallbackMetaMap.set(v.videoId, watchResults[idx].value);
        }
      });
    }

    const enriched = topVideos
      .map(v => {
        const apiMeta = apiStatsMap.get(v.videoId);
        const nextMeta = nextStatsMap.get(v.videoId);
        const fallbackMeta = fallbackMetaMap.get(v.videoId) || { durationSec: 0, publishDate: null };
        const durationSec = apiMeta?.durationSec || browseDurationMap.get(v.videoId) || fallbackMeta.durationSec || 0;
        const publishedAt = apiMeta?.publishDate || v.publishedAt || nextMeta?.publishDate || fallbackMeta.publishDate;
        if (!isValid3dFilmVideo(v.title, durationSec, v.channelId, publishedAt)) return null;
        const views = apiMeta?.views ?? nextMeta?.views ?? browseViewsMap.get(v.videoId) ?? 0;
        const likes = apiMeta?.likes ?? nextMeta?.likes ?? 0;
        const cleanDesc = cleanPlotSummary(v.description || nextMeta?.description || '');
        return {
          videoId: v.videoId,
          title: v.title,
          channelId: v.channelId,
          channelName: v.channelName,
          channelUrl: v.channelUrl,
          publishedAt,
          durationSec,
          durationStr: formatPartDurationHms(durationSec),
          totalDurationStr: formatTotalDurationVi(durationSec),
          views,
          likes,
          thumbnail: v.thumbnail,
          genres: inferGenres(v.title, cleanDesc),
          review: cleanDesc || `${v.title} — Tuyển tập hoạt hình 3D đặc sắc từ kênh ${v.channelName}.`
        };
      })
      .filter(Boolean);

    res.status(200).json({
      fetchedAt: new Date().toISOString(),
      count: enriched.length,
      videos: enriched
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live YouTube feed', details: String(err) });
  }
};
