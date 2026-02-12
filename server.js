const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// 内存数据库（生产环境请使用 MongoDB/PostgreSQL）
const db = {
    users: [],
    visitors: { count: 0 },
    messages: []
};

// JWT 认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '需要登录' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token 无效' });
        }
        req.user = user;
        next();
    });
};

// API 路由

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器运行正常' });
});

// 获取访问量
app.get('/api/visitors', (req, res) => {
    db.visitors.count++;
    res.json({ 
        count: db.visitors.count,
        message: '这是动态网站！访问量正在统计中'
    });
});

// 用户注册
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        if (!username || !password || !email) {
            return res.status(400).json({ error: '所有字段都是必填的' });
        }
        
        // 检查用户是否已存在
        if (db.users.find(u => u.username === username)) {
            return res.status(400).json({ error: '用户名已存在' });
        }
        
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ error: '邮箱已被注册' });
        }
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 创建用户
        const user = {
            id: uuidv4(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        db.users.push(user);
        
        // 生成 token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            message: '注册成功',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: '注册失败' });
    }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码都是必填的' });
        }
        
        // 查找用户
        const user = db.users.find(u => u.username === username);
        if (!user) {
            return res.status(400).json({ error: '用户不存在' });
        }
        
        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: '密码错误' });
        }
        
        // 生成 token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            message: '登录成功',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: '登录失败' });
    }
});

// 获取当前用户信息
app.get('/api/user/me', authenticateToken, (req, res) => {
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
});

// 提交留言（需要登录）
app.post('/api/messages', authenticateToken, (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: '留言内容不能为空' });
    }
    
    const message = {
        id: uuidv4(),
        userId: req.user.id,
        username: req.user.username,
        content,
        createdAt: new Date().toISOString()
    };
    
    db.messages.push(message);
    res.json({ success: true, message: '留言已提交' });
});

// 获取所有留言
app.get('/api/messages', (req, res) => {
    res.json({ messages: db.messages });
});

// 启动服务器（本地开发）
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
        console.log(`📝 动态网站已就绪`);
    });
}

module.exports = app;
