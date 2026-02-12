const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('../mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

module.exports = async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码都是必填的' });
    }
    
    try {
        const { db } = await connectToDatabase();
        const usersCollection = db.collection('users');
        
        // 查找用户
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: '用户不存在' });
        }
        
        // 验证密码
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (hash !== user.password) {
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
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败' });
    }
};
