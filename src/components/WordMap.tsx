import { useId } from 'react'
import { useProgress, useT } from '../context/ProgressContext'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/cn'
import {
  WORD_MAP_VIEWBOX,
  buildWordMap,
  clusterBounds,
  labelAnchor,
  wordMapTotals,
} from '../lib/wordMap'
import type { WordCluster, WordMark } from '../lib/wordMap'

/**
 * Màu hoa của từng luống, ở chế độ sáng. Mỗi unit một màu để nhìn là phân biệt
 * được luống nào với luống nào mà không cần đọc chú thích.
 *
 * Cả năm màu đều phải đủ đậm để nổi trên nền cỏ nhạt và trên chấm chú thích —
 * bản đầu có một luống hoa trắng, nhìn ngoài đời thì đẹp nhưng trên nền cỏ
 * sáng thì gần như mất hút.
 */
const BLOOM_COLORS = ['#ec6f9e', '#f0a02a', '#8b6ee0', '#ef6a53', '#2fa98a']

/** Nhuỵ hoa. Một màu kem ấm nổi được trên cả năm màu cánh. */
const BLOOM_HEART = '#fff6d8'

/**
 * Bản đồ 60 từ HSK 1.
 *
 * Chế độ tối ra chòm sao, chế độ sáng ra luống hoa — cùng một bộ toạ độ, cùng
 * một dữ liệu. Người chọn giao diện sáng không vì thế mà mất tính năng.
 * Logic thuần ở `src/lib/wordMap.ts`.
 */
export function WordMap() {
  const { progress } = useProgress()
  const { theme } = useTheme()
  const t = useT()

  const clusters = buildWordMap(progress)
  const { lit, total } = wordMapTotals(clusters)
  const night = theme === 'dark'
  const headingId = useId()

  const summary = clusters
    .map((cluster) => `${cluster.title} ${cluster.litCount}/${cluster.marks.length}`)
    .join('. ')

  return (
    <section aria-labelledby={headingId} className="surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="font-semibold text-slate-900 dark:text-slate-100">
          {night ? t('Bầu trời của bạn', '你的星空') : t('Khu vườn của bạn', '你的花园')}
        </h2>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {lit}
          <span className="font-normal text-slate-500 dark:text-slate-400">
            /{total} {night ? t('sao', '颗星') : t('bông', '朵花')}
          </span>
        </p>
      </div>

      <svg
        className="wordmap mt-3"
        viewBox={`0 0 ${WORD_MAP_VIEWBOX.width} ${WORD_MAP_VIEWBOX.height}`}
        role="img"
        aria-label={t(`Bản đồ ${total} từ HSK 1, đã nhớ ${lit} từ. ${summary}`, `${total} 个越南语词的地图，已记住 ${lit} 个。${summary}`)}
      >
        {clusters.map((cluster, index) =>
          night ? (
            <NightCluster key={cluster.unitId} cluster={cluster} />
          ) : (
            <DayCluster key={cluster.unitId} cluster={cluster} index={index} />
          ),
        )}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {clusters.map((cluster, index) => (
          <li
            key={cluster.unitId}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              cluster.litCount > 0
                ? 'bg-slate-100 text-slate-700 dark:bg-slate-100/10 dark:text-slate-200'
                : 'bg-slate-50 text-slate-400 dark:bg-slate-100/5 dark:text-slate-500',
            )}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background:
                  cluster.litCount > 0
                    ? night
                      ? '#ffffff'
                      : BLOOM_COLORS[index % BLOOM_COLORS.length]
                    : 'currentColor',
              }}
            />
            {cluster.title} {cluster.litCount}/{cluster.marks.length}
            {cluster.complete && <span aria-label={t('đã xong', '已完成')}>✓</span>}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        {lit === 0
          ? night
            ? t('Trời còn tối om. Nhớ được từ đầu tiên là có ngôi sao đầu tiên.', '天还黑着。记住第一个词，就有第一颗星。')
            : t('Vườn còn trống. Nhớ được từ đầu tiên là có bông hoa đầu tiên.', '花园还空着。记住第一个词，就开第一朵花。')
          : t(
              `Mỗi từ bạn nhớ là ${night ? 'một ngôi sao' : 'một bông hoa'}. Còn ${total - lit} từ nữa là đủ cả khoá.`,
              `每记住一个词就多${night ? '一颗星' : '一朵花'}。再记住 ${total - lit} 个词就学完整门课了。`,
            )}
      </p>
    </section>
  )
}

/** Một chòm sao: đường nối mờ, sao chưa nhớ là chấm xỉn, sao đã nhớ thì sáng và có quầng. */
function NightCluster({ cluster }: { cluster: WordCluster }) {
  const label = cluster.marks.find((mark) => mark.lit)

  return (
    <g>
      <polyline
        className={cn('wordmap-line', cluster.litCount > 0 && 'wordmap-line--lit')}
        points={cluster.path}
      />
      {cluster.marks
        .filter((mark) => !mark.lit)
        .map((mark) => (
          <circle key={mark.wordId} className="wordmap-star" cx={mark.x} cy={mark.y} r="2" />
        ))}
      {/* Quầng sáng đặt trên cả nhóm chứ không từng ngôi sao: một bộ lọc cho
          mười hai ngôi rẻ hơn mười hai bộ lọc. */}
      <g className="wordmap-lit">
        {cluster.marks
          .filter((mark) => mark.lit)
          .map((mark) => (
            <circle
              key={mark.wordId}
              className="wordmap-star wordmap-star--lit"
              cx={mark.x}
              cy={mark.y}
              r="2.8"
            />
          ))}
      </g>
      {label && (
        <text
          className="wordmap-label"
          x={label.x}
          y={label.y - 9}
          textAnchor={labelAnchor(label.x)}
        >
          {label.hanzi}
        </text>
      )}
    </g>
  )
}

/** Một luống hoa: nền cỏ mềm, từ chưa nhớ là nụ, từ đã nhớ là bông nở. */
function DayCluster({ cluster, index }: { cluster: WordCluster; index: number }) {
  const bounds = clusterBounds(cluster.marks)
  const petal = BLOOM_COLORS[index % BLOOM_COLORS.length]
  const label = cluster.marks.find((mark) => mark.lit)

  return (
    <g>
      {bounds && (
        <ellipse
          className={cn('wordmap-bed', cluster.litCount > 0 && 'wordmap-bed--lit')}
          cx={bounds.cx}
          cy={bounds.cy}
          rx={bounds.rx}
          ry={bounds.ry}
        />
      )}
      {cluster.marks
        .filter((mark) => !mark.lit)
        .map((mark) => (
          <circle key={mark.wordId} className="wordmap-bud" cx={mark.x} cy={mark.y} r="2.2" />
        ))}
      {cluster.marks
        .filter((mark) => mark.lit)
        .map((mark) => (
          <Bloom key={mark.wordId} mark={mark} petal={petal} />
        ))}
      {label && (
        <text
          className="wordmap-label wordmap-label--day"
          x={label.x}
          y={label.y - 10}
          textAnchor={labelAnchor(label.x)}
        >
          {label.hanzi}
        </text>
      )}
    </g>
  )
}

/** Một bông hoa: bốn cánh và một nhuỵ, đủ để ở cỡ 8px vẫn ra hình bông hoa. */
function Bloom({ mark, petal }: { mark: WordMark; petal: string }) {
  return (
    <g transform={`translate(${mark.x} ${mark.y})`}>
      <circle cx="0" cy="-3.2" r="2.6" fill={petal} />
      <circle cx="3.2" cy="0" r="2.6" fill={petal} />
      <circle cx="0" cy="3.2" r="2.6" fill={petal} />
      <circle cx="-3.2" cy="0" r="2.6" fill={petal} />
      <circle cx="0" cy="0" r="1.7" fill={BLOOM_HEART} />
    </g>
  )
}
