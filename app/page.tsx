import Buscador from '@/components/Buscador'
import { cargarProductos, ultimaFecha, type Producto } from '@/lib/productos'

// Se renderiza en cada visita para leer siempre el último Excel generado por n8n
export const dynamic = 'force-dynamic'

const formatoFecha = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' })
    : 'sin datos'

export default async function Page() {
  let productos: Producto[] = []
  let error = ''
  try {
    productos = await cargarProductos()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error desconocido'
  }
  const tiendas = new Set(productos.map((p) => p.tienda))

  return (
    <main>
      <header className="cabecera">
        <p className="kicker">Comparador de precios</p>
        <h1>Zapatillas en Perú</h1>
        <p className="sub">
          Precios de {tiendas.size} tiendas en línea, extraídos por un agente de IA en n8n y guardados en un Excel.
        </p>
        <p className="fecha">
          Último scrapeo: <strong>{formatoFecha(ultimaFecha(productos))}</strong> · {productos.length} productos
        </p>
      </header>
      {error ? <p className="error">No se pudieron cargar los datos: {error}</p> : <Buscador productos={productos} />}
      <footer>
        Examen Final E-Commerce 2026-2 · Giuseppe Antonio Del Negro Yabar ·{' '}
        <a href="https://github.com/gdny0208/comparador-zapatillas">Repositorio</a>
      </footer>
    </main>
  )
}
