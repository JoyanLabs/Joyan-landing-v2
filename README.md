# Joyan Landing

JoyanLabs' landing site, built with Astro and Tailwind CSS. The repository is maintained at [JoyanLabs/Joyan-landing-v2](https://github.com/JoyanLabs/Joyan-landing-v2).

## Stack

- Astro 7 with static output
- Tailwind CSS 4
- TypeScript
- React and Vue integrations where the site needs them
- Node.js 22 and pnpm 10

The required Node.js version is recorded in `.nvmrc`.

## Local Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm check` | Run Astro checks, linting, and repository checks |
| `pnpm build` | Create the production build in `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format source files with Prettier |
| `pnpm fix` | Apply ESLint fixes to source files |

Run `pnpm check` and `pnpm build` before opening a pull request.

## Project Map

- `src/pages/` contains the Spanish and English routes.
- `src/components/` contains reusable Astro, React, and Vue components.
- `src/data/journal/` contains the published Journal content in both locales.
- `src/config.yaml` contains site and SEO configuration.
- `src/assets/` contains processed assets and global styles.
- `public/` contains static assets copied to the build output.
- `Dockerfile`, `docker-compose.yml`, and `nginx/` define the container deployment.

## Docker and Dokploy

The multi-stage `Dockerfile` builds the static site and serves `dist/` with nginx. The container listens on port `8080`.

```bash
docker compose up --build
```

For Dokploy, use the repository's Dockerfile or Compose configuration and expose container port `8080`. Keep deployment secrets in Dokploy's secret or environment configuration; never commit them to the repository.

## Contributing

Contributions are welcome through the standard GitHub fork and pull request flow:

1. Fork the repository and create a focused branch from the current base branch.
2. Make the smallest change that solves the problem.
3. Run `pnpm check` and `pnpm build`.
4. Open a pull request describing the change, validation performed, and any deployment or visual impact.

Do not commit credentials, environment files, private keys, certificates, local deployment configuration, or local `.atl/` and `openspec/` work-in-progress. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the collaboration details.

## Security and Conduct

See [SECURITY.md](./SECURITY.md) for private vulnerability reporting and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community standards.

## License Review

`LICENSE.md` is preserved unchanged for this preparation. Its upstream attribution and provenance still require human review before public visibility is enabled.
