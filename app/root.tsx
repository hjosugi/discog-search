import {
  isRouteErrorResponse,
  Links,
  Link as RouterLink,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  type LinksFunction,
} from "react-router"
import { Box, Button, ChakraProvider, Heading, Text } from "@chakra-ui/react"
import type { ReactNode } from "react"

import { AppIcon } from "./components/AppIcon"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { colorModeManager, colorModeScript } from "./colorMode"
import { I18nProvider, useI18n, useLocale } from "./i18n/I18nProvider"
import { theme } from "./theme"

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
  { rel: "manifest", href: "/site.webmanifest" },
]

export function Layout({ children }: { children: ReactNode }) {
  const locale = useLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: colorModeScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider theme={theme} colorModeManager={colorModeManager}>
      <I18nProvider>
        <Box
          minH="100vh"
          bg="bg.canvas"
          display="flex"
          flexDirection="column"
        >
          <Header />
          <Box
            as="main"
            flex="1"
            px={{ base: 4, md: 6 }}
            py={{ base: 5, md: 8 }}
          >
            {children}
          </Box>
          <Footer />
        </Box>
      </I18nProvider>
    </ChakraProvider>
  )
}

export default function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export function ErrorBoundary() {
  return (
    <AppShell>
      <RootErrorPage />
    </AppShell>
  )
}

function RootErrorPage() {
  const error = useRouteError()
  const { t } = useI18n()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <Box
      maxW="760px"
      mx="auto"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={5}
    >
      <Heading as="h1" size="md" mb={2}>
        {isNotFound ? t("error.page.notFound") : t("error.page.title")}
      </Heading>
      <Text color="text.muted" fontSize="sm" mb={4}>
        {isNotFound ? t("error.page.notFoundBody") : t("error.internal")}
      </Text>
      <Button
        as={RouterLink}
        to="/search"
        leftIcon={<AppIcon name="arrowLeft" size={15} />}
        variant="link"
      >
        {t("error.page.back")}
      </Button>
    </Box>
  )
}
