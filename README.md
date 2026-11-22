# API Estudiantes - Facultades

Proyecto final de Base de Datos: API REST con **CRUD completo** para el modelo
**1:N facultades -> estudiantes**, con **paginación**, **3 validaciones**,
**trim** y soporte para **tildes y ñ**.

Stack: **Node.js + Express + MongoDB** (driver oficial `mongodb`).

---

## 1. Modelo 1:N

MongoDB no usa tablas, pero la relación se representa con una **referencia**:
cada estudiante guarda el `_id` de su facultad en el campo `facultadId`.

```text
facultades (1)                     estudiantes (N)
------------------                 -------------------------
_id          <-----------------    facultadId
nombre                             _id
codigo (único)                     nombre
creadoEn                           email (único)
                                   edad
                                   semestre
                                   creadoEn
```

- Una facultad tiene **muchos** estudiantes.
- Un estudiante pertenece a **una sola** facultad.
- El índice sobre `facultadId` hace rápidas las consultas por facultad.
- En `GET /api/facultades` se usa `$lookup` para contar los estudiantes de cada facultad.
- No se puede eliminar una facultad que tenga estudiantes (integridad de la relación).

---

## 2. Requisitos

- Node.js 20.19 o superior (probado con Node 24).
- MongoDB local escuchando en `mongodb://127.0.0.1:27017`.
- `npm` (viene con Node.js).

Verificar que MongoDB esté activo:

```bash
mongosh --quiet --eval "db.runCommand({ ping: 1 })"
```

Debe responder `{ ok: 1 }`.

Si el servicio está detenido:

```bash
sudo systemctl start mongod
```

---

## 3. Instalación y ejecución

```bash
npm install
npm start
```

La API queda disponible en:

```text
http://localhost:3000/api
```

Modo desarrollo (reinicia al guardar cambios):

```bash
npm run dev
```

### Variables de entorno (opcionales)

| Variable       | Valor por defecto                |
| -------------- | -------------------------------- |
| `PORT`         | `3000`                           |
| `MONGODB_URI`  | `mongodb://127.0.0.1:27017`      |
| `MONGODB_DB`   | `estudiantes_facultades`         |

Ejemplo:

```bash
PORT=4000 MONGODB_DB=mi_base npm start
```

Al primer arranque se crean **3 facultades de ejemplo** si la colección está
vacía, para poder probar la API de inmediato.

---

## 4. Endpoints

### Facultades

| Método   | Ruta                                        | Descripción                                  |
| -------- | ------------------------------------------- | -------------------------------------------- |
| `GET`    | `/api/facultades?page=1&limit=5`            | Lista paginada (incluye total de estudiantes) |
| `GET`    | `/api/facultades/:id`                       | Consulta una facultad                        |
| `GET`    | `/api/facultades/:id/estudiantes?page=1&limit=5` | Estudiantes de la facultad (1:N)        |
| `POST`   | `/api/facultades`                           | Crea una facultad                            |
| `PUT`    | `/api/facultades/:id`                       | Actualiza una facultad                       |
| `DELETE` | `/api/facultades/:id`                       | Elimina una facultad sin estudiantes         |

### Estudiantes

| Método   | Ruta                                             | Descripción                          |
| -------- | ------------------------------------------------ | ------------------------------------ |
| `GET`    | `/api/estudiantes?page=1&limit=5&facultadId=...` | Lista paginada (filtro opcional)     |
| `GET`    | `/api/estudiantes/:id`                           | Consulta un estudiante y su facultad |
| `POST`   | `/api/estudiantes`                               | Crea un estudiante                   |
| `PUT`    | `/api/estudiantes/:id`                           | Actualiza un estudiante              |
| `DELETE` | `/api/estudiantes/:id`                           | Elimina un estudiante                |

`PUT` recibe todos los campos (actualización completa). El `limit` por defecto
es `5` y el máximo permitido es `50`.

---

## 5. Flujo de prueba con curl

### 5.1 Ver las facultades de ejemplo

```bash
curl http://localhost:3000/api/facultades
```

Guardar el id de la primera facultad en una variable (requiere `jq`):

```bash
FACULTAD_ID=$(curl -s http://localhost:3000/api/facultades | jq -r '.data[0]._id')
echo "$FACULTAD_ID"
```

Si no tienes `jq`, copia el `_id` que aparece en la respuesta.

### 5.2 Crear una facultad

```bash
curl -X POST http://localhost:3000/api/facultades \
  -H "Content-Type: application/json" \
  -d '{"nombre":"  Ingeniería   Ambiental  ","codigo":"ing-amb"}'
```

El nombre se guarda como `Ingeniería Ambiental` (trim y espacios normalizados)
y el código como `ING-AMB`.

### 5.3 Crear un estudiante

```bash
curl -X POST http://localhost:3000/api/estudiantes \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\": \"  José   Ñáñez  \",
    \"email\": \"  JOSE.NANEZ@correo.com  \",
    \"edad\": 20,
    \"semestre\": 4,
    \"facultadId\": \"$FACULTAD_ID\"
  }"
```

Se guarda `nombre: "José Ñáñez"` y `email: "jose.nanez@correo.com"`.

### 5.4 Listar con paginación

```bash
curl "http://localhost:3000/api/estudiantes?page=1&limit=2"
curl "http://localhost:3000/api/estudiantes?page=2&limit=2"
```

Respuesta:

```json
{
  "data": [ ... ],
  "paginacion": {
    "pagina": 1,
    "limite": 2,
    "total": 5,
    "totalPaginas": 3
  }
}
```

### 5.5 Filtrar por facultad

```bash
curl "http://localhost:3000/api/estudiantes?facultadId=$FACULTAD_ID&page=1&limit=5"
curl "http://localhost:3000/api/facultades/$FACULTAD_ID/estudiantes?page=1&limit=5"
```

### 5.6 Consultar un estudiante

```bash
ESTUDIANTE_ID=$(curl -s "http://localhost:3000/api/estudiantes?limit=1" | jq -r '.data[0]._id')
curl "http://localhost:3000/api/estudiantes/$ESTUDIANTE_ID"
```

La respuesta incluye el objeto `facultad` para evidenciar la relación 1:N.

### 5.7 Actualizar

```bash
curl -X PUT "http://localhost:3000/api/estudiantes/$ESTUDIANTE_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\": \"José Ñáñez\",
    \"email\": \"jose.nanez@correo.com\",
    \"edad\": 21,
    \"semestre\": 5,
    \"facultadId\": \"$FACULTAD_ID\"
  }"
```

### 5.8 Eliminar

```bash
curl -X DELETE "http://localhost:3000/api/estudiantes/$ESTUDIANTE_ID"
```

---

## 6. Las 3 validaciones

### Validación 1: campos obligatorios (después del trim)

`nombre`, `email`, `edad`, `semestre` y `facultadId` son obligatorios. Si falta
uno, la API responde `400`. Para una facultad son obligatorios `nombre` y `codigo`.

```bash
curl -X POST http://localhost:3000/api/estudiantes \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana"}'
```

### Validación 2: formato y rangos

- Nombre: solo letras (con tildes y ñ) y espacios, entre 3 y 80 caracteres.
- Email: formato `usuario@dominio.com`.
- Edad: entero entre 15 y 100.
- Semestre: entero entre 1 y 10.
- Código de facultad: de 2 a 10 caracteres (`A-Z`, `0-9` o `-`).

```bash
# Falla: el nombre contiene un número
curl -X POST http://localhost:3000/api/estudiantes \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana2","email":"ana@correo.com","edad":20,"semestre":4,"facultadId":"'"$FACULTAD_ID"'"}'
```

### Validación 3: unicidad

- El `email` de un estudiante no puede repetirse.
- El `codigo` de una facultad no puede repetirse.

Se valida en el código y además con un **índice único** en MongoDB. Si se
intenta repetir, la API responde `409 Conflict`.

```bash
# Falla: email repetido
curl -X POST http://localhost:3000/api/estudiantes \
  -H "Content-Type: application/json" \
  -d '{"nombre":"José Ñáñez","email":"jose.nanez@correo.com","edad":22,"semestre":6,"facultadId":"'"$FACULTAD_ID"'"}'
```

### Integridad referencial (parte del modelo 1:N)

- No se crea un estudiante con una facultad que no existe (`400`).
- No se elimina una facultad que tenga estudiantes (`409`).

```bash
curl -X DELETE "http://localhost:3000/api/facultades/$FACULTAD_ID"
```

---

## 7. Trim y soporte de tildes/ñ

El `trim` está centralizado en `validaciones.js`:

```js
function limpiarTexto(valor) {
  if (typeof valor !== 'string') return '';
  return valor.trim().replace(/\s+/g, ' ');
}
```

- `trim()` quita espacios al inicio y al final.
- `replace(/\s+/g, ' ')` deja un solo espacio entre palabras.
- El email se pasa a minúsculas y el código de facultad a mayúsculas.

Las tildes y la ñ se aceptan con una expresión regular Unicode:

```js
const REGEX_NOMBRE = /^[\p{L}\s]+$/u;
```

`\p{L}` significa **cualquier letra Unicode**, así que acepta `á é í ó ú ü ñ`
y también letras de otros idiomas. La bandera `u` activa el modo Unicode.
MongoDB guarda los textos en UTF-8, por lo que `José Ñáñez` se conserva tal cual.
Además, las listas usan `collation: { locale: 'es', strength: 1 }` para ordenar
correctamente en español.

---

## 8. Estructura del proyecto

```text
.
├── server.js              # Arranque de Express, rutas base y manejo de errores
├── db.js                  # Conexión a MongoDB, índices y datos de ejemplo
├── validaciones.js        # Trim + las 3 validaciones
├── utilidades.js          # Paginación y validación de ObjectId
├── rutas/
│   ├── facultades.js      # CRUD de facultades + endpoint 1:N
│   └── estudiantes.js     # CRUD de estudiantes + paginación
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

---

## 9. Git: ramas del proyecto

El repositorio tiene dos ramas:

- `main`: rama principal (queda solo con el commit inicial).
- `juan-dev`: aquí está todo el desarrollo.

Ver las ramas y los commits:

```bash
git branch
git log --oneline --graph --all
```

Cuando quieras pasar los cambios a `main`:

```bash
git checkout main
git merge juan-dev
```

Si más adelante agregas un remoto (GitHub, GitLab, etc.):

```bash
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
git push origin juan-dev
```

---

## 10. Preguntas frecuentes para la sustentación

**¿Dónde está la relación 1:N?**
En el campo `facultadId` de cada estudiante. Una facultad puede tener muchos
estudiantes, pero cada estudiante apunta a una sola facultad. Se consulta con
`GET /api/facultades/:id/estudiantes` y se cuenta con `$lookup`.

**¿Por qué usar referencia y no incrustar los estudiantes dentro de la facultad?**
Porque los estudiantes son entidades independientes, pueden ser muchos y se
actualizan o eliminan individualmente. Con referencias se evita duplicar datos.

**¿Cómo funciona la paginación?**
Se leen `page` y `limit`, se calcula `skip = (page - 1) * limit` y se usa
`.skip(saltar).limit(limite)`. También se cuenta el total con `countDocuments`
para devolver `totalPaginas`.

**¿Qué hace el trim y dónde se aplica?**
Quita espacios al inicio y al final de los textos antes de validar y guardar.
Está en `limpiarTexto()` y se aplica a nombre, email, código y `facultadId`.

**¿Cómo se aceptan tildes y ñ?**
Con la expresión regular `/^[\p{L}\s]+$/u`. `\p{L}` acepta letras Unicode
(incluidas á, é, í, ó, ú, ü, ñ). MongoDB almacena UTF-8.

**¿Cuáles son las 3 validaciones?**
1. Campos obligatorios después del trim.
2. Formato y rangos (nombre, email, edad, semestre, código).
3. Unicidad de email y código (con índice único).

**¿Qué pasa si se elimina una facultad con estudiantes?**
La API responde `409 Conflict` y no la elimina, para no dejar estudiantes
huérfanos. Primero hay que eliminar o reasignar esos estudiantes.

**¿Qué código de estado usa la API?**
`200` para consultas y actualizaciones, `201` al crear, `400` para datos
inválidos, `404` cuando no existe, `409` para duplicados o conflictos y `500`
para errores internos.
