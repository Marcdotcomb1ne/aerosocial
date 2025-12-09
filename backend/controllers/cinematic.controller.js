import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const SOUNDTRACKS = {
  action: [
    'https://cdn.pixabay.com/audio/2022/03/10/audio_d1718372d8.mp3',
    'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3'
  ],
  drama: [
    'https://cdn.pixabay.com/audio/2022/03/10/audio_2b49c7935b.mp3',
    'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3'
  ],
  suspense: [
    'https://cdn.pixabay.com/audio/2022/03/24/audio_c8c6e5d2ff.mp3',
    'https://cdn.pixabay.com/audio/2021/12/13/audio_0ac3e0524a.mp3'
  ],
  neutral: [
    'https://cdn.pixabay.com/audio/2022/01/18/audio_7a6b1028dc.mp3'
  ]
};

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

function estimateDuration(text) {
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 2.5);
}

export const generateElevenLabsAudio = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const context = detectContext(message);
    const soundtrack = selectSoundtrack(context);
    
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    
    const VOICE_ID = 'Zk0wRqIFBWGMu2lIk7hw';
    
    console.log('🎙️ Gerando áudio com ElevenLabs SDK...');
    
    const audio = await elevenlabs.textToSpeech.convert(
      VOICE_ID,
      {
        text: message,
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
    
    console.log('✅ Áudio gerado com sucesso!');
    
    return res.json({
      success: true,
      audioBase64,
      soundtrack,
      context,
      duration: estimateDuration(message)
    });
    
  } catch (error) {
    console.error('❌ Erro ElevenLabs:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Verifique se a API key do ElevenLabs está configurada corretamente'
    });
  }
};

export const generateCinematicAudio = async (req, res) => {
  try {
    const { message, voiceId = 'pt-BR-Wavenet-B' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const context = detectContext(message);
    const soundtrack = selectSoundtrack(context);
    
    const ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_TTS_API_KEY
      },
      body: JSON.stringify({
        input: { text: message },
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
      duration: estimateDuration(message)
    });
    
  } catch (error) {
    console.error('Erro ao gerar áudio cinemático:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar áudio cinemático',
      details: error.message 
    });
  }
};