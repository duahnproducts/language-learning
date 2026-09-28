# Chinese Learning App

Ứng dụng học tiếng Trung cho người mới bắt đầu, xây theo [product_design.md](product_design.md).

**Bản chạy thật: https://duahnproducts.github.io/language-learning/**

Bản hiện tại: toàn bộ vòng học cốt lõi của Version 2 đã chạy được với dữ liệu
HSK 1 lưu ngay trong mã nguồn (**Phase 1 — UI**), kèm chế độ sáng/tối và phần
audio của **Phase 5** — phần audio đã viết xong nhưng cần một project Supabase
mới chạy thật được.

```
Đăng ký → Home → Lesson → Từ vựng → Flashcard → Bài tập → Kết quả → XP/Streak → Tiến độ
```

## Chạy dự án

```bash
npm install
npm run dev
```

| Lệnh | Việc nó làm |
| --- | --- |
| `npm run dev` | Chạy dev server tại http://localhost:5173 |
| `npm test` | Chạy toàn bộ test một lượt |
| `npm run test:watch` | Chạy test ở chế độ theo dõi |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run build` | Build bản production vào `dist/` |
| `npm run generate-audio` | Sinh file phát âm cho từ mới |
| `npm run generate-icons` | Vẽ lại icon của app |
| `npm run prewarm-audio -- --local --dry-run` | Liệt kê audio sẽ sinh, không chạm mạng |
| `npm run prewarm-audio -- --local` | Sinh 60 file mp3 vào `src/assets/audio/` |
| `npm run prewarm-audio` | Sinh audio lên Supabase Storage (cần thêm Supabase) |

Yêu cầu Node.js 20 trở lên. Riêng `prewarm-audio` cần Node 22.6 trở lên, vì nó
chạy thẳng file TypeScript.

## Đã có trong bản này

- **Nội dung**: khoá HSK 1 với 5 unit, 10 bài học, 60 từ. Mỗi từ có Hanzi, pinyin, nghĩa và
  **ba câu mẫu** ghép từ đó với những từ khác — câu nào cũng có pinyin, nghĩa và
  **audio đọc cả câu**, từ đang học được tô ở cả chữ Hán lẫn pinyin. Xem
  [docs/example-sentences.md](docs/example-sentences.md).
- **Màn hình**: Landing, Home, Course, Lesson, Flashcard, Exercise, Result, Progress, Profile.
- **Bài tập**: 8 dạng — trắc nghiệm, chọn pinyin, nghe rồi chọn, ghép nối, và hai
  dạng kiểu Duolingo: **ghép câu** (bấm các mảnh chữ Hán theo đúng thứ tự) và
  **nghe rồi viết** (gõ lại bằng pinyin, không cần dấu thanh). Xem
  [docs/exercises.md](docs/exercises.md).
- **Luyện thanh điệu**: mỗi bài học khép lại bằng hai bài bắt tai phải làm việc —
  nghe rồi **chọn thanh** (bấm 1 trong 4 nút, âm tiết hiện ra đã bỏ dấu), và
  **phân biệt thanh** (bốn cách đọc của cùng một từ, chỉ lệch nhau đúng cái
  thanh: `zāi/zái/zǎi/zài jiàn`). Sáu dạng còn lại đều cho chọn giữa những
  phương án khác hẳn nhau về phụ âm và vần, nên mắt loại trừ được mà tai không
  cần làm gì. Xem [docs/tones.md](docs/tones.md).
- **Zibi**: nhân vật dẫn đường tự vẽ bằng SVG — chào, ra đề, khen khi đúng, chữa
  bài khi sai. Vừa dễ thương vừa buồn cười: mắt to long lanh, má hồng, nháy
  mắt le lưỡi, ngước mắt "….", cười tít giữa một trời lấp lánh, khóc nước mắt
  thành suối kèm bong bóng mũi.
- **Bong bóng chọn**: thanh điều hướng là viên thuốc kính mờ nổi, mục đang chọn
  nằm trong bong bóng trượt nảy sang mục mới; các bộ chọn ở màn Cá nhân dùng
  chung kiểu đó. Xem [docs/bubble.md](docs/bubble.md).
- **Gamification**: XP, level, daily goal, streak và 9 thành tích.
- **Lưu trữ**: tiến độ nằm trong `localStorage`, tự khôi phục khi mở lại.
- **Giao diện sáng/tối**: chọn Sáng, Tối hoặc Theo máy ở màn hình Cá nhân. Mặc
  định bám theo hệ điều hành. Xem [docs/theme.md](docs/theme.md).
- **Nền động**: khu vườn có chim, ong và bướm ban ngày; dải ngân hà, núi soi
  bóng hồ và mưa sao băng ban đêm — và cảnh nở dần theo XP hôm nay, nên nhìn
  nền là biết đã học tới đâu.
  Vẽ hoàn toàn bằng CSS và SVG nên không làm nặng thêm bản offline. Chọn Đầy
  đủ / Tĩnh / Tắt ở màn hình Cá nhân. Xem [docs/scene.md](docs/scene.md).
- **Bản đồ 60 từ**: màn hình Tiến độ có một bản đồ chia 5 unit — mỗi từ đã nhớ
  là một ngôi sao trong chòm (chế độ tối) hoặc một bông hoa trong luống (chế độ
  sáng). Học xong một unit là cả chòm sáng hẳn. Xem
  [docs/word-map.md](docs/word-map.md).
- **Phát âm**: 60 file audio cho từ và 179 file đọc cả câu mẫu, thu sẵn và đã
  được máy kiểm thanh điệu, chạy được trên mọi máy kể cả khi không cài giọng
  tiếng Trung. Xem mục [Âm thanh](#âm-thanh).
- **Luyện nói**: đọc to từng từ của bài học vào micro, máy chấm thanh điệu và
  nhịp ngay trên máy — điểm từng âm tiết, đường giọng của mình đè lên hình thanh
  mẫu, và đúng một lời khuyên của Zibi. Tiếng nói không rời khỏi máy và không
  được lưu. Vào từ nút **🎤 Luyện nói** ở màn Từ mới hoặc màn Kết quả. Ngưỡng
  mới chỉnh trên giọng máy, chưa hiệu chuẩn trên giọng người. Xem
  [docs/pronunciation-mvp.md](docs/pronunciation-mvp.md).
- **Dịch**: mục giữa thanh điều hướng, qua lại giữa tiếng Việt, tiếng Trung và
  tiếng Anh. Gõ hoặc bấm micro để nói; ra bản dịch, cặp nào có tiếng Trung thì
  kèm chữ Hán và pinyin, rồi đọc bản dịch lên — bấm loa để nghe lại. Từ và câu có
  trong bài học được tra ngay trên máy, kèm giọng đọc thu sẵn; còn lại hỏi Google
  Dịch. Xem [docs/translate.md](docs/translate.md).
- **Cài được lên điện thoại**: thêm vào màn hình chính iPhone hoặc Android,
  chạy toàn màn hình và **dùng được khi mất mạng**, kể cả phần nghe phát âm.
  Xem [docs/pwa.md](docs/pwa.md).

## Chưa có

- Authentication và Supabase (Phase 2–3). Hiện chỉ hỏi tên và lưu ở máy.
- Spaced repetition cho flashcard. Bản này mới có hai mức "Chưa nhớ" / "Đã nhớ".
- Phần còn lại của chấm phát âm: hiệu chuẩn trên giọng người thật và điện thoại
  thật (mốc M4 ở [docs/pronunciation-mvp.md](docs/pronunciation-mvp.md)), chấm
  câu mẫu, chấm phụ âm đầu và vần. Phần so sánh các hướng ở
  [docs/pronunciation-scoring.md](docs/pronunciation-scoring.md).
- Hội thoại với Zibi: nói chuyện theo kịch bản, đọc câu đáp và được chấm phát
  âm. Đã có phương án kỹ thuật: [docs/dialogue.md](docs/dialogue.md).
- Toàn bộ phần AI ở Phase 8.

## Âm thanh

Khoá HSK 1 **đã có sẵn 60 file phát âm cho từ và 179 file cho câu mẫu** trong
`src/assets/audio/`, sinh bằng
[Piper](https://github.com/OHF-Voice/piper1-gpl) — bộ TTS mã nguồn mở chạy
ngoại tuyến. File nằm trong repo nên mọi người học đều nghe đúng một bản audio,
không phụ thuộc máy họ có cài giọng tiếng Trung hay không.

Máy đọc thẳng từ pinyin viết tay trong dữ liệu, không tự đoán cách đọc chữ Hán,
và **mọi file đều được đo cao độ để kiểm thanh điệu** trước khi vào repo. Giọng
đầu tiên từng đọc mọi thanh 4 thành thanh 1; lý do và số đo ở
[docs/audio-voice.md](docs/audio-voice.md).

Nút phát âm thử bốn nguồn, theo thứ tự:

| Thứ tự | Nguồn | Khi nào dùng |
| --- | --- | --- |
| 1 | File trong `src/assets/audio/` | Đường đi thường gặp. Chạy ngoại tuyến. |
| 2 | CDN Supabase theo hash | Khi đã bật Supabase và từ chưa có file. |
| 3 | Edge Function `/speak` | Chỉ khi (2) trả 404. |
| 4 | Giọng hệ điều hành (Web Speech) | Khi không còn nguồn nào khác. |

Hết cả bốn thì nút chuyển xám kèm hướng dẫn, chứ không im lặng. Bài tập nghe
hiện pinyin thay thế để người học vẫn đi hết được bài.

### Thêm từ mới thì làm gì

Thêm từ vào `src/data/hsk1.ts`, rồi:

```bash
pip install "piper-tts[alignment]" lameenc unicode-rbnf   # chỉ lần đầu
npm run generate-audio
git add src/assets/audio && git commit -m "Add audio for new words"
```

Lần đầu chạy sẽ tải model giọng khoảng 60MB vào `.piper-voices/` (đã được
`.gitignore` loại trừ). Những clip đã có thì bỏ qua, chỉ sinh clip mới hoặc
clip vừa đổi pinyin — `src/assets/audio/manifest.json` ghi lại pinyin đã dùng.

Có test chặn đúng những chỗ dễ quên: thêm từ mà chưa sinh audio, hoặc sửa
pinyin mà chưa sinh lại, thì `src/lib/audioFiles.test.ts` báo đỏ, và CI không
deploy.

### Vì sao không dùng dịch vụ TTS đám mây

[docs/audio-tts.md](docs/audio-tts.md) đề xuất Azure Speech qua Supabase, và
toàn bộ mã cho đường đó vẫn còn trong repo, đã có test. Nhưng mọi dịch vụ TTS
neural — Azure, Google, OpenAI — đều **bắt buộc có thẻ tín dụng** kể cả ở bậc
miễn phí. Chạy Piper tại máy thì không có tài khoản nào để hết hạn, không có
hạn mức để vượt, và giá vẫn bằng không khi khoá học lớn lên.

Đánh đổi là chất lượng giọng thấp hơn giọng neural của Azure một bậc.

Muốn bật đường Supabase về sau thì xem [docs/audio-setup.md](docs/audio-setup.md).
Lúc đó nhớ xoá `src/assets/audio/`, vì nguồn 1 được ưu tiên hơn nguồn 2.

## Cài lên điện thoại

App chạy được như một app thật trên màn hình chính, không cần App Store và
không cần tài khoản Apple.

**iPhone** — mở site bằng **Safari** (Chrome trên iOS không cài được), bấm nút
Chia sẻ ở thanh dưới, kéo xuống chọn **Thêm vào MH chính**. Màn hình Cá nhân
cũng hiện sẵn hướng dẫn này khi phát hiện bạn đang dùng Safari trên iPhone.

**Android** — Chrome tự hiện lời mời cài, hoặc vào menu ba chấm chọn **Cài đặt
ứng dụng**.

Cài xong thì bật chế độ máy bay vẫn học được trọn vẹn: toàn bộ bài học, bài tập
và toàn bộ audio — 60 từ, 179 câu mẫu — đều nằm trong máy.

Vì sao không làm app native để lên App Store: cần tài khoản Apple Developer
99 USD/năm kèm thẻ tín dụng. Chi tiết và những gì PWA **không** làm được trên
iOS nằm ở [docs/pwa.md](docs/pwa.md).

## Cấu trúc mã nguồn

```
src/
├── components/      Component dùng lại: Flashcard, ExampleSentences, BottomNav, AudioButton, ui/
├── pages/           Mỗi màn hình một file
├── components/scene/  Nền động: khung, khu vườn, bầu trời sao
├── components/exercise/  Bài ghép câu, nghe–viết và chọn thanh điệu
├── components/speaking/  Nút micro, hình đường giọng, kết quả chấm phát âm
├── components/icons/     Bộ icon vẽ tay: icon màu cho chỉ số và thành tích, icon nét cho nút bấm — app không dùng emoji
├── context/
│   ├── ProgressContext.tsx  Tiến độ người học
│   ├── SceneContext.tsx     Nền động: đầy đủ / tĩnh / tắt
│   └── ThemeContext.tsx     Chế độ sáng/tối
├── lib/             Logic thuần, không phụ thuộc React
│   ├── gamification.ts   XP, level, streak, thành tích
│   ├── progress.ts       Các phép biến đổi tiến độ
│   ├── exercises.ts      Sinh và chấm cả tám dạng bài tập
│   ├── course.ts         Điều hướng trong khoá học
│   ├── speech.ts         Chuỗi bốn nguồn phát âm
│   ├── audioCacheKey.ts  Khoá cache audio: chuẩn hoá, băm, dựng URL
│   ├── remoteAudio.ts    Gọi CDN rồi mới tới Edge Function, có hạn giờ
│   ├── audioFiles.ts     Quét file audio trong src/assets/audio
│   ├── speechTokens.ts   Pinyin → âm tiết đánh số cho máy đọc, thanh cần nghe thấy
│   ├── sentences.ts      Câu mẫu: ghép chữ với âm tiết, tô từ đang học, tên file audio
│   ├── theme.ts          Đọc/ghi lựa chọn giao diện, gắn vào thẻ html
│   ├── chinese.ts        Tách câu tiếng Trung thành mảnh cho bài ghép câu
│   ├── pinyin.ts         So khớp pinyin người học gõ, bỏ qua dấu thanh
│   ├── tones.ts          Đọc, bỏ và gắn lại dấu thanh cho bài luyện thanh
│   ├── scene.ts          Mốc nở của nền động, mức chuyển động
│   ├── nav.ts            Mục nào của thanh điều hướng đang được chọn
│   ├── wordMap.ts        Toạ độ 60 từ trên bản đồ chòm sao / luống hoa
│   ├── storage.ts        Đọc/ghi localStorage
│   ├── translate.ts      Dịch Việt – Trung – Anh: tra khoá học trước, rồi Google Dịch
│   ├── dictation.ts      Nói thay cho gõ ở màn Dịch: nhận dạng giọng nói của trình duyệt
│   ├── recorder.ts       Chấm phát âm: thu micro ra mẫu thô, tự dừng khi đọc xong
│   ├── dsp.ts            Hạ mẫu, năng lượng từng khung, vùng có tiếng, WAV
│   ├── pitch.ts          Đường cao độ (F0) theo khung 10 ms
│   ├── segment.ts        Cắt bản thu thành đúng số âm tiết của từ
│   ├── toneScore.ts      Chấm thanh điệu một âm tiết
│   ├── pronunciation.ts  Cổng chặn, gộp điểm, chọn một lời khuyên
│   ├── voiceBaseline.ts  Mặt bằng giọng của người học
│   └── referenceAudio.ts Độ dài phần có tiếng của file mẫu, để so nhịp
├── styles/          CSS của nền động, bản đồ từ, Zibi, bài tập, bong bóng chọn và luyện nói
├── services/supabase.ts  Biến môi trường Supabase
├── data/hsk1.ts     Nội dung khoá học
├── data/pronunciationTips.ts  Lời Zibi nói sau mỗi lần chấm phát âm
├── test/fixtures/speech/  Bản đọc đúng và cố tình sai thanh, để test bộ chấm
└── types/           Kiểu dữ liệu dùng chung

supabase/
├── migrations/      Bucket tts, bảng speakable_texts và audio_clips
└── functions/speak/
    ├── handler.ts   Luật của Edge Function — chạy được bằng npm test
    └── index.ts     Vỏ Deno: nối dây với Storage, PostgREST và Azure

scripts/
├── generate-audio.py   Sinh audio bằng Piper, tại máy — đường đang dùng
├── tone_check.py       Đo cao độ để chọn bản đọc đúng thanh nhất
├── dump-clips.ts       Danh sách clip cần sinh, lấy từ src/data
├── generate-speech-fixtures.py  Sinh bản đọc đúng / sai thanh cho test chấm phát âm
└── prewarm-audio.ts    Sinh audio qua Azure + Supabase — đường dự phòng
docs/                      Phương án kỹ thuật cho từng tính năng
```

Quy tắc: mọi luật chơi nằm trong `src/lib` dưới dạng hàm thuần, React chỉ hiển thị. Nhờ vậy phần logic được kiểm thử trực tiếp, không cần dựng DOM.

Edge Function cũng theo quy tắc đó: `handler.ts` nhận mọi phụ thuộc từ ngoài
nên chạy được trong `npm test`, không phải cài Deno chỉ để chạy một bộ test.

## Kiểm thử

868 test, chia làm ba tầng:

- **Logic** (`src/lib/*.test.ts`, `supabase/functions/speak/handler.test.ts`) — XP, level, streak, thành tích, sinh và chấm bài tập, chế độ sáng/tối, nền động, bản đồ 60 từ, khoá cache audio, đọc/ghi dữ liệu hỏng.
  Bộ chấm phát âm được kiểm bằng tín hiệu giả biết trước cao độ, và bằng bản đọc thật của máy — cả đúng lẫn cố tình sai thanh — trong `src/test/fixtures/speech`: bản sai phải bị đánh dấu **đúng ở âm tiết sai**.
- **Dữ liệu** (`src/data/hsk1.test.ts`) — mọi từ đều có đủ trường, không trùng id, không từ nào lạc khỏi bài học; mỗi câu mẫu có đúng một âm tiết pinyin cho mỗi chữ Hán, và mọi âm tiết là âm tiết tiếng Trung có thật.
- **Giao diện** (`src/components/*.test.tsx`, `src/pages/app-flow.test.tsx`, `src/pages/speaking-flow.test.tsx`, `src/pages/translate-flow.test.tsx`) — dựng app thật trong bộ nhớ và đi trọn một buổi học, đúng tiêu chí nghiệm thu của Version 2; màn luyện nói chạy bộ chấm thật, chỉ thay micro bằng giọng dựng sẵn; màn Dịch chạy thật, chỉ thay mạng bằng câu trả lời dựng sẵn của Google.

Test chạy trong `StrictMode` giống hệt bản thật, nên những lỗi do hàm cập nhật state không thuần tuý sẽ lộ ra ngay trong suite.

Chỗ dễ hỏng nhất của phần audio là client và Edge Function băm ra hai hash khác
nhau: lúc đó mọi request đều trượt cache, hoá đơn TTS tăng mà giao diện không
có dấu hiệu gì. `HASH_VECTOR` trong `src/lib/audioCacheKey.ts` chốt lại chuỗi
chuẩn hoá, và cả hai bộ test đều kiểm theo nó.
