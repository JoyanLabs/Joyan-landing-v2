<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedVariables: Used in template
const cases = [
  {
    id: 1,
    title: "Planta de Producción 4.0",
    category: "IoT + EXP",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2070",
    summary: "Digitalización completa de una planta manufacturera. Implementación de sensores IoT para monitoreo de maquinaria y desarrollo de un dashboard centralizado (EXP) para la toma de decisiones en tiempo real.",
    results: ["30% aumento en eficiencia", "Reducción de paradas no programadas", "ROI en 6 meses"]
  },
  {
    id: 2,
    title: "Lanzamiento Fintech Segura",
    category: "Sec + MKT",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1470",
    summary: "Estrategia integral para una nueva Fintech. Auditoría de seguridad bancaria (Sec) y campaña de marketing de confianza (MKT) para captación de primeros usuarios.",
    results: ["Certificación PCI DSS", "10k usuarios en primer mes", "Cero incidentes de seguridad"]
  },
  {
    id: 3,
    title: "Ecosistema Smart City",
    category: "All-in-One",
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=2069",
    summary: "Proyecto piloto de ciudad inteligente. Integración de sensores ambientales, app ciudadana y seguridad de datos.",
    results: ["Mejora en calidad del aire", "Participación ciudadana activa", "Premio Innovación 2024"]
  }
];
</script>

<template>
  <section class="py-20">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div 
          v-for="caseItem in cases" 
          :key="caseItem.id"
          class="glass-card rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
        >
          <div class="relative h-48 overflow-hidden">
            <img 
              :src="caseItem.image" 
              :alt="caseItem.title" 
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div class="absolute top-4 right-4 bg-black/70 dark:bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border border-white/20 text-white">
              {{ caseItem.category }}
            </div>
          </div>
          
          <div class="p-6">
            <h3 class="text-xl font-bold mb-3 text-heading">{{ caseItem.title }}</h3>
            <p class="text-muted text-sm mb-6 line-clamp-3">
              {{ caseItem.summary }}
            </p>
            
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-muted mb-2">Resultados Clave</h4>
              <ul class="space-y-1">
                <li v-for="result in caseItem.results" :key="result" class="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                  <span class="text-secondary mr-2">•</span> {{ result }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
