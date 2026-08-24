export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields || {};
  }
}

export async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.message || 'The request could not be completed.', response.status, payload.fields);
  return payload;
}
