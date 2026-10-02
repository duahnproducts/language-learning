import { useEffect, useState } from 'react'
import { getAudioStatus, subscribeAudioStatus, type AudioLang, type AudioStatus } from '../lib/speech'

/**
 * Tình trạng phát âm của máy đang dùng cho một thứ tiếng, tự cập nhật khi
 * trình duyệt nạp xong danh sách giọng đọc (Chrome và Edge nạp bất đồng bộ).
 */
export function useAudioStatus(lang: AudioLang = 'zh'): AudioStatus {
  const [status, setStatus] = useState<AudioStatus>(() => getAudioStatus(lang))

  useEffect(() => {
    setStatus(getAudioStatus(lang))
    return subscribeAudioStatus(setStatus, lang)
  }, [lang])

  return status
}
