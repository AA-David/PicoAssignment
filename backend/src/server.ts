import express from 'express';
import { connectDB } from './config/db.js';
import usersRouter from './routes/user.route.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.use('/api', usersRouter);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log('Server started at', PORT);
    });
};

start();
