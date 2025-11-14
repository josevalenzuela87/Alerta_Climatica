# 🌿 Estrategia de Control de Versiones - Git Flow

## 📋 Estructura de Ramas

Este proyecto utiliza **Git Flow** como estrategia de versionamiento:

```
main (producción)
  ├── v0.1.0-fase1-estructura
  │
develop (desarrollo integrado)
  ├── feature/auth-firebase        ← Fase 2
  ├── feature/auth-validation      ← Fase 3
  ├── fix/login-validation
  └── ...
```

---

## 🎯 Ramas Principales

### 1. `main` - Producción
- Código estable y listo para producción
- Nunca se trabaja directamente aquí
- Solo recibe merges desde `develop`
- Cada merge tiene un tag de versión

### 2. `develop` - Desarrollo
- Rama de integración
- Contiene las últimas funcionalidades completadas
- Base para crear ramas `feature/*` y `fix/*`

---

## 🔧 Ramas de Trabajo

### 3. `feature/*` - Nuevas Funcionalidades

Crear desde `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-funcionalidad
```

Ejemplos:
- `feature/auth-firebase` - Autenticación con Firebase
- `feature/alerts-module` - Módulo de alertas
- `feature/dashboard-stats` - Estadísticas del dashboard

**Flujo de trabajo**:
```bash
# 1. Crear rama
git checkout -b feature/auth-firebase

# 2. Trabajar y hacer commits
git add .
git commit -m "feat: implementar FirebaseService con patrón Singleton"

# 3. Al finalizar, merge a develop
git checkout develop
git merge feature/auth-firebase

# 4. Opcional: eliminar rama local
git branch -d feature/auth-firebase
```

### 4. `fix/*` - Corrección de Bugs

Crear desde `develop` (o `main` si es crítico):
```bash
git checkout develop
git checkout -b fix/descripcion-del-bug
```

Ejemplos:
- `fix/login-validation` - Corregir validación de login
- `fix/firebase-connection` - Corregir conexión Firebase
- `fix/responsive-layout` - Corregir diseño responsive

---

## 📝 Convención de Commits

Utilizamos **Conventional Commits** para mensajes descriptivos:

### Formato:
```
<tipo>: <descripción breve>

[cuerpo opcional con más detalles]

[footer opcional]
```

### Tipos de Commits:

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `feat` | Nueva funcionalidad | `feat: agregar formulario de registro` |
| `fix` | Corrección de bug | `fix: corregir validación de email` |
| `docs` | Documentación | `docs: actualizar README con instrucciones` |
| `style` | Formato (sin cambio de lógica) | `style: formatear código con prettier` |
| `refactor` | Refactorización | `refactor: extraer lógica de validación` |
| `test` | Agregar o modificar tests | `test: agregar tests para AuthRepository` |
| `chore` | Tareas de mantenimiento | `chore: actualizar dependencias` |
| `perf` | Mejora de rendimiento | `perf: optimizar carga de imágenes` |

### Ejemplos de Buenos Commits:

```bash
# Commit simple
git commit -m "feat: implementar login con Firebase"

# Commit con descripción detallada
git commit -m "feat: implementar patrón Singleton para FirebaseService

- Crear clase FirebaseService con getInstance()
- Garantizar una única instancia de Firebase
- Agregar manejo de errores en inicialización
- Documentar métodos con JSDoc

Fase 2: Implementación de Patrones y Arquitectura"

# Commit de corrección
git commit -m "fix: validación de email en formulario de registro

El regex anterior no validaba correctamente emails con subdominios.
Actualizado a un patrón más robusto."

# Commit de documentación
git commit -m "docs: agregar guía de instalación de Firebase"
```

---

## 🏷️ Versionamiento Semántico (Tags)

Utilizamos **Semantic Versioning**: `MAJOR.MINOR.PATCH`

```
v1.2.3-descripcion
│ │ │  └─ Descripción (opcional)
│ │ └──── PATCH: Correcciones de bugs
│ └────── MINOR: Nuevas funcionalidades compatibles
└──────── MAJOR: Cambios incompatibles (breaking changes)
```

### Estrategia de Tags por Fase:

| Fase | Versión | Tag | Descripción |
|------|---------|-----|-------------|
| Fase 1 | 0.1.0 | `v0.1.0-fase1-estructura` | Estructura inicial |
| Fase 2 | 0.2.0 | `v0.2.0-fase2-patrones` | Singleton + Repository |
| Fase 3 | 0.3.0 | `v0.3.0-fase3-auth` | Autenticación completa |
| Fase 4 | 1.0.0 | `v1.0.0-auth-firebase` | Primera versión estable |

### Crear Tags:

```bash
# Tag anotado (recomendado)
git tag -a v0.2.0-fase2-patrones -m "Fase 2: Patrones y Arquitectura

- Implementado patrón Singleton para FirebaseService
- Creado AuthRepository con métodos de autenticación
- Agregada capa de abstracción de datos"

# Ver todos los tags
git tag -l

# Ver detalles de un tag
git show v0.2.0-fase2-patrones

# Push de tags al remoto (cuando tengas un remoto)
git push origin --tags
```

---

## 📊 Flujo de Trabajo Completo

### Escenario 1: Nueva Funcionalidad (Feature)

```bash
# 1. Asegurarse de estar en develop actualizado
git checkout develop
git pull origin develop

# 2. Crear rama feature
git checkout -b feature/auth-firebase

# 3. Trabajar y hacer commits frecuentes
git add services/FirebaseService.js
git commit -m "feat: crear FirebaseService con patrón Singleton"

git add repositories/AuthRepository.js
git commit -m "feat: crear AuthRepository con login y register"

git add controllers/AuthController.js
git commit -m "feat: crear AuthController con validación de entradas"

# 4. Finalizar y mergear a develop
git checkout develop
git merge feature/auth-firebase

# 5. Crear tag si es un hito importante
git tag -a v0.2.0-fase2-patrones -m "Fase 2 completada"

# 6. Opcional: limpiar rama feature
git branch -d feature/auth-firebase
```

### Escenario 2: Corrección de Bug (Fix)

```bash
# 1. Crear rama fix desde develop
git checkout develop
git checkout -b fix/login-validation

# 2. Corregir el bug
git add utils/validator.js
git commit -m "fix: corregir regex de validación de email

El patrón anterior no validaba emails con múltiples subdominios.
Actualizado con regex más robusto según RFC 5322."

# 3. Mergear a develop
git checkout develop
git merge fix/login-validation

# 4. Si es crítico, también mergear a main
git checkout main
git merge fix/login-validation
git tag -a v0.2.1-hotfix-validation -m "Hotfix: validación de email"

# 5. Volver a develop
git checkout develop
```

### Escenario 3: Release a Producción

```bash
# 1. Asegurarse que develop está completo y probado
git checkout develop
git status

# 2. Mergear develop a main
git checkout main
git merge develop

# 3. Crear tag de versión
git tag -a v1.0.0-auth-firebase -m "Versión 1.0.0: Autenticación con Firebase

- Sistema de registro e inicio de sesión
- Validación de entradas
- Manejo de tokens JWT
- Panel administrativo
- Documentación completa"

# 4. Push todo al remoto (cuando tengas uno)
git push origin main
git push origin develop
git push origin --tags

# 5. Volver a develop para continuar desarrollo
git checkout develop
```

---

## 📜 Historial del Proyecto

### Commits Realizados:

#### **v0.1.0-fase1-estructura** (Commit inicial)
```
feat: estructura inicial del proyecto AlertaClimática con arquitectura MVC

- Estructura de carpetas MVC (models, views, controllers, services, repositories)
- Páginas HTML: index, login, register, dashboard  
- Estilos CSS con diseño moderno y minimalista
- Sistema de variables de entorno (.env) para credenciales Firebase
- Configuración de .gitignore para proteger información sensible
- Documentación completa (README.md, INSTRUCCIONES_FIREBASE.md)
- package.json con scripts de desarrollo
- Diseño responsivo con Bootstrap 5

Fase 1: Configuración de Firebase y Dependencias
```

---

## 🎯 Estado Actual del Proyecto

```bash
# Ver rama actual
git branch

# Salida esperada:
# * develop
#   main

# Ver tags
git tag -l

# Salida:
# v0.1.0-fase1-estructura

# Ver historial
git log --oneline --graph --all

# Ver estado
git status
```

---

## ✅ Checklist de Control de Versiones

- [x] Repositorio Git inicializado
- [x] Rama `main` creada
- [x] Rama `develop` creada
- [x] Commit inicial realizado
- [x] Tag `v0.1.0-fase1-estructura` creado
- [ ] Rama `feature/auth-firebase` (Fase 2)
- [ ] Tag `v0.2.0-fase2-patrones` (Fase 2)
- [ ] Tag `v0.3.0-fase3-auth` (Fase 3)
- [ ] Tag `v1.0.0-auth-firebase` (Release)

---

## 🆘 Comandos Útiles

```bash
# Ver ramas
git branch -a

# Ver últimos commits
git log --oneline -10

# Ver diferencias
git diff

# Ver estado
git status

# Ver tags
git tag -l

# Detalles de un tag
git show v0.1.0-fase1-estructura

# Crear rama
git checkout -b feature/nueva-funcionalidad

# Cambiar de rama
git checkout develop

# Eliminar rama local
git branch -d nombre-rama

# Ver historial gráfico
git log --graph --oneline --all --decorate

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1

# Ver commits de un archivo
git log -- path/to/file
```

---

## 📚 Referencias

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

**Última actualización**: Fase 1 - Estructura Inicial
**Próximo hito**: v0.2.0-fase2-patrones (Implementación de Patrones)

