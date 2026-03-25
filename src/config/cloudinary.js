import { v2 as cloudinary } from 'cloudinary';

// No lo configuramos aquí arriba globalmente porque process.env 
// a veces llega tarde en las funciones Serverless de Vercel.

const configurarCloudinary = () => {
    if (!process.env.CLOUDINARY_API_KEY) {
        throw new Error("Las variables de Cloudinary NO están llegando al servidor");
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    return cloudinary;
};

export { configurarCloudinary };
export default cloudinary;