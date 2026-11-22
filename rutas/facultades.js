const express = require('express');
const { ObjectId } = require('mongodb');
const { validarFacultad } = require('../validaciones');
const { esObjectId, obtenerPaginacion, datosPaginacion } = require('../utilidades');

// Recibe la conexión a la base de datos y devuelve el router de facultades.
module.exports = function rutasFacultades(db) {
  const router = express.Router();

  // Única colección: los estudiantes están embebidos aquí.
  const facultades = db.collection('facultades');

  // CREATE - POST /api/facultades
  router.post('/', async (req, res, next) => {
    try {
      const { error, valor } = validarFacultad(req.body);
      if (error) return res.status(400).json({ error });

      // VALIDACIÓN 3: el código de la facultad no se puede repetir.
      const repetida = await facultades.findOne({ codigo: valor.codigo });
      if (repetida) {
        return res.status(409).json({
          error: `Ya existe una facultad con el código ${valor.codigo}.`
        });
      }

      // Toda facultad nace con su arreglo de estudiantes vacío.
      const nueva = { ...valor, estudiantes: [], creadoEn: new Date() };
      const resultado = await facultades.insertOne(nueva);

      res.status(201).json({
        mensaje: 'Facultad creada.',
        data: { _id: resultado.insertedId, ...nueva }
      });
    } catch (error) {
      next(error);
    }
  });

  // READ - GET /api/facultades?page=1&limit=5
  router.get('/', async (req, res, next) => {
    try {
      const { pagina, limite, saltar } = obtenerPaginacion(req.query);
      const total = await facultades.countDocuments();

      // No se devuelve el arreglo completo en el listado, solo su tamaño.
      const data = await facultades
        .aggregate(
          [
            { $addFields: { totalEstudiantes: { $size: '$estudiantes' } } },
            { $project: { estudiantes: 0 } },
            { $sort: { nombre: 1 } },
            { $skip: saltar },
            { $limit: limite }
          ],
          { collation: { locale: 'es', strength: 1 } }
        )
        .toArray();

      res.json({ data, paginacion: datosPaginacion(pagina, limite, total) });
    } catch (error) {
      next(error);
    }
  });

  // READ - GET /api/facultades/:id/estudiantes?page=1&limit=5
  // Pagina el arreglo embebido con $slice, sin traer todos los estudiantes.
  router.get('/:id/estudiantes', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id de la facultad no es válido.' });
      }

      const _id = new ObjectId(req.params.id);
      const { pagina, limite, saltar } = obtenerPaginacion(req.query);

      const resultado = await facultades
        .aggregate([
          { $match: { _id } },
          {
            $project: {
              nombre: 1,
              codigo: 1,
              totalEstudiantes: { $size: '$estudiantes' },
              estudiantes: { $slice: ['$estudiantes', saltar, limite] }
            }
          }
        ])
        .toArray();

      if (resultado.length === 0) {
        return res.status(404).json({ error: 'Facultad no encontrada.' });
      }

      const facultad = resultado[0];

      res.json({
        facultad: {
          _id: facultad._id,
          nombre: facultad.nombre,
          codigo: facultad.codigo
        },
        data: facultad.estudiantes,
        paginacion: datosPaginacion(pagina, limite, facultad.totalEstudiantes)
      });
    } catch (error) {
      next(error);
    }
  });

  // READ - GET /api/facultades/:id
  router.get('/:id', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id de la facultad no es válido.' });
      }

      const facultad = await facultades.findOne({
        _id: new ObjectId(req.params.id)
      });

      if (!facultad) {
        return res.status(404).json({ error: 'Facultad no encontrada.' });
      }

      // Aquí sí se devuelve el documento completo con sus estudiantes embebidos.
      res.json({
        data: {
          ...facultad,
          totalEstudiantes: facultad.estudiantes.length
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // UPDATE - PUT /api/facultades/:id
  router.put('/:id', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id de la facultad no es válido.' });
      }

      const { error, valor } = validarFacultad(req.body);
      if (error) return res.status(400).json({ error });

      const _id = new ObjectId(req.params.id);
      const facultad = await facultades.findOne({ _id });
      if (!facultad) {
        return res.status(404).json({ error: 'Facultad no encontrada.' });
      }

      // VALIDACIÓN 3: el nuevo código no puede pertenecer a otra facultad.
      const repetida = await facultades.findOne({
        codigo: valor.codigo,
        _id: { $ne: _id }
      });
      if (repetida) {
        return res.status(409).json({
          error: `Ya existe otra facultad con el código ${valor.codigo}.`
        });
      }

      await facultades.updateOne(
        { _id },
        { $set: { ...valor, actualizadoEn: new Date() } }
      );

      const actualizada = await facultades.findOne({ _id });

      res.json({
        mensaje: 'Facultad actualizada.',
        data: {
          ...actualizada,
          totalEstudiantes: actualizada.estudiantes.length
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE - DELETE /api/facultades/:id
  // Al estar embebidos, los estudiantes se eliminan junto con la facultad.
  router.delete('/:id', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id de la facultad no es válido.' });
      }

      const _id = new ObjectId(req.params.id);
      const facultad = await facultades.findOne({ _id });

      if (!facultad) {
        return res.status(404).json({ error: 'Facultad no encontrada.' });
      }

      await facultades.deleteOne({ _id });

      res.json({
        mensaje: `Facultad eliminada junto con ${facultad.estudiantes.length} estudiante(s) embebido(s).`,
        data: {
          _id: facultad._id,
          nombre: facultad.nombre,
          codigo: facultad.codigo
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
