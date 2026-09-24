/**
 * Shared text normalization. Every comparison of titles, credit names, roles,
 * and track positions goes through these helpers so matching rules live in one
 * place.
 *
 * - `foldText` is the base: Unicode compatibility folding (full-width to ASCII),
 *   Latin accents removed, lowercase, and every run of non-letter/non-digit
 *   characters collapsed to one space. Non-Latin scripts such as Japanese are
 *   kept, so they can still be compared.
 * - `normalizeText` additionally drops parenthetical and bracketed notes such
 *   as "(Take 3)" or "[Live]". Use it to decide whether two titles or names
 *   refer to the same thing.
 * - `normalizeForRanking` keeps those notes, because ranking scores every
 *   searchable token, including the ones inside parentheses.
 */

const PARENTHETICAL_NOTE = /\([^)]*\)/g
const BRACKETED_NOTE = /\[[^\]]*\]/g
const LATIN_COMBINING_MARKS = /[̀-ͯ]/g
const NON_WORD_CHARACTERS = /[^\p{L}\p{N}]+/gu

export function foldText(value = "") {
  return value
    .normalize("NFKD")
    .replace(LATIN_COMBINING_MARKS, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(NON_WORD_CHARACTERS, " ")
    .trim()
}

export function stripNotes(value = "") {
  return value.replace(PARENTHETICAL_NOTE, "").replace(BRACKETED_NOTE, "")
}

export function normalizeText(value = "") {
  return foldText(stripNotes(value))
}

export function normalizeForRanking(value = "") {
  return foldText(value)
}

/**
 * Human-readable cleanup for labels and outbound search queries: removes
 * notes and extra whitespace but keeps the original casing and punctuation.
 */
export function cleanSearchText(value = "") {
  return stripNotes(value).replace(/\s+/g, " ").trim()
}

/** Track positions compare case- and whitespace-insensitively ("a 1" = "A1"). */
export function normalizePosition(value = "") {
  return value.toUpperCase().replace(/\s+/g, "")
}
