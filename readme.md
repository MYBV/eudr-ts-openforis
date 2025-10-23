# Script info edur TypeScript


## Construido con 🛠️
El script fue desarrollado bajo plataforma windows.

- [Nodejs](https://nodejs.org) - Entorno de ejecuciónJS. `(V 22)`
- [earthengine](https://www.npmjs.com/package/@google/earthengine) - SDK de google para earth engine.
- [npm](https://www.npmjs.com/) - Permite instalar diversas librerías utilizadas en el proyecto. `(V 10.9)`

## Configuración ⚙️

## Instalación y ejecución 🚀

_Ejecuta los siguientes pasos en orden:_

### Paso 1 Clona el repositorio:

`$ git clone ` ⏬

### Paso 2 Entra a la carpeta 'eudr-ts-openforis' y ejecuta el siquiente comando:

`$ npm install` 📂

Esto instalará todas las dependencias necesarias incluyendo:
- `@google/earthengine`
- `csv-parse`

### Paso 3 Verificar archivo credentials.json:

Asegúrate de tener el archivo `credentials.json` en la raíz del proyecto con las credenciales de Google Earth Engine Service Account.

### Paso 4 Runner del script:

`$ npm run start:dev` ▶️


En la carpeta temp que existe dentro de la raíz del proyecto copia un polígono con el formato esperado y extensión `.json`, por ejemplo `b10c8a65-426d-4bd3-bcd9-460e0230e08f.json`
Luuego ejecuta el siguiente comando utilizando el nombre dado al archivo.

```bash
 npm run start temp/b10c8a65-426d-4bd3-bcd9-460e0230e08f.json
```

## Solución de Problemas Comunes

### Error: "Cannot read properties of undefined (reading 'sum')"

Este error ocurre cuando Earth Engine no está correctamente inicializado o cuando hay un problema con las declaraciones de tipos. 

**Solución:**
1. Verificar que `credentials.json` existe
2. Verificar que el proyecto de GEE tiene los permisos correctos
3. Reinstalar dependencias: `npm install --force`

### Error: "node_modules not found"

**Solución:**
```bash
npm install
```

### Error de compilación TypeScript

**Solución:**
```bash
# Limpiar y reinstalar
rm -rf node_modules dist
npm install
npm run build
```

## Estructura Esperada

```
eudr-ts-openforis/
├── credentials.json       # Credenciales de GEE
├── package.json
├── tsconfig.json
├── src/
│   ├── analysis.ts       # Script principal
│   ├── types/
│   ├── modules/
│   └── parameters/
├── public/
│   └── lookup_gee_datasets.csv
└── temp/                 # Archivos GeoJSON de entrada
```

