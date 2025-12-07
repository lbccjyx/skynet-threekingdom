import { UI } from './elements.js';

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

