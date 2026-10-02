import { useT } from '../context/ProgressContext'
import type { Word } from '../types'
import { AudioButton } from './AudioButton'
import { SentenceLine } from './ExampleSentences'

interface FlashcardProps {
  word: Word
  flipped: boolean
  onFlip: () => void
}

/**
 * Thẻ từ vựng hai mặt.
 * Mặt trước chỉ có chữ Hán để người học tự nhớ nghĩa, mặt sau mới lộ pinyin,
 * nghĩa và câu mẫu chính — câu có nút nghe cả câu.
 *
 * Mặt đang quay đi được đánh dấu `inert`: nó vẫn nằm trong DOM để CSS xoay,
 * nhưng nút loa trên đó không nhận Tab và trình đọc màn hình bỏ qua — nếu
 * không, người dùng bàn phím sẽ nhảy vào một nút mà mắt không nhìn thấy.
 */
export function Flashcard({ word, flipped, onFlip }: FlashcardProps) {
  const [sentence] = word.examples
  const t = useT()

  return (
    <div className="flip-scene w-full">
      <button
        type="button"
        onClick={onFlip}
        aria-pressed={flipped}
        aria-label={flipped ? t('Lật lại mặt trước', '翻回正面') : t('Lật thẻ để xem nghĩa', '翻卡看意思')}
        className="flip-card relative block h-72 w-full cursor-pointer text-left sm:h-80"
        data-flipped={flipped}
        data-testid="flashcard"
      >
        {/* Mặt trước */}
        <div
          inert={flipped}
          className="flip-face absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        >
          <p className="font-hanzi text-7xl font-semibold text-slate-900 sm:text-8xl dark:text-slate-100">
            {word.hanzi}
          </p>
          <AudioButton text={word.hanzi} wordId={word.id} label={word.hanzi} size="md" />
          <p className="text-sm text-slate-400 dark:text-slate-500">{t('Chạm để xem nghĩa', '点一下看意思')}</p>
        </div>

        {/* Mặt sau */}
        <div
          inert={!flipped}
          className="flip-face flip-face-back absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl bg-brand-500 px-5 py-6 text-center text-white shadow-lg dark:bg-brand-600"
        >
          <p className="font-hanzi text-4xl font-semibold">{word.hanzi}</p>
          {word.pinyin && <p className="text-xl text-brand-100">{word.pinyin}</p>}
          <p className="text-xl font-semibold">{word.meaning}</p>
          {sentence && (
            <SentenceLine
              sentence={sentence}
              target={word.hanzi}
              surface="onBrand"
              className="mt-2 w-full rounded-2xl bg-brand-600/60 px-3 py-2.5 dark:bg-brand-700/60"
            />
          )}
        </div>
      </button>
    </div>
  )
}
