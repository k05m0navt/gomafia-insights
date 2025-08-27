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
