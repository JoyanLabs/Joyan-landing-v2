# Stitch MCP Configuration

Stitch MCP se configura manualmente en OpenCode:

1. Abre OpenCode Settings
2. Ve a MCP Servers
3. Agrega un nuevo servidor HTTP con:
   - Name: `stitch`
   - URL: `https://stitch.googleapis.com/mcp`
   - Header: `X-Goog-Api-Key: TU-API-KEY`

Obtén tu API key en: https://stitch.google.com/settings

**IMPORTANTE**: Nunca commitees tu API key al repositorio.
