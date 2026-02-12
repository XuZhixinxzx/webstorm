// 共享内存数据库
// 注意：Serverless 环境下内存数据不会持久化
// 生产环境请使用 MongoDB Atlas、PostgreSQL 等

module.exports = {
    users: [],
    visitors: { count: 0 },
    messages: []
};
