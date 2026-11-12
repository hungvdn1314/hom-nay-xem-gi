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


def parse_part_number(title):
    m = re.search(r'(?:Phần|Tập|Mùa|P)\s*(\d+)', title or '', flags=re.IGNORECASE)
    return int(m.group(1)) if m else None


def fetch_video_metadata(video_id):
    """Fetch real lengthSeconds and publishDate directly from YouTube watch page."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
        m_len = re.search(r'"lengthSeconds":"(\d+)"', html)
        m_pub = re.search(r'"publishDate":"([^"]+)"', html) or re.search(r'"uploadDate":"([^"]+)"', html)
        duration_sec = int(m_len.group(1)) if m_len else None
        publish_iso = None
        if m_pub:
            dt = parse_iso_utc(m_pub.group(1))
            if dt:
                publish_iso = dt.isoformat()
        return {"durationSec": duration_sec, "publishDate": publish_iso}
    except Exception as e:
        print(f"  [Warning] Metadata fetch failed for {video_id}: {e}")
        return {"durationSec": None, "publishDate": None}


def batch_fetch_metadata(video_ids, max_workers=10):
    """Fetch real durations & publish dates for a batch of video IDs concurrently."""
    unique_ids = list(dict.fromkeys(vid for vid in video_ids if vid))
    results = {}
    if not unique_ids:
        return results
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_map = {pool.submit(fetch_video_metadata, vid): vid for vid in unique_ids}
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
    """Recalculate parts order, totalDurationSec, totalDurationStr, partsStr, and max updatedAt."""
    parts = film.get("parts", [])
    if not parts:
        return

    parts.sort(key=lambda p: (p.get("index", 0), parse_iso_utc(p.get("publishedAt")) or datetime.min.replace(tzinfo=timezone.utc)))
    film["parts"] = parts
    film["totalParts"] = len(parts)
    film["partsStr"] = f"{len(parts)} phần" if len(parts) > 1 else "1 phần (Phần 1)"

    total_sec = sum(p.get("duration", 0) for p in parts if not p.get("isRedundant") and p.get("duration"))
    if total_sec > 0:
        film["totalDurationSec"] = total_sec
        film["totalDurationStr"] = format_total_duration_vi(total_sec)

    # Keep chronologically newest timestamp across film + parts
    newest_ts = film.get("updatedAt") or film.get("publishedAt")
    for p in parts:
        newest_ts = max_iso_date(newest_ts, p.get("publishedAt"))
    if newest_ts:
        film["updatedAt"] = newest_ts
        film["isRecent24h"] = True


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


def backfill_placeholder_durations(films):
    """Repair existing RSS-added films/parts whose duration was hardcoded to 7200s ('2:00:00')."""
    to_fetch = []
    for f in films:
        for p in f.get("parts", []):
            if p.get("duration") == 7200 and p.get("durationStr") == "2:00:00":
                to_fetch.append(p.get("id") or p.get("videoId"))

    if not to_fetch:
        return 0

    print(f"[Backfill] Fetching real YouTube metadata for {len(to_fetch)} placeholder videos...")
    meta_map = batch_fetch_metadata(to_fetch, max_workers=10)
    repaired_films = 0

    for f in films:
        changed = False
        for p in f.get("parts", []):
            vid = p.get("id") or p.get("videoId")
            if vid in meta_map and p.get("duration") == 7200 and p.get("durationStr") == "2:00:00":
                info = meta_map[vid]
                if info["durationSec"] and info["durationSec"] > 0:
                    p["duration"] = info["durationSec"]
                    p["durationStr"] = format_part_duration_hms(info["durationSec"])
                    changed = True
                if info["publishDate"] and not p.get("publishedAt"):
                    p["publishedAt"] = info["publishDate"]
                    changed = True
        if changed:
            recalculate_film_summary(f)
            repaired_films += 1

    print(f"[Backfill] Repaired real durations & ordering on {repaired_films} films.")
    return repaired_films


def main():
    do_backfill = "--backfill" in sys.argv
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_js_path = os.path.join(base_dir, "data.js")
    catalog_json_path = os.path.join(base_dir, "youtube_films_catalog.json")

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting YouTube Auto-Update (backfill={do_backfill})...")

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

    repaired_count = backfill_placeholder_durations(films) if do_backfill else 0

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

    # Step 2: Concurrently fetch real YouTube durations & publish dates for all new videos
    meta_map = batch_fetch_metadata(new_vids_to_fetch, max_workers=10) if new_vids_to_fetch else {}

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
            part_num = parse_part_number(v_title)

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
                    "index": part_num or new_idx,
                    "label": f"Phần {part_num or new_idx}",
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
                print(f"  [+] Added Part {part_num} ({part_dur_str or 'N/A'}) to: '{matched_film['title']}' ({vid})")
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
                            "index": part_num or 1,
                            "label": f"Phần {part_num or 1}",
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
