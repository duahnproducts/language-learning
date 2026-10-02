import { useId } from 'react'
import { useT } from '../../context/ProgressContext'
import { useAudioStatus } from '../../hooks/useAudioStatus'
import { cn } from '../../lib/cn'
import type { DictationExercise } from '../../types'
import { AudioButton } from '../AudioButton'
import { MascotSays } from '../Mascot'

interface DictationInputProps {
  exercise: DictationExercise
  value: string
  checked: boolean
  isCorrect: boolean
  onChange: (value: string) => void
  /** Bấm Enter trong ô gõ — chấm bài luôn, khỏi phải với tay xuống nút. */
  onSubmit: () => void
}

/**
 * Bài nghe rồi viết.
 *
 * Zibi đọc một từ, người học gõ lại bằng pinyin. Không bắt gõ dấu thanh: bàn
 * phím thường không có ǎ hay ǜ, và bắt học cách gõ chúng là dạy một thứ chẳng
 * liên quan gì tới tiếng Trung. Chấm ở `src/lib/pinyin.ts`.
 *
 * Máy không phát được âm thì bài nghe không làm được, nên Zibi đưa chữ Hán ra
 * thay — bài thành "viết pinyin của chữ này", vẫn đáng làm và vẫn đi hết bài
 * được. Đưa pinyin ra như bài nghe chọn đáp án thì lộ luôn đáp án.
 */
export function DictationInput({
  exercise,
  value,
  checked,
  isCorrect,
  onChange,
  onSubmit,
}: DictationInputProps) {
  // Khoá tiếng Việt: đáp án chính là chữ, không có chữ Hán nào để đưa ra thay tiếng.
  const vi = exercise.answer === exercise.hanzi
  const audioStatus = useAudioStatus(vi ? 'vi' : 'zh')
  const inputId = useId()
  const canHear = audioStatus === 'ready'
  const t = useT()

  return (
    <form
      className="mt-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!checked && value.trim()) onSubmit()
      }}
    >
      <MascotSays mood="chao">
        {canHear ? (
          <span className="flex items-center gap-3">
            <AudioButton
              text={exercise.hanzi}
              wordId={exercise.wordId}
              label={t('từ Zibi đọc', 'Zibi 读的词')}
              size="md"
            />
            <span>{t('Nghe mình đọc rồi gõ lại bằng pinyin nhé.', '听我读，然后用越南语写下来。')}</span>
          </span>
        ) : vi ? (
          <span>设备无法发音，请根据下面的意思写出越南语。</span>
        ) : (
          <span className="flex items-center gap-3">
            <span className="font-hanzi text-3xl font-semibold">{exercise.hanzi}</span>
            <span>Máy chưa phát âm được, nên bạn viết pinyin của chữ này nhé.</span>
          </span>
        )}
      </MascotSays>

      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        {t('Gợi ý: nghĩa là', '提示：意思是')} <span className="font-semibold">“{exercise.meaning}”</span>.
      </p>

      <label htmlFor={inputId} className="mt-5 block font-semibold text-slate-900 dark:text-slate-100">
        {t('Pinyin bạn nghe được', '你听到的越南语')}
      </label>
      <input
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={checked}
        placeholder={t('ví dụ: ni hao', '例如：xin chao')}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        className={cn(
          // Nền đặt theo từng trạng thái chứ không ở lớp gốc: Tailwind xếp CSS
          // theo tên tiện ích, nên `bg-white` ở gốc sẽ đè mất `bg-amber-50`.
          'mt-2 h-14 w-full rounded-2xl border-2 px-4 text-lg',
          !checked && 'border-slate-200 bg-white focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900',
          checked && isCorrect && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15',
          checked && !isCorrect && 'border-amber-500 bg-amber-50 dark:bg-amber-500/15',
        )}
      />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {t(
          'Không cần gõ dấu thanh — “ni hao” hay “nǐ hǎo” đều được.',
          '不用打声调符号——“xin chao” 和 “xin chào” 都算对。',
        )}
      </p>
    </form>
  )
}
