# 腾讯云 CloudBase 部署指南

## 步骤 1: 安装 CLI 工具

```bash
npm install -g @cloudbase/cli
```

## 步骤 2: 登录腾讯云

```bash
tcb login
```

## 步骤 3: 初始化项目

在腾讯云控制台创建环境：
1. 访问 https://console.cloud.tencent.com/tcb
2. 点击「创建环境」
3. 选择「香港」节点（无需 ICP 备案）
4. 记住环境 ID

## 步骤 4: 配置项目

编辑 `cloudbaserc.json`：

```json
{
  "envId": "你的环境ID",
  "framework": {
    "name": "my-dynamic-site"
  },
  "region": "ap-hongkong"
}
```

## 步骤 5: 部署

```bash
tcb deploy
```

## 步骤 6: 访问网站

部署成功后，腾讯云会提供一个访问地址，格式如：
```
https://your-env-id.tcb.cloud.tcb.qcloud.la
```

## 免费额度

- 静态托管：1GB
- 云函数：100万次调用/月
- 数据库：2GB

## 功能说明

### 已配置的功能：
- ✅ 用户注册/登录（使用 CloudBase 认证）
- ✅ 留言板
- ✅ 访问量统计

### 注意事项：
- 密码存储时已加密
- 使用 CloudBase 内置数据库
- 无需额外配置 MongoDB
