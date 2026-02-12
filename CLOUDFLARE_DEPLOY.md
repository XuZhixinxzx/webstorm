# Cloudflare 部署指南

## 已创建的文件

1. **[`wrangler.toml`](wrangler.toml)** - Workers 配置
2. **[`worker.js`](worker.js)** - Workers API（完整 JWT + MongoDB）
3. **[`.github/workflows/cloudflare-workers.yml`](.github/workflows/cloudflare-workers.yml)** - Workers 自动部署
4. **[`.github/workflows/cloudflare-pages.yml`](.github/workflows/cloudflare-pages.yml)** - Pages 自动部署

## GitHub Secrets 配置

在仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | `kiBL4OT6Sn_k80SUdpofHGFmQ7jwwqKDjhfKVcge` |
| `CLOUDFLARE_ACCOUNT_ID` | `e7b2a2e769c87990bea3fb2730834107` |
| `MONGODB_URI` | MongoDB Atlas 连接字符串 |
| `JWT_SECRET` | 随机字符串（如 `abc123xyz`） |

## 部署步骤

### 1. 配置 Secrets
将上述表格中的值添加到 GitHub Secrets。

### 2. 推送代码到 GitHub
```bash
git add .
git commit -m "Add Cloudflare deployment"
git push
```

### 3. GitHub Actions 自动部署
- Workers 会部署到：`https://my-website-api.<用户名>.workers.dev`
- Pages 需要手动创建项目

### 4. 手动创建 Pages 项目（可选）
1. 访问 https://pages.cloudflare.com
2. 点击 **Create a project**
3. 连接 GitHub 仓库
4. 配置：
   - Build command: `npm run build`
   - Build output directory: `dist`

## API 域名
Workers 部署后，API 地址为：
```
https://my-website-api.<你的用户名>.workers.dev/api/...
```

例如：`https://my-website-api.yourusername.workers.dev/api/health`

## 前端配置
部署 Workers 后，在 [`script.js`](script.js:2) 中设置：

```javascript
const API_BASE = 'https://my-website-api.yourusername.workers.dev';
```

然后提交代码自动部署。
