/**
 * Icon nét cho các nút bấm — cùng khung, cùng độ dày nét với icon của thanh
 * điều hướng, tô bằng `currentColor` nên tự đổi màu theo nút.
 *
 * Icon màu cho chỉ số và thành tích nằm ở `GameIcons.tsx`.
 */

import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface IconProps {
  size?: number
  className?: string
}

function Frame({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icon=""
    >
      {children}
    </svg>
  )
}

export function SpeakerIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 9.4h3.2L12 5.4v13.2l-4.8-4H4Z" fill="currentColor" />
      <path d="M15.4 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18 6.6a7.6 7.6 0 0 1 0 10.8" />
    </Frame>
  )
}

export function SpeakerOffIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 9.4h3.2L12 5.4v13.2l-4.8-4H4Z" fill="currentColor" />
      <path d="M15.8 9.6l4.8 4.8M20.6 9.6l-4.8 4.8" />
    </Frame>
  )
}

/** Vòng quay "đang tải". Người xin giảm chuyển động thì đứng yên. */
export function SpinnerIcon({ className, ...props }: IconProps) {
  return (
    <Frame {...props} className={cn('animate-spin motion-reduce:animate-none', className)}>
      <path d="M12 3.6a8.4 8.4 0 1 1-8.4 8.4" />
    </Frame>
  )
}

export function MicIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="8.6" y="3" width="6.8" height="11.4" rx="3.4" fill="currentColor" />
      <path d="M5.4 11.2a6.6 6.6 0 0 0 13.2 0" />
      <path d="M12 17.8V21M8.8 21h6.4" />
    </Frame>
  )
}

/** Mũi tên chỉ xuống — ô chọn còn lựa chọn khác. */
export function ChevronDownIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M7 10l5 5 5-5" />
    </Frame>
  )
}

/** Hai mũi tên ngược chiều — đổi chiều dịch. */
export function SwapIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 8.4h14.4M14.6 4.6l3.8 3.8-3.8 3.8" />
      <path d="M20 15.6H5.6M9.4 11.8l-3.8 3.8 3.8 3.8" />
    </Frame>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M7.6 5.2v13.6L18.8 12Z" fill="currentColor" />
    </Frame>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M5 12.6l4.4 4.4L19 7.4" strokeWidth="2.4" />
    </Frame>
  )
}

/** Hai tấm thẻ chồng lên nhau — một bài học là một xấp thẻ từ. */
export function CardsIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="3.6" y="6.4" width="11.6" height="14.4" rx="2.4" transform="rotate(-8 9.4 13.6)" />
      <rect x="9.2" y="4.4" width="11.6" height="14.4" rx="2.4" fill="currentColor" fillOpacity=".18" />
    </Frame>
  )
}

/** Quyển sách — "có trong bài học". */
export function BookIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M11.2 6.3C9.3 5 7 4.5 3.8 4.5v13c3.2 0 5.5.5 7.4 1.8Z" />
      <path d="M12.8 6.3c1.9-1.3 4.2-1.8 7.4-1.8v13c-3.2 0-5.5.5-7.4 1.8Z" />
    </Frame>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2.8v1.8M12 19.4v1.8M2.8 12h1.8M19.4 12h1.8M5.5 5.5l1.3 1.3M17.2 17.2l1.3 1.3M5.5 18.5l1.3-1.3M17.2 6.8l1.3-1.3" />
    </Frame>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M19.4 14.6A7.8 7.8 0 0 1 9.4 4.6a7.8 7.8 0 1 0 10 10Z" fill="currentColor" />
    </Frame>
  )
}

/** Nửa sáng nửa tối — theo máy. */
export function AutoThemeIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
    </Frame>
  )
}

/** Con bướm — nền động đầy đủ. */
export function ButterflyIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M12 8.6C10.2 5 5.8 3.6 4 5.4c-1.6 1.6-.4 5.4 3 6.6-3 .8-3.6 4-1.8 5.4 1.8 1.4 5-.2 6.8-3.4" />
      <path d="M12 8.6c1.8-3.6 6.2-5 8-3.2 1.6 1.6.4 5.4-3 6.6 3 .8 3.6 4 1.8 5.4-1.8 1.4-5-.2-6.8-3.4" />
      <path d="M12 8.2v10" />
    </Frame>
  )
}

/** Dãy núi đứng yên — nền tĩnh. */
export function StillSceneIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M2.8 19.2l6-9 3.8 5.4 2.6-3.4 6 7Z" />
      <circle cx="17.2" cy="6.6" r="1.8" fill="currentColor" />
    </Frame>
  )
}

/** Vòng tròn gạch chéo — tắt. */
export function OffIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.4 17.6L17.6 6.4" />
    </Frame>
  )
}
