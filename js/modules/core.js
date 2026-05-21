const sysBus = new BroadcastChannel('vkplay_sysbus');

// Универсальная отправка
function emitEvent(data) {
    sysBus.postMessage(data); 
    window.dispatchEvent(new CustomEvent('localBus', { detail: data }));
}

// Отправка системного сообщения в локальный виджет чата
function sendSystemMessage(text) {
    emitEvent({ 
        type: 'CHAT_MSG', 
        user: 'Система', 
        message: text, 
        flags: {}, 
        extra: { userColor: '#FFC800' }
    });
}

export function initCore() {
    console.log("🧠 ЯДРО ЗАПУЩЕНО: Слушаю Twitch, управляю Очередью и Плейлистами");
    
    let ytPlayer = null;
    let progressInterval = null;
    
    // --- ПЕРЕМЕННЫЕ ОЧЕРЕДИ ---
    let trackQueue = [];
    let currentItem = null; // Текущий элемент (может быть video или playlist)
    let currentVisualId = null; // ID видео, которое сейчас показывается на экране

    // Логика переключения элементов НАШЕЙ очереди (выбрасывает текущий плейлист/видео)
    function playNextTrack() {
        currentVisualId = null; 
        
        if (trackQueue.length > 0) {
            currentItem = trackQueue.shift();
            
            if (currentItem.type === 'playlist') {
                ytPlayer.loadPlaylist({ list: currentItem.id });
            } else {
                ytPlayer.loadVideoById(currentItem.id);
            }
        } else {
            currentItem = null;
            if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
            emitEvent({ type: 'UI_STOP' });
        }
    }

    // --- ИНИЦИАЛИЗАЦИЯ YOUTUBE ---
    const oldOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
        if (oldOnReady) oldOnReady();
        ytPlayer = new YT.Player('yt-player', {
            playerVars: { 'autoplay': 1, 'controls': 0, 'disablekb': 1 },
            events: {
                'onReady': () => {
                    ytPlayer.unMute();
                    ytPlayer.setVolume(window.AppConfig.defaultVolume || 20);
                },
                'onStateChange': (e) => {
                    if (e.data === 1) { // 1 = ИГРАЕТ
                        
                        // Получаем реальный ID видео, которое играет прямо сейчас
                        let actualVidId = ytPlayer.getVideoData().video_id;
                        
                        // Если ID изменился (например, плейлист переключил трек), синхронизируем картинку
                        if (actualVidId !== currentVisualId && currentItem) {
                            currentVisualId = actualVidId;
                            emitEvent({ type: 'UI_PLAY', user: currentItem.user, videoId: actualVidId });
                        }

                        if (progressInterval) clearInterval(progressInterval);
                        progressInterval = setInterval(() => {
                            let percent = (ytPlayer.getCurrentTime() / ytPlayer.getDuration()) * 100;
                            emitEvent({ type: 'UI_PROGRESS', percent: percent });
                        }, 500);

                    } else if (e.data === 0) { // 0 = ЗАКОНЧИЛОСЬ
                        
                        // Если это плейлист, проверяем, не последний ли это трек в нём
                        if (currentItem && currentItem.type === 'playlist') {
                            let playlistArray = ytPlayer.getPlaylist();
                            let currentIndex = ytPlayer.getPlaylistIndex();
                            
                            // Если плейлист кончился — запускаем следующий элемент из нашей очереди
                            if (!playlistArray || currentIndex === playlistArray.length - 1) {
                                playNextTrack();
                            }
                        } else {
                            // Если это обычное видео — просто включаем следующее из очереди
                            playNextTrack();
                        }
                    }
                },
                'onError': (e) => {
                    sendSystemMessage("⚠️ Ошибка: видео недоступно или скрыто. Пропускаю...");
                    
                    // Если ошибка внутри плейлиста, YouTube сам скипнет. 
                    // Если это обычное видео — скипаем мы.
                    if (!currentItem || currentItem.type !== 'playlist') {
                        playNextTrack(); 
                    }
                }
            }
        });
    };

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    // --- ПОДКЛЮЧЕНИЕ К TWITCH ---
    if (window.AppConfig && window.AppConfig.channelName) {
        ComfyJS.Init(window.AppConfig.channelName);
    }

    ComfyJS.onChat = (user, message, flags, self, extra) => {
        emitEvent({ type: 'CHAT_MSG', user, message, flags, extra });
    };

    ComfyJS.onCommand = (user, command, message, flags, extra) => {
        if (flags.broadcaster || flags.mod) {
            
            if (command === "sr") {
                const ytData = extractYouTubeData(message);
                
                if (ytData && ytPlayer) {
                    trackQueue.push({ type: ytData.type, id: ytData.id, user: user });
                    
                    if (!currentItem) {
                        playNextTrack();
                    } else {
                        let typeText = ytData.type === 'playlist' ? 'Плейлист добавлен' : 'Трек добавлен';
                        sendSystemMessage(`✅ ${typeText} в очередь! Позиция: ${trackQueue.length}`);
                    }
                }
            }
            
            // ПРОПУСК ТРЕКА ИЛИ ПЛЕЙЛИСТА
            if (command === "skip") {
                // Если попросили пропустить вообще весь плейлист целиком
                if (message.trim().toLowerCase() === "all") {
                    sendSystemMessage("⏭️ Плейлист полностью пропущен.");
                    playNextTrack();
                    return;
                }

                // Логика пропуска одного трека
                if (currentItem && currentItem.type === 'playlist') {
                    let playlistArray = ytPlayer.getPlaylist();
                    let currentIndex = ytPlayer.getPlaylistIndex();
                    
                    // Если мы НЕ на последнем треке плейлиста - переключаем внутри плейлиста
                    if (playlistArray && currentIndex < playlistArray.length - 1) {
                        sendSystemMessage("⏭️ Трек в плейлисте пропущен.");
                        ytPlayer.nextVideo();
                    } else {
                        // Если это был последний трек в плейлисте - переходим к следующему элементу очереди
                        sendSystemMessage("⏭️ Плейлист закончился.");
                        playNextTrack();
                    }
                } else {
                    // Если это обычное одиночное видео
                    sendSystemMessage("⏭️ Трек пропущен.");
                    playNextTrack();
                }
            }

            if (command === "clear" || (command === "sr" && message === "clear")) {
                trackQueue = []; 
                currentItem = null;
                currentVisualId = null;
                if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
                emitEvent({ type: 'UI_STOP' });
                sendSystemMessage("🛑 Очередь очищена, плеер остановлен.");
            }
            
            if (command === "vol") {
                let safeVol = Math.max(0, Math.min(100, parseInt(message) || 20));
                if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(safeVol);
                emitEvent({ type: 'UI_VOL', vol: safeVol });
            }
            
            if (command === "game" || command === "mode") {
                emitEvent({ type: 'GAME_CMD', command: command, message: message });
            }
        }
    };
}

function extractYouTubeData(input) {
    if (!input) return false;
    let str = input.trim();
    
    const listMatch = str.match(/[?&]list=([^#&?]+)/);
    if (listMatch) return { type: 'playlist', id: listMatch[1] };
    
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return { type: 'video', id: str };
    const vidMatch = str.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
    if (vidMatch && vidMatch[7].length === 11) return { type: 'video', id: vidMatch[7] };
    
    return false;
}