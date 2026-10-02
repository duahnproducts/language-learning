import { useProgress, useT } from '../context/ProgressContext'
import { effectiveStreak, levelFromXp } from '../lib/gamification'
import { LevelIcon, StreakIcon, XpIcon } from './icons/GameIcons'

/** Dải chỉ số ở đầu màn hình: streak, XP và level hiện tại — icon vẽ tay, không dùng emoji. */
export function StatBar() {
  const { progress, today } = useProgress()
  const streak = effectiveStreak(progress, today)
  const { level } = levelFromXp(progress.xp)
  const t = useT()

  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 py-1.5 pr-3 pl-2 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25"
        title={t('Chuỗi ngày học liên tiếp', '连续学习天数')}
      >
        <StreakIcon size={20} />
        <span>{streak}</span>
        <span className="sr-only">{t('ngày streak', '天连续学习')}</span>
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1.5 pr-3 pl-2 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/25"
        title={t('Tổng XP', '总 XP')}
      >
        <XpIcon size={20} />
        <span>{progress.xp}</span>
        <span className="sr-only">XP</span>
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1.5 pr-3 pl-2 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/25"
        title={t('Level hiện tại', '当前等级')}
      >
        <LevelIcon size={20} />
        <span>
          <span className="sr-only">Level </span>
          {level}
        </span>
      </span>
    </div>
  )
}
