import { VisuallyHidden } from "@chakra-ui/react"
import type { ReactNode } from "react"

/** A real <label> that is announced by screen readers but not shown. */
export function HiddenLabel({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: ReactNode
}) {
  return (
    <VisuallyHidden as="label" htmlFor={htmlFor}>
      {children}
    </VisuallyHidden>
  )
}
