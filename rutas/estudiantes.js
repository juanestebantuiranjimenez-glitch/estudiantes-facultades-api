const express = require('express');
const { ObjectId } = require('mongodb');
const { validarEstudiante } = require('../validaciones');
const { esObjectId, obtenerPaginacion, datosPaginacion } = require('../utilidades');

// Recibe la conexión a la base de datos y devuelve el router de estudiantes.
// Los estudiantes no tienen colección propia: viven dentro de una facultad.
module.exports = function rutasEstudiantes(db) {
  const router = express.Router();
  const facultades = db.collection('facultades');

  // CREATE - POST /api/estudiantes
  // Inserta el estudiante dentro del arreglo "estudiantes" de su facultad.
  router.post('/', async (req, res, next) => {
    try {
      const { error, valor } = validarEstudiante(req.body);
      if (error) return res.status(400).json({ error });

      // La facultad debe existir para poder embeber al estudiante.
      const facultad = await facultades.findOne({
        _id: new ObjectId(valor.facultadId)
      });
      if (!facultad) {
        return res.status(400).json({ error: 'La facultad indicada no existe.' });
      }

      // VALIDACIÓN 3: el email no se puede repetir entre todos los embebidos.
      const repetido = await facultades.findOne({
        'estudiantes.email': valor.email
      });
      if (repetido) {
        return res.status(409).json({
          error: `Ya existe un estudiante con el email ${valor.email}.`
        });
      }

      const nuevo = {
        _id: new ObjectId(),
        nombre: valor.nombre,
        email: valor.email,
        edad: valor.edad,
        semestre: valor.semestre,
        creadoEn: new Date()
      };

      await facultades.updateOne(
        { _id: facultad._id },
        { $push: { estudiantes: nuevo } }
      );

      res.status(201).json({
        mensaje: 'Estudiante creado (embebido en la facultad).',
        data: {
          ...nuevo,
          facultad: {
            _id: facultad._id,
            nombre: facultad.nombre,
            codigo: facultad.codigo
          }
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // READ - GET /api/estudiantes?page=1&limit=5&facultadId=...
  // Como están embebidos, se recorren las facultades y se arma una sola lista.
  router.get('/', async (req, res, next) => {
    try {
      const { pagina, limite, saltar } = obtenerPaginacion(req.query);
      let filtroId = null;

      if (req.query.facultadId !== undefined) {
        if (!esObjectId(req.query.facultadId)) {
          return res.status(400).json({
            error: 'El facultadId del filtro no es válido.'
          });
        }
        filtroId = new ObjectId(req.query.facultadId);
      }

      const listaFacultades = await facultades.find().toArray();
      const estudiantes = [];

      for (const facultad of listaFacultades) {
        if (filtroId && !facultad._id.equals(filtroId)) continue;

        for (const estudiante of facultad.estudiantes) {
          estudiantes.push({
            ...estudiante,
            facultad: {
              _id: facultad._id,
              nombre: facultad.nombre,
              codigo: facultad.codigo
            }
          });
        }
      }

      // Orden alfabético en español (las tildes y la ñ se ordenan bien).
      estudiantes.sort((a, b) => {
        const comparacion = a.nombre.localeCompare(b.nombre, 'es', {
          sensitivity: 'base'
        });
        return comparacion !== 0
          ? comparacion
          : a._id.toString().localeCompare(b._id.toString());
      });

      const total = estudiantes.length;
      const data = estudiantes.slice(saltar, saltar + limite);

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

      const _id = new ObjectId(req.params.id);
      const facultad = await facultades.findOne({ 'estudiantes._id': _id });

      if (!facultad) {
        return res.status(404).json({ error: 'Estudiante no encontrado.' });
      }

      const estudiante = facultad.estudiantes.find((e) => e._id.equals(_id));

      res.json({
        data: {
          ...estudiante,
          facultad: {
            _id: facultad._id,
            nombre: facultad.nombre,
            codigo: facultad.codigo
          }
        }
      });
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
      const facultad = await facultades.findOne({ 'estudiantes._id': _id });
      if (!facultad) {
        return res.status(404).json({ error: 'Estudiante no encontrado.' });
      }

      // Al estar embebido, cambiar de facultad implicaría mover el subdocumento
      // de un arreglo a otro. Para mantener el CRUD simple, se exige la misma.
      if (!new ObjectId(valor.facultadId).equals(facultad._id)) {
        return res.status(400).json({
          error: 'No se puede cambiar de facultad. Elimina el estudiante y créalo en la otra facultad.'
        });
      }

      // VALIDACIÓN 3: el nuevo email no puede pertenecer a otro estudiante.
      const facultadesConEmail = await facultades
        .find({ 'estudiantes.email': valor.email })
        .toArray();

      const repetido = facultadesConEmail.some((f) =>
        f.estudiantes.some(
          (e) => e.email === valor.email && !e._id.equals(_id)
        )
      );
      if (repetido) {
        return res.status(409).json({
          error: `Ya existe otro estudiante con el email ${valor.email}.`
        });
      }

      // El operador $ actualiza el estudiante que coincidió en el arreglo.
      await facultades.updateOne(
        { _id: facultad._id, 'estudiantes._id': _id },
        {
          $set: {
            'estudiantes.$.nombre': valor.nombre,
            'estudiantes.$.email': valor.email,
            'estudiantes.$.edad': valor.edad,
            'estudiantes.$.semestre': valor.semestre,
            'estudiantes.$.actualizadoEn': new Date()
          }
        }
      );

      const actualizada = await facultades.findOne({ _id: facultad._id });
      const actualizado = actualizada.estudiantes.find((e) => e._id.equals(_id));

      res.json({
        mensaje: 'Estudiante actualizado.',
        data: {
          ...actualizado,
          facultad: {
            _id: actualizada._id,
            nombre: actualizada.nombre,
            codigo: actualizada.codigo
          }
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE - DELETE /api/estudiantes/:id
  // $pull saca el subdocumento del arreglo embebido.
  router.delete('/:id', async (req, res, next) => {
    try {
      if (!esObjectId(req.params.id)) {
        return res.status(400).json({ error: 'El id del estudiante no es válido.' });
      }

      const _id = new ObjectId(req.params.id);
      const resultado = await facultades.updateOne(
        { 'estudiantes._id': _id },
        { $pull: { estudiantes: { _id } } }
      );

      if (resultado.modifiedCount === 0) {
        return res.status(404).json({ error: 'Estudiante no encontrado.' });
      }

      res.json({ mensaje: 'Estudiante eliminado de la facultad.' });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
