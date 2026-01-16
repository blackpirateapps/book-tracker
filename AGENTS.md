# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React UI (pages in `src/pages/`, reusable UI in `src/components/`, entry in `src/main.jsx`).
- `api/` holds Vercel serverless functions (e.g., `api/books.js`, `api/tags.js`).
- Root config: `vite.config.js`, `tailwind.config.js`, `vercel.json`, `index.html`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server for the React app.
- `npm run build`: create a production build.
- `npm run preview`: serve the production build locally.
- For local serverless emulation, follow `README.md` (Vercel CLI + `.env.local`).

## Coding Style & Naming Conventions
- Indentation: 2 spaces in JSX/JS files, matching current code style.
- File naming: React components use `PascalCase` (e.g., `BookDetails.jsx`).
- Keep styles lightweight; global styles live in `src/index.css`.
- No formatter/linter is configured; keep changes consistent with existing patterns.

## Testing Guidelines
- No automated test framework is set up yet.
- If adding tests, document the framework and add a corresponding `npm run test` script.

## Commit & Pull Request Guidelines
- Git history uses short, lowercase summaries (e.g., `cleanup`, `new search bar`).
- Keep commits small and descriptive; use present-tense, imperative mood.
- PRs should include a concise description, linked issues (if any), and screenshots for UI changes.

## Configuration & Secrets
- Local env vars go in `.env.local` (see `README.md` for required keys like `TURSO_DATABASE_URL`).
- Avoid committing secrets or generated files.
