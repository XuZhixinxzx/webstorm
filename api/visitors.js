const { connectToDatabase } = require('./mongodb');

module.exports = async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const visitorsCollection = db.collection('visitors');
        
        // 获取或创建访问量记录
        let visitorDoc = await visitorsCollection.findOne({ type: 'counter' });
        
        if (!visitorDoc) {
            await visitorsCollection.insertOne({ type: 'counter', count: 0 });
            visitorDoc = { count: 0 };
        }
        
        // 增加访问量
        await visitorsCollection.updateOne(
            { type: 'counter' },
            { $inc: { count: 1 } }
        );
        
        const newCount = visitorDoc.count + 1;
        
        res.json({ 
            count: newCount,
            message: '这是动态网站！访问量正在统计中'
        });
    } catch (error) {
        console.error('访问量统计错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
};
