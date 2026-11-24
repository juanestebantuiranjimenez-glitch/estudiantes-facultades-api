const express = require('express');
const { conectarDB, cerrarDB } = require('./db');
const rutasFacultades = require('./rutas/facultades');
const rutasEstudiantes = require('./rutas/estudiantes');

const PUERTO = Number(process.env.PORT) || 3000;

async function iniciar() {
  const { db } = await conectarDB();

  const app = express();

  // Permite recibir JSON en el cuerpo de las peticiones.
  app.use(express.json());

  // Página de ayuda con la lista de endpoints.
  app.get('/api', (req, res) => {
    res.json({
      mensaje: 'API de estudiantes y facultades (modelo 1:N con documentos embebidos)',
      modelo: 'Cada facultad contiene un arreglo "estudiantes" dentro del mismo documento.',
      endpoints: {
        facultades: [
          'GET    /api/facultades?page=1&limit=5            (lista paginada con totalEstudiantes)',
          'GET    /api/facultades/:id                       (documento completo con estudiantes embebidos)',
          'GET    /api/facultades/:id/estudiantes?page=1&limit=5 (arreglo embebido paginado)',
          'POST   /api/facultades/:id/estudiantes            (agrega UN estudiante embebido)',
          'POST   /api/facultades',
          'PUT    /api/facultades/:id',
          'DELETE /api/facultades/:id                       (elimina también sus estudiantes embebidos)'
        ],
        estudiantes: [
          'GET    /api/estudiantes?page=1&limit=5&facultadId=... (lista global paginada)',
          'GET    /api/estudiantes/:id',
          'POST   /api/estudiantes                          (inserta el estudiante dentro de su facultad)',
          'PUT    /api/estudiantes/:id',
          'DELETE /api/estudiantes/:id                      (lo saca del arreglo embebido)'
        ]
      }
    });
  });

  app.use('/api/facultades', rutasFacultades(db));
  app.use('/api/estudiantes', rutasEstudiantes(db));

  // Ruta que no existe.
  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  // Manejo centralizado de errores.
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: 'El cuerpo de la petición no es un JSON válido.'
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Ya existe un registro con ese valor único (email o código).'
      });
    }

    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  const servidor = app.listen(PUERTO, () => {
    console.log(`API escuchando en http://localhost:${PUERTO}/api`);
  });

  servidor.on('error', (error) => {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  });

  // Cierra la conexión a MongoDB al detener el servidor con Ctrl+C.
  const apagar = () => {
    console.log('\nCerrando servidor...');
    servidor.close(async () => {
      await cerrarDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

iniciar().catch((error) => {
  console.error('No se pudo iniciar la API:', error.message);
  process.exit(1);
});
