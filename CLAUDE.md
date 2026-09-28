# Quy định dành cho Claude

Claude phải luôn tuân thủ các quy định sau đây:

* Sau mỗi lần thay đổi, đều phải tạo một commit git tương ứng.
* Sau mỗi lần thay đổi, đều phải viết hoặc cập nhật các bài test liên quan, và trước khi giao cho user phải đảm bảo tất cả các bài test và nghiệm thu đều đạt.

## Phương án kỹ thuật đã chốt

`docs/` chứa phương án kỹ thuật của từng tính năng. Trước khi làm một tính năng
có tài liệu ở đó, đọc tài liệu trước rồi mới mở mã nguồn.

| Tính năng | Đọc file này trước |
| --- | --- |
| Chấm phát âm cho người học | [docs/pronunciation-mvp.md](docs/pronunciation-mvp.md) — bản thi công đã chốt, miễn phí, chạy trong trình duyệt. [docs/pronunciation-scoring.md](docs/pronunciation-scoring.md) là phần so sánh các hướng và lý do loại. |
| Hội thoại với Zibi | [docs/dialogue.md](docs/dialogue.md) |
| Dịch Việt – Trung – Anh, gõ hoặc nói | [docs/translate.md](docs/translate.md) |
| Audio phát âm | [docs/audio-setup.md](docs/audio-setup.md), [docs/audio-voice.md](docs/audio-voice.md) |
