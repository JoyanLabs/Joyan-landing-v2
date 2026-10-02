# Guía de Joyan Landing

Guía breve para desarrollar, revisar y desplegar el sitio real de JoyanLabs. El proyecto usa Astro con salida estática, Tailwind CSS y pnpm.

## Tabla de contenidos

- [Requisitos](#requisitos)
- [Desarrollo local](#desarrollo-local)
- [Estructura real](#estructura-real)
- [Contenido y configuración](#contenido-y-configuración)
- [Motion graphics](#motion-graphics)
- [Validación](#validación)
- [Docker y Dokploy](#docker-y-dokploy)
- [Colaboración](#colaboración)
- [Seguridad](#seguridad)

## Requisitos

- Node.js 22, según `.nvmrc`
- pnpm 10
- Docker, solo para probar la imagen localmente

Instalá las dependencias respetando el lockfile:

```bash
pnpm install --frozen-lockfile
```

## Desarrollo local

```bash
pnpm dev
```

Comandos disponibles:

| Comando | Uso |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm check` | Astro check, ESLint y verificaciones del repositorio |
| `pnpm build` | Compilación de producción en `dist/` |
| `pnpm preview` | Previsualización de la compilación |
| `pnpm lint` | Ejecución de ESLint |
| `pnpm format` | Formateo con Prettier |
| `pnpm fix` | Correcciones automáticas de ESLint |

## Estructura real

- `src/pages/`: rutas en español e inglés, incluyendo Inicio, Bitácora y sus detalles.
- `src/components/`: componentes reutilizables de Astro, React y Vue.
- `src/data/journal/`: contenido publicado de la Bitácora en `en/` y `es/`.
- `src/config.yaml`: configuración del sitio y metadatos SEO.
- `src/assets/`: imágenes procesadas y estilos globales.
- `public/`: archivos estáticos.
- `Dockerfile`, `docker-compose.yml` y `nginx/`: despliegue de la salida estática.

## Contenido y configuración

Para cambiar el sitio, revisá primero:

1. `src/pages/` para las páginas y rutas.
2. `src/components/` para las piezas reutilizables.
3. `src/data/journal/` para las entradas de la Bitácora.
4. `src/config.yaml` para el nombre, SEO, idioma y tema.
5. `src/assets/styles/` para los tokens y estilos globales.

No agregues como contenido publicado borradores internos, credenciales ni datos que no estén autorizados para exposición pública.

## Motion graphics

Los films de la landing se generan desde `scripts/motion-src/` y se versionan en
`public/assets/motion/`. Para reproducirlos, entender el pipeline o leer lo que
se aprendió al hacerlo:

- [`docs/GUIA-MOTION.md`](./docs/GUIA-MOTION.md)

El contrato visual (qué color significa qué, presupuestos, accesibilidad) sigue
en [`docs/DESIGN.md`](./docs/DESIGN.md).

## Validación

Antes de abrir un pull request, ejecutá:

```bash
pnpm check
pnpm build
```

Si el cambio es visual, revisá también la página en el servidor local y describí el impacto en el pull request.

## Docker y Dokploy

La imagen usa un build multi-stage: compila Astro y sirve `dist/` con nginx. El contenedor escucha en el puerto `8080`.

```bash
docker compose up --build
```

Dokploy debe usar el `Dockerfile` o el `docker-compose.yml` del repositorio y exponer el puerto interno `8080`. Las variables y secretos de despliegue se configuran en Dokploy; nunca se guardan en Git.

## Colaboración

El flujo esperado es fork y pull request:

1. Creá un fork del repositorio de JoyanLabs.
2. Creá una rama enfocada desde la rama base actual.
3. Implementá un cambio pequeño y explicable.
4. Ejecutá `pnpm check` y `pnpm build`.
5. Abrí un pull request con el contexto, las verificaciones y cualquier impacto visual o de despliegue.

No incluyas en el pull request archivos de trabajo local de `.atl/` u `openspec/`, salvo que se soliciten explícitamente.

## Seguridad

No subas archivos `.env`, credenciales, tokens, claves privadas, certificados ni configuraciones locales de despliegue. Para reportar una vulnerabilidad, usá el mecanismo privado de Security Advisories de GitHub cuando esté disponible; no abras un issue público con información sensible. Consultá [SECURITY.md](./SECURITY.md).
