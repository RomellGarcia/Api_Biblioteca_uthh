import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = createPool({
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306, // Convertir a número siempre
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  charset: 'utf8mb4'
});

// Prueba de conexión simplificada para evitar bloqueos en el despliegue
pool.getConnection()
  .then(connection => {
    console.log('Conectado a MySQL - Base de datos:', process.env.DB_NAME);
    connection.release();
  })
  .catch(error => {
    console.error('Error al conectar a MySQL:', error.message);
  });

export default pool;