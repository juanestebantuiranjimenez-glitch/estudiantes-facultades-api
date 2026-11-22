const express = require('express');
const { ObjectId } = require('mongodb');
const { validarFacultad } = require('../validaciones');
const { esObjectId, obtenerPaginacion, datosPaginacion } = require('../utilidades');

// Recibe la conexión a la base de datos y devuelve el router de facultades.
module.exports = function rutasFacultades(db) {
  const router = express.Router();
  const facultades = db.collection('facultades');
  const estudiantes = db.collection('estudiantes');

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

      const nueva = { ...valor, creadoEn: new Date() };
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

      // $lookup une cada facultad con sus estudiantes para mostrar el 1:N.
      const data = await facultades
        .aggregate(
          [
            { $sort: { nombre: 1 } },
            { $skip: saltar },
            { $limit: limite },
            {
              $lookup: {
                from: 'estudiantes',
                localField: '_id',
                foreignField: 'facultadId',
                as: 'estudiantes'
              }
            },
            { $addFields: { totalEstudiantes: { $size: '$estudiantes' } } },
            { $project: { estudiantes: 0 } }
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
  // Lista los estudiantes de una facultad (el lado "muchos" de la relación).
  router.get('/:id/estudiantes', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id de la facultad no es válido.' });
      }

      const facultadId = new ObjectId(req.params.id);
      const facultad = await facultades.findOne(
        { _id: facultadId },
        { projection: { nombre: 1, codigo: 1 } }
      );

      if (!facultad) {
        return res.status(404).json({ error: 'Facultad no encontrada.' });
      }

      const { pagina, limite, saltar } = obtenerPaginacion(req.query);
      const filtro = { facultadId };
      const total = await estudiantes.countDocuments(filtro);

      const data = await estudiantes
        .find(filtro)
        .collation({ locale: 'es', strength: 1 })
        .sort({ nombre: 1, _id: 1 })
        .skip(saltar)
        .limit(limite)
        .toArray();

      res.json({
        facultad,
        data,
        paginacion: datosPaginacion(pagina, limite, total)
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

      const _id = new ObjectId(req.params.id);
      const facultad = await facultades.findOne({ _id });

      if (!facultad) {
        return res.status(404).json({ error: 'Facultad no encontrada.' });
      }

      const totalEstudiantes = await estudiantes.countDocuments({ facultadId: _id });

      res.json({ data: { ...facultad, totalEstudiantes } });
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

      res.json({ mensaje: 'Facultad actualizada.', data: actualizada });
    } catch (error) {
      next(error);
    }
  });

  // DELETE - DELETE /api/facultades/:id
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

      // Integridad de la relación 1:N: no se borra una facultad con estudiantes.
      const totalEstudiantes = await estudiantes.countDocuments({ facultadId: _id });
      if (totalEstudiantes > 0) {
        return res.status(409).json({
          error: `No se puede eliminar la facultad porque tiene ${totalEstudiantes} estudiante(s) asociado(s).`
        });
      }

      await facultades.deleteOne({ _id });

      res.json({ mensaje: 'Facultad eliminada.', data: facultad });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
