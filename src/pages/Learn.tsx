import { Link } from 'react-router-dom'
import { CardsIcon, CheckIcon } from '../components/icons/UiIcons'
import { StatBar } from '../components/StatBar'
import { ProgressBar } from '../components/ui/ProgressBar'
import { COURSES } from '../data/courses'
import { useProgress, useT } from '../context/ProgressContext'
import { completedInCourse, courseCompletion, nextLessonId, totalLessons } from '../lib/course'
import { cn } from '../lib/cn'

/** Màn hình Course: toàn bộ unit và lesson của khoá đang học. */
export function Learn() {
  const { progress } = useProgress()
  const t = useT()
  const { track } = progress
  const course = COURSES[track].course
  const completed = new Set(progress.completedLessonIds)
  const upNextId = nextLessonId(progress.completedLessonIds, track)
  const percent = courseCompletion(progress.completedLessonIds, track)

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{course.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{course.description}</p>
        </div>
        <StatBar />
      </header>

      <section className="surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('Tiến độ khoá học', '课程进度')}</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t(
              `${completedInCourse(progress.completedLessonIds, track)}/${totalLessons(track)} bài`,
              `${completedInCourse(progress.completedLessonIds, track)}/${totalLessons(track)} 课`,
            )}
          </p>
        </div>
        <ProgressBar value={percent} label={t('Tiến độ khoá học', '课程进度')} className="mt-3" />
      </section>

      {course.units.map((unit) => (
        <section key={unit.id} className="space-y-3">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{unit.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{unit.description}</p>
          </div>

          <ul className="space-y-2">
            {unit.lessons.map((lesson) => {
              const isDone = completed.has(lesson.id)
              const isNext = lesson.id === upNextId

              return (
                <li key={lesson.id}>
                  <Link
                    to={`/lesson/${lesson.id}`}
                    className={cn(
                      'surface flex items-center gap-3 rounded-2xl p-4 transition hover:shadow-md active:scale-[.99]',
                      isNext && 'ring-2 ring-brand-400',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg',
                        isDone
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                      )}
                    >
                      {isDone ? <CheckIcon size={20} /> : <CardsIcon size={20} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">
                        {lesson.title}
                      </span>
                      <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
                        {t(`${lesson.wordIds.length} từ`, `${lesson.wordIds.length} 个词`)} · {lesson.description}
                      </span>
                    </span>
                    {isNext && !isDone && (
                      <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                        {t('Tiếp theo', '下一课')}
                      </span>
                    )}
                    {isDone && <span className="sr-only">{t('Đã hoàn thành', '已完成')}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
