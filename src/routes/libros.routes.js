import express from 'express';
import multer from 'multer';
import { 
    getRecomendados, 
    getCategorias, 
    getMasPedidos, 
    getCatalogo, 
    getBuscar, 
    getDetalle, 
    getCategoria,
    postRegistrarLibro,
    eliminarLibroController,
    putActualizarLibro
} from '../controllers/libros.controller.js';

const router = express.Router();
const upload = multer({ dest: '/tmp/' });

router.get('/detalle', getDetalle);
router.get('/recomendados/aleatorios', getRecomendados);
router.get('/categorias', getCategorias);
router.get('/mas-pedidos', getMasPedidos);
router.get('/buscar', getBuscar);
router.get('/categoria/:id', getCategoria);
router.get('/', getCatalogo);
router.post('/registrar', upload.single('imagen'), postRegistrarLibro);
router.delete('/eliminar/:folio', eliminarLibroController);
router.put('/actualizar/:folio', (req, res, next) => {
    // Si viene con archivo, usar Multer; si no, parsear JSON
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        upload.single('imagen')(req, res, next);
    } else {
        express.json()(req, res, next);
    }
}, putActualizarLibro);
export default router;