import type { Locale } from "../i18n/locale"

const HTML_OPEN_TAG = /<html\b([^>]*)>/i

/**
 * The SPA shell is a static prerendered file. For HTML responses, write the
 * negotiated locale into `<html lang>` and `data-locale` before it reaches the
 * browser, so screen readers and the first client render use the right
 * language without a flash.
 */
export async function localizeHtmlResponse(
  response: Response,
  locale: Locale
): Promise<Response> {
  const contentType = response.headers.get("Content-Type") || ""
  if (!contentType.includes("text/html") || !response.body) return response

  const html = await response.text()
  const localized = html.replace(HTML_OPEN_TAG, (_match, attributes: string) => {
    const rest = attributes
      .replace(/\s+lang="[^"]*"/i, "")
      .replace(/\s+data-locale="[^"]*"/i, "")
    return `<html lang="${locale}" data-locale="${locale}"${rest}>`
  })

  const headers = new Headers(response.headers)
  headers.delete("Content-Length")
  headers.delete("ETag")
  headers.append("Vary", "Cookie")
  headers.append("Vary", "Accept-Language")

  return new Response(localized, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
