import { Button, Wrap, WrapItem } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../AppIcon"
import { useI18n } from "~/i18n/I18nProvider"
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
  const { t } = useI18n()

  if (roles.length === 0 && !activeRole) {
    return null
  }

  return (
    <Wrap spacing={2} mb={3} role="group" aria-label={t("album.roleFilter")}>
      {roles.map((role) => {
        const isActive =
          Boolean(activeRole) && roleMatchesFilter(role, activeRole)

        return (
          <WrapItem key={role}>
            <Button
              as={RouterLink}
              to={buildDetailHref(location, { role })}
              preventScrollReset
              minH={{ base: "44px", md: 6 }}
              aria-current={isActive ? "true" : undefined}
              leftIcon={isActive ? <AppIcon name="check" size={12} /> : undefined}
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
            preventScrollReset
            minH={{ base: "44px", md: 6 }}
            size="xs"
            variant="ghost"
          >
            {t("album.clearRole")}
          </Button>
        </WrapItem>
      )}
    </Wrap>
  )
}
