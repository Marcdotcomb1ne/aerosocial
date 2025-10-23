const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

let conversationHistory = [];

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    displayMessage(userMessage, 'user');

    messageInput.value = '';

    const loadingMessage = displayMessage('digitando...', 'loading');

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userMessage: userMessage,
                conversationHistory: conversationHistory
            })
        });

        if (!response.ok) {
            throw new Error('Erro na resposta do servidor.');
        }

        const data = await response.json();
        const aiResponse = data.response;

        chatWindow.removeChild(loadingMessage);

        displayMessage(aiResponse, 'bot');

        conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
        conversationHistory.push({ role: 'model', parts: [{ text: aiResponse }] });

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        chatWindow.removeChild(loadingMessage);
        displayMessage('Desculpe, não consegui me conectar. Tente novamente.', 'bot');
    }
});

function displayMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);

    let safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const formattedMessage = safeMessage.replace(/\*(.*?)\*/g, '<span class="action">$1</span>');

    messageElement.innerHTML = formattedMessage;

    chatWindow.appendChild(messageElement);

    chatWindow.scrollTop = chatWindow.scrollHeight;

    return messageElement; 
}

displayMessage('Hm...', 'bot');

conversationHistory.push({
    role: 'model',
    parts: [{ text: 'Hm...' }]
});