import * as Modelo from '../models/ejemplares.model.js';

export const getAuxiliares = async (req, res) => {
    try {
        const estados = await Modelo.obtenerEstados();
        const ubicaciones = await Modelo.obtenerUbicaciones();
        res.json({ success: true, estados, ubicaciones });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getListaPorLibro = async (req, res) => {
    try {
        const { folio } = req.params;
        const data = await Modelo.obtenerEjemplaresPorFolio(folio);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const postEjemplar = async (req, res) => {
    try {
        const resultado = await Modelo.insertarEjemplar(req.body);
        res.status(201).json({ success: true, id: resultado.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Para obtener un ejemplar antes de editarlo
export const getEjemplarById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await Modelo.obtenerPorId(id);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Para eliminar el ejemplar
export const deleteEjemplar = async (req, res) => {
    try {
        const { id } = req.params;
        await Modelo.eliminarEjemplar(id);
        res.json({ success: true, message: 'Ejemplar eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const putEjemplar = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await Modelo.actualizarEjemplar(id, req.body);
        
        if (resultado.affectedRows > 0) {
            res.json({ success: true, message: 'Ejemplar actualizado correctamente' });
        } else {
            res.status(404).json({ success: false, message: 'No se encontró el ejemplar' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};