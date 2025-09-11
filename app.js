require('dotenv').config();
const express = require('express');
const logger = require('./middleware/logger');
const userRoutes = require('./routes/userRoutes');
const { initializeDatabase } = require('./db/db'); // Предполагаем, что db.js находится в src/db

const app = express();
const PORT = process.env.PORT || 3000;
app.use(logger);
// Middleware для обработки JSON-запросов
app.use(express.json());
// Middleware для обработки URL-encoded запросов
app.use(express.urlencoded({ extended: true }));
// Middleware для отдачи статических файлов (например, аватаров)
app.use('/uploads', express.static('uploads'));
app.use('/api/users', userRoutes);

// TODO: Здесь будут подключаться твои роуты

// TODO: Здесь будет подключаться middleware для обработки ошибок

async function startServer() {
    try {
        await initializeDatabase(); // Инициализация БД при запуске
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Access it at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();