# Seize the Day

A personal daily planner and to-do manager, styled after a physical day-planner: pick a date, work the page for that day, and carry unfinished business forward (or back) as needed.

Built end-to-end — schema, API, and UI — as a full-stack TypeScript project.

## Features

- **Daily planner view** — a banner date picker (with prev/next-day shortcuts) drives the whole page; tasks and notes are scoped to whichever day is active.
- **Tasks grid** — inline-editable status, priority group/ordinal, project, and description, with a completed-tasks toggle and default-sort logic (status → priority group → ordinal).
- **Statuses with color-coding** — each status carries its own background/foreground color and a description shown as a hover tooltip.
- **Notes with Markdown** — click to edit as plain Markdown, click away to render; scoped to the day they were written for (independent of when they were actually saved), sorted in write order like lines on a page.
- **Tasks ↔ Notes linking** — spin a task off directly from a note ("Add related task"); linked tasks show a note indicator with a hover preview of the note's body.
- **Project context** — set a project as the active context to default new tasks/notes into it and filter the day's task list down to just that project.
- **Move Unfinished Tasks** — bulk-reschedule everything left undone on a given day to another date, with an optional per-task date override for anything that shouldn't just follow the herd.
- **Keyboard shortcuts** — `Alt/Option+T` (new task), `Alt/Option+N` (new note), `Alt/Option+M` (move unfinished tasks) — chosen deliberately to avoid the browser's own reserved `Ctrl/Cmd` shortcuts.
- **Auth** — nickname/email and password, with admins issuing one-time invite links (also used for password resets); JWT-based session that lasts as long as the browser tab is open.
- **Schedule column** — a read-only view of the active day's events from the user's private iCal feed (Settings > Calendar; Google Calendar's "Secret address in iCal format" works), alongside Tasks and Notes, refreshed every 15 minutes and on demand, with an "Add" link that opens Google Calendar's own day view in a new tab for creating events.
- **Multiple users** — each user's tasks, notes, and projects are their own. A task can be delegated to another user, who sees it (and any notes it links) on their own day and can change its status, date, and priority. Sign-in is invite-only: an admin adds people by email in Settings > Users first.
- **Settings** — CRUD management for Projects (per user) and Theme; admins also manage the shared Statuses and Priority Groups and the Users list.

## Tech stack

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS 4, react-markdown, lucide-react icons

**Backend** — Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT auth, bcryptjs

**Tooling** — npm workspaces monorepo, Jest + Testing Library (both packages), ts-node-dev

## Project structure

```
.
├── client/          React + Vite frontend
│   └── src/
│       ├── components/   Banner, Tasks/Notes columns, dialogs, Settings tabs
│       ├── pages/        LoginPage, MainPage
│       ├── context/       Auth context
│       └── lib/           API client, date helpers, shared task-default logic
├── server/          Express + Prisma backend
│   ├── prisma/            Schema, migrations, seed script
│   └── src/
│       ├── routes/        REST endpoints (auth, tasks, notes, statuses, priority-groups, projects, users)
│       ├── middleware/     JWT auth guard
│       └── lib/            Prisma client, shared helpers
└── docs/specs/       Original planning specs for the app, schema, and tech stack
```

## Getting started

### Prerequisites

- Node.js 20+
- A local PostgreSQL instance

### Setup

```bash
# Install dependencies for both workspaces
npm install

# Configure the database connection
cp server/.env.example server/.env
# edit server/.env with your local Postgres connection string and a JWT secret

# Create the schema and seed some starter data (statuses, priority groups, a user)
cd server && npx prisma migrate deploy && cd ..
npm run prisma:seed

# Nobody can sign in until they have a password. Create yourself as an admin
# and print a one-time link to choose one:
npm run user:invite --workspace server -- you@example.com --admin
```

### Run it

```bash
# Terminal 1 - API server (http://localhost:4000)
npm run dev:server

# Terminal 2 - frontend (http://localhost:5174)
npm run dev:client
```

### Tests

```bash
npm test
```

Runs the Jest suite for both the server and client workspaces.

## Notes

`docs/specs/` contains the original planning documents this project was built from — a useful reference for the intent behind some of the more particular design choices (e.g. why note timestamps and "context dates" are tracked separately).
