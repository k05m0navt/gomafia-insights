import type { ErrorReport } from '@/components/realtime/RealtimeErrorBoundary';

export async function reportError(errorReport: ErrorReport): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Try using sendBeacon for reliable background delivery
    if (navigator && typeof navigator.sendBeacon === 'function') {
      const url = '/api/_telemetry/error';
      const blob = new Blob([JSON.stringify(errorReport)], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }

    // Fallback to non-blocking fetch with keepalive where supported
    void fetch('/api/_telemetry/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
      keepalive: true,
    }).catch(() => {
      // swallow errors to avoid affecting app runtime
    });
  } catch (e) {
    // swallow any telemetry errors
    console.warn('Telemetry stub failed', (e as Error).message || e);
  }
}

export function initTelemetry() {
  // Initialize telemetry provider in the future. Currently a noop.
  return
}

export function captureError(error: unknown, metadata?: Record<string, unknown>) {
  try {
    // In future, replace with real provider call behind feature flag
    if (process.env.NEXT_PUBLIC_TELEMETRY === 'true') {
      // send to provider
    } else {
      // Console fallback for CI/logging
      console.error('[telemetry] captureError', error, metadata)
    }
  } catch (e) {
    // swallow errors from telemetry to avoid breaking app flow
    console.error('[telemetry] captureError failed', e)
  }
}

export function captureBreadcrumb(message: string, data?: Record<string, unknown>) {
  // lightweight breadcrumb capture
  console.log('[telemetry] breadcrumb', message, data)
}
