import {
  Box,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
} from "@chakra-ui/react"
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import { useFetcher, useNavigate } from "react-router"

import { AppIcon } from "../AppIcon"
import { HiddenLabel } from "./HiddenLabel"
import { useI18n } from "~/i18n/I18nProvider"
import type { SearchResult } from "~/types"

type SuggestionData = {
  suggestions: SearchResult[]
}

const MIN_QUERY_LENGTH = 3
const SUGGESTION_DELAY_MS = 600

/**
 * Song field with track suggestions, following the WAI-ARIA 1.2 combobox
 * pattern: ArrowDown/ArrowUp move through the options (the input keeps focus
 * and exposes the active one via aria-activedescendant), Enter opens the
 * active suggestion, Escape closes the list, and Enter without an active
 * option submits the form as usual.
 */
export function SongCombobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  credit,
  genre,
  buildHref,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  credit: string
  genre: string
  buildHref: (suggestion: SearchResult) => string
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const fetcher = useFetcher<SuggestionData>()
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listboxId = `${id}-listbox`
  const query = value.trim()
  const suggestions =
    query.length >= MIN_QUERY_LENGTH ? fetcher.data?.suggestions || [] : []
  const isExpanded = isOpen && suggestions.length > 0
  const activeOptionId =
    isExpanded && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined

  useEffect(() => {
    if (!isOpen || query.length < MIN_QUERY_LENGTH) return

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ song: query })
      if (credit) params.set("credit", credit)
      if (genre) params.set("genre", genre)
      fetcherRef.current.load(`/search/suggestions?${params.toString()}`)
    }, SUGGESTION_DELAY_MS)

    return () => window.clearTimeout(timeout)
  }, [credit, genre, isOpen, query])

  useEffect(() => {
    setActiveIndex(-1)
  }, [fetcher.data])

  const openSuggestion = (suggestion: SearchResult) => {
    setIsOpen(false)
    navigate(buildHref(suggestion))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        if (suggestions.length === 0) return
        event.preventDefault()
        setIsOpen(true)
        setActiveIndex((index) =>
          !isExpanded || index >= suggestions.length - 1 ? 0 : index + 1
        )
        break
      case "ArrowUp":
        if (suggestions.length === 0) return
        event.preventDefault()
        setIsOpen(true)
        setActiveIndex((index) =>
          !isExpanded || index <= 0 ? suggestions.length - 1 : index - 1
        )
        break
      case "Enter":
        if (isExpanded && activeIndex >= 0) {
          event.preventDefault()
          openSuggestion(suggestions[activeIndex])
        }
        break
      case "Escape":
        if (isExpanded) {
          event.preventDefault()
          setIsOpen(false)
          setActiveIndex(-1)
        }
        break
      case "Tab":
        setIsOpen(false)
        break
    }
  }

  return (
    <Box position="relative">
      <HiddenLabel htmlFor={id}>{label}</HiddenLabel>
      <InputGroup size="md">
        <InputLeftElement color="text.icon" pointerEvents="none" h="100%">
          <AppIcon name="music" size={17} />
        </InputLeftElement>
        <Input
          id={id}
          name="song"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isExpanded}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setIsOpen(false)
            setActiveIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          h={{ base: "44px", md: 10 }}
          bg="bg.surface"
        />
      </InputGroup>

      <Box
        as="ul"
        id={listboxId}
        role="listbox"
        aria-label={t("search.suggestions")}
        hidden={!isExpanded}
        listStyleType="none"
        position="absolute"
        zIndex={10}
        top="calc(100% + 4px)"
        left={0}
        right={0}
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="md"
        boxShadow="md"
        overflow="hidden"
      >
        {isExpanded &&
          suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex

            return (
              <Box
                as="li"
                key={suggestion.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isActive}
                px={4}
                py={2}
                minH="44px"
                cursor="pointer"
                bg={isActive ? "bg.selected" : "transparent"}
                _hover={{ bg: isActive ? "bg.selected" : "bg.subtle" }}
                onMouseDown={(event: MouseEvent) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => openSuggestion(suggestion)}
              >
                <HStack spacing={2}>
                  <Text as="span" color="text.icon">
                    <AppIcon name="music" size={15} />
                  </Text>
                  <Box minW={0}>
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {suggestion.title}
                    </Text>
                    {suggestion.year && (
                      <Text fontSize="xs" color="text.muted">
                        {suggestion.year}
                      </Text>
                    )}
                  </Box>
                </HStack>
              </Box>
            )
          })}
      </Box>
    </Box>
  )
}
