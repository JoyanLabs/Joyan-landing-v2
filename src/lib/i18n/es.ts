import type { LocaleContent } from './types';

/**
 * Spanish locale content — authoritative copy.
 *
 * Narrative (aligned with the 2026 direction): Joyan is a people-centered
 * cooperative that builds agents *and* connected systems for real-world
 * operations, following `Human purpose → Data → Context → Intelligence →
 * Action → Human outcome`. Two distinctions carry the copy:
 *
 * - MAGI is the reusable intelligence layer agents are built on — context,
 *   tools, memory, explicit policies, graded autonomy, human review. It is
 *   not an always-on autonomous worker.
 * - Section 03 is connected systems: registering what physically happened,
 *   with timestamp, precision and source. Not buttons, knobs or voice
 *   controllers for agents.
 *
 * Naming guardrail: the first vertical product is still in brand validation,
 * so no product name appears here — only the problem it addresses.
 *
 * Community offers are honest and in progress: no vendor names, no banned
 * copy, no overpromises, no fake product claims.
 */
export const es = {
  meta: {
    title: 'Agentes y sistemas conectados para operaciones reales',
    titleTemplate: '%s — Joyan',
    description:
      'Joyan es una cooperativa centrada en las personas. Construimos agentes que trabajan dentro de límites acordados y sistemas conectados que registran lo que ocurre en el mundo físico, para que la información de una operación se convierta en decisiones revisables.',
  },
  nav: {
    links: [
      { label: 'Agentes', anchor: 'agents' },
      { label: 'MAGI', anchor: 'magi' },
      // Anchor stays `hardware`: the section is reframed as connected
      // systems, but the locale-invariant id is a published contract.
      { label: 'Conectados', anchor: 'hardware' },
      { label: 'Ecosistema', anchor: 'ecosystem' },
    ],
    toggle: 'EN',
  },
  hero: {
    kicker: 'Cooperativa centrada en las personas',
    title: 'Agentes y sistemas conectados para el mundo real',
    lead: 'Diseñamos agentes que entienden el contexto de tu operación y sistemas que registran lo que ocurre en el mundo físico. Los construimos para ampliar a tu equipo, no para reemplazarlo: personas reales definen los objetivos, revisan cada acción y responden por cada sistema.',
    ctaPrimary: 'Conocer MAGI',
    ctaSecondary: 'Ver el ecosistema',
  },
  agents: {
    index: '01',
    kicker: 'Agentes como servicio',
    title: 'Especialistas digitales hechos a medida',
    lead: 'No vendemos software genérico: creamos agentes. Cada uno se diseña para una tarea concreta de tu operación y la ejecuta con autonomía acotada: trabaja sin supervisión constante, con las decisiones importantes reservadas a una persona. Y puede hacerlo sin nada del mundo físico.',
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
    kicker: 'La inteligencia de Joyan',
    title: 'MAGI convierte información en acciones verificables',
    lead: 'MAGI no es un trabajador que nunca descansa: es la capa de inteligencia con la que construimos cada agente. Recibe el contexto de una operación, usa herramientas, conserva lo que importa, actúa dentro de políticas explícitas y deja registro de cada paso que da.',
    items: [
      {
        title: 'Contexto, no suposiciones',
        body: 'Un agente no debería recibir «todo lo que sabemos», sino la información correcta para el siguiente paso. MAGI construye ese contexto a partir de lo que tu operación ya sabe: datos, documentos, historial.',
      },
      {
        title: 'Con herramientas y límites',
        body: 'MAGI usa herramientas declaradas y opera dentro de políticas explícitas: sabe qué puede hacer, con qué permisos y qué necesita aprobación antes de actuar. La última palabra sigue siendo de una persona.',
      },
      {
        title: 'Autonomía por niveles',
        body: 'No todo se hace igual. Hay observaciones y recomendaciones que corren solas; las acciones reversibles pasan por una política y quedan auditadas; y las acciones sensibles o críticas las aprueba siempre una persona responsable.',
      },
    ],
    terminalLines: [
      '[magi] 09:41 — contexto listo · permisos: lectura',
      '[magi] 09:41 — 37 de 38 señales al día',
      '[magi] 09:42 — 1 señal requiere revisión',
      '[magi] 09:42 — recomendación preparada · pendiente de aprobación',
    ],
    figure: {
      alt: 'Ilustración abstracta de la capa de inteligencia de Joyan',
      caption: 'MAGI, la capa de inteligencia de Joyan — ilustración propia',
    },
    motion: {
      canvasLabel: 'Red de agentes de MAGI en movimiento',
      staticStatus: 'Red de MAGI en reposo',
      activeStatus: 'Red de MAGI en movimiento',
    },
  },
  hardware: {
    index: '03',
    kicker: 'Sistemas conectados',
    title: 'Lo que ocurre en el mundo real, con evidencia',
    lead: 'No todas las operaciones pasan por una pantalla. Cuando hace falta, conectamos dispositivos, sensores y gateways para registrar lo que está pasando —con hora, precisión y origen— y para que el sistema siga siendo útil incluso cuando la conexión falla.',
    items: [
      {
        title: 'Estado, no inferencia',
        body: 'Cada lectura lleva hora, precisión y fuente. El estado del mundo se registra de manera determinista; la interpretación es un paso aparte, y siempre queda identificada como tal.',
      },
      {
        title: 'Datos con fecha de frescura',
        body: 'Un dato viejo con apariencia de dato actual es un riesgo. Por eso mostramos siempre desde cuándo sabemos lo que sabemos, y qué parte quedó pendiente de sincronizar.',
      },
      {
        title: 'Útiles sin conexión',
        body: 'Los sistemas que diseñamos siguen funcionando cuando la red se cae: registran en el sitio y sincronizan cuando vuelve. La visibilidad de una operación no debería depender de tener señal.',
      },
    ],
    figure: {
      alt: 'Ilustración abstracta de un dispositivo conectado a una red',
      caption: 'Sistemas conectados al mundo físico — ilustración propia',
    },
    prototypeInvitation: {
      status: 'En desarrollo',
      body: 'Estamos construyendo esta capa de sistemas conectados junto a nuestra comunidad. No hay venta, no hay plazos y no prometemos disponibilidad: cuando haya algo concreto, lo vas a saber acá.',
    },
  },
  ecosystem: {
    index: '04',
    kicker: 'Ecosistema',
    title: 'Una cooperativa, una comunidad',
    lead: 'Joyan es un proyecto colectivo: personas que construyen agentes y sistemas, los operan y comparten lo que aprenden. Creemos que esta tecnología vale cuando sus beneficios se reparten: cuantos más negocios la adoptan con criterio, más fuerte se vuelve cada agente y cada comunidad.',
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
          title: 'Trabajar con un agente desde el inicio',
          body: 'Buscamos negocios que quieran construir un agente con nosotras en una primera etapa. Sigue en desarrollo: no hay cupos ni fechas, y lo anunciaremos acá cuando los haya.',
        },
        hardwareAgentPrototypeInvitation: {
          title: 'Conversaciones sobre sistemas conectados',
          body: 'Nos interesa conversar con quienes tienen una operación donde saber lo que ocurre en el sitio es un problema real. Es exploración en curso: sin fechas, sin inscripción y sin entregas.',
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
    detailLabel: 'Leer la entrada',
    detailReturnLabel: 'Volver a la bitácora',
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
    tagline: 'Del contexto a la acción. Personas al mando.',
    legal: '© 2026 Joyan — Cooperativa. Todos los derechos reservados.',
  },
} satisfies LocaleContent;
