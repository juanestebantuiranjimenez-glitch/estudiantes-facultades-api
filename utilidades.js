// Un id de MongoDB es un texto hexadecimal de 24 caracteres.
function esObjectId(valor) {
  return typeof valor === 'string' && /^[a-f\d]{24}$/i.test(valor);
}

// Lee page y limit de la URL y calcula cuántos documentos saltar.
// Ejemplo: ?page=2&limit=5 -> salta 5 y trae 5.
function obtenerPaginacion(query = {}) {
  const pagina = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limite = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 5));

  return { pagina, limite, saltar: (pagina - 1) * limite };
}

// Datos que se devuelven junto con la lista para que el cliente sepa
// cuántas páginas existen.
function datosPaginacion(pagina, limite, total) {
  return {
    pagina,
    limite,
    total,
    totalPaginas: Math.ceil(total / limite) || 0
  };
}

module.exports = { esObjectId, obtenerPaginacion, datosPaginacion };
