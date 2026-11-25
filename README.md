<div align="center">

<img src="./logo.svg" alt="Logo Hôm Nay Xem Gì" width="76" height="76" />

# Hôm Nay Xem Gì

Trang tổng hợp và xem phim hoạt hình 3D từ 31 kênh YouTube tiếng Việt.

[![Stack](https://img.shields.io/badge/Stack-HTML%20%C2%B7%20CSS%20%C2%B7%20Vanilla%20JS-09090B?style=flat-square&labelColor=111116&color=F43F5E)](./index.html)
[![Catalog](https://img.shields.io/badge/Kho%20phim-6.540%2B%20b%E1%BB%99%203D%20%C2%B7%2031%20k%C3%AAnh-111116?style=flat-square&color=F43F5E)](./data.js)
[![Deploy](https://img.shields.io/badge/Hosting-Vercel-09090B?style=flat-square&labelColor=111116&color=FFFFFF)](./vercel.json)
[![Auto-Sync](https://img.shields.io/badge/Sync-GitHub%20Actions%20%2B%20Innertube-09090B?style=flat-square&labelColor=111116&color=10B981)](./.github/workflows/auto_update_youtube.yml)

</div>

---

## Mục lục

- [Tính năng](#tính-năng)
- [Giao diện và logo](#giao-diện-và-logo)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Chạy trên máy](#chạy-trên-máy)
- [Cách lấy và cập nhật phim](#cách-lấy-và-cập-nhật-phim)
- [Deploy lên Vercel](#deploy-lên-vercel)
- [Phím tắt](#phím-tắt)

---

## Tính năng

**Hôm Nay Xem Gì** chạy bằng HTML, CSS và JavaScript thuần, không cần bước build. Dữ liệu gồm hơn **6.540 bộ phim hoạt hình 3D** gom từ **31 kênh YouTube** (Tu tiên, Huyền huyễn, Mạt thế, Hệ thống, Ngự thú, Đô thị, Trò chơi...).

Những điểm chính đang chạy trên web:

- **Hero, lọc nhiều kênh và lọc nhiều thể loại cùng lúc:** Phía trên cùng là 6 phim đề cử dùng ảnh bìa lớn (`maxresdefault.jpg`, tự lùi về `sddefault` hoặc `hqdefault` nếu YouTube không có ảnh gốc). Phía dưới là thanh chuyển tab nhanh (`Tất Cả`, `Mới 24h`, `Bảng XH`, `Cày Đêm >6h`, `Series Dài`, `Phim 1 Tập`, `Tủ Phim`) đi kèm cột lọc cho phép tích chọn cùng lúc nhiều thể loại (hỗ trợ gạt `Bất kỳ` / `Tất cả`) và nhiều kênh/studio mà trang không bị giật lên xuống.
- **Tự động gộp kênh cùng hệ thống và gộp tập:** Script [`scripts/update_youtube_feed.py`](./scripts/update_youtube_feed.py) quét dấu hiệu sở hữu chung (cộng tác viên/liên kết kênh trên trang chủ YouTube, tài khoản ủng hộ, email, link chéo) để tự gộp các kênh cha-con thành một mục chọn duy nhất trên web (như cụm 6 kênh **Hệ Thống Mộng Ảnh Studio** và cụm 2 kênh **Hệ Thống Trùm Phim Sinh Tồn New**) và gom các tập lẻ phát hành chéo kênh về cùng một series. Bộ lọc 3 lớp chặn video dưới 20 phút, truyện audio tĩnh và review truyện tranh 2D.
- **Theo dõi tập mới và thông báo:** Tab `Mới 24h` sắp xếp theo giờ đăng thật trên YouTube lấy qua `/api/live-feed`. Phim bạn bấm lưu vào `localStorage` sẽ tự báo qua nút chuông trên header khi có tập mới, bấm vào thông báo là mở thẳng tới tập đó.
- **Khung xem phim (Theater Modal):** Có nút mở rộng khung xem (`Wide Mode`), làm tối nền xung quanh (`Ambient Dim`), tự chuyển tập sau 5 giây đếm ngược (`Auto-Next`), nhớ tập và mốc giây đang xem dở qua tham số `&start=` của YouTube. Ngoài ra có nút tạo mã QR dạng SVG ngay trên trình duyệt để quét mở nhanh sang TV hoặc điện thoại, hỗ trợ chia sẻ link trực tiếp qua URL (`?film=&ep=`).
- **Bảng xếp hạng và chọn ngẫu nhiên:** Bảng xếp hạng lọc được theo lượt xem hoặc lượt thích, chia mốc hôm nay, tuần, tháng, năm, mọi lúc và lọc chéo theo từng kênh, từng thể loại. Nút `Ngẫu Nhiên` chọn một phim 3D bất kỳ kèm sẵn poster, thông số và tóm tắt cốt truyện.

---

## Giao diện và logo

Quy ước màu sắc, font chữ và khoảng cách được ghi trong [`DESIGN.md`](./DESIGN.md) (`v5.1.0`):

| Thành phần | Giá trị đang dùng |
| :--- | :--- |
| **Phong cách** | Ambient Cinema (nền tối, các nút điều khiển phủ mờ) |
| **Bảng màu** | Nền chính `#060608`, khung card `#111116`, nút `#1A1A22`, điểm nhấn `#F43F5E` |
| **Font chữ** | Tiêu đề `Space Grotesk`, nội dung `Be Vietnam Pro`, số liệu `JetBrains Mono` |
| **Logo chính** | Clapperboard 3D kết hợp Play và sao 4 cánh AI ([`logo.svg`](./logo.svg), `256x256`) |
| **Bộ icon web & PWA** | [`icons/favicon.svg`](./icons/favicon.svg) tự đổi màu theo theme sáng/tối của trình duyệt, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png` và [`site.webmanifest`](./icons/site.webmanifest) |

---

## Cấu trúc thư mục

```text
film-ai-3d/
├── index.html                  # Giao diện trang chủ, header và các modal xem phim
├── style.css                   # Biến màu, layout 3 cột desktop và responsive mobile (375px)
├── app.js                      # Xử lý lọc, live feed, player, lưu tiến trình xem, QR SVG
├── data.js                     # Kho phim tĩnh (window.FILMS_DATA) được bot cập nhật định kỳ
├── youtube_films_catalog.json  # Bản JSON của kho phim phục vụ đối chiếu và kiểm tra
├── logo.svg                    # File logo vector gốc
├── icons/                      # Bộ favicon, icon iOS và PWA manifest
├── api/
│   ├── live-feed.js            # Vercel function lấy danh sách video mới và thời lượng 24h
│   └── cron-update.js          # Endpoint gọi GitHub Actions chạy cập nhật qua webhook/cron
├── scripts/
│   ├── update_youtube_feed.py  # Script crawl YouTube RSS + Innertube, gộp tập và phân loại
│   └── dev_server.py           # Server chạy thử trên máy có giả lập sẵn /api/live-feed
├── .github/workflows/
│   └── auto_update_youtube.yml # Lịch chạy tự động mỗi 30 phút trên GitHub Actions
├── DESIGN.md                   # Tài liệu quy chuẩn giao diện của dự án
├── vercel.json                 # Cấu hình cache Vercel và cron hàng ngày
└── run_web.bat                 # File mở nhanh web bằng Python trên Windows
```

---

## Chạy trên máy

Dự án không dùng `npm` hay bundler. Bạn chỉ cần cài Python 3.9 trở lên.

**Chạy đầy đủ cả `/api/live-feed` (khuyên dùng khi sửa code):**

```bash
python scripts/dev_server.py 8080
```

Xong mở trình duyệt vào `http://localhost:8080/`.

**Hoặc chỉ mở nhanh giao diện tĩnh:**

```bash
python -m http.server 8080
```

Trên Windows có thể bấm đúp vào file [`run_web.bat`](./run_web.bat).

---

## Cách lấy và cập nhật phim

Dữ liệu mới được cập nhật qua hai đường:

1. **Tự động lưu vào repo (GitHub Actions):** Workflow [`.github/workflows/auto_update_youtube.yml`](./.github/workflows/auto_update_youtube.yml) chạy mỗi 30 phút, gọi [`scripts/update_youtube_feed.py`](./scripts/update_youtube_feed.py) đọc RSS và API nội bộ của YouTube (Innertube `browse` và `next`) từ 31 kênh. Khi có phim hoặc tập mới, script ghi lại `data.js`, `youtube_films_catalog.json`, tự cập nhật nhóm kênh liên kết, tăng chuỗi `?v=` trong `index.html` rồi tự push commit mới lên `main`.
2. **Cập nhật nóng lúc mở web (Vercel Serverless):** File [`api/live-feed.js`](./api/live-feed.js) đọc các video mới đăng của 31 kênh với cache 5 phút trên Edge (`s-maxage=300, stale-while-revalidate=600`). Trình duyệt tự gọi endpoint này và gộp thêm các video vừa lên sóng chưa kịp vào file tĩnh `data.js`.

Khi cần bảo trì lại dữ liệu bằng tay trên máy, dùng các cờ sau của `update_youtube_feed.py`:

```bash
python scripts/update_youtube_feed.py                   # Quét video mới của 31 kênh
python scripts/update_youtube_feed.py --sync-groups     # Quét và gộp lại các cụm kênh liên kết
python scripts/update_youtube_feed.py --backfill        # Bổ sung thời lượng còn thiếu
python scripts/update_youtube_feed.py --backfill-stats  # Cập nhật lại lượt xem và lượt thích
python scripts/update_youtube_feed.py --clean-3d        # Quét lại bộ lọc 2D/short và phân loại thể loại
python scripts/update_youtube_feed.py --repair-parts    # Sắp xếp và đánh số lại các tập bị ghép
python scripts/update_youtube_feed.py --discover-channels # Tìm và chấm điểm kênh 3D mới
```

---

## Deploy lên Vercel

**Qua GitHub:**
1. Push hoặc fork repo lên GitHub.
2. Vào [Vercel](https://vercel.com), chọn **Add New Project** và trỏ tới repo này.
3. Giữ nguyên **Framework Preset** là `Other`, **Root Directory** là `./` rồi bấm **Deploy**.

**Qua Vercel CLI:**

```bash
vercel --prod
```

Mặc định web chạy được ngay mà không cần API Key. Nếu muốn bổ sung thêm, bạn có thể khai báo hai biến môi trường sau trong Vercel Project Settings:

- `YOUTUBE_API_KEY`: dùng thêm YouTube Data API v3 khi tra cứu thống kê video.
- `GH_TOKEN` (hoặc `GITHUB_DISPATCH_TOKEN`): cần có quyền `repo` hoặc `actions:write` để endpoint `/api/cron-update` kích hoạt lại workflow GitHub Actions theo lịch khai báo trong [`vercel.json`](./vercel.json).

---

## Phím tắt

| Phím | Tác dụng |
| :--- | :--- |
| `/` | Nhảy con trỏ vào ô tìm kiếm phim và kênh |
| `Esc` | Đóng khung xem phim, hộp gợi ý ngẫu nhiên hoặc bảng thông báo đang mở |
| `←` / `→` | Chuyển qua lại giữa 6 phim đề cử khi đang focus ở khu vực Hero |
