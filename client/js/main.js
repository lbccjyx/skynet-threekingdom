import { setupLogin } from './ui/auth.js';
import { startGame } from './game/game.js';

// Initialize Login Logic
// When login is successful, startGame will be called
setupLogin(startGame);

// Toggle Log Panel
const btnToggleLog = document.getElementById('btn-toggle-log');
const logContent = document.getElementById('log-content');
const logPanel = document.querySelector('.log-panel');

if (btnToggleLog) {
    btnToggleLog.addEventListener('click', () => {
        if (logContent.style.display === 'none') {
            logContent.style.display = 'block';
            logPanel.style.height = '200px';
            btnToggleLog.textContent = '-';
        } else {
            logContent.style.display = 'none';
            logPanel.style.height = 'auto'; // Shrink to header only
            btnToggleLog.textContent = '+';
        }
    });
}
