# Configuracion de Stitch MCP

Este archivo configura el MCP server de Google Stitch para este proyecto.

## ⚠️ IMPORTANTE: Configurar tu API Key

Antes de usar Stitch, debes reemplazar la API key en este archivo.

### Paso 1: Obtener tu API Key

1. Ve a https://stitch.google.com/settings
2. Inicia sesion con tu cuenta de Google
3. Ve a la seccion "API Keys"
4. Click en "Create API Key"
5. Copia la key generada

### Paso 2: Configurar en opencode.json

Abre el archivo `.opencode/opencode.json` y reemplaza:

```json
"X-Goog-Api-Key": "REPLACE_WITH_YOUR_STITCH_API_KEY"
```

Por tu key real:

```json
"X-Goog-Api-Key": "tu-api-key-aqui"
```

### Ejemplo completo

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "stitch": {
      "enabled": true,
      "type": "remote",
      "url": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "AIza..."
      }
    }
  }
}
```

## 🔄 Reiniciar OpenCode

Despues de configurar la API key, reinicia OpenCode para que cargue el MCP server.

## 🧪 Verificar que funciona

Una vez configurado, el agente deberia poder:
- Listar proyectos de Stitch
- Generar pantallas desde texto
- Editar disenos existentes

Prueba con un mensaje como:
> "Genera un hero section para una landing page de SaaS"

## 🚨 Seguridad

**NUNCA hagas commit de tu API key real.**

Si accidentalmente commiteaste tu key:
1. Ve a https://stitch.google.com/settings
2. Elimina la key comprometida
3. Genera una nueva
4. Actualiza este archivo con la nueva key
