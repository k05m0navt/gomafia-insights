# Frontend Deployment Checklist

This document contains minimal steps and environment variables required to deploy the `frontend` app.

## Quick Steps
- Ensure branch is merged to `main` or `dev` as appropriate
- Confirm CI (lint, tests, build) passed on the branch
- Build: `npm ci && npm run build`
- Optional: Run smoke tests against a staging environment
- Deploy static build / Start server according to hosting provider (Vercel recommended for Next.js)

## Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key for client-side features
- `SUPABASE_SERVICE_ROLE_KEY` - (server-side) service role key if server functions need elevated access
- `SENTRY_DSN` - (optional) Sentry DSN for error reporting
- `VERCEL_ENV` or `NODE_ENV` - ensure correct environment markers

## Monitoring & Rollout
- Enable basic monitoring/alerts for server and client errors
- Use gradual rollout or preview deployments for major changes
- Verify realtime connections and API fallbacks in staging before production

## Post-Deploy Verification
- Confirm `npm run build` artifacts deployed successfully
- Spot-check dashboard pages render and charts load
- Confirm telemetry endpoint (`/api/_telemetry/error`) returns 204 for POSTs

## Notes
- Telemetry endpoint is intentionally lightweight. Replace server-side console logging with a secure ingestion pipeline for production.
