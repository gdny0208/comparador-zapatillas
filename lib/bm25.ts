import type { Producto } from './productos'

export type Resultado = { producto: Producto; puntaje: number }

/** Minúsculas, sin tildes y separado por cualquier carácter no alfanumérico. */
export function normalizar(texto: string): string[] {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** Texto indexado de cada producto: marca + modelo. */
export const documento = (p: Producto) => normalizar(`${p.marca} ${p.modelo}`)

/**
 * Ordena los productos por puntaje BM25 (k1 = 1.2, b = 0.75).
 * Excluye puntaje 0; en empate ordena por precio (más barato primero) y luego por tienda.
 */
export function buscar(consulta: string, productos: Producto[], k1 = 1.2, b = 0.75): Resultado[] {
  const terminos = [...new Set(normalizar(consulta))]
  if (!terminos.length) return []
  const docs = productos.map(documento)
  const N = docs.length
  const promedio = docs.reduce((s, d) => s + d.length, 0) / Math.max(N, 1)
  const df = new Map(terminos.map((t) => [t, docs.filter((d) => d.includes(t)).length]))

  return productos
    .map((producto, i) => {
      const doc = docs[i]
      const puntaje = terminos.reduce((total, t) => {
        const tf = doc.filter((x) => x === t).length
        if (!tf) return total
        const n = df.get(t) ?? 0
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
        return total + idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / promedio)))
      }, 0)
      return { producto, puntaje }
    })
    .filter((r) => r.puntaje > 0)
    .sort(
      (x, y) =>
        y.puntaje - x.puntaje ||
        x.producto.precio - y.producto.precio ||
        x.producto.tienda.localeCompare(y.producto.tienda) ||
        x.producto.url.localeCompare(y.producto.url),
    )
}
