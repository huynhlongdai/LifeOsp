# LifeOS — Copy & Voice V1 (W1 · giọng người đồng hành)

Trạng thái: CANONICAL (quyết định Meeting #020, 2026-09-15)
Áp dụng: mọi chuỗi giao diện người dùng trong `apps/web`; mọi màn mới phải tuân theo trước khi merge.

## 1. Lập trường

LifeOS nói như một người đồng hành đang cùng nhìn vào cuộc sống của bạn — không phải máy đang chấm, không phải huấn luyện viên đang thúc. Nó **nhận thấy**, **hỏi**, **đề xuất**, và **tôn trọng quyết định của bạn**. Nó không bao giờ ra lệnh, không đổ lỗi, không tính điểm.

Kiểm tra nhanh: đọc to câu copy. Nếu nghe như một người bạn điềm tĩnh nói với bạn lúc 9 giờ tối — đạt. Nếu nghe như thông báo hệ thống hoặc HLV thể hình — viết lại.

## 2. Ngôi và thì

- LifeOS xưng **"tôi"** khi nó là chủ thể của một nhận xét hoặc hành động chưa chắc: "Tôi nhận thấy…", "Tôi chưa chắc phần này."
- Gọi người dùng là **"bạn"**. Không "người dùng", không "user".
- Ưu tiên câu ngắn, hiện tại, chủ động. Một câu = một ý.
- Sentence case. Không viết HOA cả câu, không tracking rộng để trông "kỹ thuật".

## 3. Từ vựng — dùng / tránh

| Dùng | Tránh |
|---|---|
| việc, việc để bắt đầu | Action, task, item, recommendation |
| mùa hiện tại, hướng hiện tại | Season, Direction, Current Season (trong UI) |
| Gợi ý · Vì sao việc này? | AI đề xuất, AI-generated, confidence 0.84 |
| Đã sắp xếp lại thành · Có thể là việc cần làm · Chưa rõ | extracted entities, interpretation, structured output |
| Để sau · Được giữ lại | Not Now (nhãn), deferred, backlog |
| Có vẻ việc này đang bị chặn | Blocked (nguyên trạng kỹ thuật) |
| Tôi chưa xong phần này. Nội dung của bạn đã được lưu. | Lỗi AI. Thử lại. |
| Đã lưu · Đã ghi · Đã khép ngày | Success! Saved successfully! |
| Xong · Tiến được một phần · Để lúc khác · Đang bị chặn · Bỏ việc này | Done/Failed, Overdue, Missed |

Từ cấm tuyệt đối trong UI: *streak, điểm, %, xếp hạng, quá hạn, thất bại, lười, kém, luôn luôn, không bao giờ* (khi nói về hành vi người dùng).

## 4. Mẫu câu theo tình huống

**Nhận xét chưa chắc (inference):**
- "Tôi nhận thấy việc có 'xong khi' rõ thường được bắt đầu sớm hơn. Bạn thấy đúng không?"
- "Một mẫu có thể đúng: …" — luôn kèm nút *Đúng vậy / Chưa đúng*.

**Không nợ phục hồi (Pattern F):**
- "Chào mừng trở lại. Hướng của bạn vẫn ở đây." + một việc. Không đếm ngày, không đỏ.

**Bảo vệ sự chú ý (Not Now):**
- "Được giữ lại. Bạn không cần nghĩ về điều này lúc này."
- "Bạn đã bảo vệ được sự chú ý khỏi 4 việc tuần này."

**Kết quả việc (B5):**
- Xong: "Việc được ghi là xong. Lần mở tới, NOW sẽ tìm việc tiếp theo."
- Để lúc khác: "Không có nợ quá hạn. Việc chỉ rời khỏi NOW cho tới khi bạn quay lại nó."
- Bỏ: "Bỏ việc này có thể là một quyết định hợp lý nếu nó không còn đáng bảo vệ."

**Khép ngày (B5):**
- Mở: "Hôm nay đã xảy ra" (chỉ sự kiện thật).
- Hỏi: "Điều gì đáng kể hôm nay?" · "Có gì cản bạn hôm nay không?" — luôn có *Bỏ qua*.
- Kết: một câu tường thuật, ví dụ "Hôm nay bạn đã hoàn thành 1 việc, tập trung 25 phút và giữ lại 2 việc cho lúc khác." Không có gì → "Hôm nay bạn đã có mặt. Thế là đủ để khép ngày."

**Lỗi hệ thống / AI:**
- Nói điều gì đã xảy ra + dữ liệu vẫn an toàn + việc làm tiếp: "Tôi chưa xong phần này. Nội dung của bạn đã được lưu. Thử lại hoặc tiếp tục tự sắp xếp."

## 5. Lời chào theo thời điểm

Kicker phía trên heading ngày: *Buổi sáng · Buổi trưa · Buổi chiều · Buổi tối*. Không thêm "Chào buổi sáng, [tên]!" — heading ngày đã là lời chào.

## 6. Kiểm tra trước khi merge

1. Bỏ mọi chữ AI/agent/confidence/evidence — câu còn nguyên nghĩa?
2. Câu có đổ lỗi hay khái quát về con người ("bạn luôn…")? → viết lại.
3. Mọi câu hỏi phản tư đều có đường *Bỏ qua*?
4. Nhãn nút nói đúng điều sẽ xảy ra khi bấm ("Khép ngày" → "Đã khép ngày")?
