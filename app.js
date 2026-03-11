const express = require('express');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares globales
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'biblioteca_uthh_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas por defecto
    }
}));

// Rutas
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/libros', require('./src/routes/libros.routes'));
app.use('/api/prestamos', require('./src/routes/prestamos.routes'));

// Ruta de salud para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Servidor funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;