# Chọn thứ tiếng muốn học

> Trạng thái: **đã làm** ngày 2026-10-02.
> Mã: [`src/data/vi1.ts`](../src/data/vi1.ts), [`src/data/courses.ts`](../src/data/courses.ts),
> [`src/lib/vietnamese.ts`](../src/lib/vietnamese.ts), [`src/pages/Landing.tsx`](../src/pages/Landing.tsx).

Mở app lần đầu, người học chọn một trong hai hướng, mỗi thẻ viết bằng tiếng của
người sẽ bấm vào nó:

| Thẻ | Hướng (`progress.track`) | Khoá | Giao diện |
| --- | --- | --- | --- |
| 你好 · Tôi là người Việt · **Học tiếng Trung** | `zh` | HSK 1 | Tiếng Việt |
| Xin chào · 我是中国人 · **学越南语** | `vi` | 越南语入门 | Tiếng Trung |

Chọn xong mới hỏi tên, bằng đúng thứ tiếng đó. Đổi được về sau ở màn Cá nhân;
hai nhãn ở đó cũng mỗi bên một thứ tiếng, để lỡ bấm nhầm vẫn đọc được nút quay
lại. Bản lưu từ trước khi có lựa chọn này được coi là `zh`.

## 1. Hai khoá, một bộ tiến độ

`COURSES` trong `courses.ts` giữ hai khoá. Id của khoá tiếng Việt có tiền tố
riêng — từ `vi-…`, unit `vu1…`, bài `vu1l1…` — nên:

- `completedLessonIds` và `words` dùng chung, đổi khoá qua lại không mất gì;
- các màn trong một bài (`/lesson/:lessonId/…`) tra thẳng theo id bằng
  `findLesson`, không cần biết người học đang ở khoá nào. Chỉ Trang chủ, Học,
  Tiến độ mới hỏi `progress.track`;
- số từ đã nhớ, phần trăm khoá, bài kế tiếp đều tính riêng trong khoá đang
  học. Thành tích thì đếm cả hai khoá.

## 2. Khoá tiếng Việt

Cùng khung với HSK 1 để hai khoá đi song song: 5 unit (问候, 自我介绍, 家庭,
数字, 时间), 10 bài, 60 từ, mỗi từ ba câu mẫu kèm nghĩa tiếng Trung.

Dùng chung kiểu `Word`: `hanzi` chứa chữ tiếng Việt, `pinyin` để rỗng (chữ Quốc
ngữ đã ghi cách đọc), `meaning` là nghĩa tiếng Trung. Giao diện thấy `pinyin`
rỗng thì bỏ dòng pinyin. `vi1.test.ts` chặn: câu mẫu nào cũng chứa đúng từ đang
học, từ nào cũng có câu vừa sức để ghép, bài nào cũng đủ hai từ mang dấu thanh.

## 3. Bài tập

| Dạng | Tiếng Trung | Tiếng Việt |
| --- | --- | --- |
| Trắc nghiệm nghĩa | ✓ | ✓ — hỏi nghĩa tiếng Trung |
| Chọn pinyin | ✓ | — không có phiên âm nào để chọn |
| Nghe rồi chọn | ✓ | ✓ |
| Ghép câu | Mảnh theo từ, cắt bằng từ điển | Mỗi âm tiết một mảnh |
| Nghe rồi viết | Gõ pinyin, không cần dấu | Gõ tiếng Việt, không cần dấu, `d` thay `đ` được |
| Chọn thanh (1 trong 4) | ✓ | — |
| Phân biệt thanh | 4 cách đọc | **6 cách viết**: `chao / chào / cháo / chảo / chão / chạo` |
| Ghép nối | ✓ | ✓ |

Sáu thanh là chỗ khó nhất với tai quen bốn thanh — hỏi/ngã, sắc/nặng nghe rất
gần nhau — nên mỗi bài khép lại bằng hai bài phân biệt thanh trên hai từ khác
nhau. `toneVariants` chỉ đổi dấu ở âm tiết **vốn đã có dấu**: chỗ đặt dấu không
phụ thuộc thanh nào, nên khỏi cài bộ luật đặt dấu. Dấu thanh phải đứng sau dấu
mũ/trăng trong dạng NFD, nếu không `ế` ghép ra `é` kèm mũ lơ lửng.

**Luyện nói chưa có cho khoá tiếng Việt**: bộ chấm chỉ biết bốn thanh tiếng
Trung. Nút ẩn đi, vào thẳng đường dẫn thì bị đưa về.

## 4. Âm thanh

`playWord` thấy chuỗi không có chữ Hán nào thì coi là tiếng Việt: thử file thu
sẵn `vi-<id>.mp3` nếu có, rồi giọng tiếng Việt của máy. Không bao giờ rơi sang
Supabase hay giọng tiếng Trung. Không có giọng thì nút báo rõ cách cài giọng
tiếng Việt, bài nghe đưa nghĩa tiếng Trung ra thay.

**Chưa có file thu sẵn cho tiếng Việt.** iPhone và Android thường có sẵn giọng
tiếng Việt; Windows thì hay thiếu. Sinh bằng Piper như tiếng Trung là bước tiếp
theo — cần tải giọng `vi_VN` của Piper.

## 5. Giao diện hai thứ tiếng

Không có bảng khoá dịch: câu nào viết cả cặp ngay tại chỗ dùng,
`t('Học tiếp', '继续学习')`, với `useT()` ở `ProgressContext.tsx`. Ngoài
`ProgressProvider` (test dựng riêng một nút) thì coi là tiếng Việt. Thẻ `html`
đổi `lang` theo hướng học để trình đọc màn hình đọc đúng giọng.

Còn tiếng Việt khi học tiếng Việt: màn Luyện nói (đã ẩn), và các câu của khoá
HSK 1 — người học khoá tiếng Việt không vào tới.
