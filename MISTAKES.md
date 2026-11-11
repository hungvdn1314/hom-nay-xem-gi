# Mistakes Log — Film AI 3D (Hôm Nay Xem Gì)

## Confirmed Learnings

### [2026-11-11] Yêu cầu thiết kế lại toàn bộ (Theme/Color + Layout)
- **Sai lầm trước đó:** Khi người dùng yêu cầu "thiết kế lại toàn bộ website từ layout tới theme/color", agent chỉ điều chỉnh cấu trúc layout mà vẫn giữ nguyên hệ màu tối đen/vàng cam cũ, khiến giao diện không tạo được sự đột phá thị giác mới mẻ.
- **Quy tắc bắt buộc:** Khi nhận được yêu cầu thiết kế lại toàn diện, PHẢI thay đổi triệt để toàn bộ hệ thống Design Tokens (Color Palette, Background, Primary/Secondary Accents, Glow lighting, Typography mood) và bố cục tổng thể (Full-bleed streaming, Floating glass, v.v.), không được bám vào màu sắc cũ.
