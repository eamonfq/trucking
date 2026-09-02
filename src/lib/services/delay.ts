export async function simulateLatency() {
  const delay = 200 + Math.floor(Math.random() * 201);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}
