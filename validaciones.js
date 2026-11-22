const { esObjectId } = require('./utilidades');

// \p{L} significa "cualquier letra" en Unicode, así que acepta
// tildes (á, é, í, ó, ú, ü) y también la ñ. La bandera "u" activa Unicode.
const REGEX_NOMBRE = /^[\p{L}\s]+$/u;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Código de facultad: de 2 a 10 caracteres, mayúsculas, números o guiones.
const REGEX_CODIGO = /^[A-Z0-9-]{2,10}$/;

// Quita espacios al inicio y al final, y deja un solo espacio entre palabras.
// Ejemplo: "  José   Ñáñez  " -> "José Ñáñez"
function limpiarTexto(valor) {
  if (typeof valor !== 'string') return '';
  return valor.trim().replace(/\s+/g, ' ');
}

function esEntero(valor) {
  if (typeof valor === 'number') return Number.isInteger(valor);
  if (typeof valor === 'string') return /^-?\d+$/.test(valor.trim());
  return false;
}

function validarEstudiante(body = {}) {
  const nombre = limpiarTexto(body.nombre);
  const email = limpiarTexto(body.email).toLowerCase();
  const facultadId = limpiarTexto(body.facultadId);
  const edad = body.edad;
  const semestre = body.semestre;

  // VALIDACIÓN 1: campos obligatorios (se revisan después del trim).
  if (
    !nombre ||
    !email ||
    !facultadId ||
    edad === undefined ||
    edad === null ||
    edad === '' ||
    semestre === undefined ||
    semestre === null ||
    semestre === ''
  ) {
    return {
      error: 'Los campos nombre, email, edad, semestre y facultadId son obligatorios.'
    };
  }

  // VALIDACIÓN 2: formato y rangos.
  if (nombre.length < 3 || nombre.length > 80) {
    return { error: 'El nombre debe tener entre 3 y 80 caracteres.' };
  }

  if (!REGEX_NOMBRE.test(nombre)) {
    return { error: 'El nombre solo puede contener letras (con tildes y ñ) y espacios.' };
  }

  if (!REGEX_EMAIL.test(email)) {
    return { error: 'El email no tiene un formato válido.' };
  }

  if (!esEntero(edad) || Number(edad) < 15 || Number(edad) > 100) {
    return { error: 'La edad debe ser un número entero entre 15 y 100.' };
  }

  if (!esEntero(semestre) || Number(semestre) < 1 || Number(semestre) > 10) {
    return { error: 'El semestre debe ser un número entero entre 1 y 10.' };
  }

  if (!esObjectId(facultadId)) {
    return { error: 'facultadId no es un id válido de MongoDB.' };
  }

  return {
    valor: {
      nombre,
      email,
      edad: Number(edad),
      semestre: Number(semestre),
      facultadId
    }
  };
}

function validarFacultad(body = {}) {
  const nombre = limpiarTexto(body.nombre);
  const codigo = limpiarTexto(body.codigo).toUpperCase();

  // VALIDACIÓN 1: campos obligatorios (se revisan después del trim).
  if (!nombre || !codigo) {
    return { error: 'Los campos nombre y codigo son obligatorios.' };
  }

  // VALIDACIÓN 2: formato y longitud.
  if (nombre.length < 3 || nombre.length > 80) {
    return { error: 'El nombre de la facultad debe tener entre 3 y 80 caracteres.' };
  }

  if (!REGEX_NOMBRE.test(nombre)) {
    return { error: 'El nombre solo puede contener letras (con tildes y ñ) y espacios.' };
  }

  if (!REGEX_CODIGO.test(codigo)) {
    return {
      error: 'El código debe tener entre 2 y 10 caracteres: letras mayúsculas, números o guiones.'
    };
  }

  return { valor: { nombre, codigo } };
}

module.exports = { limpiarTexto, validarEstudiante, validarFacultad };
