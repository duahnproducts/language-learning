/**
 * Bản đồ 60 từ HSK 1.
 *
 * Mỗi từ đã nhớ là một ngôi sao sáng lên trên bầu trời, hoặc một bông hoa nở
 * trong vườn — tuỳ chế độ hiển thị. Mỗi unit là một chòm sao (hay một luống
 * hoa) gồm 12 từ, nên học xong một unit là thấy cả một chòm sáng hẳn.
 *
 * Toàn bộ logic ở đây là hàm thuần để test trực tiếp, không cần dựng React.
 * Phần vẽ nằm ở `src/components/WordMap.tsx` và `src/styles/wordMap.css`.
 * Xem `docs/scene.md`.
 */

import { COURSES, WORD_BY_ID } from '../data/courses'
import { isWordLearned } from './gamification'
import type { UserProgress } from '../types'

/** Một từ trên bản đồ: một ngôi sao ban đêm, một bông hoa ban ngày. */
export interface WordMark {
  wordId: string
  hanzi: string
  meaning: string
  /** Toạ độ trong hệ của `WORD_MAP_VIEWBOX`. */
  x: number
  y: number
  /** Người học đã từng bấm "Đã nhớ" với từ này chưa. */
  lit: boolean
}

/** Một unit: một chòm sao, hoặc một luống hoa. */
export interface WordCluster {
  unitId: string
  /** Tên ngắn, đã bỏ tiền tố "Unit N · ". */
  title: string
  marks: WordMark[]
  /** Đường nối các sao trong chòm, dạng `points` của `<polyline>`. */
  path: string
  litCount: number
  complete: boolean
}

/** Khung toạ độ của bản đồ. Mọi toạ độ dưới đây nằm trong khung này. */
export const WORD_MAP_VIEWBOX = { width: 340, height: 400 } as const

/**
 * Vị trí từng ngôi sao, đặt tay chứ không sinh tự động.
 *
 * Sinh ngẫu nhiên thì chòm nào cũng giống chòm nào và không ra hình gì; rải
 * đều theo lưới thì ra một bảng chấm. Năm cụm này được đặt sao cho mỗi cụm có
 * dáng riêng và nối lại thành một nét liền mạch, giống bản đồ sao thật.
 *
 * Thứ tự trong mảng cũng là thứ tự nối đường — xem `path`.
 */
const LAYOUT: Record<string, ReadonlyArray<readonly [number, number]>> = {
  u1: [
    [20, 132], [30, 110], [48, 78], [78, 62], [104, 40], [132, 58],
    [150, 92], [128, 112], [112, 86], [96, 124], [66, 142], [42, 146],
  ],
  u2: [
    [196, 150], [210, 120], [228, 96], [252, 78], [280, 64], [308, 80],
    [322, 110], [306, 134], [284, 152], [262, 140], [240, 158], [218, 166],
  ],
  u3: [
    [34, 286], [40, 258], [58, 236], [84, 222], [110, 230], [134, 248],
    [154, 270], [138, 292], [116, 300], [92, 286], [70, 300], [48, 306],
  ],
  u4: [
    [200, 300], [212, 272], [230, 250], [254, 238], [278, 246], [300, 262],
    [318, 286], [300, 306], [276, 314], [252, 302], [228, 314], [210, 320],
  ],
  u5: [
    [92, 368], [108, 344], [130, 332], [156, 338], [180, 330], [206, 338],
    [230, 332], [252, 344], [268, 366], [240, 378], [196, 384], [148, 380],
  ],
}

/**
 * Tên unit rút gọn: `"Unit 3 · Gia đình"` thành `"Gia đình"`.
 * Chú thích dưới bản đồ chỉ đủ chỗ cho tên, số thứ tự đã nằm ở chỗ khác rồi.
 */
export function shortUnitTitle(title: string): string {
  const parts = title.split('·')
  return (parts.length > 1 ? parts[parts.length - 1] : title).trim()
}

/**
 * Dựng bản đồ từ tiến độ hiện tại.
 *
 * Từ nào không có toạ độ, hoặc unit nào chưa có sơ đồ, thì bị bỏ qua thay vì
 * làm vỡ màn hình — `wordMap.test.ts` chốt rằng cả 60 từ đều có chỗ, nên nếu
 * sau này thêm từ mà quên đặt toạ độ thì test sẽ kêu chứ không im lặng giấu đi.
 */
export function buildWordMap(progress: UserProgress): WordCluster[] {
  // Hai khoá cùng năm unit mười hai từ, nên dùng chung sơ đồ theo thứ tự unit.
  return COURSES[progress.track].course.units.map((unit, unitIndex) => {
    const coords = LAYOUT[`u${unitIndex + 1}`] ?? []
    const wordIds = unit.lessons.flatMap((lesson) => lesson.wordIds)

    const marks = wordIds.flatMap<WordMark>((wordId, index) => {
      const coord = coords[index]
      const word = WORD_BY_ID[wordId]
      if (!coord || !word) return []
      return [
        {
          wordId,
          hanzi: word.hanzi,
          meaning: word.meaning,
          x: coord[0],
          y: coord[1],
          lit: isWordLearned(progress, wordId),
        },
      ]
    })

    const litCount = marks.filter((mark) => mark.lit).length

    return {
      unitId: unit.id,
      title: shortUnitTitle(unit.title),
      marks,
      path: marks.map((mark) => `${mark.x},${mark.y}`).join(' '),
      litCount,
      complete: marks.length > 0 && litCount === marks.length,
    }
  })
}

/** Tổng số từ đã sáng trên cả bản đồ. */
export function wordMapTotals(clusters: readonly WordCluster[]): { lit: number; total: number } {
  return clusters.reduce(
    (totals, cluster) => ({
      lit: totals.lit + cluster.litCount,
      total: totals.total + cluster.marks.length,
    }),
    { lit: 0, total: 0 },
  )
}

/** Hình bao của một cụm, dùng để vẽ luống hoa phía sau ở chế độ sáng. */
export interface ClusterBounds {
  cx: number
  cy: number
  rx: number
  ry: number
}

/**
 * Khoảng nới ra quanh cụm, để luống hoa ôm trọn chứ không cắt ngang bông ngoài
 * cùng. Nới rộng hơn nữa thì các luống chồng lên nhau và chỗ giao nhau đậm màu
 * lên, nhìn ra một vũng chứ không ra hai luống.
 */
const BED_PADDING_X = 14
const BED_PADDING_Y = 12

/** Hình bao của một cụm. Cụm rỗng thì không có luống nào để vẽ. */
export function clusterBounds(marks: readonly WordMark[]): ClusterBounds | null {
  if (marks.length === 0) return null

  const xs = marks.map((mark) => mark.x)
  const ys = marks.map((mark) => mark.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: (maxX - minX) / 2 + BED_PADDING_X,
    ry: (maxY - minY) / 2 + BED_PADDING_Y,
  }
}


/**
 * Nhãn chữ Hán nằm sát rìa khung thì neo vào trong thay vì căn giữa, nếu
 * không nửa chữ sẽ bị cắt mất ở mép bản đồ.
 */
export function labelAnchor(x: number): 'start' | 'middle' | 'end' {
  if (x < 34) return 'start'
  if (x > WORD_MAP_VIEWBOX.width - 34) return 'end'
  return 'middle'
}
