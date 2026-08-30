<div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;">

<div style="flex: 1; min-width: 260px;">

<h1 style="margin: 0; border: none; padding: 0;">Feline</h1>

<p style="margin: 8px 0 0 0;"><strong>Live at <a href="https://nekorg.gitlab.io/feline">nekorg.gitlab.io/feline</a></strong></p>

<p style="margin: 8px 0 0 0;">Feline is a Matrix client - fast, modern, and focused on clean UX.</p>

<p style="margin: 8px 0 0 0; color: #666;"><em>The best matrix client ever.</em></p>

</div>

<a href="https://nekorg.gitlab.io/feline" style="flex-shrink: 0; line-height: 0;">
  <img src="public/res/svg/feline.svg" width="128" height="128" alt="Feline logo" style="display: block;" />
</a>

</div>

## Tech Stack

React 19 · Vite 8 · TypeScript · vanilla-extract · Jotai · React Router · matrix-js-sdk · Element Call

## Getting Started

```sh
# requires Node >= 18
npm ci
npm start        # dev server
npm run build    # production build (output: dist/)
npm run preview  # preview production build
```

### Configuration

Edit `config.json` at the project root:

```json
{
  "defaultHomeserver": 1,
  "homeserverList": ["converser.eu", "matrix.org", "mozilla.org"],
  "allowCustomHomeservers": true
}
```

Rebuild after changing config. See `build.config.ts` and `vite.config.js` for build options (base path, PWA, etc.).

## Deployment

**GitLab Pages** - configured via `.gitlab-ci.yml` (builds with `--base=/feline/`, copies `index.html` → `404.html` for SPA fallback).

**Docker:**

```sh
docker compose up --build
# or
docker build -t feline . && docker run -p 80:80 feline
```

**Netlify** - `netlify.toml` included with SPA redirect.

For a custom domain, change the build base to `/`:

```sh
npm run build -- --base=/
```

## Project Structure

```
src/app/components  - reusable UI
src/app/features    - feature modules (room, settings, lobby, search, etc.)
src/app/pages       - route pages (auth, client, home, space, etc.)
src/app/state       - Jotai atoms / hooks
src/utils           - helpers (themeOverride, roundness, matrix, etc.)
public/             - static assets + element-call embed
```

## Contributing

Contributions welcome. Please keep changes focused and do not just vibe-code.

```sh
npm run lint        # eslint + prettier checks
npm run typecheck   # tsc --noEmit
```

AI-written code is allowed but you are responsible for your code and slop will lead you to a ban on the project.

## Acknowledgements

Built on the work of [Cinny](https://github.com/cinnyapp/cinny) and the Matrix ecosystem. Thanks to all upstream contributors.

## License

[AGPL-3.0-only](LICENSE)
