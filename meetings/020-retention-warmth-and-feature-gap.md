# Meeting #020 — Độ ấm & khả năng duy trì sử dụng; khoảng trống tính năng

Ngày: 2026-09-15
Trạng thái: DECIDED 2026-09-15 — product owner duyệt W1–W6 theo ưu tiên đề xuất; việc kế tiếp là B5 (Result + Daily Close); UI Figma sẽ được product owner xuất dưới dạng code và gửi vào repo
Người đề xuất: Repo Task Runner (agent), theo yêu cầu của product owner
Đọc cùng: `docs/PRODUCT_THESIS_V2.md` §11–§13, `meetings/003-behavioral-system.md`, `docs/MVP_SCOPE_V1.md`, `docs/design/FIGMA_AI_VISUAL_DIRECTION_ADDENDUM_V1.md`, `docs/design/UI_SHELL_DESIGN_SYSTEM_V1.md`

## 1. Vấn đề product owner nêu

> Các ứng dụng quản lý cuộc sống hiện tại quá khô khan, người dùng khó duy trì sử dụng app.

Mục tiêu sản phẩm: quản trị cuộc sống với sự hỗ trợ của AI Agent cá nhân hoá.

## 2. Chẩn đoán: vì sao app quản lý cuộc sống "khô"

1. **App là cơ sở dữ liệu có giao diện.** Người dùng nhập, app lưu. Không có gì "xảy ra" giữa hai lần mở app, nên không có lý do quay lại ngoài kỷ luật.
2. **Tiến bộ chỉ được thể hiện bằng số.** Streak, %, điểm. Khi số xấu, app trở thành nguồn tội lỗi; người dùng tránh mở app — đây là nguyên nhân số một của churn ở nhóm này.
3. **Phản tư là biểu mẫu.** Daily review = 5 ô nhập. Không ai muốn điền form mỗi tối.
4. **AI được trình bày như công cụ.** Chat box, sparkles, "AI generated". Không tạo cảm giác *được hiểu*, chỉ tạo cảm giác *được xử lý*.
5. **Không có ký ức hữu hình.** App không nhắc lại điều bạn đã nói tuần trước, nên không có quan hệ; mỗi lần mở là từ đầu.

LifeOS đã có sẵn nền để giải quyết cả năm điểm này (Season, Not Now, Why This, Daily Close, Weekly Reset, memory có xác nhận). Vấn đề là **cách thể hiện**, không phải thiếu đối tượng miền.

## 3. Ràng buộc không được vượt (đã quyết trong repo)

- Không streak/XP/game economy (`MVP_SCOPE_V1` "Explicitly out of MVP", Thesis §13, Brief §28).
- Không life score / radar tâm lý (Research §14).
- Không nợ phục hồi khi bỏ lỡ ngày (Meeting #003 Pattern F, Thesis §11 "Minimal guilt").
- AI vô hình theo mặc định; chỉ hiện provenance khi cần (Addendum V1).
- Anti-dependence: khối lượng tương tác AI không phải chỉ số thành công (Meeting #003 §10, §16.8).
- Tự chủ: kết luận hành vi luôn có mức tin cậy và cần người dùng xác nhận (Meeting #003 §9).

Vì vậy giải pháp **không** phải "gamify". Giải pháp là **sự ấm áp có cấu trúc**: làm cho app cảm thấy như một người đồng hành biết bạn, thay vì một sổ ghi việc.

## 4. Đề xuất: sáu cơ chế "ấm có cấu trúc"

| # | Cơ chế | Ý nghĩa với người dùng | Dựa trên | Chi phí | Ưu tiên đề xuất |
|---|---|---|---|---|---|
| W1 | **Giọng người đồng hành** — LifeOS nói ở ngôi "tôi", ngôn ngữ "Tôi nhận thấy…", "Có vẻ…", "Bạn thấy đúng không?"; chào theo buổi/ngày; không bao giờ ra lệnh hay phán xét. Một thư viện copy chuẩn (`docs/design/COPY_VOICE_V1.md`). | Cảm giác có người đang cùng nhìn, không phải máy đang chấm | Meeting #003 §9 ngôn ngữ cho phép; Addendum V1 | Thấp — chủ yếu copy + quy tắc | **P0, làm ngay** |
| W2 | **Nghi thức thay biểu mẫu** — Mở ngày (≤10s: ngày + mùa + một việc), Khép ngày (≤60s, một câu hỏi mỗi màn, kết bằng một câu tường thuật "Hôm nay bạn đã…"), Tuần nhìn lại như một câu chuyện 5 chương (Thực tế → Chuyển động → Mẫu → Điều chỉnh → Tuần tới). | Quay lại vì nghi thức dễ và dễ chịu, không vì ép | Meeting #003 §11; Sunsama reference | Trung bình — B5 + Weekly Reset | **P0 (B5 / Epic Reflect)** |
| W3 | **Ký ức hữu hình** — "Tuần trước bạn nói…", "Bạn đã chọn để sau việc X từ 12/9"; Season là *chương*: trang Season có dòng thời gian sự kiện thật (bắt đầu, việc xong, quyết định để-sau, ghi chú Khép ngày). Chỉ dùng memory đã xác nhận. | App *biết* mình → có quan hệ, có lý do quay lại | Thesis §10 confidence ladder; Meeting #003 §12 | Trung bình — cần event log đã có ở B3/B4 | **P0 nhẹ trong Season + Reflect; đầy đủ ở Epic #4 ME** |
| W4 | **Tiến bộ có thật, không điểm số** — tường thuật chuyển động ("3 việc đã đưa Outcome X tiến lên"), Season timeline, và **ăn mừng việc đã nói không**: "Bạn đã bảo vệ được sự chú ý khỏi 4 việc trong tuần này." | Thấy mình tiến lên mà không bị chấm điểm; Not Now trở thành thành tích | Thesis §8 Not Now first-class; Research §12 | Thấp–trung bình | **P0 trong Weekly Reset** |
| W5 | **Quay lại không tội lỗi** — màn "Chào mừng trở lại" sau ≥2 ngày vắng: hướng hiện tại + một việc + tuỳ chọn "Có gì đổi không?". Không đếm ngày bỏ lỡ, không đỏ. | Rào cản quay lại = 0 | Meeting #003 Pattern F; Brief §11 Recovery | Thấp — một state của NOW | **P0, làm ngay** |
| W6 | **Cá nhân hoá cảm nhận được** — cường độ gợi ý giảm khi routine ổn (anti-dependence, "chế độ yên lặng"); màu canvas đổi rất nhẹ theo *mùa thật* của người dùng (tint mùa hiện tại); P2: cá tính hình ảnh tuỳ chọn. | App phản ứng với *cuộc đời tôi*, không phải template | Meeting #003 §10; Research §12 "optional user-selectable visual personality later" | Thấp (tint) → cao (cá tính) | **P1** (tint mùa có thể làm ở P0 vì rẻ) |

### Điều cố ý KHÔNG đề xuất

- Linh vật/thú ảo, streak, XP, huy hiệu, bảng xếp hạng, thông báo "đừng bỏ streak".
- Chat bot làm trang chủ; "AI persona" nhiều nhân vật.
- Điểm năng suất / điểm cuộc sống.

Lý do: tất cả đã bị loại trong `MVP_SCOPE_V1` và Thesis §13; và theo chẩn đoán §2, đây chính là nguồn tội lỗi gây churn mà LifeOS muốn tránh.

## 5. Cách đo — không đo bằng số lần tương tác AI

- Tỉ lệ quay lại ngày 2, ngày 7, tuần 2 (theo `MASTER_EXECUTION_PLAN` core funnel).
- Tỉ lệ hoàn thành Khép ngày khi đã mở app buổi tối; thời gian trung vị ≤ 60s.
- Tỉ lệ hoàn thành Weekly Reset; số điều chỉnh được người dùng chấp nhận.
- Tỉ lệ quay lại sau ≥2 ngày vắng (đo hiệu quả W5).
- Khảo sát 1 câu sau tuần 2: "LifeOS có cảm giác hiểu bạn không?" (1–7).

## 6. Khoảng trống tính năng so với 19 màn P0 (`MVP_SCOPE_V1`)

| # | Màn P0 | Trạng thái trên `main` (2026-09-15) |
|---|---|---|
| 1–2 | Welcome / nhu cầu, Quick Life Context | ✔ Clarity Reset bước 1 |
| 3–4 | Brain Dump, Interpretation review | ✔ A2–A3 |
| 5–6 | Focus Conflict, Current Season builder | ✔ A4 |
| 7–8 | NOW, Next Action edit | ✔ B3 (edit inline) |
| 9 | Focus Mode | ✔ B4 V0 (timer tuỳ chọn đã có ở Epic #8) |
| 10 | Complete / postpone / drop result | ✘ B5 (#41) |
| 11 | Get Unstuck | ✘ chưa có slice |
| 12 | Daily Close | ✘ B5 (#41) |
| 13 | Weekly Reset | ✘ Slice C |
| 14 | Insight confirmation | ✘ Slice D |
| 15 | Projects / Outcomes nhẹ | ✘ (Outcome tồn tại trong domain, chưa có UI) |
| 16 | Incubator / Not Now | ✘ (dữ liệu có từ A4, chưa có màn riêng) |
| 17 | ME / Operating Preferences | ✘ Epic #4 |
| 18 | Ask LifeOS | ✘ Slice D |
| 19 | Settings / privacy / memory | ✘ |

**Admin console:** đã có spec (`ADMIN_CONSOLE_SPEC_V1`, canonical) nhưng nằm ngoài MVP người dùng. Đề xuất: làm **Admin tối thiểu** (Users / AI providers / Errors / Privacy ops) chỉ khi bước vào Phase 3 alpha với người dùng thật; trước đó ưu tiên đóng vòng lặp P0.

### Thứ tự đề xuất (đóng vòng lặp trước, mở rộng sau)

1. **B5** — Result selector + Daily Close (W2 + W1 áp vào ngay) → vòng lặp Act → Reflect khép kín.
2. **W5 Welcome-back state** trong NOW (rẻ, tác động trực tiếp lên quay lại).
3. **Get Unstuck** (Journey B) — friction diagnosis + resize.
4. **Weekly Reset** (W2 + W4) — checkpoint thích nghi chính.
5. **Incubator/Not Now view + Season timeline** (W3, W4).
6. **ME + Insight confirmation + Settings/memory** (W3 đầy đủ, W6).
7. **Ask LifeOS.**
8. **Admin tối thiểu** khi vào alpha.

## 7. Figma

Product owner yêu cầu đọc UI từ Figma để bổ sung UI và code. Repo hiện chưa có link file Figma; agent chưa có kết nối Figma. Cần: (a) link file/page, (b) một trong hai cách truy cập — Figma REST API bằng personal access token (skill riêng, chỉ đọc), hoặc export frame/Dev Mode do product owner cung cấp.

## 8. Quyết định cần product owner

1. Duyệt bộ sáu cơ chế §4 (hoặc chọn tập con) làm **quyết định sản phẩm**, để agent được phép đưa vào code — hiện các cơ chế này chưa có trong spec nên theo quy tắc repo không được tự thêm.
2. Xác nhận thứ tự §6 (đặc biệt: B5 trước Admin).
3. Cung cấp link Figma + cách truy cập (§7).

## 9. Quyết định (2026-09-15)

1. Duyệt toàn bộ W1–W6 theo ưu tiên ở §4. Các cơ chế này từ nay là quyết định sản phẩm và được phép đưa vào spec/code.
2. Việc kế tiếp: **B5 — Result selector + Daily Close**, áp W1 (giọng đồng hành) và W2 (nghi thức ≤60s) ngay trong B5.
3. Figma: product owner sẽ xuất code giao diện và gửi lên; agent đối chiếu với design system V1 khi tích hợp.
4. Product owner lưu ý app "thiếu chức năng Brain Dump": Brain Dump hiện chỉ có trong Clarity Reset bước 2. Hiểu là thiếu **Ghi nhanh độc lập** (global quick capture, `PRODUCT_SURFACE_SPEC_V1` §1.3) — cần xác nhận và xếp lịch ngay sau B5.
