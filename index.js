import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyzeRoutes from './routes/analyze.js';

dotenv.config();
console.log(process.env.GROQ_API_KEY)

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // resumes can be large

app.use('/api', analyzeRoutes);

app.get('/', (req, res) => res.json({ message: 'JobLens API running' }));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`JobLens server running on port ${PORT}`));
