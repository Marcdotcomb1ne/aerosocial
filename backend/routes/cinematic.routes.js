import express from 'express';
import { generateCinematicAudio, generateElevenLabsAudio } from '../controllers/cinematic.controller.js';

const cinematicRouter = express.Router();

cinematicRouter.post('/cinematic/elevenlabs', generateElevenLabsAudio);

cinematicRouter.post('/cinematic', generateCinematicAudio);

export default cinematicRouter;