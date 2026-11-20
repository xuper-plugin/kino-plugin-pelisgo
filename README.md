# Kino plugin: Pelisgo

Películas y series de **[pelisgo.online](https://pelisgo.online)** en una pestaña de Kino (Inicio, Películas, Series
y buscador). Reproduce por enlaces directos; **sin torrents**.

## Instalar

En Kino, Plugins ▸ Agregar plugin:

```
xuper-plugin/kino-plugin-pelisgo
```

La primera vez te pedirá instalar **Kino Resolver** (el motor de reproducción compartido, gratis): un botón en la
primera pantalla lo instala. Sirve para este y para otros plugins de sitios.

## Cómo funciona

Pelisgo expone una API JSON limpia (no se scrapea HTML):

- **Buscar**: `GET /api/search` — da la entrada con su id interno, que reproduce al instante.
- **Inicio**: `GET /api/trending` — tendencias (claves TMDB); el puente las lleva a la entrada del sitio al reproducir.
- **Reproducir**: `GET /api/movies/<id>/stream` y `GET /api/series/episode/<id>/stream`, protegidos por un token
  anti-bot (`POST /api/session/sync` → cabecera `x-session-id`, con cabeceras de navegador).

Cada título trae varias copias: la principal suele ser **HLS directo** (se reproduce sin resolver); okru, voe,
filemoon y doodstream pasan por **Kino Resolver** (o su navegador oculto para los que piden captcha). Los episodios
de una serie se leen de su página server-rendered (`/series/<slug>`), porque Pelisgo no tiene API de listado.

## Ajustes

- **Idioma preferido**: Latino, Castellano o Subtitulado (qué copia se abre primero).
- **Calidad máxima**.
- **Filas en Inicio**: muestra o esconde las tendencias de Pelisgo en el Inicio de Kino.

## Desarrollo

```
npm install
npm run build        # src/ -> plugin.js (esbuild)
npm test             # node --test
npm run validate     # build + sdk/validate.mjs
```
