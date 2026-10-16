export type ApiResult<T = unknown> = {
  code: number;
  message: string;
  data: T;
};

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

export function getAdminToken(): string {
  return sessionStorage.getItem('chongwu_admin_token') || '';
}

export function setAdminToken(token: string) {
  if (token) sessionStorage.setItem('chongwu_admin_token', token);
  else sessionStorage.removeItem('chongwu_admin_token');
}

export async function callApi<T = unknown>(
  module: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const token = getAdminToken();
  const body = {
    module,
    action,
    payload: {
      ...payload,
      ...(token && module !== 'admin' && action !== 'login' ? { adminToken: token } : {}),
    },
  };

  const res = await fetch(`${API_BASE}/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as ApiResult<T>;
  if (!res.ok || json.code !== 0) {
    const err = new Error(json.message || `请求失败 (${res.status})`);
    (err as Error & { code?: number }).code = json.code;
    throw err;
  }
  return json.data as T;
}
