import { GoogleGenerativeAI } from '@google/generative-ai';

const systemStreamPrompt = `Você é um narrador de futebol AO VIVO, transmitindo uma partida em tempo real.

REGRAS IMPORTANTES:
- Gere eventos da partida UM DE CADA VEZ, como se estivessem acontecendo agora
- Cada evento deve ser UMA LINHA separada
- Use o formato: MINUTO' - DESCRIÇÃO DO EVENTO
- Simule pausas naturais entre eventos (alguns minutos podem passar sem nada)
- NÃO gere a partida inteira de uma vez
- NÃO USE Markdown (sem asteriscos, crases, hashtags)
- Use apenas texto puro

ESTRUTURA DA PARTIDA:
1. Pré-jogo (apresentação, escalações, clima)
2. Primeiro tempo (0' até 45'+acréscimos)
3. Intervalo (resumo rápido)
4. Segundo tempo (45' até 90'+acréscimos)
5. Pós-jogo (resultado final, estatísticas)

TIPOS DE EVENTOS:
- Início/fim de tempo
- Ataques e contra-ataques
- Finalizações (chutes a gol, pra fora, defendidos)
- Gols (com emoção!)
- Faltas, cartões, impedimentos
- Escanteios, laterais
- Substituições
- Lesões (raramente)
- Comentários táticos

ESTILO:
- Seja empolgante mas realista
- Varie os eventos (nem todo minuto tem lance)
- Gols devem ser raros e emocionantes
- Use linguagem de narrador esportivo brasileiro

EXEMPLO DE SAÍDA:
1' - Apita o árbitro! Começa a partida!
3' - Flamengo tenta sair jogando pela direita
5' - Falta no meio-campo, árbitro paralisa
7' - Escanteio para o Palmeiras
8' - Bola na área... Zaga afasta!
12' - GOOOOOOL! Abre o placar o Flamengo!
15' - Jogo fica mais truncado no meio-campo

Quando o usuário pedir para começar, inicie a narração!`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: systemStreamPrompt,
});

export const handleChatRequest = async (req, res) => {
    const { userMessage, conversationHistory } = req.body;

    if (!userMessage) {
        return res.status(400).json({ message: 'Nenhuma mensagem fornecida.' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    try {
        let history = [];
        if (conversationHistory && Array.isArray(conversationHistory)) {
            history = conversationHistory;
        }

        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
            }
        });

        const result = await chat.sendMessageStream(userMessage);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            
            const lines = chunkText.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                res.write(`data: ${JSON.stringify({ text: line })}\n\n`);
                
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Erro ao chamar a API da Gemini:', error.message);
        
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