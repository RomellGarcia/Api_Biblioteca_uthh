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