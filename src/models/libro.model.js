// libro.model.js - Modelo de libros y catálogo
const conexion = require('../config/database.config');

const LibroModel = {
    /**
     * Obtener catálogo completo de libros con paginación
     */
    obtenerCatalogo: (limite = 50, offset = 0) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.vchfolio,
                    l.vchtitulo,
                    l.vchautor,
                    l.vcheditorial,
                    l.vchisbn,
                    l.imagen,
                    c.vchcategoria,
                    c.intidcategoria,
                    COUNT(e.intidejemplar) as total_ejemplares,
                    SUM(CASE WHEN e.booldisponible = 1 THEN 1 ELSE 0 END) as ejemplares_disponibles
                FROM tbllibros l
                LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
                LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
                GROUP BY l.vchfolio
                ORDER BY l.vchtitulo ASC
                LIMIT ? OFFSET ?
            `;

            conexion.query(sql, [limite, offset], (error, resultados) => {
                if (error) {
                    return reject(error);
                }

                // Convertir imágenes BLOB a base64
                const librosConImagenes = resultados.map(libro => {
                    if (libro.imagen) {
                        libro.imagen = `data:image/jpeg;base64,${libro.imagen.toString('base64')}`;
                    }
                    return libro;
                });

                resolve(librosConImagenes);
            });
        });
    },

    /**
     * Obtener detalle de un libro por folio
     */
    obtenerLibroPorFolio: (folio) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.vchfolio,
                    l.vchtitulo,
                    l.vchautor,
                    l.vcheditorial,
                    l.vchisbn,
                    l.imagen,
                    l.vchdescripcion,
                    c.vchcategoria,
                    c.intidcategoria,
                    COUNT(e.intidejemplar) as total_ejemplares,
                    SUM(CASE WHEN e.booldisponible = 1 THEN 1 ELSE 0 END) as ejemplares_disponibles
                FROM tbllibros l
                LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
                LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
                WHERE l.vchfolio = ?
                GROUP BY l.vchfolio
            `;

            conexion.query(sql, [folio], (error, resultados) => {
                if (error) {
                    return reject(error);
                }

                if (resultados.length > 0 && resultados[0].imagen) {
                    resultados[0].imagen = `data:image/jpeg;base64,${resultados[0].imagen.toString('base64')}`;
                }

                resolve(resultados);
            });
        });
    },

    /**
     * Obtener libros por categoría
     */
    obtenerLibrosPorCategoria: (idCategoria) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.vchfolio,
                    l.vchtitulo,
                    l.vchautor,
                    l.vcheditorial,
                    l.vchisbn,
                    l.imagen,
                    c.vchcategoria,
                    COUNT(e.intidejemplar) as total_ejemplares,
                    SUM(CASE WHEN e.booldisponible = 1 THEN 1 ELSE 0 END) as ejemplares_disponibles
                FROM tbllibros l
                LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
                LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
                WHERE l.intidcategoria = ?
                GROUP BY l.vchfolio
                ORDER BY l.vchtitulo ASC
            `;

            conexion.query(sql, [idCategoria], (error, resultados) => {
                if (error) {
                    return reject(error);
                }

                const librosConImagenes = resultados.map(libro => {
                    if (libro.imagen) {
                        libro.imagen = `data:image/jpeg;base64,${libro.imagen.toString('base64')}`;
                    }
                    return libro;
                });

                resolve(librosConImagenes);
            });
        });
    },

    /**
     * Buscar libros (búsqueda en tiempo real)
     */
    buscarLibros: (termino) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.vchfolio,
                    l.vchtitulo,
                    l.vchautor,
                    l.vcheditorial,
                    l.vchisbn,
                    l.imagen,
                    c.vchcategoria,
                    COUNT(e.intidejemplar) as total_ejemplares,
                    SUM(CASE WHEN e.booldisponible = 1 THEN 1 ELSE 0 END) as ejemplares_disponibles
                FROM tbllibros l
                LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
                LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
                WHERE l.vchtitulo LIKE ? 
                   OR l.vchautor LIKE ?
                   OR l.vchisbn LIKE ?
                   OR l.vcheditorial LIKE ?
                   OR c.vchcategoria LIKE ?
                GROUP BY l.vchfolio
                ORDER BY l.vchtitulo ASC
                LIMIT 20
            `;

            const terminoBusqueda = `%${termino}%`;

            conexion.query(sql, 
                [terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda], 
            (error, resultados) => {
                if (error) {
                    return reject(error);
                }

                const librosConImagenes = resultados.map(libro => {
                    if (libro.imagen) {
                        libro.imagen = `data:image/jpeg;base64,${libro.imagen.toString('base64')}`;
                    }
                    return libro;
                });

                resolve(librosConImagenes);
            });
        });
    },

    /**
     * Obtener todas las categorías
     */
    obtenerCategorias: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    c.intidcategoria,
                    c.vchcategoria,
                    COUNT(l.vchfolio) as total_libros
                FROM tblcategoria c
                LEFT JOIN tbllibros l ON c.intidcategoria = l.intidcategoria
                GROUP BY c.intidcategoria
                ORDER BY c.vchcategoria ASC
            `;

            conexion.query(sql, (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Obtener libros más prestados (para recomendaciones)
     */
    obtenerLibrosMasPrestados: (limite = 10) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.vchfolio,
                    l.vchtitulo,
                    l.vchautor,
                    l.imagen,
                    c.vchcategoria,
                    COUNT(p.intidprestamo) as veces_prestado,
                    SUM(CASE WHEN e.booldisponible = 1 THEN 1 ELSE 0 END) as ejemplares_disponibles
                FROM tbllibros l
                LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
                LEFT JOIN tblprestamos p ON e.intidejemplar = p.intidejemplar
                LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
                GROUP BY l.vchfolio
                HAVING veces_prestado > 0
                ORDER BY veces_prestado DESC
                LIMIT ?
            `;

            conexion.query(sql, [limite], (error, resultados) => {
                if (error) {
                    return reject(error);
                }

                const librosConImagenes = resultados.map(libro => {
                    if (libro.imagen) {
                        libro.imagen = `data:image/jpeg;base64,${libro.imagen.toString('base64')}`;
                    }
                    return libro;
                });

                resolve(librosConImagenes);
            });
        });
    },

    /**
     * Obtener ejemplares de un libro
     */
    obtenerEjemplaresDeLibro: (folio) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    e.intidejemplar,
                    e.vchcodigobarras,
                    e.vchedicion,
                    e.vchubicacion,
                    e.booldisponible
                FROM tblejemplares e
                WHERE e.vchfolio = ?
                ORDER BY e.booldisponible DESC, e.intidejemplar ASC
            `;

            conexion.query(sql, [folio], (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    }
};

module.exports = LibroModel;