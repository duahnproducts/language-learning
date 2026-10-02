import type { Achievement, LearnTrack, UserProgress } from '../types'
import { isNextDay } from './date'

/** Phần thưởng XP theo mục 9 của bản thiết kế. */
export const XP_REWARDS = {
  /** Đánh giá xong một flashcard. */
  flashcard: 5,
  /** Trả lời đúng một câu bài tập. */
  correctAnswer: 10,
  /** Hoàn thành trọn vẹn một lesson. */
  lessonComplete: 30,
  /**
   * Đọc một từ ở màn Luyện nói — một lần cho mỗi từ mỗi lượt vào màn. Thưởng
   * việc **có luyện**, không thưởng theo điểm: bộ chấm còn nhiễu vài điểm, đừng
   * để nó làm trọng tài phát XP.
   */
  speaking: 5,
  /** Thưởng thêm khi chạm mục tiêu trong ngày. */
  dailyGoal: 50,
} as const

/** Mục tiêu XP mặc định mỗi ngày. */
export const DEFAULT_DAILY_GOAL = 50

/** Lượng XP cần để đi từ `level` lên level kế tiếp. Càng lên cao càng cần nhiều. */
export function xpToAdvance(level: number): number {
  return 100 + (level - 1) * 50
}

export interface LevelInfo {
  level: number
  /** XP đã tích được trong level hiện tại. */
  xpIntoLevel: number
  /** XP cần có trong level hiện tại để lên level kế tiếp. */
  xpForLevel: number
  /** Phần trăm hoàn thành level hiện tại, làm tròn xuống, 0–100. */
  percent: number
}

/** Quy đổi tổng XP thành level và tiến độ trong level đó. */
export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, Math.floor(totalXp))

  while (remaining >= xpToAdvance(level)) {
    remaining -= xpToAdvance(level)
    level += 1
  }

  const xpForLevel = xpToAdvance(level)
  return {
    level,
    xpIntoLevel: remaining,
    xpForLevel,
    percent: Math.floor((remaining / xpForLevel) * 100),
  }
}

/**
 * Streak mới sau khi người học đạt daily goal trong ngày `today`.
 * Đạt lại trong cùng ngày thì giữ nguyên, nối tiếp ngày hôm trước thì +1, đứt quãng thì về 1.
 */
export function nextStreak(lastGoalDate: string, today: string, currentStreak: number): number {
  if (lastGoalDate === today) return currentStreak
  if (isNextDay(lastGoalDate, today)) return currentStreak + 1
  return 1
}

/**
 * Streak thực tế nhìn từ ngày `today`.
 * Nếu hôm qua và hôm nay đều chưa đạt goal thì chuỗi đã đứt và hiển thị 0.
 */
export function effectiveStreak(progress: UserProgress, today: string): number {
  const { lastGoalDate, streak } = progress
  if (!lastGoalDate) return 0
  if (lastGoalDate === today || isNextDay(lastGoalDate, today)) return streak
  return 0
}

/** Một từ được coi là "đã nhớ" khi người học từng bấm "Đã nhớ" ít nhất một lần. */
export function isWordLearned(progress: UserProgress, wordId: string): boolean {
  return (progress.words[wordId]?.known ?? 0) > 0
}

/**
 * Số từ đã học. Đi qua `isWordLearned` để chỉ có đúng một định nghĩa "đã nhớ".
 *
 * Có `track` thì chỉ đếm từ của khoá đó — từ khoá tiếng Việt có id bắt đầu bằng
 * `vi-`. Không có thì đếm cả hai khoá, như thành tích vẫn đếm.
 */
export function learnedWordCount(progress: UserProgress, track?: LearnTrack): number {
  return Object.keys(progress.words).filter(
    (wordId) =>
      isWordLearned(progress, wordId) && (track === undefined || wordId.startsWith('vi-') === (track === 'vi')),
  ).length
}

/** Mô tả tiếng Trung của từng thành tích, cho người Trung học tiếng Việt. Tên giữ tiếng Anh như bản gốc. */
export const ACHIEVEMENT_DESCRIPTION_ZH: Record<string, string> = {
  'first-lesson': '完成第一课',
  'words-10': '记住 10 个词',
  'words-50': '记住 50 个词',
  'words-100': '记住 100 个词',
  'streak-3': '连续学习 3 天',
  'streak-7': '连续学习 7 天',
  'xp-500': '累计 500 XP',
  'xp-1000': '累计 1,000 XP',
  'unit-master': '完成 5 课',
}

/** Danh sách thành tích có thể mở khoá. */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-lesson', title: 'First Lesson', description: 'Hoàn thành bài học đầu tiên', icon: 'target' },
  { id: 'words-10', title: '10 Words', description: 'Nhớ được 10 từ vựng', icon: 'sprout' },
  { id: 'words-50', title: '50 Words', description: 'Nhớ được 50 từ vựng', icon: 'books' },
  { id: 'words-100', title: '100 Words', description: 'Nhớ được 100 từ vựng', icon: 'trophy' },
  { id: 'streak-3', title: '3 Day Streak', description: 'Học đều 3 ngày liên tiếp', icon: 'streak' },
  { id: 'streak-7', title: '7 Day Streak', description: 'Học đều 7 ngày liên tiếp', icon: 'streak' },
  { id: 'xp-500', title: '500 XP', description: 'Tích luỹ 500 XP', icon: 'xp' },
  { id: 'xp-1000', title: '1,000 XP', description: 'Tích luỹ 1.000 XP', icon: 'shine' },
  { id: 'unit-master', title: 'Unit Master', description: 'Hoàn thành 5 bài học', icon: 'medal' },
]

/** Điều kiện mở khoá của từng thành tích. */
const RULES: Record<string, (progress: UserProgress) => boolean> = {
  'first-lesson': (p) => p.completedLessonIds.length >= 1,
  'words-10': (p) => learnedWordCount(p) >= 10,
  'words-50': (p) => learnedWordCount(p) >= 50,
  'words-100': (p) => learnedWordCount(p) >= 100,
  'streak-3': (p) => p.streak >= 3,
  'streak-7': (p) => p.streak >= 7,
  'xp-500': (p) => p.xp >= 500,
  'xp-1000': (p) => p.xp >= 1000,
  'unit-master': (p) => p.completedLessonIds.length >= 5,
}

/**
 * Trả về danh sách id thành tích đã mở khoá.
 * Thành tích đã mở thì không bao giờ bị lấy lại, kể cả khi streak về 0.
 */
export function evaluateAchievements(progress: UserProgress): string[] {
  const unlocked = new Set(progress.unlockedAchievementIds)
  for (const achievement of ACHIEVEMENTS) {
    if (RULES[achievement.id]?.(progress)) unlocked.add(achievement.id)
  }
  return ACHIEVEMENTS.filter((achievement) => unlocked.has(achievement.id)).map((a) => a.id)
}

/** Những thành tích vừa mở khoá khi đi từ `before` sang `after`. */
export function newlyUnlocked(before: UserProgress, after: UserProgress): Achievement[] {
  const had = new Set(before.unlockedAchievementIds)
  return ACHIEVEMENTS.filter((a) => after.unlockedAchievementIds.includes(a.id) && !had.has(a.id))
}
