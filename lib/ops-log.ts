export function logEvent(event: string, payload: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };
  console.log(JSON.stringify(entry));
}

export function logError(event: string, payload: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    level: "error",
    event,
    ...payload,
  };
  console.error(JSON.stringify(entry));
}
