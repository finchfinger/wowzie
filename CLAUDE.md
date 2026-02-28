# Project Guide for Claude

## ⚠️ ACTIVE APP
The active application is **`golly/`** — a Next.js app running on `http://localhost:3000`.

**Always work in: `/Users/johnpaul/Desktop/wowzie/wowzie-react/golly/src/`**

## ❌ DO NOT EDIT
`/Users/johnpaul/Desktop/wowzie/wowzie-react/src/` — this is the OLD Vite/React prototype. It is abandoned. Ignore it entirely.

## Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS variables (`text-foreground`, `bg-muted`, etc.)
- **Auth/DB**: Supabase
- **Payments**: Stripe
- **Icons**: Material Symbols Rounded (loaded via Google Fonts in `layout.tsx`)
- **Port**: 3000 (Next.js dev server — already running, do not restart it)

## Key paths
| What | Where |
|---|---|
| Pages | `golly/src/app/**/page.tsx` |
| Components | `golly/src/components/` |
| UI primitives | `golly/src/components/ui/` |
| Auth context | `golly/src/lib/auth-context.tsx` |
| Supabase client | `golly/src/lib/supabase.ts` |

## Dev server
Already running on port 3000. Do not kill or restart it unless explicitly asked.
If it needs restarting: `cd golly && npm run dev`
