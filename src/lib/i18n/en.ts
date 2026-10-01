import type { LocaleContent } from './types';

/**
 * English locale content — translation of the authoritative ES copy.
 * Keys are identical to `es.ts`; a missing key fails `pnpm check` (ADR-2).
 * MAGI is the reusable intelligence layer, not an always-on worker; section
 * 03 is connected systems, not devices that control agents.
 */
export const en = {
  meta: {
    title: 'Agents and connected systems for real operations',
    titleTemplate: '%s — Joyan',
    description:
      'Joyan is a people-centered cooperative. We build agents that work within agreed limits and connected systems that record what happens in the physical world, so the information in an operation becomes reviewable decisions.',
  },
  nav: {
    links: [
      { label: 'Agents', anchor: 'agents' },
      { label: 'MAGI', anchor: 'magi' },
      // Anchor stays `hardware`: a locale-invariant published contract.
      { label: 'Connected', anchor: 'hardware' },
      { label: 'Ecosystem', anchor: 'ecosystem' },
    ],
    toggle: 'ES',
  },
  hero: {
    kicker: 'People-centered cooperative',
    title: 'Agents and connected systems for the real world',
    lead: 'We design agents that understand the context of your operation and systems that record what happens in the physical world. They are built to extend your team, not replace it: real people set the goals, review every action and answer for each system.',
    ctaPrimary: 'Meet MAGI',
    ctaSecondary: 'See the ecosystem',
  },
  agents: {
    index: '01',
    kicker: 'Agents as a service',
    title: 'Digital specialists, built to fit',
    lead: "We don't sell generic software: we create agents. Each one is designed for a single concrete task of your operation and executes it with bounded autonomy: it works without constant supervision, with the important decisions reserved for a person. And it can do so with nothing from the physical world.",
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
    kicker: "Joyan's intelligence",
    title: 'MAGI turns information into verifiable actions',
    lead: "MAGI is not a worker that never rests: it is the intelligence layer we build every agent on. It receives the context of an operation, uses tools, keeps what matters, acts within explicit policies and leaves a record of every step it takes.",
    items: [
      {
        title: 'Context, not guesses',
        body: 'An agent should not receive "everything we know", but the right information for the next step. MAGI builds that context from what your operation already knows: data, documents, history.',
      },
      {
        title: 'Tools and limits',
        body: 'MAGI uses declared tools and operates within explicit policies: it knows what it can do, with which permissions, and what needs approval before acting. The final word is still a person’s.',
      },
      {
        title: 'Graded autonomy',
        body: 'Not everything is done the same way. Observations and recommendations run on their own; reversible actions go through a policy and stay auditable; and sensitive or critical actions are always approved by a responsible person.',
      },
    ],
    terminalLines: [
      '[magi] 09:41 — context ready · permissions: read',
      '[magi] 09:41 — 37 of 38 signals current',
      '[magi] 09:42 — 1 signal requires review',
      '[magi] 09:42 — recommendation prepared · pending approval',
    ],
    figure: {
      alt: "Abstract illustration of Joyan's intelligence layer",
      caption: 'MAGI, the intelligence layer of Joyan — original illustration',
    },
    motion: {
      canvasLabel: 'MAGI agent network in motion',
      staticStatus: 'MAGI network at rest',
      activeStatus: 'MAGI network in motion',
    },
  },
  hardware: {
    index: '03',
    kicker: 'Connected systems',
    title: 'What happens in the real world, with evidence',
    lead: 'Not every operation happens on a screen. When it needs to, we connect devices, sensors and gateways to record what is happening —with time, precision and origin— and so the system stays useful even when the connection fails.',
    items: [
      {
        title: 'State, not inference',
        body: 'Every reading carries time, precision and source. The state of the world is recorded deterministically; interpretation is a separate step, and is always labeled as such.',
      },
      {
        title: 'Data with a freshness date',
        body: 'Old data that looks current is a risk. That is why we always show since when we know what we know, and which part is still pending synchronization.',
      },
      {
        title: 'Useful without a connection',
        body: 'The systems we design keep working when the network drops: they record on site and sync when it is back. The visibility of an operation should not depend on having signal.',
      },
    ],
    figure: {
      alt: 'Abstract illustration of a device connected to a network',
      caption: 'Systems connected to the physical world — original illustration',
    },
    prototypeInvitation: {
      status: 'In development',
      body: 'We are building this connected-systems layer together with our community. There is no sale, no schedule and we promise no availability: when something concrete exists, you will read about it here.',
    },
  },
  ecosystem: {
    index: '04',
    kicker: 'Ecosystem',
    title: 'A cooperative, a community',
    lead: 'Joyan is a collective project: people who build agents and systems, run them and share what they learn. We believe this technology is worth it when its benefits are shared: the more businesses adopt it with judgment, the stronger every agent and every community becomes.',
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
          title: 'Building an agent from the start',
          body: 'We are looking for businesses that want to build an agent with us in an early stage. It is still in development: there are no slots and no dates, and we will announce them here when there are.',
        },
        hardwareAgentPrototypeInvitation: {
          title: 'Conversations about connected systems',
          body: 'We want to talk with people whose operation makes knowing what happens on site a real problem. This is ongoing exploration: no dates, no enrollment and no delivery.',
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
    tagline: 'From context to action. People in charge.',
    legal: '© 2026 Joyan — Cooperative. All rights reserved.',
  },
} satisfies LocaleContent;
