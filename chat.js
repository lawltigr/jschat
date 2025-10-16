const chatEl = document.getElementById('chat');
const formEl = document.getElementById('form');
const inputEl = document.getElementById('input');
const clearBtn = document.getElementById('clearBtn');
const STORE_KEY = 'mini_chat_messages_v1';

const AI_ENABLED_KEY = 'mini_chat_ai_enabled';
const API_KEY_KEY = 'mini_chat_api_key';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// const MODEL_NAME = 'gpt-4o-mini';
// const MODEL_NAME = 'mistralai/mistral-7b-instruct';
const MODEL_NAME = 'meta-llama/llama-3-8b-instruct';
const toggleAiBtn = document.getElementById('toggleAiBtn');
const setupKeyBtn = document.getElementById('setupKeyBtn');

setAiEnabled(isAiEnabled());
toggleAiBtn.addEventListener('click', () =>{
    const on = !isAiEnabled();
    if (on && !getApiKey()){
        const k = prompt('Add API key (it will be saved into localStorage):', '');
        if (!k) return;
        setApiKey(k);
    }
    setAiEnabled(on);
});

setupKeyBtn.addEventListener('click', () => {
    const current = getApiKey();
    const k = prompt('API key (it will be saved into localStorage:', current);
    if (k != null) setApiKey(k);
});

function getApiKey() {
    return localStorage.getItem(API_KEY_KEY) || '';
}
function setApiKey(k){
    localStorage.setItem(API_KEY_KEY, k.trim());
}

function isAiEnabled(){
    return localStorage.getItem(AI_ENABLED_KEY) === '1';
}
function setAiEnabled(on){
    localStorage.setItem(AI_ENABLED_KEY, on ? '1' : '0');
    toggleAiBtn.textContent = 'AI: ' + (on ? 'On' : 'Off');
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
async function simulateBotReply(userText){
    if (!isAiEnabled() || !getApiKey()){
        showTyping();
        setTimeout(()=>{
            hideTyping();
            const reply = generateReply(userText);
            addBotMessage(reply);
        }, 600 + Math.random()*600);
        return;
    }
    showTyping();
    try{
        const ai = await callAiChat(userText);
        hideTyping();
        addBotMessage(ai);
    } catch (err){
        hideTyping();
        addBotMessage('⚠️ AI error: ' + (err.message || 'request failed'));
    }
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

async function callAiChat(userText){
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('No API key');
    const body = {
        model: MODEL_NAME,
        messages: [
            { role: 'system', content: 'You are a helpful conversational assistant. Keep answers brief.'},
            ...lastMessagesAsOpenAI(5),
            { role: 'user', content: userText }
        ],
        temperature: 0.7
    }
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok){
        const text = await res.text().catch(()=>'');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response');
    return content;
}
function lastMessagesAsOpenAI(n){
    const tail = messages.slice(-n);
    return tail.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
    }));
}