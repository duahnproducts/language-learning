import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findChineseVoice,
  findDeviceVoice,
  getAudioStatus,
  playWord,
  speakWithDeviceVoice,
  subscribeAudioStatus,
} from './speech'
import { resetRemoteAudioCache } from './remoteAudio'

/**
 * Repo giờ có sẵn 60 file mp3 trong `src/assets/audio/`, nên `hasRecordedAudio()`
 * thật luôn trả về true và mọi máy đều phát âm được. Những test bên dưới xét
 * đúng trường hợp ngược lại — không còn nguồn audio nào — nên phải giả lập lại.
 */
const audio = vi.hoisted(() => ({ hasRecorded: false }))
vi.mock('./audioFiles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./audioFiles')>()
  return { ...actual, hasRecordedAudio: () => audio.hasRecorded }
})


/** Giọng đọc giả, đủ trường để `speech.ts` xét ngôn ngữ. */
function voice(lang: string, name = lang): SpeechSynthesisVoice {
  return { lang, name, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice
}

/** Bộ máy đọc giả: ghi lại câu được đọc và tự bắn sự kiện `end`. */
function fakeSynth(voices: SpeechSynthesisVoice[]) {
  const spoken: SpeechSynthesisUtterance[] = []
  const listeners: Record<string, Array<() => void>> = {}

  const synth = {
    spoken,
    getVoices: () => voices,
    cancel: vi.fn(),
    speak: (utterance: SpeechSynthesisUtterance) => {
      spoken.push(utterance)
      utterance.onend?.(new Event('end') as SpeechSynthesisEvent)
    },
    addEventListener: (type: string, fn: () => void) => {
      ;(listeners[type] ??= []).push(fn)
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners[type] = (listeners[type] ?? []).filter((item) => item !== fn)
    },
    /** Giả lập lúc trình duyệt nạp xong danh sách giọng. */
    emitVoicesChanged: (next: SpeechSynthesisVoice[]) => {
      voices.splice(0, voices.length, ...next)
      listeners.voiceschanged?.forEach((fn) => fn())
    },
  }

  return synth
}

function install(voices: SpeechSynthesisVoice[]) {
  const synth = fakeSynth(voices)
  vi.stubGlobal('speechSynthesis', synth)
  // `SpeechSynthesisUtterance` không có trong jsdom.
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      lang = ''
      rate = 1
      voice: SpeechSynthesisVoice | null = null
      onend: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      constructor(public text: string) {}
    },
  )
  return synth
}

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('findChineseVoice', () => {
  it('không có giọng nào thì trả về null', () => {
    install([])
    expect(findChineseVoice()).toBeNull()
  })

  it('bỏ qua giọng không phải tiếng Trung', () => {
    install([voice('en-US'), voice('vi-VN')])
    expect(findChineseVoice()).toBeNull()
  })

  it('chọn được giọng tiếng Trung giữa các giọng khác', () => {
    install([voice('en-US'), voice('zh-CN'), voice('vi-VN')])
    expect(findChineseVoice()?.lang).toBe('zh-CN')
  })

  it('ưu tiên tiếng phổ thông đại lục hơn các biến thể khác', () => {
    install([voice('zh-HK'), voice('zh-TW'), voice('zh-CN')])
    expect(findChineseVoice()?.lang).toBe('zh-CN')
  })

  it('nhận cả mã cmn và yue', () => {
    install([voice('yue-HK')])
    expect(findChineseVoice()?.lang).toBe('yue-HK')
  })

  it('không phân biệt hoa thường hay gạch dưới trong mã ngôn ngữ', () => {
    install([voice('ZH_cn')])
    expect(findChineseVoice()?.lang).toBe('ZH_cn')
  })
})

describe('getAudioStatus', () => {
  it('trình duyệt không đọc được thì báo unsupported', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    expect(getAudioStatus()).toBe('unsupported')
  })

  it('đọc được nhưng thiếu giọng tiếng Trung thì báo no-chinese-voice', () => {
    install([voice('en-US')])
    expect(getAudioStatus()).toBe('no-chinese-voice')
  })

  it('có giọng tiếng Trung thì sẵn sàng', () => {
    install([voice('zh-CN')])
    expect(getAudioStatus()).toBe('ready')
  })
})

describe('subscribeAudioStatus', () => {
  it('báo lại khi trình duyệt nạp xong danh sách giọng', () => {
    const synth = install([])
    const seen: string[] = []

    const stop = subscribeAudioStatus((status) => seen.push(status))
    synth.emitVoicesChanged([voice('zh-CN')])
    stop()

    expect(seen).toEqual(['ready'])
  })

  it('không báo lại khi tình trạng không đổi', () => {
    const synth = install([voice('en-US')])
    const onChange = vi.fn()

    const stop = subscribeAudioStatus(onChange)
    synth.emitVoicesChanged([voice('en-GB')])
    stop()

    expect(onChange).not.toHaveBeenCalled()
  })

  it('huỷ theo dõi rồi thì thôi không báo nữa', () => {
    const synth = install([])
    const onChange = vi.fn()

    const stop = subscribeAudioStatus(onChange)
    stop()
    synth.emitVoicesChanged([voice('zh-CN')])

    expect(onChange).not.toHaveBeenCalled()
  })

  it('trình duyệt không đọc được thì trả về hàm huỷ vô hại', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    expect(() => subscribeAudioStatus(vi.fn())()).not.toThrow()
  })
})

describe('playWord', () => {
  it('đọc bằng giọng tiếng Trung đã chọn', async () => {
    const synth = install([voice('en-US'), voice('zh-CN')])

    await expect(playWord({ text: '你好' })).resolves.toBe('played')
    expect(synth.spoken).toHaveLength(1)
    expect(synth.spoken[0].text).toBe('你好')
    expect(synth.spoken[0].voice?.lang).toBe('zh-CN')
  })

  it('đọc chậm lại để người mới nghe kịp', async () => {
    const synth = install([voice('zh-CN')])

    await playWord({ text: '你好' })

    expect(synth.spoken[0].rate).toBeLessThan(1)
  })

  it('cắt ngang câu đang đọc trước khi đọc câu mới', async () => {
    const synth = install([voice('zh-CN')])

    await playWord({ text: '你好' })

    expect(synth.cancel).toHaveBeenCalled()
  })

  it('thiếu giọng tiếng Trung thì báo lại thay vì im lặng', async () => {
    const synth = install([voice('en-US')])

    await expect(playWord({ text: '你好' })).resolves.toBe('no-chinese-voice')
    expect(synth.spoken).toHaveLength(0)
  })

  it('trình duyệt không đọc được thì báo unsupported', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    await expect(playWord({ text: '你好' })).resolves.toBe('unsupported')
  })

  it('không kẹt mãi khi trình duyệt nuốt luôn câu đang đọc', async () => {
    // Chrome thỉnh thoảng không bắn sự kiện `end`. Nút phát âm phải tự thoát
    // trạng thái "đang đọc" thay vì quay mãi.
    install([voice('zh-CN')])
    vi.stubGlobal('speechSynthesis', {
      ...window.speechSynthesis,
      getVoices: () => [voice('zh-CN')],
      cancel: vi.fn(),
      speak: vi.fn(), // nhận câu rồi im lặng, không bao giờ báo xong
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.useFakeTimers()

    const playing = playWord({ text: '你好' })
    await vi.advanceTimersByTimeAsync(11_000)

    await expect(playing).resolves.toBe('error')
    vi.useRealTimers()
  })

  it('giọng đọc lỗi thì báo error chứ không ném ra ngoài', async () => {
    install([voice('zh-CN')])
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        constructor() {
          throw new TypeError('giọng không hợp lệ')
        }
      },
    )

    await expect(playWord({ text: '你好' })).resolves.toBe('error')
  })
})

/**
 * `Audio` giả. jsdom không phát được media thật: `play()` ném "Not implemented".
 * @param outcome 'ended' là phát xong, 'error' là file hỏng hoặc bị chặn.
 */
function installAudio(outcome: 'ended' | 'error' = 'ended') {
  const played: string[] = []

  vi.stubGlobal(
    'Audio',
    class {
      private handlers: Record<string, () => void> = {}
      constructor(public src: string) {}
      addEventListener(type: string, fn: () => void) {
        this.handlers[type] = fn
      }
      pause() {}
      play() {
        played.push(this.src)
        queueMicrotask(() => this.handlers[outcome]?.())
        return Promise.resolve()
      }
    },
  )

  return played
}

/** Bật cấu hình Supabase và trả lời mọi request CDN là "đã có file". */
function installSupabase() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 200 }))),
  )
}

describe('chuỗi nguồn âm thanh', () => {
  beforeEach(() => {
    resetRemoteAudioCache()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('có file trên Supabase thì phát file đó, không đụng giọng hệ điều hành', async () => {
    const synth = install([voice('zh-CN')])
    const played = installAudio()
    installSupabase()

    await expect(playWord({ text: '你好' })).resolves.toBe('played')

    expect(played).toHaveLength(1)
    expect(played[0]).toContain('/storage/v1/object/public/tts/v1/')
    expect(synth.spoken).toHaveLength(0)
  })

  it('Supabase hỏng thì vẫn đọc được bằng giọng hệ điều hành', async () => {
    const synth = install([voice('zh-CN')])
    installAudio()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    await expect(playWord({ text: '你好' })).resolves.toBe('played')
    expect(synth.spoken).toHaveLength(1)
  })

  it('file tải về hỏng thì lùi tiếp xuống giọng hệ điều hành', async () => {
    const synth = install([voice('zh-CN')])
    installAudio('error')
    installSupabase()

    await expect(playWord({ text: '你好' })).resolves.toBe('played')
    expect(synth.spoken).toHaveLength(1)
  })

  it('không còn nguồn nào thì báo lại thay vì im lặng', async () => {
    install([voice('en-US')])
    installAudio()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))),
    )

    await expect(playWord({ text: '你好' })).resolves.toBe('no-chinese-voice')
  })

  it('báo chặng đang tải rồi mới tới chặng đang đọc', async () => {
    install([voice('zh-CN')])
    installAudio()
    installSupabase()
    const stages: string[] = []

    await playWord({ text: '你好', onStage: (stage) => stages.push(stage) })

    expect(stages).toEqual(['loading', 'speaking'])
  })

  it('chưa cấu hình Supabase thì không hiện chặng tải vô nghĩa', async () => {
    install([voice('zh-CN')])
    const stages: string[] = []

    await playWord({ text: '你好', onStage: (stage) => stages.push(stage) })

    expect(stages).toEqual(['speaking'])
  })

  it('có Supabase thì nút sẵn sàng dù máy chưa cài giọng tiếng Trung', () => {
    install([voice('en-US')])
    installSupabase()

    expect(getAudioStatus()).toBe('ready')
  })
})

describe('audio cả câu', () => {
  const SENTENCE = '你叫什么名字？'

  it('câu có file thu sẵn thì phát file đó, không để máy đọc', async () => {
    const synth = install([voice('zh-CN')])
    const played = installAudio()

    await expect(playWord({ text: SENTENCE, clipUrl: '/audio/cau.mp3' })).resolves.toBe('played')

    expect(played).toEqual(['/audio/cau.mp3'])
    expect(synth.spoken).toHaveLength(0)
  })

  it('file của câu được ưu tiên hơn file của từ', async () => {
    install([voice('zh-CN')])
    const played = installAudio()

    await playWord({ text: SENTENCE, wordId: 'ni', clipUrl: '/audio/cau.mp3' })

    expect(played).toEqual(['/audio/cau.mp3'])
  })

  it('file của câu hỏng thì giọng hệ điều hành đọc cả câu, không chỉ một từ', async () => {
    const synth = install([voice('zh-CN')])
    installAudio('error')

    await expect(playWord({ text: SENTENCE, clipUrl: '/audio/cau.mp3' })).resolves.toBe('played')

    expect(synth.spoken.map((utterance) => utterance.text)).toEqual([SENTENCE])
  })
})

describe('speakWithDeviceVoice', () => {
  it('đọc bản dịch tiếng Việt bằng giọng tiếng Việt của máy, tốc độ bình thường', async () => {
    const synth = install([voice('zh-CN'), voice('vi-VN', 'Linh')])

    await expect(speakWithDeviceVoice('Xin chào', 'vi')).resolves.toBe('played')
    expect(synth.spoken[0].text).toBe('Xin chào')
    expect(synth.spoken[0].voice?.name).toBe('Linh')
    expect(synth.spoken[0].rate).toBe(1)
  })

  it('đọc tiếng Anh bằng giọng tiếng Anh, ưu tiên giọng Mỹ', async () => {
    const synth = install([voice('en-GB', 'Anh'), voice('en-US', 'My'), voice('vi-VN', 'Linh')])

    await expect(speakWithDeviceVoice('Hello', 'en')).resolves.toBe('played')
    expect(synth.spoken[0].voice?.name).toBe('My')
  })

  it('nhận cả mã ngôn ngữ viết gạch dưới hay chỉ có hai chữ', () => {
    install([voice('vi_VN', 'A')])
    expect(findDeviceVoice('vi')?.name).toBe('A')
    install([voice('en', 'B')])
    expect(findDeviceVoice('en')?.name).toBe('B')
  })

  it('máy không có giọng của thứ tiếng đó thì báo no-voice, không đọc bằng giọng khác', async () => {
    const synth = install([voice('zh-CN'), voice('en-US')])

    await expect(speakWithDeviceVoice('Xin chào', 'vi')).resolves.toBe('no-voice')
    expect(synth.spoken).toHaveLength(0)
  })

  it('trình duyệt không đọc được thì báo unsupported', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    await expect(speakWithDeviceVoice('Xin chào', 'vi')).resolves.toBe('unsupported')
  })
})
