let avatarCache = {};
const sysBus = new BroadcastChannel('vkplay_sysbus');

// Универсальный приемник сигналов
function listenEvent(callback) {
    sysBus.onmessage = (e) => callback(e.data);
    window.addEventListener('localBus', (e) => callback(e.detail));
}

export function initChatUI() {
    console.log("🎨 Виджет ЧАТА готов");
    const container = document.getElementById('chat-messages');

    const savedAvatars = localStorage.getItem('uso_avatars');
    if (savedAvatars) {
        try { avatarCache = JSON.parse(savedAvatars); } catch (e) { avatarCache = {}; }
    }

    setTimeout(() => {
        addMessage(container, 'Nightbot', 'Чат и система команд синхронизированы с Ядром!', {}, { userColor: '#00AAFF' });
    }, 1500);

    // Слушаем сигналы Ядра
    listenEvent(async (data) => {
        if (data.type === 'CHAT_MSG') {
            await addMessage(container, data.user, data.message, data.flags, data.extra);
        }
        
        const chatInfo = document.getElementById('chat-music-info');
        if (!chatInfo) return; 

        if (data.type === 'UI_PLAY') {
            document.getElementById('requester-name').innerText = data.user;
            chatInfo.classList.remove('hidden');
            const avImg = document.getElementById('music-req-avatar');
            avImg.src = `https://ui-avatars.com/api/?name=${data.user}&background=00AAFF&color=fff&size=64&bold=true`;
            fetch(`https://api.ivr.fi/v2/twitch/user?login=${data.user}`)
                .then(res => res.json())
                .then(apiData => { if (apiData && apiData[0].logo) avImg.src = apiData[0].logo; }).catch(() => {});
        } 
        else if (data.type === 'UI_STOP') {
            chatInfo.classList.add('hidden');
        } 
        else if (data.type === 'UI_VOL') {
            const volLabel = document.getElementById('volume-level');
            const visualBar = document.getElementById('vol-bar-visual');
            if (volLabel) {
                volLabel.innerText = data.vol;
                volLabel.classList.remove('animate-pop');
                void volLabel.offsetWidth; 
                volLabel.classList.add('animate-pop');
            }
            if (visualBar) visualBar.style.width = `${data.vol}%`;
        }
    });
}

// ==========================================
// ФУНКЦИИ РЕНДЕРИНГА СООБЩЕНИЙ
// ==========================================

async function addMessage(container, user, message, flags, extra) {
    const userColor = extra.userColor || 'var(--accent-blue)'; 
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    let parsedMessage = parseEmotes(message, extra.messageEmotes);
    parsedMessage = filterForbiddenWords(parsedMessage);

    const avatarUrl = await getAvatar(user, userColor);

    let replyHTML = '';
    const userState = extra.userState || {};

    // Логика ответов (Reply) в Twitch
    if (userState['reply-parent-display-name']) {
        const replyUser = userState['reply-parent-display-name'];
        let replyTextRaw = (userState['reply-parent-msg-body'] || '').replace(/\s/g, ' '); 
        replyTextRaw = replyTextRaw.replace(/^@[a-zA-Z0-9_]+\s*,?\s*/i, '');

        let cleanReplyText = filterForbiddenWords(escapeHTML(replyTextRaw)); 

        replyHTML = `
            <div class="chat-reply">
                <div class="chat-reply-user">
                    <svg class="reply-icon" viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
                    ${replyUser}
                </div>
                <div class="chat-reply-text">${cleanReplyText}</div>
            </div>
        `;
        const mentionRegex = new RegExp(`^@${replyUser}\\s*,?\\s*`, 'i');
        parsedMessage = parsedMessage.replace(mentionRegex, '');
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    msgDiv.style.borderLeft = `4px solid ${userColor}`; 
    
    msgDiv.innerHTML = `
        ${replyHTML}
        <div class="chat-header">
            <img src="${avatarUrl}" class="chat-avatar" alt="avatar">
            <span class="chat-user" style="color: ${userColor}">${user}</span>
            <span class="chat-time">${time}</span>
        </div>
        <div class="chat-text">${parsedMessage}</div>
    `;
    
    container.appendChild(msgDiv);

    // Удаление старых сообщений (Лимит из config.js)
    const maxMessages = window.AppConfig?.maxChatMessages || 15;
    const activeMessages = Array.from(container.children).filter(el => !el.classList.contains('chat-out'));

    if (activeMessages.length > maxMessages) {
        const oldestMsg = activeMessages[0];
        oldestMsg.classList.add('chat-out');
        setTimeout(() => { if (oldestMsg.parentNode) oldestMsg.remove(); }, 300); 
    }
}

async function getAvatar(username, userColor) {
    if (avatarCache[username]) return avatarCache[username];
    try {
        const response = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${username}`);
        const data = await response.json();
        if (data && data.length > 0 && data[0].logo) {
            avatarCache[username] = data[0].logo; 
            localStorage.setItem('uso_avatars', JSON.stringify(avatarCache));
            return data[0].logo;
        }
        throw new Error("Нет аватарки");
    } catch (e) {
        let hexColor = (userColor || '#888888').replace('#', '').replace('var(--accent-blue)', '00AAFF');
        return `https://ui-avatars.com/api/?name=${username}&background=${hexColor}&color=fff&size=64&bold=true`;
    }
}

function parseEmotes(message, emotes) {
    if (!emotes) return escapeHTML(message);
    let stringArr = message.split('');
    for (let id in emotes) {
        let emotePositions = emotes[id];
        for (let i = 0; i < emotePositions.length; i++) {
            let pos = emotePositions[i].split('-');
            let start = parseInt(pos[0]); let end = parseInt(pos[1]);
            stringArr[start] = `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0" class="chat-emote">`;
            for (let j = start + 1; j <= end; j++) stringArr[j] = ''; 
        }
    }
    let finalStr = '';
    for (let i = 0; i < stringArr.length; i++) {
        if (stringArr[i].startsWith('<img')) finalStr += stringArr[i];
        else finalStr += escapeHTML(stringArr[i]);
    }
    return finalStr;
}

function filterForbiddenWords(htmlString) {
    const words = window.AppConfig?.forbiddenWords || [];
    if (words.length === 0) return htmlString;
    let result = htmlString;
    words.forEach(word => {
        const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?![^<]*>)(${safeWord})`, 'gi');
        result = result.replace(regex, `<span class="blurred-word">ДАННЫЕ УДАЛЕНЫ</span>`);
    });
    return result;
}

function escapeHTML(str) { 
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
}