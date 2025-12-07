import { UI } from './elements.js';
import { Game } from './state.js';
import { log } from './utils.js';

export function setupLogin(onSuccess) {
    UI.btn.login.addEventListener('click', async () => {
        const username = UI.inputs.username.value;
        const password = UI.inputs.password.value;
        
        if (!username || !password) {
            UI.msg.login.textContent = "请输入账号和密码";
            return;
        }
        
        UI.msg.login.textContent = "登录中...";
        
        try {
            const apiBase = `http://${window.location.hostname}:8001`; 
            
            const response = await fetch(`${apiBase}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
            });
            
            const res = await response.json();
            
            if (res.error) {
                UI.msg.login.textContent = "登录失败: " + res.error;
            } else {
                Game.token = res.token;
                Game.wsUrl = res.ws_url;
                log("登录成功, Token: " + Game.token);
                if (onSuccess) onSuccess();
            }
        } catch (e) {
            UI.msg.login.textContent = "请求错误: " + e.message;
            console.error(e);
        }
    });
}

