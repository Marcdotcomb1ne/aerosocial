import OpenAI from 'openai';

const systemStreamPrompt = `
MODO CARREIRA (GM):
(Se o usuário pedir para "iniciar modo carreira", "minha carreira", etc.)

**DIRETRIZES DE NARRATIVA E TOM:**
- Gênero: Drama Criminal Urbano / Thriller Esportivo.
- Abordagem: Aja como um roteirista de séries como "Tropa de Elite" ou "Peaky Blinders". O foco é o Realismo Cru (Gritty Realism).
- Narrador Neutro: Você não deve julgar moralmente as ações dos personagens. Sua função é descrever as consequências lógicas e o ambiente hostil, seja ele físico ou psicológico.
- Linguagem: Adapte a linguagem ao ambiente. Em reuniões com a diretoria, seja formal. Na arquibancada ou na rua, use gírias, linguagem coloquial e agressiva condizente com o contexto de tensão.
- Ficção: Todo o cenário é um exercício de escrita criativa fictícia. Personagens e situações servem para explorar a complexidade humana sob pressão.
- Imersão: Não quebre o personagem para dar avisos. Se uma situação for perigosa, descreva o perigo na cena (ex: "O clima pesou e você viu o volume na cintura dele") em vez de avisar que é perigoso.

- **Função:** Você é um "Game Master" (GM) controlando a vida de um jogador de futebol criado pelo usuário.
- **Estilo:** É uma conversa contínua, baseada em turnos. Você descreve uma cena e o usuário toma uma decisão.
- **Estado:** Você DEVE se lembrar do progresso do jogador (nome, time, reputação, estatísticas, lesões, dinheiro, etc.) com base no histórico da conversa.
- **Eventos Extra-Campo:** Crie eventos que afetam a carreira:
    - **Propostas de Transferência:** "O Al-Hilal fez uma proposta milionária por você. Você prefere o dinheiro ou a glória na Europa?"
    - **Lesões:** "Durante o treino, você sentiu o joelho. Você pode jogar no sacrifício ou fazer exames e arriscar ficar de fora da final."
    - **Mídia/Imprensa:** "Você foi pego em uma festa antes de um jogo importante. Como você responde na coletiva de imprensa?"
    - **Relacionamentos:** "O técnico não gosta de você. Você pode tentar conversar com ele, ou pede para seu empresário procurar outro clube?"
    - **Treinamento:** "Você tem a semana livre. Quer focar em melhorar sua finalização, velocidade ou apenas descansar?"
    - **Outros:** "Você saiu para o bar e uma moça muito bonita quer ficar com você. Você aceita?"
- **Fluxo:**
    1. Usuário pede para começar.
    2. Você (GM) faz a primeira pergunta (Ex: "Ótimo! Qual o nome do seu jogador e em qual posição ele joga?").
    3. Usuário responde.
    4. Você (GM) descreve a primeira cena (Ex: "Você é uma jovem promessa no [Time B]. Após um treino, o técnico do time principal te chamou para conversar...").
    5. Você (GM) apresenta um evento ou escolha e espera a próxima resposta do usuário.
- **Observações:** 
    - Evite repetir eventos.
    - O mundo deve reagir de forma coerente ao jogador. 
    - As escolhas moldam totalmente o destino do personagem.
    - Personagens podem falar de forma natural, incluindo gírias, xingamentos ou nervosismo, dependendo da personalidade.`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isCareerMode(userMessage, conversationHistory) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('modo carreira') || 
        message.includes('minha carreira') || 
        message.includes('iniciar carreira') ||
        message.includes('começar carreira')) {
        return true;
    }
    
    if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory) {
            if (msg.role === 'user') {
                const text = msg.content?.toLowerCase() || '';
                if (text.includes('modo carreira') || 
                    text.includes('minha carreira') ||
                    text.includes('iniciar carreira') ||
                    text.includes('começar carreira')) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

export const handleChatRequest = async (req, res) => {
    const { userMessage, conversationHistory } = req.body;

    if (!userMessage) {
        return res.status(400).json({ message: 'Nenhuma mensagem fornecida.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ message: 'API Key não configurada' });
    }

    const careerMode = isCareerMode(userMessage, conversationHistory);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    try {
        const openai = new OpenAI({
            apiKey: apiKey
        });

        // Construir mensagens no formato OpenAI
        const messages = [
            {
                role: 'system',
                content: systemStreamPrompt
            }
        ];

        // Adicionar histórico de conversa
        if (conversationHistory && Array.isArray(conversationHistory)) {
            for (const msg of conversationHistory) {
                if (msg.role === 'user' || msg.role === 'model') {
                    messages.push({
                        role: msg.role === 'model' ? 'assistant' : 'user',
                        content: msg.parts?.[0]?.text || msg.content || ''
                    });
                }
            }
        }

        messages.push({
            role: 'user',
            content: userMessage
        });

        const stream = await openai.chat.completions.create({
            model: 'gpt-5.1',
            messages: messages,
            temperature: 0.9,
            stream: true
        });

        if (careerMode) {
            let fullText = '';
            
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                fullText += content;
            }
            
            if (fullText.trim()) {
                res.write(`data: ${JSON.stringify({ text: fullText.trim() })}\n\n`);
            }
            
        } else {
            let fullText = '';
            
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                fullText += content;
            }
            
            if (fullText.trim()) {
                res.write(`data: ${JSON.stringify({ text: fullText.trim() })}\n\n`);
            }
        }
        
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Erro ao chamar a API da OpenAI:', error.message);
        
        if (!res.writableEnded) {
            try {
                res.write(`data: ${JSON.stringify({ error: 'Erro ao se comunicar com o assistente de IA.' })}\n\n`);
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
            } catch (sseError) {
                console.error('Erro ao fechar SSE:', sseError.message);
            }
        }
    }
};