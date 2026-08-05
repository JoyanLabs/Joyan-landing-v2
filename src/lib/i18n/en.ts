import type { LocaleContent } from './types';

/**
 * English locale content — translation of the authoritative ES copy.
 * Keys are identical to `es.ts`; a missing key fails `pnpm check` (ADR-2).
 */
export const en = {
  meta: {
    title: 'Specialized agents for your business',
    titleTemplate: '%s — Joyan',
    description:
      'Joyan is a people-centered cooperative that creates specialized agents as a service. MAGI, our main agent, operates your business systems around the clock. We also design devices to control and talk with your agents.',
  },
  nav: {
    links: [
      { label: 'Agents', anchor: 'agents' },
      { label: 'MAGI', anchor: 'magi' },
      { label: 'Hardware', anchor: 'hardware' },
      { label: 'Ecosystem', anchor: 'ecosystem' },
    ],
    toggle: 'ES',
  },
  hero: {
    kicker: 'People-centered cooperative',
    title: 'Specialized agents that work for your business',
    lead: 'We build AI agents that get to work on your operation every day, around the clock. They are designed to extend your team, not replace it: real people set the goals, review every action and answer for each agent.',
    ctaPrimary: 'Meet MAGI',
    ctaSecondary: 'See the ecosystem',
  },
  agents: {
    index: '01',
    kicker: 'Agents as a service',
    title: 'Digital specialists, built to fit',
    lead: "We don't sell generic software: we create agents. Each agent is a digital specialist designed for one concrete task of your operation, executed with bounded autonomy: it works on its own, but a person reviews the important decisions.",
    items: [
      {
        title: 'One specialist per task',
        body: 'Each agent is defined to solve one specific problem of your business, with clear goals and an agreed way of working.',
      },
      {
        title: 'They work on your real operation',
        body: "Agents operate the systems and tools your business already uses: they fit your way of working, they don't ask you to change it.",
      },
      {
        title: 'People in charge',
        body: 'Behind every agent there is a human team from the cooperative that designs it, sets its limits, tunes it and responds when something changes. Technology executes; people decide.',
      },
    ],
    figure: {
      alt: 'Abstract illustration of a network of specialized agents',
      caption: 'Network of specialized agents — original illustration',
    },
  },
  magi: {
    index: '02',
    kicker: 'Our main agent',
    title: 'MAGI runs your operation, non-stop',
    lead: 'MAGI is our main agent: it works around the clock, autonomously, within agreed limits, and in the background, operating your business systems without depending on a screen or someone watching over it.',
    items: [
      {
        title: 'Always on',
        body: "MAGI doesn't sleep or take holidays: it monitors and executes your operation tasks at any hour of the day.",
      },
      {
        title: 'Headless operation',
        body: 'It executes directly on your systems, without constant intervention: you set the goals and MAGI takes care of the work in the background.',
      },
      {
        title: 'Human decisions',
        body: "We set its goals, review its actions and tune it with you. The final word is always a person's.",
      },
    ],
    terminalLines: [
      '[magi] 09:41 — daily operation running',
      '[magi] 09:41 — billing synchronized',
      '[magi] 09:42 — order #1042 processed',
      '[magi] 09:42 — report sent to the team',
    ],
    figure: {
      alt: 'Abstract illustration of the MAGI core',
      caption: 'MAGI, the main agent — original illustration',
    },
    motion: {
      canvasLabel: 'MAGI agent network in motion',
      staticStatus: 'MAGI network at rest',
      activeStatus: 'MAGI network in motion',
    },
  },
  hardware: {
    index: '03',
    kicker: 'Hardware for agents',
    title: 'Devices to control and talk with your agents',
    lead: "We are designing physical objects so your agents don't live only inside a computer: simple devices to give them orders, listen to them and watch them work.",
    items: [
      {
        title: 'Orders without a keyboard',
        body: 'A button, a dial, your voice: the same intention, another surface. The agent understands either way.',
      },
      {
        title: 'Your operation, in plain words',
        body: 'Devices that tell you what your agents are doing in the language of your business, without endless dashboards.',
      },
      {
        title: 'Concept in development',
        body: 'We are prototyping this line together with our community. No promised dates: when it is ready, you will read about it here.',
      },
    ],
    figure: {
      alt: 'Abstract illustration of a board for agents',
      caption: 'Device concept for agents — original illustration',
    },
    prototypeInvitation: {
      status: 'In development',
      body: 'We are exploring device prototypes together with our community. Nothing is open for enrollment and no dates are promised: when something concrete exists, you will read about it here.',
    },
  },
  ecosystem: {
    index: '04',
    kicker: 'Ecosystem',
    title: 'A cooperative, a community',
    lead: 'Joyan is a collective project: people who create agents, run them and share what they learn. We believe AI is worth it when its benefits are shared: the more businesses adopt it with judgment, the stronger every agent and every community.',
    items: [
      {
        title: 'Cooperative',
        body: 'We are people who cooperate: knowledge, tools and results are shared, not concentrated.',
      },
      {
        title: 'Collective creation',
        body: 'We design and operate agents together with each business; what one project teaches improves the next one.',
      },
      {
        title: 'Made by people',
        body: 'No smoke and mirrors: a human team designs, operates and improves every agent from real feedback from real businesses.',
      },
    ],
    figure: {
      alt: 'Abstract illustration of the Joyan ecosystem',
      caption: 'Joyan ecosystem — original illustration',
    },
    community: {
      status: 'In development',
      title: 'The community is taking shape',
      lead: "We want more people to create, operate and share agents — and to adopt them with judgment: knowing what they can do, what they can't, and what is worth reviewing in person. Today we are putting together guides, content and training, and looking for first partners to build with us. None of these are an enrollment, a form or a delivery offer yet: they are paths under development that we will open right here.",
      audiences: {
        mipes: {
          title: 'Small businesses',
          body: "Guides and content to adopt agents with judgment: what they can do, what they can't, and what is worth deciding in person. No tech jargon.",
        },
        developmentTeams: {
          title: 'Development teams',
          body: 'Training and materials for teams that want to build their own agents with judgment and autonomy.',
        },
      },
      offers: {
        guidesAndContent: {
          title: 'Guides and content',
          body: 'We are writing materials that explain how we design and operate agents, aimed at small businesses and development teams.',
        },
        training: {
          title: 'Training',
          body: 'We are designing training so more people can learn to create and operate specialized agents.',
        },
        agentBetaParticipation: {
          title: 'Agent beta participation',
          body: 'We are looking for businesses that want to build agents with us in an early stage. It is still in development: when we open slots, we will announce it here, without promising availability.',
        },
        hardwareAgentPrototypeInvitation: {
          title: 'Hardware-agent prototypes',
          body: 'We invite conversations about device prototypes for agents. This is ongoing exploration: no dates, no enrollment and no delivery.',
        },
      },
    },
  },
  journal: {
    index: '05',
    kicker: 'Log',
    title: 'Our progress, in our own words',
    lead: 'We record here what we are building: prototypes, integrations and experiments, with what works and what we are still unblocking. No promises: just the step by step.',
    archiveLabel: 'View all entries',
    linkLabel: 'Read more',
    detailLabel: 'Read the entry',
    detailReturnLabel: 'Back to the log',
    emptyState: 'No published entries yet: we are still putting it together.',
    archive: {
      title: 'Log',
      titleTemplate: '%s — Joyan',
      description:
        'The Joyan log: the progress of our agents, integrations, prototypes and experiments, told without hype.',
    },
    areas: {
      hardware: 'Hardware',
      software: 'Software',
      integration: 'Integration',
      research: 'Research',
    },
    statuses: {
      'in-progress': 'In progress',
      shipped: 'Completed',
      exploring: 'Exploring',
    },
  },
  footer: {
    tagline: 'Specialized agents. People in charge.',
    legal: '© 2026 Joyan — Cooperative. All rights reserved.',
  },
} satisfies LocaleContent;
