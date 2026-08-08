# Contributing

Thanks for helping improve the JoyanLabs landing site.

## Workflow

1. Fork the repository and create a focused branch from the current base branch.
2. Keep the change small and explainable.
3. Do not include credentials, environment files, private keys, certificates, or local deployment settings.
4. Do not include local `.atl/` or `openspec/` work-in-progress unless a maintainer explicitly requests it.
5. Run the checks below before opening a pull request.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

## Pull Requests

Describe the problem, the change, and the validation performed. Mention visual changes and include screenshots when they clarify the result. Call out any Docker or Dokploy impact.

Pull requests should preserve the existing Astro, pnpm, Docker, and nginx deployment flow. Avoid unrelated dependency, lockfile, or source changes.

## Reporting Issues

Use a public issue for reproducible bugs and proposed improvements that do not contain sensitive information. Report security vulnerabilities privately as described in [SECURITY.md](./SECURITY.md).
