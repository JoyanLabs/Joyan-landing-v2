# 🚀 Joyan Landing V2

Plantilla de landing page de alta calidad construida con **Astro 7** + **Tailwind CSS**.

## Características

- ✅ Alta performance y SEO
- ✅ Soporte para React, Vue y Svelte
- ✅ Dark mode integrado
- ✅ Componentes UI reutilizables
- ✅ Agent Skills integrados para desarrollo con IA
- ✅ Configuración de VSCode lista para usar
- ✅ Linting con ESLint y formateo con Prettier

## Inicio Rápido

```bash
# Clonar el repositorio
git clone https://github.com/JoyanLabs/joyan-landing-template.git

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

## Comandos

| Comando        | Descripción            |
| -------------- | ---------------------- |
| `pnpm dev`     | Servidor de desarrollo |
| `pnpm build`   | Build para producción  |
| `pnpm preview` | Preview del build      |
| `pnpm check`   | Verificar tipos y lint |
| `pnpm lint`    | ESLint lint            |
| `pnpm format`  | Prettier formateo      |
| `pnpm fix`     | ESLint auto-fix        |

## Estructura

```
src/
├── components/    # Componentes
├── layouts/       # Layouts
├── pages/         # Páginas
├── content/       # Contenido
└── config.yaml    # Configuración principal
```

## Personalización

### 1. Configuración del Sitio (`src/config.yaml`)

Este es el archivo principal que debes modificar para personalizar tu proyecto:

```yaml
site:
  name: 'Tu Sitio' # Nombre de tu proyecto
  site: 'https://tudominio.com' # URL de producción
  base: '/' # Ruta base (dejar '/' para root)

metadata:
  title:
    default: 'Tu Sitio' # Título por defecto
    template: '%s — Tu Sitio' # Template: %s se reemplaza con el título de la página
  description: 'Descripción de tu sitio para SEO'

  # Open Graph (para compartir en redes sociales)
  openGraph:
    site_name: 'Tu Sitio'
    images:
      - url: '~/assets/images/tu-imagen.png'
        width: 1200
        height: 628

  # Twitter Cards
  twitter:
    handle: '@tucuenta'
    site: '@tucuenta'
    cardType: summary_large_image

i18n:
  language: es # Idioma: 'es', 'en', etc.
  textDirection: ltr # Dirección: 'ltr' o 'rtl'

# Blog (opcional)
apps:
  blog:
    isEnabled: false # Cambiar a true para habilitar blog
    postsPerPage: 6

    post:
      isEnabled: false
      permalink: '/%slug%'

    list:
      isEnabled: false
      pathname: 'blog'

# Analytics (opcional)
analytics:
  vendors:
    googleAnalytics:
      id: 'G-XXXXXXXXXX' # Tu ID de Google Analytics

# Tema
ui:
  theme: 'system' # 'system' | 'light' | 'dark' | 'light:only' | 'dark:only'
```

### 2. Navegación (`src/navigation.ts`)

Personaliza los enlaces del menú:

```typescript
export const headerData = {
  links: [
    { text: 'Inicio', href: '/' },
    { text: 'Servicios', href: '/services' },
    { text: 'Contacto', href: '/contact' },
  ],
  actions: [
    {
      text: 'Comenzar',
      href: '/contact',
      variant: 'primary',
    },
  ],
};
```

### 3. Páginas

Las páginas principales están en `src/pages/`:

- `index.astro` - Página de inicio (personaliza el contenido)
- `404.astro` - Página de error 404
- `privacy.md` - Política de privacidad
- `terms.md` - Términos y condiciones

### 4. Estilos

Los estilos globales están en:

- `src/assets/styles/tailwind.css` - Configuración de Tailwind
- `src/components/CustomStyles.astro` - Estilos personalizados

### 5. Imágenes y Assets

Coloca tus imágenes en:

- `public/` - Assets estáticos (favicons, imágenes públicas)
- `src/assets/images/` - Imágenes procesadas por Astro

## Documentación

- [AGENTS.md](./AGENTS.md) - Configuración de Agent Skills
- [skills/](./skills/) - Agent Skills disponibles

## Stack Tecnológico

- **Astro** 7.x - Framework principal
- **React** 19.x - Componentes interactivos
- **Vue** 3.5 - Componentes alternativos
- **Tailwind CSS** 4.x - Estilos
- **TypeScript** 5.x - Tipado
- **ESLint** 10.x - Linter
- **Prettier** 3.x - Formatter

## Actualizar Dependencias

Para actualizar todas las dependencias a sus últimas versiones:

```bash
pnpm update
```

Para ver qué paquetes necesitan actualización:

```bash
pnpm outdated
```

## Licencia

MIT - JoyanLabs
