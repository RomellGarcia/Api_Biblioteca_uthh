const express = require('express');
const app = express();
require('dotenv').config();
const session = require('express-session');
const cors = require('cors');


// 1. Configuración de CORS simplificada y robusta
const allowedOrigins = [
    'http://localhost:3000',      
    'http://127.0.0.1:3000',   
    'http://localhost:5500',    
    process.env.FRONTEND_URL     
];

app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL || '' // Asegúrate que esta variable exista en tu .env
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true, // Esto es lo que causa que el origen deba ser específico
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Configuración de SESIÓN (Crucial para que no falle en Vercel)
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu_secreto_super_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
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

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
}

module.exports = app;