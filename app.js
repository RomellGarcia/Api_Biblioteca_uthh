import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './src/routes/auth.routes.js';
import librosRoutes from './src/routes/libros.routes.js';
import prestamosRoutes from './src/routes/prestamos.routes.js';
import { iniciarScheduler } from './src/services/notificaciones.service.js';
import ejemplaresRoutes from './src/routes/ejemplares.routes.js';

dotenv.config();

const app = express();

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://romellgarcia.github.io',
    'https://uthhbibliotecanew.b-corpsolutions.com',
    'https://uthhbibliotecanew.b-corpsolutions.com',
    process.env.FRONTEND_URL
].filter(Boolean);

iniciarScheduler();

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.github.io');
        if (isAllowed) {
            callback(null, true);
        } else {
            console.error('CORS Bloqueado para:', origin);
            callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rutas que usan Multer (multipart/form-data) van ANTES de los body parsers
app.use('/api/libros', librosRoutes);

// Body parsers para el resto de rutas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas que NO usan Multer
app.use('/api/auth', authRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/ejemplares', ejemplaresRoutes);

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Servidor funcionando correctamente en la nube' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
}

export default app;