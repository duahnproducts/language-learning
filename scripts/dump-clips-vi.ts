/**
 * In danh sách clip audio của khoá tiếng Việt ra JSON, để `generate-audio-vi.py`
 * đọc được — cùng lý do với `dump-clips.ts`: nội dung chỉ có một nguồn là
 * `src/data/vi1.ts`, tên file câu chỉ có một cách tính là `sentenceAudioKey`.
 *
 * Mỗi clip: `path` trong `src/assets/audio/`, và `text` là chữ tiếng Việt để đọc.
 */

import { VI_WORDS } from '../src/data/vi1.ts'
import { sentenceAudioKey } from '../src/lib/sentences.ts'

const words = VI_WORDS.map((word) => ({ path: `vi/${word.id}.mp3`, text: word.hanzi }))

// Một câu có thể là câu mẫu của hai từ: tên file băm từ nội dung, chỉ sinh một lần.
const sentences = new Map<string, { path: string; text: string }>()
for (const sentence of VI_WORDS.flatMap((word) => word.examples)) {
  const path = `vi/sentences/${sentenceAudioKey(sentence)}.mp3`
  if (!sentences.has(path)) sentences.set(path, { path, text: sentence.hanzi })
}

process.stdout.write(JSON.stringify([...words, ...sentences.values()]))
