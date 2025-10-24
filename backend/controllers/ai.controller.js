import fetch from 'node-fetch';

const systemStreamPrompt = `Você é um narrador de futebol AO VIVO, transmitindo uma partida em tempo real.

REGRAS IMPORTANTES:
- Gere eventos da partida UM DE CADA VEZ, como se estivessem acontecendo agora
- Cada evento deve ser UMA LINHA separada
- Use o formato: MINUTO' - DESCRIÇÃO DO EVENTO
- Simule pausas naturais entre eventos (alguns minutos podem passar sem nada)
- NÃO gere a partida inteira de uma vez
- NÃO USE Markdown (sem asteriscos, crases, hashtags)
- Use apenas texto puro
- SEMPRE vá até o fim da partida. Não pare a mensagem

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
- Gols devem ser emocionantes
- A quantidade de gols deve seguir as da vida real, a variar pela reputação dos times, mas zebras (resultados inesperados) podem acontecer
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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const handleChatRequest = async (req, res) => {
    const { userMessage, conversationHistory } = req.body;

    if (!userMessage) {
        return res.status(400).json({ message: 'Nenhuma mensagem fornecida.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ message: 'API Key não configurada' });
    }

    // Configurar SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    try {
        const contents = [
            {
                role: 'user',
                parts: [{ text: systemStreamPrompt }]
            },
            {
                role: 'model',
                parts: [{ text: 'Entendido! Estou pronto para narrar partidas de futebol ao vivo.' }]
            }
        ];

        if (conversationHistory && Array.isArray(conversationHistory)) {
            const validHistory = conversationHistory.filter((item, index) => {
                if (index < 2) return false;
                return item.role === 'user' || item.role === 'model';
            });
            contents.push(...validHistory);
        }

        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:streamGenerateContent?key=${apiKey}&alt=sse`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        
        let buffer = '';
        for await (const chunk of response.body) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    try {
                        const parsed = JSON.parse(data);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        
                        if (text) {
                            const eventLines = text.split('\n').filter(l => l.trim());
                            
                            for (const eventLine of eventLines) {
                                res.write(`data: ${JSON.stringify({ text: eventLine })}\n\n`);
                                
                                await delay(2000); 
                            }
                        }
                    } catch (e) {
                    }
                }
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