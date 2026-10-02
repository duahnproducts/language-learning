import { useState } from 'react'
import { useT } from '../context/ProgressContext'
import { useAudioStatus } from '../hooks/useAudioStatus'
import { cn } from '../lib/cn'
import { isVietnameseText, playWord, type PlayStage } from '../lib/speech'
import { SpeakerIcon, SpeakerOffIcon, SpinnerIcon } from './icons/UiIcons'

interface AudioButtonProps {
  /** Chuỗi cần đọc, tiếng Trung hoặc tiếng Việt. */
  text: string
  /** Id của từ, để tìm file audio thu sẵn. */
  wordId?: string
  /** File thu sẵn cho đúng `text` — dùng cho câu mẫu, vốn không có id như từ. */
  clipUrl?: string | null
  /** Nhãn cho trình đọc màn hình, ví dụ tên từ đang nghe. */
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

/** Cỡ icon theo cỡ nút. */
const ICON_SIZES = { sm: 18, md: 24, lg: 30 }

/** Lời nhắc khi máy không phát âm được, kèm cách khắc phục — bản tiếng Việt và tiếng Trung. */
const HINTS = {
  'no-chinese-voice': [
    'Máy chưa cài giọng tiếng Trung. Trên Windows: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng nói → Chinese (Simplified). Xong thì tải lại trang.',
    '设备没有中文语音。Windows：设置 → 时间和语言 → 语音 → 添加语音 → 中文（简体），然后刷新页面。',
  ],
  'no-vietnamese-voice': [
    'Máy chưa cài giọng tiếng Việt. Trên Windows: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng nói → Tiếng Việt. Xong thì tải lại trang.',
    '设备没有越南语语音。Windows：设置 → 时间和语言 → 语音 → 添加语音 → 越南语（Tiếng Việt），然后刷新页面。',
  ],
  unsupported: [
    'Trình duyệt này chưa phát âm được. Hãy mở bằng Chrome, Edge hoặc Safari bản mới.',
    '这个浏览器不能发音，请用新版 Chrome、Edge 或 Safari 打开。',
  ],
  error: ['Không phát được âm thanh lần này. Thử bấm lại nhé.', '这次没能播放声音，请再点一次。'],
} as const


type Hint = keyof typeof HINTS | null

/**
 * Nút phát âm.
 *
 * Nút luôn hiện, kể cả khi máy chưa phát âm được — bấm vào sẽ hiện hướng dẫn
 * thay vì im lặng không phản hồi.
 */
export function AudioButton({
  text,
  wordId,
  clipUrl,
  label,
  size = 'md',
  className,
}: AudioButtonProps) {
  const status = useAudioStatus(isVietnameseText(text) ? 'vi' : 'zh')
  const t = useT()
  const [stage, setStage] = useState<PlayStage | null>(null)
  const [hint, setHint] = useState<Hint>(null)

  const available = status === 'ready'
  const busy = stage !== null

  async function handleClick(event: React.MouseEvent) {
    event.stopPropagation()
    event.preventDefault()

    if (!available || busy) {
      if (status !== 'ready') setHint(status)
      return
    }

    setHint(null)
    setStage('speaking')
    const result = await playWord({ text, wordId, clipUrl, onStage: setStage })
    setStage(null)

    if (result === 'played') return
    setHint(result)
  }

  return (
    <span className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        aria-label={label ? t(`Nghe phát âm ${label}`, `听 ${label} 的发音`) : t('Nghe phát âm', '听发音')}
        aria-busy={busy}
        data-state={stage ?? (available ? 'idle' : 'unavailable')}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full transition active:scale-95',
          available
            ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-100 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/25 dark:hover:bg-brand-500/25'
            : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700 dark:hover:bg-slate-700',
          busy && 'animate-pulse bg-brand-100 dark:bg-brand-500/30',
          SIZES[size],
          className,
        )}
      >
        {/* Tải file từ mạng có thể mất vài giây: lúc đó hiện vòng quay thay cho cái loa. */}
        {stage === 'loading' ? (
          <SpinnerIcon size={ICON_SIZES[size]} />
        ) : available ? (
          <SpeakerIcon size={ICON_SIZES[size]} />
        ) : (
          <SpeakerOffIcon size={ICON_SIZES[size]} />
        )}
      </button>

      {hint ? (
        <span
          role="status"
          className="absolute top-full z-10 mt-2 w-60 rounded-xl bg-slate-900 px-3 py-2 dark:bg-slate-700 text-center text-xs leading-snug font-normal text-white shadow-lg"
        >
          {t(HINTS[hint][0], HINTS[hint][1])}
        </span>
      ) : null}
    </span>
  )
}
