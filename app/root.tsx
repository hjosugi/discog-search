import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type LinksFunction,
} from "react-router"
import { Box, ChakraProvider } from "@chakra-ui/react"
import type { ReactNode } from "react"

import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { I18nProvider, useLocale } from "./i18n/I18nProvider"
import { theme } from "./theme"

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
  { rel: "manifest", href: "/site.webmanifest" },
]

export function Layout({ children }: { children: ReactNode }) {
  const locale = useLocale()

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

export default function App() {
  return (
    <ChakraProvider theme={theme}>
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
            <Outlet />
          </Box>
          <Footer />
        </Box>
      </I18nProvider>
    </ChakraProvider>
  )
}
