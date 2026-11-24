# API Estudiantes - Facultades (documentos embebidos)

Proyecto final de Base de Datos: API REST con **CRUD completo** para el modelo
**1:N facultades -> estudiantes** usando **documentos embebidos** en MongoDB,
con **paginación**, **3 validaciones**, **trim** y soporte para **tildes y ñ**.

Stack: **Node.js + Express + MongoDB** (driver oficial `mongodb`).

**Repositorio público:**
<https://github.com/juanestebantuiranjimenez-glitch/estudiantes-facultades-api>

> En esta versión **no existe una colección `estudiantes`**. Cada facultad es un
> documento que contiene un arreglo llamado `estudiantes` con sus estudiantes
> embebidos.

---

## 1. Modelo 1:N embebido

```text
colección: facultades

{
  "_id": ObjectId("..."),
  "nombre": "Ingeniería de Sistemas",
  "codigo": "ING-SIS",
  "estudiantes": [                     <-- arreglo embebido (lado N)
    {
      "_id": ObjectId("..."),
      "nombre": "José Ñáñez",
      "email": "jose.nanez@correo.com",
      "edad": 20,
      "semestre": 4,
      "creadoEn": ISODate("...")
    },
    {
      "_id": ObjectId("..."),
      "nombre": "María Peña",
      "email": "maria.pena@correo.com",
      "edad": 21,
      "semestre": 5,
      "creadoEn": ISODate("...")
    }
  ],
  "creadoEn": ISODate("...")
}
```

- Una facultad tiene **muchos** estudiantes dentro de su arreglo `estudiantes`.
- Un estudiante pertenece a **una sola** facultad porque vive dentro de ella.
- No hay que hacer `JOIN` ni `$lookup`: al consultar la facultad ya vienen sus estudiantes.
- Si se elimina la facultad, sus estudiantes embebidos se eliminan con ella.
- Los estudiantes se modifican con operadores de MongoDB:
  - `$push` para agregar.
  - `$pull` para eliminar.
  - `$set` con `estudiantes.$` para actualizar el estudiante encontrado.
- Índices creados: `codigo` (único), `estudiantes.email` y `estudiantes._id`.

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

Al primer arranque se crean **3 facultades de ejemplo con 6 estudiantes
embebidos**, para poder probar la API y ver los documentos en Compass.

---

## 4. Ver la base de datos en MongoDB Compass

MongoDB crea la base de datos **cuando se inserta el primer documento**. Por eso,
si nunca has ejecutado la API, en Compass no aparece nada. La base se crea al
correr `npm start` por primera vez.

Pasos:

1. Verifica que MongoDB esté corriendo:

   ```bash
   mongosh --quiet --eval "db.runCommand({ ping: 1 })"
   ```

2. Arranca la API una vez:

   ```bash
   npm start
   ```

3. Abre **MongoDB Compass** y conéctate a:

   ```text
   mongodb://127.0.0.1:27017
   ```

   (también funciona `mongodb://localhost:27017`).

4. Pulsa el botón de **refrescar** en Compass.

5. Debes ver la base de datos `estudiantes_facultades` y, dentro, **una sola
   colección** llamada `facultades`:

   ```text
   estudiantes_facultades
   └── facultades
       ├── Ingeniería de Sistemas
       │   └── estudiantes: [ ... ]   <-- documentos embebidos
       ├── Ciencias de la Salud
       │   └── estudiantes: [ ... ]
       └── Administración de Empresas
           └── estudiantes: [ ... ]
   ```

6. Abre cualquier documento de `facultades` y despliega el arreglo
   `estudiantes`. Ahí están los estudiantes embebidos.

**No verás una colección `estudiantes` separada**: eso es correcto en este
modelo, porque los estudiantes están dentro de cada facultad.

Si aun así no aparece la base:

- Confirma que Compass está conectado a `127.0.0.1:27017` y no a otra conexión.
- Pulsa refrescar en Compass.
- Revisa desde la terminal:

  ```bash
  mongosh --quiet --eval "db.getMongo().getDBNames()"
  ```

- Ejecuta `npm start` al menos una vez para que se cree la base.

Si venías de una versión anterior con una colección `estudiantes` separada,
puedes eliminarla (esta versión no la usa):

```bash
mongosh estudiantes_facultades --eval "db.estudiantes.drop()"
```

---

## 5. Endpoints

### Tabla resumen de endpoints

| # | Método   | Ruta                                              | Descripción                                              |
| - | -------- | ------------------------------------------------- | -------------------------------------------------------- |
| 1 | `GET`    | `/api`                                            | Ayuda con la lista de endpoints                          |
| 2 | `GET`    | `/api/facultades?page=1&limit=5`                  | Lista **paginada** de facultades con `totalEstudiantes`  |
| 3 | `GET`    | `/api/facultades/:id`                             | Facultad completa con sus estudiantes embebidos          |
| 4 | `GET`    | `/api/facultades/:id/estudiantes?page=1&limit=5`  | Estudiantes embebidos **paginados** (`$slice`)           |
| 5 | `POST`   | `/api/facultades`                                 | Crea una facultad con `estudiantes: []`                  |
| 6 | `POST`   | `/api/facultades/:id/estudiantes`                 | **Agrega 1 estudiante embebido** a la facultad (`$push`) |
| 7 | `PUT`    | `/api/facultades/:id`                             | Actualiza nombre y código de la facultad                 |
| 8 | `DELETE` | `/api/facultades/:id`                             | Elimina la facultad y sus estudiantes (cascada)          |
| 9 | `GET`    | `/api/estudiantes?page=1&limit=5&facultadId=...`  | Lista global **paginada** de todos los embebidos         |
| 10 | `GET`   | `/api/estudiantes/:id`                            | Consulta un estudiante y su facultad                     |
| 11 | `POST`  | `/api/estudiantes`                                | Alternativa: crea el estudiante con `facultadId` en el cuerpo |
| 12 | `PUT`   | `/api/estudiantes/:id`                            | Actualiza los datos del estudiante embebido              |
| 13 | `DELETE`| `/api/estudiantes/:id`                            | Saca el estudiante del arreglo embebido (`$pull`)        |

> El endpoint pedido en el enunciado (`POST /courses/:id/students`) está
> implementado como **`POST /api/facultades/:id/estudiantes`**: la facultad es el
> "course" y el estudiante es el registro embebido que se agrega.

### Facultades

| Método   | Ruta                                        | Descripción                                            |
| -------- | ------------------------------------------- | ------------------------------------------------------ |
| `GET`    | `/api/facultades?page=1&limit=5`            | Lista paginada con `totalEstudiantes`                  |
| `GET`    | `/api/facultades/:id`                       | Documento completo con estudiantes embebidos           |
| `GET`    | `/api/facultades/:id/estudiantes?page=1&limit=5` | Arreglo embebido paginado con `$slice`            |
| `POST`   | `/api/facultades`                           | Crea una facultad con `estudiantes: []`                |
| `POST`   | `/api/facultades/:id/estudiantes`           | Agrega un estudiante embebido a esa facultad           |
| `PUT`    | `/api/facultades/:id`                       | Actualiza nombre y código                              |
| `DELETE` | `/api/facultades/:id`                       | Elimina la facultad y sus estudiantes embebidos        |

### Estudiantes

| Método   | Ruta                                             | Descripción                                       |
| -------- | ------------------------------------------------ | ------------------------------------------------- |
| `GET`    | `/api/estudiantes?page=1&limit=5&facultadId=...` | Lista global paginada de todos los embebidos      |
| `GET`    | `/api/estudiantes/:id`                           | Consulta un estudiante y su facultad              |
| `POST`   | `/api/estudiantes`                               | Inserta el estudiante dentro de su facultad       |
| `PUT`    | `/api/estudiantes/:id`                           | Actualiza los datos del estudiante embebido       |
| `DELETE` | `/api/estudiantes/:id`                           | Saca el estudiante del arreglo embebido           |

`PUT` recibe todos los campos. Para actualizar un estudiante debes enviar la
**misma facultad** donde está embebido; para cambiarlo de facultad hay que
eliminarlo y crearlo de nuevo. El `limit` por defecto es `5` y el máximo es `50`.

---

## 6. Flujo de prueba con curl

### 6.1 Ver las facultades de ejemplo

```bash
curl http://localhost:3000/api/facultades
```

Cada facultad trae `totalEstudiantes` (3, 2 y 1) pero no el arreglo completo.

### 6.2 Guardar el id de una facultad

```bash
FACULTAD_ID=$(curl -s http://localhost:3000/api/facultades \
  | jq -r '.data[] | select(.codigo=="ING-SIS") | ._id')

echo "$FACULTAD_ID"
```

Si no tienes `jq`, copia el `_id` que aparece en la respuesta.

### 6.3 Ver una facultad con sus estudiantes embebidos

```bash
curl "http://localhost:3000/api/facultades/$FACULTAD_ID"
```

La respuesta incluye el arreglo `estudiantes` dentro del mismo documento.

### 6.4 Paginar los estudiantes de una facultad

```bash
curl "http://localhost:3000/api/facultades/$FACULTAD_ID/estudiantes?page=1&limit=2"
curl "http://localhost:3000/api/facultades/$FACULTAD_ID/estudiantes?page=2&limit=2"
```

La primera página trae 2 de 3 estudiantes y `totalPaginas: 2`.

### 6.5 Listar todos los estudiantes con paginación

```bash
curl "http://localhost:3000/api/estudiantes?page=1&limit=5"
curl "http://localhost:3000/api/estudiantes?page=2&limit=5"
```

Como los estudiantes están embebidos, la API recorre las facultades, arma una
lista plana, la ordena y la pagina. La respuesta incluye el objeto `facultad` de
cada estudiante.

### 6.6 Filtrar por facultad

```bash
curl "http://localhost:3000/api/estudiantes?facultadId=$FACULTAD_ID&page=1&limit=5"
```

### 6.7 Crear una facultad

```bash
NUEVA_FACULTAD_ID=$(curl -s -X POST http://localhost:3000/api/facultades \
  -H "Content-Type: application/json" \
  -d '{"nombre":"  Ingeniería   Ambiental  ","codigo":"ing-amb"}' \
  | jq -r '.data._id')

echo "$NUEVA_FACULTAD_ID"
```

El nombre se guarda como `Ingeniería Ambiental` (trim y espacios normalizados)
y el código como `ING-AMB`.

### 6.8 Agregar 1 estudiante embebido a una facultad (endpoint principal)

```bash
curl -X POST "http://localhost:3000/api/facultades/$NUEVA_FACULTAD_ID/estudiantes" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "  Ana   Pérez  ",
    "email": "  ANA.PEREZ@correo.com  ",
    "edad": 20,
    "semestre": 4
  }'
```

La facultad se toma del **`:id` de la URL** (no hace falta enviar `facultadId`).
Se guarda `nombre: "Ana Pérez"` y `email: "ana.perez@correo.com"` **dentro del
documento de la facultad** usando `$push`. Responde `201` con el estudiante y su
facultad.

Guardar el id del estudiante:

```bash
ESTUDIANTE_ID=$(curl -s "http://localhost:3000/api/facultades/$NUEVA_FACULTAD_ID/estudiantes" \
  | jq -r '.data[0]._id')

echo "$ESTUDIANTE_ID"
```

### 6.9 Consultar el estudiante

```bash
curl "http://localhost:3000/api/estudiantes/$ESTUDIANTE_ID"
```

La respuesta incluye su facultad.

### 6.10 Actualizar el estudiante

```bash
curl -X PUT "http://localhost:3000/api/estudiantes/$ESTUDIANTE_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\": \"  Ana   Pérez   Gómez  \",
    \"email\": \"ana.perez@correo.com\",
    \"edad\": 21,
    \"semestre\": 5,
    \"facultadId\": \"$NUEVA_FACULTAD_ID\"
  }"
```

### 6.11 Eliminar el estudiante

```bash
curl -X DELETE "http://localhost:3000/api/estudiantes/$ESTUDIANTE_ID"
```

El estudiante se saca del arreglo con `$pull`.

### 6.12 Borrado en cascada de una facultad

Al estar embebidos, si se elimina la facultad también se eliminan sus
estudiantes. Ejemplo con una facultad temporal:

```bash
TEMP_ID=$(curl -s -X POST http://localhost:3000/api/facultades \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Facultad Temporal","codigo":"TEMP"}' \
  | jq -r '.data._id')

EST_TEMP_ID=$(curl -s -X POST "http://localhost:3000/api/facultades/$TEMP_ID/estudiantes" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Carlos Ruiz",
    "email": "carlos.ruiz@correo.com",
    "edad": 22,
    "semestre": 6
  }' \
  | jq -r '.data._id')

# Elimina la facultad y su estudiante embebido
curl -X DELETE "http://localhost:3000/api/facultades/$TEMP_ID"

# El estudiante ya no existe
curl "http://localhost:3000/api/estudiantes/$EST_TEMP_ID"
```

---

## 7. Las 3 validaciones

### Validación 1: campos obligatorios (después del trim)

`nombre`, `email`, `edad`, `semestre` y `facultadId` son obligatorios. Si falta
uno, la API responde `400`. Para una facultad son obligatorios `nombre` y `codigo`.

```bash
curl -X POST "http://localhost:3000/api/facultades/$FACULTAD_ID/estudiantes" \
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
curl -X POST "http://localhost:3000/api/facultades/$FACULTAD_ID/estudiantes" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana2","email":"ana2@correo.com","edad":20,"semestre":4}'
```

### Validación 3: unicidad

- El `email` de un estudiante no puede repetirse entre **todos** los embebidos.
- El `codigo` de una facultad no puede repetirse.

El código de facultad tiene un **índice único** en MongoDB. El email se valida
con una consulta antes de insertar o actualizar, porque un índice único sobre
`estudiantes.email` no es posible al ser un arreglo. Si se repite, la API
responde `409 Conflict`.

```bash
# Falla: email que ya existe en los datos de ejemplo
curl -X POST "http://localhost:3000/api/facultades/$FACULTAD_ID/estudiantes" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"José Ñáñez","email":"jose.nanez@correo.com","edad":22,"semestre":6}'
```

### Integridad del modelo embebido

- No se crea un estudiante si la facultad no existe (`400`).
- Un estudiante no puede quedar huérfano: siempre está dentro de una facultad.
- Al eliminar una facultad, se eliminan sus estudiantes embebidos.
- Para cambiar un estudiante de facultad se elimina y se crea de nuevo.

---

## 8. Trim y soporte de tildes/ñ

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
Las listas ordenan en español con `collation` y `localeCompare('es')`.

---

## 9. Estructura del proyecto

```text
.
├── server.js              # Arranque de Express, rutas base y manejo de errores
├── db.js                  # Conexión, índices y datos de ejemplo embebidos
├── validaciones.js        # Trim + las 3 validaciones
├── utilidades.js          # Paginación y validación de ObjectId
├── rutas/
│   ├── facultades.js      # CRUD de facultades + paginación con $slice
│   └── estudiantes.js     # CRUD sobre el arreglo embebido
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

No hay carpeta ni colección de estudiantes: todo está en `rutas/estudiantes.js`
y dentro de los documentos de `facultades`.

---

## 10. Git y repositorio

El historial se construyó con **commits separados por funcionalidad**:

```bash
git log --oneline
```

Ramas:

- `main`: rama principal con la entrega final.
- `juan-dev`: rama de desarrollo; se integra a `main` con merge.

**Repositorio público:**
<https://github.com/juanestebantuiranjimenez-glitch/estudiantes-facultades-api>

```bash
git clone https://github.com/juanestebantuiranjimenez-glitch/estudiantes-facultades-api.git
cd estudiantes-facultades-api
```

---

## 11. Guía de sustentación en PDF

La guía de sustentación se entrega **por separado** junto con el proyecto
(archivo `Guia-Sustentacion.pdf`). No se incluye en el repositorio; cubre el
modelo 1:N, CRUD, paginación, validaciones, trim, tildes, endpoints y demo con
curl.

---

## 12. Preguntas frecuentes para la sustentación

**¿Dónde está la relación 1:N?**
En el arreglo `estudiantes` dentro de cada documento de `facultades`. Una
facultad contiene muchos estudiantes y cada estudiante está dentro de una sola
facultad.

**¿Por qué no hay una colección `estudiantes`?**
Porque el modelo es embebido: los estudiantes son subdocumentos de la facultad.
Eso permite leer la facultad con sus estudiantes en una sola consulta y eliminar
todo en cascada.

**¿Por qué embeber en vez de usar referencias?**
Porque en este caso los estudiantes se consultan junto con su facultad y no se
comparten entre facultades. Se evita un `JOIN`/`$lookup` y se simplifica el
borrado. La desventaja es el límite de 16 MB por documento y que embeber no
sirve si los datos se comparten o crecen demasiado.

**¿Cómo se agrega, actualiza y elimina un estudiante embebido?**
- Agregar: `$push` al arreglo `estudiantes`.
- Actualizar: `$set` con `estudiantes.$`, que apunta al estudiante encontrado.
- Eliminar: `$pull` para sacarlo del arreglo.

**¿Cómo funciona la paginación?**
- En `/api/facultades/:id/estudiantes` se usa `$slice` para traer solo el tramo
  del arreglo que corresponde a la página.
- En `/api/estudiantes` se recorren las facultades, se arma una lista plana y se
  pagina con `slice`.
- Siempre se devuelve `pagina`, `limite`, `total` y `totalPaginas`.

**¿Cómo se garantiza que el email no se repita?**
Con una consulta `{ 'estudiantes.email': email }` antes de insertar o actualizar.
No se puede crear un índice único sobre `estudiantes.email` porque es un arreglo;
por eso la validación se hace en el código. El código de facultad sí tiene índice
único.

**¿Qué pasa si se elimina una facultad con estudiantes?**
Se eliminan también sus estudiantes, porque están embebidos dentro del mismo
documento. La respuesta indica cuántos estudiantes se borraron.

**¿Se puede cambiar un estudiante de facultad?**
La API no lo permite directamente porque habría que sacar el subdocumento de un
arreglo e insertarlo en otro. Para hacerlo se elimina el estudiante y se crea en
la otra facultad. En producción se podría hacer con `$pull` + `$push` y una
transacción.

**¿Cuáles son las 3 validaciones?**
1. Campos obligatorios después del trim.
2. Formato y rangos (nombre, email, edad, semestre, código).
3. Unicidad de email y código.

**¿Qué código de estado usa la API?**
`200` para consultas y actualizaciones, `201` al crear, `400` para datos
inválidos, `404` cuando no existe, `409` para duplicados o conflictos y `500`
para errores internos.
