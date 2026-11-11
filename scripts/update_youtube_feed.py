#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hôm Nay Xem Gì - YouTube Auto-Update Engine
Fetches official YouTube RSS feeds for 8 partner channels.
Detects new videos or new episodes/parts and updates data.js and youtube_films_catalog.json.
Runs automatically every 30 minutes via GitHub Actions.
"""

import os
import re
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# 8 Partner Channels with verified Channel IDs
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

def infer_genres(title, desc=""):
    text = (title + " " + desc).lower()
    matched = []
    for genre, kw_list in GENRE_KEYWORDS.items():
        if any(kw in text for kw in kw_list):
            matched.append(genre)
    if not matched:
        matched.append("Hoạt hình 2D/3D")
    return matched[:2]

def clean_core_title(title):
    # Remove prefix tags like [Phần 1], Phần 2-4 |, Tập 1:, etc.
    s = re.sub(r'^\s*(\[.*?\]|\bPhần\s*\d+(-\d+)?\s*\|?|\bTập\s*\d+(-\d+)?\s*:?)\s*', '', title, flags=re.IGNORECASE)
    # Remove trailing episode notes
    s = re.sub(r'\s*(\(Phần\s*\d+.*\)|\(Tập\s*\d+.*\))\s*$', '', s, flags=re.IGNORECASE)
    return s.strip()

def parse_part_number(title):
    m = re.search(r'(?:Phần|Tập)\s*(\d+)', title, flags=re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None

def fetch_channel_videos(channel_id):
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    try:
        req = urllib.request.Request(url, headers=headers)
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
            
            vid = vid_elem.text
            title = title_elem.text.strip()
            published = pub_elem.text if pub_elem is not None else datetime.now(timezone.utc).isoformat()
            
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
        return videos
    except Exception as e:
        print(f"  [Warning] Failed to fetch RSS for channel {channel_id}: {e}")
        return []

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_js_path = os.path.join(base_dir, "data.js")
    catalog_json_path = os.path.join(base_dir, "youtube_films_catalog.json")

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting YouTube Auto-Update...")

    if not os.path.exists(data_js_path):
        print(f"[Error] data.js not found at {data_js_path}")
        return

    with open(data_js_path, "r", encoding="utf-8") as f:
        js_text = f.read()

    # Extract JSON object from window.FILMS_DATA = {...};
    start_idx = js_text.find("{")
    end_idx = js_text.rfind("}")
    if start_idx == -1 or end_idx == -1:
        print("[Error] Could not parse window.FILMS_DATA from data.js")
        return

    data = json.loads(js_text[start_idx:end_idx + 1])
    films = data.get("films", [])
    stats = data.get("stats", {})

    # Collect all existing video IDs to avoid duplicates
    existing_video_ids = set()
    max_film_num = 0

    for f in films:
        fid = f.get("id", "")
        m = re.search(r'film_(\d+)', fid)
        if m:
            max_film_num = max(max_film_num, int(m.group(1)))
        
        parts = f.get("parts", [])
        for p in parts:
            vid = p.get("id") or p.get("videoId")
            if vid:
                existing_video_ids.add(vid)

    print(f"Loaded {len(films)} films with {len(existing_video_ids)} known video IDs. Max ID: film_{max_film_num}")

    new_films_count = 0
    new_parts_count = 0
    new_films_list = []

    for ch in CHANNELS:
        ch_id = ch["id"]
        ch_name = ch["name"]
        yt_cid = ch["channel_id"]
        print(f"Scanning channel '{ch_name}' ({yt_cid})...")
        videos = fetch_channel_videos(yt_cid)
        print(f"  Found {len(videos)} videos in RSS feed.")

        for v in videos:
            vid = v["videoId"]
            if vid in existing_video_ids:
                continue

            # This is a new video!
            v_title = v["title"]
            v_pub = v["published"]
            v_desc = v["description"]
            v_thumb = v["thumbnail"]
            core_title = clean_core_title(v_title)
            part_num = parse_part_number(v_title)

            # Check if this video belongs to an existing multi-part film of this channel
            matched_film = None
            if part_num and part_num > 1:
                for ef in films:
                    if ef.get("channelId") == ch_id:
                        ef_core = clean_core_title(ef.get("title", ""))
                        if ef_core and (ef_core in core_title or core_title in ef_core):
                            matched_film = ef
                            break

            if matched_film:
                # Add as new part to existing film
                existing_parts = matched_film.get("parts", [])
                new_idx = len(existing_parts) + 1
                new_part = {
                    "index": part_num or new_idx,
                    "label": f"Phần {part_num or new_idx}",
                    "title": v_title,
                    "url": f"https://www.youtube.com/watch?v={vid}",
                    "id": vid,
                    "duration": 7200,
                    "durationStr": "2:00:00",
                    "isRedundant": False
                }
                existing_parts.append(new_part)
                matched_film["parts"] = existing_parts
                matched_film["totalParts"] = len(existing_parts)
                matched_film["updatedAt"] = v_pub
                matched_film["isRecent24h"] = True
                existing_video_ids.add(vid)
                new_parts_count += 1
                print(f"  [+] Added Part {part_num} to film: '{matched_film['title']}' ({vid})")
            else:
                # Create a new film entry
                max_film_num += 1
                film_id = f"film_{max_film_num}"
                genres = infer_genres(v_title, v_desc)
                new_film = {
                    "id": film_id,
                    "title": v_title,
                    "channelId": ch_id,
                    "channelName": ch_name,
                    "channelUrl": ch["url"],
                    "playlistUrl": None,
                    "totalParts": 1,
                    "partsStr": "1 phần (Phần 1)",
                    "totalDurationSec": 7200,
                    "totalDurationStr": "2 giờ 00 phút",
                    "review": v_desc[:200] if v_desc else f"Phim hoạt hình mới tuyển chọn từ kênh {ch_name}.",
                    "genres": genres,
                    "thumbnail": v_thumb,
                    "publishedAt": v_pub,
                    "updatedAt": v_pub,
                    "isRecent24h": True,
                    "parts": [
                        {
                            "index": 1,
                            "label": "Phần 1",
                            "title": v_title,
                            "url": f"https://www.youtube.com/watch?v={vid}",
                            "id": vid,
                            "duration": 7200,
                            "durationStr": "2:00:00",
                            "isRedundant": False
                        }
                    ]
                }
                new_films_list.append(new_film)
                existing_video_ids.add(vid)
                new_films_count += 1
                print(f"  [+] Discovered New Film: '{v_title}' ({vid})")

    total_changes = new_films_count + new_parts_count
    if total_changes == 0:
        print("[Auto-Update] Everything is up to date! No new videos or parts found.")
        return

    # Prepend newly discovered films to catalog so they appear first
    if new_films_list:
        data["films"] = new_films_list + films
    else:
        data["films"] = films

    # Update stats
    stats["totalFilms"] = len(data["films"])
    stats["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    data["stats"] = stats

    # Write safely back to data.js
    new_js_content = f"window.FILMS_DATA = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    with open(data_js_path, "w", encoding="utf-8") as f:
        f.write(new_js_content)
    print(f"[Auto-Update] Successfully updated '{data_js_path}'.")

    # If catalog JSON exists, update it as well
    if os.path.exists(catalog_json_path):
        with open(catalog_json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[Auto-Update] Successfully updated '{catalog_json_path}'.")

    print(f"\n[Summary] Auto-Update complete! Added {new_films_count} new films and {new_parts_count} new episodes.")

if __name__ == "__main__":
    main()
