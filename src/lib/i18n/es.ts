import type { LocaleContent } from './types';

/**
 * Spanish locale content — authoritative copy.
 * Narrative: Joyan is a people-centered cooperative that creates specialized
 * agents as a service; MAGI is the main agent (24/7, headless operation of
 * business systems); hardware for agents means devices to control and talk
 * with agents. Community offers are honest and in progress: no vendor names,
 * no banned copy, no overpromises, no fake product claims.
 */
export const es = {
  meta: {
    title: 'Agentes especializados para tu negocio',
    titleTemplate: '%s — Joyan',
    description:
      'Joyan es una cooperativa centrada en las personas que crea agentes especializados como servicio. MAGI, nuestro agente principal, opera los sistemas de tu negocio las 24 horas. También diseñamos dispositivos para controlar y hablar con tus agentes.',
  },
  nav: {
    links: [
      { label: 'Agentes', anchor: 'agents' },
      { label: 'MAGI', anchor: 'magi' },
      { label: 'Hardware', anchor: 'hardware' },
      { label: 'Ecosistema', anchor: 'ecosystem' },
    ],
    toggle: 'EN',
  },
  hero: {
    kicker: 'Cooperativa centrada en las personas',
    title: 'Agentes especializados que trabajan por tu negocio',
    lead: 'Creamos agentes de IA que se ponen a trabajar en tu operación todos los días, a toda hora. Los diseñamos para ampliar tu equipo, no para reemplazarlo: personas reales definen los objetivos, revisan cada acción y responden por cada agente.',
    ctaPrimary: 'Conocer MAGI',
    ctaSecondary: 'Ver el ecosistema',
  },
  agents: {
    index: '01',
    kicker: 'Agentes como servicio',
    title: 'Especialistas digitales hechos a medida',
    lead: 'No vendemos software genérico: creamos agentes. Cada agente es un especialista digital que se diseña para una tarea concreta de tu operación y la ejecuta con autonomía acotada: trabaja sola, pero las decisiones importantes las revisa una persona.',
    items: [
      {
        title: 'Un especialista por tarea',
        body: 'Cada agente se define para resolver un problema puntual de tu negocio, con objetivos claros y un modo de trabajo acordado.',
      },
      {
        title: 'Trabajan sobre tu operación real',
        body: 'Los agentes operan los sistemas y herramientas que tu negocio ya usa: se integran a tu forma de trabajar, no te piden cambiarla.',
      },
      {
        title: 'Personas al mando',
        body: 'Detrás de cada agente hay un equipo humano de la cooperativa que lo diseña, le fija límites, lo ajusta y responde cuando algo cambia. La tecnología ejecuta; las personas deciden.',
      },
    ],
    figure: {
      alt: 'Ilustración abstracta de una red de agentes especializados',
      caption: 'Red de agentes especializados — ilustración propia',
    },
  },
  magi: {
    index: '02',
    kicker: 'Nuestro agente principal',
    title: 'MAGI coordina tu operación, sin descanso',
    lead: 'MAGI es nuestro agente principal: trabaja las 24 horas, de forma autónoma, dentro de límites acordados, y en segundo plano, operando los sistemas de tu negocio sin depender de una pantalla ni de una persona pendiente.',
    items: [
      {
        title: 'Siempre activo',
        body: 'MAGI no duerme ni se toma feriados: supervisa y ejecuta las tareas de tu operación a cualquier hora del día.',
      },
      {
        title: 'Operación en segundo plano',
        body: 'Ejecuta directamente sobre tus sistemas, sin intervención constante: tú defines los objetivos y MAGI se ocupa del trabajo de fondo.',
      },
      {
        title: 'Decisiones humanas',
        body: 'Definimos sus objetivos, revisamos sus acciones y lo ajustamos contigo. La última palabra siempre es de una persona.',
      },
    ],
    terminalLines: [
      '[magi] 09:41 — operación diaria en curso',
      '[magi] 09:41 — facturación sincronizada',
      '[magi] 09:42 — pedido #1042 procesado',
      '[magi] 09:42 — reporte enviado al equipo',
    ],
    figure: {
      alt: 'Ilustración abstracta del núcleo de MAGI',
      caption: 'MAGI, el agente principal — ilustración propia',
    },
    motion: {
      canvasLabel: 'Red de agentes de MAGI en movimiento',
      staticStatus: 'Red de MAGI en reposo',
      activeStatus: 'Red de MAGI en movimiento',
    },
  },
  hardware: {
    index: '03',
    kicker: 'Hardware para agentes',
    title: 'Dispositivos para controlar y hablar con tus agentes',
    lead: 'Estamos diseñando objetos físicos para que tus agentes no vivan solo dentro de una computadora: dispositivos simples para darles órdenes, escucharlos y verlos trabajar.',
    items: [
      {
        title: 'Órdenes sin teclado',
        body: 'Un botón, una perilla, la voz: la misma intención, otra superficie. El agente entiende igual.',
      },
      {
        title: 'Tu operación, en voz propia',
        body: 'Dispositivos que te cuentan qué está pasando con tus agentes en el idioma de tu negocio, sin dashboards interminables.',
      },
      {
        title: 'Concepto en desarrollo',
        body: 'Estamos prototipando esta línea junto a nuestra comunidad. Sin fechas prometidas: cuando esté lista, lo vas a saber acá.',
      },
    ],
    figure: {
      alt: 'Ilustración abstracta de una placa para agentes',
      caption: 'Concepto de dispositivo para agentes — ilustración propia',
    },
    prototypeInvitation: {
      status: 'En desarrollo',
      body: 'Estamos explorando prototipos de dispositivos junto a nuestra comunidad. Nada está abierto a inscripción y no prometemos fechas: cuando haya algo concreto, lo vas a saber acá.',
    },
  },
  ecosystem: {
    index: '04',
    kicker: 'Ecosistema',
    title: 'Una cooperativa, una comunidad',
    lead: 'Joyan es un proyecto colectivo: personas que crean agentes, los operan y comparten lo que aprenden. Creemos que la IA vale cuando sus beneficios se reparten: cuantos más negocios la adoptan con criterio, más fuerte es cada agente y cada comunidad.',
    items: [
      {
        title: 'Cooperativa',
        body: 'Somos personas que cooperan: el conocimiento, las herramientas y los resultados se comparten, no se concentran.',
      },
      {
        title: 'Creación colectiva',
        body: 'Diseñamos y operamos agentes junto a cada negocio; el aprendizaje de un proyecto mejora al siguiente.',
      },
      {
        title: 'Hecho por personas',
        body: 'No hay humo: hay un equipo humano que diseña, opera y mejora cada agente a partir del feedback real de cada negocio.',
      },
    ],
    figure: {
      alt: 'Ilustración abstracta del ecosistema de Joyan',
      caption: 'Ecosistema de Joyan — ilustración propia',
    },
    community: {
      status: 'En desarrollo',
      title: 'La comunidad está en construcción',
      lead: 'Queremos que más personas creen, operen y compartan agentes — y que los adopten con criterio: sabiendo qué pueden hacer, qué no, y qué conviene revisar en persona. Hoy estamos armando guías, contenidos y formaciones, y buscamos primeras personas para construir con nosotras. Ninguna de estas propuestas es todavía una inscripción, un formulario ni una oferta de entrega: son caminos en desarrollo que iremos abriendo acá.',
      audiences: {
        mipes: {
          title: 'MiPyMEs',
          body: 'Guías y contenidos para adoptar agentes con criterio: qué pueden hacer, qué no, y qué conviene decidir en persona. Sin humo técnico.',
        },
        developmentTeams: {
          title: 'Equipos de desarrollo',
          body: 'Formaciones y materiales para equipos que quieren crear sus propios agentes con criterio y autonomía.',
        },
      },
      offers: {
        guidesAndContent: {
          title: 'Guías y contenidos',
          body: 'Estamos escribiendo materiales que explican cómo diseñamos y operamos agentes, pensados para MiPyMEs y equipos de desarrollo.',
        },
        training: {
          title: 'Formaciones',
          body: 'Estamos diseñando formaciones para que más personas aprendan a crear y operar agentes especializados.',
        },
        agentBetaParticipation: {
          title: 'Participación en la beta de agentes',
          body: 'Buscamos negocios que quieran construir agentes con nosotras en una primera etapa. Sigue en desarrollo: cuando abramos cupos, lo anunciaremos acá, sin prometer disponibilidad.',
        },
        hardwareAgentPrototypeInvitation: {
          title: 'Prototipos de agentes de hardware',
          body: 'Invitamos a conversar sobre prototipos de dispositivos para agentes. Es exploración en curso: sin fechas, sin inscripción y sin entregas.',
        },
      },
    },
  },
  journal: {
    index: '05',
    kicker: 'Bitácora',
    title: 'Nuestro avance, en voz propia',
    lead: 'Registramos acá lo que estamos construyendo: prototipos, integraciones y experimentos, con lo que sale bien y lo que todavía estamos destrabando. Sin promesas: solo el paso a paso.',
    archiveLabel: 'Ver todas las entradas',
    linkLabel: 'Leer más',
    emptyState: 'Todavía no hay entradas publicadas: lo estamos armando.',
    archive: {
      title: 'Bitácora',
      titleTemplate: '%s — Joyan',
      description:
        'Bitácora de Joyan: el avance de nuestros agentes, integraciones, prototipos y experimentos, contado sin humo.',
    },
    areas: {
      hardware: 'Hardware',
      software: 'Software',
      integration: 'Integración',
      research: 'Investigación',
    },
    statuses: {
      'in-progress': 'En curso',
      shipped: 'Completado',
      exploring: 'Explorando',
    },
  },
  footer: {
    tagline: 'Agentes especializados. Personas al mando.',
    legal: '© 2026 Joyan — Cooperativa. Todos los derechos reservados.',
  },
} satisfies LocaleContent;
