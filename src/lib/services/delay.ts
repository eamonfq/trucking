export async function simulateLatency() {
  // Kept for existing callers; live operations have no artificial delay.
}

export function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}
