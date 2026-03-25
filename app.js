import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './src/routes/auth.routes.js';
import librosRoutes from './src/routes/libros.routes.js';
import prestamosRoutes from './src/routes/prestamos.routes.js';
import { iniciarScheduler } from './src/services/notificaciones.service.js';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Configuración de CORS
const allowedOrigins = [
    'http://localhost:3000',      
    'http://127.0.0.1:3000',   
    'http://localhost:5500',    
    'http://127.0.0.1:5500',
    'https://romellgarcia.github.io', // GitHub Pages
    process.env.FRONTEND_URL     
].filter(Boolean);

iniciarScheduler();

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        // Verifica contra la lista y también dominios de GitHub
        const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.github.io');
        
        if (isAllowed) {
            callback(null, true);
        } else {
            // Log para debuggear en los logs de Vercel
            console.error('CORS Bloqueado para:', origin);
            callback(null, false); // No lances un Error, solo retorna false
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/libros', librosRoutes);
app.use('/api/prestamos', prestamosRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Servidor funcionando correctamente en la nube' });
});

// Middleware para capturar errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Arranque del servidor
const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
}

export default app;