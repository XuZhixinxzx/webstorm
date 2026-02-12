// API 基础地址
// 本地开发时为空，部署到 Cloudflare Workers 时填入 Workers 域名
const API_BASE = '';

// 获取当前时间
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    document.getElementById('current-time').textContent = timeString;
}

// 获取服务器状态
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        document.getElementById('server-status').textContent = data.message;
        document.getElementById('server-status').className = 'success';
    } catch (error) {
        document.getElementById('server-status').textContent = '服务器连接失败';
        document.getElementById('server-status').className = 'error';
    }
}

// 获取访问量
async function fetchVisitorCount() {
    try {
        const response = await fetch(`${API_BASE}/api/visitors`);
        const data = await response.json();
        document.getElementById('visitor-count').textContent = data.count;
    } catch (error) {
        document.getElementById('visitor-count').textContent = '获取失败';
    }
}

// 显示消息
function showMessage() {
    const messages = [
        '🎉 你好！欢迎访问这个动态网站！',
        '🚀 动态功能已启用！',
        '✨ 这是一个动态网站！',
        '🌟 Node.js 驱动的网站！',
        '🔐 你可以注册账号了！',
        '📝 试试留言功能吧！'
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    document.getElementById('message').textContent = randomMessage;
}

// 显示登录表单
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
}

// 显示注册表单
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
}

// 注册
async function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            updateUI(true);
            showMessage('🎉 注册成功！欢迎 ' + data.user.username);
        } else {
            document.getElementById('register-error').textContent = data.error;
        }
    } catch (error) {
        document.getElementById('register-error').textContent = '注册失败，请稍后重试';
    }
}

// 登录
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            updateUI(true);
            showMessage('👋 欢迎回来，' + data.user.username + '！');
        } else {
            document.getElementById('login-error').textContent = data.error;
        }
    } catch (error) {
        document.getElementById('login-error').textContent = '登录失败，请稍后重试';
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateUI(false);
    showMessage('👋 已退出登录');
}

// 更新 UI 状态
function updateUI(isLoggedIn) {
    const userInfo = document.getElementById('user-info');
    const authForms = document.getElementById('auth-forms');
    const messageBoard = document.getElementById('message-board');
    
    if (isLoggedIn) {
        userInfo.style.display = 'block';
        authForms.style.display = 'none';
        messageBoard.style.display = 'block';
        document.getElementById('username-display').textContent = localStorage.getItem('username') || '用户';
    } else {
        userInfo.style.display = 'none';
        authForms.style.display = 'block';
        messageBoard.style.display = 'none';
    }
}

// 获取留言列表
async function fetchMessages() {
    try {
        const response = await fetch(`${API_BASE}/api/messages`);
        const data = await response.json();
        
        const messagesList = document.getElementById('messages-list');
        if (data.messages.length === 0) {
            messagesList.innerHTML = '<p>暂无留言</p>';
        } else {
            messagesList.innerHTML = data.messages.map(m => `
                <div class="message-item">
                    <strong>${m.username}</strong>: ${m.content}
                </div>
            `).join('');
        }
        
        messageBoard.style.display = 'block';
    } catch (error) {
        showMessage('获取留言失败');
    }
}

// 提交留言
async function submitMessage() {
    const token = localStorage.getItem('token');
    const content = document.getElementById('new-message').value;
    
    if (!token) {
        showMessage('请先登录后再留言');
        return;
    }
    
    if (!content.trim()) {
        showMessage('请输入留言内容');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('new-message').value = '';
            showMessage('✅ 留言已提交！');
            fetchMessages();
        } else {
            showMessage(data.error || '提交失败');
        }
    } catch (error) {
        showMessage('提交失败，请稍后重试');
    }
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    checkServerStatus();
    fetchVisitorCount();
    
    // 检查登录状态
    const token = localStorage.getItem('token');
    updateUI(!!token);
    
    // 每秒更新时间
    setInterval(updateTime, 1000);
    
    // 每30秒刷新访问量
    setInterval(fetchVisitorCount, 30000);
});
