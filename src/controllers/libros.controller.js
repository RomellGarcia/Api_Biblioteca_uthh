import { configurarCloudinary } from '../config/cloudinary.js';
import {
    obtenerLibrosRecomendados,
    obtenerCategorias,
    obtenerLibrosMasPedidos,
    obtenerCatalogo,
    buscarLibros,
    obtenerDetalle,
    obtenerPorCategoria,
    registrarLibro
} from '../models/libros.model.js';

// GET /api/libros/recomendados/aleatorios
async function getRecomendados(req, res) {
    try {
        const libros = await obtenerLibrosRecomendados();
        res.json({ success: true, data: libros, total: libros?.length || 0 });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error de base de datos: ' + error.message, codigo: error.code });
    }
}

// GET /api/libros/categorias
async function getCategorias(req, res) {
    try {
        const categorias = await obtenerCategorias();
        res.json({ success: true, data: categorias });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// GET /api/libros/mas-pedidos
async function getMasPedidos(req, res) {
    try {
        const libros = await obtenerLibrosMasPedidos();
        res.json({ success: true, data: libros });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// GET /api/libros
async function getCatalogo(req, res) {
    try {
        const libros = await obtenerCatalogo();
        res.json({ success: true, data: libros, total: libros?.length || 0 });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener el catálogo', detalles: error.message });
    }
}

// GET /api/libros/buscar?q=
async function getBuscar(req, res) {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, error: 'Parámetro de búsqueda requerido' });

    try {
        const libros = await buscarLibros(q);
        res.json({ success: true, data: libros });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// GET /api/libros/detalle?folio=
async function getDetalle(req, res) {
    const folio = req.query.folio;
    console.log("Buscando folio:", folio);
    if (!folio) return res.status(400).json({ success: false, error: 'Folio requerido' });

    try {
        const libro = await obtenerDetalle(folio);

        // Validamos si no existe o si es un arreglo vacío
        if (!libro || (Array.isArray(libro) && libro.length === 0)) {
            return res.status(404).json({ success: false, error: 'Libro no encontrado' });
        }

        // Si el modelo devuelve un arreglo, sacamos el primer elemento
        const datosLibro = Array.isArray(libro) ? libro[0] : libro;
        res.json({ success: true, data: datosLibro });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// GET /api/libros/categoria/:id
async function getCategoria(req, res) {
    const categoriaId = parseInt(req.params.id);
    if (isNaN(categoriaId) || categoriaId <= 0) {
        return res.status(400).json({ success: false, error: 'ID de categoría inválido' });
    }

    try {
        const data = await obtenerPorCategoria(categoriaId);
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return res.status(404).json({ success: false, error: 'Categoría no encontrada o sin libros' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// POST /api/libros/registrar
async function postRegistrarLibro(req, res) {
    try {
        const { vchfolio, vchtitulo, vchautor, intidcategoria, intanio } = req.body;

        if (!vchfolio || !vchtitulo || !vchautor || !intidcategoria) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan campos obligatorios (Folio, Título, Autor o Categoría).' 
            });
        }

        const anioConvertido = Number(intanio);
        const anioActual = new Date().getFullYear();

        if (intanio) {
            if (isNaN(anioConvertido) || anioConvertido < 1000 || anioConvertido > anioActual) {
                return res.status(400).json({ 
                    success: false, 
                    error: `El año "${intanio}" no es válido. Debe ser un número entre 1000 y ${anioActual}.` 
                });
            }
        }

        let urlImagenCloudinary = null;
        if (req.file) {
            const cloudinaryConfigurado = configurarCloudinary();
            const resultadoCloudinary = await cloudinaryConfigurado.uploader.upload(req.file.path, {
                folder: 'biblioteca_uthh/portadas',
                resource_type: 'image'
            });
            urlImagenCloudinary = resultadoCloudinary.secure_url;
        }
        const nuevoLibro = {
            vchfolio: vchfolio,
            vchtitulo: vchtitulo,
            vchautor: vchautor,
            vcheditorial: req.body.vcheditorial || null,
            intanio: intanio ? anioConvertido : null,
            vchisbn: req.body.vchisbn || null,
            vchsinopsis: req.body.vchsinopsis || null,
            intidcategoria: parseInt(intidcategoria),
            vchimagen: urlImagenCloudinary
        };

        const resultado = await registrarLibro(nuevoLibro);

        res.status(201).json({
            success: true,
            message: 'Libro registrado correctamente',
            id: resultado.insertId,
            urlImagen: urlImagenCloudinary
        });

    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({
            success: false,
            error: 'No se pudo registrar el libro: ' + error.message
        });
    }
}

export {
    getRecomendados,
    getCategorias,
    getMasPedidos,
    getCatalogo,
    getBuscar,
    getDetalle,
    getCategoria,
    postRegistrarLibro
};