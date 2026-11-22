const { MongoClient } = require('mongodb');

// Se puede cambiar con variables de entorno, pero estos valores funcionan
// con una instalación local de MongoDB sin autenticación.
const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const NOMBRE_BD = process.env.MONGODB_DB || 'estudiantes_facultades';

let cliente = null;

async function conectarDB() {
  cliente = new MongoClient(URI);
  await cliente.connect();

  const db = cliente.db(NOMBRE_BD);
  const facultades = db.collection('facultades');
  const estudiantes = db.collection('estudiantes');

  // Un email por estudiante y un código por facultad (validación de unicidad).
  await estudiantes.createIndex({ email: 1 }, { unique: true });
  await facultades.createIndex({ codigo: 1 }, { unique: true });

  // Índice para consultar rápido los estudiantes de una facultad (relación 1:N).
  await estudiantes.createIndex({ facultadId: 1 });

  // Datos de ejemplo para poder probar la API desde el primer arranque.
  if ((await facultades.countDocuments()) === 0) {
    await facultades.insertMany([
      { nombre: 'Ingeniería de Sistemas', codigo: 'ING-SIS', creadoEn: new Date() },
      { nombre: 'Ciencias de la Salud', codigo: 'SALUD', creadoEn: new Date() },
      { nombre: 'Administración de Empresas', codigo: 'ADMON', creadoEn: new Date() }
    ]);
    console.log('Facultades de ejemplo creadas.');
  }

  console.log(`Conectado a MongoDB (base de datos: ${NOMBRE_BD})`);
  return { cliente, db, facultades, estudiantes };
}

async function cerrarDB() {
  if (cliente) {
    await cliente.close();
    cliente = null;
  }
}

module.exports = { conectarDB, cerrarDB };
