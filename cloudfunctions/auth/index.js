const cloud = require('tcb-admin-node');
cloud.init({
  env: process.env.TCB_ENV
});

const db = cloud.database();
const _ = db.command;

// 注册
exports.main = async (event, context) => {
  const { action, username, password, email } = event;
  
  if (action === 'register') {
    // 检查用户是否存在
    const userExist = await db.collection('users').where({
      $or: [{ username }, { email }]
    }).get();
    
    if (userExist.data.length > 0) {
      return { error: '用户名或邮箱已存在' };
    }
    
    // 创建用户
    await db.collection('users').add({
      data: {
        username,
        email,
        password, // 实际项目中应加密
        createdAt: new Date()
      }
    });
    
    return { success: true, message: '注册成功' };
  }
  
  if (action === 'login') {
    // 查找用户
    const user = await db.collection('users').where({
      username,
      password
    }).get();
    
    if (user.data.length === 0) {
      return { error: '用户名或密码错误' };
    }
    
    // 生成自定义登录态
    const loginState = await auth.createCustomToken({
      uid: user.data[0]._id
    });
    
    return { 
      success: true, 
      token: loginState.token,
      user: user.data[0]
    };
  }
  
  return { error: '未知操作' };
};
