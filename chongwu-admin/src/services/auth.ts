import type { AdminUser } from '../types';
import { callApi, setAdminToken } from './cloud-api';

type LoginData = {
  token: string;
  adminToken: string;
  admin: {
    id: string;
    username: string;
    nickname?: string;
    name?: string;
    role: AdminUser['role'];
  };
};

export async function adminLogin(username: string, password: string) {
  const data = await callApi<LoginData>('admin', 'login', { username, password });
  const token = data.adminToken || data.token;
  setAdminToken(token);
  return data;
}

export async function adminMe() {
  return callApi<{ admin: LoginData['admin'] }>('admin', 'me', {});
}
