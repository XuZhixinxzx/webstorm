# 动态网站项目

一个使用 Node.js + Express + MongoDB 构建的动态网站，支持用户认证和留言板功能。

## 功能特点

- 🔐 用户注册和登录
- 📝 留言板系统
- 📊 访问量统计
- 🚀 Vercel Serverless 部署

## 技术栈

- 前端: HTML + CSS + JavaScript
- 后端: Node.js + Express
- 数据库: MongoDB Atlas
- 部署: Vercel

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 MongoDB

#### 本地开发

确保本地安装了 MongoDB，然后创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=my-dynamic-site
JWT_SECRET=your-secret-key
```

#### MongoDB Atlas（生产环境）

1. 注册并登录 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 创建免费集群
3. 创建数据库用户
4. 设置网络访问白名单（0.0.0.0/0 允许所有IP）
5. 获取连接字符串，格式如下：
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
   ```

### 3. 本地运行

```bash
npm run dev
```

访问 http://localhost:3000

## Vercel 部署

### 1. 推送代码到 GitHub

### 2. 在 Vercel 导入项目

访问 https://vercel.com 并导入你的 GitHub 仓库

### 3. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 值 |
|--------|-----|
| `MONGODB_URI` | MongoDB Atlas 连接字符串 |
| `DB_NAME` | 数据库名称 |
| `JWT_SECRET` | JWT 密钥（使用随机字符串） |

### 4. 部署

Vercel 会自动部署。每次推送到 main 分支都会自动部署。

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 服务器状态检查 |
| `/api/visitors` | GET | 获取访问量 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/messages` | GET | 获取留言列表 |
| `/api/messages` | POST | 提交留言（需登录） |

## 项目结构

```
├── api/                    # API 路由
│   ├── auth/              # 认证相关
│   │   ├── login.js       # 登录接口
│   │   └── register.js    # 注册接口
│   ├── messages.js        # 留言板接口
│   ├── visitors.js        # 访问量统计
│   ├── health.js          # 健康检查
│   └── mongodb.js         # MongoDB 连接
├── index.html             # 前端页面
├── script.js              # 前端逻辑
├── styles.css             # 样式文件
├── server.js              # 本地开发服务器
├── package.json           # 项目配置
└── vercel.json            # Vercel 配置
```

## 注意事项

- 生产环境务必使用复杂的 JWT 密钥
- MongoDB Atlas 连接字符串包含密码，请勿泄露
- 定期备份数据库
