import type { LocaleContent } from './types';

/**
 * Spanish locale content — authoritative V1 copy.
 * Narrative: Joyan is a people-centered cooperative that creates specialized
 * agents as a service; MAGI is the main agent (24/7, headless operation of
 * business systems); hardware for agents means devices to control and talk
 * with agents. No tech/vendor names, no "software para agentes", no
 * overpromises, no fake product claims.
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
    lead: 'Creamos agentes digitales que operan los sistemas de tu negocio y los ponemos a trabajar todos los días, a toda hora. Personas reales diseñan, ajustan y responden por cada agente.',
    ctaPrimary: 'Conocer MAGI',
    ctaSecondary: 'Ver el ecosistema',
  },
  agents: {
    index: '01',
    kicker: 'Agentes como servicio',
    title: 'Especialistas digitales hechos a medida',
    lead: 'No vendemos software: creamos agentes. Cada agente es un especialista digital que se diseña para una tarea concreta de tu operación y la ejecuta de forma autónoma.',
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
        body: 'Detrás de cada agente hay un equipo humano de la cooperativa que lo diseña, lo ajusta y responde cuando algo cambia.',
      },
    ],
  },
  magi: {
    index: '02',
    kicker: 'Nuestro agente principal',
    title: 'MAGI coordina tu operación, sin descanso',
    lead: 'MAGI es nuestro agente principal: trabaja las 24 horas, de forma autónoma y en segundo plano, operando los sistemas de tu negocio sin depender de una pantalla ni de una persona pendiente.',
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
  },
  ecosystem: {
    index: '04',
    kicker: 'Ecosistema',
    title: 'Una cooperativa, una comunidad',
    lead: 'Joyan es un proyecto colectivo: personas que crean agentes, los operan y comparten lo que aprenden. Cuanto más crece la comunidad, más fuerte es cada agente.',
    items: [
      {
        title: 'Cooperativa',
        body: 'Somos personas que cooperan: el conocimiento, las herramientas y los resultados se comparten, no se concentran.',
      },
      {
        title: 'Comunidad técnica',
        body: 'Compartimos patrones, aprendizajes y herramientas abiertas para que más personas puedan crear sus propios agentes.',
      },
      {
        title: 'Hecho por personas',
        body: 'No hay humo: hay un equipo humano que diseña, opera y mejora cada agente a partir del feedback real de cada negocio.',
      },
    ],
  },
  footer: {
    tagline: 'Agentes especializados. Personas al mando.',
    legal: '© 2026 Joyan — Cooperativa. Todos los derechos reservados.',
  },
} satisfies LocaleContent;
