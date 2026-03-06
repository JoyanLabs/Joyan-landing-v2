import React from 'react';
import { GradientButton } from "@/components/ui/gradient-button";

interface CardProps {
  title: string;
  desc: string;
  gradientFrom: string;
  gradientTo: string;
  link?: string;
  tagColor: string;
}

const cards: CardProps[] = [
  {
    title: 'Joyan Labs',
    desc: 'Innovación, I+D y desarrollo de software a medida. Creamos el futuro con tecnologías emergentes.',
    gradientFrom: '#00F0FF', // Cyber Blue
    gradientTo: '#0091EA',   // Darker Blue
    link: '#',
    tagColor: '#00F0FF',
  },
  {
    title: 'Joyan EXP',
    desc: 'Operaciones empresariales optimizadas. Implementación experta de ERPs y sistemas de gestión.',
    gradientFrom: '#6200EA', // Deep Indigo
    gradientTo: '#B388FF',   // Lighter Indigo
    link: '#',
    tagColor: '#6200EA',
  },
  {
    title: 'Joyan MKT',
    desc: 'Marketing digital y CRM. Potencia tu marca y gestiona tus relaciones con clientes.',
    gradientFrom: '#FF0080', // Vibrant Magenta
    gradientTo: '#FF80AB',   // Pink
    link: '#',
    tagColor: '#FF0080',
  },
  {
    title: 'Joyan Sec',
    desc: 'Ciberseguridad y redes. Protección ZeroTrust y VPNs para un entorno digital seguro.',
    gradientFrom: '#00FF94', // Neon Green
    gradientTo: '#00BFA5',   // Teal
    link: '#',
    tagColor: '#00FF94',
  },
  {
    title: 'Joyan IoT',
    desc: 'Domótica e Internet de las Cosas. Conectamos el mundo físico con la inteligencia digital.',
    gradientFrom: '#FFB700', // Amber Gold
    gradientTo: '#FFEA00',   // Yellow
    link: '#',
    tagColor: '#FFB700',
  },
];

export default function DivisionsCards() {
  return (
    <section className="py-20 bg-transparent min-h-[600px]">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center flex-wrap gap-10">
          {cards.map(({ title, desc, gradientFrom, gradientTo, link, tagColor }, idx) => (
            <div
              key={idx}
              className="group relative w-[320px] h-[400px] m-[40px_30px] transition-all duration-500"
            >
              {/* Skewed gradient panels */}
              <span
                className="absolute top-0 left-[50px] w-1/2 h-full rounded-lg transform skew-x-[15deg] transition-all duration-500 group-hover:skew-x-0 group-hover:left-[20px] group-hover:w-[calc(100%-90px)]"
                style={{
                  background: `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})`,
                }}
              />
              <span
                className="absolute top-0 left-[50px] w-1/2 h-full rounded-lg transform skew-x-[15deg] blur-[30px] transition-all duration-500 group-hover:skew-x-0 group-hover:left-[20px] group-hover:w-[calc(100%-90px)]"
                style={{
                  background: `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})`,
                }}
              />

              {/* Animated blurs */}
              <span className="pointer-events-none absolute inset-0 z-10">
                <span className="absolute top-0 left-0 w-0 h-0 rounded-lg opacity-0 bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] shadow-[0_5px_15px_rgba(0,0,0,0.08)] transition-all duration-100 animate-blob group-hover:top-[-50px] group-hover:left-[50px] group-hover:w-[100px] group-hover:h-[100px] group-hover:opacity-100" />
                <span className="absolute bottom-0 right-0 w-0 h-0 rounded-lg opacity-0 bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] shadow-[0_5px_15px_rgba(0,0,0,0.08)] transition-all duration-500 animate-blob animation-delay-1000 group-hover:bottom-[-50px] group-hover:right-[50px] group-hover:w-[100px] group-hover:h-[100px] group-hover:opacity-100" />
              </span>

              {/* Content */}
              <div className="relative z-20 left-0 p-[20px_40px] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] shadow-lg rounded-lg text-white transition-all duration-500 group-hover:left-[-25px] group-hover:p-[60px_40px] h-full flex flex-col justify-center border border-white/10">
                {/* Badge - Fixed layout */}
                <div className="mb-4 max-w-full">
                  <span 
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border border-white/20 backdrop-blur-md whitespace-nowrap inline-block"
                    style={{
                      backgroundColor: `${tagColor}20`, // 20% opacity
                      color: tagColor,
                      boxShadow: `0 0 10px ${tagColor}40` // Glow effect
                    }}
                  >
                    Division
                  </span>
                </div>

                <h3 className="text-2xl font-bold mb-4">{title}</h3>
                <p className="text-base leading-relaxed mb-6 text-gray-200">{desc}</p>
                <a href={link} className="w-fit">
                  <GradientButton 
                    className="min-w-[120px] px-6 py-2 text-sm"
                    style={{
                      // @ts-ignore - Custom properties for GradientButton
                      '--color-1': gradientFrom,
                      '--color-2': gradientTo,
                      '--color-3': gradientFrom,
                      '--color-4': gradientTo,
                      '--color-5': gradientTo,
                    } as React.CSSProperties}
                  >
                    Explorar
                  </GradientButton>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
