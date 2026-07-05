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
import "./tailwind.css"

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
    <ChakraProvider>
      <Box
        minH="100vh"
        bg="gray.50"
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
    </ChakraProvider>
  )
}
