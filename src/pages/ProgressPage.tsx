import type { ReactNode } from 'react'
import { AchievementIcon, LessonsIcon, LockIcon, StreakIcon, WordsIcon, XpIcon } from '../components/icons/GameIcons'
import { StatBar } from '../components/StatBar'
import { WordMap } from '../components/WordMap'
import { ProgressBar } from '../components/ui/ProgressBar'
import { COURSES } from '../data/courses'
import { useProgress, useT } from '../context/ProgressContext'
import { completedInCourse, courseCompletion, totalLessons } from '../lib/course'
import { cn } from '../lib/cn'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_DESCRIPTION_ZH,
  effectiveStreak,
  learnedWordCount,
  levelFromXp,
} from '../lib/gamification'

/** Màn hình Progress: mọi con số người học cần thấy, theo mục 10 của bản thiết kế. */
export function ProgressPage() {
  const { progress, today } = useProgress()
  const t = useT()
  const { track } = progress
  const courseTitle = COURSES[track].course.title

  const level = levelFromXp(progress.xp)
  const streak = effectiveStreak(progress, today)
  const unlocked = new Set(progress.unlockedAchievementIds)

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('Tiến độ', '进度')}</h1>
        <StatBar />
      </header>

      {/* Bản đồ 60 từ — thứ đầu tiên người học muốn thấy khi mở màn hình này. */}
      <WordMap />

      {/* Level */}
      <section className="surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Level {level.level}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {level.xpIntoLevel}/{level.xpForLevel} XP
          </p>
        </div>
        <ProgressBar value={level.percent} label={t('Tiến độ level', '等级进度')} className="mt-3" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          {t(
            `Còn ${level.xpForLevel - level.xpIntoLevel} XP nữa là lên Level ${level.level + 1}.`,
            `再得 ${level.xpForLevel - level.xpIntoLevel} XP 就升到 Level ${level.level + 1}。`,
          )}
        </p>
      </section>

      {/* Các chỉ số */}
      <section className="grid grid-cols-2 gap-3">
        <MetricCard icon={<StreakIcon size={32} />} value={streak} label={t('ngày streak', '连续天数')} />
        <MetricCard icon={<XpIcon size={32} />} value={progress.xp} label={t('tổng XP', '总 XP')} />
        <MetricCard
          icon={<WordsIcon size={32} />}
          value={learnedWordCount(progress, track)}
          label={t('từ đã nhớ', '已记住的词')}
        />
        <MetricCard
          icon={<LessonsIcon size={32} />}
          value={`${completedInCourse(progress.completedLessonIds, track)}/${totalLessons(track)}`}
          label={t('bài đã xong', '已完成的课')}
        />
      </section>

      {/* Khoá học */}
      <section className="surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t(`Khoá ${courseTitle}`, courseTitle)}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {courseCompletion(progress.completedLessonIds, track)}%
          </p>
        </div>
        <ProgressBar
          value={courseCompletion(progress.completedLessonIds, track)}
          tone="emerald"
          label={t(`Tiến độ khoá ${courseTitle}`, `${courseTitle}进度`)}
          className="mt-3"
        />
      </section>

      {/* Mục tiêu hôm nay */}
      <section className="surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('Hôm nay', '今天')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {progress.xpToday}/{progress.dailyGoal} XP
          </p>
        </div>
        <ProgressBar
          value={(progress.xpToday / progress.dailyGoal) * 100}
          tone={progress.xpToday >= progress.dailyGoal ? 'emerald' : 'brand'}
          label={t('Tiến độ mục tiêu hôm nay', '今日目标进度')}
          className="mt-3"
        />
      </section>

      {/* Thành tích */}
      <section>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          {t('Thành tích', '成就')}{' '}
          <span className="font-normal text-slate-500 dark:text-slate-400">
            ({unlocked.size}/{ACHIEVEMENTS.length})
          </span>
        </h2>
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlocked.has(achievement.id)
            const description = t(achievement.description, ACHIEVEMENT_DESCRIPTION_ZH[achievement.id])
            return (
              <li
                key={achievement.id}
                title={description}
                className={cn(
                  'rounded-2xl p-3 text-center shadow-sm ring-1 transition',
                  isUnlocked
                    ? 'bg-gold-400/15 ring-gold-400/40 dark:bg-gold-400/10'
                    : 'bg-white opacity-50 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800',
                )}
              >
                <span className="flex justify-center">
                  {isUnlocked ? <AchievementIcon name={achievement.icon} size={36} /> : <LockIcon size={36} />}
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">{achievement.title}</p>
                <span className="sr-only">
                  {isUnlocked ? t('Đã mở khoá', '已解锁') : t('Chưa mở khoá', '未解锁')}: {description}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function MetricCard({
  icon,
  value,
  label,
}: {
  /** Icon vẽ tay, tự `aria-hidden`. */
  icon: ReactNode
  value: number | string
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="surface rounded-2xl p-4"
    >
      {icon}
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
