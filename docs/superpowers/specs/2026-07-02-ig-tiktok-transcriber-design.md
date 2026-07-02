# Extensión Chrome: Transcriptor y descargador para Instagram/TikTok

**Fecha:** 2026-07-02
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto

Extensión de Google Chrome que permite, desde el propio feed de Instagram y TikTok:
1. Transcribir el audio de un post/reel/video a texto (en español).
2. Descargar el video sin marca de agua.

Similar en funcionalidad a extensiones como "Sortfeed". Es la primera de dos extensiones planeadas; la segunda (resumen de videos de YouTube tipo Sider) se diseñará por separado.

**Uso previsto:** personal, sobre contenido público que el usuario ya puede ver en su feed. No está pensada para scraping masivo ni redistribución de contenido.

## Arquitectura

Extensión Manifest V3 con estos componentes:

- **Content script** (`content.js`): inyectado en `instagram.com` y `tiktok.com`. Detecta posts/reels que contienen un elemento `<video>` y les agrega dos botones (transcribir, descargar) junto a los controles nativos de like/comentar. No se inyecta nada en posts sin video (fotos, carruseles de solo imágenes).
- **Service worker** (`background.js`): usa `chrome.webRequest` para observar las peticiones de red hacia los dominios CDN de video (`*.cdninstagram.com`, dominios CDN de TikTok) y capturar la URL real del archivo de video cuando el usuario lo reproduce. Esto es necesario porque el `<video>` de la página muchas veces expone un `blob:` URL no descargable directamente en vez del link real.
- **Offscreen document**: usado para correr el modelo de transcripción (Whisper) sin bloquear el service worker, ya que MV3 no permite tareas pesadas de cómputo directamente ahí.
- **Librería de transcripción:** `@xenova/transformers` con el modelo `whisper-base`, forzado a español (`language: "es"`), corriendo 100% local vía WebAssembly. Sin API key, sin costo, sin conexión a servidores propios.

**Permisos del manifest:** `webRequest`, `downloads`, `offscreen`; host permissions acotados a `*.instagram.com`, `*.tiktok.com`, dominios CDN de video de ambas plataformas, y `huggingface.co` (para la descarga inicial del modelo). Sin `<all_urls>`.

## Flujo de detección y captura del video

1. Al entrar en pantalla o reproducirse un post/reel, el content script detecta el `<video>` y agrega los botones.
2. En paralelo, el service worker ya viene escuchando (via `webRequest`) las peticiones a los CDNs de video. Cuando detecta una que coincide en timing con el post visible, guarda la URL real asociada a ese post (identificador por pestaña + orden de aparición).
3. Al hacer clic en "Transcribir" o "Descargar", el content script pide al service worker la URL capturada:
   - Si existe → continúa el flujo normal.
   - Si no existe todavía → se le pide al usuario reproducir el video primero, con un mensaje claro (no un error críptico).
4. Con la URL real:
   - **Descargar** → `chrome.downloads.download()` directo, sin reprocesar nada.
   - **Transcribir** → `fetch()` del video, extracción de audio, envío al offscreen document.

Esta es la misma técnica que usan extensiones como Sortfeed: no existe una forma de "pedir" el video directamente a Instagram/TikTok, hay que interceptar la red mientras el usuario lo reproduce.

## Flujo de transcripción (Whisper local)

1. **Primera vez:** se descarga el modelo `whisper-base` (~150MB) desde Hugging Face y se cachea (IndexedDB/Cache API del navegador). Se muestra progreso de descarga ("Descargando modelo de IA... 45%"). Usos posteriores arrancan directo desde caché.
2. **Extracción de audio:** el video obtenido via `fetch` se decodifica con Web Audio API, se convierte a mono 16kHz PCM (formato esperado por Whisper).
3. **Transcripción:** el audio PCM se envía al offscreen document, que corre Whisper forzado en español y devuelve el texto.
4. **Tiempo estimado:** 5-20 segundos para un clip de 30-60s en CPU vía WASM, dependiendo del equipo. Se muestra un spinner ("Transcribiendo...").
5. **Resultado:** texto plano mostrado en un panel debajo del post, con botón de copiar al portapapeles. Sin timestamps (no se justifican en videos cortos).

## UI/UX

- Dos íconos nuevos (transcribir, descargar) integrados visualmente junto a like/comentar/compartir, mismo tamaño/estilo que los nativos.
- **Estados del botón de transcribir:** reposo → descargando modelo (primera vez, con progreso) → transcribiendo (spinner) → listo (panel de texto) → error (ícono rojo + tooltip).
- **Botón de descargar:** descarga inmediata si la URL ya fue capturada; si no, tooltip "Reproducí el video primero".
- **Panel de transcripción:** caja de texto plano con fondo gris claro, botón de copiar, botón de cerrar ("X"). Aparece debajo del post.
- Descarga es solo del video (`.mp4`); no se genera archivo de transcripción separado (sí se puede copiar el texto del panel).

## Manejo de errores y casos límite

- **Video no capturado aún:** mensaje pidiendo reproducir el video primero.
- **Fetch bloqueado por CORS:** mensaje "No se pudo procesar este video, probá recargando la página".
- **Falla la descarga del modelo** (sin internet, Hugging Face caído): mensaje de error con opción de reintentar.
- **Posts sin video:** no se inyectan botones.
- **Audio sin habla** (música instrumental, etc.): mensaje "No se detectó habla en este video" si la confianza de la transcripción es muy baja.
- **Cola de procesamiento:** el offscreen document procesa una transcripción a la vez para no saturar CPU/memoria si el usuario dispara varias seguidas.
- Instagram/TikTok pueden cambiar su estructura de página y romper la detección en cualquier momento; es un riesgo inherente a este tipo de herramientas.

## Testing y verificación

- **Tests unitarios** para lógica pura: conversión de audio a PCM 16kHz, parseo de URLs de CDN, cola de procesamiento.
- **Verificación manual en navegador** (obligatoria antes de dar por terminado):
  1. Cargar la extensión "unpacked" en Chrome (`chrome://extensions` → modo desarrollador → Cargar descomprimida).
  2. Probar en Instagram: scroll por el feed, reproducir un Reel, transcribir y descargar.
  3. Repetir en TikTok.
  4. Casos límite: post sin video, video muy corto, sin conexión a internet, dos transcripciones seguidas.
- **Verificación de permisos:** confirmar que el manifest no pide permisos de más.

## Fuera de alcance (por ahora)

- Instagram Stories (reproductor y ciclo de vida distintos, más complejos de capturar).
- Timestamps en la transcripción.
- Exportar la transcripción como archivo de texto separado.
- Auto-detección de idioma (queda fijo en español).
- La extensión de resumen de videos de YouTube (se diseñará como proyecto separado).
