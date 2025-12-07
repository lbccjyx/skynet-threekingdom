import { setupLogin } from './auth.js';
import { startGame } from './game.js';

// Initialize Login Logic
// When login is successful, startGame will be called
setupLogin(startGame);
