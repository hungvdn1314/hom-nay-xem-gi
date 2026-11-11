# Hôm Nay Xem Gì - Kho Phim Hoạt Hình & Review 3D Chiếu Rạp

Nền tảng xem và khám phá hơn **1.564 bộ phim hoạt hình 2D/3D**, tu tiên, mạt thế, hệ thống tuyển chọn từ **8 kênh review YouTube hàng đầu**, phát triển theo phong cách **Nordic Minimalist Pure Glass** (Bắc Âu Tinh Khiết) với luồng trực tiếp 24h và hệ thống thông báo tập mới thông minh.

---

## 🌟 Điểm Nhấn & Tính Năng Nổi Bật

1. **Giao Diện Bắc Âu Tinh Khiết (Nordic Minimalist Pure Glass)**:
   - Tông nền Arctic Slate (`#0B0D11`) kết hợp bề mặt kính mờ siêu mịn (*Frosted Glass*) và điểm nhấn Xanh Băng Glacier (`#38BDF8`).
   - Font chữ chuẩn quốc tế **Plus Jakarta Sans** hiển thị sắc nét 100% dấu tiếng Việt.
   - Thẻ phim tỷ lệ **16:9 Widescreen** chuẩn rạp, không méo hay mờ ảnh thumbnail.

2. **⚡ Dòng Thời Gian "Mới Cập Nhật Trong 24h Qua"**:
   - Tab phân loại riêng biệt với huy hiệu cập nhật theo thời gian thực (*"15 phút trước"*, *"1 giờ trước"*...).
   - Đánh dấu tập mới và phân loại series theo thời gian phát hành.

3. **🔔 Hệ Thống Thông Báo Tập Mới (Notification & Follow Tracker)**:
   - Chuông thông báo trên Header hiển thị số tập mới chưa đọc của các phim bạn đang theo dõi.
   - Bảng Popover kính mờ cho phép nhấp vào thông báo là mở ngay tập phim mới trong rạp chiếu.
   - Nút "Đã đọc hết" và tự động đồng bộ qua LocalStorage.

4. **Trình Chiếu Rạp Cinema Theater Modal**:
   - Tích hợp video YouTube mượt mà, không quảng cáo phụ.
   - Ma trận chọn tập dạng viên thuốc (`[Tập 1]`, `[Tập 2]`... `[Tập 50]`) với nhãn `[MỚI]` cho tập vừa cập nhật.

5. **🎲 Gợi Ý Phim Ngẫu Nhiên: "Hôm Nay Xem Gì?"**:
   - Bấm nút xúc xắc trên Header hoặc thanh điều hướng để hệ thống tự động chọn một siêu phẩm dài tập đỉnh cao ($\ge$ 2 tiếng).

6. **Bộ Lọc Đa Tầng & Tìm Kiếm Tức Thì**:
   - Tìm kiếm không dấu với độ trễ tối ưu 160ms, phím tắt `/`.
   - Lọc theo 10 thể loại phim và 8 kênh review uy tín.

---

## 🚀 Hướng Dẫn Deploy Lên Vercel

Dự án là ứng dụng Single Page Application (SPA) thuần tĩnh (`HTML + CSS + Vanilla JS`), **không cần cài đặt Node.js hay build step phức tạp**, deploy lên Vercel chạy ngay 100% sau 30 giây!

### Cách 1: Deploy qua GitHub (Khuyên dùng)
1. Khởi tạo Git và Commit mã nguồn:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Hom Nay Xem Gi platform with Nordic Pure Glass UI"
   ```
2. Tạo Repository mới trên GitHub (ví dụ: `hom-nay-xem-gi`) và push lên:
   ```bash
   git remote add origin https://github.com/<tai-khoan-cua-ban>/hom-nay-xem-gi.git
   git branch -M main
   git push -u origin main
   ```
3. Đăng nhập [vercel.com](https://vercel.com) $\rightarrow$ Bấm **"Add New..."** $\rightarrow$ **"Project"** $\rightarrow$ Chọn repo `hom-nay-xem-gi`.
4. Cấu hình trên Vercel:
   - **Project Name:** `hom-nay-xem-gi`
   - **Framework Preset:** `Other` (hoặc để tự động nhận diện)
   - **Root Directory:** `./`
   - Bấm **Deploy**.
5. Trang web của bạn sẽ có tên miền miễn phí dạng:  
   👉 **`https://hom-nay-xem-gi.vercel.app`**

### Cách 2: Deploy trực tiếp bằng Vercel CLI
Nếu bạn đã cài Vercel CLI trên máy tính:
```bash
vercel
```
(Làm theo hướng dẫn trên terminal và chọn `y` cho các cấu hình mặc định).

---

## 💻 Chạy Cục Bộ (Local Development)

- Click đúp vào file [`run_web.bat`](file:///c:/Users/Admin/Documents/antigravity/film-ai-3d/run_web.bat) trên Windows để tự động mở trình duyệt tại `http://localhost:8080`.
- Hoặc chạy lệnh:
  ```bash
  python -m http.server 8080
  ```
