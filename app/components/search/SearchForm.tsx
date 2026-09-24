import {
  Box,
  Button,
  Grid,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { Form, useSubmit } from "react-router"

import { AppIcon } from "../AppIcon"
import { HiddenLabel } from "./HiddenLabel"
import { SongCombobox } from "./SongCombobox"
import { useI18n } from "~/i18n/I18nProvider"
import type { MessageKey } from "~/i18n/messages"
import type { SearchSortOption } from "~/utils/searchRanking"
import {
  buildSearchParams,
  DECADE_OPTIONS,
  getSortOption,
  type SearchState,
} from "~/utils/searchState"

const FORMAT_OPTIONS = ["LP", "CD", "Album", "Single", '12"', '7"', "Cassette"]

const SORT_OPTIONS: Array<{ value: SearchSortOption; label: MessageKey }> = [
  { value: "relevance", label: "search.sort.relevance" },
  { value: "year_desc", label: "search.sort.yearDesc" },
  { value: "year_asc", label: "search.sort.yearAsc" },
]

export type SearchFormValues = Omit<SearchState, "page">

function toFormValues(state: SearchState): SearchFormValues {
  return {
    credit: state.credit,
    song: state.song,
    genre: state.genre,
    role: state.role,
    year: state.year,
    decade: state.decade,
    country: state.country,
    format: state.format,
    sort: state.sort,
  }
}

function trimValues(values: SearchFormValues): SearchState {
  return {
    credit: values.credit.trim(),
    song: values.song.trim(),
    genre: values.genre.trim(),
    role: values.role.trim(),
    year: values.year.trim(),
    decade: values.year.trim() ? "" : values.decade.trim(),
    country: values.country.trim(),
    format: values.format.trim(),
    sort: values.sort,
    page: 1,
  }
}

/**
 * The search form. Inputs are controlled so the form mirrors the URL after
 * back/forward navigation; submitting navigates in the SPA. Every field has a
 * (visually hidden) label, the song field is an ARIA combobox, and "/"
 * focuses the credit field from anywhere on the page.
 */
export function SearchForm({
  submittedState,
  isSearchPending,
}: {
  submittedState: SearchState
  isSearchPending: boolean
}) {
  const { t } = useI18n()
  const submit = useSubmit()
  const idPrefix = useId()
  const creditInputRef = useRef<HTMLInputElement>(null)
  const submittedKey = buildSearchParams(submittedState).toString()
  const [values, setValues] = useState(() => toFormValues(submittedState))
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const submittedStateRef = useRef(submittedState)
  submittedStateRef.current = submittedState

  useEffect(() => {
    setValues(toFormValues(submittedStateRef.current))
  }, [submittedKey])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      creditInputRef.current?.focus()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const setValue = <Key extends keyof SearchFormValues>(
    key: Key,
    value: SearchFormValues[Key]
  ) => setValues((current) => ({ ...current, [key]: value }))

  const isSearchDisabled =
    (!values.credit.trim() && !values.song.trim() && !values.genre.trim()) ||
    isSearchPending
  const fieldId = (name: string) => `${idPrefix}-${name}`
  const activeMoreFilters = [
    values.genre,
    values.role,
    values.year,
    values.decade,
    values.country,
    values.format,
    values.sort !== "relevance" ? values.sort : "",
  ].filter((value) => value.trim()).length
  // On small screens only credit + song are shown until "More filters" is
  // opened; from md up every field is always visible.
  const moreFiltersDisplay = {
    base: showMoreFilters ? "block" : "none",
    md: "block",
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit(buildSearchParams(trimValues(values)), {
      action: "/search",
      method: "get",
    })
  }

  const buildSuggestionHref = (suggestion: { id: number; title: string; type?: string }) => {
    const params = buildSearchParams({
      ...trimValues(values),
      song: values.song.trim() || suggestion.title,
    })
    if (suggestion.type === "release") params.set("kind", "release")
    return `/search/${suggestion.id}?${params.toString()}`
  }

  return (
    <Box
      as={Form}
      role="search"
      aria-label={t("search.heading")}
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={{ base: 3, md: 4 }}
      boxShadow="sm"
    >
      <Grid
        gap={2}
        templateColumns={{
          base: "1fr",
          md: "minmax(0, 1fr) minmax(180px, 220px) 140px",
          lg: "minmax(0, 1fr) minmax(190px, 230px) minmax(150px, 180px) 140px",
        }}
      >
        <Box gridColumn={{ base: "auto", md: "1 / -1", lg: "auto" }}>
          <HiddenLabel htmlFor={fieldId("credit")}>
            {t("search.field.credit")}
          </HiddenLabel>
          <InputGroup size="md">
            <InputLeftElement color="text.icon" pointerEvents="none" h="100%">
              <AppIcon name="user" size={17} />
            </InputLeftElement>
            <Input
              ref={creditInputRef}
              id={fieldId("credit")}
              name="credit"
              placeholder={t("search.field.creditPlaceholder")}
              value={values.credit}
              onChange={(event) => setValue("credit", event.target.value)}
              aria-keyshortcuts="/"
              h={{ base: "44px", md: 10 }}
              bg="bg.surface"
            />
          </InputGroup>
        </Box>

        <Box gridColumn={{ base: "auto", md: "1 / 2", lg: "auto" }}>
          <SongCombobox
            id={fieldId("song")}
            label={t("search.field.song")}
            placeholder={t("search.field.songPlaceholder")}
            value={values.song}
            onChange={(value) => setValue("song", value)}
            credit={values.credit}
            genre={values.genre}
            buildHref={buildSuggestionHref}
          />
        </Box>

        <Box
          id={fieldId("genre-field")}
          display={moreFiltersDisplay}
          gridColumn={{ base: "auto", md: "2 / 3", lg: "auto" }}
        >
          <HiddenLabel htmlFor={fieldId("genre")}>
            {t("search.field.genre")}
          </HiddenLabel>
          <InputGroup size="md">
            <InputLeftElement color="text.icon" pointerEvents="none" h="100%">
              <AppIcon name="tag" size={16} />
            </InputLeftElement>
            <Input
              id={fieldId("genre")}
              name="genre"
              placeholder={t("search.field.genre")}
              value={values.genre}
              onChange={(event) => setValue("genre", event.target.value)}
              list={fieldId("genre-suggestions")}
              h={{ base: "44px", md: 10 }}
              bg="bg.surface"
            />
          </InputGroup>
        </Box>

        <Box
          id={fieldId("role-field")}
          display={moreFiltersDisplay}
          gridColumn={{ base: "auto", md: "1 / 3", lg: "1 / 4" }}
        >
          <HiddenLabel htmlFor={fieldId("role")}>
            {t("search.field.role")}
          </HiddenLabel>
          <InputGroup size="md">
            <InputLeftElement color="text.icon" pointerEvents="none" h="100%">
              <AppIcon name="mic" size={16} />
            </InputLeftElement>
            <Input
              id={fieldId("role")}
              name="role"
              placeholder={t("search.field.rolePlaceholder")}
              value={values.role}
              onChange={(event) => setValue("role", event.target.value)}
              list={fieldId("role-suggestions")}
              h={{ base: "44px", md: 10 }}
              bg="bg.surface"
            />
          </InputGroup>
        </Box>

        <Button
          colorScheme="blue"
          type="submit"
          isDisabled={isSearchDisabled}
          isLoading={isSearchPending}
          loadingText={t("search.submitting")}
          leftIcon={<AppIcon name="search" size={16} />}
          gridColumn={{ base: "auto", md: "3 / 4", lg: "auto" }}
          h={{ base: "44px", md: 10 }}
          px={4}
          w="100%"
          whiteSpace="nowrap"
        >
          {t("search.submit")}
        </Button>
      </Grid>

      <Button
        type="button"
        display={{ base: "flex", md: "none" }}
        w="100%"
        mt={2}
        minH="44px"
        variant="ghost"
        size="sm"
        aria-expanded={showMoreFilters}
        aria-controls={`${fieldId("genre-field")} ${fieldId("role-field")} ${fieldId("more-filters")}`}
        rightIcon={
          <AppIcon
            name="chevronDown"
            size={15}
            style={{
              transform: showMoreFilters ? "rotate(180deg)" : undefined,
              transition: "transform 120ms ease",
            }}
          />
        }
        onClick={() => setShowMoreFilters((value) => !value)}
      >
        {activeMoreFilters > 0
          ? t("search.moreFiltersActive", { count: activeMoreFilters })
          : t("search.moreFilters")}
      </Button>

      <Box id={fieldId("more-filters")} display={moreFiltersDisplay}>
        <SimpleGrid columns={{ base: 1, md: 4 }} gap={2} mt={3}>
          <Box>
            <HiddenLabel htmlFor={fieldId("year")}>{t("search.field.year")}</HiddenLabel>
            <Input
              id={fieldId("year")}
              inputMode="numeric"
              maxLength={4}
              placeholder={t("search.field.year")}
              value={values.year}
              onChange={(event) => {
                const year = event.target.value
                setValues((current) => ({
                  ...current,
                  year,
                  decade: year.trim() ? "" : current.decade,
                }))
              }}
              h={{ base: "44px", md: 10 }}
              bg="bg.surface"
            />
          </Box>
          <Box>
            <HiddenLabel htmlFor={fieldId("country")}>
              {t("search.field.country")}
            </HiddenLabel>
            <Input
              id={fieldId("country")}
              placeholder={t("search.field.country")}
              value={values.country}
              onChange={(event) => setValue("country", event.target.value)}
              list={fieldId("country-suggestions")}
              h={{ base: "44px", md: 10 }}
              bg="bg.surface"
            />
          </Box>
          <Box>
            <HiddenLabel htmlFor={fieldId("format")}>
              {t("search.field.format")}
            </HiddenLabel>
            <Select
              id={fieldId("format")}
              value={values.format}
              onChange={(event) => setValue("format", event.target.value)}
              h={{ base: "44px", md: 10 }}
              bg="bg.surface"
            >
              <option value="">{t("search.field.anyFormat")}</option>
              {FORMAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Box>
          <Box>
            <HiddenLabel htmlFor={fieldId("sort")}>{t("search.field.sort")}</HiddenLabel>
            <Select
              id={fieldId("sort")}
              value={values.sort}
              onChange={(event) => setValue("sort", getSortOption(event.target.value))}
              h={{ base: "44px", md: 10 }}
              bg="bg.surface"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </Select>
          </Box>
        </SimpleGrid>

        <Wrap
          mt={3}
          spacing={2}
          role="group"
          aria-label={t("search.field.decade")}
        >
          <WrapItem>
            <Button
              type="button"
              size="sm"
              minH={{ base: "44px", md: 8 }}
              variant={!values.decade ? "solid" : "outline"}
              colorScheme={!values.decade ? "blue" : "gray"}
              aria-pressed={!values.decade}
              onClick={() => setValue("decade", "")}
            >
              {t("search.decade.any")}
            </Button>
          </WrapItem>
          {DECADE_OPTIONS.map((option) => (
            <WrapItem key={option}>
              <Button
                type="button"
                size="sm"
                minH={{ base: "44px", md: 8 }}
                variant={values.decade === option ? "solid" : "outline"}
                colorScheme={values.decade === option ? "blue" : "gray"}
                aria-pressed={values.decade === option}
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    year: "",
                    decade: current.decade === option ? "" : option,
                  }))
                }
              >
                {t("search.decade.label", { decade: option })}
              </Button>
            </WrapItem>
          ))}
        </Wrap>
      </Box>

      <datalist id={fieldId("genre-suggestions")}>
        <option value="Jazz" />
        <option value="Rock" />
        <option value="Pop" />
        <option value="Classical" />
        <option value="Hip Hop" />
        <option value="Electronic" />
      </datalist>
      <datalist id={fieldId("role-suggestions")}>
        <option value="drums" />
        <option value="bass" />
        <option value="guitar" />
        <option value="piano" />
        <option value="saxophone" />
        <option value="vocals" />
      </datalist>
      <datalist id={fieldId("country-suggestions")}>
        <option value="US" />
        <option value="UK" />
        <option value="Japan" />
        <option value="France" />
        <option value="Germany" />
        <option value="Italy" />
      </datalist>
    </Box>
  )
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  )
}
