import { useT } from '../context/ProgressContext'
import { audioUrlForSentence } from '../lib/audioFiles'
import { cn } from '../lib/cn'
import { highlightTarget, type Segment } from '../lib/sentences'
import type { ExampleSentence, Word } from '../types'
import { AudioButton } from './AudioButton'

/** Một dòng chữ, phần thuộc từ đang học được tô. */
function Marked({ segments, markClassName }: { segments: Segment[]; markClassName: string }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.target ? (
          <mark key={index} className={cn('bg-transparent font-semibold', markClassName)}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

interface SentenceLineProps {
  sentence: ExampleSentence
  /** Từ đang học, để tô trong câu. Rỗng thì không tô. */
  target?: string
  /** `onBrand` cho mặt sau flashcard, nơi nền là màu thương hiệu. */
  surface?: 'plain' | 'onBrand'
  className?: string
}

/**
 * Một câu mẫu: nút nghe **cả câu**, chữ Hán, pinyin và nghĩa.
 *
 * Từ đang học được tô ở cả dòng chữ Hán lẫn dòng pinyin, để người học thấy nó
 * đứng ở đâu trong câu và đọc lên thế nào khi đi cùng những chữ khác.
 */
export function SentenceLine({
  sentence,
  target = '',
  surface = 'plain',
  className,
}: SentenceLineProps) {
  const { hanzi, pinyin } = highlightTarget(sentence, target)
  const onBrand = surface === 'onBrand'
  const t = useT()
  // Câu của khoá tiếng Việt không có pinyin.
  const chinese = sentence.pinyin !== ''

  return (
    <div className={cn('flex items-start gap-3 text-left', className)}>
      <AudioButton
        text={sentence.hanzi}
        clipUrl={audioUrlForSentence(sentence)}
        label={t(`câu ${sentence.hanzi}`, `句子 ${sentence.hanzi}`)}
        size="sm"
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p
          lang={chinese ? 'zh-CN' : 'vi'}
          className={cn(
            'font-hanzi text-lg leading-snug',
            onBrand ? 'text-white' : 'text-slate-900 dark:text-slate-100',
          )}
        >
          <Marked
            segments={hanzi}
            markClassName={onBrand ? 'text-amber-200' : 'text-brand-600 dark:text-brand-300'}
          />
        </p>
        {chinese && (
          <p
            lang="zh-Latn-pinyin"
            className={cn(
              'text-sm leading-snug',
              onBrand ? 'text-brand-100' : 'text-slate-500 dark:text-slate-400',
            )}
          >
            <Marked
              segments={pinyin}
              markClassName={onBrand ? 'text-amber-200' : 'text-brand-600 dark:text-brand-300'}
            />
          </p>
        )}
        <p
          className={cn(
            'mt-0.5 text-sm leading-snug',
            onBrand ? 'text-brand-50' : 'text-slate-600 dark:text-slate-300',
          )}
        >
          {sentence.meaning}
        </p>
      </div>
    </div>
  )
}

/**
 * Các câu mẫu của một từ, mỗi câu một nút nghe cả câu.
 *
 * Nghe riêng một từ thì mới biết từ đó đọc thế nào; nghe cả câu mới biết nó
 * ghép với những từ khác ra sao — thanh điệu, nhịp và chỗ ngắt đều đổi khi vào câu.
 */
export function ExampleSentences({ word, className }: { word: Word; className?: string }) {
  const t = useT()
  return (
    <ul aria-label={t(`Câu mẫu với ${word.hanzi}`, `${word.hanzi} 的例句`)} className={cn('space-y-2', className)}>
      {word.examples.map((sentence) => (
        <li key={sentence.hanzi}>
          <SentenceLine
            sentence={sentence}
            target={word.hanzi}
            className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60"
          />
        </li>
      ))}
    </ul>
  )
}
