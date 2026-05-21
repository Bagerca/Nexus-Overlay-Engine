const sysBus = new BroadcastChannel('vkplay_sysbus');

function listenEvent(callback) {
    sysBus.onmessage = (e) => callback(e.data);
    window.addEventListener('localBus', (e) => callback(e.detail));
}

export function initPlayerUI() {
    console.log("🎨 Виджет ПЛЕЕРА готов (Визуальный режим с поддержкой очереди)");
    const container = document.getElementById('widget-container');
    const idleView = document.getElementById('player-idle');
    const progressBar = document.getElementById('yt-progress-bar');

    let visualPlayer = null;

    // Функция создания визуального плеера
    function createVisualPlayer() {
        visualPlayer = new YT.Player('visual-yt-player', {
            playerVars: { 'autoplay': 1, 'controls': 0, 'disablekb': 1, 'mute': 1 }, // Строго без звука!
            events: {
                'onReady': () => { 
                    if (visualPlayer.mute) visualPlayer.mute(); 
                }
            }
        });
    }

    // Подгружаем API YouTube безопасно
    if (window.YT && window.YT.Player) {
        createVisualPlayer();
    } else {
        const oldOnReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (oldOnReady) oldOnReady();
            createVisualPlayer();
        };
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
    }

    // Слушаем сигналы от Ядра
    listenEvent((data) => {
        if (data.type === 'UI_PLAY') {
            idleView.style.display = 'none';
            container.classList.remove('hidden');
            container.classList.add('is-playing');
            progressBar.style.width = '0%';
            
            // Грузим новую картинку для следующего трека
            if (visualPlayer && visualPlayer.loadVideoById && data.videoId) {
                visualPlayer.loadVideoById(data.videoId);
                visualPlayer.mute(); 
            }
        } 
        else if (data.type === 'UI_STOP') {
            container.classList.add('hidden');
            container.classList.remove('is-playing');
            idleView.style.display = 'flex';
            if (visualPlayer && visualPlayer.stopVideo) visualPlayer.stopVideo();
        }
        else if (data.type === 'UI_PROGRESS') {
            progressBar.style.width = `${data.percent}%`;
        }
    });
}