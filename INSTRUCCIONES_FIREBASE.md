# 🔥 Guía Paso a Paso: Configuración de Firebase

Esta guía te llevará a través del proceso completo de configuración de Firebase Authentication para AlertaClimática.

---

## 📋 PASO 1: Crear Proyecto en Firebase Console

### 1.1 Acceder a Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Agregar proyecto"** (o "Create a project")

### 1.2 Configurar el Proyecto

1. **Nombre del proyecto**: `alerta-climatica` (o el nombre que prefieras)
2. Haz clic en **Continuar**
3. **Google Analytics**: Puedes activarlo o desactivarlo (opcional para este proyecto)
4. Si lo activas, selecciona tu cuenta de Analytics
5. Haz clic en **Crear proyecto**
6. Espera a que se cree el proyecto (puede tardar unos segundos)
7. Haz clic en **Continuar**

---

## 📱 PASO 2: Registrar Aplicación Web

### 2.1 Agregar App Web

1. En la página principal del proyecto, busca el ícono **"Web"** (`</>`)
2. Haz clic en él para agregar una aplicación web
3. **Nombre de la app**: `AlertaClimática Web`
4. **NO** marques "También configurar Firebase Hosting" (por ahora)
5. Haz clic en **Registrar app**

### 2.2 Copiar Configuración

Verás un bloque de código similar a este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "alerta-climatica.firebaseapp.com",
  projectId: "alerta-climatica",
  storageBucket: "alerta-climatica.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

**⚠️ IMPORTANTE**: Guarda esta información, la necesitarás en el siguiente paso.

8. Haz clic en **Continuar a la consola**

---

## 🔐 PASO 3: Habilitar Authentication

### 3.1 Acceder a Authentication

1. En el menú lateral izquierdo, busca **"Authentication"**
2. Haz clic en **"Comenzar"** (o "Get started")

### 3.2 Configurar Método de Inicio de Sesión

1. Ve a la pestaña **"Sign-in method"** (Método de inicio de sesión)
2. Busca **"Correo electrónico/contraseña"** (Email/Password)
3. Haz clic en él
4. **Activa** el interruptor para "Correo electrónico/contraseña"
5. **NO actives** "Vínculo de correo electrónico (sin contraseña)" por ahora
6. Haz clic en **Guardar**

### 3.3 Configurar Dominios Autorizados (Opcional)

1. Ve a la pestaña **"Settings"** (Configuración)
2. En **"Authorized domains"** (Dominios autorizados)
3. Por defecto, `localhost` ya está autorizado para desarrollo
4. Si despliegas en producción, agrega tu dominio aquí

---

## 🔑 PASO 4: Configurar Variables de Entorno

### 4.1 Crear Archivo .env

1. En la raíz de tu proyecto, crea un archivo llamado exactamente: `.env`
2. **NO** lo subas a Git (ya está en `.gitignore`)

### 4.2 Copiar Credenciales

Usando los valores que copiaste en el **PASO 2.2**, rellena tu archivo `.env`:

```env
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
FIREBASE_AUTH_DOMAIN=alerta-climatica.firebaseapp.com
FIREBASE_PROJECT_ID=alerta-climatica
FIREBASE_STORAGE_BUCKET=alerta-climatica.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**⚠️ IMPORTANTE**: 
- Reemplaza TODOS los valores de ejemplo con tus valores reales
- NO uses comillas en los valores
- NO dejes espacios alrededor del signo `=`

---

## ✅ PASO 5: Verificar Instalación

### 5.1 Estructura de Archivos

Asegúrate de tener esta estructura:

```
AlertaClimática/
├── .env                    ← Tu archivo con credenciales reales
├── .gitignore              ← Incluye .env
├── config/
│   └── env-loader.js       ← Cargador de variables
├── views/
│   ├── login.html
│   └── register.html
└── ...
```

### 5.2 Verificar .gitignore

Abre `.gitignore` y verifica que contenga:

```
.env
.env.local
.env.development
.env.production
```

Esto asegura que tus credenciales NO se suban a Git.

---

## 🚀 PASO 6: Probar la Aplicación

### 6.1 Iniciar Servidor Local

**Opción A - Live Server (VS Code)**:
1. Instala la extensión "Live Server"
2. Click derecho en `index.html` → "Open with Live Server"

**Opción B - Node.js**:
```bash
npm start
```

**Opción C - Python**:
```bash
python -m http.server 8000
```

### 6.2 Probar Registro

1. Abre tu navegador en `http://localhost:8000` (o el puerto correspondiente)
2. Haz clic en **"Registrarse"**
3. Llena el formulario con datos de prueba
4. Haz clic en **"Crear Cuenta"**

### 6.3 Verificar en Firebase Console

1. Ve a Firebase Console → Authentication → Users
2. Deberías ver el usuario que acabas de crear

---

## 🔍 PASO 7: Verificar Configuración

### 7.1 Abrir Consola del Navegador

Presiona `F12` o click derecho → "Inspeccionar"

### 7.2 Buscar Mensajes

En la pestaña "Console", deberías ver:

✅ **Mensajes Correctos**:
```
✓ Firebase inicializado correctamente
✓ Firebase Service: Instancia Singleton creada
```

❌ **Mensajes de Error Comunes**:

**Error 1**: `Firebase: Error (auth/api-key-not-valid)`
- **Solución**: Verifica que `FIREBASE_API_KEY` sea correcta

**Error 2**: `Firebase: Error (auth/invalid-api-key)`
- **Solución**: Copia nuevamente la API Key desde Firebase Console

**Error 3**: Variables con "tu_api_key_aqui"
- **Solución**: No configuraste el archivo `.env` correctamente

---

## 📝 PASO 8: Principios de Seguridad Aplicados

### ✅ Codificación Segura Implementada:

1. **Separación de Credenciales**: 
   - Archivo `.env` no versionado en Git
   - `.gitignore` protege información sensible

2. **Validación de Variables**:
   - `env-loader.js` valida que todas las credenciales estén presentes
   - Muestra advertencias si faltan variables

3. **Patrón Singleton**:
   - Una sola instancia de Firebase en toda la aplicación
   - Evita múltiples inicializaciones y conexiones

4. **Configuración de Ejemplo**:
   - `.env.example` proporciona plantilla sin datos sensibles
   - Documenta qué variables son necesarias

---

## 🆘 Solución de Problemas Comunes

### Problema 1: No puedo crear el archivo .env

**Windows**:
```powershell
New-Item -Path .env -ItemType File
notepad .env
```

**Mac/Linux**:
```bash
touch .env
nano .env
```

### Problema 2: Firebase no se inicializa

1. Verifica que el archivo `.env` esté en la raíz del proyecto
2. Verifica que NO haya espacios en los valores
3. Reinicia el servidor local
4. Limpia la caché del navegador (Ctrl + Shift + Delete)

### Problema 3: Error de CORS

- Asegúrate de usar un servidor local (no abrir el archivo HTML directamente)
- `file://` NO funcionará, necesitas `http://localhost`

---

## 📚 Recursos Adicionales

- [Documentación oficial de Firebase](https://firebase.google.com/docs)
- [Firebase Authentication Guide](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com)

---

## ✅ Checklist de Verificación

Antes de continuar a la **Fase 2**, verifica:

- [ ] Proyecto creado en Firebase Console
- [ ] App Web registrada en Firebase
- [ ] Authentication habilitado (Email/Password)
- [ ] Archivo `.env` creado con credenciales reales
- [ ] Archivo `.env` en `.gitignore`
- [ ] Servidor local funcionando
- [ ] Puedes acceder a `login.html` sin errores 404
- [ ] Consola del navegador muestra mensaje de Firebase inicializado

---

## 🎯 Siguiente Fase

Una vez completados todos estos pasos, estarás listo para la **Fase 2: Implementación de Patrones y Arquitectura**.

¡Di **"¡Listo, siguiente fase!"** cuando hayas terminado! 🚀

