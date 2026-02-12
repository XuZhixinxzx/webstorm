/**
 * Cloudflare Workers API
 * 替代 Node.js/Express 后端
 */

import { MongoClient } from 'mongodb';

// 环境变量
const MONGODB_URI = MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = DB_NAME || 'my-dynamic-site';
const JWT_SECRET = JWT_SECRET || 'your-jwt-secret';

// 全局 MongoDB 连接缓存
let cachedClient = null;
let cachedDb = null;

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

// 辅助函数：JWT 签名（简化版）
async function createJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = await sha256(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// 辅助函数：验证 JWT
async function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = await sha256(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);
    if (signature !== expectedSignature) return null;
    return JSON.parse(atob(encodedPayload));
  } catch (e) {
    return null;
  }
}

// 连接 MongoDB
async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    const db = client.db(DB_NAME);
    cachedClient = client;
    cachedDb = db;
    return { client, db };
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    throw error;
  }
}

// JSON 响应
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// API 路由处理
async function handleApi(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 处理 OPTIONS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 解析请求体
    let body = null;
    if (method === 'POST') {
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse({ error: '无效的 JSON 请求体' }, 400);
      }
    }

    // 路由分发
    if (path === '/api/health') {
      return jsonResponse({ status: 'ok', message: 'API 运行正常' }, 200, corsHeaders);

    } else if (path === '/api/visitors' && method === 'GET') {
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
      return jsonResponse({ count: newCount, message: '这是动态网站！访问量正在统计中' }, 200, corsHeaders);

    } else if (path === '/api/auth/register' && method === 'POST') {
      const { username, password, email } = body || {};
      if (!username || !password || !email) {
        return jsonResponse({ error: '所有字段都是必填的' }, 400);
      }

      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      const existingUser = await usersCollection.findOne({
        $or: [{ username }, { email }]
      });

      if (existingUser) {
        return jsonResponse({ error: existingUser.username === username ? '用户名已存在' : '邮箱已被注册' }, 400);
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

      const token = await createJWT({ id: user.id, username: user.username });
      return jsonResponse({
        success: true,
        message: '注册成功',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      }, 201, corsHeaders);

    } else if (path === '/api/auth/login' && method === 'POST') {
      const { username, password } = body || {};
      if (!username || !password) {
        return jsonResponse({ error: '用户名和密码都是必填的' }, 400);
      }

      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      const user = await usersCollection.findOne({ username });
      if (!user) {
        return jsonResponse({ error: '用户不存在' }, 400);
      }

      const hash = await sha256(password);
      if (hash !== user.password) {
        return jsonResponse({ error: '密码错误' }, 400);
      }

      const token = await createJWT({ id: user.id, username: user.username });
      return jsonResponse({
        success: true,
        message: '登录成功',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      }, 200, corsHeaders);

    } else if (path === '/api/messages') {
      const { db } = await connectToDatabase();
      const messagesCollection = db.collection('messages');

      if (method === 'GET') {
        const messages = await messagesCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray();
        return jsonResponse({ messages }, 200, corsHeaders);

      } else if (method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
          return jsonResponse({ error: '需要登录' }, 401);
        }

        const user = await verifyJWT(token);
        if (!user) {
          return jsonResponse({ error: 'Token 无效' }, 403);
        }

        const { content } = body || {};
        if (!content || !content.trim()) {
          return jsonResponse({ error: '留言内容不能为空' }, 400);
        }

        const message = {
          id: uuidv4(),
          userId: user.id,
          username: user.username,
          content: content.trim(),
          createdAt: new Date().toISOString()
        };

        await messagesCollection.insertOne(message);
        return jsonResponse({ success: true, message: '留言已提交' }, 201, corsHeaders);
      }

    }

    // 404
    return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);

  } catch (error) {
    console.error('API 错误:', error);
    return jsonResponse({ error: '服务器错误' }, 500, corsHeaders);
  }
}

// Worker 主入口
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 只处理 /api/ 开头的请求
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request);
    }

    // 其他请求返回 404
    return new Response('Not Found', { status: 404 });
  }
};
