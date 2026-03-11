// db.js - Configuración de conexión a MySQL con pool
const mysql = require('mysql2');

const pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME,
    port:               process.env.DB_PORT     || 3306,
    charset:            'utf8mb4',
    waitForConnections: true,
    connectionLimit:    10,
    connectTimeout:     30000,
    acquireTimeout:     30000,
    timeout:            30000,
});

// Verificar conexión al iniciar
pool.getConnection((error, connection) => {
    if (error) {
        console.error('Error al conectar a MySQL:', error.message);
        return;
    }
    console.log('Conectado a MySQL - Base de datos:', process.env.DB_NAME);
    connection.release();
});

module.exports = pool;