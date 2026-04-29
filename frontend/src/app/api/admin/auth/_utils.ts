export type ErrorPayload = {
  detail?: string;
};

export async function readJsonOrDetail<T extends object = ErrorPayload>(
  response: Response,
): Promise<T> {
  const raw = await response.text();
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return { detail: raw.slice(0, 500) } as T;
  }
}
