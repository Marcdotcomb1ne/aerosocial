import express from 'express';
import { handleChatRequest } from '../controllers/ai.controller.js';

const aiRouter = express.Router();

aiRouter.post('/chat', handleChatRequest);

export default aiRouter;