# 可选 BFF（默认不必使用）

运营后台已改为浏览器 **`@cloudbase/js-sdk` → callFunction('api')`**，一般 **不需要** 本服务。

仅在 Web SDK 无法调云函数时，可临时启动：

```bash
cp .env.example .env
npm install && npm run dev
```

并在前端改回 `fetch` 代理方案（已移除 Vite proxy，需自行恢复）。
