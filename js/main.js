// main.js

import { initParticles } from './modules/particles.js';
import { initChatUI } from './modules/chat.js';
import { initPlayerUI } from './modules/player.js'; 
import { initGameUI } from './modules/game.js';
import { initCore } from './modules/core.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const widgetMode = urlParams.get('widget');

    console.log(`Старт системы. Режим: ${widgetMode ? widgetMode : 'ОБЩИЙ (Все сразу)'}`);

    try {
        if (!widgetMode) {
            // Режим разработки в браузере (запускаем всё, чтобы видеть дизайн)
            initCore();
            initParticles();
            initChatUI();
            initPlayerUI();
            initGameUI();
        } else {
            // Режим OBS (Запускаем строго то, что указано в ссылке)
            
            if (widgetMode === 'core') {
                initCore();
                return; // Ядру больше ничего не нужно
            }
            
            if (widgetMode === 'chat') initChatUI();
            if (widgetMode === 'player') initPlayerUI();
            if (widgetMode === 'gameinfo') initGameUI();
            if (widgetMode === 'bg') initParticles();
        }
    } catch (error) {
        console.error("Критическая ошибка при запуске виджетов:", error);
    }
});