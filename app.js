const allowedOrigins = [
    'http://localhost:3000',      
    'http://127.0.0.1:3000',   
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://romellgarcia.github.io', //dominio de GitHub Pages
    process.env.FRONTEND_URL 
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como apps móviles o curl)
        if (!origin) return callback(null, true);
        
        // Verificar si el origen está en la lista o si pertenece a github.io
        const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.github.io');
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));