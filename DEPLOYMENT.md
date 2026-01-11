# Cloudflare Pages 部署指南

本文档详细说明如何将 React + Vite + TypeScript 项目部署到 Cloudflare Pages，包括常见问题的排查和解决方案。

---

## 📋 目录

- [项目架构概述](#项目架构概述)
- [部署前准备](#部署前准备)
- [部署方式](#部署方式)
- [方式一：Git 集成自动部署（推荐）](#方式一git-集成自动部署推荐)
- [方式二：Wrangler CLI 手动部署](#方式二wrangler-cli-手动部署)
- [自定义域名配置](#自定义域名配置)
- [常见问题排查](#常见问题排查)
- [性能优化建议](#性能优化建议)

---

## 项目架构概述

**技术栈**：
- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **样式**：Tailwind CSS
- **WebAssembly**：多模块懒加载（core/compress/bgremove）
- **状态管理**：Zustand
- **Canvas 库**：Fabric.js

**部署目标**：
- **平台**：Cloudflare Pages（免费层）
- **托管类型**：静态站点（SPA）
- **自定义域名**：photo.byteslim.com
- **自动部署**：Git push 触发 CI/CD

---

## 部署前准备

### 1. 项目配置文件检查

确保项目包含以下关键配置：

#### `package.json`
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

**⚠️ 重要**：
- ✅ **必须有** `build` 脚本
- ❌ **不需要** `deploy` 脚本（Cloudflare Pages 自动处理）
- ✅ `tsc` 在 `vite build` 前执行，确保类型检查

#### `vite.config.ts`
```typescript
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 懒加载 WASM 模块
          if (id.includes('workers/')) {
            return 'workers';
          }
        }
      }
    }
  }
});
```

#### `wrangler.toml`（可选）
```toml
name = "photo-editor"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"
```

### 2. 本地构建测试

在部署前验证构建成功：

```bash
# 安装依赖
npm install

# 类型检查 + 构建
npm run build

# 预览构建产物
npm run preview
```

**验证输出**：
- ✅ `dist/` 目录存在
- ✅ `dist/index.html` 包含正确的资源引用
- ✅ `dist/assets/` 包含 JS/CSS 文件
- ✅ `dist/wasm/` 包含 WASM 文件（如果有）

### 3. 安装 Wrangler CLI（本地部署需要）

```bash
npm install -D wrangler

# 或全局安装
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

---

## 部署方式

Cloudflare Pages 支持两种部署方式：

| 部署方式 | 适用场景 | 优点 | 缺点 |
|---------|---------|------|------|
| **Git 集成** | 生产环境推荐 | 自动 CI/CD、预览部署、回滚 | 需要 GitHub 连接 |
| **Wrangler CLI** | 本地测试、手动发布 | 快速、可控 | 手动触发、无预览 |

---

## 方式一：Git 集成自动部署（推荐）

### 步骤 1：创建 Cloudflare Pages 项目

#### 方式 A：通过 Dashboard

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 选择 GitHub 仓库 `photo-editor`
4. 配置构建设置：

```
Project name: photo-editor
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: (留空)
```

5. 点击 **Save and Deploy**

#### 方式 B：通过 Wrangler CLI

```bash
# 创建 Pages 项目
wrangler pages project create photo-editor --production-branch=main

# 部署当前构建产物
wrangler pages deploy dist --project-name=photo-editor
```

**输出示例**：
```
✨ Deployment complete! Take a peek over at https://76875092.photo-editor-2tz.pages.dev
```

### 步骤 2：连接 GitHub 仓库

1. 在 Cloudflare Dashboard 中，点击项目 → **Settings** → **Git**
2. 点击 **Connect to GitHub**
3. 授权 Cloudflare 访问你的仓库
4. 选择 `photo-editor` 仓库

**自动部署流程**：
```
Git Push → Cloudflare 检测 → npm install → npm run build → 部署 dist/
```

### 步骤 3：配置环境变量（可选）

如果项目需要环境变量：

1. 进入项目 → **Settings** → **Environment variables**
2. 添加变量（如 `VITE_API_URL`）
3. 分别配置 **Production** 和 **Preview** 环境

**注意**：Vite 环境变量必须以 `VITE_` 开头才能在客户端代码中访问。

---

## 方式二：Wrangler CLI 手动部署

适用场景：本地测试、不使用 Git 集成

### 部署命令

```bash
# 基础部署
wrangler pages deploy dist --project-name=photo-editor

# 带 commit 信息
wrangler pages deploy dist \
  --project-name=photo-editor \
  --commit-hash=$(git rev-parse HEAD) \
  --commit-message="Fixed image cropping bug"

# 部署到预览环境
wrangler pages deploy dist \
  --project-name=photo-editor \
  --branch=feature/new-ui
```

### 验证部署

```bash
# 查看部署历史
wrangler pages deployment list --project-name=photo-editor

# 回滚到指定版本
wrangler pages deployment rollback <deployment-id> \
  --project-name=photo-editor
```

---

## 自定义域名配置

### 场景一：添加新域名

1. 进入项目 → **Custom domains** → **Set up a custom domain**
2. 输入域名：`photo.byteslim.com`
3. 点击 **Activate domain**

Cloudflare 自动完成：
- ✅ 添加 DNS 记录（CNAME 指向 Pages）
- ✅ 配置 SSL 证书（Let's Encrypt）
- ✅ 启用 HTTP/3 和 Brotli 压缩

### 场景二：域名冲突排查

**症状**：访问自定义域名显示 "Hello World" 或其他错误内容

**原因**：域名已绑定到 Cloudflare Worker 或其他资源

**解决方案**：

1. **检查 Worker 路由**：
   ```bash
   # 列出所有 Workers（需要 API）
   curl -X GET \
     "https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts" \
     -H "Authorization: Bearer {api_token}"
   ```

2. **检查 DNS 记录**：
   ```bash
   # 查看 photo.byteslim.com 的 DNS 记录
   dig photo.byteslim.com
   ```

3. **移除冲突资源**：
   - 在 Dashboard 中，找到绑定的 Worker
   - 删除或修改 Worker 的自定义域名
   - 重新为 Pages 项目添加域名

### 场景三：子域名 vs 根域名

| 域名类型 | 示例 | Cloudflare Pages 支持 |
|---------|------|---------------------|
| 子域名 | `photo.byteslim.com` | ✅ 支持 |
| 根域名 | `byteslim.com` | ✅ 支持 |
| 路径 | `byteslim.com/photo` | ❌ 不推荐 |

**推荐**：使用专用子域名（如 `photo.byteslim.com`），避免与其他服务冲突。

---

## 常见问题排查

### 问题 1：部署成功，但访问显示 "Hello World"

**症状**：访问自定义域名显示纯文本 "Hello World"

**原因**：域名绑定到错误的 Cloudflare Worker

**解决方案**：
```bash
# 1. 确认 Pages 项目存在
wrangler pages project list | grep photo-editor

# 2. 在 Dashboard 中检查 Worker 路由
# https://dash.cloudflare.com → Workers → Routes

# 3. 移除冲突的 Worker 自定义域名
# 或为 Pages 项目重新添加域名
```

### 问题 2：构建失败：`wrangler: not found`

**错误日志**：
```
Executing user deploy command: npm run deploy
sh: 1: wrangler: not found
Failed: error occurred while running deploy command
```

**原因**：`package.json` 中包含不必要的 `deploy` 脚本

**解决方案**：
```json
// ❌ 错误配置
{
  "scripts": {
    "deploy": "wrangler pages deploy dist"  // 删除此行
  }
}

// ✅ 正确配置
{
  "scripts": {
    "build": "tsc && vite build"
    // Cloudflare Pages 会自动部署，无需 deploy 脚本
  }
}
```

**修复后提交**：
```bash
git add package.json
git commit -m "fix: Remove unnecessary deploy script"
git push
```

### 问题 3：构建超时或内存不足

**症状**：`Build failed: Process killed` 或 `JavaScript heap out of memory`

**原因**：大型项目构建超出限制（Pages CI: 1 CPU, 2GB RAM）

**解决方案**：

1. **优化构建配置** (`vite.config.ts`)：
   ```typescript
   export default defineConfig({
     build: {
       chunkSizeWarningLimit: 1000,
       rollupOptions: {
         output: {
           manualChunks(id) {
             // 拆分大包
             if (id.includes('node_modules')) {
               return 'vendor';
             }
           }
         }
       }
     }
   });
   ```

2. **增加 Node.js 内存** (`package.json`)：
   ```json
   {
     "scripts": {
       "build": "node --max-old-space-size=2048 node_modules/.bin/vite build"
     }
   }
   ```

3. **本地构建后上传**：
   ```bash
   npm run build
   wrangler pages deploy dist --project-name=photo-editor
   ```

### 问题 4：SPA 路由 404

**症状**：刷新页面时 404，首页正常

**原因**：Cloudflare Pages 默认不支持 SPA 路由

**解决方案**：创建 `public/_routes.json`

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/api/*", "/assets/*"]
}
```

或使用 `_redirects` 文件：
```
# SPA routing
/*    /index.html   200
```

### 问题 5：WASM 文件 404 或 MIME 类型错误

**症状**：浏览器控制台显示 `Failed to load WASM module`

**原因**：WASM 文件未正确部署或 MIME 类型错误

**解决方案**：

1. **确认 WASM 文件在构建产物中**：
   ```bash
   ls -la dist/wasm/
   # 应该看到 .wasm 文件
   ```

2. **创建 `_headers` 文件** (`public/_headers`)：
   ```
   /wasm/*
     Content-Type: application/wasm
     Cross-Origin-Embedder-Policy: require-corp
     Cross-Origin-Opener-Policy: same-origin
   ```

3. **检查 Vite 配置**：
   ```typescript
   export default defineConfig({
     build: {
       assetsDir: 'assets',
       rollupOptions: {
         output: {
           assetFileNames: 'assets/[name]-[hash][extname]'
         }
       }
     }
   });
   ```

---

## 性能优化建议

### 1. 启用 Brotli 压缩

Cloudflare Pages 默认启用 Brotli，无需配置。验证：
```bash
curl -I -H "Accept-Encoding: br" https://photo.byteslim.com
# 响应头应包含: content-encoding: br
```

### 2. CDN 缓存策略

在 `public/_headers` 中配置缓存：
```
# 静态资源长期缓存
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/wasm/*
  Cache-Control: public, max-age=31536000, immutable

# HTML 短期缓存
/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

### 3. 预连接到第三方域名

在 `index.html` 中：
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://fonts.gstatic.com">
```

### 4. 懒加载 WASM 模块

```typescript
// ✅ 好的做法：动态导入
const compressWorker = await import('./workers/compressWorker');

// ❌ 避免：静态导入
import compressWorker from './workers/compressWorker';
```

### 5. 监控构建体积

```bash
# 安装 rollup-plugin-visualizer
npm install -D rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({ open: true, gzipSize: true })
  ]
});
```

---

## 部署检查清单

部署前确认：

- [ ] `npm run build` 本地成功
- [ ] `dist/` 目录包含 `index.html`
- [ ] 所有静态资源（CSS/JS/WASM）在 `dist/assets/` 或 `dist/wasm/`
- [ ] `package.json` 中没有 `deploy` 脚本
- [ ] 环境变量已配置（如需要）
- [ ] `_redirects` 或 `_routes.json` 已添加（SPA 项目）
- [ ] Wrangler CLI 已安装并登录（本地部署）

部署后验证：

- [ ] 默认域名可访问（`*.pages.dev`）
- [ ] 自定义域名可访问（如配置）
- [ ] HTTPS 证书有效
- [ ] 浏览器控制台无 404 错误
- [ ] WASM 模块加载成功（检查 Network 标签）
- [ ] 核心功能可用（上传、裁剪、导出）

---

## 相关资源

- [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Vite 部署指南](https://vitejs.dev/guide/build.html)
- [React 部署最佳实践](https://react.dev/learn/deploying-react)

---

## 更新日志

- **2025-01-11**: 初始版本，记录 photo-editor 项目部署过程
- 包含常见问题排查和性能优化建议

---

**文档维护**：如有部署问题，请更新本文档或提交 Issue。
