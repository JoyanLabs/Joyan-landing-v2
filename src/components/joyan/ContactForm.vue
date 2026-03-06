<script setup lang="ts">
import { ref } from 'vue';


const form = ref({
  name: '',
  email: '',
  challenge: '',
  message: ''
});


const isSubmitting = ref(false);

const isSuccess = ref(false);


// biome-ignore lint/correctness/noUnusedVariables: Used in template
const handleSubmit = async () => {
  isSubmitting.value = true;
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  isSubmitting.value = false;
  isSuccess.value = true;
  form.value = { name: '', email: '', challenge: '', message: '' };
};
</script>

<template>
  <section class="py-20">
    <div class="container mx-auto px-4 max-w-2xl">
      <div v-if="isSuccess" class="glass-card p-8 rounded-2xl text-center animate-fade-in border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
          <span class="text-3xl">✓</span>
        </div>
        <h3 class="text-2xl font-bold mb-2 text-heading">¡Mensaje Recibido!</h3>
        <p class="text-muted">
          Tu desafío ha sido registrado. Un especialista de Joyan te contactará en breve para iniciar la transformación.
        </p>
        <button @click="isSuccess = false" class="mt-6 text-sm text-primary hover:underline">
          Enviar otro mensaje
        </button>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="glass-card p-8 rounded-2xl space-y-6 border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div>
          <label class="block text-sm font-medium text-heading mb-2">Nombre Completo</label>
          <input 
            v-model="form.name"
            type="text" 
            required
            class="w-full bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-default placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-heading mb-2">Email Corporativo</label>
          <input 
            v-model="form.email"
            type="email" 
            required
            class="w-full bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-default placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
            placeholder="nombre@empresa.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-heading mb-2">¿Cuál es tu mayor desafío actual?</label>
          <select 
            v-model="form.challenge"
            class="w-full bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-default focus:outline-none focus:border-primary transition-colors [&>option]:bg-white [&>option]:text-black dark:[&>option]:bg-gray-900 dark:[&>option]:text-white"
          >
            <option value="" disabled selected>Selecciona un desafío...</option>
            <option value="security">Vulnerabilidades de Seguridad</option>
            <option value="iot">Falta de visibilidad en planta (IoT)</option>
            <option value="software">Procesos manuales / Software obsoleto</option>
            <option value="growth">Bajo crecimiento digital</option>
            <option value="integration">Sistemas desconectados</option>
            <option value="other">Otro</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-heading mb-2">Detalles Adicionales</label>
          <textarea 
            v-model="form.message"
            rows="4"
            class="w-full bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-default placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
            placeholder="Cuéntanos más sobre tu situación..."
          ></textarea>
        </div>

        <button 
          type="submit" 
          :disabled="isSubmitting"
          class="btn-primary w-full py-4 rounded-lg font-bold text-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="!isSubmitting">Iniciar Transformación</span>
          <span v-else class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando...
          </span>
        </button>
      </form>
    </div>
  </section>
</template>
