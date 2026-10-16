import cloudbase from '@cloudbase/js-sdk/app';
import { registerAuth } from '@cloudbase/js-sdk/auth';
import { registerFunctions } from '@cloudbase/js-sdk/functions';

registerAuth(cloudbase);
registerFunctions(cloudbase);

type CloudbaseApp = ReturnType<typeof cloudbase.init>;

let app: CloudbaseApp | null = null;
let readyPromise: Promise<void> | null = null;

function envId(): string {
  const id = (import.meta.env.VITE_TCB_ENV || '').trim();
  if (!id) {
    throw new Error('请在 .env / .env.local 配置 VITE_TCB_ENV（与小程序 cloud-env.js 的 envId 一致）');
  }
  return id;
}

function getApp(): CloudbaseApp {
  if (!app) {
    const accessKey = (import.meta.env.VITE_TCB_ACCESS_KEY || '').trim();
    const region = (import.meta.env.VITE_TCB_REGION || 'ap-shanghai').trim();
    app = cloudbase.init({
      env: envId(),
      region,
      ...(accessKey ? { accessKey } : {}),
    });
  }
  return app;
}

function publishableKey(): string {
  return (import.meta.env.VITE_TCB_ACCESS_KEY || '').trim();
}

/**
 * Web 端鉴权（@cloudbase/js-sdk 3.x）：
 * - init 可配 Publishable Key（VITE_TCB_ACCESS_KEY），但 callFunction 仍需登录态（通常匿名会话）
 * - 控制台须：身份源开启匿名登录 + 默认访客具备云函数调用策略（见 DEPLOY.md）
 */
export async function ensureCloudbaseReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const auth = getApp().auth;
    try {
      const loginState = await auth.getLoginState();
      if (loginState) return;
    } catch {
      // 继续尝试匿名登录
    }

    const { error } = await auth.signInAnonymously();
    if (error) {
      readyPromise = null;
      const env = envId();
      const hint = [
        `当前环境 VITE_TCB_ENV=${env}`,
        '登录授权/身份认证 → 身份源列表 → 开启「匿名登录」',
        '跨域域名已配 localhost:5173；Publishable Key 不能替代匿名登录（见 EXCEED_AUTHORITY 说明）',
        publishableKey() ? '已检测到 VITE_TCB_ACCESS_KEY' : '建议在 .env.local 同时配置 VITE_TCB_ACCESS_KEY',
      ].join('；');
      throw new Error(`${error.message || '云开发 Web 登录失败'}。${hint}`);
    }
  })();
  return readyPromise;
}

export type ApiCallPayload = {
  module: string;
  action: string;
  payload?: Record<string, unknown>;
};

function wrapCallFunctionError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/EXCEED_AUTHORITY|exceed.*authority|超出权限/i.test(msg)) {
    return new Error(
      `${msg}。身份认证里的「所有 APIs」不等于云函数网关权限；请到「云函数 → 权限控制/安全规则」为函数 api 配置 invoke（示例见 docs/cloud-function-invoke-rules.example.json），并在微信开发者工具「云开发 → 设置 → 权限设置」开启未登录/匿名访问云资源（若仍拦截）。`,
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

export async function callApiCloudFunction(data: ApiCallPayload): Promise<unknown> {
  await ensureCloudbaseReady();
  try {
    const res = await getApp().callFunction({
      name: 'api',
      data: {
        module: data.module,
        action: data.action,
        payload: data.payload || {},
      },
    });
    return res.result;
  } catch (e) {
    throw wrapCallFunctionError(e);
  }
}
