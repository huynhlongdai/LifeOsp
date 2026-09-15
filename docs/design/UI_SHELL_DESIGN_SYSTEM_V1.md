# LifeOS — UI Shell & Design System V1

Trạng thái: IMPLEMENTED trên branch (prototype đã được product owner duyệt 2026-09-15; chờ review PR)
Cập nhật: 2026-09-15
Epic: #8 UX shell & design system
Branch: `feat/ux-shell-design-system-v1`
Prototype duyệt nhìn: `docs/design/prototypes/ui-shell-v1.html`

Đọc cùng:
- `docs/design/FIGMA_AI_VISUAL_DIRECTION_ADDENDUM_V1.md` (ưu tiên cao nhất khi mâu thuẫn)
- `docs/design/VISUAL_REFERENCE_RESEARCH_V1.md`
- `docs/design/FIGMA_AI_DESIGN_BRIEF_V1.md` §20–§25
- `docs/design/PRODUCT_SURFACE_SPEC_V1.md` §1, §6–§9, §11, §13–§14
- `meetings/019-visual-direction-market-research.md`

## 1. Mục đích

Chuyển hướng thị giác đã duyệt ở Meeting #019 thành một hệ token + component có thể implement trong `apps/web`, thay cho lớp trình bày hiện tại (dark navy, gradient, card lồng card, eyebrow in hoa) vốn đã lệch khỏi quyết định đó.

Yêu cầu bổ sung của product owner: “UI 3D hiện đại, năng động”. Quyết định (2026-09-15): hiểu là **chiều sâu tinh tế** bên trong khuôn Addendum V1 — không WebGL, không glass panel lớn, không dark cyberpunk, không neon.

## 2. Ý tưởng cốt lõi: chồng giấy

> Một tờ giấy được nâng lên. Mọi thứ khác nằm yên bên dưới.

Đây là hình ảnh duy nhất được lặp lại xuyên sản phẩm và nó mã hoá đúng nguyên tắc UX gốc: mỗi lần mở app chỉ có **một** thứ nổi lên; các việc khác được giữ lại (không mất, không đòi chú ý). Motif xuất hiện ở:

- card việc duy nhất trên NOW (tờ nâng lên, hai mép tờ mờ lộ phía dưới);
- micro-illustration cho empty/recovery state (ba tờ xếp lệch, trôi rất chậm);
- lane “Để sau” luôn dùng tint lạnh, nói rõ “Được giữ lại. Bạn không cần nghĩ về điều này lúc này.”

## 3. Token

Nguồn implement: `apps/web/src/styles/tokens.css` (tạo ở Pha 2). Tên token dùng tiền tố `--los-`.

### 3.1 Màu

| Token | Giá trị | Vai trò |
|---|---|---|
| `--los-canvas` | `#FBFAF7` | nền app (giấy ấm) |
| `--los-canvas-deep` | `#F3F1EB` | nền Focus, tầng dưới của chồng giấy |
| `--los-sheet` | `#FFFFFF` | bề mặt Tầng 1/2 |
| `--los-sheet-tint` | `#F7F5F0` | nhóm phụ không bóng |
| `--los-ink` / `-2` / `-3` | `#1B1F2A` / `#4B5163` / `#7B8194` | chữ chính / phụ / metadata |
| `--los-line` / `-soft` | `#E6E3DB` / `#EFECE5` | viền input, divider |
| `--los-accent` / `-ink` / `-soft` | `#0F6E6A` / `#0B5350` / `#DDF0EC` | **màu tương tác duy nhất** |
| `--los-active-tint` / `-ink` | `#FFE9D9` / `#8B4B17` | Active — “Đang theo” |
| `--los-maintain-tint` / `-ink` | `#EEEDE7` / `#5D6070` | Maintain — “Giữ nhịp” |
| `--los-notnow-tint` / `-ink` | `#E4ECF5` / `#3E5A7E` | Not Now — “Để sau”, an toàn |
| `--los-reflect-tint` / `-ink` | `#ECE8F3` / `#5C4E80` | REFLECT |
| `--los-success` / `-tint` | `#2E7D5B` / `#DFF1E8` | đã lưu, đã chấp nhận |
| `--los-caution` / `-tint` | `#A9731A` / `#F8EBD3` | chưa chắc, chờ |
| `--los-danger` / `-tint` | `#B4463C` / `#F8E1DE` | lỗi — không đổ lỗi |

Quy tắc: màu không bao giờ là tín hiệu duy nhất (luôn kèm chữ hoặc icon). Không có gradient màu; chỉ một `radial-gradient` trắng rất nhạt ở góc trên trái canvas để gợi ánh sáng.

### 3.2 Chữ

| Vai trò | Font | Cỡ / dòng | Ghi chú |
|---|---|---|---|
| Display | Fraunces 500, `SOFT` 60–70, `opsz` 72–96 | `clamp(2.2rem, 4vw, 3.2rem)` / 1.04 | heading ngày, tiêu đề việc; `<em>` = italic màu accent-ink |
| H1 | Fraunces 500, `SOFT` 60 | 2.6rem / 1.04 | heading khu |
| H2 | Fraunces 500, `SOFT` 50 | 1.8rem / 1.1 | tiêu đề sheet |
| Body | Be Vietnam Pro 400 | 15px / 1.55 | vẽ cho tiếng Việt, dấu thanh rõ |
| Body strong | Be Vietnam Pro 500–600 | — | tên việc trong list |
| Label / Pill | Be Vietnam Pro 600 | .78rem | **sentence case**, không uppercase tracking |
| Numeric / Timer | Be Vietnam Pro 600, `tabular-nums` | 2.6–3.4rem / 1 | thời gian, số đếm |

Font nạp qua Google Fonts `<link>` trong `index.html` với `display=swap`; fallback Georgia / system-ui. Tiếng Việt phải hiển thị đúng ở cả hai họ (đã kiểm tra: Fraunces và Be Vietnam Pro đều có bộ Vietnamese).

### 3.3 Bán kính, khoảng cách

- `--los-r-control: 12px`, `--los-r-card: 20px`, `--los-r-sheet: 28px`, `--los-r-pill: 999px`.
- Spacing theo bậc 4/8. Cột đọc desktop tối đa 980px; rail trái 236px. Mobile padding 20px, chừa 130px đáy cho bottom nav + safe-area.

### 3.4 Chiều sâu — ba tầng vật lý

Mô hình: giấy trên mặt bàn, ánh sáng ấm từ trên trái.

| Tầng | Token | Dùng cho | Không dùng cho |
|---|---|---|---|
| 0 Canvas | không bóng, nhóm bằng `sheet-tint` + khoảng trắng | danh sách phụ, “Sau đó”, metadata | — |
| 1 Sheet | `--los-shadow-sheet` = highlight 1px trên + ambient 2px + key 32px mờ | card việc duy nhất, season card, item Execute “Sẵn sàng”, nav item active | mọi row trong list |
| 2 Lifted | `--los-shadow-lifted` = 60px mờ + blur nền 14px | bottom nav nổi, bottom sheet, vòng Focus | card nội dung |

Quy tắc: tối đa **một** bề mặt Tầng 2 hiển thị cùng lúc; không bóng màu ngoài glow teal rất nhẹ dưới CTA chính; hover Tầng 1 → `--los-shadow-sheet-hover` (nhô thêm ~1px).

### 3.5 Chuyển động — ngân sách

| Việc | Cách | Thời lượng |
|---|---|---|
| Đổi route | nội dung trượt lên 8px + fade | 280ms `--los-ease-out` |
| Đổi state (accepted, saved, đã lưu phân tâm) | spring chỉ trên phần đổi | 420ms `--los-ease-spring` |
| Primary card NOW | tilt ≤ 2° theo con trỏ, chỉ `pointer: fine`, bóng đổi theo | 80ms follow / 420ms spring về |
| Nút | active: xuống 1px, scale .995; hover primary nhô 1px | 160ms |
| Ambient duy nhất | chồng giấy ở empty state trôi 4px | 6s lặp |
| Skeleton | shimmer ngang | 1.4s |

`prefers-reduced-motion: reduce` tắt toàn bộ, kể cả tilt; layout không đổi.

## 4. Component inventory (đối chiếu Brief §20)

Đã có trong prototype và sẽ implement Pha 2:

- **Navigation**: `DesktopSideNav` (rail), `MobileBottomNav` (tabbar nổi), `ContextHeader` (heading ngày/khu + pill mùa), `SecondaryMenu` (Ghi nhanh, Clarity, trạng thái đồng bộ).
- **Decision**: `RecommendationCard` → là `now-hero` (tờ nâng lên), `WhyThisPanel` (disclosure nhẹ, không badge), `CorrectionMenu` (Chỉnh sửa / Để sau / Giả định sai dạng text button).
- **Life structure**: `SeasonCard`, `DirectionLane` ×3 (Active / Maintain / Not Now), `NotNowCard` (= lane notnow).
- **Execution**: `FocusScreen` (ring + clock + capture line), `DistractionCapture` (một dòng, pill), `ActionRow` (list item, biến thể quiet/done).
- **Reflection**: `FactStrip` (3 ô số), `QuestionSheet` (một câu hỏi/viewport, chips).
- **ME**: `ConfirmedBlock`, `LearningBlock` (Đúng vậy / Chưa đúng), `SettingsRow`.
- **System**: `EmptyState` (chồng giấy), `RecoveryState`, `InlineError`, `Skeleton`, `Pill`, `Button` (primary / secondary / text / lg), `Input`.

Chưa làm vòng này (P1+): `BottomSheet`, `SidePanel`, `Toast`, `CapacityBar`, `ResultSelector`, `FrictionSelector`, `MemoryCard`.

## 5. Mapping năm khu

| Khu | Vòng này implement | Hình dạng đích trong prototype | Nguồn dữ liệu |
|---|---|---|---|
| NOW | restyle đầy đủ: ready / no_direction / no_ready_action / blocked / loading / error | ✔ desktop + mobile | `GET /v1/now` (B3) |
| Focus (trong NOW) | restyle `FocusPanel`: start / active / recent / error; active dùng layout immersive trong khu vực nội dung, nav ẩn trên mobile | ✔ | Focus API (B4) |
| DIRECTION | restyle `DirectionPage`: loading / error / empty / ready; ba lane chỉ hiển thị khi có dữ liệu Incubator/Not Now (hiện `CurrentDirectionView` chưa có → ẩn) | ✔ mobile | `GET /v1/direction/current` |
| Clarity Reset | restyle `ClarityReset` + `ClarityPromotion`: need-grid, composer, interpretation, trade-off bucket = 3 tint lane | — (dùng cùng primitives) | hiện có |
| EXECUTE | shell + empty state | ✔ mobile (Sẵn sàng / Cần xác nhận / Bị chặn / Vừa xong) | chưa có API |
| REFLECT | shell + empty state | ✔ mobile (Khép ngày) | B5 chưa merge |
| ME | shell + empty state | ✔ mobile | Epic #4 |

Không thêm màn hình, trạng thái, hay hành vi nào ngoài bảng trên. EXECUTE / REFLECT / ME trong prototype là **hình dạng đích để thống nhất ngôn ngữ hình ảnh**, không phải phạm vi engineering.

## 6. Copy

Theo Addendum V1: ngôn ngữ người dùng, không ngôn ngữ hệ thống.

| Thay | Bằng |
|---|---|
| `RIGHT NOW`, `CURRENT SEASON` (eyebrow in hoa) | “Một việc để bắt đầu”, pill “Mùa hiện tại · <tên>” |
| `Evidence trực tiếp` / `Pattern mạnh` (nhãn confidence trên card) | bỏ khỏi card; chỉ hiện trong “Vì sao việc này?” dưới dạng câu |
| “NOW chỉ yêu cầu một quyết định. Không có backlog phụ và không có client-side ranking.” | “N việc đang được giữ lại. Bạn không cần nghĩ về chúng lúc này.” (khi biết N) hoặc bỏ |
| `NO DIRECTION` | pill “Chưa có hướng” |
| `FOCUS KHÔNG SẴN SÀNG` | “Focus chưa sẵn sàng” |
| `Đây là score/evidence cấp sản phẩm, không phải chain-of-thought ẩn của AI.` | “Những tín hiệu này được lưu lại khi gợi ý được tạo.” |

Nhãn nav hiển thị: Now · Direction · Execute · Reflect · Me (sentence case, kèm icon). `APP_ROUTES` và `routes.ts` giữ nguyên; mapping nhãn nằm trong `App.tsx`.

## 7. Ranh giới kỹ thuật cho Pha 2

- Chỉ chạm `apps/web/src/**` và `apps/web/index.html`, `apps/web/public/manifest.webmanifest` (theme-color / background_color đổi theo canvas).
- Không chạm `packages/domain`, `packages/db`, `apps/api`.
- Giữ toàn bộ props, state machine, API client, aria-* và `role` hiện có; chỉ đổi className/markup trình bày.
- `styles.test.ts` hiện kiểm `.tradeoff-list`, `.bucket-button.selected.active`, `.current-season-card` trong `styles.css` — giữ các selector này (có thể alias) hoặc cập nhật test cùng PR.
- Tách file: `styles/tokens.css` (token), `styles.css` (primitives + shell + clarity), `now.css` (NOW + Focus). `main.tsx` import thêm `tokens.css` trước.

## 8. Approval test trước khi merge

1. Bỏ mọi chữ AI / agent / confidence / evidence — màn vẫn nguyên nghĩa. ✔ theo thiết kế.
2. Ấn tượng đầu: sổ kế hoạch ngày đẹp và tĩnh, không phải dashboard/chatbot.
3. Mỗi màn chỉ có một bề mặt Tầng 2, không quá một card lồng card.
4. 390×844: không tràn ngang, tap target ≥ 44px, bottom nav không che CTA.
5. Reduced motion: không có chuyển động, layout giữ nguyên.
6. Contrast chữ chính ≥ 4.5:1 trên canvas và sheet; chữ trên pastel dùng đúng `-ink` tương ứng.

## 9. Anti-pattern checklist (từ Research §14)

Không được xuất hiện: orb AI, sparkles, avatar trợ lý, chat rail, badge confidence trên mỗi dòng, chip evidence thường trực, mọi row đều là card, gradient/glass lớn, ≥ 3 biểu đồ trên NOW, nhãn ontology kỹ thuật, dashboard task làm home, 6–10 CTA cạnh tranh, số overdue đỏ, life score, dark cyberpunk mặc định.
