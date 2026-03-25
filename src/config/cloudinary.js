import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// 1. Forzamos la carga (aunque Vercel lo hace, esto asegura el orden)
dotenv.config();

// 2. Diagnóstico: Si esto sale en el log, sabremos si Vercel le pasó las llaves
console.log("Revisando credenciales en el servidor:", {
    cloud: process.env.CLOUDINARY_CLOUD_NAME ? "OK" : "VACÍO",
    key: process.env.CLOUDINARY_API_KEY ? "OK" : "VACÍO"
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;