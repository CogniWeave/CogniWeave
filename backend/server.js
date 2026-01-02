import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { optimizeWorkflowHandler } from './routes/optimization.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.post('/optimize-workflow', optimizeWorkflowHandler);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Autopattern backend running on http://localhost:${PORT}`);
    console.log(`📡 API endpoint: POST /optimize-workflow`);
});
