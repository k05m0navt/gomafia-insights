# DEPLOYMENT.md

## Quick Checklist
- Ensure environment variables are set:
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_API_URL` (if different from runtime)
  - `NEXT_PUBLIC_TELEMETRY=true|false` (enable telemetry)
- Build and verify locally:
  - `npm ci && npm run build`
  - `npm start` (or platform-specific preview)

## Healthcheck
- URL: `https://<preview-or-production>/` or a health endpoint
- Use `scripts/canary-healthcheck.sh <url>` for quick verification

## Rollback
- Use hosting platform (Vercel/Netlify) UI or CLI to revert to previous successful deployment

## Notes
- CI placeholder in .github/workflows/ci.yml must be replaced with a platform-specific preview publisher that sets `preview_url` output for the Playwright job.
