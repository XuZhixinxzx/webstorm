// Vercel API 入口文件
// 处理所有 /api/* 请求

const { connectToDatabase } = require('./mongodb');

// 辅助函数：SHA256 哈希
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 辅助函数：生成 UUID
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 健康检查
async function handleHealth(req, res) {
  res.json({ status: 'ok', message: 'API 运行正常' });
}

// 访客统计
async function handleVisitors(req, res) {
  try {
    const { db } = await connectToDatabase();
    const visitorsCollection = db.collection('visitors');
    
    let visitorDoc = await visitorsCollection.findOne({ type: 'counter' });
    if (!visitorDoc) {
      await visitorsCollection.insertOne({ type: 'counter', count: 0 });
      visitorDoc = { count: 0 };
    }
    
    await visitorsCollection.updateOne(
      { type: 'counter' },
      { $inc: { count: 1 } }
    );
    
    const newCount = visitorDoc.count + 1;
    res.json({ count: newCount, message: '这是动态网站！访问量正在统计中' });
  } catch (error) {
    console.error('访问量统计错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 注册
async function handleRegister(req, res) {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: '所有字段都是必填的' });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username ? '用户名已存在' : '邮箱已被注册' 
      });
    }

    const hashedPassword = await sha256(password);
    const user = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    await usersCollection.insertOne(user);

    // 简化 JWT（仅用于演示，生产环境使用 jsonwebtoken）
    const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 604800 }));
    const signature = await sha256(`${header}.${payload}.${JWT_SECRET}`);
    const token = `${header}.${payload}.${signature}`;

    res.status(201).json({
      success: true,
      message: '注册成功',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 登录
async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码都是必填的' });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }

    const hash = await sha256(password);
    if (hash !== user.password) {
      return res.status(400).json({ error: '密码错误' });
    }

    // 简化 JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 604800 }));
    const signature = await sha256(`${header}.${payload}.${JWT_SECRET}`);
    const token = `${header}.${payload}.${signature}`;

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 留言板
async function handleMessages(req, res) {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
  
  try {
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('messages');

    if (req.method === 'GET') {
      const messages = await messagesCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      res.json({ messages });
      return;
    }

    if (req.method === 'POST') {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: '需要登录' });
      }

      // 验证 JWT
      try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token');
        const [encodedHeader, encodedPayload, signature] = parts;
        const expectedSignature = await sha256(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);
        if (signature !== expectedSignature) throw new Error('Invalid signature');
        const user = JSON.parse(atob(encodedPayload));
        
        const { content } = req.body;
        if (!content || !content.trim()) {
          return res.status(400).json({ error: '留言内容不能为空' });
        }

        const message = {
          id: uuidv4(),
          userId: user.id,
          username: user.username,
          content: content.trim(),
          createdAt: new Date().toISOString()
        };

        await messagesCollection.insertOne(message);
        res.status(201).json({ success: true, message: '留言已提交' });
      } catch (e) {
        res.status(403).json({ error: 'Token 无效' });
      }
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('留言板错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 主处理函数
module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname;

  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // 路由分发
  try {
    if (path === '/api/health') {
      await handleHealth(req, res);
    } else if (path === '/api/visitors' && req.method === 'GET') {
      await handleVisitors(req, res);
    } else if (path === '/api/auth/register' && req.method === 'POST') {
      await handleRegister(req, res);
    } else if (path === '/api/auth/login' && req.method === 'POST') {
      await handleLogin(req, res);
    } else if (path === '/api/messages') {
      await handleMessages(req, res);
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
