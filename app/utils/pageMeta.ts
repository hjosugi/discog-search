export type PageMetaDescriptor =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

export type PageMetaInput = {
  title: string
  description: string
  image?: string
  type?: "website" | "music.album"
}

export function buildPageMeta({
  title,
  description,
  image = "/logo-dark.png",
  type = "website",
}: PageMetaInput): PageMetaDescriptor[] {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ]
}

export function compactText(value: string, maxLength = 160) {
  const text = value.replace(/\s+/g, " ").trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3).trimEnd()}...`
}
