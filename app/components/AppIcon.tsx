import type { JSX, SVGProps } from "react"

type IconName =
  | "arrowLeft"
  | "clock"
  | "disc"
  | "external"
  | "mic"
  | "music"
  | "search"
  | "spark"
  | "star"
  | "tag"
  | "user"
  | "x"

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
}

export function AppIcon({
  name,
  size = 18,
  strokeWidth = 2,
  ...props
}: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {icons[name]}
    </svg>
  )
}

const icons: Record<IconName, JSX.Element> = {
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  disc: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 5v2" />
      <path d="M17 12h2" />
    </>
  ),
  external: (
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  mic: (
    <>
      <path d="M12 14a4 4 0 0 0 4-4V7a4 4 0 0 0-8 0v3a4 4 0 0 0 4 4Z" />
      <path d="M19 10a7 7 0 0 1-14 0" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v5" />
      <path d="M12 16v5" />
      <path d="M3 12h5" />
      <path d="M16 12h5" />
      <path d="m5 5 3 3" />
      <path d="m16 16 3 3" />
      <path d="m19 5-3 3" />
      <path d="m8 16-3 3" />
    </>
  ),
  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
  ),
  tag: (
    <>
      <path d="M20 12 12 20 4 12V4h8l8 8Z" />
      <circle cx="9" cy="9" r="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
}
