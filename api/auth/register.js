const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { connectToDatabase } = require('../mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

module.exports = async (req, res) => {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
        return res.status(400).json({ error: '所有字段都是必填的' });
    }
    
    try {
        const { db } = await connectToDatabase();
        const usersCollection = db.collection('users');
        
        // 检查用户是否已存在
        const existingUser = await usersCollection.findOne({
            $or: [{ username }, { email }]
        });
        
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ error: '用户名已存在' });
            }
            return res.status(400).json({ error: '邮箱已被注册' });
        }
        
        // 加密密码
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        // 创建用户
        const user = {
            id: uuidv4(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        await usersCollection.insertOne(user);
        
        // 生成 token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            message: '注册成功',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '注册失败' });
    }
};
