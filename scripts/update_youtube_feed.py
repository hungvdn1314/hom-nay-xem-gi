#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hôm Nay Xem Gì - YouTube Auto-Update Engine
Fetches official YouTube RSS feeds for 8 partner channels + real video durations & publish dates.
Updates data.js, youtube_films_catalog.json, and bumps cache-busting query versions in index.html.
"""

import os
import re
import sys
import json
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

CHANNELS = [
    {
        "id": "thienphatreview",
        "name": "Thiên Phạt Review",
        "url": "https://www.youtube.com/@thienphatreview",
        "channel_id": "UClqQR_N39TFXI6JTcmbBG2Q"
    },
    {
        "id": "tieuho_review",
        "name": "Tiểu Hồ Review (Dorovietsub)",
        "url": "https://www.youtube.com/@Ti%E1%BB%83u-H%E1%BB%93_Review",
        "channel_id": "UCoygEVORiacAS8QvzBzzMFA"
    },
    {
        "id": "chiuchiusubtv",
        "name": "ChiuChiuSubTV",
        "url": "https://www.youtube.com/@chiuchiusubtv",
        "channel_id": "UCWsKmJAGnozzktv5A-duTaA"
    },
    {
        "id": "melacreview",
        "name": "Mễ Lạc Review",
        "url": "https://www.youtube.com/@M%E1%BB%85L%E1%BA%A1cReview",
        "channel_id": "UCP0FzR9sme0lqUrM3OL_GIQ"
    },
    {
        "id": "thienanhstudio9",
        "name": "Thiên Ảnh Studio",
        "url": "https://www.youtube.com/@thienanhstudio9",
        "channel_id": "UCVFqXLFQKYzCF0lusDImePA"
    },
    {
        "id": "hoathinhmonganh",
        "name": "Mộng Ảnh Studio",
        "url": "https://www.youtube.com/@HoatHinhMongAnh",
        "channel_id": "UCcD7v0pn8RcMdOan9fo4Djw"
    },
    {
        "id": "vanmonggiao",
        "name": "Vân Mộng Studio",
        "url": "https://www.youtube.com/@vanmonggiao",
        "channel_id": "UCwLnjvcUQTB4IDdSMYpYnew"
    },
    {
        "id": "tieusumuoi",
        "name": "Tiểu Sư Muội",
        "url": "https://www.youtube.com/@Tieusumuoi-u3e",
        "channel_id": "UCQBvrD7zKqhK0l11iTN_HgA"
    }
]

GENRE_KEYWORDS = {
    "Sinh tồn / Mạt thế": ["mạt thế", "sinh tồn", "huyết nguyệt", "thiên tai", "băng hà", "zombie", "quái dị", "tận thế"],
    "Xuyên không / Trọng sinh": ["trọng sinh", "xuyên không", "chuyển sinh", "kiếp trước", "sống lại", "xuyên về"],
    "Hệ thống / Thức tỉnh": ["hệ thống", "thức tỉnh", "bảng trạng thái", "bàn tay vàng", "gacha", "nâng cấp", "sign in", "điểm danh"],
    "Đô thị / Ngôn tình - Nghịch tập": ["đô thị", "phú nhị đại", "tổng tài", "ở rể", "phú bà", "nghịch tập", "vả mặt", "thần hào"],
    "Huyền huyễn / Tu tiên": ["tu tiên", "tu chân", "đế tôn", "tiên đế", "kiếm thần", "võ đạo", "võ hồn", "đan dược", "tông môn", "thần ma"],
    "Võ hiệp / Cổ trang": ["kiếm hiệp", "hoàng đế", "vương gia", "triều đình", "giang hồ", "cung đình"],
    "Hài hước / Giải trí": ["cá mặn", "tấu hài", "nằm lười", "bựa", "phá gia", "bá đạo"],
    "Khoa huyễn / Dị năng": ["khoa học", "cơ giáp", "vũ trụ", "dị năng", "dị thú", "tinh tế"]
}

PREFIX_PATTERN = re.compile(
    r'^(?:\s*(?:'
    r'\[[^\]]*\]|'
    r'【[^】]*】|'
    r'\((?:Phần|Tập|Mùa)\s*\d+[^)]*\)|'
    r'(?:Ful+l\s*)?(?:Phần|Tập|Mùa|P)\s*\d+(?:\s*[-–]\s*(?:P?\s*)?\d+)?\s*[\|\-:]?'
    r')\s*)+',
    flags=re.IGNORECASE
)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+100'
}


def parse_iso_utc(iso_str):
    """Parse ISO-8601 string into timezone-aware UTC datetime or None."""
    if not iso_str or not isinstance(iso_str, str):
        return None
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def max_iso_date(iso_a, iso_b):
    """Return the chronologically newer ISO string between two timestamps."""
    dt_a = parse_iso_utc(iso_a)
    dt_b = parse_iso_utc(iso_b)
    if dt_a and dt_b:
        return iso_a if dt_a >= dt_b else iso_b
    return iso_a or iso_b


def format_total_duration_vi(sec):
    """Format duration in concise Vietnamese (e.g. '6 giờ 29 phút' or '10 phút 58 giây')."""
    if not sec or sec <= 0:
        return "Đang cập nhật"
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    if h > 0:
        return f"{h} giờ {m:02d} phút"
    if m > 0:
        return f"{m} phút {s:02d} giây" if s > 0 else f"{m} phút"
    return f"{s} giây"


def format_part_duration_hms(sec):
    """Format episode duration as H:MM:SS or M:SS."""
    if not sec or sec <= 0:
        return ""
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def infer_genres(title, desc=""):
    text = (title + " " + desc).lower()
    matched = [g for g, kw_list in GENRE_KEYWORDS.items() if any(kw in text for kw in kw_list)]
    return matched[:2] if matched else ["Hoạt hình 2D/3D"]


def clean_core_title(title):
    s = PREFIX_PATTERN.sub('', title or '').strip()
    s = re.sub(r'\s*\((?:Phần|Tập|Mùa)\s*\d+[^)]*\)\s*$', '', s, flags=re.IGNORECASE)
    s = re.sub(r'^[\|\-:\s]+|[\|\-:\s]+$', '', s)
    return s.strip()


def hms_to_sec(text):
    """Convert H:MM:SS or M:SS duration string to integer seconds."""
    if not text:
        return 0
    try:
        nums = [int(x) for x in str(text).strip().split(":")]
        if len(nums) == 3:
            return nums[0] * 3600 + nums[1] * 60 + nums[2]
        if len(nums) == 2:
            return nums[0] * 60 + nums[1]
        return nums[0]
    except ValueError:
        return 0


def parse_part_info(text, default_prefix="Phần"):
    """
    Extract normalized episode prefix, range bounds, merge flag, and clean label
    from titles/labels such as 'Phần 1+2', 'Phần 1-3', 'TẬP 793+794', 'Phần 10.1', 'Mùa 5 - P2'.
    """
    s = re.sub(r'\[.*?\]', '', text or '').strip()

    # Handle season + part combination like 'Mùa 5 - P2'
    m_season_part = re.search(r'\bMùa\s*(\d+)\s*[-–|]\s*(?:Phần|P)\s*(\d+)', s, flags=re.IGNORECASE)
    if m_season_part:
        season_n = int(m_season_part.group(1))
        part_n = int(m_season_part.group(2))
        return {
            "prefix": "Mùa",
            "startNum": part_n,
            "endNum": part_n,
            "seasonNum": season_n,
            "subNum": 0,
            "isMerged": False,
            "label": f"Mùa {season_n} - P{part_n}",
        }

    # Handle decimal/sub-part like 'Phần 10.1'
    m_dec = re.search(r'\b(Phần|Tập|Mùa|P)\s*(\d+)\.(\d+)\b', s, flags=re.IGNORECASE)
    if m_dec:
        raw_kw = m_dec.group(1).lower()
        prefix = "Tập" if raw_kw == "tập" else ("Mùa" if raw_kw == "mùa" else "Phần")
        a = int(m_dec.group(2))
        b = int(m_dec.group(3))
        return {
            "prefix": prefix,
            "startNum": a,
            "endNum": a,
            "seasonNum": 0,
            "subNum": b,
            "isMerged": False,
            "label": f"{prefix} {a}.{b}",
        }

    # Handle single or chained merged episodes: 'Phần 1+2', 'Phần 1+2+3', 'Phần 1-3', 'TẬP 793+794'
    m_ep = re.search(
        r'\b(Phần|Tập|Mùa|P)\s*(\d+)((?:\s*[+\-–&]\s*(?:(?:Phần|Tập|Mùa|P)\s*)?\d+)*)',
        s,
        flags=re.IGNORECASE
    )
    if not m_ep:
        return None

    raw_kw = m_ep.group(1).lower()
    prefix = "Tập" if raw_kw == "tập" else ("Mùa" if raw_kw == "mùa" else ("Phần" if raw_kw in ("phần", "p") else default_prefix))
    first_num = int(m_ep.group(2))
    tail = m_ep.group(3) or ""

    # Parse chained numbers and separators
    chain_tokens = re.findall(r'([+\-–&])\s*(?:(?:Phần|Tập|Mùa|P)\s*)?(\d+)', tail, flags=re.IGNORECASE)
    if not chain_tokens:
        return {
            "prefix": prefix,
            "startNum": first_num,
            "endNum": first_num,
            "seasonNum": 0,
            "subNum": 0,
            "isMerged": False,
            "label": f"{prefix} {first_num}",
        }

    nums = [first_num] + [int(n) for _, n in chain_tokens]
    # Sub-part shorthand like 'Phần 10 - 1' where second number < first number
    if len(chain_tokens) == 1 and chain_tokens[0][0] in ("-", "–") and nums[1] < first_num:
        return {
            "prefix": prefix,
            "startNum": first_num,
            "endNum": first_num,
            "seasonNum": 0,
            "subNum": nums[1],
            "isMerged": False,
            "label": f"{prefix} {first_num}.{nums[1]}",
        }

    # Valid merged range only when sequence progresses upwards (e.g. 1+2, 1-3, 793+794)
    if nums[-1] > first_num:
        formatted_tail = "".join(
            f"{'-' if sep == '–' else sep}{num}"
            for sep, num in chain_tokens
        )
        return {
            "prefix": prefix,
            "startNum": first_num,
            "endNum": nums[-1],
            "seasonNum": 0,
            "subNum": 0,
            "isMerged": True,
            "label": f"{prefix} {first_num}{formatted_tail}",
        }

    return {
        "prefix": prefix,
        "startNum": first_num,
        "endNum": first_num,
        "seasonNum": 0,
        "subNum": 0,
        "isMerged": False,
        "label": f"{prefix} {first_num}",
    }


def parse_part_number(title):
    info = parse_part_info(title)
    return info["endNum"] if info else None


def normalize_part_label(part):
    """Ensure merged range labels are preserved cleanly while keeping redundancy notes."""
    raw_lbl = part.get("label") or ""
    note_match = re.search(r'(\s*\[[^\]]+\]\s*)$', raw_lbl)
    note_suffix = note_match.group(1) if note_match else ""
    clean_lbl = raw_lbl[:note_match.start()].strip() if note_match else raw_lbl.strip()

    lbl_info = parse_part_info(clean_lbl)
    ttl_info = parse_part_info(part.get("title") or "")

    # Prefer title's merged range if label dropped '+2' / '-3' etc., or if label lost Tập/Mùa prefix
    chosen = lbl_info
    if ttl_info:
        if not lbl_info:
            chosen = ttl_info
        elif ttl_info["isMerged"] and not lbl_info["isMerged"] and ttl_info["startNum"] == lbl_info["startNum"]:
            chosen = ttl_info
        elif ttl_info["isMerged"] and not lbl_info["isMerged"] and lbl_info["prefix"] == "Phần" and ttl_info["prefix"] in ("Tập", "Mùa"):
            chosen = ttl_info

    if chosen:
        return f"{chosen['label']}{note_suffix}", chosen
    return raw_lbl or f"Phần {part.get('index', 1)}", None


def part_sort_key(part, fallback_pos=0):
    """Sort parts monotonically: standalone episodes in order, merged compilations right after their end episode."""
    clean_lbl = re.sub(r'\s*\[[^\]]+\]\s*$', '', part.get("label") or "").strip()
    info = parse_part_info(clean_lbl) or parse_part_info(part.get("title") or "")
    pub_dt = parse_iso_utc(part.get("publishedAt")) or datetime.min.replace(tzinfo=timezone.utc)
    if info:
        return (
            info.get("seasonNum", 0),
            info["endNum"],
            1 if info["isMerged"] else 0,
            info["startNum"],
            info.get("subNum", 0),
            fallback_pos,
            pub_dt,
        )
    return (0, part.get("index", fallback_pos + 1), 0, part.get("index", fallback_pos + 1), 0, fallback_pos, pub_dt)


def fetch_channel_durations_browse(channel_id):
    """
    Fetch up to 100 latest video durations for a channel via YouTube Innertube browse API.
    Unlike /watch, /youtubei/v1/browse on VLUU... playlists is not blocked by cloud IP bot checks.
    """
    dur_map = {}
    if not channel_id or not channel_id.startswith("UC"):
        return dur_map
    uploads_playlist_id = f"VLUU{channel_id[2:]}"
    try:
        payload = json.dumps({
            "browseId": uploads_playlist_id,
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20241111.01.00"
                }
            }
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": HEADERS["User-Agent"]
            },
            method="POST"
        )
        txt = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", errors="ignore")
        for d_str, vid in re.findall(
            r'"thumbnailBadgeViewModel":\{"text":"([0-9:]+)"[^}]*"animationActivationTargetId":"([^"]+)"',
            txt
        ):
            sec = hms_to_sec(d_str)
            if sec > 0 and vid not in dur_map:
                dur_map[vid] = sec
        for vid, sec_str in re.findall(
            r'"playlistVideoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,2000}?"lengthSeconds":"(\d+)"',
            txt
        ):
            sec = int(sec_str)
            if sec > 0 and vid not in dur_map:
                dur_map[vid] = sec
    except Exception as e:
        print(f"  [Warning] Innertube browse failed for {channel_id}: {e}")
    return dur_map


def fetch_all_channel_durations(max_workers=8):
    """Concurrently collect recent video duration map across all 8 partner channels."""
    all_durations = {}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futs = {pool.submit(fetch_channel_durations_browse, ch["channel_id"]): ch["id"] for ch in CHANNELS}
        for fut in as_completed(futs):
            try:
                res = fut.result()
                for vid, sec in res.items():
                    if sec > 0 and vid not in all_durations:
                        all_durations[vid] = sec
            except Exception:
                pass
    return all_durations


def fetch_video_metadata(video_id):
    """Fetch real lengthSeconds and publishDate directly from YouTube watch page (local/fallback)."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
        m_len = re.search(r'"lengthSeconds":"(\d+)"', html)
        m_approx = re.search(r'"approxDurationMs":"(\d+)"', html) if not m_len else None
        m_pub = re.search(r'"publishDate":"([^"]+)"', html) or re.search(r'"uploadDate":"([^"]+)"', html)
        duration_sec = int(m_len.group(1)) if m_len else (round(int(m_approx.group(1)) / 1000) if m_approx else None)
        publish_iso = None
        if m_pub:
            dt = parse_iso_utc(m_pub.group(1))
            if dt:
                publish_iso = dt.isoformat()
        return {"durationSec": duration_sec, "publishDate": publish_iso}
    except Exception as e:
        print(f"  [Warning] Metadata fetch failed for {video_id}: {e}")
        return {"durationSec": None, "publishDate": None}


def batch_fetch_metadata(video_ids, known_durations=None, max_workers=10):
    """Fetch real durations & publish dates for a batch of video IDs concurrently."""
    known_durations = known_durations or {}
    unique_ids = list(dict.fromkeys(vid for vid in video_ids if vid))
    results = {}
    missing_ids = []
    for vid in unique_ids:
        if vid in known_durations and known_durations[vid] > 0:
            results[vid] = {"durationSec": known_durations[vid], "publishDate": None}
        else:
            missing_ids.append(vid)

    if not missing_ids:
        return results
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_map = {pool.submit(fetch_video_metadata, vid): vid for vid in missing_ids}
        for fut in as_completed(future_map):
            vid = future_map[fut]
            try:
                results[vid] = fut.result()
            except Exception:
                results[vid] = {"durationSec": None, "publishDate": None}
    return results


def fetch_channel_videos(channel_id):
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        xml_data = urllib.request.urlopen(req, timeout=15).read()
        root = ET.fromstring(xml_data)
        ns = {
            'atom': 'http://www.w3.org/2005/Atom',
            'yt': 'http://www.youtube.com/xml/schemas/2015',
            'media': 'http://search.yahoo.com/mrss/'
        }
        videos = []
        for entry in root.findall('atom:entry', ns):
            vid_elem = entry.find('yt:videoId', ns)
            title_elem = entry.find('atom:title', ns)
            pub_elem = entry.find('atom:published', ns)
            if vid_elem is None or title_elem is None:
                continue

            vid = vid_elem.text.strip()
            title = title_elem.text.strip()
            published = pub_elem.text.strip() if pub_elem is not None else datetime.now(timezone.utc).isoformat()

            desc = ""
            thumb = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
            mg = entry.find('media:group', ns)
            if mg is not None:
                d = mg.find('media:description', ns)
                if d is not None and d.text:
                    desc = d.text.strip()
                t = mg.find('media:thumbnail', ns)
                if t is not None and 'url' in t.attrib:
                    thumb = t.attrib['url']

            videos.append({
                "videoId": vid,
                "title": title,
                "published": published,
                "description": desc,
                "thumbnail": thumb
            })
        # Sort chronologically (oldest -> newest) so parts & updatedAt never overwrite backwards
        videos.sort(key=lambda v: parse_iso_utc(v["published"]) or datetime.min.replace(tzinfo=timezone.utc))
        return videos
    except Exception as e:
        print(f"  [Warning] Failed to fetch RSS for channel {channel_id}: {e}")
        return []


def recalculate_film_summary(film):
    """Recalculate parts labels, monotonic order, unique index (1..N), duration summary, and updatedAt."""
    parts = film.get("parts", [])
    if not parts:
        return

    # Normalize labels so merged ranges (e.g. 1+2, 793+794) are never truncated
    for p in parts:
        clean_lbl, _ = normalize_part_label(p)
        if clean_lbl:
            p["label"] = clean_lbl

    indexed_parts = list(enumerate(parts))
    indexed_parts.sort(key=lambda item: part_sort_key(item[1], fallback_pos=item[0]))
    sorted_parts = [item[1] for item in indexed_parts]

    for idx, p in enumerate(sorted_parts, start=1):
        p["index"] = idx

    film["parts"] = sorted_parts
    film["totalParts"] = len(sorted_parts)
    film["partsStr"] = f"{len(sorted_parts)} phần" if len(sorted_parts) > 1 else "1 phần (Phần 1)"

    total_sec = sum(p.get("duration", 0) for p in sorted_parts if not p.get("isRedundant") and p.get("duration"))
    if total_sec > 0:
        film["totalDurationSec"] = total_sec
        film["totalDurationStr"] = format_total_duration_vi(total_sec)

    # Keep chronologically newest timestamp across film + parts
    newest_ts = film.get("updatedAt") or film.get("publishedAt")
    for p in sorted_parts:
        newest_ts = max_iso_date(newest_ts, p.get("publishedAt"))
    if newest_ts:
        film["updatedAt"] = newest_ts
        dt = parse_iso_utc(newest_ts)
        film["isRecent24h"] = bool(dt and (datetime.now(timezone.utc) - dt).total_seconds() <= 86400)


def bump_html_cache_version(base_dir):
    """Update ?v=... cache buster query strings in index.html when data.js changes."""
    index_path = os.path.join(base_dir, "index.html")
    if not os.path.exists(index_path):
        return
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    ver = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    updated = re.sub(r'(src="(?:data|app)\.js)(?:\?v=[^"]*)?(")', rf'\1?v={ver}\2', html)
    updated = re.sub(r'(href="style\.css)(?:\?v=[^"]*)?(")', rf'\1?v={ver}\2', updated)
    if updated != html:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"[Auto-Update] Bumped asset cache version in index.html to v={ver}.")


def needs_duration_repair(part):
    """Check if a part has a placeholder 7200s ('2:00:00') or missing/zero duration."""
    dur = part.get("duration") or 0
    dur_str = part.get("durationStr") or ""
    if dur <= 0 or "Đang cập nhật" in dur_str:
        return True
    if dur == 7200 and dur_str == "2:00:00":
        return True
    return False


def repair_existing_catalog(films, browse_durations=None, fetch_watch_fallback=False, repair_parts=False):
    """
    Self-heal missing/placeholder durations (from browse_durations + optional watch fallback)
    and optionally normalize duplicate/misordered merged part indices & labels.
    """
    browse_durations = browse_durations or {}
    to_fetch = []
    for f in films:
        for p in f.get("parts", []):
            if needs_duration_repair(p):
                vid = p.get("id") or p.get("videoId")
                if vid and (vid in browse_durations or fetch_watch_fallback):
                    to_fetch.append(vid)

    meta_map = {}
    if to_fetch:
        unique_count = len(set(to_fetch))
        print(f"[Repair] Resolving real durations for {unique_count} missing/placeholder videos (fetch_watch_fallback={fetch_watch_fallback})...")
        if fetch_watch_fallback:
            meta_map = batch_fetch_metadata(to_fetch, known_durations=browse_durations, max_workers=10)
        else:
            meta_map = {vid: {"durationSec": browse_durations[vid], "publishDate": None} for vid in set(to_fetch) if vid in browse_durations}

    repaired_films = 0
    for f in films:
        changed = False
        parts = f.get("parts", [])
        for p in parts:
            vid = p.get("id") or p.get("videoId")
            if vid in meta_map and needs_duration_repair(p):
                info = meta_map[vid]
                if info.get("durationSec") and info["durationSec"] > 0:
                    p["duration"] = info["durationSec"]
                    p["durationStr"] = format_part_duration_hms(info["durationSec"])
                    changed = True
                if info.get("publishDate") and not p.get("publishedAt"):
                    p["publishedAt"] = info["publishDate"]
                    changed = True

        # Always auto-repair films with duplicate part.index or stale "Đang cập nhật" when total > 0
        idxs = [p.get("index") for p in parts]
        has_dup_idx = len(set(idxs)) != len(idxs)
        has_missing_total = ("Đang cập nhật" in (f.get("totalDurationStr") or "")) and any((p.get("duration") or 0) > 0 for p in parts)

        if repair_parts:
            before_snapshot = [(p.get("index"), p.get("label"), p.get("id")) for p in parts]
            recalculate_film_summary(f)
            after_snapshot = [(p.get("index"), p.get("label"), p.get("id")) for p in f.get("parts", [])]
            if after_snapshot != before_snapshot:
                changed = True
        elif changed or has_dup_idx or has_missing_total:
            recalculate_film_summary(f)
            changed = True

        if changed:
            repaired_films += 1

    if repaired_films > 0:
        print(f"[Repair] Repaired durations and/or part numbering on {repaired_films} films.")
    return repaired_films


def main():
    do_backfill = "--backfill" in sys.argv
    do_repair_parts = "--repair-parts" in sys.argv or do_backfill
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_js_path = os.path.join(base_dir, "data.js")
    catalog_json_path = os.path.join(base_dir, "youtube_films_catalog.json")

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting YouTube Auto-Update (backfill={do_backfill}, repair_parts={do_repair_parts})...")

    if not os.path.exists(data_js_path):
        print(f"[Error] data.js not found at {data_js_path}")
        return

    with open(data_js_path, "r", encoding="utf-8") as f:
        js_text = f.read()

    start_idx = js_text.find("{")
    end_idx = js_text.rfind("}")
    if start_idx == -1 or end_idx == -1:
        print("[Error] Could not parse window.FILMS_DATA from data.js")
        return

    data = json.loads(js_text[start_idx:end_idx + 1])
    films = data.get("films", [])
    stats = data.get("stats", {})

    # Pre-fetch duration map for all 8 channels via Innertube browse (works on cloud datacenter IPs)
    browse_durations = fetch_all_channel_durations(max_workers=8)
    print(f"[Browse] Collected {len(browse_durations)} video durations across 8 channels.")

    repaired_count = repair_existing_catalog(
        films,
        browse_durations=browse_durations,
        fetch_watch_fallback=do_backfill,
        repair_parts=do_repair_parts
    )

    # Build lookup index of all known video IDs
    existing_video_ids = set()
    max_film_num = 0
    for f in films:
        m = re.search(r'film_(\d+)', f.get("id", ""))
        if m:
            max_film_num = max(max_film_num, int(m.group(1)))
        for p in f.get("parts", []):
            vid = p.get("id") or p.get("videoId")
            if vid:
                existing_video_ids.add(vid)

    print(f"Loaded {len(films)} films with {len(existing_video_ids)} known video IDs. Max ID: film_{max_film_num}")

    # Step 1: Collect new videos across all 8 channels from RSS
    pending_by_channel = []
    new_vids_to_fetch = []
    for ch in CHANNELS:
        videos = fetch_channel_videos(ch["channel_id"])
        print(f"Channel '{ch['name']}': {len(videos)} RSS entries.")
        fresh = [v for v in videos if v["videoId"] not in existing_video_ids]
        if fresh:
            pending_by_channel.append((ch, fresh))
            new_vids_to_fetch.extend(v["videoId"] for v in fresh)

    # Step 2: Resolve durations (from browse_durations first, /watch fallback for uncovered IDs)
    meta_map = batch_fetch_metadata(new_vids_to_fetch, known_durations=browse_durations, max_workers=10) if new_vids_to_fetch else {}

    new_films_count = 0
    new_parts_count = 0
    new_films_list = []

    for ch, fresh_videos in pending_by_channel:
        ch_id = ch["id"]
        ch_name = ch["name"]

        for v in fresh_videos:
            vid = v["videoId"]
            if vid in existing_video_ids:
                continue

            info = meta_map.get(vid, {})
            real_sec = info.get("durationSec") or 0
            # Prefer RSS published UTC (matches watch publishDate cleanly) or watch publishDate
            v_pub = v["published"] or info.get("publishDate")
            v_title = v["title"]
            v_desc = v["description"]
            v_thumb = v["thumbnail"]

            core_title = clean_core_title(v_title)
            part_info = parse_part_info(v_title)
            part_num = part_info["endNum"] if part_info else None
            part_label = part_info["label"] if part_info else "Phần 1"

            # Attempt to merge into an existing series on the same channel
            matched_film = None
            if part_num and part_num > 1 and len(core_title) >= 10:
                for ef in films + new_films_list:
                    if ef.get("channelId") == ch_id:
                        ef_core = clean_core_title(ef.get("title", ""))
                        if len(ef_core) >= 10 and (ef_core in core_title or core_title in ef_core):
                            matched_film = ef
                            break

            part_dur_str = format_part_duration_hms(real_sec)

            if matched_film:
                existing_parts = matched_film.get("parts", [])
                new_idx = len(existing_parts) + 1
                new_part = {
                    "index": new_idx,
                    "label": part_info["label"] if part_info else f"Phần {new_idx}",
                    "title": v_title,
                    "url": f"https://www.youtube.com/watch?v={vid}",
                    "id": vid,
                    "duration": real_sec,
                    "durationStr": part_dur_str,
                    "publishedAt": v_pub,
                    "isRedundant": False
                }
                existing_parts.append(new_part)
                matched_film["parts"] = existing_parts
                recalculate_film_summary(matched_film)
                existing_video_ids.add(vid)
                new_parts_count += 1
                print(f"  [+] Added {new_part['label']} ({part_dur_str or 'N/A'}) to: '{matched_film['title']}' ({vid})")
            else:
                max_film_num += 1
                film_id = f"film_{max_film_num}"
                genres = infer_genres(v_title, v_desc)
                total_dur_str = format_total_duration_vi(real_sec)
                new_film = {
                    "id": film_id,
                    "title": v_title,
                    "channelId": ch_id,
                    "channelName": ch_name,
                    "channelUrl": ch["url"],
                    "playlistUrl": None,
                    "totalParts": 1,
                    "partsStr": "1 phần (Phần 1)",
                    "totalDurationSec": real_sec,
                    "totalDurationStr": total_dur_str,
                    "review": v_desc[:200] if v_desc else f"Phim hoạt hình mới tuyển chọn từ kênh {ch_name}.",
                    "genres": genres,
                    "thumbnail": v_thumb,
                    "publishedAt": v_pub,
                    "updatedAt": v_pub,
                    "isRecent24h": True,
                    "parts": [
                        {
                            "index": 1,
                            "label": part_label,
                            "title": v_title,
                            "url": f"https://www.youtube.com/watch?v={vid}",
                            "id": vid,
                            "duration": real_sec,
                            "durationStr": part_dur_str,
                            "publishedAt": v_pub,
                            "isRedundant": False
                        }
                    ]
                }
                new_films_list.append(new_film)
                existing_video_ids.add(vid)
                new_films_count += 1
                print(f"  [+] New Film ({total_dur_str}): '{v_title}' ({vid})")

    total_changes = new_films_count + new_parts_count + repaired_count
    if total_changes == 0:
        print("[Auto-Update] Everything is up to date! No new videos or repairs needed.")
        return

    # Sort newly created films newest-first before prepending
    new_films_list.sort(key=lambda f: parse_iso_utc(f.get("updatedAt")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    data["films"] = new_films_list + films

    stats["totalFilms"] = len(data["films"])
    stats["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    data["stats"] = stats

    with open(data_js_path, "w", encoding="utf-8") as f:
        f.write(f"window.FILMS_DATA = {json.dumps(data, ensure_ascii=False, indent=2)};\n")
    print(f"[Auto-Update] Saved '{data_js_path}'.")

    if os.path.exists(catalog_json_path):
        with open(catalog_json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[Auto-Update] Saved '{catalog_json_path}'.")

    bump_html_cache_version(base_dir)
    print(f"\n[Summary] Added {new_films_count} films, {new_parts_count} parts, repaired {repaired_count} films.")


if __name__ == "__main__":
    main()
