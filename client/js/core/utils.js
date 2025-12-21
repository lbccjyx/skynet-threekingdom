import { UI } from '../ui/elements.js';

export function log(msg) {
    const p = document.createElement('div');
    p.className = 'log-entry';
    p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (UI.log) {
        UI.log.appendChild(p);
        UI.log.scrollTop = UI.log.scrollHeight;
    }
    console.log(msg);
}

export function PopFloat(text, color = 'yellow') {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes floatUp {
            0% { opacity:0; transform:translate(-50%, 0); }
            10% { opacity:1; transform:translate(-50%, -20px); }
            90% { opacity:1; transform:translate(-50%, -30px); }
            100% { opacity:0; transform:translate(-50%, -90px); }
        }
    `;
    document.head.appendChild(style);
    
    const div = document.createElement('div');
    div.textContent = text;
    div.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%);
        color: ${color};
        font-size: 20px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        z-index: 9999;
        animation: floatUp 0.5s ease-out forwards;
        pointer-events: none;
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1000);
}

