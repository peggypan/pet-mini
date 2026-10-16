import { callApiCloudFunction } from './cloudbase-client';

export type ApiResult<T = unknown> = {
  code: number;
  message: string;
  data: T;
  details?: unknown;
};

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
  const fullPayload = {
    ...payload,
    ...(token && !(module === 'admin' && action === 'login') ? { adminToken: token } : {}),
  };

  const raw = await callApiCloudFunction({
    module,
    action,
    payload: fullPayload,
  });

  const body = raw as ApiResult<T> | null | undefined;
  if (!body || typeof body.code !== 'number') {
    throw new Error('云函数返回格式异常，请确认已部署 cloudfunctions/api');
  }
  if (body.code !== 0) {
    const err = new Error(body.message || '请求失败');
    (err as Error & { code?: number; details?: unknown }).code = body.code;
    (err as Error & { code?: number; details?: unknown }).details = body.details;
    throw err;
  }
  return body.data as T;
}
