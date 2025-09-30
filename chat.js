const chatEl = document.getElementById('chat');
const formEl = document.getElementById('form');
const inputEl = document.getElementById('input');
const clearBtn = document.getElementById('clearBtn');
const STORE_KEY = 'mini_chat_messages_v1';

const AI_ENABLED_KEY = 'mini_chat_ai_enabled';
const API_KEY_KEY = 'mini_chat_api_key';
const API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL_NAME = 'gpt-4o-mini';

function getApiKey() {
    return localStorage.getItem(API_KEY_KEY) || '';
}
function setApiKey(k){
    localStorage.setItem(API_KEY_KEY, k.trim());
}

function isAIEnabled(){
    return localStorage.getItem(AI_ENABLED_KEY) === '1';
}
function setAiEnabled(on){
    localStorage.setItem(AI_ENABLED_KEY, on ? '1' : '0');
    document.getElementById(toggleAiBtn)
    .textContent = 'AI: ' + (on ? 'On' : 'Off');
}

function save_messages(list){
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

function loadMessages(){
    try{
        return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    } catch {
        return[];
    }
}
let messages = loadMessages();
function fmtTime(ts){
    const d = new Date(ts);
    return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}
function escapeHtml(str){
    return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function renderMsg(msg){
    const div = document.createElement('div');
    div.className = `msg ${msg.role}`;
    div.innerHTML = `<div class="text">${escapeHtml(msg.text)}</div>
    <div class="meta">${msg.role === 'user'? 'you' : 'bot'} @ ${fmtTime(msg.time)}</div>`;
    chatEl.appendChild(div);
}
function renderAll(list){
    chatEl.innerHTML = '';
    list.forEach(renderMsg);
    scrollToBottom();
}
function scrollToBottom(){
    chatEl.scrollTop = chatEl.scrollHeight;
}

renderAll(messages);

function showTyping(){
    const div = document.createElement('div');
    div.className = 'msg typing';
    div.dataset.typing = '1';
    div.innerHTML = `<div class="text"><span class="dots"></span></div>
    <div class="meta">Bot is typing...</div>`;
    chatEl.appendChild(div);
    scrollToBottom();
}
function hideTyping(){
    const node = chatEl.querySelector('.msg.typing[data-typing="1"]');
    if (node) node.remove();
}
function addUserMessage(text){
    const msg = { role: 'user', text, time: Date.now() };
    messages.push(msg);
    save_messages(messages);
    renderMsg(msg);
    scrollToBottom();
}
function addBotMessage(text){
    const msg = { role: 'bot', text, time: Date.now() };
    messages.push(msg);
    save_messages(messages);
    renderMsg(msg);
    scrollToBottom();
}
function simulateBotReply(userText){
    showTyping();
    setTimeout(()=>{
        hideTyping();
        const reply = generateReply(userText);
        addBotMessage(reply);
    }, 600 + Math.random()*600);
}
function generateReply(t){
    const s = t.toLowerCase();
    if(/(hi|hello)/.test(s)) return 'Hi, What can I help you with';
    if(/weather/.test(s)) return 'I am a simple bot. I can only talk a little and save the message';
    if(/time/.test(s)) return 'Now it is '+ new Date().toLocaleTimeString();
    const templates = [
        'Interesting! You wrote "{q}". Can you tell more?',
        'Understood: "{q}". Wanna add something more?',
        'Oke, got it: "{q}".'
    ];
    const pick = templates[Math.floor(Math.random() * templates.length)];
    return pick.replace('{q}', t);
    
}
formEl.addEventListener('submit', (e)=>{
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    addUserMessage(text);
    inputEl.value = '';
    simulateBotReply(text);
});
inputEl.addEventListener('keydown', (e) =>{
    if (e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        formEl.requestSubmit();
    }
});
clearBtn.addEventListener('click', () => {
    if (confirm('Clear the chat history?')){
        messages = [];
        save_messages(messages);
        chatEl.innerHTML = '';
    }
});