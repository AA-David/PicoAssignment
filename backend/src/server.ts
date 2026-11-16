import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import usersRouter from './routes/user.route.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { startMqtt } from './mqtt/mqtt.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = Number(process.env.PORT) || 8000;

// Render runs behind one reverse proxy
app.set('trust proxy', 1);

app.use(helmet());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(
    cors({
        origin: ['http://localhost:5173', process.env.FRONTEND_URL].filter(
            Boolean,
        ) as string[],
        credentials: true,
    }),
);

app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.use(express.json({ limit: '1mb' }));

app.use('/api', usersRouter);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
    await connectDB();

    startMqtt();

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('Server started at', PORT);
    });

    // Render's proxy keeps idle connections open for 60s; Node's default (5s) would close them first and cause intermittent 502s
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;

    process.on('SIGTERM', () => server.close(() => process.exit(0)));
};

start().catch((e) => {
    console.error('Failed to start:', e);
    process.exit(1);
});
