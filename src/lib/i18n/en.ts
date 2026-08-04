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
    lead: 'We create digital agents that operate your business systems and keep them working every day, around the clock. Real people design, tune and answer for every agent.',
    ctaPrimary: 'Meet MAGI',
    ctaSecondary: 'See the ecosystem',
  },
  agents: {
    index: '01',
    kicker: 'Agents as a service',
    title: 'Digital specialists, built to fit',
    lead: "We don't sell software: we create agents. Each agent is a digital specialist designed for one concrete task of your operation, executed autonomously.",
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
        body: 'Behind every agent there is a human team from the cooperative that designs it, tunes it and responds when something changes.',
      },
    ],
  },
  magi: {
    index: '02',
    kicker: 'Our main agent',
    title: 'MAGI runs your operation, non-stop',
    lead: 'MAGI is our main agent: it works around the clock, autonomously and in the background, operating your business systems without depending on a screen or someone watching over it.',
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
  },
  ecosystem: {
    index: '04',
    kicker: 'Ecosystem',
    title: 'A cooperative, a community',
    lead: 'Joyan is a collective project: people who create agents, run them and share what they learn. The stronger the community, the stronger every agent.',
    items: [
      {
        title: 'Cooperative',
        body: 'We are people who cooperate: knowledge, tools and results are shared, not concentrated.',
      },
      {
        title: 'Technical community',
        body: 'We share patterns, learnings and open tools so more people can build their own agents.',
      },
      {
        title: 'Made by people',
        body: 'No smoke and mirrors: a human team designs, operates and improves every agent from real feedback from real businesses.',
      },
    ],
  },
  footer: {
    tagline: 'Specialized agents. People in charge.',
    legal: '© 2026 Joyan — Cooperative. All rights reserved.',
  },
} satisfies LocaleContent;
