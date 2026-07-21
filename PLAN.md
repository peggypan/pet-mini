<!-- /autoplan restore point: /Users/min/.gstack/projects//main-autoplan-restore-20260324-101744.md -->
# 个人网站实现计划

## 项目概述

构建一个现代化的个人网站，具有以下特点：
- **SEO 优化**：搜索引擎友好，结构化数据，快速加载
- **AI Agent 可访问**：提供语义化 HTML、机器可读的元数据、API 接口
- **内容管理**：易于更新博客、项目、作品集
- **响应式设计**：完美适配所有设备
- **高性能**：快速加载，优化用户体验

---

## 技术栈选择

### 前端
- **框架**：Next.js 14+ (App Router)
  - 服务端渲染 (SSR) 支持 SEO
  - 静态站点生成 (SSG) 优化性能
  - 内置图片优化
  - API 路由支持
- **样式**：Tailwind CSS
- **内容**：MDX for blog posts

### 后端
- **API**：Next.js API Routes
- **数据源**：
  - Markdown 文件 + frontmatter
  - 可选：Headless CMS (Contentful/Sanity)

### 部署
- **平台**：Vercel (推荐) 或 Netlify
- **CDN**：自动全球分发

### SEO 工具
- **结构化数据**：JSON-LD
- **Sitemap**：自动生成
- **RSS Feed**：博客订阅
- **Open Graph**：社交分享优化

---

## 网站结构

```
/                    # 首页
/about              # 关于我
/blog               # 博客列表
  /blog/[slug]      # 博客文章详情
/projects           # 项目展示
  /projects/[slug]  # 项目详情
/talks              # 演讲/分享
/rss.xml            # RSS 订阅
/sitemap.xml        # 站点地图
/api/               # AI Agent API
  /api/posts        # 获取所有文章
  /api/projects     # 获取所有项目
  /api/profile      # 获取个人信息
```

---

## 实现阶段

### Phase 1: 基础架构
- [ ] 初始化 Next.js 项目
- [ ] 配置 Tailwind CSS
- [ ] 设置基础布局和导航
- [ ] 配置 TypeScript
- [ ] 设置 ESLint 和 Prettier
- [ ] **添加**：错误处理层（error.tsx、not-found.tsx）
- [ ] **添加**：API 统一错误响应格式
- [ ] **添加**：测试框架（Jest + React Testing Library + Playwright）

### Phase 2: 核心页面
- [ ] 首页：个人信息、最新文章、项目亮点
- [ ] 关于页面：简历、技能、联系方式
- [ ] 博客列表页：文章卡片、分类、标签
- [ ] 博客详情页：MDX 渲染、代码高亮、阅读时间
- [ ] 项目展示页：项目卡片、技术栈标签
- [ ] 项目详情页：详细描述、截图、链接

### Phase 3: SEO 优化
- [ ] Meta 标签优化
- [ ] 结构化数据 (JSON-LD)
  - Person schema
  - Article schema
  - BreadcrumbList schema
- [ ] Sitemap 自动生成
- [ ] RSS Feed 生成
- [ ] robots.txt 配置
- [ ] Open Graph 和 Twitter Cards
- [ ] 性能优化 (Lighthouse 90+)

### Phase 4: AI Agent 友好特性
- [ ] 语义化 HTML 结构
- [ ] RESTful API 端点
  - GET /api/posts - 返回所有文章（JSON）
  - GET /api/projects - 返回所有项目（JSON）
  - GET /api/profile - 返回个人信息（JSON）
- [ ] 内容类型协商 (HTML vs JSON)
- [ ] 机器可读的元数据
- [ ] Web Sub (WebSub) 支持（实时更新）
- [ ] **添加**：API 响应缓存头（Cache-Control）
- [ ] **添加**：CDN 缓存策略配置

### Phase 5: 内容管理
- [ ] Markdown 文章模板
- [ ] Frontmatter schema 定义
- [ ] 文章预览（草稿模式）
- [ ] 图片优化流程
- [ ] 代码语法高亮
- [ ] **添加**：TypeScript 类型定义（Post、Project、Profile）
- [ ] **添加**：Zod 运行时验证

### Phase 6: 部署和监控
- [ ] Vercel 部署配置
- [ ] 自定义域名设置
- [ ] HTTPS 配置
- [ ] Google Analytics 集成
- [ ] Google Search Console 集成
- [ ] 性能监控（Core Web Vitals）

### Phase 7: 测试（NEW）
- [ ] 单元测试：组件渲染测试
- [ ] 单元测试：工具函数测试
- [ ] 集成测试：API 端点测试
- [ ] E2E 测试：关键用户流程
- [ ] SEO 测试：metadata 验证
- [ ] 性能测试：Lighthouse CI

---

## AI Agent API 设计

### API 端点规范

#### GET /api/profile
```json
{
  "name": "Your Name",
  "title": "Your Title",
  "bio": "Short bio...",
  "skills": ["Skill1", "Skill2"],
  "social": {
    "github": "https://github.com/...",
    "twitter": "https://twitter.com/...",
    "linkedin": "https://linkedin.com/..."
  },
  "contact": {
    "email": "your@email.com"
  }
}
```

#### GET /api/posts
```json
{
  "posts": [
    {
      "slug": "post-slug",
      "title": "Post Title",
      "excerpt": "Short excerpt...",
      "publishedAt": "2024-01-01",
      "tags": ["tag1", "tag2"],
      "url": "https://yourdomain.com/blog/post-slug"
    }
  ]
}
```

#### GET /api/posts/[slug]
返回单篇文章的完整内容

#### GET /api/projects
```json
{
  "projects": [
    {
      "slug": "project-slug",
      "name": "Project Name",
      "description": "Short description...",
      "techStack": ["React", "Node.js"],
      "url": "https://yourdomain.com/projects/project-slug",
      "github": "https://github.com/...",
      "status": "production"
    }
  ]
}
```

---

## SEO 检查清单

### 技术 SEO
- [ ] 所有页面可被搜索引擎爬取
- [ ] 正确的 HTTP 状态码
- [ ] 规范化 URL (canonical tags)
- [ ] 移动友好测试通过
- [ ] 页面速度 < 3 秒

### 内容 SEO
- [ ] 每个页面唯一的 title 和 description
- [ ] 标题标签层级正确 (H1 > H2 > H3)
- [ ] 图片 alt 文本
- [ ] 内部链接结构
- [ ] 外部链接质量

### 结构化数据
- [ ] Person schema (关于页面)
- [ ] Article schema (博客文章)
- [ ] BreadcrumbList schema (面包屑)
- [ ] WebSite schema
- [ ] 使用 Google 结构化数据测试工具验证

---

## 性能目标

- [ ] Lighthouse 性能分数: 90+
- [ ] First Contentful Paint (FCP): < 1.5s
- [ ] Largest Contentful Paint (LCP): < 2.5s
- [ ] Cumulative Layout Shift (CLS): < 0.1
- [ ] Time to Interactive (TTI): < 3s

---

## 内容策略

### 博客文章 Frontmatter 模板
```yaml
---
title: "文章标题"
slug: "article-slug"
publishedAt: 2024-01-01
tags: ["标签1", "标签2"]
category: "分类"
description: "文章摘要"
---
```

### 项目 Frontmatter 模板
```yaml
---
name: "项目名称"
slug: "project-slug"
description: "项目描述"
techStack: ["技术1", "技术2"]
status: "production" | "beta" | "archived"
github: "https://github.com/..."
url: "https://project-url.com"
---
```

---

## 成功标准

- [ ] Google 搜索品牌名出现在第一页
- [ ] Lighthouse 所有分数 > 90
- [ ] API 端点可被 AI Agent 正确解析
- [ ] RSS 订阅正常工作
- [ ] 移动设备完美显示
- [ ] 无障碍性 (WCAG AA 标准)

---

## 时间估算

- Phase 1: 1 天
- Phase 2: 2-3 天
- Phase 3: 2 天
- Phase 4: 1 天
- Phase 5: 1-2 天
- Phase 6: 1 天

**总计**: 约 8-10 天（人工）/ 约 2-3 小时（AI 辅助）

---

## 开放问题

1. 是否需要后台管理界面？（使用 Markdown + Git 可能更简单）
2. 是否需要评论功能？
3. 是否需要多语言支持？
4. 是否需要搜索功能？
5. 域名是否已准备好？

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
| 1 | Architecture | 添加错误处理层 | P1 (Completeness) | 无错误处理策略是关键缺口 | N/A |
| 2 | Architecture | Next.js 全栈方案 | P1 + P5 | 最完整的 SEO 和 Agent 支持 | Astro, WordPress |
| 3 | Code Quality | 添加类型定义 + Zod 验证 | P1 + P5 | 类型安全防止运行时错误 | N/A |
| 4 | Testing | 添加 Phase 7（测试阶段） | P1 (Completeness) | 0% 测试覆盖率是不可接受的 | N/A |
| 5 | Testing | Jest + RTL + Playwright | P5 (Explicit) | 行业标准，明确选择 | Vitest, Cypress |
| 6 | Performance | 添加缓存策略 | P3 (Pragmatic) | 简单缓存显著提升性能 | N/A |
