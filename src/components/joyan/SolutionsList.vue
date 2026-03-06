<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedVariables: Used in template
const divisions = [
  {
    id: "labs",
    title: "Joyan Labs",
    subtitle: "Innovation & R&D Foundry",
    quote: "Donde nace el futuro.",
    description: "Nuestra división de I+D y fábrica de productos propios. Anticipamos los problemas futuros creando soluciones hoy.",
    features: ["Agentes de IA Autónomos", "Soluciones a Medida", "Prototipado Experimental"],
    icon: "🧪"
  },
  {
    id: "exp",
    title: "Joyan EXP",
    subtitle: "Enterprise Experience & Software",
    quote: "El motor de tu eficiencia operativa.",
    description: "Centralizamos y optimizamos el flujo de información. Especialistas en arquitectura de gestión interna.",
    features: ["ERPs y CRMs Personalizados", "Automatización de Procesos", "Software a Medida"],
    icon: "⚙️"
  },
  {
    id: "iot",
    title: "Joyan IoT",
    subtitle: "Internet of Things & Domotics",
    quote: "Conectando tu realidad física al mundo digital.",
    description: "Rompemos la barrera entre activos físicos y datos. Inteligencia para espacios industriales y hogares.",
    features: ["IoT Industrial (IIoT)", "Monitoreo en Tiempo Real", "Domótica Avanzada"],
    icon: "📡"
  },
  {
    id: "mkt",
    title: "Joyan MKT",
    subtitle: "Digital Growth & Data Analytics",
    quote: "Marketing impulsado por datos.",
    description: "Fusionamos creatividad con ingeniería de datos. Entendemos a tu audiencia para amplificar tu mensaje.",
    features: ["Estrategias B2B/B2C", "Analítica Avanzada", "Minería de Datos"],
    icon: "📈"
  },
  {
    id: "sec",
    title: "Joyan Sec",
    subtitle: "Cybersecurity & Networks",
    quote: "Infraestructura resiliente para un mundo hostil.",
    description: "Protegemos tu activo más valioso: la información. Construimos redes seguras y controles robustos.",
    features: ["Ciberseguridad Ofensiva/Defensiva", "Arquitectura de Redes", "Gestión de Vulnerabilidades"],
    icon: "🛡️"
  }
];
</script>

<template>
  <section class="py-20 relative">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16 max-w-3xl mx-auto">
        <h2 class="text-3xl md:text-4xl font-bold mb-4 text-heading">Nuestros Pilares Tecnológicos</h2>
        <p class="text-lg text-muted">
          Diseñamos soluciones modulares que funcionan perfectamente por separado, pero que se vuelven imparables cuando trabajan juntas.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div 
          v-for="division in divisions" 
          :key="division.id"
          class="group relative p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm hover:shadow-xl hover:border-primary/30"
        >
          <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div class="relative z-10">
            <div class="text-4xl mb-6">{{ division.icon }}</div>
            <h3 class="text-2xl font-bold mb-1 text-heading group-hover:text-primary transition-colors">{{ division.title }}</h3>
            <p class="text-xs font-bold uppercase tracking-wider text-muted mb-4">{{ division.subtitle }}</p>
            
            <blockquote class="italic text-sm border-l-2 border-accent pl-4 mb-6 text-gray-600 dark:text-gray-400">
              "{{ division.quote }}"
            </blockquote>
            
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              {{ division.description }}
            </p>
            
            <ul class="space-y-2">
              <li v-for="feature in division.features" :key="feature" class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span class="mr-2 text-secondary">•</span> {{ feature }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
