import { describe, expect, it } from 'vitest'
import { VI_WORDS } from '../data/vi1'
import { wordsOfLesson } from '../data/courses'
import {
  buildExercises,
  buildVietnameseSentenceExercise,
  createRng,
  gradeDictation,
  gradeSentence,
  isChoiceExercise,
} from './exercises'
import { toneVariants, vietnameseSyllables, vietnameseToneOf } from './vietnamese'
import type { DictationExercise, SentenceExercise } from '../types'

describe('vietnameseSyllables', () => {
  it('tách theo khoảng trắng và bỏ dấu câu', () => {
    expect(vietnameseSyllables('Xin chào, tôi là Lan.')).toEqual(['Xin', 'chào', 'tôi', 'là', 'Lan'])
    expect(vietnameseSyllables('Bạn khỏe không?')).toEqual(['Bạn', 'khỏe', 'không'])
  })
})

describe('vietnameseToneOf', () => {
  it('đọc ra đủ sáu thanh, kể cả khi chữ có dấu mũ hay dấu móc', () => {
    expect(['ma', 'mà', 'má', 'mả', 'mã', 'mạ'].map(vietnameseToneOf)).toEqual([0, 1, 2, 3, 4, 5])
    expect(vietnameseToneOf('mấy')).toBe(2)
    expect(vietnameseToneOf('người')).toBe(1)
    expect(vietnameseToneOf('Việt')).toBe(5)
  })
})

describe('toneVariants', () => {
  it('sáu cách viết chỉ lệch nhau đúng cái thanh, theo thứ tự ngang → nặng', () => {
    expect(toneVariants('chào')).toEqual({ variants: ['chao', 'chào', 'cháo', 'chảo', 'chão', 'chạo'], correct: 1 })
  })

  it('giữ nguyên dấu mũ, chỉ đổi dấu thanh', () => {
    expect(toneVariants('mấy')?.variants).toEqual(['mây', 'mầy', 'mấy', 'mẩy', 'mẫy', 'mậy'])
  })

  it('từ nhiều âm tiết thì đổi âm tiết có dấu đầu tiên, giữ chữ hoa', () => {
    expect(toneVariants('xin chào')?.variants[0]).toBe('xin chao')
    expect(toneVariants('Việt Nam')).toEqual({
      variants: ['Viêt Nam', 'Viềt Nam', 'Viết Nam', 'Viểt Nam', 'Viễt Nam', 'Việt Nam'],
      correct: 5,
    })
  })

  it('cả từ thanh ngang thì không dựng được', () => {
    expect(toneVariants('hai')).toBeNull()
    expect(toneVariants('xin')).toBeNull()
  })
})

describe('Bài tập khoá tiếng Việt', () => {
  const words = wordsOfLesson('vu1l1')
  const exercises = buildExercises(words, VI_WORDS, createRng(7), 'vi')

  it('không có bài pinyin hay bài chọn bốn thanh của tiếng Trung', () => {
    const kinds = new Set(exercises.map((exercise) => exercise.kind))
    expect(kinds.has('pinyin')).toBe(false)
    expect(kinds.has('tone')).toBe(false)
    expect(kinds).toEqual(new Set(['multiple-choice', 'listening', 'sentence', 'dictation', 'tone-pair', 'matching']))
  })

  it('mỗi từ một câu, rồi hai bài phân biệt thanh trên hai từ khác nhau, rồi bài ghép nối', () => {
    expect(exercises).toHaveLength(words.length + 3)
    const drills = exercises.filter((exercise) => exercise.kind === 'tone-pair')
    expect(drills).toHaveLength(2)
    expect(new Set(drills.map((drill) => (isChoiceExercise(drill) ? drill.wordId : '')))).toHaveProperty('size', 2)
  })

  it('đề bài viết bằng tiếng Trung', () => {
    for (const exercise of exercises) expect(exercise.prompt).toMatch(/[㐀-鿿]/)
  })

  it('bài phân biệt thanh có sáu phương án, đáp án đúng là chữ thật', () => {
    for (const drill of exercises.filter(isChoiceExercise).filter((exercise) => exercise.kind === 'tone-pair')) {
      expect(drill.choices).toHaveLength(6)
      const word = words.find((item) => item.id === drill.wordId)!
      expect(drill.choices.find((choice) => choice.id === drill.correctChoiceId)?.label).toBe(word.hanzi)
    }
  })

  it('trắc nghiệm hỏi nghĩa tiếng Trung, bài nghe chọn chữ tiếng Việt', () => {
    for (const exercise of exercises.filter(isChoiceExercise)) {
      const word = words.find((item) => item.id === exercise.wordId)!
      const correct = exercise.choices.find((choice) => choice.id === exercise.correctChoiceId)!.label
      if (exercise.kind === 'multiple-choice') expect(correct).toBe(word.meaning)
      if (exercise.kind === 'listening') expect(correct).toBe(word.hanzi)
    }
  })
})

describe('Ghép câu tiếng Việt', () => {
  const word = VI_WORDS.find((item) => item.id === 'vi-xinchao')!
  const exercise = buildVietnameseSentenceExercise(word, VI_WORDS, createRng(3)) as SentenceExercise

  it('mỗi âm tiết một mảnh, đề bài là nghĩa tiếng Trung', () => {
    expect(exercise.pieces).toEqual(['Xin', 'chào', 'tôi', 'là', 'Lan'])
    expect(exercise.meaning).toBe('你好，我是阿兰。')
  })

  it('mảnh nhiễu không trùng âm tiết nào của câu đúng, kể cả khác hoa thường', () => {
    const answer = new Set(exercise.pieces.map((piece) => piece.toLowerCase()))
    const extras = exercise.tiles.slice().filter((tile) => !exercise.pieces.includes(tile.label))
    expect(extras).toHaveLength(2)
    for (const tile of extras) expect(answer.has(tile.label.toLowerCase())).toBe(false)
  })

  it('bấm đúng thứ tự thì đúng, sai thứ tự thì sai', () => {
    const idOf = (label: string) => exercise.tiles.find((tile) => tile.label === label)!.id
    expect(gradeSentence(exercise, exercise.pieces.map(idOf))).toBe(true)
    expect(gradeSentence(exercise, [...exercise.pieces].reverse().map(idOf))).toBe(false)
  })
})

describe('Nghe–viết tiếng Việt', () => {
  const exercise = buildExercises(wordsOfLesson('vu3l2'), VI_WORDS, createRng(1), 'vi').find(
    (item): item is DictationExercise => item.kind === 'dictation',
  )!

  it('gõ không dấu, có dấu hay viết hoa đều được tính đúng', () => {
    expect(exercise.answer).toBe('ít')
    expect(gradeDictation(exercise, 'it')).toBe(true)
    expect(gradeDictation(exercise, 'Ít')).toBe(true)
    expect(gradeDictation(exercise, 'rat')).toBe(false)
  })

  it('đ gõ thành d vẫn đúng', () => {
    const deu = { ...exercise, answer: 'đều' }
    expect(gradeDictation(deu, 'deu')).toBe(true)
    expect(gradeDictation(deu, 'đều')).toBe(true)
  })
})
