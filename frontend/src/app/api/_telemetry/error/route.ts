export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Lightweight server-side logging for telemetry (non-blocking)
    // In production, replace with a secure ingestion pipeline
    console.info('[telemetry] /api/_telemetry/error received', {
      message: body?.message,
      category: body?.category,
      severity: body?.severity,
      component: body?.componentName,
      timestamp: body?.timestamp,
    });

    // Return 204 No Content for fire-and-forget telemetry
    return new Response(null, { status: 204 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'invalid payload' }), { status: 400 });
  }
}
