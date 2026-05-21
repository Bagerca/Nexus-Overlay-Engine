const GamesDB = {
    "sub": { title: "Subnautica", dev: "Unknown Worlds", year: "2018", genre: "Выживание", rating: "8.7", platform: "PC", coverVert: "assets/covers/subnautica-vert.png", coverHoriz: "assets/covers/subnautica-horiz.png", mode: "vertical" },
    "val": { title: "Valorant", dev: "Riot Games", year: "2020", genre: "Шутер", rating: "8.5", platform: "PC", coverVert: "assets/covers/valorant-vert.webp", coverHoriz: "assets/covers/valorant-horiz.jpg", mode: "vertical" },
    "wuwa": { title: "Wuthering Waves", dev: "Kuro Games", year: "2024", genre: "Action RPG", rating: "8.2", platform: "PC / Mob", coverVert: "assets/covers/wuwa-vert.webp", coverHoriz: "assets/covers/wuwa-horiz.jpg", mode: "horizontal" },
    "reset": { title: "Неизвестно", dev: "Студия", year: "202X", genre: "Ожидание", rating: "0.0", platform: "N/A", coverVert: "assets/covers/default-vert.svg", coverHoriz: "assets/covers/default-horiz.svg", mode: "vertical" }
};

const sysBus = new BroadcastChannel('vkplay_sysbus');

function listenEvent(callback) {
    sysBus.onmessage = (e) => callback(e.data);
    window.addEventListener('localBus', (e) => callback(e.detail));
}

export function initGameUI() {
    console.log("🎨 Виджет ИГРЫ готов");

    listenEvent((data) => {
        if (data.type === 'GAME_CMD') {
            if (data.command === "game") {
                const gameAlias = data.message.trim().toLowerCase();
                if (GamesDB[gameAlias]) updateGamePanel(GamesDB[gameAlias]);
            }
            if (data.command === "mode") {
                const modeArg = data.message.trim().toLowerCase();
                const container = document.getElementById('widget-gameinfo');
                if(!container) return;
                
                if (modeArg === "horiz" || modeArg === "horizontal") container.className = `panel cover-panel mode-horizontal`;
                else if (modeArg === "vert" || modeArg === "vertical") container.className = `panel cover-panel mode-vertical`;
            }
        }
    });
}

function updateGamePanel(gameData) {
    const container = document.getElementById('widget-gameinfo');
    if(!container) return;
    
    container.className = `panel cover-panel mode-${gameData.mode}`;

    document.getElementById('game-cover-vert').src = gameData.coverVert;
    document.getElementById('game-title').innerText = gameData.title;
    document.getElementById('game-rating').innerText = gameData.rating + ' / 10'; 
    document.getElementById('game-year').innerText = gameData.year;
    document.getElementById('game-genre').innerText = gameData.genre;
    document.getElementById('game-dev').innerText = gameData.dev;
    document.getElementById('game-platform').innerText = gameData.platform;

    document.getElementById('game-cover-horiz').src = gameData.coverHoriz;
    document.getElementById('horiz-title').innerText = gameData.title;
}