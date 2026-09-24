# Dependency and Toolchain Policy

This page records how the toolchain is kept current and why some upgrades are
deliberately held back.

## Current toolchain

| Area | Choice | Notes |
| --- | --- | --- |
| Package manager | Bun 1.3.14 (`packageManager`) | CI installs with `bun install --frozen-lockfile`. |
| Lint | ESLint 9 flat config (`eslint.config.js`) | Ignores are declared in the config; `--ignore-path` is no longer used. |
| TypeScript lint | `typescript-eslint` v8 | Single meta package replaces `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` v6. |
| React lint | `eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks` v7 | Flat configs from each plugin. |
| Import lint | `eslint-plugin-import` + `eslint-import-resolver-typescript` v4 | Resolves the `~/*` path alias. |
| UI runtime | React 19 + Chakra UI v2.10 | See "React 19" below. |

## Lint rule parity

The flat config keeps the same rule sets as the former `.eslintrc.cjs`:

- `eslint:recommended` for every file;
- `react/recommended`, `react/jsx-runtime`, and `jsx-a11y/recommended` for
  JS/TS/JSX files;
- `typescript-eslint/recommended`, `import/recommended`, and
  `import/typescript` for TypeScript files, with the same
  `import/no-unresolved` exception for `virtual:react-router/server-build`;
- the classic hooks rules: `react-hooks/rules-of-hooks` (error) and
  `react-hooks/exhaustive-deps` (warn).

`eslint-plugin-react-hooks` v6+ also ships React Compiler diagnostics
(`set-state-in-effect`, `preserve-manual-memoization`, and others) in its
`recommended` preset. They are not enabled yet: the search form intentionally
re-syncs controlled inputs from the URL in an effect, and adopting the compiler
rules should happen together with a decision to adopt the React Compiler
itself. Enable them by switching the hooks block in `eslint.config.js` to
`reactHooks.configs.flat.recommended` and fixing the reported sites.

ESLint 10 is available, but `eslint-plugin-react`, `eslint-plugin-jsx-a11y`,
and `eslint-plugin-import` still declare `eslint <= 9` peer ranges, so the
project stays on the ESLint 9 maintenance line until those plugins support 10.

## React 19

React 19 was evaluated against the UI dependencies:

- `@chakra-ui/react` 2.10.x declares `react >= 18` and works with React 19;
- `framer-motion` 11.18 declares `^18 || ^19`;
- `@emotion/react` / `@emotion/styled` 11.14 support React 19;
- React Router v7 supports React 19.

The app therefore runs on React 19. The only source change required was using
`React.JSX.Element` instead of the removed global `JSX` namespace.

Chakra UI v3 is a separate migration (new component APIs, Panda-style
recipes, no framer-motion). It is not required for React 19 and is out of scope
for routine dependency updates.

## Update cadence

Dependabot (`.github/dependabot.yml`) opens grouped weekly pull requests for:

- the `bun` ecosystem: minor and patch updates are grouped into one PR, while
  major updates arrive as individual PRs so they can be evaluated separately;
- GitHub Actions used by the workflows.

Every update PR must pass the `CI` workflow (`lint`, `typecheck`, `test`,
`build`). Major updates of React, React Router, Chakra UI, Elysia, Vite, or
Wrangler should also be checked with `bun run test:e2e` before merging.

Update the "Current toolchain" table above whenever a major version changes.
