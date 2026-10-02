/**
 * Danh mục file audio thu sẵn đặt trong `src/assets/audio/`.
 *
 * - Từ: `<id của từ>.mp3`, ví dụ `nihao.mp3` cho `你好`.
 * - Câu mẫu: `sentences/<khoá>.mp3`, khoá băm từ chữ Hán và pinyin của câu —
 *   xem `sentenceAudioKey()`.
 *
 * Vite quét thư mục lúc build nên chỉ cần thả file vào là dùng được, không phải
 * khai báo thêm. File do `npm run generate-audio` sinh ra.
 */

import type { ExampleSentence } from '../types'
import { sentenceAudioKey } from './sentences'

const WORD_MODULES = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const SENTENCE_MODULES = import.meta.glob('../assets/audio/sentences/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** Tên file bỏ đuôi `.mp3` → URL. */
function byName(modules: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(modules).map(([path, url]) => [
      path.slice(path.lastIndexOf('/') + 1).replace(/\.mp3$/, ''),
      url,
    ]),
  )
}

/** wordId -> URL file audio. Rỗng khi chưa thu file nào. */
export const AUDIO_FILE_URLS: Record<string, string> = byName(WORD_MODULES)

/** Khoá của câu mẫu -> URL file audio đọc cả câu. */
export const SENTENCE_AUDIO_URLS: Record<string, string> = byName(SENTENCE_MODULES)

/** URL file audio của một từ, hoặc null nếu từ đó chưa có file thu sẵn. */
export function audioUrlForWord(wordId: string | undefined): string | null {
  if (!wordId) return null
  return AUDIO_FILE_URLS[wordId] ?? null
}

/** URL file audio đọc cả một câu mẫu, hoặc null nếu câu đó chưa có file. */
export function audioUrlForSentence(sentence: ExampleSentence): string | null {
  return SENTENCE_AUDIO_URLS[sentenceAudioKey(sentence)] ?? null
}

/** Đã có ít nhất một file audio thu sẵn hay chưa. */
export function hasRecordedAudio(): boolean {
  return Object.keys(AUDIO_FILE_URLS).length > 0
}

/** Đã có file audio thu sẵn nào cho khoá tiếng Việt chưa — tên file bắt đầu bằng `vi-`, theo id từ. */
export function hasVietnameseAudio(): boolean {
  return Object.keys(AUDIO_FILE_URLS).some((name) => name.startsWith('vi-'))
}
