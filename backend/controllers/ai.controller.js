import axios from 'axios';

const systemPrompt = ``;

export const handleChatRequest = async (req, res) => {
    const { userMessage, conversationHistory } = req.body;

    if (!userMessage) {
        return res.status(400).json({ message: 'Nenhuma mensagem fornecida.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const apiEndpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent';

    const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Hm...' }] },
        ...(conversationHistory || []),
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    try {
        const response = await axios.post(`${apiEndpoint}?key=${apiKey}`, {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
            }
        });

        const aiResponse = response.data.candidates[0].content.parts[0].text;
        
        res.status(200).json({ response: aiResponse });

    } catch (error) {
        console.error('Erro ao chamar a API da Gemini:', error.response?.data || error.message);
        res.status(500).json({ message: 'Erro ao se comunicar com o assistente de IA.' });
    }
};