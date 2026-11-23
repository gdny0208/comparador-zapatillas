import * as XLSX from 'xlsx'

export type Producto = {
  id: string
  tienda: string
  marca: string
  modelo: string
  precio: number
  moneda: string
  url: string
  fecha: string
}

// Columnas que genera el workflow de n8n en zapatillas.xlsx
export const COLUMNAS = ['Tienda', 'Marca', 'Modelo', 'Precio', 'Moneda', 'URL', 'Fecha de scrapeo'] as const

// URL pública del Excel que el workflow sube a la rama "data" del repositorio
export const DATA_URL =
  process.env.DATA_URL ??
  'https://raw.githubusercontent.com/gdny0208/comparador-zapatillas/data/zapatillas.xlsx'

const texto = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

/** Convierte el contenido binario de zapatillas.xlsx en la lista de productos. */
export function leerExcel(contenido: ArrayBuffer | Uint8Array): Producto[] {
  const libro = XLSX.read(contenido, { type: 'array' })
  const hoja = libro.Sheets[libro.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' })
  return filas
    .map((fila, i) => ({
      id: `${i}`,
      tienda: texto(fila['Tienda']),
      marca: texto(fila['Marca']),
      modelo: texto(fila['Modelo']),
      precio: Number(fila['Precio']),
      moneda: texto(fila['Moneda']) || 'PEN',
      url: texto(fila['URL']),
      fecha: texto(fila['Fecha de scrapeo']),
    }))
    .filter((p) => p.tienda && p.modelo && Number.isFinite(p.precio))
}

/** Fecha del último scrapeo: la más reciente del Excel. */
export function ultimaFecha(productos: Producto[]): string {
  return productos.reduce((max, p) => (p.fecha > max ? p.fecha : max), '')
}

/** Descarga el Excel publicado por n8n (sin caché, para ver siempre la última ejecución). */
export async function cargarProductos(): Promise<Producto[]> {
  const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`No se pudo descargar el Excel (${res.status})`)
  return leerExcel(new Uint8Array(await res.arrayBuffer()))
}
