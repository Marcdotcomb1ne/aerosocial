import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageRouter = express.Router();

pageRouter.get('/', (req, res) => {
    console.log(`\n^-^ Rota / acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

pageRouter.post('/verify-password', (req, res) => {
    const { password } = req.body;
    
    if (password === process.env.SENHA) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

export default pageRouter;

