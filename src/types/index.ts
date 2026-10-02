/** Kiểu dữ liệu dùng chung cho toàn bộ ứng dụng. */

/**
 * Một câu mẫu: từ đang học ghép với những từ khác thành câu hoàn chỉnh.
 *
 * Câu nào cũng có audio đọc **cả câu**, sinh sẵn từ chính `pinyin` dưới đây —
 * xem `docs/example-sentences.md`.
 */
export interface ExampleSentence {
  /** Câu tiếng Trung, có dấu câu: `你叫什么名字？`. */
  hanzi: string
  /**
   * Pinyin theo từng âm tiết, mỗi chữ Hán đúng một âm tiết: `Nǐ jiào shén me míng zi?`.
   * Viết hoa chữ đầu câu và tên riêng; dấu câu dính vào âm tiết đứng trước.
   */
  pinyin: string
  /** Nghĩa tiếng Việt. */
  meaning: string
}

/**
 * Một từ vựng. Mỗi từ luôn có đủ Hanzi / Pinyin / nghĩa để hiển thị trên flashcard.
 *
 * Khoá tiếng Việt dùng chung kiểu này: `hanzi` là chữ của thứ tiếng đang học
 * (`xin chào`), `pinyin` để rỗng vì chữ Quốc ngữ đã ghi sẵn cách đọc, và
 * `meaning` là nghĩa tiếng Trung. Câu mẫu cũng vậy.
 */
export interface Word {
  id: string
  hanzi: string
  pinyin: string
  meaning: string
  /**
   * Câu mẫu có chứa từ này. Câu đầu tiên là câu chính: hiện ở mặt sau
   * flashcard, và được ưu tiên cho bài ghép câu.
   */
  examples: ExampleSentence[]
}

/** Một bài học: gồm một nhóm từ vựng và phần luyện tập đi kèm. */
export interface Lesson {
  id: string
  title: string
  description: string
  wordIds: string[]
}

/** Một chủ đề, gom nhiều bài học. */
export interface Unit {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

/** Một khoá học, ví dụ HSK 1. */
export interface Course {
  id: string
  title: string
  description: string
  units: Unit[]
}

/**
 * Các dạng bài tập. Bốn dạng đầu là của Version 2, những dạng sau thêm dần.
 *
 * `tone` và `tone-pair` là hai dạng luyện thanh điệu — thứ quyết định nhất với
 * người mới học tiếng Trung, và cũng là thứ năm dạng còn lại không kiểm được:
 * dạng nào cũng cho chọn giữa những phương án khác hẳn nhau về phụ âm và vần,
 * nên tai có nghe nhầm thanh thì mắt vẫn loại trừ ra đáp án đúng.
 */
export type ExerciseKind =
  | 'multiple-choice'
  | 'matching'
  | 'listening'
  | 'pinyin'
  | 'sentence'
  | 'dictation'
  | 'tone'
  | 'tone-pair'

/** Một lựa chọn trong bài tập trắc nghiệm. */
export interface Choice {
  id: string
  label: string
}

/**
 * Bài tập chọn một đáp án đúng: trắc nghiệm nghĩa, nghe, chọn pinyin, hoặc
 * phân biệt thanh.
 *
 * `tone-pair` dùng chung cấu trúc này vì cách chơi và cách chấm y hệt; chỉ
 * khác ở chỗ bốn phương án được dựng từ cùng một từ, chỉ lệch nhau đúng cái thanh.
 */
export interface ChoiceExercise {
  id: string
  kind: Extract<ExerciseKind, 'multiple-choice' | 'listening' | 'pinyin' | 'tone-pair'>
  /** Từ vựng được hỏi. */
  wordId: string
  prompt: string
  choices: Choice[]
  correctChoiceId: string
}

/** Bài tập ghép Hanzi với nghĩa. */
export interface MatchingExercise {
  id: string
  kind: Extract<ExerciseKind, 'matching'>
  prompt: string
  left: Choice[]
  right: Choice[]
  /** leftId -> rightId */
  answerKey: Record<string, string>
}

/**
 * Bài ghép câu: bấm từng mảnh chữ theo thứ tự để dựng lại câu.
 *
 * Đề bài là nghĩa tiếng Việt, nên người học phải nhớ cả từ lẫn trật tự từ —
 * thứ mà bài trắc nghiệm không kiểm được.
 */
export interface SentenceExercise {
  id: string
  kind: Extract<ExerciseKind, 'sentence'>
  /** Từ vựng mà câu ví dụ này đi kèm. */
  wordId: string
  prompt: string
  /** Nghĩa tiếng Việt của câu — đây là đề bài. */
  meaning: string
  /** Câu mẫu gốc, để chấm xong thì hiện lại cả câu kèm pinyin và audio. */
  sentence: ExampleSentence
  /** Câu đúng, đã bỏ dấu câu và khoảng trắng. */
  answer: string
  /** Các mảnh của câu đúng, theo đúng thứ tự — dùng để chữa bài. */
  pieces: string[]
  /** Các mảnh để bấm, đã trộn và có thêm mảnh nhiễu. */
  tiles: Choice[]
}

/** Bài nghe rồi viết lại bằng pinyin. */
export interface DictationExercise {
  id: string
  kind: Extract<ExerciseKind, 'dictation'>
  wordId: string
  prompt: string
  /** Pinyin đúng, còn nguyên dấu thanh để hiện lại lúc chữa bài. */
  answer: string
  /** Gợi ý nghĩa, để người mới không bí hoàn toàn. */
  meaning: string
  /** Hiện thay cho nút loa khi máy không phát được âm. */
  hanzi: string
}

/**
 * Bài chọn thanh điệu: nghe một từ một âm tiết rồi bấm một trong bốn thanh.
 *
 * Chỉ một cú chạm, không phải gõ gì — nhưng người học buộc phải phân biệt được
 * cao độ, vì đề bài đưa ra âm tiết **đã bỏ dấu** nên không đọc ra thanh bằng mắt.
 */
export interface ToneExercise {
  id: string
  kind: Extract<ExerciseKind, 'tone'>
  wordId: string
  prompt: string
  /** Âm tiết đã bỏ dấu thanh, ví dụ `hao` — đây là phần hiện cho người học. */
  syllable: string
  /** Thanh đúng, 1–4. */
  tone: number
  /** Hiện thay cho nút loa khi máy không phát được âm. */
  hanzi: string
  meaning: string
}

export type Exercise =
  | ChoiceExercise
  | MatchingExercise
  | SentenceExercise
  | DictationExercise
  | ToneExercise

/** Trạng thái ghi nhớ của một từ, dùng cho flashcard. */
export interface WordProgress {
  wordId: string
  /** Số lần người học bấm "Đã nhớ". */
  known: number
  /** Số lần người học bấm "Chưa nhớ". */
  unknown: number
  /** Ngày ôn gần nhất, dạng YYYY-MM-DD. */
  lastReviewed: string
}

/**
 * Tên icon của một thành tích, trong bộ icon vẽ tay ở
 * `src/components/icons/GameIcons.tsx` — app không dùng emoji.
 */
export type AchievementIconName = 'target' | 'sprout' | 'books' | 'trophy' | 'streak' | 'xp' | 'shine' | 'medal'

/** Thành tích đã mở khoá. */
export interface Achievement {
  id: string
  title: string
  description: string
  icon: AchievementIconName
}

/**
 * Thứ tiếng người học đang học, chọn ở màn chào.
 *
 * - `zh`: người Việt học tiếng Trung — khoá HSK 1, giao diện tiếng Việt.
 * - `vi`: người Trung học tiếng Việt — khoá tiếng Việt, giao diện tiếng Trung.
 */
export type LearnTrack = 'zh' | 'vi'

/** Toàn bộ tiến độ của người học. Đây là dữ liệu được lưu lại giữa các phiên. */
export interface UserProgress {
  name: string
  track: LearnTrack
  xp: number
  /** XP kiếm được trong ngày `lastActiveDate`. */
  xpToday: number
  dailyGoal: number
  streak: number
  /** Ngày học gần nhất, dạng YYYY-MM-DD. Rỗng nghĩa là chưa học buổi nào. */
  lastActiveDate: string
  /** Ngày gần nhất hoàn thành daily goal, dạng YYYY-MM-DD. Rỗng nghĩa là chưa đạt buổi nào. */
  lastGoalDate: string
  completedLessonIds: string[]
  words: Record<string, WordProgress>
  unlockedAchievementIds: string[]
}
