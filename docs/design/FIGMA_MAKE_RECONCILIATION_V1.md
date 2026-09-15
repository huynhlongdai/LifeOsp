# Đối chiếu bản Figma Make (2026-09-14) với hướng đã duyệt

Trạng thái: DECIDED 2026-09-15 — product owner duyệt ma trận §3; port Inbox + Incubator trước; theme tối dịu (không neon) xếp P1 (W6)
Cập nhật: 2026-09-15
Nguồn: `docs/design/reference/figma-make-2026-09-14/` (mã nguồn React + Tailwind v4 do product owner export từ Figma Make; đã bỏ 10 MB ảnh tham chiếu — xem §5)
Đọc cùng: `FIGMA_AI_VISUAL_DIRECTION_ADDENDUM_V1.md`, `VISUAL_REFERENCE_RESEARCH_V1.md` §14, `UI_SHELL_DESIGN_SYSTEM_V1.md`, `meetings/019-visual-direction-market-research.md`, `meetings/020-retention-warmth-and-feature-gap.md`

## 1. Bản export là gì

- Prototype **10 màn** (Now, Direction, Execute, Reflect, Me, Inbox, Incubator, AI Coach, Focus, Brain Dump modal) + shell 2 tầng nav (5 khu chính + Inbox / Incubator / Library / AI Coach / Cài đặt).
- **Toàn bộ dữ liệu là mock cứng** trong component; không có tầng API, không có contract nào của `packages/domain`.
- Styling: Tailwind v4 utility + biến CSS riêng (`--primary`, `--pastel-*`…), font **Nunito 900 + Caveat**, 3 theme: *wellness* (xanh xám nhạt), *futuristic* (xanh xám + cyan/cam), *dark* (đen + lime neon "ToyCad").
- Ảnh tham chiếu nạp vào Figma Make: dashboard tối tím kiểu AI-app, dashboard analytics neon, showcase HealthTech/wellness.

Nói ngắn: đây là một **bản khám phá thị giác mạnh** với nhiều ý tưởng màn hình, nhưng được sinh từ tham chiếu "AI dashboard / HealthTech / gamified" — đúng vùng mà Meeting #019 đã quyết định tránh, và đúng cơ chế gây "khô + tội lỗi" mà #020 chẩn đoán.

## 2. Vì sao không thể nạp nguyên khối

| Điểm trong export | Va vào |
|---|---|
| `Streak 🔥12` (Me, profile footer), Habit tracker có streak (Reflect) | `MVP_SCOPE_V1` "Explicitly out of MVP: gamified streak/XP"; Thesis §13; #020 §3 |
| `Life Score 67/100`, "Hoàn thành 71%", điểm 5 vùng sống, "Hiệu suất %" | Research §14 "life score / radar"; Brief §28 |
| Badge `94%` confidence trên insight, "ĐỀ XUẤT AI", "GIẢI THÍCH AI", AI Coach chat làm màn riêng | Addendum V1 "AI vô hình theo mặc định"; Research §14 "confidence badge on every item", "AI chat rail"; Thesis §13 "chatbot as home" |
| Biểu đồ năng lượng theo giờ, "Peak energy ⚡", "+8% vs tuần trước" với dữ liệu giả | Research §6 "chỉ visualize evidence đã đo"; Brief §24 "never show fake probability" |
| Progress `%` theo dự án/season ("Tuần 6/13 · 46%") | Spec §6.2 "progress dựa trên chuyển động Outcome/Action thật, tránh 72% life progress" |
| Badge nguồn Notion / GitHub / Linear / Gmail trong Execute | Tích hợp là P1 (`MVP_SCOPE_V1`), chưa có API |
| Theme *dark* neon lime, gradient border, hero chữ 78px in hoa "NGAY BÂY GIỜ." | Addendum V1 "no neon, no dark cyberpunk default"; hướng editorial Fraunces đã duyệt và implement (Epic #8) |
| Nav phụ *Library*, *AI Coach* | Không có trong IA canonical (5 khu + Clarity); #020 §6 không có Library |
| Kỹ thuật: Tailwind v4 + `@tailwindcss/vite`, mock data, không contract | `apps/web` dùng token CSS thuần (`styles/tokens.css`), contract từ `@lifeos/domain`; nạp Tailwind = hai hệ style song song |

Kết luận: **port theo từng ý, không port theo file.** Mọi thứ đưa vào `apps/web` phải đi qua design system V1 và nối vào API thật.

## 3. Ma trận giữ / chuyển / loại (cần bạn duyệt)

### 3.1 GIỮ — đúng thesis, lấp khoảng trống P0, port sang design system V1

| # | Ý từ export | Vì sao giữ | Lấp gap |
|---|---|---|---|
| K1 | **Inbox** — danh sách capture nhóm theo *Hôm nay / Hôm qua / Tuần này*, trạng thái *chờ / đã xem*, mở từng cái để làm rõ | Ghi nhanh vừa thêm cần một nơi để capture "hạ cánh"; spec §3.1 Inbox overview | Spec §3.1 |
| K2 | **Incubator** — 3 nhóm, mô tả ngắn, "Thêm 23/08 · via Brain Dump", nút *Đưa lên* | Not Now first-class (Thesis §8); F7 trong #021; dữ liệu đã có từ A4 | Gap #16 |
| K3 | **Brain Dump copy**: "Ném hết ra ngoài. Đừng sắp xếp. Đừng lọc." | Đúng giọng W1, hay hơn copy hiện tại → **đã áp vào Ghi nhanh** | — |
| K4 | **"Không làm" (boundary) cạnh "Xong khi"** trên card NOW/Focus | Brief §16 "You do not need to do boundary" đã có trong spec, chưa có UI | Spec §9 |
| K5 | **Thành tựu gần đây** dạng danh sách sự kiện thật + **Milestone tiếp theo** ở Direction | Đúng W3/W4 (tiến bộ có thật, không %) — chỉ khi Outcome có dữ liệu | W3/W4 |
| K6 | Execute nhóm theo **dự án/Outcome** với "Việc đang ở NOW" đánh dấu | Spec §7.1; thay % progress bằng đếm sự kiện thật | Gap #15 |
| K7 | FAB Brain Dump trên mobile, bottom sheet kéo | Đã có (Ghi nhanh) — giữ pattern | — |
| K8 | Focus: danh sách "Bỏ qua trong phiên này" (SKIP_ITEMS) | Là dạng cụ thể của K4 | Spec §9 |

### 3.2 CHUYỂN — ý tốt nhưng phải đổi hình thức để hợp thesis

| # | Ý từ export | Chuyển thành |
|---|---|---|
| C1 | Weekly Review với biểu đồ focus/meeting/admin, % deep work | **Weekly Reset** dạng 5 chương tường thuật (W2/W4): "Tuần này bạn tập trung 12h36 trong 9 phiên; 3 việc đưa Outcome X tiến lên; bạn đã giữ lại 4 việc." — số tuyệt đối đã đo, không %, không so tuần trước bằng % |
| C2 | Direction "questions" 3 câu chọn hướng | Đã có Clarity bước 1 (need) + trade-off; có thể mượn **cách hỏi 1 câu/màn** cho Season builder (F5 ở #021) |
| C3 | AI Coach "insights" + phản hồi ✓ ~ ✕ | Giữ **cơ chế phản hồi** (Đúng vậy / Chưa đúng / Sai) trong **ME → "Điều LifeOS đang học"** (Epic #4); bỏ badge %, bỏ chat, bỏ "reschedule meetings" |
| C4 | Me: "Kiểm soát AI" với thanh "mức tin" 87% | ME → Personalization controls dạng **công tắc + danh sách memory đã xác nhận / đang học**, không thanh % |
| C5 | Theme toggle 3 theme | W6 (P1): **sáng mặc định + một theme tối dịu** (không neon) khi vào P1; canvas ngả tint theo mùa thật |
| C6 | Inbox "aiNote: Phát hiện 2 hướng — thêm vào Incubator?" | Giữ ý "gợi ý sắp xếp" nhưng chỉ hiện **sau khi người dùng mở capture**, ngôn ngữ "Tôi nhận thấy…", có nút *Đúng vậy / Bỏ qua* |

### 3.3 LOẠI — mâu thuẫn quyết định đã có; không port

Streak & habit streak · Life Score / điểm vùng sống · Hoàn thành % / Hiệu suất % · Confidence % trên insight · Biểu đồ năng lượng giả · "Peak energy ⚡" · AI Coach chat làm màn riêng · Nav Library · Badge Notion/GitHub/Linear/Gmail · Theme dark neon lime · Gradient border card · Hero in hoa 78px + Caveat handwriting · Nhãn "ĐỀ XUẤT AI / GIẢI THÍCH AI" · Tailwind runtime.

## 4. Nếu duyệt §3: kế hoạch port

1. **API đọc** (nhỏ, chưa có): `GET /v1/captures?status=&limit=` (danh sách capture của người dùng), `GET /v1/incubator` (incubator items theo season hiện tại). Không thay đổi ghi.
2. **Inbox** (K1): route phụ `/inbox` (không thêm vào 5 khu chính — spec giữ Inbox ở nav phụ); shell hiện có; card theo design system V1; mở → `/clarity?capture=<id>`.
3. **Incubator** (K2): route phụ `/incubator` + liên kết từ dải "Việc khác đang được giữ lại" trên NOW (thay câu chung bằng số thật + link).
4. **K4/K8**: field `notToDo?` cần quyết định miền (Action có "boundary text"?) — đề xuất P1, ghi vào DOMAIN_MODEL trước khi code.
5. **K5/K6**: chờ Outcome UI (gap #15) — làm chung với Execute landing.
6. C1 → Weekly Reset (Slice C) — theo thứ tự #020 §6.

Ước lượng: 1–2 nằm trong một branch nhỏ ngay sau khi bạn duyệt; 3–6 theo thứ tự #020.

## 5. Ghi chú kỹ thuật về file đã nhận

- Zip gồm scaffold Figma Make (`vite.config.ts`, `.figma/make/*`, `AGENTS.md`), 10 màn, `index.css`, 12 ảnh PNG (≈9.6 MB) và 2 prompt tạo ảnh.
- Đã lưu vào repo: `screens/`, `App.tsx`, `index.css`, `pasted_text/` (≈220 KB) để có provenance khi port. **Không** lưu PNG (nặng, là ảnh tham chiếu bên thứ ba, không phải tài sản sản phẩm).
- Export không build được trong monorepo (khác toolchain) và không nên: nó là **tài liệu tham chiếu**, không phải mã nguồn ứng dụng.
