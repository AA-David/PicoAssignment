import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import usersRouter from './routes/user.route.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { startMqtt } from './mqtt/mqtt.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(
    cors({
        origin: 'http://localhost:5173',
        credentials: true,
    }),
);

app.use('/api', usersRouter);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
    await connectDB();

    startMqtt();

    app.listen(PORT, () => {
        console.log('Server started at', PORT);
    });
};

start();
