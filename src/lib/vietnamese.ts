/**
 * Tiếng Việt cho khoá của người Trung: tách âm tiết để ghép câu, và dựng sáu
 * cách đọc của một từ chỉ lệch nhau đúng cái thanh — bài phân biệt thanh.
 *
 * Toàn bộ là hàm thuần để test trực tiếp.
 */

/** Sáu thanh theo thứ tự quen dùng khi dạy, kèm dấu tổ hợp (NFD) của từng thanh. */
export const VI_TONES = [
  { name: 'ngang', zh: '平声', mark: '' },
  { name: 'huyền', zh: '玄声', mark: '\u0300' },
  { name: 'sắc', zh: '锐声', mark: '\u0301' },
  { name: 'hỏi', zh: '问声', mark: '\u0309' },
  { name: 'ngã', zh: '跌声', mark: '\u0303' },
  { name: 'nặng', zh: '重声', mark: '\u0323' },
] as const

/** Năm dấu thanh. Dấu mũ, dấu trăng, dấu móc (â ă ơ) là dấu chữ, không phải dấu thanh. */
const TONE_MARK = /[\u0300\u0301\u0303\u0309\u0323]/

/** Các âm tiết của một câu, đã bỏ dấu câu: `Xin chào, tôi là Lan.` → `Xin chào tôi là Lan`. */
export function vietnameseSyllables(text: string): string[] {
  return text
    .split(/\s+/)
    .map((piece) => piece.replace(/[.,!?;:…"“”]/g, ''))
    .filter(Boolean)
}

/** Thanh của một âm tiết, 0–5 theo thứ tự `VI_TONES`. */
export function vietnameseToneOf(syllable: string): number {
  const mark = syllable.normalize('NFD').match(TONE_MARK)?.[0]
  return mark ? VI_TONES.findIndex((tone) => tone.mark === mark) : 0
}

/**
 * Sáu cách đọc của một từ, chỉ đổi thanh của âm tiết thứ `index`.
 *
 * Dấu mới đặt đúng chỗ dấu cũ: chỗ đặt dấu thanh trong một âm tiết không phụ
 * thuộc vào thanh nào, nên chỉ cần âm tiết đó vốn có dấu. Âm tiết thanh ngang
 * thì không biết đặt dấu vào đâu nếu không cài cả bộ luật — `toneVariants`
 * chỉ chọn âm tiết có dấu sẵn.
 */
function retone(syllable: string, tone: number): string {
  const nfd = syllable.normalize('NFD')
  const at = nfd.search(TONE_MARK)
  if (at === -1) return syllable
  const bare = nfd.slice(0, at) + nfd.slice(at + 1)
  // Dấu thanh phải đứng sau dấu mũ, dấu trăng: e + ^ + ´ ghép lại thành ế, còn
  // e + ´ + ^ thì NFC không đảo lại (hai dấu cùng lớp) và ra é với cái mũ lơ lửng.
  let end = at
  while (end < bare.length && /[̀-ͯ]/.test(bare[end])) end += 1
  return (bare.slice(0, end) + VI_TONES[tone].mark + bare.slice(end)).normalize('NFC')
}

/**
 * Sáu cách đọc của một từ cho bài phân biệt thanh, theo thứ tự `VI_TONES`, kèm
 * vị trí cách đọc đúng. Đổi thanh ở âm tiết **có dấu đầu tiên**.
 *
 * Trả `null` khi cả từ đều thanh ngang (`hai`, `ba`, `xin`) — không có gì để
 * dựng, nơi gọi chọn từ khác.
 */
export function toneVariants(text: string): { variants: string[]; correct: number } | null {
  const syllables = text.split(' ')
  const index = syllables.findIndex((syllable) => vietnameseToneOf(syllable) !== 0)
  if (index === -1) return null

  const variants = VI_TONES.map((_, tone) =>
    syllables.map((syllable, i) => (i === index ? retone(syllable, tone) : syllable)).join(' '),
  )
  return { variants, correct: vietnameseToneOf(syllables[index]) }
}
