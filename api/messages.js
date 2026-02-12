const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { connectToDatabase } = require('./mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 验证 token 的辅助函数
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

// GET /api/messages - 获取所有留言
// POST /api/messages - 提交留言（需要登录）
module.exports = async (req, res) => {
    const method = req.method.toUpperCase();
    
    try {
        const { db } = await connectToDatabase();
        const messagesCollection = db.collection('messages');
        
        if (method === 'GET') {
            // 获取所有留言，按时间倒序
            const messages = await messagesCollection
                .find()
                .sort({ createdAt: -1 })
                .limit(100)
                .toArray();
            
            return res.json({ messages });
        }
        
        if (method === 'POST') {
            // 提交留言，需要登录
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({ error: '需要登录' });
            }
            
            const user = verifyToken(token);
            if (!user) {
                return res.status(403).json({ error: 'Token 无效' });
            }
            
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
            
            return res.json({ success: true, message: '留言已提交' });
        }
        
        res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('留言板错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
};
