import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import OpenAI from 'openai';

const SOUNDTRACKS = {
  action: ['/assets/soundtrack/lutarpeloquemeu.mp3', '/assets/soundtrack/aplace4myhead.wav'],
  drama: ['/assets/soundtrack/unlimitedsky.mp3', '/assets/soundtrack/shecouldnt.mp3'],
  suspense: ['/assets/soundtrack/umbomlugar.mp3'],
  neutral: ['/assets/soundtrack/wii.mp3', '/assets/soundtrack/ariamath.mp3']
};

const IMAGE_KEYWORDS = {
  action: ['battle between soccer players', 'brazil stadium', 'brazil favela', 'urban warfare'],
  drama: ['dark alley', 'rainy street', 'crying'],
  suspense: ['rainy soccer pitch', 'empty school hallway', 'empty office'],
  neutral: ['soccer pitch', 'soccer training center']
};

const MAX_TTS_LENGTH = 4500;

function detectContext(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('gol') || lower.includes('vitória') || 
      lower.includes('campeão') || lower.includes('venceu')) {
    return 'neutral';
  }
  
  if (lower.includes('tiro') || lower.includes('correu') || 
      lower.includes('perseguição') || lower.includes('briga') ||
      lower.includes('luta') || lower.includes('fogo')) {
    return 'action';
  }
  
  if (lower.includes('silêncio') || lower.includes('espera') ||
      lower.includes('tenso') || lower.includes('medo') ||
      lower.includes('escuro')) {
    return 'suspense';
  }
  
  if (lower.includes('chorou') || lower.includes('morte') ||
      lower.includes('perdeu') || lower.includes('tristeza') ||
      lower.includes('dor')) {
    return 'drama';
  }
  
  return 'neutral';
}

function selectSoundtrack(context) {
  const tracks = SOUNDTRACKS[context] || SOUNDTRACKS.neutral;
  return tracks[Math.floor(Math.random() * tracks.length)];
}

function selectImageKeyword(context) {
  const keywords = IMAGE_KEYWORDS[context] || IMAGE_KEYWORDS.neutral;
  return keywords[Math.floor(Math.random() * keywords.length)];
}

function estimateDuration(text) {
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 2.5);
}

function splitTextIntoParts(text, maxLength = MAX_TTS_LENGTH) {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxLength) {
      parts.push(remainingText.trim());
      break;
    }

    let splitIndex = remainingText.lastIndexOf('. ', maxLength);
    
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = remainingText.lastIndexOf('\n', maxLength);
    }
    
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = remainingText.lastIndexOf(', ', maxLength);
    }
    
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = remainingText.lastIndexOf(' ', maxLength);
    }
    
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    const part = remainingText.substring(0, splitIndex + 1).trim();
    parts.push(part);
    
    remainingText = remainingText.substring(splitIndex + 1).trim();
  }

  return parts;
}

async function getContextualImage(context) {
  try {
    const keyword = selectImageKeyword(context);
    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!UNSPLASH_ACCESS_KEY) {
      console.warn('Unsplash API key não configurada');
      return null;
    }
    
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      console.error('Erro ao buscar imagem do Unsplash:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    return {
      url: data.urls.regular,
      blur: data.urls.small,
      photographer: data.user.name,
      photographerUrl: data.user.links.html,
      downloadLocation: data.links.download_location
    };
  } catch (error) {
    console.error('Erro ao buscar imagem contextual:', error);
    return null;
  }
}

async function generateEpisodeTitle(message) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenAI API Key não configurada, usando título genérico');
      return 'Novo Capítulo';
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em criar títulos dramáticos e impactantes para episódios de séries. Crie um título curto (máximo 6 palavras) e cinematográfico que resuma a essência da cena descrita. Use português brasileiro. Seja dramático, criativo e impactante.'
        },
        {
          role: 'user',
          content: `Crie um título cinematográfico para este momento da história:\n\n${message.substring(0, 500)}`
        }
      ],
      temperature: 0.8,
      max_tokens: 50
    });

    const title = response.choices[0]?.message?.content?.trim() || 'Novo Capítulo';
    return title.replace(/['"]/g, '');
  } catch (error) {
    console.error('Erro ao gerar título do episódio:', error);
    return 'Novo Capítulo';
  }
}

export const generateElevenLabsAudio = async (req, res) => {
  try {
    const { message, partIndex = 0, episodeNumber = 1 } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const textParts = splitTextIntoParts(message);
    const currentPart = textParts[partIndex];
    
    const context = detectContext(message);
    const soundtrack = selectSoundtrack(context);
    
    const contextImage = partIndex === 0 ? await getContextualImage(context) : null;
    
    const episodeTitle = partIndex === 0 ? await generateEpisodeTitle(message) : null;
    
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    
    const VOICE_ID = 'Zk0wRqIFBWGMu2lIk7hw';
    
    console.log(`Gerando áudio - Parte ${partIndex + 1} de ${textParts.length}...`);
    
    const audio = await elevenlabs.textToSpeech.convert(
      VOICE_ID,
      {
        text: currentPart,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.6,
          use_speaker_boost: true
        }
      }
    );
    
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    const audioBase64 = audioBuffer.toString('base64');
    
    console.log('Áudio gerado com sucesso!');
    
    return res.json({
      success: true,
      audioBase64,
      soundtrack,
      context,
      duration: estimateDuration(currentPart),
      contextImage,
      episodeTitle,
      episodeNumber,
      currentPart: partIndex,
      totalParts: textParts.length,
      hasMoreParts: partIndex < textParts.length - 1,
      currentText: currentPart,
      fullText: message
    });
    
  } catch (error) {
    console.error('Erro ElevenLabs:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Verifique se a API key do ElevenLabs está configurada corretamente'
    });
  }
};

export const generateCinematicAudio = async (req, res) => {
  try {
    const { message, partIndex = 0, episodeNumber = 1, voiceId = 'pt-BR-Wavenet-B' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const textParts = splitTextIntoParts(message);
    const currentPart = textParts[partIndex];
    
    const context = detectContext(message);
    const soundtrack = selectSoundtrack(context);
    
    const contextImage = partIndex === 0 ? await getContextualImage(context) : null;
    
    const episodeTitle = partIndex === 0 ? await generateEpisodeTitle(message) : null;
    
    console.log(`Gerando áudio Google TTS - Parte ${partIndex + 1} de ${textParts.length}...`);
    
    const ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_TTS_API_KEY
      },
      body: JSON.stringify({
        input: { text: currentPart },
        voice: {
          languageCode: 'pt-BR',
          name: voiceId,
          ssmlGender: 'MALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: -2.0,
          speakingRate: 0.9
        }
      })
    });
    
    const ttsData = await ttsResponse.json();
    
    if (!ttsData.audioContent) {
      throw new Error('Falha ao gerar áudio');
    }
    
    return res.json({
      success: true,
      audioBase64: ttsData.audioContent,
      soundtrack,
      context,
      duration: estimateDuration(currentPart),
      contextImage,
      episodeTitle,
      episodeNumber,
      currentPart: partIndex,
      totalParts: textParts.length,
      hasMoreParts: partIndex < textParts.length - 1,
      currentText: currentPart,
      fullText: message
    });
    
  } catch (error) {
    console.error('Erro ao gerar áudio cinemático:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar áudio cinemático',
      details: error.message 
    });
  }
};