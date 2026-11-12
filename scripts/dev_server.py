#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Local Dev Server for Hôm Nay Xem Gì
Serves static files + mirrors Vercel Serverless endpoint GET /api/live-feed
"""

import os
import sys
import json
import time
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))

from update_youtube_feed import (
    CHANNELS,
    fetch_channel_videos,
    batch_fetch_metadata,
    format_part_duration_hms,
    format_total_duration_vi,
    infer_genres,
    parse_iso_utc,
)

_CACHE = {"ts": 0, "payload": None}
_CACHE_LOCK = threading.Lock()


def build_live_feed_payload():
    now_ts = time.time()
    with _CACHE_LOCK:
        if _CACHE["payload"] and (now_ts - _CACHE["ts"] < 120):
            return _CACHE["payload"]

    candidates = []
    for ch in CHANNELS:
        vids = fetch_channel_videos(ch["channel_id"])
        for v in vids[-3:]:
            candidates.append({**v, "channelId": ch["id"], "channelName": ch["name"], "channelUrl": ch["url"]})

    candidates.sort(key=lambda x: parse_iso_utc(x["published"]) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    top = candidates[:24]
    meta_map = batch_fetch_metadata([v["videoId"] for v in top], max_workers=8)

    enriched = []
    for v in top:
        vid = v["videoId"]
        info = meta_map.get(vid, {})
        sec = info.get("durationSec") or 0
        pub = v["published"] or info.get("publishDate")
        enriched.append({
            "videoId": vid,
            "title": v["title"],
            "channelId": v["channelId"],
            "channelName": v["channelName"],
            "channelUrl": v["channelUrl"],
            "publishedAt": pub,
            "durationSec": sec,
            "durationStr": format_part_duration_hms(sec),
            "totalDurationStr": format_total_duration_vi(sec),
            "thumbnail": v["thumbnail"],
            "genres": infer_genres(v["title"], v.get("description", "")),
            "review": (v.get("description") or "")[:200] or f"Phim hoạt hình mới tuyển chọn từ kênh {v['channelName']}."
        })

    payload = json.dumps({
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(enriched),
        "videos": enriched
    }, ensure_ascii=False).encode("utf-8")

    with _CACHE_LOCK:
        _CACHE["ts"] = time.time()
        _CACHE["payload"] = payload
    return payload


class DevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/live-feed":
            try:
                body = build_live_feed_payload()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                err = json.dumps({"error": str(e)}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(err)
            return
        super().do_GET()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"Serving Hom Nay Xem Gi (with /api/live-feed) at http://localhost:{port}")
    ThreadingHTTPServer(("", port), DevHandler).serve_forever()
