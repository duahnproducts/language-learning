"""Sinh file phát âm cho khoá tiếng Việt, chạy ngay trên máy bằng Piper.

    pip install piper-tts lameenc
    npm run generate-audio-vi             # chỉ sinh clip mới, hoặc clip đổi chữ
    npm run generate-audio-vi -- --force  # sinh lại tất cả

File ra nằm ở `src/assets/audio/vi/` — thư mục riêng, có manifest riêng, vì
`generate-audio.py` của khoá tiếng Trung tự dọn mọi file trong `sentences/`
không thuộc khoá tiếng Trung.

Giọng `vi_VN-vais1000-medium`: một giọng nữ miền Bắc, cao độ trung vị đo được
khoảng 230 Hz (giọng nam cỡ 100–140 Hz). Đọc chậm hơn mặc định khoảng 15% để
người mới nghe kịp từng âm tiết. Khác tiếng Trung, ở đây không cần câu đệm hay
máy chấm thanh: Piper đọc tiếng Việt qua espeak, vốn ghi thanh điệu ngay trong
chữ Quốc ngữ.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import lameenc
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")

try:
    from piper import PiperVoice, SynthesisConfig
    from piper.download_voices import download_voice
except ImportError as error:  # pragma: no cover - chỉ để báo lỗi dễ hiểu
    raise SystemExit(f"Thiếu thư viện ({error.name}). Chạy:\n    pip install piper-tts lameenc") from error

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "src" / "assets" / "audio"
MANIFEST = AUDIO_DIR / "vi" / "manifest.json"
VOICE_DIR = ROOT / ".piper-voices"

VOICE = "vi_VN-vais1000-medium"

# length_scale 1.5: chậm hơn mặc định khoảng 15% (câu 7 âm tiết từ 1,46 s lên
# 1,71 s — mô hình này co giãn ít hơn tỉ lệ ghi trên tham số). Ít ngẫu nhiên
# hơn mặc định để giọng đều giữa các clip.
SYNTHESIS = SynthesisConfig(length_scale=1.5, noise_scale=0.333, noise_w_scale=0.333)

# Giữ lại chút lặng ở hai đầu, vuốt âm lượng để nút bấm không nghe tiếng "tách".
LEAD_SECONDS = 0.03
TAIL_SECONDS = 0.12
FADE_IN_SECONDS = 0.008
FADE_OUT_SECONDS = 0.03
PEAK = 0.89  # -1 dBFS

MP3_BITRATE = 48
MP3_QUALITY = 2

FORCE = "--force" in sys.argv


def load_clips() -> list[dict]:
    result = subprocess.run(
        ["node", str(ROOT / "scripts" / "dump-clips-vi.ts")],
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=ROOT,
    )
    if result.returncode != 0:
        raise SystemExit(f"Không đọc được danh sách clip:\n{result.stderr}")
    return json.loads(result.stdout)


def ensure_voice() -> Path:
    model = VOICE_DIR / f"{VOICE}.onnx"
    if not model.exists():
        print(f"Tải model {VOICE} (khoảng 60 MB, chỉ một lần)…")
        VOICE_DIR.mkdir(parents=True, exist_ok=True)
        download_voice(VOICE, VOICE_DIR)
    return model


def trim(audio: np.ndarray, rate: int) -> np.ndarray:
    """Cắt lặng hai đầu: giữ từ khung 10 ms đầu tiên tới khung cuối cùng to hơn mức nền 40 dB."""
    hop = int(0.01 * rate)
    frames = [audio[i : i + hop] for i in range(0, len(audio) - hop, hop)]
    energy = np.array([10 * np.log10(np.mean(f**2) + 1e-12) for f in frames])
    loud = np.nonzero(energy > energy.max() - 40)[0]
    start = max(0, loud[0] * hop - int(LEAD_SECONDS * rate))
    end = min(len(audio), (loud[-1] + 1) * hop + int(TAIL_SECONDS * rate))
    return audio[start:end]


def finish(audio: np.ndarray, rate: int) -> np.ndarray:
    audio = audio / max(float(np.max(np.abs(audio))), 1e-8) * PEAK
    fade_in = min(len(audio), int(FADE_IN_SECONDS * rate))
    fade_out = min(len(audio), int(FADE_OUT_SECONDS * rate))
    audio[:fade_in] *= np.linspace(0, 1, fade_in)
    audio[len(audio) - fade_out :] *= np.linspace(1, 0, fade_out)
    return audio


def to_mp3(audio: np.ndarray, rate: int) -> bytes:
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(MP3_BITRATE)
    encoder.set_in_sample_rate(rate)
    encoder.set_channels(1)
    encoder.set_quality(MP3_QUALITY)
    return bytes(encoder.encode(pcm) + encoder.flush())


def main() -> None:
    clips = load_clips()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    recorded = manifest.get("clips", {}) if manifest.get("voice") == VOICE else {}

    voice = PiperVoice.load(str(ensure_voice()))
    rate = voice.config.sample_rate
    print(f"Giọng: {VOICE}")

    created, skipped = 0, 0
    clips_out: dict[str, str] = {}
    for clip in clips:
        target = AUDIO_DIR / clip["path"]
        clips_out[clip["path"]] = clip["text"]
        if target.exists() and recorded.get(clip["path"]) == clip["text"] and not FORCE:
            skipped += 1
            continue

        # Từ đơn thêm dấu chấm để giọng kết thúc trọn vẹn, không bỏ lửng như đang đọc dở.
        text = clip["text"] if clip["text"][-1] in ".?!" else f"{clip['text']}."
        audio = np.concatenate([chunk.audio_float_array for chunk in voice.synthesize(text, SYNTHESIS)])
        mp3 = to_mp3(finish(trim(audio, rate), rate), rate)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(mp3)
        created += 1
        print(f"  + {clip['path']:<32} {clip['text']:<36} {len(mp3):>6} byte")

    MANIFEST.write_text(
        json.dumps({"voice": VOICE, "clips": clips_out}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # Tên file câu băm từ nội dung: câu bị sửa hay bị bỏ thì file cũ thành rác.
    removed = 0
    for stale in sorted((AUDIO_DIR / "vi" / "sentences").glob("*.mp3")):
        if f"vi/sentences/{stale.name}" not in clips_out:
            stale.unlink()
            removed += 1

    total = sum((AUDIO_DIR / path).stat().st_size for path in clips_out)
    print(f"\nSinh mới {created}, đã có sẵn {skipped}, xoá {removed} file câu cũ. Tổng {total / 1024:.0f} KB.")


if __name__ == "__main__":
    main()
