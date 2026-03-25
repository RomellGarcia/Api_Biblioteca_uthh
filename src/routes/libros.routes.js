import express from 'express';
import { 
    getRecomendados, 
    getCategorias, 
    getMasPedidos, 
    getCatalogo, 
    getBuscar, 
    getDetalle, 
    getCategoria,
    postRegistrarLibro
} from '../controllers/libros.controller.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/detalle', getDetalle);
router.get('/recomendados/aleatorios', getRecomendados);
router.get('/categorias', getCategorias);
router.get('/mas-pedidos', getMasPedidos);
router.get('/buscar', getBuscar);
router.get('/categoria/:id', getCategoria);
router.get('/', getCatalogo);
router.post('/registrar', upload.single('imagen'), postRegistrarLibro);

export default router;