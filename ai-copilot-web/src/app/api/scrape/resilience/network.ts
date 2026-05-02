function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
  options?: {
    retries?: number;
    initialDelayMs?: number;
  }
): Promise<Response> {
  const retries = options?.retries ?? 2;
  const initialDelayMs = options?.initialDelayMs ?? 400;

  let attempt = 0;
  let delayMs = initialDelayMs;

  while (true) {
    const response = await fetch(input, init);

    if (response.status !== 429 || attempt >= retries) {
      return response;
    }

    await sleep(delayMs);
    delayMs *= 2;
    attempt += 1;
  }
}
