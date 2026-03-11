const express = require('express');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. Configuración de CORS simplificada y robusta
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL // Asegúrate de poner https://tu-frontend.vercel.app en tu .env
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como Postman) o si está en la lista permitida
        if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Configuración de SESIÓN (Crucial para que no falle en Vercel)
// Si usas sesiones, necesitas configurar las cookies para que el navegador las acepte entre dominios
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu_secreto_super_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true si es HTTPS (Vercel)
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' permite cross-site
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Rutas
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/libros', require('./src/routes/libros.routes'));
app.use('/api/prestamos', require('./src/routes/prestamos.routes'));

// Ruta de salud
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Servidor funcionando correctamente' });
});

// 4. Middleware para capturar errores 500 y no romper el servidor
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
}

module.exports = app;