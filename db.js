const { MongoClient, ObjectId } = require('mongodb');

// Se puede cambiar con variables de entorno, pero estos valores funcionan
// con una instalación local de MongoDB sin autenticación.
const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const NOMBRE_BD = process.env.MONGODB_DB || 'estudiantes_facultades';

let cliente = null;

// Crea un estudiante embebido con su propio _id.
function nuevoEstudiante(nombre, email, edad, semestre) {
  return {
    _id: new ObjectId(),
    nombre,
    email,
    edad,
    semestre,
    creadoEn: new Date()
  };
}

async function conectarDB() {
  cliente = new MongoClient(URI);
  await cliente.connect();

  const db = cliente.db(NOMBRE_BD);

  // Ahora solo existe la colección "facultades": los estudiantes van
  // embebidos dentro del arreglo "estudiantes" de cada facultad.
  const facultades = db.collection('facultades');

  // Un código por facultad (validación de unicidad).
  await facultades.createIndex({ codigo: 1 }, { unique: true });

  // Índices para buscar estudiantes dentro de los arreglos embebidos.
  await facultades.createIndex({ 'estudiantes.email': 1 });
  await facultades.createIndex({ 'estudiantes._id': 1 });

  // Datos de ejemplo para ver los documentos embebidos desde el primer arranque.
  if ((await facultades.countDocuments()) === 0) {
    await facultades.insertMany([
      {
        nombre: 'Ingeniería de Sistemas',
        codigo: 'ING-SIS',
        estudiantes: [
          nuevoEstudiante('José Ñáñez', 'jose.nanez@correo.com', 20, 4),
          nuevoEstudiante('María Peña', 'maria.pena@correo.com', 21, 5),
          nuevoEstudiante('Lucía Gómez', 'lucia.gomez@correo.com', 19, 3)
        ],
        creadoEn: new Date()
      },
      {
        nombre: 'Ciencias de la Salud',
        codigo: 'SALUD',
        estudiantes: [
          nuevoEstudiante('Andrés Muñoz', 'andres.munoz@correo.com', 22, 6),
          nuevoEstudiante('Sofía Núñez', 'sofia.nunez@correo.com', 20, 4)
        ],
        creadoEn: new Date()
      },
      {
        nombre: 'Administración de Empresas',
        codigo: 'ADMON',
        estudiantes: [
          nuevoEstudiante('Raúl Ibáñez', 'raul.ibanez@correo.com', 23, 7)
        ],
        creadoEn: new Date()
      }
    ]);
    console.log('Facultades de ejemplo creadas (con estudiantes embebidos).');
  }

  console.log(`Conectado a MongoDB (base de datos: ${NOMBRE_BD})`);
  return { cliente, db, facultades };
}

async function cerrarDB() {
  if (cliente) {
    await cliente.close();
    cliente = null;
  }
}

module.exports = { conectarDB, cerrarDB };
