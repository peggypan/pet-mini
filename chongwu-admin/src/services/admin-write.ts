import { callApi } from './cloud-api';

export type OfficialContentKind = 'social' | 'buddy' | 'event' | 'local';

export async function uploadAdminMedia(
  file: File,
  folder = 'admin/content',
): Promise<{ fileID: string; url: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  return callApi('admin_feed', 'uploadMedia', { base64, ext, folder });
}

export async function createOfficialContent(
  kind: OfficialContentKind,
  payload: Record<string, unknown>,
) {
  return callApi('admin_feed', 'createOfficialContent', { kind, ...payload });
}

export async function createOfficialMapPoint(payload: Record<string, unknown>) {
  return callApi('admin_feed', 'createOfficialMapPoint', payload);
}

export async function saveMerchantAdmin(payload: Record<string, unknown> & { id?: string }) {
  return callApi('admin_feed', 'saveMerchantAdmin', payload);
}

export async function saveClubAdmin(payload: {
  id: string;
  name: string;
  city: string;
  intro: string;
  cover?: string;
}) {
  return callApi('admin_feed', 'saveClubAdmin', payload);
}

export async function setMerchantBizStatus(
  id: string,
  bizStatus: 0 | 1 | 2,
  rejectReason?: string,
) {
  return callApi('admin_feed', 'setMerchantBizStatus', { id, bizStatus, rejectReason });
}

/** 已是 https / cloud:// 则不上传 */
export function shouldUploadImageUrl(url: string): boolean {
  const u = (url || '').trim();
  if (!u) return false;
  if (u.startsWith('cloud://')) return false;
  if (/^https?:\/\//i.test(u)) return false;
  return u.startsWith('data:');
}

export async function ensureCloudImageUrl(url: string, folder: string): Promise<string> {
  const u = (url || '').trim();
  if (!shouldUploadImageUrl(u)) return u;
  const up = await callApi<{ fileID: string; url: string }>('admin_feed', 'uploadMedia', {
    base64: u,
    folder,
  });
  return up.url || up.fileID;
}
