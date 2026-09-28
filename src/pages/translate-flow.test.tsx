import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORD_BY_ID } from '../data/hsk1'
import type { DictationFailure } from '../lib/dictation'
import { clearTranslationCache } from '../lib/translate'
import { ONBOARDED, renderApp } from '../test/renderApp'

/** Ghi lại mọi lần phát âm thay vì phát thật — jsdom không có loa. */
const speech = vi.hoisted(() => ({
  chinese: [] as Array<{ text: string; wordId?: string; clipUrl?: string | null }>,
  device: [] as Array<{ text: string; lang: string }>,
}))

vi.mock('../lib/speech', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/speech')>()
  return {
    ...actual,
    playWord: vi.fn(async (input: { text: string; wordId?: string; clipUrl?: string | null }) => {
      speech.chinese.push(input)
      return 'played' as const
    }),
    speakWithDeviceVoice: vi.fn(async (text: string, lang: string) => {
      speech.device.push({ text, lang })
      return 'played' as const
    }),
  }
})

/** jsdom không có micro: thay nhận dạng giọng nói bằng bản giả do test điều khiển. */
interface DictationCall {
  lang: string
  onText: (text: string) => void
  onEnd: (result: { text: string; failure: DictationFailure | null }) => void
}
const dictation = vi.hoisted(() => ({ calls: [] as DictationCall[], stop: vi.fn(), cancel: vi.fn() }))

vi.mock('../lib/dictation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/dictation')>()
  return {
    ...actual,
    startDictation: vi.fn((options: DictationCall) => {
      dictation.calls.push(options)
      return { stop: dictation.stop, cancel: dictation.cancel }
    }),
  }
})

const fetchMock = vi.fn()

/**
 * Google trả một bản dịch. Dịch sang tiếng Trung thì pinyin ở ô thứ ba, dịch từ
 * tiếng Trung thì ở ô thứ tư, không có tiếng Trung thì không có phiên âm.
 */
function googleSays(text: string, romanization: string | null = null, side: 'target' | 'source' = 'target') {
  const segments: unknown[] = [[text, 'câu gốc']]
  if (romanization) segments.push(side === 'target' ? [null, null, romanization] : [null, null, null, romanization])
  fetchMock.mockImplementation(async () => new Response(JSON.stringify([segments]), { status: 200 }))
}

beforeEach(() => {
  speech.chinese = []
  speech.device = []
  dictation.calls = []
  dictation.stop.mockReset()
  dictation.cancel.mockReset()
  fetchMock.mockReset()
  clearTranslationCache()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

const input = (language = 'Tiếng Việt') => screen.getByLabelText(language)
const card = () => screen.findByRole('region', { name: 'Bản dịch' })
const swapButton = () => screen.getByRole('button', { name: 'Đổi chiều dịch' })

describe('Màn Dịch — Việt → Trung', () => {
  it('thanh điều hướng có mục Dịch, bấm vào là tới màn Dịch', async () => {
    const { user } = renderApp('/', ONBOARDED)
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })

    await user.click(within(nav).getByRole('link', { name: 'Dịch' }))

    expect(screen.getByRole('heading', { name: 'Dịch' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Dịch' })).toHaveAttribute('aria-current', 'page')
  })

  it('ô trống thì chưa cho bấm dịch', () => {
    renderApp('/translate', ONBOARDED)
    expect(screen.getByRole('button', { name: 'Dịch sang tiếng Trung' })).toBeDisabled()
  })

  it('từ có trong bài học thì ra ngay, không gọi mạng, và tự đọc bằng file thu sẵn', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.type(input(), 'Xin chào')
    await user.click(screen.getByRole('button', { name: 'Dịch sang tiếng Trung' }))

    const result = await card()
    expect(result).toHaveTextContent('你好')
    expect(result).toHaveTextContent('nǐ hǎo')
    expect(result).toHaveTextContent('Có trong bài học')
    expect(fetchMock).not.toHaveBeenCalled()

    expect(speech.chinese).toHaveLength(1)
    expect(WORD_BY_ID[speech.chinese[0].wordId!].hanzi).toBe('你好')
  })

  it('câu ngoài bài học thì hỏi Google Dịch: ra chữ Hán, pinyin, tự đọc, và có nút nghe lại', async () => {
    googleSays('我想去银行', 'Wǒ xiǎng qù yínháng')
    const { user } = renderApp('/translate', ONBOARDED)
    // Enter là dịch, không cần với tới nút.
    await user.type(input(), 'tôi muốn đi ngân hàng{Enter}')

    const result = await card()
    expect(result).toHaveTextContent('我想去银行')
    expect(result).toHaveTextContent('Wǒ xiǎng qù yínháng')
    expect(result).toHaveTextContent('Dịch bởi Google Dịch')
    expect(speech.chinese.map((entry) => entry.text)).toEqual(['我想去银行'])

    await user.click(within(result).getByRole('button', { name: 'Nghe phát âm 我想去银行' }))
    expect(speech.chinese).toHaveLength(2)
  })

  it('bấm một gợi ý là dịch luôn', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.click(screen.getByRole('button', { name: 'cảm ơn' }))

    expect(await card()).toHaveTextContent('谢谢')
    expect(input()).toHaveValue('cảm ơn')
  })

  it('một nghĩa ứng với nhiều từ trong bài học thì hiện cả, từ nào cũng nghe được', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.type(input(), 'năm{Enter}')

    const result = await card()
    expect(result).toHaveTextContent('五')
    expect(result).toHaveTextContent('Cũng mang nghĩa này trong bài học')
    expect(within(result).getByRole('button', { name: 'Nghe phát âm 年' })).toBeInTheDocument()
  })

  it('Google từ chối thì Zibi nói rõ vì sao, không để màn hình trống trơn', async () => {
    fetchMock.mockImplementation(async () => new Response('Sorry', { status: 429 }))
    const { user } = renderApp('/translate', ONBOARDED)
    await user.type(input(), 'con mèo{Enter}')

    expect(await screen.findByRole('status')).toHaveTextContent('Google Dịch đang tạm từ chối')
    expect(screen.queryByRole('region', { name: 'Bản dịch' })).not.toBeInTheDocument()
    expect(speech.chinese).toHaveLength(0)
  })

  it('nói rõ chữ và giọng nói được gửi đi đâu', () => {
    renderApp('/translate', ONBOARDED)
    const note = screen.getByText(/được tra ngay trên máy/)
    expect(note).toHaveTextContent('Google Dịch')
    expect(note).toHaveTextContent('micro')
  })
})

describe('Màn Dịch — đổi chiều, Trung → Việt', () => {
  it('đổi chiều thì nhãn, gợi ý và nút dịch đổi theo', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.click(swapButton())

    expect(input('Tiếng Trung')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dịch sang tiếng Việt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '你好' })).toBeInTheDocument()
  })

  it('gõ chữ Hán thì ra nghĩa tiếng Việt, kèm chữ Hán và pinyin, rồi đọc bản dịch tiếng Việt', async () => {
    googleSays('Tôi muốn đến ngân hàng', 'Wǒ xiǎng qù yínháng', 'source')
    const { user } = renderApp('/translate', ONBOARDED)
    await user.click(swapButton())
    await user.type(input('Tiếng Trung'), '我想去银行{Enter}')

    const result = await card()
    expect(result).toHaveTextContent('Tôi muốn đến ngân hàng')
    expect(result).toHaveTextContent('我想去银行')
    expect(result).toHaveTextContent('Wǒ xiǎng qù yínháng')
    expect(speech.device).toEqual([{ text: 'Tôi muốn đến ngân hàng', lang: 'vi' }])
    // Phía tiếng Trung vẫn nghe được, nhưng không tự đọc — người ta vừa nói xong câu đó.
    expect(speech.chinese).toHaveLength(0)
    expect(within(result).getByRole('button', { name: 'Nghe phát âm 我想去银行' })).toBeInTheDocument()
    expect(within(result).getByRole('button', { name: 'Nghe câu tiếng Việt' })).toBeInTheDocument()
  })

  it('vừa dịch xong mà đổi chiều thì lật luôn cặp câu, khỏi gọi mạng', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.type(input(), 'xin chào{Enter}')
    await card()

    await user.click(swapButton())

    expect(input('Tiếng Trung')).toHaveValue('你好')
    expect(await card()).toHaveTextContent('xin chào')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gõ chữ Hán ở chiều Việt → Trung thì Zibi nhắc, bấm một nút là dịch từ tiếng Trung luôn', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.type(input(), '谢谢{Enter}')

    expect(await screen.findByRole('status')).toHaveTextContent('Đây là chữ Hán')
    await user.click(screen.getByRole('button', { name: 'Dịch từ tiếng Trung' }))

    expect(await card()).toHaveTextContent('cảm ơn')
    expect(input('Tiếng Trung')).toHaveValue('谢谢')
  })

  it('chiều Trung → Việt mà gõ pinyin thì nhắc gõ chữ Hán', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.click(swapButton())
    await user.type(input('Tiếng Trung'), 'ni hao{Enter}')

    expect(await screen.findByRole('status')).toHaveTextContent('cần chữ Hán')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('Màn Dịch — nói thay cho gõ', () => {
  it('bấm micro là nghe tiếng Việt, chữ hiện dần trong ô, nói xong là dịch luôn', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.click(screen.getByRole('button', { name: 'Nói tiếng Việt' }))

    expect(dictation.calls).toHaveLength(1)
    expect(dictation.calls[0].lang).toBe('vi-VN')
    expect(screen.getByRole('button', { name: 'Dừng nghe' })).toHaveAttribute('aria-pressed', 'true')

    act(() => dictation.calls[0].onText('xin'))
    expect(input()).toHaveValue('xin')

    act(() => dictation.calls[0].onEnd({ text: 'xin chào', failure: null }))
    expect(await card()).toHaveTextContent('你好')
    expect(screen.getByRole('button', { name: 'Nói tiếng Việt' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('chiều Trung → Việt thì micro nghe tiếng Trung', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.click(swapButton())
    await user.click(screen.getByRole('button', { name: 'Nói tiếng Trung' }))

    expect(dictation.calls[0].lang).toBe('zh-CN')
    act(() => dictation.calls[0].onEnd({ text: '谢谢', failure: null }))
    expect(await card()).toHaveTextContent('cảm ơn')
  })

  it('bấm micro lần nữa khi đang nghe là dừng nghe', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.click(screen.getByRole('button', { name: 'Nói tiếng Việt' }))
    await user.click(screen.getByRole('button', { name: 'Dừng nghe' }))

    expect(dictation.stop).toHaveBeenCalledOnce()
  })

  it('không nghe được thì Zibi nói rõ vì sao', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.click(screen.getByRole('button', { name: 'Nói tiếng Việt' }))
    act(() => dictation.calls[0].onEnd({ text: '', failure: 'denied' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Micro đang bị chặn')
    expect(screen.queryByRole('region', { name: 'Bản dịch' })).not.toBeInTheDocument()
  })
})

describe('Màn Dịch — thêm tiếng Anh', () => {
  const pick = async (user: ReturnType<typeof renderApp>['user'], side: 'Dịch từ' | 'Dịch sang', lang: string) =>
    user.selectOptions(screen.getByLabelText(side), lang)

  it('chọn được cả ba thứ tiếng ở hai bên', () => {
    renderApp('/translate', ONBOARDED)
    for (const side of ['Dịch từ', 'Dịch sang']) {
      const options = within(screen.getByLabelText(side))
        .getAllByRole('option')
        .map((option) => option.textContent)
      expect(options).toEqual(['Tiếng Việt', 'Tiếng Trung', 'Tiếng Anh'])
    }
  })

  it('Việt → Anh: ra tiếng Anh, đọc bằng giọng tiếng Anh, không có phía chữ Hán', async () => {
    googleSays('I want to drink tea')
    const { user } = renderApp('/translate', ONBOARDED)
    await pick(user, 'Dịch sang', 'en')
    expect(screen.getByRole('button', { name: 'Dịch sang tiếng Anh' })).toBeInTheDocument()

    await user.type(input(), 'tôi muốn uống trà{Enter}')

    const result = await card()
    expect(result).toHaveTextContent('I want to drink tea')
    expect(within(result).getByRole('button', { name: 'Nghe câu tiếng Anh' })).toBeInTheDocument()
    expect(within(result).queryByRole('button', { name: /Nghe phát âm/ })).not.toBeInTheDocument()
    expect(speech.device).toEqual([{ text: 'I want to drink tea', lang: 'en' }])
  })

  it('Anh → Trung: ra chữ Hán kèm pinyin, tự đọc tiếng Trung, câu có trong khoá học thì bằng file thu sẵn', async () => {
    googleSays('你好吗？', 'Nǐ hǎo ma?')
    const { user } = renderApp('/translate', ONBOARDED)
    await pick(user, 'Dịch từ', 'en')
    await user.type(input('Tiếng Anh'), 'how are you?{Enter}')

    const result = await card()
    expect(result).toHaveTextContent('你好吗？')
    expect(result).toHaveTextContent('Nǐ hǎo ma?')
    expect(speech.chinese).toHaveLength(1)
    expect(speech.chinese[0].clipUrl).toBeTruthy()
  })

  it('Trung → Anh: tiếng Anh to, bên dưới vẫn có chữ Hán và pinyin để nghe', async () => {
    googleSays('I want to go to the bank', 'Wǒ xiǎng qù yínháng', 'source')
    const { user } = renderApp('/translate', ONBOARDED)
    await pick(user, 'Dịch từ', 'zh')
    await pick(user, 'Dịch sang', 'en')
    await user.type(input('Tiếng Trung'), '我想去银行{Enter}')

    const result = await card()
    expect(result).toHaveTextContent('I want to go to the bank')
    expect(result).toHaveTextContent('Wǒ xiǎng qù yínháng')
    expect(within(result).getByRole('button', { name: 'Nghe phát âm 我想去银行' })).toBeInTheDocument()
  })

  it('chọn trùng ngôn ngữ với bên kia thì hai bên đổi chỗ', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await pick(user, 'Dịch từ', 'zh')

    expect(screen.getByLabelText('Dịch từ')).toHaveValue('zh')
    expect(screen.getByLabelText('Dịch sang')).toHaveValue('vi')
    expect(input('Tiếng Trung')).toBeInTheDocument()
  })

  it('vừa dịch xong mà đổi ngôn ngữ đích thì dịch lại luôn câu đó', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await user.type(input(), 'xin chào{Enter}')
    expect(await card()).toHaveTextContent('你好')

    googleSays('hello')
    await pick(user, 'Dịch sang', 'en')

    expect(await card()).toHaveTextContent('hello')
    expect(calledParam('tl')).toBe('en')
  })

  it('dịch từ tiếng Anh thì micro nghe tiếng Anh', async () => {
    const { user } = renderApp('/translate', ONBOARDED)
    await pick(user, 'Dịch từ', 'en')
    await user.click(screen.getByRole('button', { name: 'Nói tiếng Anh' }))

    expect(dictation.calls[0].lang).toBe('en-US')
  })
})

/** Một tham số của lần gọi Google gần nhất. */
function calledParam(name: string): string | null {
  const url = String(fetchMock.mock.calls.at(-1)?.[0] ?? '')
  return new URL(url).searchParams.get(name)
}
