const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function api(path, options = {}) {
  const { headers, ...restOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || 'No se pudo completar la solicitud.');
  }

  return data;
}
