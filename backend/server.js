import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pageRoutes from './routes/pages.routes.js';
import aiRouter from './routes/ai.routes.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Configuração das Rotas
app.use(pageRoutes);
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
    console.log(`✅  Server is running in http://localhost:${PORT}`);
});

export default app;