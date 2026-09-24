import { Box, type BoxProps } from "@chakra-ui/react"

/** Bordered surface used for the detail page sections. */
export function Panel(props: BoxProps) {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={4}
      {...props}
    />
  )
}
