/**
 * Câu mẫu: ghép từng chữ Hán với âm tiết pinyin của nó, tô đậm từ đang học,
 * và đặt tên cho file audio đọc cả câu.
 *
 * Pinyin của câu mẫu viết theo từng âm tiết (`Nǐ jiào shén me míng zi?`), nên
 * chữ Hán thứ n luôn đi với âm tiết thứ n. Nhờ vậy tô được đúng từ đang học ở
 * cả hai dòng — người học thấy 叫 nằm ở đâu trong câu và đọc là `jiào`.
 *
 * File này cố ý không import gì lúc chạy: `scripts/dump-clips.ts` chạy thẳng
 * bằng Node để lấy tên file audio, mà Node không tự tìm file `.ts` khi đường
 * dẫn thiếu đuôi.
 */

import type { ExampleSentence } from '../types'

/** Chữ Hán (khối CJK cơ bản và mở rộng A). */
const HAN = /[㐀-鿿]/

/** Tách một âm tiết pinyin khỏi dấu câu dính sau nó: `zi?` → `zi` + `?`. */
const SYLLABLE_WITH_MARKS = /^(.*?)([,.?!]*)$/

/** Một đoạn của câu khi hiển thị. `target` là đoạn thuộc từ đang học. */
export interface Segment {
  text: string
  target: boolean
}

/** Chữ Hán của câu, bỏ dấu câu. */
export function hanziChars(hanzi: string): string[] {
  return [...hanzi].filter((char) => HAN.test(char))
}

/** Các âm tiết pinyin của câu, mỗi âm tiết kèm dấu câu dính sau (nếu có). */
export function pinyinSyllables(pinyin: string): string[] {
  return pinyin.trim().split(/\s+/).filter(Boolean)
}

/**
 * Số chữ Hán có khớp số âm tiết không.
 *
 * Lệch nhau nghĩa là pinyin viết thiếu hoặc thừa một âm tiết — lúc đó không tô
 * được từ, và audio đọc lệch khỏi chữ trên màn hình. `hsk1.test.ts` chặn trước.
 */
export function isAligned(sentence: ExampleSentence): boolean {
  return hanziChars(sentence.hanzi).length === pinyinSyllables(sentence.pinyin).length
}

/** Gộp các mảnh liền nhau cùng loại, để React không phải dựng hàng chục thẻ rỗng. */
function merge(pieces: Segment[]): Segment[] {
  const out: Segment[] = []
  for (const piece of pieces) {
    if (piece.text === '') continue
    const last = out[out.length - 1]
    if (last && last.target === piece.target) last.text += piece.text
    else out.push({ ...piece })
  }
  return out
}

/**
 * Chia câu thành các đoạn để tô từ đang học, ở cả dòng chữ Hán lẫn dòng pinyin.
 *
 * Tô lần xuất hiện **đầu tiên** của từ. Câu không chứa từ, hoặc pinyin lệch số
 * âm tiết, thì trả nguyên câu không tô gì — hiển thị vẫn đúng, chỉ kém đi một
 * chút, thay vì tô nhầm chỗ.
 */
export function highlightTarget(
  sentence: ExampleSentence,
  target: string,
): { hanzi: Segment[]; pinyin: Segment[] } {
  const plain = {
    hanzi: [{ text: sentence.hanzi, target: false }],
    pinyin: [{ text: sentence.pinyin, target: false }],
  }

  // Không phân biệt hoa thường: câu tiếng Việt viết hoa chữ đầu, `Xin chào` vẫn
  // phải tô được cho từ `xin chào`. Chữ Hán thì không có hoa thường gì để đổi.
  const at = target === '' ? -1 : sentence.hanzi.toLowerCase().indexOf(target.toLowerCase())
  if (at === -1 || !isAligned(sentence)) return plain

  const hanzi = merge([
    { text: sentence.hanzi.slice(0, at), target: false },
    { text: sentence.hanzi.slice(at, at + target.length), target: true },
    { text: sentence.hanzi.slice(at + target.length), target: false },
  ])

  // Âm tiết thứ n đi với chữ Hán thứ n, nên chỉ cần đếm số chữ Hán đứng trước.
  const first = hanziChars(sentence.hanzi.slice(0, at)).length
  const last = first + hanziChars(target).length - 1

  const pieces: Segment[] = []
  pinyinSyllables(sentence.pinyin).forEach((chunk, index) => {
    const [, syllable, marks] = SYLLABLE_WITH_MARKS.exec(chunk)!
    if (index > 0) pieces.push({ text: ' ', target: index > first && index <= last })
    pieces.push({ text: syllable, target: index >= first && index <= last })
    pieces.push({ text: marks, target: false })
  })

  return { hanzi, pinyin: merge(pieces) }
}

/**
 * Tên file audio của một câu: 8 ký tự hex, băm từ chữ Hán **và** pinyin.
 *
 * Băm cả pinyin là có chủ ý. Sửa pinyin — chẳng hạn chữa một chữ đa âm đọc sai —
 * thì tên file đổi theo, test báo thiếu audio, và file cũ đọc sai không thể lọt
 * lên bản deploy dưới cái tên cũ.
 *
 * FNV-1a 32 bit, cùng cách với `seedFromText` ở `exercises.ts`. Chép lại chứ
 * không import, vì lý do ở đầu file. 180 câu thì khả năng trùng tên cỡ một phần
 * triệu, và `sentences.test.ts` vẫn kiểm để chắc.
 */
export function sentenceAudioKey(sentence: ExampleSentence): string {
  const text = `${sentence.hanzi}\n${sentence.pinyin}`
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
