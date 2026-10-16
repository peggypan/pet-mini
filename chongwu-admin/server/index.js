import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import cloudbase from '@cloudbase/node-sdk';

dotenv.config();

const envId = process.env.TCB_ENV || '';
const secretId = process.env.TCB_SECRET_ID || '';
const secretKey = process.env.TCB_SECRET_KEY || '';
const port = Number(process.env.PORT) || 8787;

if (!envId || !secretId || !secretKey) {
  console.warn(
    '[chongwu-admin-server] 请在 server/.env 配置 TCB_ENV、TCB_SECRET_ID、TCB_SECRET_KEY',
  );
}

const tcb = cloudbase.init({
  env: envId,
  secretId,
  secretKey,
});

async function invokeApi(event) {
  const res = await tcb.callFunction({
    name: 'api',
    data: event,
  });
  const result = res.result;
  if (result == null) {
    return { code: 500, message: '云函数无返回', data: null };
  }
  return result;
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, envConfigured: !!(envId && secretId && secretKey) });
});

/** 与小程序 callFunction 相同：{ module, action, payload } */
app.post('/api/call', async (req, res) => {
  try {
    const { module, action, payload } = req.body || {};
    if (!module || !action) {
      res.status(400).json({ code: 400, message: '缺少 module 或 action', data: null });
      return;
    }
    const result = await invokeApi({
      module,
      action,
      payload: payload || {},
    });
    res.json(result);
  } catch (e) {
    console.error('[api/call]', e);
    res.status(500).json({
      code: 500,
      message: e.message || 'BFF 调用失败',
      data: null,
    });
  }
});

app.listen(port, () => {
  console.log(`[chongwu-admin-server] http://localhost:${port} (env: ${envId || '未配置'})`);
});
