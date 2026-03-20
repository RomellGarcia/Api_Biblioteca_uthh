import dotenv from 'dotenv';
dotenv.config();

import { procesarNotificaciones } from './src/services/notificaciones.service.js';

console.log('Ejecutando prueba...');
await procesarNotificaciones();
process.exit(0);

//node probar-procesarNotificaciones.js