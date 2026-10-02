import { useT } from '../../context/ProgressContext'
import { WORD_BY_ID } from '../../data/courses'
import { cn } from '../../lib/cn'
import type { SentenceExercise } from '../../types'
import { SentenceLine } from '../ExampleSentences'
import { MascotSays } from '../Mascot'

interface SentenceBuilderProps {
  exercise: SentenceExercise
  /** Id các mảnh đã bấm, theo thứ tự bấm. */
  picked: string[]
  checked: boolean
  isCorrect: boolean
  onPick: (tileId: string) => void
  onUnpick: (tileId: string) => void
}

/**
 * Mảnh chữ kiểu phím bấm: viền dưới dày hơn để trông như nổi lên khỏi mặt
 * giấy, bấm xuống thì lún. Người học chạm vào nó cả chục lần mỗi bài, nên
 * cảm giác "bấm được" quan trọng hơn mọi chi tiết khác trên màn hình này.
 */
const TILE =
  'font-hanzi min-h-12 min-w-12 rounded-xl border-2 border-b-4 px-3 py-1.5 text-2xl font-medium transition active:translate-y-0.5 active:border-b-2'

const TILE_IDLE =
  'border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'

/**
 * Bài ghép câu.
 *
 * Zibi nói câu bằng tiếng Việt, người học bấm các mảnh chữ Hán theo đúng thứ
 * tự để dựng lại câu đó. Bấm một mảnh ở dòng trả lời là trả nó về kho.
 *
 * Mảnh đã dùng để lại một ô trống đúng kích thước trong kho, chứ không biến
 * mất: nếu các mảnh còn lại dồn lên lấp chỗ, ngón tay đang nhắm mảnh kế tiếp
 * sẽ bấm trúng mảnh khác.
 *
 * Chấm xong — đúng hay sai — kho mảnh nhường chỗ cho **cả câu**: chữ Hán,
 * pinyin, và nút nghe cả câu. Ghép đúng thứ tự mới là một nửa; nghe câu đó
 * trôi thành một hơi mới là thứ người học mang đi được.
 */
export function SentenceBuilder({
  exercise,
  picked,
  checked,
  isCorrect,
  onPick,
  onUnpick,
}: SentenceBuilderProps) {
  const labelOf = new Map(exercise.tiles.map((tile) => [tile.id, tile.label]))
  const used = new Set(picked)
  const t = useT()

  return (
    <div className="mt-5">
      <MascotSays mood="nghi">{exercise.meaning}</MascotSays>

      {/* Dòng trả lời: hai dòng kẻ để người học thấy câu dài tới đâu thì hết chỗ. */}
      <div
        role="group"
        aria-label={t('Câu của bạn', '你的句子')}
        className={cn(
          'sentence-lines mt-6 flex min-h-28 flex-wrap content-start gap-2 border-b-2 pb-3',
          !checked && 'border-slate-300 dark:border-slate-600',
          checked && isCorrect && 'border-emerald-500',
          checked && !isCorrect && 'border-amber-500',
        )}
      >
        {picked.map((tileId) => (
          <button
            key={tileId}
            type="button"
            disabled={checked}
            onClick={() => onUnpick(tileId)}
            className={cn(
              TILE,
              !checked && TILE_IDLE,
              checked && isCorrect && 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100',
              checked && !isCorrect && 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100',
            )}
          >
            {labelOf.get(tileId)}
          </button>
        ))}
      </div>

      {checked ? (
        <section aria-label={t('Cả câu', '整句')} className="sentence-reveal mt-8">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {t('Nghe lại cả câu', '再听一遍整句')}
          </p>
          <SentenceLine
            sentence={exercise.sentence}
            target={WORD_BY_ID[exercise.wordId]?.hanzi}
            className="surface mt-2 rounded-2xl px-3 py-3"
          />
        </section>
      ) : (
        <div role="group" aria-label={t('Các mảnh chữ', '词块')} className="mt-8 flex flex-wrap justify-center gap-2">
          {exercise.tiles.map((tile) =>
            used.has(tile.id) ? (
              // Ô trống giữ chỗ, cùng cỡ với mảnh thật.
              <span
                key={tile.id}
                aria-hidden="true"
                className={cn(
                  TILE,
                  'border-slate-200 bg-slate-100 text-transparent dark:border-slate-700 dark:bg-slate-800/50',
                )}
              >
                {tile.label}
              </span>
            ) : (
              <button
                key={tile.id}
                type="button"
                onClick={() => onPick(tile.id)}
                className={cn(TILE, TILE_IDLE)}
              >
                {tile.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
