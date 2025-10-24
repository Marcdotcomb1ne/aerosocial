const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

let conversationHistory = [];
let isStreaming = false;

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isStreaming) {
        console.log('Aguarde a resposta anterior terminar...');
        return;
    }

    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    displayMessage(userMessage, 'user');
    messageInput.value = '';

    const loadingMessage = displayMessage('⚽ Preparando transmissão...', 'loading');

    isStreaming = true;

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

        chatWindow.removeChild(loadingMessage);

        const eventContainer = document.createElement('div');
        eventContainer.classList.add('message', 'bot', 'event-stream');
        chatWindow.appendChild(eventContainer);

        let fullResponse = '';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    try {
                        const parsed = JSON.parse(data);

                        if (parsed.done) {
                            isStreaming = false;
                            break;
                        }

                        if (parsed.error) {
                            eventContainer.innerHTML += `<div class="error-event">❌ ${parsed.error}</div>`;
                            break;
                        }

                        if (parsed.text) {
                            fullResponse += parsed.text + '\n';
                            
                            const eventLine = document.createElement('div');
                            eventLine.classList.add('event-line');
                            
                            if (parsed.text.includes('GOL') || parsed.text.includes('GOOOL')) {
                                eventLine.classList.add('goal-event');
                            }
                            
                            eventLine.textContent = parsed.text;
                            eventContainer.appendChild(eventLine);

                            chatWindow.scrollTop = chatWindow.scrollHeight;
                        }

                    } catch (e) {
                        console.error('Erro ao parsear JSON:', e);
                    }
                }
            }
        }

        conversationHistory.push({ 
            role: 'user', 
            parts: [{ text: userMessage }] 
        });
        
        conversationHistory.push({ 
            role: 'model', 
            parts: [{ text: fullResponse.trim() }] 
        });

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        if (loadingMessage && loadingMessage.parentNode) {
            chatWindow.removeChild(loadingMessage);
        }
        displayMessage('❌ Desculpe, não consegui me conectar. Tente novamente.', 'bot');
    } finally {
        isStreaming = false;
    }
});

function displayMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);

    let safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    messageElement.textContent = safeMessage;

    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    return messageElement;
}

// Mensagem inicial
displayMessage('⚽ Olá! Sou seu narrador de futebol ao vivo! Me diga quais times vão jogar e eu começo a transmissão!', 'bot');

conversationHistory.push({
    role: 'model',
    parts: [{ text: '⚽ Olá! Sou seu narrador de futebol ao vivo! Me diga quais times vão jogar e eu começo a transmissão!' }]
});