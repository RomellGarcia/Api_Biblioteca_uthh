import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 30000,
  charset: 'utf8mb4'
});

// Verificamos la conexión al iniciar
try {
  const connection = await pool.getConnection();
  console.log('Conectado a MySQL - Base de datos:', process.env.DB_NAME);
  connection.release(); // Liberamos la conexión de vuelta al pool
} catch (error) {
  console.error('Error al conectar a MySQL:', error.message);
}

export default pool;