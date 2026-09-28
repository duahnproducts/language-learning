# Chinese Learning App — Product Design Overview

## 1. Product Overview

**Tên tạm:** Chinese Learning App

### Mục tiêu
Xây dựng một nền tảng học tiếng Trung đơn giản, dễ tiếp cận, lấy cảm hứng từ cách học của Duolingo nhưng tập trung vào:
- Từ vựng
- Pinyin
- Phát âm
- Flashcard
- Bài tập
- Theo dõi tiến độ
- XP
- Streak
- Achievement

### Đối tượng
Người mới bắt đầu học tiếng Trung, đặc biệt là người chưa có nền tảng.

### Nền tảng
- Web responsive: Chrome, Edge, Safari, Firefox
- Mobile-first
- Sau này phát triển thành Android và iOS

---

## 2. Product Scope — Version 2

### Core — bắt buộc
- Authentication
- Home
- Lessons
- Vocabulary
- Flashcards
- Exercises
- Progress

### Gamification
- XP
- Streak
- Level
- Daily Goal
- Achievements

### Supporting
- Audio pronunciation
- Profile
- Settings
- Responsive UI

### Chưa làm
- AI Tutor
- AI chấm phát âm
- AI hội thoại
- AI-generated lessons
- Advanced speech analysis

---

## 3. User Flow

Luồng chính:

Register/Login
→ Home
→ Lesson
→ Vocabulary
→ Practice/Exercise
→ Result
→ XP/Streak
→ Progress

Nguyên tắc: người dùng luôn biết mình đang ở đâu và bước tiếp theo là gì.

---

## 4. Screen Map

Các màn hình chính:

1. Landing / Login
2. Home
3. Course
4. Lesson
5. Flashcard
6. Exercise
7. Progress
8. Profile

### Mobile Navigation
- Home
- Learn
- Translate — dịch qua lại tiếng Việt, tiếng Trung, tiếng Anh; gõ hoặc nói, rồi nghe đọc (xem `docs/translate.md`)
- Progress
- Profile

---

## 5. Learning System

Cấu trúc nội dung:

Course
→ Unit
→ Lesson
→ Vocabulary
→ Practice
→ Exercise
→ Result

### Ví dụ

HSK 1
- Unit 1: Chào hỏi
- Unit 2: Giới thiệu bản thân
- Unit 3: Gia đình
- Unit 4: Số đếm
- Unit 5: Thời gian
- ...

### Cấu trúc một lesson

Vocabulary
→ Listen
→ Practice
→ Exercise
→ Result

---

## 6. Vocabulary System

Mỗi từ nên có:

- Hanzi
- Pinyin
- Meaning
- Audio
- Example sentence

Ví dụ:

你好

nǐ hǎo

Xin chào

Audio

你好，我叫 Tom。

Sau này có thể bổ sung:
- HSK level
- Part of speech
- Example sentences
- Related words

---

## 7. Flashcard System

Luồng cơ bản:

Nhìn từ
→ Tự nhớ nghĩa
→ Lật card
→ Đánh giá
→ Lưu tiến độ

Hai lựa chọn ban đầu:
- Chưa nhớ
- Đã nhớ

Sau này có thể nâng cấp thành Spaced Repetition.

---

## 8. Exercise System

Version 2 chỉ cần 4 loại bài tập:

### 1. Multiple Choice
Ví dụ: “你好” nghĩa là gì?

### 2. Matching
Ghép Hanzi với nghĩa.

### 3. Listening
Nghe audio và chọn từ đúng.

### 4. Pinyin
Chọn pinyin đúng của từ.

Chưa cần:
- Viết câu tự do
- AI chấm phát âm
- Phân tích giọng nói

---

## 9. Gamification

### XP
- Hoàn thành flashcard: +5 XP
- Trả lời đúng: +10 XP
- Hoàn thành lesson: +30 XP
- Hoàn thành daily goal: +50 XP
- Luyện nói một từ: +5 XP — thưởng việc có luyện, không theo điểm (xem `docs/pronunciation-mvp.md`)

### Level
XP tích lũy → Level.

### Daily Goal
Mục tiêu học mỗi ngày.

### Streak
Hoàn thành mục tiêu hằng ngày → duy trì streak.

### Achievement
Ví dụ:
- First Lesson
- 7 Day Streak
- 100 Words
- 1,000 XP

Gamification nên tạo động lực nhưng không làm giao diện rối hoặc biến sản phẩm thành game.

---

## 10. Progress System

Người dùng cần nhìn thấy:

- XP
- Level
- Streak
- Words learned
- Lessons completed
- Daily goal

Ví dụ:

Level 3
████████░░ 80%

🔥 7 day streak
📚 86 words
📖 12 lessons
⭐ 420 XP

---

## 11. UI/UX Guidelines

### Mobile-first
Thiết kế ưu tiên màn hình điện thoại trước.

### Một màn hình — một mục tiêu
Không nhồi quá nhiều chức năng.

### Dễ hiểu với người mới
Hạn chế thuật ngữ kỹ thuật.

### Ít thao tác
Ví dụ:

Home
→ Học tiếp
→ Lesson
→ Exercise

### Visual hierarchy
Ưu tiên:

Tiêu đề
→ Nội dung chính
→ Hành động chính
→ Thông tin phụ

### Phong cách
- Đơn giản
- Sạch
- Dễ đọc
- Nút bấm rõ ràng
- Khoảng cách thoáng
- Responsive
- Có cảm giác thân thiện, tạo động lực

Lấy cảm hứng từ trải nghiệm học của Duolingo nhưng không sao chép giao diện.

---

## 12. Technical Architecture

### Frontend
- React
- TypeScript
- Tailwind CSS

### Backend / Database
- Supabase
- PostgreSQL
- Authentication
- Storage

### Deployment
GitHub
→ Vercel
→ Website online 24/7

Laptop chỉ cần dùng để phát triển và cập nhật project; website không phụ thuộc vào việc laptop phải bật.

### Mobile — giai đoạn sau
React Native + Expo

Backend và database tiếp tục được dùng chung cho Web, Android và iOS.

---

## 13. Project Structure — định hướng

```text
Chinese-Learning-App/
│
├── src/
│   ├── components/
│   │   ├── Button/
│   │   ├── Flashcard/
│   │   ├── ProgressBar/
│   │   └── AudioButton/
│   │
│   ├── pages/
│   │   ├── Home/
│   │   ├── Lessons/
│   │   ├── Flashcards/
│   │   ├── Progress/
│   │   └── Profile/
│   │
│   ├── services/
│   │   └── supabase.ts
│   │
│   ├── data/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
│
├── public/
│   └── audio/
│
├── package.json
└── README.md
```

Không nhồi toàn bộ logic vào một file duy nhất.

---

## 14. Roadmap tổng thể

### Phase 1 — UI
- React project
- Tailwind CSS
- Layout
- Home
- Lesson
- Flashcard
- Exercise
- Progress
- Profile

### Phase 2 — Data
- Supabase
- PostgreSQL
- Database schema
- Dữ liệu HSK 1

### Phase 3 — User
- Register
- Login
- Profile
- Lưu progress

### Phase 4 — Gamification
- XP
- Level
- Streak
- Daily Goal
- Achievement

### Phase 5 — Audio
- Audio player
- Pronunciation button
- Lesson audio
- Flashcard audio

### Phase 6 — Deploy
- GitHub
- Vercel
- Domain
- HTTPS
- Test desktop/mobile

### Phase 7 — Mobile
- React Native + Expo
- Android
- iOS
- Google Play
- App Store

### Phase 8 — AI (tương lai)
Chỉ triển khai sau khi Version 2 ổn định:
- AI Tutor
- AI conversation
- AI pronunciation scoring
- AI-generated exercises
- Personalized learning

---

## 15. Thứ tự thiết kế và phát triển

```text
Product Overview
       ↓
Product Scope
       ↓
User Flow
       ↓
Screen Map
       ↓
Learning System
       ↓
UI/UX
       ↓
Database
       ↓
Technical Architecture
       ↓
CODE
       ↓
Deploy
       ↓
Mobile
       ↓
AI
```

## Nguyên tắc quan trọng

1. Xây MVP trước, không xây toàn bộ Duolingo ngay.
2. Ưu tiên trải nghiệm học hơn số lượng chức năng.
3. Mobile-first ngay từ đầu.
4. Backend và database phải có khả năng dùng chung cho Web/Android/iOS.
5. Không phụ thuộc vào laptop để website hoạt động.
6. Chưa đưa AI phức tạp vào khi hệ thống học cơ bản chưa ổn định.
7. Nội dung ban đầu tập trung vào HSK 1, sau đó mới mở rộng HSK 2, 3...

## Mục tiêu Version 2

Một người mới có thể:

Đăng ký
→ vào Home
→ chọn bài học
→ học từ mới
→ nghe phát âm
→ làm bài tập
→ nhận XP
→ duy trì streak
→ xem tiến độ
→ quay lại học vào ngày hôm sau.

Đó là sản phẩm cốt lõi cần hoàn thành trước khi mở rộng.
