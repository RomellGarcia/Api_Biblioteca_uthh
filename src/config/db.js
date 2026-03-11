// database.config.js - Configuración de conexión a MySQL
const mysql = require('mysql');

// Crear conexión a la base de datos
const conexion = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    connectTimeout: 10000
});

// Conectar a la base de datos
conexion.connect((error) => {
    if (error) {
        console.error('Error al conectar a MySQL:', error.message);
        console.error('Código de error:', error.code);
        console.error('\nAsegúrate de que:');
        console.error('   1. MySQL esté corriendo');
        console.error('   2. Las credenciales en .env sean correctas');
        console.error('   3. La base de datos exista\n');
        process.exit(1);
    }
    console.log('✅ Conectado a MySQL - Base de datos:', process.env.DB_NAME);
});

// Manejar errores después de la conexión inicial
conexion.on('error', (error) => {
    console.error('Error de MySQL:', error);
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('La conexión a la base de datos se perdió');
    } else {
        throw error;
    }
});

module.exports = conexion;