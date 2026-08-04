# JoyanLabs Integration - Módulo Virtual

## Overview

Este documento explica cómo funciona el sistema de configuración centralizada de JoyanLabs Landing Template mediante un módulo virtual.

## ¿Qué es un Módulo Virtual?

Un **módulo virtual** es un módulo que no existe como archivo físico en el disco, sino que se genera dinámicamente en tiempo de ejecución (build time). Esto permite:

- Centralizar configuración sin imports complejos
- Recargar cambios automáticamente
- Mantener el código limpio

## Cómo Funciona

### 1. El Flujo

```
src/config.yaml
      ↓
vendor/integration/index.ts (lee el YAML)
      ↓
Genera módulo virtual "joyanlabs:config"
      ↓
Cualquier archivo puede importar desde "joyanlabs:config"
```

### 2. En Astro Config

El plugin se registra en `astro.config.ts`:

```typescript
import joyanlabs from './vendor/integration';

export default defineConfig({
  integrations: [
    joyanlabs({
      config: './src/config.yaml',
    }),
    // ... otras integraciones
  ],
});
```

### 3. El Plugin Vite

El plugin crea un módulo virtual usando la API de Vite:

```typescript
// vendor/integration/index.ts
{
  name: "vite-plugin-joyanlabs-config",
  resolveId(id) {
    if (id === "joyanlabs:config") {
      return "\0joyanlabs:config"; // Virtual module
    }
  },
  load(id) {
    if (id === "\0joyanlabs:config") {
      // Genera exports desde el config.yaml
      return `
        export const SITE = ${JSON.stringify(SITE)};
        export const I18N = ${JSON.stringify(I18N)};
        export const METADATA = ${JSON.stringify(METADATA)};
        export const APP_BLOG = ${JSON.stringify(APP_BLOG)};
        export const UI = ${JSON.stringify(UI)};
        export const ANALYTICS = ${JSON.stringify(ANALYTICS)};
      `;
    }
  }
}
```

## Exported Constants

El módulo virtual exporta las siguientes constantes:

| Constante   | Descripción                                     |
| ----------- | ----------------------------------------------- |
| `SITE`      | Configuración del sitio (nombre, dominio, etc.) |
| `I18N`      | Configuración de internacionalización           |
| `METADATA`  | Metadata SEO y OpenGraph                        |
| `APP_BLOG`  | Configuración del blog                          |
| `UI`        | Configuración de interfaz (tema, colores)       |
| `ANALYTICS` | Configuración de analytics                      |

## Cómo Usar

### En cualquier archivo:

```typescript
// Importar desde el módulo virtual
import { SITE, I18N, METADATA } from 'joyanlabs:config';

// Usar los valores
const siteName = SITE.name; // "Mi Sitio"
const language = I18N.language; // "es"
const title = METADATA.title.default; // "Título por defecto"
```

### Ejemplo en un componente Astro:

```astro
---
import { SITE } from 'joyanlabs:config';
---

<footer>
  © {new Date().getFullYear()}
  {SITE.name}
</footer>
```

## Cómo Funciona el TypeScript

El archivo `vendor/integration/types.d.ts` declara el módulo virtual para que TypeScript pueda autocompletar:

```typescript
declare module 'joyanlabs:config' {
  export const SITE: {
    name: string;
    site?: string;
    base?: string;
    trailingSlash?: boolean;
    googleSiteVerificationId?: string;
  };
  // ... otras exportaciones
}
```

## Ventajas de Este Sistema

1. **Centralización**: Toda la configuración en un solo lugar (`config.yaml`)
2. **Type Safety**: TypeScript sabe los tipos de cada constante
3. **Hot Reload**: Cambios en config.yaml se reflejan automáticamente
4. **Simplicidad**: No necesitas instalar packages adicionales

## Modificando la Configuración

1. Edita `src/config.yaml`
2. Los cambios se aplican automáticamente en el próximo build
3. No necesitas reiniciar el servidor de desarrollo

## Archivo de Configuración

El archivo principal está en `src/config.yaml`:

```yaml
site:
  name: 'Mi Sitio'
  site: 'https://misitio.com'
  base: '/'
  trailingSlash: false

metadata:
  title:
    default: 'Mi Sitio'
    template: '%s — Mi Sitio'
  description: 'Descripción del sitio'

i18n:
  language: es
  textDirection: ltr

ui:
  theme: system

analytics:
  vendors:
    googleAnalytics:
      id: null
```

---

**Nota**: Este sistema es una adaptación del original de AstroWind, migrado y renombrado para JoyanLabs.
