# 使用 Node.js 官方镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 server 目录内容
COPY server/ ./

# 安装依赖
RUN npm install --legacy-peer-deps

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 NestJS 应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动命令（先执行数据库迁移，再启动应用）
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
