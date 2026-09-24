import { Heading, HStack, Text } from "@chakra-ui/react"
import type { ReactNode } from "react"

import { AppIcon } from "../AppIcon"

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <HStack spacing={2} mb={3}>
      <Text color="text.accent">
        <AppIcon name="spark" size={15} />
      </Text>
      <Heading as="h2" size="sm">
        {children}
      </Heading>
    </HStack>
  )
}
