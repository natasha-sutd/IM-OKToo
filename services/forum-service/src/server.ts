import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import postsRouter from '../src/routes/posts.js'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'forum-service' });
});

// Use your posts/forum routes
app.use('/posts', postsRouter);

app.listen(PORT, () => {
  console.log(`Forum service running on port ${PORT}`);
});