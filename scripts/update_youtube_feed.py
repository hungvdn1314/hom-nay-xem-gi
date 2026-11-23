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
from datetime import datetime, timedelta, timezone

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
    },
    # --- Auto-discovered & vetted by the 3D Channel Quality Gate (see --discover-channels) ---
    {"id": "hh3dtrungquoc", "name": "Anime 3D Trung Quốc", "url": "https://www.youtube.com/@HH3dTrungQuocAI", "channel_id": "UCX6GJ_ErLHnogg5Xhrvh8_Q"},
    {"id": "zzzphim", "name": "Zzzphim", "url": "https://www.youtube.com/@Zzzphim", "channel_id": "UCkaKs808Jt2Mi9F-HJ0OmuQ"},
    {"id": "gianhireview", "name": "Gia Nhi Review", "url": "https://www.youtube.com/@GiaNhiReview", "channel_id": "UC58tvj8MyrryZ8Cci8nR_KA"},
    {"id": "kasvietsub", "name": "Kas Vietsub", "url": "https://www.youtube.com/@KasVietsub", "channel_id": "UCf-of2R81KFAFki2SkkIsBg"},
    {"id": "mycherrysub", "name": "MyCherrySub", "url": "https://www.youtube.com/@MyCherrySub", "channel_id": "UC_Uo_2YxT471EiDlhJQri7A"},
    {"id": "soradub", "name": "Sora Dub", "url": "https://www.youtube.com/@SoraDub28", "channel_id": "UCWw04AdPsuaf59SSjQHTTnw"},
    {"id": "tieumuoingontinh", "name": "Tiểu Muội Ngôn Tình", "url": "https://www.youtube.com/@TieuMuoiNgonTinh", "channel_id": "UCS06BV2A7a_75mmB-KMjAiw"},
    {"id": "cibiisub", "name": "CibiiSub", "url": "https://www.youtube.com/@CibiiSub-01", "channel_id": "UCoDbjVH_qTL7EvtEkTNpEzw"},
    {"id": "nguyentuongvietsub", "name": "Nguyễn Tường Vietsub", "url": "https://www.youtube.com/@Nguyentuongvietsub", "channel_id": "UC1lnWK-xwvUT1NVNT6N0FRw"},
    {"id": "huyensutieumuoi", "name": "Huyền Sư Tiểu Muội", "url": "https://www.youtube.com/@Huy%E1%BB%81nS%C6%B0Ti%E1%BB%83uMu%E1%BB%99i", "channel_id": "UCitGIROZ_grgO-ki_GZHs2A"},
    {"id": "2ksub", "name": "2K Sub", "url": "https://www.youtube.com/@2KSUB2000", "channel_id": "UCOt427I8MNYQubeVLWqdn_g"},
    {"id": "naophangtutien", "name": "Não Phẳng Tu Tiên", "url": "https://www.youtube.com/@nao-phang", "channel_id": "UCZFxno6YgiW4rIJb534B6TQ"},
    {"id": "hoatrenmay3d", "name": "Hoa Trên Mây", "url": "https://www.youtube.com/@hoatrenmay3D", "channel_id": "UCO9uFz0jJC8YP60gLKwJJJQ"},
    {"id": "hhanime", "name": "HHANIME CHANNEL", "url": "https://www.youtube.com/@hhanimeofficial", "channel_id": "UCP234GZcF-iOcYhImDCLQdQ"},
    {"id": "daudauvietsub", "name": "Đậu Đậu Vietsub", "url": "https://www.youtube.com/@daudau.vietsub", "channel_id": "UCuJieQ2VOPxm1GVKvepWioA"},
    {"id": "godsub", "name": "GodSub", "url": "https://www.youtube.com/@Godsub01", "channel_id": "UCnMTOk0TmPP49n7HMoRe9-w"},
    {"id": "phimzooai", "name": "Phim Zoo AI", "url": "https://www.youtube.com/@PhimZooAI", "channel_id": "UCaJF3EewrPYPb1rHpSUKtDA"},
    {"id": "nhatanhstudio", "name": "Nhật Ảnh Studio", "url": "https://www.youtube.com/@StudioCitraMentari", "channel_id": "UC9ymEAdoYS17Vtkk8B60mCw"},
    {"id": "vananhstudio", "name": "Vạn Ảnh Studio", "url": "https://www.youtube.com/@vananhanhstudio", "channel_id": "UCYjCN2YydxT6UaRlE7t83jQ"}
]

DISCOVERY_QUERIES = [
    "Studio Full Phần 1 Xuyên Không Thức Tỉnh Hệ Thống",
    "Studio Hoạt Hình 3D Trọn Bộ Thuyết Minh",
    "Review Hoạt Hình 3D Full Mùa 1 Hệ Thống",
    "Full Phần 1 Tu Tiên Nghịch Thiên hoạt hình 3D thuyết minh",
    "Trọn Bộ Hoạt Hình 3D Mạt Thế Trọng Sinh thuyết minh",
]

# Weighted canonical 3D genres (Tier 1 world/theme scores higher than Tier 2 trope modifiers)
GENRE_RULES = [
    ("Tu tiên / Huyền huyễn", 3.0, 1.0, [
        "tu tiên", "tu chân", "đế tôn", "tiên đế", "kiếm tiên", "kiếm thần", "kiếm tông",
        "linh căn", "trúc cơ", "nguyên anh", "kim đan", "độ kiếp", "phi thăng", "lão tổ",
        "sư tôn", "sư muội", "sư huynh", "sư đệ", "sư thúc", "đại sư huynh", "đạo hữu",
        "thánh địa", "tông môn", "tông chủ", "ma tôn", "nữ đế", "thần ma", "thần thánh",
        "trường sinh", "cẩu đạo", "vạn giới", "chư thiên", "đại đế", "thần đỉnh", "hồng hoang",
        "huyền huyễn", "tiên giới", "thần giới", "huyết mạch", "đột phá", "phàm nhân",
        "bất tử", "thiên kiêu", "pháp bảo", "thiên đạo", "tu đạo", "đạo sĩ", "đạo sỹ",
        "thánh nữ", "đại lão", "càn khôn", "luyện khí", "nghịch thiên", "luyện đan",
        "khổ tu", "xuất thế", "trảm thần", "phần quyết", "thần kiếm", "đan đạo", "tiên tôn",
        "kiếm cốt", "huyền giới", "tổ sư", "tổ sư gia", "vô lượng", "bảo tháp", "phàm trần",
        "tu luyện", "vô địch", "cường giả", "chân nhân", "pháp tướng", "chưởng môn", "đan sư",
        "linh tuyền", "thể chất", "bá thể", "đại năng", "hóa thần", "ngưng khí", "hoàng tuyền",
        "giáo chủ", "ngự khí", "thiên kiếp", "lôi kiếp", "đế quốc tu chân", "đan điền", "huyền môn"
    ]),
    ("Quỷ dị / Linh dị", 3.0, 1.0, [
        "quỷ dị", "linh dị", "lệ quỷ", "quái đàm", "quy tắc", "trấn linh", "bắt quỷ",
        "huyền học", "phong thủy", "bói toán", "cương thi", "minh hôn", "diêm quân",
        "tà thần", "yêu ma", "trấn ma", "quỷ thần", "kinh dị", "trừ tà", "thiên sư",
        "xem tướng", "pháp sư", "ngự quỷ", "ngụy nhân", "ác quỷ", "hồn ma", "bóng đè",
        "cõi âm", "quỷ giới", "âm giới", "minh giới", "vớt xác", "nghiệp chướng", "trấn tà",
        "hung trạch", "nhà ma", "oan hồn", "cúng bái"
    ]),
    ("Sinh tồn / Mạt thế", 3.0, 1.0, [
        "mạt thế", "tận thế", "sinh tồn", "zombie", "thiên tai", "băng hà", "cực hàn",
        "huyết nguyệt", "đại hồng thủy", "sương mù", "biển sâu", "đảo hoang", "sa mạc",
        "tích trữ vật tư", "nơi trú ẩn", "bè gỗ", "cao tốc", "chết đói", "cứu thế", "phóng xạ"
    ]),
    ("Ngự thú / Tiến hóa", 3.0, 1.0, [
        "ngự thú", "thần sủng", "linh thú", "thú cưng", "khế ước thú", "triệu hồi thú",
        "trùng tộc", "tiến hóa", "đột biến", "thôn phệ", "nuốt chửng", "nuốt thịt", "hóa long",
        "cự long", "bạch xà", "dị thú", "quái thú", "pokémon", "sủng vật", "thú triều", "tinh thể thú"
    ]),
    ("Trò chơi / Phó bản", 3.0, 1.0, [
        "trò chơi", "phó bản", "chuyển chức", "toàn dân", "người chơi", "game", "lãnh chúa",
        "lĩnh chủ", "thẻ bài", "vực sâu", "cày cấp", "boss", "nghề nghiệp",
        "mạnh nhất server", "quân đoàn", "vong linh", "triệu hồi", "top 1 server", "hộp mù",
        "treo máy", "afk", "server", "toàn server", "chiến đội", "kỵ sĩ", "nền văn minh",
        "lãnh địa", "chiếm cứ", "xây dựng căn cứ"
    ]),
    ("Cao võ / Dị năng", 3.0, 1.0, [
        "cao võ", "cao vũ", "võ giả", "võ đạo", "võ hồn", "dị năng", "thức tỉnh năng lực",
        "học viện", "cơ giáp", "tinh tế", "vũ trụ", "khoa huyễn", "siêu phàm", "sát thủ",
        "đặc công", "võ thần", "võ đế", "võ thuật", "tuyệt thế", "cao thủ", "chiến thần",
        "khí huyết", "năng lực", "quyền tu", "thần binh"
    ]),
    ("Đô thị / Ngôn tình", 3.0, 1.0, [
        "đô thị", "tổng tài", "phú nhị đại", "thần hào", "hào môn", "thiên kim", "phu nhân",
        "thất gia", "bạc tỷ", "vợ cũ", "hôn nhân", "ly hôn", "kết hôn", "sủng", "thanh mai",
        "nam thần", "hoa khôi", "bác sĩ", "nghịch tập", "vả mặt", "ở rể", "chàng rể", "phản diện",
        "nữ phụ", "thế thân", "bạch nguyệt quang", "tứ gia", "tam gia", "nhị gia", "bá đạo",
        "đại học", "học đường", "trường học", "nữ tổng", "tài phiệt", "giàu nhất", "đổi đời",
        "tiểu thư", "bạch liên hoa", "tra nam", "bình hoa", "show", "nghệ sĩ", "minh tinh",
        "bạn trai", "bạn gái", "chia tay", "hẹn hò", "tỷ phú", "triệu phú", "chủ tịch",
        "trưởng khoa", "ảnh đế", "ảnh hậu", "showbiz", "trùm trường", "ở ghép", "phá sản",
        "cưng chiều", "nuông chiều", "nữ chính", "nam chính", "pháo hôi", "thanh xuân",
        "thế gia", "thiếu gia", "đại thiếu", "nhị thiếu", "đòi nợ", "shipper", "diva"
    ]),
    ("Võ hiệp / Cổ trang", 3.0, 1.0, [
        "cổ đại", "cổ trang", "hoàng đế", "vương gia", "thái tử", "hoàng tử", "công chúa",
        "triều đình", "giang hồ", "kiếm hiệp", "võ hiệp", "nương tử", "tướng quân", "phò mã",
        "tể tướng", "trường an", "đại càn", "lưu đày", "khai hoang", "biên ải", "tửu lâu",
        "quán ăn", "hoàng phi", "cung đấu", "nhiếp chính vương", "trấn quốc", "đại tướng quân",
        "hầu tước", "hầu gia", "hầu phủ", "chiến vương", "thế tử", "quận chúa", "vương phi",
        "nhiếp chính", "chạy nạn", "đổi hôn", "gả cho", "phu quân", "biên thành", "kinh thành",
        "nha môn", "thần bổ", "đồ tể", "man di", "chiến trường cổ đại"
    ]),
    ("Hệ thống / Thức tỉnh", 1.5, 0.5, [
        "hệ thống", "thức tỉnh", "bảng trạng thái", "bàn tay vàng", "kim thủ chỉ", "điểm danh",
        "đăng nhập", "mô phỏng", "quay thưởng", "gacha", "rút thẻ", "nâng cấp", "cường hóa",
        "thương thành", "bồi thường", "vạn lần", "tối cường", "cấp sss", "sss+", "sss",
        "bật hack", "hack", "kích hoạt", "thần cấp"
    ]),
    ("Xuyên không / Trọng sinh", 1.5, 0.5, [
        "xuyên không", "trọng sinh", "trùng sinh", "chuyển sinh", "xuyên sách", "xuyên vào",
        "xuyên làm", "xuyên qua", "xuyên tới", "tái sinh", "kiếp trước", "sống lại",
        "xuyên về", "luân hồi", "trở về", "xuyên hai giới", "xuyên tống", "hoán đổi",
        "trở lại", "chuyển thế", "người xuyên việt"
    ]),
]

PRESERVE_WORDS = {'SSS+', 'SSS', 'SS1', 'SS2', 'SS3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P1-2', 'P1-3', 'P1-4', 'P1-5', 'P1-10', 'AI', '2D', '3D', 'FULL', 'END', 'TOP'}

def soften_caps_title(title):
    if not title:
        return ""
    alpha = [c for c in title if c.isalpha()]
    if not alpha:
        return title
    upper_ratio = sum(1 for c in alpha if c.isupper()) / len(alpha)
    if upper_ratio < 0.75:
        return title
    def soften_segment(seg):
        words = seg.split(' ')
        out = []
        for w in words:
            clean_w = re.sub(r'^[^\w]+|[^\w]+$', '', w)
            if clean_w.upper() in PRESERVE_WORDS or re.match(r'^\d+[Hh]$', clean_w):
                out.append(w)
            elif re.match(r'^(P\d+|TẬP\d+|MÙA\d+)$', clean_w, re.I):
                out.append(w.capitalize())
            else:
                out.append(w.capitalize() if len(clean_w) > 0 else w)
        return ' '.join(out)
    parts = re.split(r'([|\-–—:~]+)', title)
    softened_parts = [soften_segment(p) if i % 2 == 0 else p for i, p in enumerate(parts)]
    return ''.join(softened_parts)

NON_3D_TITLE_REGEX = re.compile(
    r'\b(?:episode|tập)\s*\d{3,}\b|'
    r'ngự thú sư mạnh nhất|the strongest beast tamer|\b2d\b|'
    r'truyện tranh|review truyện|review manhua|review manga|review manhwa|'
    r'manhua\s*audio|comic\s*audio|audio truyện|đọc truyện|kể truyện|bộ truyện|'
    r'\[phim ngắn\]|\bchap\s*\d+|\bchương\s*\d+',
    flags=re.IGNORECASE
)

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


def clean_plot_summary(desc, title="", channel_name=""):
    """Strip bank/donate/subscribe/copyright boilerplate from YouTube description to keep story synopsis clean."""
    if not desc:
        return ""
    skip_line_re = re.compile(
        r'ủng hộ kênh|ngân hàng|số tài khoản|\bstk\b|chủ tài khoản|vietinbank|vietcombank|mbbank|techcombank|momo\b|'
        r'đăng ký kênh|subscribe|bản quyền|copyright|liên hệ quảng cáo|tất cả hình ảnh và âm thanh|'
        r'mọi vấn đề|email:|gmail\.com|https?://|^\s*#\w+',
        flags=re.IGNORECASE
    )
    cleaned_lines = []
    for raw_line in str(desc).splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if skip_line_re.search(line):
            continue
        # Strip inline URLs or repeated hash tags
        line = re.sub(r'https?://\S+', '', line).strip()
        if not line:
            continue
        cleaned_lines.append(line)
    summary = " ".join(cleaned_lines)
    summary = re.sub(r'\s+', ' ', summary).strip()
    if len(summary) > 360:
        summary = summary[:357].rsplit(' ', 1)[0] + "..."
    return summary


BANNED_CHANNEL_IDS = {
    "besuastudio", "gavangtutien", "thaolac", "tydemuoi", "thongocstudio",
    "muoimuoilamphim", "thietreview"
}

def is_valid_3d_film_video(title, duration_sec=0, channel_id="", published_at=""):
    """Filter out 2D Manhua Audio episodes, banned non-3D channels, 5s teasers, and short <20m clips so catalog stays strictly 3D films."""
    if channel_id in BANNED_CHANNEL_IDS:
        return False
    t = title or ""
    if duration_sec and 0 < duration_sec < 1200:
        return False
    if channel_id == "chiuchiusubtv" and str(published_at or "").startswith("2025-"):
        return False
    if NON_3D_TITLE_REGEX.search(t):
        return False
    return True


def infer_genres(title, desc=""):
    t_low = (title or "").lower()
    d_low = (desc or "").lower()
    scored = []
    for genre_name, w_title, w_desc, kws in GENRE_RULES:
        score = 0.0
        for kw in kws:
            if kw in t_low:
                score += w_title
            elif d_low and kw in d_low:
                score += w_desc
        if score > 0:
            scored.append((score, genre_name))
    scored.sort(key=lambda item: item[0], reverse=True)
    matched = [g for _, g in scored[:2]]
    return matched if matched else ["Hoạt hình 3D Chọn Lọc"]


def clean_core_title(title):
    s = title or ""

    def _unwrap_bracket(m):
        inner = m.group(1).strip()
        if re.match(
            r'^(?:Ful+l\s*)?(?:Trọn\s*Bộ\s*)?(?:Version\s*)?(?:Phần|Tập|Mùa|Bộ|P|S|EP|V)?\s*\d*(?:\s*[-–+~]\s*(?:P|Phần|Tập|Mùa|S|EP)?\s*\d+)?(?:\s*\(\s*END\s*\)|\s*END|\s*Kết)?$',
            inner,
            flags=re.IGNORECASE,
        ):
            return " "
        return f" {inner} "

    s = re.sub(r'【([^】]*)】', _unwrap_bracket, s)
    s = re.sub(r'\[([^\]]*)\]', _unwrap_bracket, s)
    s = PREFIX_PATTERN.sub('', s).strip()
    s = re.sub(
        r'^(?:\s*(?:Ful+l(?:\s*Bộ|\s*Kết|\s*END|\s*Version)?|(?:Trọn\s*Bộ\s*)?(?:Phần|Tập|Mùa|P|S)\s*\d+(?:\s*[-–+~]\s*(?:P|Phần|Tập|Mùa)?\s*\d+)?(?:\s*\([^)]*\))?)\s*[\|\-:–,]?\s*)+',
        '',
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(r'\s*\((?:Phần|Tập|Mùa)\s*\d+[^)]*\)\s*$', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\s*[\|\-]\s*(?:Kas\s*Vietsub|MyCherrySub|Sora\s*Dub|CibiiSub|Đậu\s*Đậu\s*Vietsub|GodSub|Win\s*Vietsub|Thế\s*Vietsub|Vietsub\s*Phim)\s*$', '', s, flags=re.IGNORECASE)
    s = re.sub(r'^[\|\-:\s]+|[\|\-:\s]+$', '', s)
    return re.sub(r'\s+', ' ', s).strip()


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
    from titles/labels such as 'Phần 1+2', 'Phần 1-3', 'TẬP 793+794', 'Phần 10.1', 'Mùa 5 - P2', '[Full 4]', '[Full-S3]'.
    """
    s = re.sub(r'\(\s*gộp trùng[^)]*\)', '', text or '', flags=re.IGNORECASE)
    s = re.sub(r'[\[\]【】]', ' ', s).strip()

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

    # Handle single or chained merged episodes: 'Phần 1+2', 'Phần 1+2+3', 'Phần 1-3', 'TẬP 793+794', '[Full 4]', '[Full-S3]'
    m_ep = re.search(
        r'\b(Phần|Tập|Mùa|P|SS|Full\s*-\s*S|Full(?=\s+\d+\b)|Version)\s*(\d+)((?:\s*[+\-–&]\s*(?:(?:Phần|Tập|Mùa|P|SS)\s*)?\d+)*)',
        s,
        flags=re.IGNORECASE
    )
    if not m_ep:
        return None

    raw_kw = re.sub(r'\s+', '', m_ep.group(1).lower())
    prefix = "Tập" if raw_kw == "tập" else ("Mùa" if raw_kw in ("mùa", "ss", "full-s") else ("Phần" if raw_kw in ("phần", "p", "full", "version") else default_prefix))
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


def fetch_channel_browse_data(channel_id):
    """
    Fetch up to 100 latest video durations and metadata via YouTube Innertube browse API.
    Unlike /watch, /youtubei/v1/browse on VLUU... playlists is not blocked by cloud IP bot checks
    and serves as a resilient fallback when YouTube RSS XML returns 404/500.
    """
    dur_map = {}
    videos_list = []
    if not channel_id or not channel_id.startswith("UC"):
        return dur_map, videos_list
    uploads_playlist_id = f"VLUU{channel_id[2:]}"
    try:
        payload = json.dumps({
            "browseId": uploads_playlist_id,
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20241111.01.00",
                    "hl": "vi",
                    "gl": "VN"
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

        # Extract lockupViewModel entries for RSS fallback (videoId, title, views, relative publishedAt)
        seen_vids = set()
        now_utc = datetime.now(timezone.utc)
        for chunk in txt.split('{"lockupViewModel":')[1:]:
            m_vid = (
                re.search(r'"animationActivationTargetId":"([a-zA-Z0-9_-]{11})"', chunk)
                or re.search(r'/vi/([a-zA-Z0-9_-]{11})/', chunk)
                or re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', chunk)
            )
            if not m_vid:
                continue
            vid = m_vid.group(1)
            if vid in seen_vids:
                continue
            seen_vids.add(vid)

            m_title = re.search(r'"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"', chunk)
            if not m_title:
                continue
            try:
                title = json.loads(f'"{m_title.group(1)}"')
            except Exception:
                title = m_title.group(1)

            views = 0
            pub_iso = None
            m_meta = re.search(r'"metadataParts":\[\{"text":\{"content":"([^"]*(?:view|watching|lượt xem|đang xem)[^"]*)"\}[^\]]*?\}[^\]]*\]', chunk, re.I)
            if m_meta:
                views = parse_compact_number(m_meta.group(1))
            for rel_m in re.findall(r'"text":\{"content":"([^"]+(?:ago|trước))"\}', chunk, re.I):
                parsed_iso = parse_en_date_to_iso(rel_m, ref_now=now_utc)
                if parsed_iso:
                    pub_iso = parsed_iso
                    break

            videos_list.append({
                "videoId": vid,
                "title": title,
                "published": pub_iso or now_utc.isoformat(),
                "description": "",
                "thumbnail": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                "durationSec": dur_map.get(vid, 0),
                "views": views
            })
    except Exception as e:
        print(f"  [Warning] Innertube browse failed for {channel_id}: {e}")
    return dur_map, videos_list


def fetch_channel_durations_browse(channel_id):
    dur_map, _ = fetch_channel_browse_data(channel_id)
    return dur_map


def parse_compact_number(text):
    """Parse counts like '159,879 views', '8,3 N lượt xem', '1.9K', '2.4M', '62' into integer."""
    if text is None:
        return 0
    if isinstance(text, (int, float)):
        return int(text)
    s = str(text).replace("\xa0", " ").strip()
    if not s:
        return 0
    s_clean = re.sub(r'\s*(?:views?|likes?|người xem|lượt xem|lượt thích)\b', '', s, flags=re.I).strip()
    m_abbr = re.match(r'^([0-9]+(?:[.,][0-9]+)?)\s*(Tr|K|M|B|N)$', s_clean, flags=re.I)
    if m_abbr:
        val = float(m_abbr.group(1).replace(',', '.'))
        unit = m_abbr.group(2).lower()
        mult = {'k': 1_000, 'n': 1_000, 'm': 1_000_000, 'tr': 1_000_000, 'b': 1_000_000_000}[unit]
        return int(round(val * mult))
    digits = re.sub(r'[^\d]', '', s_clean)
    return int(digits) if digits else 0


def parse_iso8601_duration(dur_str):
    """Parse YouTube API v3 PT#H#M#S duration into integer seconds."""
    if not dur_str:
        return 0
    m = re.match(r'^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$', dur_str.strip())
    if not m:
        return 0
    h = int(m.group(1) or 0)
    mn = int(m.group(2) or 0)
    s = int(m.group(3) or 0)
    return h * 3600 + mn * 60 + s


def parse_en_date_to_iso(text, ref_now=None):
    """Parse YouTube dates ('Nov 14, 2026', '2 hours ago', '15 giờ trước') into UTC ISO-8601."""
    if not text:
        return None
    s = str(text).strip()
    now_utc = ref_now or datetime.now(timezone.utc)
    m_abs = re.search(r'([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})', s)
    if m_abs:
        try:
            dt = datetime.strptime(m_abs.group(1), "%b %d, %Y").replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            pass
    m_rel_en = re.search(r'(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago', s, re.I)
    if m_rel_en:
        qty = int(m_rel_en.group(1))
        unit = m_rel_en.group(2).lower()
        sec_map = {
            "second": 1, "minute": 60, "hour": 3600,
            "day": 86400, "week": 7 * 86400, "month": 30 * 86400, "year": 365 * 86400,
        }
        return (now_utc - timedelta(seconds=qty * sec_map[unit])).isoformat()
    m_rel_vi = re.search(r'(\d+)\s+(giây|phút|giờ|ngày|tuần|tháng|năm)\s+trước', s, re.I)
    if m_rel_vi:
        qty = int(m_rel_vi.group(1))
        unit = m_rel_vi.group(2).lower()
        sec_map_vi = {
            "giây": 1, "phút": 60, "giờ": 3600,
            "ngày": 86400, "tuần": 7 * 86400, "tháng": 30 * 86400, "năm": 365 * 86400,
        }
        return (now_utc - timedelta(seconds=qty * sec_map_vi[unit])).isoformat()
    return None


def fetch_all_channel_durations(max_workers=8):
    """Concurrently collect recent video duration map and browse items across all 8 partner channels."""
    all_durations = {}
    channel_videos_map = {}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futs = {pool.submit(fetch_channel_browse_data, ch["channel_id"]): ch["channel_id"] for ch in CHANNELS}
        for fut in as_completed(futs):
            cid = futs[fut]
            try:
                dur_map, vids = fut.result()
                channel_videos_map[cid] = vids
                for vid, sec in dur_map.items():
                    if sec > 0 and vid not in all_durations:
                        all_durations[vid] = sec
            except Exception:
                channel_videos_map[cid] = []
    return all_durations, channel_videos_map


def fetch_video_stats_next(video_id):
    """Fetch exact views, likes, and publishDate for a video via zero-key Innertube /youtubei/v1/next."""
    try:
        payload = json.dumps({
            "videoId": video_id,
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20241111.01.00",
                    "hl": "en",
                    "gl": "US"
                }
            }
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://www.youtube.com/youtubei/v1/next?prettyPrint=false",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": HEADERS["User-Agent"]
            },
            method="POST"
        )
        txt = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="ignore")

        views = None
        m_v = re.search(r'"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([^"]+)"', txt)
        if not m_v:
            m_v = re.search(r'"factoidRenderer":\{"value":\{"simpleText":"([^"]+)"\},"label":\{"simpleText":"Views"\}', txt)
        if m_v:
            views = parse_compact_number(m_v.group(1))

        likes = None
        m_l_acc = re.search(r'"accessibilityText":"[^"]*like this video along with ([0-9,]+) other', txt, re.I)
        if m_l_acc:
            likes = parse_compact_number(m_l_acc.group(1))
        else:
            m_l_fac = re.search(r'"factoidRenderer":\{"value":\{"simpleText":"([^"]+)"\},"label":\{"simpleText":"Likes"\}', txt)
            if m_l_fac:
                likes = parse_compact_number(m_l_fac.group(1))
            else:
                m_l_btn = re.search(r'"iconName":"LIKE","title":"([0-9.,KMBkmb]+)"', txt)
                if m_l_btn:
                    likes = parse_compact_number(m_l_btn.group(1))

        pub_iso = None
        m_d = re.search(r'"dateText":\{"simpleText":"([^"]+)"\}', txt)
        if m_d:
            pub_iso = parse_en_date_to_iso(m_d.group(1))

        desc = ""
        m_desc = re.search(r'"attributedDescriptionBodyText":\{"content":"((?:[^"\\]|\\.)*)"', txt)
        if m_desc:
            try:
                desc = json.loads(f'"{m_desc.group(1)}"')
            except Exception:
                desc = m_desc.group(1)

        return {"views": views, "likes": likes, "publishDate": pub_iso, "description": desc}
    except Exception:
        return {"views": None, "likes": None, "publishDate": None, "description": ""}


def fetch_vn_title_and_desc_next(video_id):
    """Fetch original Vietnamese title and cleaned synopsis from YouTube Innertube /next (hl=vi)."""
    try:
        payload = json.dumps({
            "videoId": video_id,
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20241111.01.00",
                    "hl": "vi",
                    "gl": "VN"
                }
            }
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://www.youtube.com/youtubei/v1/next?prettyPrint=false",
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": HEADERS["User-Agent"]},
            method="POST"
        )
        txt = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="ignore")
        title = None
        m_ttl = re.search(r'"videoPrimaryInfoRenderer":\{"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"', txt)
        if m_ttl:
            try:
                title = json.loads(f'"{m_ttl.group(1)}"')
            except Exception:
                title = m_ttl.group(1)
        desc = ""
        m_desc = re.search(r'"attributedDescriptionBodyText":\{"content":"((?:[^"\\]|\\.)*)"', txt)
        if m_desc:
            try:
                desc = json.loads(f'"{m_desc.group(1)}"')
            except Exception:
                desc = m_desc.group(1)
        return {"title": title, "description": desc}
    except Exception:
        return {"title": None, "description": ""}


def batch_fetch_youtube_api_v3(video_ids, api_key):
    """Fetch exact viewCount, likeCount, durationSec, publishDate in batches of 50 via YouTube Data API v3."""
    results = {}
    if not api_key or not video_ids:
        return results
    unique_ids = list(dict.fromkeys(vid for vid in video_ids if vid))
    for i in range(0, len(unique_ids), 50):
        chunk = unique_ids[i:i + 50]
        ids_param = ",".join(chunk)
        url = (
            f"https://www.googleapis.com/youtube/v3/videos"
            f"?part=statistics,contentDetails,snippet&id={ids_param}&key={api_key}"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": HEADERS["User-Agent"]})
            payload = json.loads(urllib.request.urlopen(req, timeout=15).read().decode("utf-8"))
            for item in payload.get("items", []):
                vid = item.get("id")
                stats = item.get("statistics", {})
                cdet = item.get("contentDetails", {})
                snip = item.get("snippet", {})
                views = int(stats["viewCount"]) if "viewCount" in stats else None
                likes = int(stats["likeCount"]) if "likeCount" in stats else None
                dur_sec = parse_iso8601_duration(cdet.get("duration", ""))
                pub_at = snip.get("publishedAt")
                results[vid] = {
                    "views": views,
                    "likes": likes,
                    "durationSec": dur_sec if dur_sec > 0 else None,
                    "publishDate": pub_at
                }
        except Exception as e:
            print(f"  [Warning] YouTube Data API v3 batch failed (chunk {i}): {e}")
    return results


def batch_fetch_stats(video_ids, max_workers=24):
    """Fetch views, likes, and publishDate using YOUTUBE_API_KEY first, then zero-key Innertube /next fallback."""
    unique_ids = list(dict.fromkeys(vid for vid in video_ids if vid))
    results = {}
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if api_key:
        print(f"[Stats] Fetching {len(unique_ids)} videos via YouTube Data API v3...")
        results.update(batch_fetch_youtube_api_v3(unique_ids, api_key))

    remaining = [vid for vid in unique_ids if vid not in results or results[vid].get("views") is None]
    if remaining:
        print(f"[Stats] Fetching {len(remaining)} videos via Innertube /youtubei/v1/next (workers={max_workers})...")
        done_count = 0
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futs = {pool.submit(fetch_video_stats_next, vid): vid for vid in remaining}
            for fut in as_completed(futs):
                vid = futs[fut]
                done_count += 1
                try:
                    st = fut.result()
                    if vid in results:
                        for k, v in st.items():
                            if results[vid].get(k) is None and v is not None:
                                results[vid][k] = v
                    else:
                        results[vid] = st
                except Exception:
                    if vid not in results:
                        results[vid] = {"views": None, "likes": None, "publishDate": None}
                if done_count % 500 == 0:
                    print(f"  [Stats Progress] {done_count}/{len(remaining)}...")
    return results


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


def fetch_channel_videos(channel_id, browse_fallback_videos=None):
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
        if videos:
            # Sort chronologically (oldest -> newest) so parts & updatedAt never overwrite backwards
            videos.sort(key=lambda v: parse_iso_utc(v["published"]) or datetime.min.replace(tzinfo=timezone.utc))
            return videos
    except Exception as e:
        print(f"  [Warning] RSS failed for {channel_id} ({e}); trying browse fallback...")

    if browse_fallback_videos:
        # Take newest 15 from Innertube browse and sort oldest -> newest for chronological ingestion
        fallback = list(browse_fallback_videos[:15])
        fallback.sort(key=lambda v: parse_iso_utc(v.get("published")) or datetime.min.replace(tzinfo=timezone.utc))
        return fallback
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

    active_parts = [p for p in sorted_parts if not p.get("isRedundant")] or sorted_parts
    total_views = sum(int(p.get("views") or 0) for p in active_parts)
    total_likes = sum(int(p.get("likes") or 0) for p in active_parts)
    if total_views > 0 or any("views" in p for p in active_parts):
        film["totalViews"] = total_views
    if total_likes > 0 or any("likes" in p for p in active_parts):
        film["totalLikes"] = total_likes

    # Keep chronologically earliest publishedAt (if missing) and newest updatedAt across film + parts
    oldest_ts = film.get("publishedAt")
    newest_ts = film.get("updatedAt") or film.get("publishedAt")
    for p in sorted_parts:
        p_pub = p.get("publishedAt")
        if p_pub:
            dt_p = parse_iso_utc(p_pub)
            dt_old = parse_iso_utc(oldest_ts)
            if dt_p and (not dt_old or dt_p < dt_old):
                oldest_ts = p_pub
            newest_ts = max_iso_date(newest_ts, p_pub)
    if oldest_ts and not film.get("publishedAt"):
        film["publishedAt"] = oldest_ts
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


def backfill_catalog_stats(films, refresh_all=False, max_recent=150):
    """Populate/refresh views, likes, durationSec, and publishDate on existing catalog films."""
    target_vids = []
    if refresh_all:
        for f in films:
            for p in f.get("parts", []):
                vid = p.get("id") or p.get("videoId")
                if vid:
                    target_vids.append(vid)
    else:
        api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()
        # Always fill missing stats; if API key is present, also refresh top max_recent recent films
        sorted_recent_ids = set()
        if api_key:
            ranked = sorted(
                films,
                key=lambda x: parse_iso_utc(x.get("updatedAt") or x.get("publishedAt")) or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True
            )
            sorted_recent_ids = {f.get("id") for f in ranked[:max_recent]}
        for f in films:
            is_recent_refresh = f.get("id") in sorted_recent_ids
            for p in f.get("parts", []):
                vid = p.get("id") or p.get("videoId")
                if vid and (is_recent_refresh or p.get("views") is None or p.get("likes") is None or not p.get("publishedAt")):
                    target_vids.append(vid)

    unique_targets = list(dict.fromkeys(target_vids))
    if not unique_targets:
        return 0

    stats_map = batch_fetch_stats(unique_targets, max_workers=24)
    updated_films = 0
    for f in films:
        changed = False
        for p in f.get("parts", []):
            vid = p.get("id") or p.get("videoId")
            st = stats_map.get(vid)
            if not st:
                continue
            if st.get("views") is not None and p.get("views") != st["views"]:
                p["views"] = st["views"]
                changed = True
            if st.get("likes") is not None and p.get("likes") != st["likes"]:
                p["likes"] = st["likes"]
                changed = True
            if st.get("durationSec") and st["durationSec"] > 0 and needs_duration_repair(p):
                p["duration"] = st["durationSec"]
                p["durationStr"] = format_part_duration_hms(st["durationSec"])
                changed = True
            if st.get("publishDate") and not p.get("publishedAt"):
                p["publishedAt"] = st["publishDate"]
                changed = True
        if changed:
            recalculate_film_summary(f)
            updated_films += 1

    if updated_films > 0:
        print(f"[Stats] Updated views/likes/dates on {updated_films} films.")
    return updated_films


def clean_and_reclassify_catalog(films, fetch_missing_desc=False):
    """
    Filter catalog strictly to 3D films (removing 2D Manhua Audio series, short clips < 20m,
    and 2025 chiuchiusubtv 2D uploads), restore film_559, clean plot summaries, and re-infer 10 canonical 3D genres.
    """
    # Step A: Fix film_559 which had 91 2D audio parts ('NGỰ THÚ SƯ MẠNH NHẤT') attached under a 3D Part 1 ('KẺ LÀM MÀU MẠNH NHẤT')
    for f in films:
        if f.get("id") == "film_559":
            kept_parts = [p for p in f.get("parts", []) if (p.get("id") or "") == "Tp6ygCmLXek"]
            if kept_parts:
                f["title"] = "FULL MÙA 1 | KẺ LÀM MÀU MẠNH NHẤT"
                f["parts"] = kept_parts
                recalculate_film_summary(f)

    # Step B: Remove non-3D films and filter out any non-3D short parts inside series
    cleaned_films = []
    removed_films = 0
    for f in films:
        ch_id = f.get("channelId", "")
        if ch_id in BANNED_CHANNEL_IDS:
            removed_films += 1
            continue
        valid_parts = []
        for p in f.get("parts", []):
            p_dur = p.get("duration") or 0
            p_title = p.get("title") or ""
            p_pub = p.get("publishedAt") or f.get("publishedAt") or ""
            if p_dur > 0 and p_dur < 600:
                continue
            if ch_id == "chiuchiusubtv" and str(p_pub).startswith("2025-"):
                continue
            if NON_3D_TITLE_REGEX.search(p_title):
                continue
            valid_parts.append(p)

        if not valid_parts:
            removed_films += 1
            continue

        f["parts"] = valid_parts
        recalculate_film_summary(f)
        total_dur = f.get("totalDurationSec") or 0
        film_pub = f.get("publishedAt") or f.get("updatedAt") or ""
        if not is_valid_3d_film_video(f.get("title", ""), total_dur, channel_id=ch_id, published_at=film_pub):
            removed_films += 1
            continue
        cleaned_films.append(f)

    # Step C: Restore any auto-translated English titles or generic/boilerplate synopses via /next (hl=vi)
    if fetch_missing_desc:
        need_vn_meta = []
        for f in cleaned_films:
            t = f.get("title") or ""
            rev = f.get("review") or ""
            has_en_title = bool(
                re.search(r'\b(episode|while|others rely|beast tamer|raises)\b', t, re.I)
                or (re.search(r'[a-zA-Z]{5,}', t) and not re.search(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', t, re.I))
            )
            has_bad_rev = (
                not rev
                or rev.startswith("Phim hoạt hình mới tuyển chọn")
                or bool(re.search(r'ngân hàng|số tài khoản|ủng hộ kênh|tất cả hình ảnh và âm thanh', rev, re.I))
            )
            if has_en_title or has_bad_rev:
                vid = f["parts"][0].get("id") or f["parts"][0].get("videoId")
                if vid:
                    need_vn_meta.append((f, vid, has_en_title))

        if need_vn_meta:
            print(f"[Clean-3D] Fetching Vietnamese title/synopsis for {len(need_vn_meta)} films...")
            with ThreadPoolExecutor(max_workers=20) as pool:
                fut_map = {pool.submit(fetch_vn_title_and_desc_next, vid): (f, has_en_title) for f, vid, has_en_title in need_vn_meta}
                for fut in as_completed(fut_map):
                    f_obj, fix_title = fut_map[fut]
                    try:
                        res = fut.result()
                        if fix_title and res.get("title"):
                            new_t = re.sub(r'\s*\|\s*chiuchiu\s*subtv\s*$', '', res["title"], flags=re.I).strip()
                            f_obj["title"] = new_t
                        if res.get("description"):
                            cleaned = clean_plot_summary(res["description"], f_obj.get("title", ""), f_obj.get("channelName", ""))
                            if cleaned:
                                f_obj["review"] = cleaned
                    except Exception:
                        pass

    # Step D: Strip boilerplate from all reviews and re-classify all 10 canonical 3D genres
    reclassified = 0
    for f in cleaned_films:
        rev = f.get("review") or ""
        cleaned_rev = clean_plot_summary(rev, f.get("title", ""), f.get("channelName", ""))
        if cleaned_rev:
            f["review"] = cleaned_rev
        elif not rev or re.search(r'ngân hàng|số tài khoản|tất cả hình ảnh và âm thanh|phim hoạt hình mới tuyển chọn', rev, re.I):
            f["review"] = f"{clean_core_title(f.get('title', ''))} — Tuyển tập hoạt hình 3D đặc sắc từ kênh {f.get('channelName', '')}."

        new_genres = infer_genres(f.get("title", ""), f.get("review", ""))
        if f.get("genres") != new_genres:
            f["genres"] = new_genres
            reclassified += 1

    print(f"[Clean-3D] Removed {removed_films} 2D/short films ({len(cleaned_films)} 3D films kept). Reclassified {reclassified} films.")
    return cleaned_films, (removed_films + reclassified)


def search_candidate_channels(queries=None):
    """Search YouTube (videos > 20 min) and return {channel_id: {name, url, hits}} for unknown channels."""
    known = {c["channel_id"] for c in CHANNELS}
    found = {}
    for q in (queries or DISCOVERY_QUERIES):
        try:
            payload = json.dumps({
                "context": {"client": {"clientName": "WEB", "clientVersion": "2.20250201.00.00", "hl": "vi", "gl": "VN"}},
                "query": q,
                "params": "EgIYAg=="
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://www.youtube.com/youtubei/v1/search?prettyPrint=false", data=payload,
                headers={"Content-Type": "application/json", "User-Agent": HEADERS["User-Agent"]}, method="POST")
            data = json.loads(urllib.request.urlopen(req, timeout=15).read().decode("utf-8", errors="ignore"))
        except Exception as e:
            print(f"  [Discover] search failed for '{q}': {e}")
            continue

        def walk(o):
            if isinstance(o, dict):
                vr = o.get("videoRenderer")
                if vr:
                    runs = (vr.get("ownerText") or {}).get("runs") or []
                    if runs:
                        ep = runs[0].get("navigationEndpoint", {})
                        cid = ep.get("browseEndpoint", {}).get("browseId", "")
                        url = ep.get("commandMetadata", {}).get("webCommandMetadata", {}).get("url", "")
                        if cid.startswith("UC") and cid not in known:
                            e = found.setdefault(cid, {"name": runs[0].get("text", ""), "url": "https://www.youtube.com" + url, "hits": 0})
                            e["hits"] += 1
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for x in o:
                    walk(x)
        walk(data)
    return found


def score_channel(channel_id, sample=20):
    """3D Channel Quality Gate: share of valid 3D (>=40m) long videos among the latest uploads."""
    _, vids = fetch_channel_browse_data(channel_id)
    vids = vids[:sample]
    if len(vids) < 8:
        return 0.0, len(vids)
    ok = [v for v in vids if v.get("durationSec", 0) >= 2400 and is_valid_3d_film_video(v["title"], v["durationSec"])]
    return len(ok) / len(vids), len(vids)


def discover_channels(min_ratio=0.8):
    """Find new candidate channels, score them and stage passing ones in discovered_channels.json (manual approval)."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(base_dir, "discovered_channels.json")
    candidates = search_candidate_channels()
    staged = []
    for cid, info in sorted(candidates.items(), key=lambda kv: -kv[1]["hits"]):
        ratio, n = score_channel(cid)
        verdict = "PASS" if ratio >= min_ratio else "reject"
        print(f"  [Discover] {info['name']} ({cid}) hits={info['hits']} ratio={ratio:.0%}/{n} -> {verdict}")
        if ratio >= min_ratio:
            staged.append({"name": info["name"], "url": info["url"], "channel_id": cid,
                           "score": round(ratio, 2), "hits": info["hits"]})
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"generatedAt": datetime.now(timezone.utc).isoformat(), "channels": staged}, f, ensure_ascii=False, indent=2)
    print(f"[Discover] {len(staged)} channels passed the quality gate -> {out_path}. Add approved ones to CHANNELS.")


def sync_channel_meta(data, films):
    """Keep data['channels'] aligned with CHANNELS and film counts."""
    counts = {}
    for f in films:
        counts[f.get("channelId")] = counts.get(f.get("channelId"), 0) + 1
    data["channels"] = [
        {"id": c["id"], "name": c["name"], "url": c["url"], "filmCount": counts.get(c["id"], 0)}
        for c in CHANNELS
    ]
    data.setdefault("stats", {})["totalChannels"] = len(CHANNELS)


def main():
    if "--discover-channels" in sys.argv:
        discover_channels()
        return

    do_backfill = "--backfill" in sys.argv
    do_backfill_stats = "--backfill-stats" in sys.argv
    do_clean_3d = "--clean-3d" in sys.argv
    do_repair_parts = "--repair-parts" in sys.argv or do_backfill or do_backfill_stats or do_clean_3d
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_js_path = os.path.join(base_dir, "data.js")
    catalog_json_path = os.path.join(base_dir, "youtube_films_catalog.json")

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting YouTube Auto-Update (backfill={do_backfill}, backfill_stats={do_backfill_stats}, clean_3d={do_clean_3d}, repair_parts={do_repair_parts})...")

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

    # Pre-fetch duration map and latest upload fallback map across all 8 channels via Innertube browse
    browse_durations, browse_videos_map = fetch_all_channel_durations(max_workers=8)
    print(f"[Browse] Collected {len(browse_durations)} video durations across 8 channels.")

    cleaned_changes = 0
    if do_clean_3d:
        films, cleaned_changes = clean_and_reclassify_catalog(films, fetch_missing_desc=True)

    repaired_count = repair_existing_catalog(
        films,
        browse_durations=browse_durations,
        fetch_watch_fallback=do_backfill,
        repair_parts=do_repair_parts
    )
    stats_updated_count = backfill_catalog_stats(films, refresh_all=do_backfill_stats)

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

    # Step 1: Collect new videos across all 8 channels (RSS first, Innertube browse fallback)
    pending_by_channel = []
    new_vids_to_fetch = []
    for ch in CHANNELS:
        ch_vids = browse_videos_map.get(ch["channel_id"])
        if not any(f.get("channelId") == ch["id"] for f in films) and ch_vids:
            # Brand-new channel: initial backfill from the latest ~60 uploads
            browse_videos_map[ch["channel_id"]] = ch_vids[:100]
            print(f"  [New Channel] Backfilling '{ch['name']}' with {len(browse_videos_map[ch['channel_id']])} uploads.")
            videos = list(browse_videos_map[ch["channel_id"]])
            videos.sort(key=lambda v: parse_iso_utc(v.get("published")) or datetime.min.replace(tzinfo=timezone.utc))
        else:
            videos = fetch_channel_videos(ch["channel_id"], browse_fallback_videos=ch_vids)
        print(f"Channel '{ch['name']}': {len(videos)} entries.")
        fresh = [v for v in videos if v["videoId"] not in existing_video_ids]
        if fresh:
            pending_by_channel.append((ch, fresh))
            new_vids_to_fetch.extend(v["videoId"] for v in fresh)

    # Step 2: Resolve durations and views/likes for fresh videos
    meta_map = batch_fetch_metadata(new_vids_to_fetch, known_durations=browse_durations, max_workers=10) if new_vids_to_fetch else {}
    new_stats_map = batch_fetch_stats(new_vids_to_fetch, max_workers=12) if new_vids_to_fetch else {}

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
            st = new_stats_map.get(vid, {})
            real_sec = info.get("durationSec") or st.get("durationSec") or v.get("durationSec") or 0
            # Prefer RSS/API published UTC, then /next dateText, then watch publishDate
            v_pub = v["published"] or st.get("publishDate") or info.get("publishDate")
            v_views = st.get("views") if st.get("views") is not None else (v.get("views") or 0)
            v_likes = st.get("likes") if st.get("likes") is not None else 0
            v_title = v["title"]
            raw_desc = v["description"] or st.get("description") or ""
            v_desc = clean_plot_summary(raw_desc, v_title, ch_name)
            v_thumb = v["thumbnail"]

            # Enforce strict 3D film filter (skip 2D audio episodes, <20m clips, 5s teasers)
            if not is_valid_3d_film_video(v_title, real_sec, channel_id=ch_id, published_at=v_pub):
                print(f"  [Skip 2D/Short] '{v_title}' ({real_sec}s, {vid})")
                continue

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
                    "views": v_views,
                    "likes": v_likes,
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
                genres = infer_genres(v_title, v_desc or raw_desc)
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
                    "totalViews": v_views,
                    "totalLikes": v_likes,
                    "review": v_desc or f"{clean_core_title(v_title)} — Tuyển tập hoạt hình 3D đặc sắc từ kênh {ch_name}.",
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
                            "views": v_views,
                            "likes": v_likes,
                            "isRedundant": False
                        }
                    ]
                }
                new_films_list.append(new_film)
                existing_video_ids.add(vid)
                new_films_count += 1
                print(f"  [+] New Film ({total_dur_str}): '{v_title}' ({vid})")

    total_changes = new_films_count + new_parts_count + repaired_count + stats_updated_count + cleaned_changes
    if total_changes == 0:
        print("[Auto-Update] Everything is up to date! No new videos or repairs needed.")
        return

    # Sort newly created films newest-first before prepending
    new_films_list.sort(key=lambda f: parse_iso_utc(f.get("updatedAt")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    data["films"] = new_films_list + films
    sync_channel_meta(data, data["films"])
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
