import { useNavigate } from 'react-router-dom'
import { useT } from '../context/ProgressContext'
import { ProgressBar } from './ui/ProgressBar'

interface FocusHeaderProps {
  title: string
  /** Tiến độ trong luồng học hiện tại, 0–100. Bỏ trống thì không hiện thanh. */
  progress?: number
  /** Đường quay lại. Bỏ trống thì lùi một bước trong lịch sử. */
  backTo?: string
}

/** Đầu màn hình cho luồng học: nút thoát, tên bước và thanh tiến độ. */
export function FocusHeader({ title, progress, backTo }: FocusHeaderProps) {
  const navigate = useNavigate()
  const t = useT()

  return (
    <header className="mb-5 flex items-center gap-3">
      <button
        type="button"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        aria-label={t('Quay lại', '返回')}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          ✕
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        {progress !== undefined && (
          <ProgressBar value={progress} label={t('Tiến độ bài học', '本课进度')} className="mt-1.5 h-2" />
        )}
      </div>
    </header>
  )
}
