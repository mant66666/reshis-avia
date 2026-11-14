export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options).catch(() => {
    throw new Error('Не удалось связаться с сервером. Попробуйте ещё раз.');
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'Не удалось получить данные. Попробуйте ещё раз.');
  }

  return response.json();
}
