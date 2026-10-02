import type { LearnTrack, UserProgress } from '../types'
import { DEFAULT_DAILY_GOAL, XP_REWARDS, evaluateAchievements, nextStreak } from './gamification'

/** Tiến độ khởi điểm của một người học mới. Tên rỗng nghĩa là chưa qua màn chào. */
export function createProgress(name = '', track: LearnTrack = 'zh'): UserProgress {
  return {
    name,
    track,
    xp: 0,
    xpToday: 0,
    dailyGoal: DEFAULT_DAILY_GOAL,
    streak: 0,
    lastActiveDate: '',
    lastGoalDate: '',
    completedLessonIds: [],
    words: {},
    unlockedAchievementIds: [],
  }
}

/** Chạy lại toàn bộ luật thành tích trên một trạng thái. */
function withAchievements(progress: UserProgress): UserProgress {
  return { ...progress, unlockedAchievementIds: evaluateAchievements(progress) }
}

/** Sang ngày mới thì XP trong ngày được đặt lại về 0. */
function rollOverDay(progress: UserProgress, today: string): UserProgress {
  if (progress.lastActiveDate === today) return progress
  return { ...progress, xpToday: 0, lastActiveDate: today }
}

/**
 * Cộng XP và xử lý mọi hệ quả: mục tiêu ngày, streak, thành tích.
 *
 * Khi người học vừa chạm daily goal, họ nhận thêm `XP_REWARDS.dailyGoal`.
 * Phần thưởng này không tính vào `xpToday` để không kích hoạt goal lần hai.
 */
export function awardXp(progress: UserProgress, amount: number, today: string): UserProgress {
  if (amount <= 0) return progress

  const base = rollOverDay(progress, today)
  const xpToday = base.xpToday + amount
  const justMetGoal = base.xpToday < base.dailyGoal && xpToday >= base.dailyGoal

  const bonus = justMetGoal ? XP_REWARDS.dailyGoal : 0
  const streak = justMetGoal ? nextStreak(base.lastGoalDate, today, base.streak) : base.streak
  const lastGoalDate = justMetGoal ? today : base.lastGoalDate

  return withAchievements({
    ...base,
    xp: base.xp + amount + bonus,
    xpToday,
    streak,
    lastGoalDate,
  })
}

/**
 * Ghi nhận một lần đánh giá flashcard.
 * `known = true` là "Đã nhớ", `false` là "Chưa nhớ". Cả hai đều được cộng XP vì đều là học thật.
 */
export function recordWordReview(
  progress: UserProgress,
  wordId: string,
  known: boolean,
  today: string,
): UserProgress {
  const previous = progress.words[wordId] ?? { wordId, known: 0, unknown: 0, lastReviewed: '' }
  const words = {
    ...progress.words,
    [wordId]: {
      wordId,
      known: previous.known + (known ? 1 : 0),
      unknown: previous.unknown + (known ? 0 : 1),
      lastReviewed: today,
    },
  }

  return awardXp({ ...progress, words }, XP_REWARDS.flashcard, today)
}

/** Ghi nhận một câu bài tập trả lời đúng. */
export function recordCorrectAnswer(progress: UserProgress, today: string): UserProgress {
  return awardXp(progress, XP_REWARDS.correctAnswer, today)
}

/** Ghi nhận một từ đã được đọc to ở màn Luyện nói, bất kể điểm bao nhiêu. */
export function recordSpeakingPractice(progress: UserProgress, today: string): UserProgress {
  return awardXp(progress, XP_REWARDS.speaking, today)
}

/**
 * Đánh dấu hoàn thành một lesson.
 * Học lại một bài đã xong vẫn được cộng XP, nhưng không bị đếm trùng trong danh sách.
 */
export function completeLesson(
  progress: UserProgress,
  lessonId: string,
  today: string,
): UserProgress {
  const completedLessonIds = progress.completedLessonIds.includes(lessonId)
    ? progress.completedLessonIds
    : [...progress.completedLessonIds, lessonId]

  return awardXp({ ...progress, completedLessonIds }, XP_REWARDS.lessonComplete, today)
}

/** Đổi mục tiêu XP mỗi ngày. */
export function setDailyGoal(progress: UserProgress, goal: number): UserProgress {
  return { ...progress, dailyGoal: Math.max(10, Math.floor(goal)) }
}

/** Đổi tên hiển thị. */
export function setName(progress: UserProgress, name: string): UserProgress {
  const trimmed = name.trim()
  return { ...progress, name: trimmed === '' ? progress.name : trimmed }
}

/**
 * Đổi thứ tiếng đang học. Tiến độ của khoá kia vẫn giữ nguyên: id bài và id từ
 * của hai khoá không trùng nhau, nên quay lại là học tiếp đúng chỗ cũ.
 */
export function setTrack(progress: UserProgress, track: LearnTrack): UserProgress {
  return { ...progress, track }
}

/** Người học đã qua màn chào và khai tên chưa. */
export function isOnboarded(progress: UserProgress): boolean {
  return progress.name.trim() !== ''
}
