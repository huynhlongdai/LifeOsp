# Meeting #021 — Góp ý từ vai người dùng mới (first-run walkthrough)

Ngày: 2026-09-15
Trạng thái: INPUT — góp ý, không phải quyết định
Người thực hiện: Repo Task Runner đóng vai người dùng mục tiêu, đi qua bản build hiện tại (branch `feat/b5-result-daily-close`) trên harness với dữ liệu giả lập đúng contract
Vai: **Linh, 29 tuổi, solo builder** — đang làm sản phẩm phụ ngoài giờ, 6–7 ý tưởng cạnh tranh, dùng Notion + Todoist + ChatGPT, cảm giác "bận mà không tiến", mở LifeOS lần đầu lúc 21:30 sau một ngày mệt.

Cách đọc: mỗi mục gồm *điều tôi thấy → cảm giác thật → đề xuất*. Xếp theo hành trình, không theo mức độ. Cuối có bảng ưu tiên.

## 1. Mở app lần đầu — tôi rơi vào NOW

**Thấy:** "Thứ Ba, 15 tháng 9" rất đẹp, rồi một tờ giấy lớn: "Chưa cần ép mình chọn một việc" + nút "Xác định hướng hiện tại" / "Làm rõ trong 2 phút".

**Cảm giác:** Nhẹ, không bị bảng điều khiển đè. Nhưng tôi không biết **LifeOS là gì và sẽ làm gì cho tôi**. Tôi mở một app "quản trị cuộc sống" và thứ đầu tiên là "chưa cần chọn việc" — dễ chịu nhưng hơi trống. Tôi phân vân giữa hai nút: "Xác định hướng" nghe to tát; "Làm rõ trong 2 phút" nghe dễ hơn nhưng tôi không hiểu "làm rõ" là làm gì.

**Đề xuất:**
- Lần đầu (chưa có Season, chưa có capture) NOW nên nói **một câu định vị**: "LifeOS giúp bạn biết điều gì quan trọng lúc này và một việc để bắt đầu. Bắt đầu bằng cách đổ hết những gì trong đầu ra — 2 phút." Chỉ **một** nút chính: "Đổ hết ra đây". Nút thứ hai lùi thành text.
- Đổi nhãn "Làm rõ" ở lần đầu thành động từ cụ thể người thường dùng: "Đổ hết ra" / "Viết hết ra". "Làm rõ" hợp cho lần thứ hai trở đi.
- *Welcome (spec §2.1) hiện chưa có màn riêng — trạng thái no_direction đang gánh việc đó. Chấp nhận được ở MVP nếu copy được chỉnh như trên.*

## 2. Clarity bước 1 — "Bạn cần LifeOS giúp điều gì ngay lúc này?"

**Thấy:** 8 thẻ nhu cầu (chưa rõ hướng, không biết làm gì hôm nay, quá tải, trì hoãn…).

**Cảm giác:** Câu hỏi đúng — tôi thấy mình trong "Quá tải" và "Trì hoãn" **cùng lúc**, nhưng chỉ chọn được một. Hơi bị ép. Dòng "đây không phải nhãn tính cách của bạn" là câu tôi thích nhất trong app.

**Đề xuất:** Cho chọn **một chính + một phụ** (hoặc chỉ nói rõ "chọn cái gần nhất, có thể đổi sau"). Với người mệt lúc 21:30, 8 thẻ là nhiều — cân nhắc 4 thẻ đầu + "Khác".

## 3. Clarity bước 2 — Brain Dump

**Thấy:** Ô lớn "Đưa mọi thứ trong đầu bạn ra ngoài", có ô "bối cảnh nhanh".

**Cảm giác:** Đây là khoảnh khắc tốt nhất. Ô to, không có gợi ý phân loại, câu "LifeOS sẽ lưu bản gốc trước" làm tôi tin. **Nhưng** tôi phải đi qua bước 1 mới tới được đây — nếu chỉ muốn xả 3 dòng thì hai bước là quá nhiều. *(Ghi nhanh độc lập vừa được thêm — giải quyết đúng điểm này; cần đưa nút Ghi nhanh lên vị trí dễ thấy hơn ở lần đầu.)*

**Đề xuất:** Ở lần đầu, cho phép bỏ qua bước 1 và hỏi nhu cầu **sau** khi đã viết (AI đọc nội dung rồi gợi ý nhu cầu; người dùng chỉ xác nhận). Viết trước, phân loại sau — đúng tinh thần "không ép ontology lúc nhập".

## 4. Clarity bước 3 — Bản làm rõ

**Thấy:** Các nhóm ý được tách; mỗi dòng có ô sửa và chọn mức chắc chắn.

**Cảm giác:** Được sắp lại giúp tôi thở ra. Nhưng ô **"mức chắc chắn"** trên từng dòng làm tôi cảm thấy đang chấm bài cho máy, không phải đang nhìn lại đời mình. Tôi không biết chọn "medium" hay "low" nghĩa là gì với tôi.

**Đề xuất:** Ẩn mức chắc chắn vào chi tiết; mặc định chỉ hiện hai thao tác: **sửa chữ** và **xoá**. Một dòng nhỏ "Tôi chưa chắc ý này" chỉ hiện với mục AI tự đánh low — đúng Addendum V1 (provenance chỉ khi cần).

## 5. Cân nhắc (trade-off) — Đang theo / Giữ nhịp / Để sau

**Thấy:** Từng ứng viên với 3 nút pill; phải có đúng **một** "Đang theo".

**Cảm giác:** Ràng buộc "chỉ một" ban đầu làm tôi khó chịu (tôi muốn 2!), rồi 10 giây sau thấy đúng — đây là chỗ app khác không dám làm. Lane "Để sau" với câu *"Được giữ lại. Bạn không cần nghĩ về điều này lúc này."* là điểm khác biệt thật. **Nhưng** tôi chưa được nghe **vì sao chỉ một** trước khi bị chặn.

**Đề xuất:** Một câu trước danh sách: "Chỉ một hướng được ưu tiên tuyệt đối trong mùa này — không phải vì những cái khác kém, mà vì sự chú ý của bạn là hữu hạn." Và khi tôi chọn cái thứ hai là "Đang theo", đừng chặn im lặng — hỏi: "Đổi ưu tiên sang việc này? Cái trước sẽ về Giữ nhịp."

## 6. Tạo mùa — form Direction/Season

**Thấy:** Form 2 cột: tên hướng, mô tả, tên mùa, mục đích, ngày bắt đầu/kết.

**Cảm giác:** Sau 3 bước cảm xúc, đột nhiên là **form**. Đây là chỗ tôi mệt nhất. "Target end" và "Primary focus" nghe như quản lý dự án.

**Đề xuất:** Điền sẵn từ bản làm rõ (tên hướng = ý Đang theo; mục đích = câu tôi đã viết) và chỉ hỏi **một** điều: "Mùa này kéo dài tới khi nào?" với 3 chip: 2 tuần / 1 tháng / 3 tháng. Mọi thứ khác sửa được sau ở Direction.

## 7. NOW ready — tờ giấy được nâng lên

**Thấy:** Một việc lớn, "Xong khi", "25 phút", nút "Chấp nhận việc này", "Vì sao việc này?".

**Cảm giác:** Đây là lý do tôi sẽ quay lại. Không có danh sách, không có 12 việc đỏ. "Vì sao việc này?" làm tôi tin hơn ChatGPT vì tôi *kiểm tra được*. Tôi thích nút "Giả định sai" — lần đầu có app cho tôi nói "bạn hiểu nhầm tôi rồi".

**Vướng nhỏ:**
- "Chấp nhận việc này" rồi mới "Bắt đầu Focus" — hai lần bấm cho một ý định. Khi tôi đã sẵn sàng, tôi muốn **một nút "Bắt đầu"** (chấp nhận ngầm).
- "Giả định sai" — tôi không biết sau đó điều gì xảy ra. Nên hiện một dòng: "Tôi sẽ không dùng lý do này nữa và tìm việc khác."
- Dòng "Việc khác đang được giữ lại" tốt, nhưng tôi muốn biết **bao nhiêu** và **xem được** (Incubator view chưa có — đúng gap #16).

## 8. Focus

**Thấy:** Vòng thời gian, tiêu đề, "Xong khi", một dòng ghi phân tâm, ba nút kết thúc.

**Cảm giác:** Yên. Ô "Vừa nghĩ ra gì? Ghi lại rồi quay về…" là chi tiết tôi sẽ kể cho bạn bè. Đồng hồ đếm lùi hơi tạo áp lực khi về 00:00; câu "hết thời gian dự kiến" ổn nhưng vòng đầy màu teal trông như "hết giờ".

**Đề xuất:** Khi qua thời gian dự kiến, vòng chuyển sang **đếm lên** mờ hơn với chữ "đã hơn dự kiến — không sao"; cho phép tắt đồng hồ hoàn toàn (spec: "timer must not create pressure by default").

## 9. Ghi kết quả (B5)

**Thấy:** "Việc này thế nào?" → 5 lựa chọn, mỗi cái một câu hệ quả.

**Cảm giác:** Câu "Bỏ việc này có thể là một quyết định hợp lý…" làm tôi bất ngờ theo hướng tốt. **Nhưng** "Tiến được một phần" hỏi "Còn lại gì?" mà không cho tôi **tạo bước tiếp** — tôi vừa nghĩ ra bước tiếp mà không có chỗ đặt. (Spec 10.3 nói "chỉ tạo qua lựa chọn rõ của người dùng" — vậy hãy cho lựa chọn đó.)

**Đề xuất:** Sau "Tiến được một phần" → dòng tuỳ chọn "Đặt bước tiếp theo?" tạo Action candidate từ "còn lại gì". Sau "Đang bị chặn" → "Ghi lại việc gỡ chặn?" (dẫn vào Get Unstuck sau).

## 10. Khép ngày (B5)

**Thấy:** 3 ô số, danh sách việc, hai câu hỏi tuỳ chọn, câu kết.

**Cảm giác:** ≤60 giây thật. Câu kết *"Hôm nay bạn đã hoàn thành 1 việc, tập trung 25 phút và giữ lại 2 việc cho lúc khác."* là lần đầu một app tóm tắt ngày của tôi mà tôi không cảm thấy bị chấm điểm. Dòng "Ngày mai không có nợ" — tôi tin.

**Vướng:** Tôi khép ngày rồi mở lại app hôm sau: **không thấy lại** câu đó ở đâu. Ký ức hữu hình (W3) chưa có chỗ đứng.

**Đề xuất:** Sáng hôm sau, NOW mở với một dòng mờ phía trên: "Tối qua bạn viết: *bắt đầu được việc mình né cả tuần*." — một câu, rồi biến mất sau lần xem đầu. Đây là W3 rẻ nhất.

## 11. Điều tôi tìm mà không có

| Tôi tìm | Vì sao | Trạng thái repo |
|---|---|---|
| Xem các việc "để sau" | Muốn yên tâm là chúng còn đó | Incubator view — gap #16 |
| Biết mùa này đã đi được bao xa (không phải %) | Muốn cảm giác *chuyển động* | Season timeline — W3/W4 |
| Đổi hướng khi đời thay đổi | Tôi đổi việc thật giữa mùa | Direction edit — P0 §6.1 "edit Direction" chưa có UI |
| Nhắc nhẹ buổi tối để khép ngày | Không thì tôi quên | Notifications — P1, đúng là chưa nên |
| Xoá dữ liệu / biết dữ liệu ở đâu | Tôi vừa đổ hết đời mình vào đây | Settings/privacy — gap #19, **quan trọng với niềm tin hơn tôi nghĩ** |
| Dùng bằng giọng nói lúc đi bộ | Não tôi chạy khi đi | Voice capture — P1 |

## 12. Tổng kết cảm giác

Sau 20 phút: tôi tin app này **không mắng tôi**. Đó là khác biệt lớn nhất so với Todoist (đỏ), Notion (trống), ChatGPT (quên). Thứ giữ tôi lại là **một việc + vì sao + khép ngày một câu**. Thứ làm tôi rời đi sớm sẽ là: (a) hai bước trước khi được viết, (b) form tạo mùa, (c) không thấy lại ký ức ngày hôm trước, (d) không biết dữ liệu mình ở đâu.

## 13. Ưu tiên đề xuất (để product owner quyết)

| # | Việc | Chi phí | Tác động lên duy trì |
|---|---|---|---|
| F1 | NOW lần đầu: một câu định vị + một nút "Đổ hết ra" | Rất thấp (copy + điều kiện) | Cao — first impression |
| F2 | "Bắt đầu" một nút khi việc đã rõ (chấp nhận ngầm) | Thấp | Trung bình |
| F3 | Sáng hôm sau: một dòng nhắc lại câu Khép ngày tối qua (W3 rẻ) | Thấp (đã có daily_closes) | Cao |
| F4 | Ẩn "mức chắc chắn" trong bản làm rõ, chỉ hiện khi AI tự thấp | Thấp | Trung bình |
| F5 | Tạo mùa: điền sẵn + chỉ hỏi độ dài (3 chip) | Trung bình | Cao |
| F6 | Sau "Tiến một phần": tuỳ chọn tạo bước tiếp | Trung bình (Action candidate API đã có) | Trung bình |
| F7 | Incubator view "Đang được giữ lại" | Trung bình | Cao (đã trong gap #16) |
| F8 | Settings tối thiểu: xem/xoá dữ liệu của tôi | Trung bình | Cao với niềm tin |
| F9 | Focus: đếm lên mờ sau dự kiến; cho tắt đồng hồ | Thấp | Thấp–trung bình |
| F10 | Clarity: viết trước, hỏi nhu cầu sau | Cao (đổi thứ tự flow) | Cao — cân nhắc ở vòng sau |

Không đề xuất thêm bất kỳ cơ chế điểm số, streak hay thông báo thúc ép nào — mọi điểm ở trên đều nằm trong thesis hiện có.
