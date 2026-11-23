# Comparador de precios de zapatillas

Examen Final de E-Commerce (Pregrado 2026-2) — **Giuseppe Antonio Del Negro Yabar**

- **Web publicada (Vercel):** https://comparador-zapatillas.vercel.app/
- **Repositorio (GitHub):** https://github.com/gdny0208/comparador-zapatillas
- **Excel con los datos:** https://raw.githubusercontent.com/gdny0208/comparador-zapatillas/data/zapatillas.xlsx

Un **agente de IA en n8n** (levantado en Docker) scrapea zapatillas de tres tiendas peruanas, limpia los datos, genera `zapatillas.xlsx`, lo publica en este repositorio y envía dos correos por ejecución. Una **web en Next.js** publicada en Vercel lee ese Excel y permite comparar precios con un buscador **BM25**.

## Arquitectura

```
n8n (Docker) ── workflow-scraping ──────────────────────────────────────────────────────────┐
  Trigger (manual / webhook / diario 8:00)                                                  │
  → Tiendas (Footloose, Oechsle, Estilos)                                                   │
  → Agente de scraping  ← Modelo NVIDIA (nemotron-3.5-lightning, API compatible con OpenAI) │
                        ← Herramienta obtener_catalogo (HTTP Request → API pública VTEX)    │
  → Limpiar y consolidar (precio numérico, sin espacios, sin duplicados, tiendas que fallan)│
  → Correo [Examen Final - Scrapeo] → Excel zapatillas.xlsx → GitHub (rama data)            │
  → Correo [Examen Final - Excel] con el adjunto                                            │
n8n ── workflow-alertas: Error Trigger → correo de alerta                                   │
                                                                                            ▼
Vercel (Next.js) ── lee raw.githubusercontent.com/.../data/zapatillas.xlsx en cada visita → catálogo + buscador BM25
```

| Tienda | Empresa | Fuente |
|---|---|---|
| Footloose | Footloose | `footloose.pe/api/catalog_system/pub/products/search` |
| Oechsle | Oechsle (Intercorp) | `oechsle.pe/api/catalog_system/pub/products/search` |
| Estilos | Estilos | `estilos.com.pe/api/catalog_system/pub/products/search` |

Las tres usan VTEX y publican una API de catálogo pública pensada para consultas automatizadas.

## 1. Levantar el stack (n8n + PostgreSQL)

```bash
cd n8n
cp .env.example .env        # y reemplaza las contraseñas y la clave de cifrado
docker compose up -d
docker compose ps           # n8n y postgres en ejecución
```

- n8n usa la imagen fija `n8nio/n8n:2.48.8` y guarda sus datos en PostgreSQL 17 (no SQLite).
- Las claves viven en `.env` (no se sube al repositorio); los datos persisten en volúmenes.
- El puerto queda atado a `127.0.0.1:5678`. Abre http://localhost:5678 y crea el usuario dueño.

## 2. Importar los workflows

1. En n8n crea tres credenciales (ninguna clave va dentro de un nodo):
   - **NVIDIA (OpenAI compatible)** — tipo *OpenAI account*: API Key de build.nvidia.com y Base URL `https://integrate.api.nvidia.com/v1`.
   - **SMTP Gmail** — tipo *SMTP*: `smtp.gmail.com`, puerto 465, SSL, usuario y contraseña de aplicación.
   - **GitHub (comparador-zapatillas)** — tipo *GitHub API*: token *fine-grained* con permiso *Contents: Read and write* solo sobre este repositorio.
2. Importa `n8n/workflows/workflow-alertas.json` y luego `n8n/workflows/workflow-scraping.json` (menú ⋯ → *Import from File*), y asigna las credenciales a los nodos.
3. En *Settings* de `workflow-scraping`, elige `workflow-alertas` como *Error Workflow*.
4. **Publica** ambos workflows. Para ejecutar: botón *Execute workflow*, o `curl -X POST http://localhost:5678/webhook/scrapear-zapatillas`.

## 3. Desplegar la web

```bash
corepack enable
pnpm install
pnpm dev        # http://localhost:3000
```

Para publicar: importa el repositorio en https://vercel.com/new (detecta Next.js). La web se renderiza en cada visita y descarga el Excel de la rama `data`, así que muestra los datos nuevos tras cada ejecución del workflow sin volver a desplegar. Opcionalmente, la variable `DATA_URL` permite apuntar a otro Excel.

## Búsqueda BM25

`lib/bm25.ts` indexa **marca + modelo**. Consulta y documentos se pasan a minúsculas, se les quitan las tildes (NFD) y se separan por caracteres no alfanuméricos, así que `ZAPATILLAS ATLÉTICO` y `zapatillas atletico` devuelven lo mismo. Puntaje BM25 con `k1 = 1.2`, `b = 0.75` e IDF `ln(1 + (N − df + 0.5)/(df + 0.5))`; se excluyen puntajes 0 y en empate gana el precio más bajo. Cada resultado muestra precio, tienda y enlace al producto.

## Calidad

- `pnpm lint` (ESLint con reglas de Next.js), `pnpm test` (Vitest: orden BM25 para consultas conocidas y lectura del Excel), `pnpm build`.
- `.github/workflows/ci.yml` corre todo eso en cada pull request hacia `main` y en cada push a `main`; si un paso falla, el pipeline falla.
- `main` está protegida: no se puede fusionar un pull request si el pipeline no pasó.
