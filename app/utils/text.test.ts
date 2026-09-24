import { describe, expect, it } from "vitest"

import {
  cleanSearchText,
  foldText,
  normalizeForRanking,
  normalizePosition,
  normalizeText,
} from "./text"

describe("text normalization", () => {
  it("folds case, punctuation, accents, and full-width characters", () => {
    expect(foldText("Björk – Vespertine!")).toBe("bjork vespertine")
    expect(foldText("ＡＢＣ　１２３")).toBe("abc 123")
  })

  it("keeps non-Latin scripts comparable", () => {
    expect(foldText("渡辺貞夫 / ナベサダ")).toBe("渡辺貞夫 ナベサダ")
    expect(normalizeText("カリフォルニア・シャワー (Live)")).toBe(
      "カリフォルニア シャワー"
    )
  })

  it("drops parenthetical and bracketed notes only in normalizeText", () => {
    expect(normalizeText("Blue In Green (Take 3) [Mono]")).toBe("blue in green")
    expect(normalizeForRanking("Blue In Green (Take 3)")).toBe(
      "blue in green take 3"
    )
  })

  it("cleans display text without changing its casing", () => {
    expect(cleanSearchText("  So What  (Alternate Take) ")).toBe("So What")
  })

  it("normalizes track positions", () => {
    expect(normalizePosition(" a 1 ")).toBe("A1")
  })
})
