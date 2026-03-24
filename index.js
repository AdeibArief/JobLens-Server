import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import analyzeRoutes from './routes/analyze.js';

dotenv.config();

const app = express();

// Rate limiter — 20 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api', limiter); // apply to all /api routes

app.use('/api', analyzeRoutes);

app.get('/', (req, res) => res.json({ message: 'JobLens API running' }));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`JobLens server running on port ${PORT}`));