'use client'

import { useMemo, useState } from 'react'
import { buscar } from '@/lib/bm25'
import type { Producto } from '@/lib/productos'

const soles = (p: Producto) =>
  `${p.moneda === 'PEN' ? 'S/' : p.moneda} ${p.precio.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Buscador({ productos }: { productos: Producto[] }) {
  const [consulta, setConsulta] = useState('')
  const [tienda, setTienda] = useState('Todas')
  const tiendas = useMemo(() => ['Todas', ...new Set(productos.map((p) => p.tienda))], [productos])

  const resultados = useMemo(() => {
    const base = tienda === 'Todas' ? productos : productos.filter((p) => p.tienda === tienda)
    if (!consulta.trim()) return base.map((producto) => ({ producto, puntaje: null as number | null }))
    return buscar(consulta, base)
  }, [consulta, tienda, productos])

  return (
    <section>
      <div className="controles">
        <label className="buscador">
          <span>Buscar zapatillas</span>
          <input
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Ej. nike running hombre, adidas samba…"
            aria-label="Buscar zapatillas"
          />
        </label>
        <label className="filtro">
          <span>Tienda</span>
          <select value={tienda} onChange={(e) => setTienda(e.target.value)} aria-label="Filtrar por tienda">
            {tiendas.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="conteo">
        {consulta.trim()
          ? `${resultados.length} resultados para "${consulta}", ordenados por puntaje BM25`
          : `${resultados.length} zapatillas en el catálogo`}
      </p>

      <ul className="grilla">
        {resultados.map(({ producto: p, puntaje }) => (
          <li key={p.id} className="tarjeta">
            <span className={`tienda tienda-${p.tienda.toLowerCase().replace(/[^a-z]/g, '')}`}>{p.tienda}</span>
            <p className="marca">{p.marca}</p>
            <h3 className="modelo">{p.modelo}</h3>
            <p className="precio">{soles(p)}</p>
            {puntaje !== null && <p className="puntaje">BM25: {puntaje.toFixed(3)}</p>}
            <a href={p.url} target="_blank" rel="noopener noreferrer">
              Ver en {p.tienda} →
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
