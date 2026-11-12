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

const GENRE_KEYWORDS = {
  'Sinh tồn / Mạt thế': ['mạt thế', 'sinh tồn', 'huyết nguyệt', 'thiên tai', 'băng hà', 'zombie', 'quái dị', 'tận thế'],
  'Xuyên không / Trọng sinh': ['trọng sinh', 'xuyên không', 'chuyển sinh', 'kiếp trước', 'sống lại', 'xuyên về'],
  'Hệ thống / Thức tỉnh': ['hệ thống', 'thức tỉnh', 'bảng trạng thái', 'bàn tay vàng', 'gacha', 'nâng cấp', 'sign in', 'điểm danh'],
  'Đô thị / Ngôn tình - Nghịch tập': ['đô thị', 'phú nhị đại', 'tổng tài', 'ở rể', 'phú bà', 'nghịch tập', 'vả mặt', 'thần hào'],
  'Huyền huyễn / Tu tiên': ['tu tiên', 'tu chân', 'đế tôn', 'tiên đế', 'kiếm thần', 'võ đạo', 'võ hồn', 'đan dược', 'tông môn', 'thần ma'],
  'Võ hiệp / Cổ trang': ['kiếm hiệp', 'hoàng đế', 'vương gia', 'triều đình', 'giang hồ', 'cung đình'],
  'Hài hước / Giải trí': ['cá mặn', 'tấu hài', 'nằm lười', 'bựa', 'phá gia', 'bá đạo'],
  'Khoa huyễn / Dị năng': ['khoa học', 'cơ giáp', 'vũ trụ', 'dị năng', 'dị thú', 'tinh tế']
};

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

function inferGenres(title, desc) {
  const text = `${title} ${desc || ''}`.toLowerCase();
  const matched = Object.entries(GENRE_KEYWORDS)
    .filter(([, kws]) => kws.some(kw => text.includes(kw)))
    .map(([genre]) => genre);
  return matched.length > 0 ? matched.slice(0, 2) : ['Hoạt hình 2D/3D'];
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
    const pubMatch = html.match(/"publishDate":"([^"]+)"/) || html.match(/"uploadDate":"([^"]+)"/);
    return {
      durationSec: lenMatch ? parseInt(lenMatch[1], 10) : 0,
      publishDate: pubMatch ? pubMatch[1] : null
    };
  } catch {
    return { durationSec: 0, publishDate: null };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Edge cache for 5 minutes across all users, background revalidate for 10m
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    // 1. Fetch RSS feeds for all 8 channels concurrently
    const rssResults = await Promise.allSettled(
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
        return parseRssEntries(xml, ch, 3);
      })
    );

    const candidateVideos = [];
    for (const r of rssResults) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        candidateVideos.push(...r.value);
      }
    }

    // 2. Fetch real lengthSeconds & publishDate concurrently for top 24 newest videos
    candidateVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const topVideos = candidateVideos.slice(0, 24);

    const metaResults = await Promise.allSettled(
      topVideos.map(v => fetchVideoMetadata(v.videoId))
    );

    const enriched = topVideos.map((v, idx) => {
      const meta = metaResults[idx].status === 'fulfilled' ? metaResults[idx].value : { durationSec: 0, publishDate: null };
      const durationSec = meta.durationSec || 0;
      const publishedAt = v.publishedAt || meta.publishDate;
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
        thumbnail: v.thumbnail,
        genres: inferGenres(v.title, v.description),
        review: v.description || `Phim hoạt hình mới tuyển chọn từ kênh ${v.channelName}.`
      };
    });

    res.status(200).json({
      fetchedAt: new Date().toISOString(),
      count: enriched.length,
      videos: enriched
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live YouTube feed', details: String(err) });
  }
};
