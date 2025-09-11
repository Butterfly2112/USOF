require('dotenv').config(); // Загружаем переменные окружения
const mysql = require('mysql2/promise');
const fs = require('fs/promises'); // Убедись, что fs импортирован

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function executeQuery(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

async function initializeDatabase() {
    console.log('Initializing database...');
    try {
        // Создаем временное соединение для создания БД
        const tempPool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0
        });
        await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await tempPool.end(); // Закрываем временное соединение

        // Теперь используем основной пул для создания таблиц и заполнения данных
        // >>>>> ИЗМЕНИ ЭТИ ДВЕ СТРОКИ <<<<<
        const initSql = await fs.readFile(__dirname + '/init.sql', 'utf-8');
        const seedSql = await fs.readFile(__dirname + '/seed.sql', 'utf-8');
        // >>>>> КОНЕЦ ИЗМЕНЕНИЙ <<<<<

        // Выполняем скрипты последовательно
for (const statement of initSql.split(/;\s*[\r\n]+/)) {
    if (statement.trim()) {
        await pool.query(statement);
    }
}

        console.log('Database schema initialized.');

        for (const statement of initSql.split(/;\s*[\r\n]+/)) {
        if (statement.trim()) {
            await pool.query(statement);
        }
    }
        console.log('Database seeded with test data.');

    } catch (error) {
        console.error('Failed to initialize or seed database:', error);
        process.exit(1); // Выходим из приложения, если не удалось инициализировать БД
    }
}


module.exports = {
    pool,
    executeQuery,
    initializeDatabase
};