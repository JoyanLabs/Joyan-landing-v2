import React from 'react';
import { GradientButton } from "@/components/ui/gradient-button";

interface CardProps {
  title: string;
  desc: string;
  gradientFrom: string;
  gradientTo: string;
  link?: string;
  tags: { name: string; color: string }[];
}

const cards: CardProps[] = [
  {
    title: 'Control Parental Seguro',
    desc: 'Gestión inteligente del tiempo y acceso a dispositivos para el hogar, integrado con VPN ZeroTrust para máxima seguridad.',
    gradientFrom: '#FFB700', // IoT (Amber Gold)
    gradientTo: '#00FF94',   // Sec (Neon Green)
    link: '/success-cases/parental-control',
    tags: [
      { name: 'Joyan IoT', color: '#FFB700' },
      { name: 'Joyan Sec', color: '#00FF94' },
    ],
  },
  {
    title: 'Inteligencia de Negocios',
    desc: 'Unificación de datos de ERP y CRM para dashboards en tiempo real con Looker Studio y BigQuery.',
    gradientFrom: '#6200EA', // EXP (Deep Indigo)
    gradientTo: '#FF0080',   // MKT (Vibrant Magenta)
    link: '#',
    tags: [
      { name: 'Joyan EXP', color: '#6200EA' },
      { name: 'Joyan MKT', color: '#FF0080' },
    ],
  },
  {
    title: 'Agentes AI a Medida',
    desc: 'Desarrollo de asistentes conversacionales personalizados integrados con tus sistemas internos.',
    gradientFrom: '#00F0FF', // Labs (Cyber Blue)
    gradientTo: '#6200EA',   // EXP (Deep Indigo)
    link: '#',
    tags: [
      { name: 'Joyan Labs', color: '#00F0FF' },
      { name: 'Joyan EXP', color: '#6200EA' },
    ],
  },
];

export default function SuccessCasesCards() {
  return (
    <section id="success-cases" className="py-20 bg-transparent min-h-[600px]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Casos de Éxito</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Descubre cómo nuestras soluciones transforman problemas complejos en ventajas competitivas.
          </p>
        </div>
        
        <div className="flex justify-center items-center flex-wrap gap-10">
          {cards.map(({ title, desc, gradientFrom, gradientTo, link, tags }, idx) => (
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
                {/* Badges - Fixed layout */}
                <div className="flex flex-wrap gap-2 mb-4 max-w-full">
                  {tags.map((tag, tagIdx) => (
                    <span 
                      key={tagIdx} 
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border border-white/20 backdrop-blur-md whitespace-nowrap"
                      style={{
                        backgroundColor: `${tag.color}20`, // 20% opacity
                        color: tag.color,
                        boxShadow: `0 0 10px ${tag.color}40` // Glow effect
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
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
                    Leer Más
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
