# 📘 Guía de Joyan Landing Template

## 🎯 Introducción

Esta guía está diseñada para ayudarte a entender y personalizar la plantilla AstroWind para tu empresa Joyan. Como desarrollador backend, esta guía te explica conceptos frontend de forma clara y práctica.

---

## 📚 Tabla de Contenidos

1. [¿Qué es Astro?](#qué-es-astro)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Configuración Principal](#configuración-principal)
4. [Componentes Principales](#componentes-principales)
5. [Layouts (Plantillas de Página)](#layouts-plantillas-de-página)
6. [Sistema de Rutas](#sistema-de-rutas)
7. [Widgets Disponibles](#widgets-disponibles)
8. [Qué Usar y Qué No Usar](#qué-usar-y-qué-no-usar)
9. [Guía de Personalización Paso a Paso](#guía-de-personalización-paso-a-paso)
10. [Comandos Útiles](#comandos-útiles)
11. [Despliegue](#despliegue)

---

## 🚀 ¿Qué es Astro?

**Astro** es un framework frontend moderno que se diferencia de otros (React, Vue, etc.) por su filosofía:

- **Genera sitios estáticos** por defecto (HTML puro)
- **Carga cero JavaScript al cliente** a menos que lo necesites explícitamente
- **Arquitectura de islas**: solo los componentes interactivos cargan JS
- **Rendimiento extremo**: páginas super rápidas
- **Sintaxis similar a JSX** pero más simple

### Conceptos Clave para Backend Devs:

```
.astro = Similar a un template engine (como Blade, Jinja2, EJS)
---      = Separador entre "lógica del servidor" y "template HTML"
```

**Ejemplo de componente Astro:**

```astro
---
// Esto es como el "backend" del componente (se ejecuta en build time)
const nombre = 'Joyan';
const fecha = new Date();
---

<!-- Esto es el template HTML que se renderiza -->
<div>
  <h1>Hola {nombre}</h1>
  <p>Fecha: {fecha.toLocaleDateString()}</p>
</div>
```

---

## 🏗️ Arquitectura del Proyecto

### Estructura de Carpetas Explicada

```
joyan-landing/
│
├── src/                          # Todo tu código fuente
│   ├── pages/                    # Sistema de rutas (cada archivo = una URL)
│   │   ├── index.astro          # → https://tudominio.com/
│   │   ├── about.astro          # → https://tudominio.com/about
│   │   ├── pricing.astro        # → https://tudominio.com/pricing
│   │   └── landing/             # → https://tudominio.com/landing/*
│   │
│   ├── layouts/                  # Plantillas reutilizables
│   │   ├── Layout.astro         # Layout base (HTML, head, body)
│   │   ├── PageLayout.astro     # Layout con Header/Footer
│   │   └── LandingLayout.astro  # Layout específico para landing pages
│   │
│   ├── components/              # Componentes reutilizables
│   │   ├── widgets/            # Secciones completas (Hero, Features, etc.)
│   │   ├── ui/                 # Componentes pequeños (Button, Form, etc.)
│   │   ├── blog/               # Componentes del blog
│   │   └── common/             # Utilidades comunes
│   │
│   ├── assets/                  # Recursos optimizados (imágenes, estilos)
│   │   ├── images/             # Imágenes que Astro optimizará
│   │   └── styles/             # Archivos CSS globales
│   │
│   ├── content/                 # Contenido del sitio (posts del blog)
│   │   └── post/               # Artículos en Markdown/MDX
│   │
│   ├── utils/                   # Funciones auxiliares
│   ├── config.yaml              # 🔑 CONFIGURACIÓN PRINCIPAL DEL SITIO
│   ├── navigation.ts            # 🔑 MENÚS Y NAVEGACIÓN
│   └── types.d.ts              # Definiciones TypeScript
│
├── public/                      # Archivos estáticos (NO se procesan)
│   ├── robots.txt
│   └── favicon.ico
│
├── astro.config.ts              # 🔑 CONFIGURACIÓN DE ASTRO
├── tailwind.config.js           # 🔑 CONFIGURACIÓN DE TAILWIND CSS
├── package.json                 # Dependencias del proyecto
└── tsconfig.json               # Configuración TypeScript
```

### 🔥 Archivos Más Importantes para Empezar:

1. **`src/config.yaml`** - Configuración del sitio (nombre, SEO, blog, etc.)
2. **`src/navigation.ts`** - Define los menús del header y footer
3. **`src/pages/index.astro`** - Tu página principal
4. **`astro.config.ts`** - Configuración técnica de Astro

---

## ⚙️ Configuración Principal

### 1. `src/config.yaml` - El Corazón de la Configuración

Este archivo controla TODA la configuración de tu sitio sin tocar código.

```yaml
site:
  name: Joyan # Nombre de tu empresa
  site: 'https://joyan.com' # Tu dominio
  base: '/' # Ruta base (dejar así)
  trailingSlash: false # URLs sin / al final

  googleSiteVerificationId: false # ID de Google Search Console

# SEO (Súper importante para Google)
metadata:
  title:
    default: Joyan # Título por defecto
    template: '%s — Joyan' # Plantilla de títulos
  description: 'Tu descripción aquí' # Descripción para Google
  robots:
    index: true # Permitir indexación
    follow: true # Seguir enlaces
  openGraph: # Para redes sociales
    site_name: Joyan
    images:
      - url: '~/assets/images/default.png' # Imagen por defecto
        width: 1200
        height: 628
    type: website
  twitter:
    handle: '@tu_twitter' # Tu usuario de Twitter/X
    site: '@tu_twitter'
    cardType: summary_large_image

# Idioma
i18n:
  language: es # Cambiar a 'es' para español
  textDirection: ltr # ltr = izquierda a derecha

# Configuración del Blog
apps:
  blog:
    isEnabled: true # ¿Quieres blog?
    postsPerPage: 6 # Posts por página

    post:
      isEnabled: true
      permalink: '/%slug%' # URL de los posts
      robots:
        index: true

    list:
      isEnabled: true
      pathname: 'blog' # /blog
      robots:
        index: true

    category:
      isEnabled: true
      pathname: 'category' # /category/nombre
      robots:
        index: true

    tag:
      isEnabled: true
      pathname: 'tag' # /tag/nombre
      robots:
        index: false

    isRelatedPostsEnabled: true # Posts relacionados
    relatedPostsCount: 4

# Analytics
analytics:
  vendors:
    googleAnalytics:
      id: null # Tu ID de Google Analytics

# UI
ui:
  theme: 'system' # 'system' | 'light' | 'dark'
```

### 2. `src/navigation.ts` - Menús de Navegación

Este archivo define todos los enlaces del sitio:

```typescript
export const headerData = {
  links: [
    {
      text: 'Inicio',
      href: '/',
    },
    {
      text: 'Servicios', // Menú con submenu
      links: [
        { text: 'Servicio 1', href: '/servicios/1' },
        { text: 'Servicio 2', href: '/servicios/2' },
      ],
    },
    {
      text: 'Acerca de',
      href: '/about',
    },
    {
      text: 'Contacto',
      href: '/contact',
    },
  ],
  actions: [
    // Botones de acción
    {
      text: 'Comenzar',
      href: '/pricing',
      target: '_blank', // Abrir en nueva pestaña
    },
  ],
};

export const footerData = {
  links: [
    // Columnas del footer
    {
      title: 'Producto',
      links: [
        { text: 'Características', href: '#' },
        { text: 'Precios', href: '#' },
      ],
    },
    {
      title: 'Soporte',
      links: [
        { text: 'Documentación', href: '#' },
        { text: 'Contacto', href: '#' },
      ],
    },
  ],
  socialLinks: [
    // Redes sociales
    { ariaLabel: 'Twitter', icon: 'tabler:brand-x', href: '#' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
  ],
  footNote: `© ${new Date().getFullYear()} Joyan. Todos los derechos reservados.`,
};
```

---

## 🧩 Componentes Principales

### Entendiendo los Componentes

En Astro, los **componentes** son piezas reutilizables de tu sitio. Piénsalo como funciones en backend que retornan HTML.

### Tipos de Componentes en este Proyecto:

#### 1. **Widgets** (`src/components/widgets/`)

Secciones completas de una página. Son como "bloques de construcción" grandes.

**Widgets disponibles:**

| Widget              | Descripción                                  | Uso típico                 |
| ------------------- | -------------------------------------------- | -------------------------- |
| **Hero**            | Sección principal con título grande + imagen | Inicio de páginas          |
| **Hero2**           | Variante del Hero con diseño diferente       | Alternativa al Hero        |
| **HeroText**        | Hero solo con texto (sin imagen)             | Landing simples            |
| **Features**        | Mostrar características con iconos           | Describir producto         |
| **Features2**       | Grid de características                      | Listado de funcionalidades |
| **Features3**       | Características con imágenes grandes         | Casos de uso detallados    |
| **Content**         | Sección de contenido + imagen lateral        | Explicar conceptos         |
| **Steps**           | Proceso paso a paso                          | Tutorial/Onboarding        |
| **Steps2**          | Variante de Steps                            | Alternativa visual         |
| **Pricing**         | Tabla de precios                             | Planes y precios           |
| **Testimonials**    | Testimonios de clientes                      | Prueba social              |
| **Stats**           | Estadísticas destacadas                      | Métricas importantes       |
| **FAQs**            | Preguntas frecuentes                         | Soporte/Ayuda              |
| **CallToAction**    | Llamada a la acción final                    | Final de páginas           |
| **Contact**         | Formulario de contacto                       | Página de contacto         |
| **Brands**          | Logos de clientes/partners                   | Confianza                  |
| **BlogLatestPosts** | Últimos posts del blog                       | Inicio                     |
| **Note**            | Nota destacada                               | Avisos importantes         |
| **Announcement**    | Barra de anuncio superior                    | Promociones                |

#### 2. **UI Components** (`src/components/ui/`)

Componentes pequeños y reutilizables.

- **Button.astro**: Botones con diferentes variantes
- **Form.astro**: Formularios
- **Headline.astro**: Encabezados de secciones
- **ItemGrid.astro**: Grid de items
- **Timeline.astro**: Línea de tiempo
- **Background.astro**: Fondos de secciones

#### 3. **Common Components** (`src/components/common/`)

Utilidades comunes del sitio.

- **Image.astro**: Componente de imagen optimizado
- **Metadata.astro**: Meta tags SEO
- **ToggleTheme.astro**: Cambiar tema claro/oscuro
- **Analytics.astro**: Scripts de analítica

---

## 📄 Layouts (Plantillas de Página)

Los **layouts** son plantillas que envuelven tus páginas. Piénsalo como un "template base" en cualquier framework backend.

### Layouts Disponibles:

#### 1. **Layout.astro** - Layout Base

El layout más básico. Solo estructura HTML sin header/footer.

```astro
---
import Layout from '~/layouts/Layout.astro';
---

<Layout metadata={{ title: 'Mi Página' }}>
  <h1>Solo contenido, sin header ni footer</h1>
</Layout>
```

**Cuándo usar:** Páginas especiales como 404, páginas de error, landing pages muy específicas.

#### 2. **PageLayout.astro** - Layout Completo

Layout con Header, Footer y Announcement.

```astro
---
import PageLayout from '~/layouts/PageLayout.astro';
---

<PageLayout metadata={{ title: 'Mi Página' }}>
  <h1>Contenido con header y footer</h1>
</PageLayout>
```

**Cuándo usar:** La mayoría de tus páginas (home, about, contact, etc.)

#### 3. **LandingLayout.astro** - Landing Pages

Layout especial para landing pages (sin header típicamente).

**Cuándo usar:** Landing pages de campañas, páginas de captación.

#### 4. **MarkdownLayout.astro** - Posts del Blog

Layout para contenido en Markdown.

**Cuándo usar:** Automático para posts del blog.

---

## 🗺️ Sistema de Rutas

Astro usa **file-based routing** (como Next.js o Nuxt). Cada archivo en `src/pages/` se convierte en una URL.

### Ejemplos:

```
src/pages/index.astro           →  https://tudominio.com/
src/pages/about.astro           →  https://tudominio.com/about
src/pages/contact.astro         →  https://tudominio.com/contact
src/pages/pricing.astro         →  https://tudominio.com/pricing
src/pages/services.astro        →  https://tudominio.com/services

src/pages/landing/
  └── product.astro             →  https://tudominio.com/landing/product

src/pages/homes/
  └── saas.astro               →  https://tudominio.com/homes/saas
```

### Rutas Dinámicas:

```
src/pages/[...blog]/index.astro     →  /blog
src/pages/[...blog]/[...page].astro →  /blog/page/2
src/pages/[...blog]/[tag]/[...page].astro →  /blog/tag/astro/page/2
```

Las carpetas con `[...]` indican rutas dinámicas (manejadas por lógica dentro del componente).

---

## 🎨 Widgets Disponibles

### Cómo Usar los Widgets

Todos los widgets siguen el mismo patrón:

```astro
---
import Hero from '~/components/widgets/Hero.astro';
---

<Hero
  tagline="Etiqueta pequeña"
  title="Título principal"
  subtitle="Subtítulo descriptivo"
  actions={[
    { text: 'Empezar', href: '/pricing', variant: 'primary' },
    { text: 'Más info', href: '#features' },
  ]}
  image={{ src: '~/assets/images/hero.png', alt: 'Hero' }}
/>
```

### Ejemplos de Widgets Comunes:

#### Hero - Sección Principal

```astro
<Hero
  actions={[
    { variant: 'primary', text: 'Comenzar', href: '/pricing' },
    { text: 'Ver demo', href: '#demo' },
  ]}
  image={{ src: '~/assets/images/hero.png', alt: 'Joyan Hero' }}
>
  <Fragment slot="title">
    Bienvenido a <span class="text-accent">Joyan</span>
  </Fragment>

  <Fragment slot="subtitle"> La mejor solución para tu negocio. Rápido, seguro y confiable. </Fragment>
</Hero>
```

#### Features - Características

```astro
<Features
  id="features"
  title="Por qué elegir Joyan"
  subtitle="Características que nos hacen diferentes"
  items={[
    {
      title: 'Rápido',
      description: 'Optimizado para máximo rendimiento',
      icon: 'tabler:rocket',
    },
    {
      title: 'Seguro',
      description: 'Encriptación de nivel empresarial',
      icon: 'tabler:shield-check',
    },
    {
      title: 'Escalable',
      description: 'Crece con tu negocio',
      icon: 'tabler:trending-up',
    },
  ]}
/>
```

#### Pricing - Precios

```astro
<Pricing
  title="Planes flexibles"
  subtitle="Elige el plan perfecto para ti"
  prices={[
    {
      title: 'Básico',
      subtitle: 'Para emprendedores',
      price: '$9',
      period: 'por mes',
      items: [{ title: '10 usuarios' }, { title: '5GB almacenamiento' }, { title: 'Soporte por email' }],
      callToAction: {
        text: 'Comenzar',
        href: '/signup',
      },
    },
    {
      title: 'Pro',
      subtitle: 'Para equipos',
      price: '$29',
      period: 'por mes',
      hasRibbon: true,
      ribbonTitle: 'Popular',
      items: [{ title: '50 usuarios' }, { title: '50GB almacenamiento' }, { title: 'Soporte prioritario' }],
      callToAction: {
        text: 'Comenzar',
        href: '/signup',
      },
    },
  ]}
/>
```

#### Testimonials - Testimonios

```astro
<Testimonials
  title="Lo que dicen nuestros clientes"
  testimonials={[
    {
      testimonial: 'Joyan transformó nuestro negocio completamente.',
      name: 'Juan Pérez',
      job: 'CEO de TechCorp',
      image: { src: '~/assets/images/client1.jpg', alt: 'Juan Pérez' },
    },
    {
      testimonial: 'El mejor servicio que he usado. Lo recomiendo 100%.',
      name: 'María García',
      job: 'Fundadora de StartupXYZ',
      image: { src: '~/assets/images/client2.jpg', alt: 'María García' },
    },
  ]}
/>
```

#### FAQs - Preguntas Frecuentes

```astro
<FAQs
  title="Preguntas Frecuentes"
  subtitle="Todo lo que necesitas saber"
  items={[
    {
      title: '¿Cómo funciona Joyan?',
      description: 'Joyan es una plataforma que te permite...',
    },
    {
      title: '¿Cuánto cuesta?',
      description: 'Tenemos planes desde $9/mes...',
    },
    {
      title: '¿Ofrecen soporte?',
      description: 'Sí, ofrecemos soporte 24/7 por email y chat.',
    },
  ]}
/>
```

#### CallToAction - Llamada a la Acción

```astro
<CallToAction
  actions={[
    {
      variant: 'primary',
      text: 'Comenzar ahora',
      href: '/signup',
      icon: 'tabler:rocket',
    },
  ]}
>
  <Fragment slot="title"> ¿Listo para comenzar? </Fragment>

  <Fragment slot="subtitle"> Únete a miles de empresas que confían en Joyan </Fragment>
</CallToAction>
```

---

## ✅ Qué Usar y Qué No Usar

### 🟢 LO QUE DEBES USAR (Esencial para tu Landing Page)

#### Archivos de Configuración:

- ✅ `src/config.yaml` - MODIFICAR con datos de Joyan
- ✅ `src/navigation.ts` - MODIFICAR con tu navegación
- ✅ `tailwind.config.js` - MODIFICAR colores de marca
- ✅ `astro.config.ts` - Revisar configuración

#### Layouts:

- ✅ `PageLayout.astro` - Usar para páginas normales
- ✅ `Layout.astro` - Base necesaria

#### Componentes Principales:

- ✅ `Header.astro` - Navegación superior
- ✅ `Footer.astro` - Pie de página
- ✅ `Logo.astro` - Tu logo

#### Widgets Esenciales:

- ✅ `Hero.astro` - Sección principal
- ✅ `Features.astro` - Características de tu producto
- ✅ `Pricing.astro` - Si ofreces planes/precios
- ✅ `CallToAction.astro` - Conversión
- ✅ `Contact.astro` - Formulario de contacto

#### Páginas Base:

- ✅ `src/pages/index.astro` - Página principal
- ✅ `src/pages/about.astro` - Acerca de
- ✅ `src/pages/contact.astro` - Contacto
- ✅ `src/pages/404.astro` - Página de error

### 🟡 LO QUE PUEDES USAR (Opcional según necesites)

#### Widgets Opcionales:

- 🟡 `Testimonials.astro` - Si tienes testimonios
- 🟡 `Stats.astro` - Si tienes métricas importantes
- 🟡 `FAQs.astro` - Preguntas frecuentes
- 🟡 `Steps.astro` - Si explicas un proceso
- 🟡 `Content.astro` - Contenido con imagen
- 🟡 `Brands.astro` - Si muestras logos de clientes

#### Páginas Opcionales:

- 🟡 `src/pages/pricing.astro` - Si tienes precios
- 🟡 `src/pages/services.astro` - Si ofreces servicios
- 🟡 `src/pages/privacy.md` - Política de privacidad
- 🟡 `src/pages/terms.md` - Términos y condiciones

### 🔴 LO QUE PROBABLEMENTE NO NECESITAS

#### Si NO vas a tener blog:

- ❌ `src/pages/[...blog]/` - Todo el directorio del blog
- ❌ `src/components/blog/` - Componentes del blog
- ❌ `src/content/post/` - Posts del blog
- ❌ `BlogLatestPosts.astro` - Widget de posts
- ❌ `BlogHighlightedPosts.astro` - Posts destacados

**Cómo desactivar el blog:**

```yaml
# En src/config.yaml
apps:
  blog:
    isEnabled: false # Cambiar a false
```

#### Landing Pages de Demo:

- ❌ `src/pages/landing/` - Ejemplos de landing pages
- ❌ `src/pages/homes/` - Diferentes versiones de home

#### Layouts que no usarás:

- ❌ `LandingLayout.astro` - Solo si no usas landing pages específicas
- ❌ `MarkdownLayout.astro` - Solo para blog

#### Widgets Especializados:

- ❌ `Announcement.astro` - Barra de anuncio superior
- ❌ `Note.astro` - Notas especiales
- ❌ `Features3.astro` - Variante que probablemente no uses
- ❌ `Hero2.astro` / `HeroText.astro` - Variantes del Hero

---

## 🎯 Guía de Personalización Paso a Paso

### Paso 1: Configuración Básica (30 minutos)

#### 1.1 Actualizar `src/config.yaml`

```yaml
site:
  name: Joyan
  site: 'https://joyan.com' # Tu dominio real

metadata:
  title:
    default: Joyan
    template: '%s — Joyan'
  description: 'Descripción de Joyan (importante para SEO)'

  openGraph:
    site_name: Joyan
    images:
      - url: '~/assets/images/joyan-og.png' # Crear esta imagen (1200x628px)

  twitter:
    handle: '@joyan'
    site: '@joyan'

i18n:
  language: es # Cambiar a español
  textDirection: ltr

apps:
  blog:
    isEnabled: false # Si no usarás blog
```

#### 1.2 Actualizar Navegación en `src/navigation.ts`

```typescript
export const headerData = {
  links: [
    { text: 'Inicio', href: '/' },
    { text: 'Servicios', href: '/services' },
    { text: 'Precios', href: '/pricing' },
    { text: 'Acerca de', href: '/about' },
    { text: 'Contacto', href: '/contact' },
  ],
  actions: [
    {
      text: 'Comenzar Gratis',
      href: '/signup',
      variant: 'primary',
    },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Producto',
      links: [
        { text: 'Características', href: '/#features' },
        { text: 'Precios', href: '/pricing' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { text: 'Acerca de', href: '/about' },
        { text: 'Contacto', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { text: 'Privacidad', href: '/privacy' },
        { text: 'Términos', href: '/terms' },
      ],
    },
  ],
  socialLinks: [
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://instagram.com/joyan' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: 'https://facebook.com/joyan' },
  ],
  footNote: `© ${new Date().getFullYear()} Joyan. Todos los derechos reservados.`,
};
```

### Paso 2: Personalizar Colores y Diseño (20 minutos)

#### 2.1 Actualizar `tailwind.config.js`

```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... tus colores de marca de Joyan
          600: '#0284c7', // Color principal
          700: '#0369a1',
        },
        accent: '#FF6B6B', // Color de acento de Joyan
      },
    },
  },
};
```

#### 2.2 Actualizar Logo en `src/components/Logo.astro`

```astro
---
// Reemplaza el logo por el de Joyan
---

<a class="flex items-center" href="/">
  <img src="/path/to/joyan-logo.svg" alt="Joyan" class="h-10 w-auto" />
</a>
```

### Paso 3: Crear tu Página Principal (60 minutos)

#### 3.1 Limpiar `src/pages/index.astro`

```astro
---
import PageLayout from '~/layouts/PageLayout.astro';
import Hero from '~/components/widgets/Hero.astro';
import Features from '~/components/widgets/Features.astro';
import Pricing from '~/components/widgets/Pricing.astro';
import Testimonials from '~/components/widgets/Testimonials.astro';
import CallToAction from '~/components/widgets/CallToAction.astro';

const metadata = {
  title: 'Joyan — La mejor solución para tu negocio',
  description: 'Descripción de Joyan para SEO',
};
---

<PageLayout metadata={metadata}>
  <!-- Sección Hero -->
  <Hero
    actions={[
      { variant: 'primary', text: 'Comenzar Gratis', href: '/signup' },
      { text: 'Ver Demo', href: '#demo' },
    ]}
    image={{ src: '~/assets/images/joyan-hero.png', alt: 'Joyan' }}
  >
    <Fragment slot="title">
      Transforma tu negocio con <span class="text-accent">Joyan</span>
    </Fragment>

    <Fragment slot="subtitle">
      La plataforma todo-en-uno para gestionar tu empresa de forma eficiente. Aumenta tu productividad hasta un 300%.
    </Fragment>
  </Hero>

  <!-- Características -->
  <Features
    id="features"
    title="¿Por qué elegir Joyan?"
    subtitle="Características que nos hacen la mejor opción del mercado"
    items={[
      {
        title: 'Fácil de usar',
        description: 'Interface intuitiva que cualquiera puede usar sin capacitación',
        icon: 'tabler:click',
      },
      {
        title: 'Seguro',
        description: 'Encriptación bancaria para proteger tus datos',
        icon: 'tabler:shield-check',
      },
      {
        title: 'Soporte 24/7',
        description: 'Equipo disponible siempre que nos necesites',
        icon: 'tabler:headset',
      },
      {
        title: 'Rápido',
        description: 'Optimizado para máximo rendimiento',
        icon: 'tabler:rocket',
      },
      {
        title: 'Escalable',
        description: 'Crece con tu negocio sin límites',
        icon: 'tabler:trending-up',
      },
      {
        title: 'Integraciones',
        description: 'Conecta con tus herramientas favoritas',
        icon: 'tabler:plug',
      },
    ]}
  />

  <!-- Precios -->
  <Pricing
    title="Planes para cada negocio"
    subtitle="Sin costos ocultos. Cancela cuando quieras."
    prices={[
      {
        title: 'Starter',
        subtitle: 'Para emprendedores',
        price: '$19',
        period: 'por mes',
        items: [{ title: '5 usuarios' }, { title: '10GB almacenamiento' }, { title: 'Soporte por email' }],
        callToAction: { text: 'Comenzar', href: '/signup' },
      },
      {
        title: 'Business',
        subtitle: 'Para equipos',
        price: '$49',
        period: 'por mes',
        hasRibbon: true,
        ribbonTitle: 'Popular',
        items: [
          { title: '25 usuarios' },
          { title: '50GB almacenamiento' },
          { title: 'Soporte prioritario' },
          { title: 'Analíticas avanzadas' },
        ],
        callToAction: { text: 'Comenzar', href: '/signup' },
      },
      {
        title: 'Enterprise',
        subtitle: 'Para grandes empresas',
        price: 'Contactar',
        period: '',
        items: [
          { title: 'Usuarios ilimitados' },
          { title: 'Almacenamiento ilimitado' },
          { title: 'Soporte dedicado' },
          { title: 'Personalización completa' },
        ],
        callToAction: { text: 'Contactar', href: '/contact' },
      },
    ]}
  />

  <!-- Testimonios -->
  <Testimonials
    title="Empresas que confían en Joyan"
    testimonials={[
      {
        testimonial: 'Joyan cambió completamente nuestra forma de trabajar. Ahora somos 3x más productivos.',
        name: 'Carlos Rodríguez',
        job: 'CEO de TechStart',
        image: { src: '~/assets/images/testimonial1.jpg', alt: 'Carlos' },
      },
      {
        testimonial: 'La mejor inversión que hemos hecho. El ROI fue positivo en el primer mes.',
        name: 'Ana Martínez',
        job: 'Directora de Operaciones',
        image: { src: '~/assets/images/testimonial2.jpg', alt: 'Ana' },
      },
    ]}
  />

  <!-- Call to Action Final -->
  <CallToAction
    actions={[
      {
        variant: 'primary',
        text: 'Comenzar Gratis',
        href: '/signup',
        icon: 'tabler:rocket',
      },
    ]}
  >
    <Fragment slot="title"> ¿Listo para transformar tu negocio? </Fragment>

    <Fragment slot="subtitle">
      Únete a más de 10,000 empresas que ya usan Joyan. Prueba gratis por 14 días, sin tarjeta de crédito.
    </Fragment>
  </CallToAction>
</PageLayout>
```

### Paso 4: Limpiar Archivos Innecesarios (15 minutos)

Si no usarás ciertas funcionalidades, puedes eliminar archivos para simplificar:

```bash
# Si no usarás blog
rm -rf src/pages/\[...blog\]/
rm -rf src/components/blog/
rm -rf src/content/post/

# Si no usarás las landing pages de ejemplo
rm -rf src/pages/landing/
rm -rf src/pages/homes/

# Si no usarás ciertos widgets
rm src/components/widgets/BlogLatestPosts.astro
rm src/components/widgets/BlogHighlightedPosts.astro
rm src/components/widgets/Announcement.astro
```

**⚠️ Importante:** Después de eliminar archivos, revisa que no haya imports rotos en otros archivos.

### Paso 5: Añadir Imágenes de Joyan (15 minutos)

1. Coloca tus imágenes en `src/assets/images/`
2. Reemplaza los placeholders:
   - `hero-image.png` → Tu imagen principal
   - `default.png` → Imagen OG para redes sociales (1200x628px)
   - Logos, testimonios, etc.

3. Actualiza el favicon:
   - `src/assets/favicons/favicon.ico`
   - `src/assets/favicons/favicon.svg`
   - `src/assets/favicons/apple-touch-icon.png`

### Paso 6: Configurar SEO (10 minutos)

#### En cada página importante:

```astro
---
const metadata = {
  title: 'Título específico de la página',
  description: 'Descripción única de 150-160 caracteres',
  canonical: 'https://joyan.com/url-de-esta-pagina',
  openGraph: {
    images: [
      {
        url: '~/assets/images/pagina-especifica-og.png',
        width: 1200,
        height: 628,
      },
    ],
  },
};
---

<PageLayout metadata={metadata}>
  <!-- Contenido -->
</PageLayout>
```

---

## 💻 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (localhost:4321)
npm run dev

# Compilar para producción
npm run build

# Previsualizar el build de producción
npm run preview

# Verificar errores
npm run check

# Corregir formato y linting
npm run fix
```

### Flujo de Trabajo Típico:

```bash
# 1. Iniciar desarrollo
npm run dev

# 2. Hacer cambios y ver en vivo en http://localhost:4321

# 3. Antes de deploy, verificar
npm run check

# 4. Compilar para producción
npm run build

# 5. Probar el build
npm run preview
```

---

## 🚀 Despliegue

### Opción 1: Vercel (Recomendado - Más Fácil)

1. Sube tu repo a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Importa tu repositorio
4. Vercel detectará Astro automáticamente
5. Click en "Deploy"

**Listo!** Tu sitio está en vivo.

### Opción 2: Netlify

1. Sube tu repo a GitHub
2. Ve a [netlify.com](https://netlify.com)
3. New site from Git
4. Selecciona tu repo
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Deploy

### Opción 3: Hosting Tradicional (cPanel, etc.)

```bash
# 1. Compilar
npm run build

# 2. Subir el contenido de la carpeta 'dist/' a tu servidor
# Puedes usar FTP, SFTP, o rsync

# Ejemplo con rsync:
rsync -avz dist/ usuario@tuservidor:/var/www/html/
```

### Variables de Entorno

Si usas variables de entorno (API keys, etc.):

1. Crea archivo `.env` en la raíz:

```env
PUBLIC_API_URL=https://api.joyan.com
SECRET_KEY=tu-clave-secreta
```

2. Usa en tu código:

```astro
---
const apiUrl = import.meta.env.PUBLIC_API_URL;
---
```

3. En Vercel/Netlify, añade las variables en el dashboard.

---

## 📱 Características Adicionales

### Analytics (Google Analytics)

1. Obtén tu ID de Google Analytics (G-XXXXXXXXXX)
2. Actualiza `src/config.yaml`:

```yaml
analytics:
  vendors:
    googleAnalytics:
      id: 'G-XXXXXXXXXX' # Tu ID real
```

Ya está configurado automáticamente.

### Formulario de Contacto

El widget `Contact.astro` ya tiene un formulario. Necesitas configurar el backend:

**Opciones:**

1. **Formspree**: Servicio gratuito para formularios

   ```html
   <form action="https://formspree.io/f/tu-id" method="POST"></form>
   ```

2. **Netlify Forms**: Si usas Netlify, solo añade `netlify` al form:

   ```html
   <form name="contact" method="POST" data-netlify="true"></form>
   ```

3. **Tu propio backend**: Envía el form a tu API:
   ```javascript
   fetch('https://api.joyan.com/contact', {
     method: 'POST',
     body: JSON.stringify(formData),
   });
   ```

### Internacionalización (i18n)

Si necesitas múltiples idiomas, Astro tiene soporte nativo:

```javascript
// astro.config.ts
export default defineConfig({
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
```

Luego crea:

```
src/pages/
  index.astro        → /es/
  en/
    index.astro      → /en/
```

---

## 🐛 Solución de Problemas Comunes

### Error: "Cannot find module '~/components/...'"

**Problema:** El alias `~` no se resuelve.

**Solución:** Verifica que `astro.config.ts` tenga:

```typescript
vite: {
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
}
```

### Error al compilar imágenes

**Problema:** Imágenes no se optimizan correctamente.

**Solución:** Instala Sharp:

```bash
npm install sharp
```

### El sitio es muy lento en desarrollo

**Problema:** Hot reload lento.

**Solución:**

1. Elimina archivos innecesarios (landing/, homes/, blog/)
2. Limpia cache: `rm -rf node_modules/.astro`
3. Reinicia: `npm run dev`

### Cambios en config.yaml no se aplican

**Problema:** Cache de Astro.

**Solución:**

```bash
# Reinicia el servidor de desarrollo
# Ctrl+C y luego:
npm run dev
```

---

## 📊 Checklist de Personalización

Usa esta lista para asegurarte de que has personalizado todo:

### Configuración:

- [ ] `src/config.yaml` - Nombre, dominio, SEO
- [ ] `src/navigation.ts` - Menús personalizados
- [ ] `tailwind.config.js` - Colores de marca
- [ ] `package.json` - Nombre del proyecto

### Branding:

- [ ] Logo en `src/components/Logo.astro`
- [ ] Favicon en `src/assets/favicons/`
- [ ] Imágenes en `src/assets/images/`
- [ ] Imagen Open Graph (1200x628px)

### Contenido:

- [ ] `src/pages/index.astro` - Página principal
- [ ] `src/pages/about.astro` - Acerca de
- [ ] `src/pages/contact.astro` - Contacto
- [ ] `src/pages/pricing.astro` - Precios (si aplica)
- [ ] `src/pages/privacy.md` - Política de privacidad
- [ ] `src/pages/terms.md` - Términos y condiciones

### SEO:

- [ ] Meta descripción en `config.yaml`
- [ ] Título de cada página
- [ ] Descripción de cada página
- [ ] Imágenes Open Graph
- [ ] Google Analytics (si aplica)
- [ ] Google Search Console verificado

### Limpieza:

- [ ] Eliminar páginas de ejemplo no usadas
- [ ] Eliminar blog si no lo usarás
- [ ] Eliminar widgets no usados
- [ ] Actualizar README.md del proyecto

---

## 🎓 Recursos de Aprendizaje

### Documentación Oficial:

- **Astro**: https://docs.astro.build
- **Tailwind CSS**: https://tailwindcss.com/docs
- **MDX**: https://mdxjs.com (si usas blog)

### Herramientas Útiles:

- **Iconos**: https://icon-sets.iconify.design (tabler icons)
- **Colores**: https://tailwindcolor.com
- **Imágenes**: https://unsplash.com (gratuitas)
- **Optimizar imágenes**: https://tinypng.com

### Comunidad:

- **Discord de Astro**: https://astro.build/chat
- **Stack Overflow**: Tag `astro`

---

## 💡 Tips para Desarrolladores Backend

### Piensa en Astro como:

- **PHP/Blade**: La sintaxis `.astro` es como Blade templates
- **Server-Side Rendering**: Todo se renderiza en build time (como static site generation)
- **API Routes**: Puedes crear endpoints en `src/pages/api/`

### Ejemplo de API Route:

```typescript
// src/pages/api/contact.ts
export async function post({ request }) {
  const data = await request.json();

  // Lógica de backend aquí
  await sendEmail(data);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Integración con tu Backend:

Si ya tienes un backend (Node.js, Python, PHP, etc.):

```astro
---
// Fetch data desde tu API
const response = await fetch('https://api.joyan.com/data');
const data = await response.json();
---

<div>
  {data.items.map((item) => <div>{item.name}</div>)}
</div>
```

---

## 🎯 Próximos Pasos Sugeridos

### Semana 1:

1. ✅ Familiarízate con la estructura del proyecto
2. ✅ Actualiza `config.yaml` y `navigation.ts`
3. ✅ Personaliza colores y logo
4. ✅ Crea tu página principal básica

### Semana 2:

5. Añade todas las páginas necesarias (about, contact, etc.)
6. Personaliza widgets con contenido real
7. Añade imágenes reales de Joyan
8. Configura SEO de cada página

### Semana 3:

9. Elimina archivos innecesarios
10. Prueba en diferentes dispositivos
11. Optimiza rendimiento
12. Configura analytics

### Semana 4:

13. Deploy a producción
14. Configura dominio personalizado
15. Pruebas finales
16. ¡Lanzamiento! 🚀

---

## 🆘 Soporte

Si tienes dudas específicas sobre este template:

1. **GitHub Issues del proyecto original**: https://github.com/arthelokyo/astrowind/issues
2. **Discord de Astro**: Comunidad muy activa
3. **Documentación de Astro**: Muy completa y con ejemplos

---

## 📝 Notas Finales

### Ventajas de Astro para Landing Pages:

✅ **Rendimiento**: Páginas super rápidas (100/100 en PageSpeed)  
✅ **SEO**: Excelente para posicionamiento  
✅ **Sencillez**: Más simple que React/Vue para landing pages  
✅ **Costo**: Hosting económico (sitios estáticos)  
✅ **Mantenimiento**: Muy bajo

### Cuándo usar Astro:

✅ Landing pages  
✅ Sitios corporativos  
✅ Blogs  
✅ Portfolios  
✅ Documentación

### Cuándo NO usar Astro:

❌ Aplicaciones web complejas con mucha interactividad  
❌ Dashboards en tiempo real  
❌ Aplicaciones tipo SPA (Single Page Application)  
❌ Apps que requieren auth compleja en el frontend

---

## 🎉 ¡Listo!

Ya tienes todo lo necesario para personalizar esta plantilla para Joyan.

**Recuerda:**

- Astro es simple: HTML + componentes
- Los widgets son bloques de construcción reutilizables
- La configuración está centralizada en `config.yaml` y `navigation.ts`
- Elimina lo que no uses para mantener el proyecto limpio
- El rendimiento es excelente por defecto

**¿Dudas?** Revisa esta guía o la documentación oficial de Astro.

**¡Éxito con tu proyecto Joyan!** 🚀

---

**Última actualización:** Noviembre 2025  
**Versión de Astro:** 5.0+  
**Versión de AstroWind:** 1.0.0-beta.52
