const express = require('express');
const { ObjectId } = require('mongodb');
const { validarEstudiante } = require('../validaciones');
const { esObjectId, obtenerPaginacion, datosPaginacion } = require('../utilidades');

// Recibe la conexión a la base de datos y devuelve el router de estudiantes.
module.exports = function rutasEstudiantes(db) {
  const router = express.Router();
  const estudiantes = db.collection('estudiantes');
  const facultades = db.collection('facultades');

  // CREATE - POST /api/estudiantes
  router.post('/', async (req, res, next) => {
    try {
      const { error, valor } = validarEstudiante(req.body);
      if (error) return res.status(400).json({ error });

      // Integridad referencial: la facultad debe existir.
      const facultad = await facultades.findOne({
        _id: new ObjectId(valor.facultadId)
      });
      if (!facultad) {
        return res.status(400).json({ error: 'La facultad indicada no existe.' });
      }

      // VALIDACIÓN 3: el email del estudiante no se puede repetir.
      const repetido = await estudiantes.findOne({ email: valor.email });
      if (repetido) {
        return res.status(409).json({
          error: `Ya existe un estudiante con el email ${valor.email}.`
        });
      }

      const nuevo = {
        nombre: valor.nombre,
        email: valor.email,
        edad: valor.edad,
        semestre: valor.semestre,
        facultadId: facultad._id,
        creadoEn: new Date()
      };

      const resultado = await estudiantes.insertOne(nuevo);

      res.status(201).json({
        mensaje: 'Estudiante creado.',
        data: { _id: resultado.insertedId, ...nuevo }
      });
    } catch (error) {
      next(error);
    }
  });

  // READ - GET /api/estudiantes?page=1&limit=5&facultadId=...
  router.get('/', async (req, res, next) => {
    try {
      const { pagina, limite, saltar } = obtenerPaginacion(req.query);
      const filtro = {};

      // Filtro opcional para ver los estudiantes de una facultad.
      if (req.query.facultadId !== undefined) {
        if (!esObjectId(req.query.facultadId)) {
          return res.status(400).json({
            error: 'El facultadId del filtro no es válido.'
          });
        }
        filtro.facultadId = new ObjectId(req.query.facultadId);
      }

      const total = await estudiantes.countDocuments(filtro);

      const data = await estudiantes
        .find(filtro)
        .collation({ locale: 'es', strength: 1 })
        .sort({ nombre: 1, _id: 1 })
        .skip(saltar)
        .limit(limite)
        .toArray();

      res.json({ data, paginacion: datosPaginacion(pagina, limite, total) });
    } catch (error) {
      next(error);
    }
  });

  // READ - GET /api/estudiantes/:id
  router.get('/:id', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id del estudiante no es válido.' });
      }

      const estudiante = await estudiantes.findOne({
        _id: new ObjectId(req.params.id)
      });

      if (!estudiante) {
        return res.status(404).json({ error: 'Estudiante no encontrado.' });
      }

      // Se incluye la facultad para mostrar la relación 1:N.
      const facultad = await facultades.findOne(
        { _id: estudiante.facultadId },
        { projection: { nombre: 1, codigo: 1 } }
      );

      res.json({ data: { ...estudiante, facultad } });
    } catch (error) {
      next(error);
    }
  });

  // UPDATE - PUT /api/estudiantes/:id
  router.put('/:id', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id del estudiante no es válido.' });
      }

      const { error, valor } = validarEstudiante(req.body);
      if (error) return res.status(400).json({ error });

      const _id = new ObjectId(req.params.id);
      const estudiante = await estudiantes.findOne({ _id });
      if (!estudiante) {
        return res.status(404).json({ error: 'Estudiante no encontrado.' });
      }

      const facultad = await facultades.findOne({
        _id: new ObjectId(valor.facultadId)
      });
      if (!facultad) {
        return res.status(400).json({ error: 'La facultad indicada no existe.' });
      }

      // VALIDACIÓN 3: el nuevo email no puede pertenecer a otro estudiante.
      const repetido = await estudiantes.findOne({
        email: valor.email,
        _id: { $ne: _id }
      });
      if (repetido) {
        return res.status(409).json({
          error: `Ya existe otro estudiante con el email ${valor.email}.`
        });
      }

      const { facultadId, ...resto } = valor;

      await estudiantes.updateOne(
        { _id },
        {
          $set: {
            ...resto,
            facultadId: facultad._id,
            actualizadoEn: new Date()
          }
        }
      );

      const actualizado = await estudiantes.findOne({ _id });

      res.json({ mensaje: 'Estudiante actualizado.', data: actualizado });
    } catch (error) {
      next(error);
    }
  });

  // DELETE - DELETE /api/estudiantes/:id
  router.delete('/:id', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id del estudiante no es válido.' });
      }

      const resultado = await estudiantes.deleteOne({
        _id: new ObjectId(req.params.id)
      });

      if (resultado.deletedCount === 0) {
        return res.status(404).json({ error: 'Estudiante no encontrado.' });
      }

      res.json({ mensaje: 'Estudiante eliminado.' });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
