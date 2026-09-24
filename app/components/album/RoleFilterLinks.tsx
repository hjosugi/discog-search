import { Button, Wrap, WrapItem } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { buildDetailHref, type DetailLocation } from "~/utils/albumDetail"
import { roleMatchesFilter } from "~/utils/trackCredits"

export function RoleFilterLinks({
  location,
  activeRole,
  roles,
}: {
  location: DetailLocation
  activeRole: string
  roles: string[]
}) {
  if (roles.length === 0 && !activeRole) {
    return null
  }

  return (
    <Wrap spacing={2} mb={3}>
      {roles.map((role) => {
        const isActive =
          Boolean(activeRole) && roleMatchesFilter(role, activeRole)

        return (
          <WrapItem key={role}>
            <Button
              as={RouterLink}
              to={buildDetailHref(location, { role })}
              colorScheme={isActive ? "blue" : "gray"}
              size="xs"
              variant={isActive ? "solid" : "outline"}
            >
              {role}
            </Button>
          </WrapItem>
        )
      })}
      {activeRole && (
        <WrapItem>
          <Button
            as={RouterLink}
            to={buildDetailHref(location, { role: null })}
            size="xs"
            variant="ghost"
          >
            Clear
          </Button>
        </WrapItem>
      )}
    </Wrap>
  )
}
