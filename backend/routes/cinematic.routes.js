import express from 'express';
import { generateCinematicAudio, generateElevenLabsAudio } from '../controllers/cinematic.controller.js';

const cinematicRouter = express.Router();

cinematicRouter.post('/cinematic', generateCinematicAudio);

cinematicRouter.post('/cinematic/elevenlabs', generateElevenLabsAudio);

export default cinematicRouter;