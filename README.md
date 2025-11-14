# 🌦️ AlertaClimática

Sistema de alertas climáticas en tiempo real con autenticación de usuarios.

## 📋 Descripción

**AlertaClimática** es una aplicación web multiplataforma que permite a los usuarios recibir alertas climáticas personalizadas en tiempo real. El sistema cuenta con un panel administrativo con autenticación segura mediante Firebase.

## 🏗️ Arquitectura

El proyecto sigue el patrón **MVC (Modelo-Vista-Controlador)** con capas adicionales para mantener un código limpio y escalable:

```
AlertaClimática/
├── assets/
│   ├── css/           # Estilos CSS
│   ├── js/            # Scripts JavaScript generales
│   └── img/           # Imágenes y recursos
├── config/            # Configuración (Firebase, ENV)
│   ├── env-loader.js
│   └── firebase-config.js (generado, no en Git)
├── models/            # Modelos de datos
│   └── User.js
├── views/             # Vistas HTML
│   ├── login.html
│   ├── register.html
│   └── dashboard.html
├── controllers/       # Controladores (lógica de negocio)
│   └── AuthController.js
├── services/          # Servicios (patrón Singleton)
│   └── FirebaseService.js
├── repositories/      # Capa de acceso a datos
│   └── AuthRepository.js
├── utils/             # Utilidades y helpers
│   └── validator.js
├── .env               # Variables de entorno (NO en Git)
├── .env.example       # Ejemplo de variables de entorno
├── .gitignore
├── index.html         # Página principal
└── README.md
```

## 🚀 Tecnologías

- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos
- **JavaScript ES6+** - Lógica de aplicación
- **Bootstrap 5** - Framework de UI responsivo
- **Font Awesome** - Iconos
- **Firebase Authentication** - Autenticación de usuarios
- **Git** - Control de versiones

## 🔐 Seguridad

El proyecto implementa principios de **Codificación Segura**:

- ✅ Variables de entorno para credenciales sensibles (`.env`)
- ✅ Validación estricta de entradas
- ✅ Manejo seguro de tokens JWT
- ✅ Manejo robusto de errores con `try...catch`
- ✅ Patrón Singleton para servicios externos
- ✅ Separación de responsabilidades (MVC + Capas)

## 📦 Instalación y Configuración

### Paso 1: Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd AlertaClimatica
```

### Paso 2: Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Authentication** > **Sign-in method** > **Email/Password**
4. Ve a **Configuración del proyecto** > **General** > **Tus apps**
5. Agrega una app web y copia las credenciales

### Paso 3: Configurar Variables de Entorno

1. Copia el archivo de ejemplo:
   ```bash
   copy .env.example .env
   ```

2. Edita `.env` con tus credenciales de Firebase:
   ```env
   FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
   FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   FIREBASE_PROJECT_ID=tu-proyecto-id
   FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789
   FIREBASE_APP_ID=1:123456789:web:abcdef123456
   ```

### Paso 4: Ejecutar la Aplicación

Puedes usar cualquier servidor local:

**Opción 1: Live Server (VS Code)**
- Instala la extensión "Live Server"
- Click derecho en `index.html` > "Open with Live Server"

**Opción 2: Python**
```bash
python -m http.server 8000
```

**Opción 3: Node.js (http-server)**
```bash
npx http-server
```

Luego abre tu navegador en `http://localhost:8000`

## 📖 Uso

1. **Página Principal**: Información sobre AlertaClimática
2. **Registro**: Crear una cuenta nueva
3. **Inicio de Sesión**: Acceder con tu cuenta
4. **Dashboard**: Panel administrativo (después de autenticarse)

## 🌿 Estrategia de Versionamiento Git

El proyecto sigue la estrategia de **Git Flow**:

- `main` - Producción estable
- `develop` - Desarrollo integrado
- `feature/*` - Nuevas características
- `fix/*` - Correcciones de bugs

### Convención de Commits

```bash
feat: Agregar nueva funcionalidad
fix: Corregir un bug
docs: Actualizar documentación
style: Cambios de formato
refactor: Refactorización de código
test: Agregar pruebas
chore: Tareas de mantenimiento
```

### Versionamiento Semántico

- `v1.0.0-auth-firebase` - Autenticación con Firebase
- `v1.1.0-alerts-module` - Módulo de alertas
- `v1.2.0-admin-panel` - Panel administrativo

## 👥 Contribuir

1. Crea una rama desde `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/nueva-funcionalidad
   ```

2. Realiza tus cambios y commits:
   ```bash
   git add .
   git commit -m "feat: descripción de la funcionalidad"
   ```

3. Push y crea un Pull Request:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```

## 📝 Licencia

Este proyecto es parte del curso de desarrollo web y está disponible para fines educativos.

## 🤝 Autor

**AlertaClimática Team**
- Proyecto Final - Desarrollo Web

---

⚡ **AlertaClimática** - Mantente seguro, mantente informado.

