import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buscar, normalizar } from './bm25'
import { COLUMNAS, leerExcel, ultimaFecha, type Producto } from './productos'

// Catálogo de prueba con el mismo formato que produce el workflow de n8n
const filas: [string, string, string, number][] = [
  ['Oechsle', 'Nike', 'Zapatillas Running Hombre Nike Pegasus 41', 549.9],
  ['Oechsle', 'Nike', 'Zapatillas Urbano Mujer Nike Court Vision', 329.9],
  ['Oechsle', 'adidas', 'Zapatillas Adidas Hombre Samba OG', 459.9],
  ['Footloose', 'ADIDAS', 'Zapatillas Adidas Samba OG Blanco para Hombre', 499.9],
  ['Footloose', 'NEW BALANCE', 'Zapatillas New Balance 530 Gris para Mujer', 489.9],
  ['Estilos', 'Adidas', 'Zapatillas Running Hombre Adidas Runfalcon 5', 249.9],
  ['Estilos', 'Puma', 'Zapatillas Puma Atlético Hombre Smash 3.0', 199.9],
  ['Estilos', 'Nike', 'Zapatillas Nike Running Mujer Revolution 7', 279.9],
]
const productos: Producto[] = filas.map(([tienda, marca, modelo, precio], i) => ({
  id: String(i), tienda, marca, modelo, precio, moneda: 'PEN', url: `https://ejemplo.pe/${i}`, fecha: '2026-11-23T12:00:00-05:00',
}))
const orden = (q: string) => buscar(q, productos).map((r) => `${r.producto.tienda}|${r.producto.modelo}`)

describe('normalizar', () => {
  it('quita tildes, mayúsculas y separa por caracteres no alfanuméricos', () => {
    expect(normalizar('ZAPATILLAS ATLÉTICO, 3.0')).toEqual(['zapatillas', 'atletico', '3', '0'])
  })
})

describe('buscar (BM25 sobre marca y modelo)', () => {
  it('"nike running hombre": la Nike running de hombre sale primero', () => {
    expect(orden('nike running hombre').slice(0, 3)).toEqual([
      'Oechsle|Zapatillas Running Hombre Nike Pegasus 41',
      'Estilos|Zapatillas Nike Running Mujer Revolution 7',
      'Estilos|Zapatillas Running Hombre Adidas Runfalcon 5',
    ])
  })

  it('"adidas samba": compara el mismo modelo en dos tiendas, más barato primero en empate', () => {
    expect(orden('adidas samba').slice(0, 2)).toEqual([
      'Oechsle|Zapatillas Adidas Hombre Samba OG',
      'Footloose|Zapatillas Adidas Samba OG Blanco para Hombre',
    ])
  })

  it('ignora mayúsculas y tildes: "ZAPATILLAS ATLÉTICO" = "zapatillas atletico"', () => {
    expect(orden('ZAPATILLAS ATLÉTICO')).toEqual(orden('zapatillas atletico'))
    expect(orden('zapatillas atletico')[0]).toBe('Estilos|Zapatillas Puma Atlético Hombre Smash 3.0')
  })

  // CASO 7: prueba de BM25 rota a propósito para demostrar que el pipeline bloquea el merge
  it('prueba rota a propósito: espera que "nike running hombre" empiece por una Puma', () => {
    expect(orden('nike running hombre')[0]).toBe('Estilos|Zapatillas Puma Atlético Hombre Smash 3.0')
  })

  it('los puntajes van de mayor a menor y excluye puntaje 0', () => {
    const r = buscar('nike running', productos)
    expect(r.map((x) => x.puntaje)).toEqual([...r.map((x) => x.puntaje)].sort((a, b) => b - a))
    expect(r.every((x) => x.puntaje > 0)).toBe(true)
    expect(buscar('inexistente', productos)).toEqual([])
  })
})

describe('leerExcel', () => {
  it('lee las columnas del Excel de n8n con precios numéricos', () => {
    const hoja = XLSX.utils.aoa_to_sheet([
      [...COLUMNAS],
      ['Oechsle', 'Nike', 'Pegasus 41', 549.9, 'PEN', 'https://www.oechsle.pe/x', '2026-11-23T10:00:00-05:00'],
      ['Footloose', 'ADIDAS', 'Samba OG', 499.9, 'PEN', 'https://www.footloose.pe/y', '2026-11-23T11:00:00-05:00'],
    ])
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'zapatillas')
    const lista = leerExcel(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }))
    expect(lista.map((p) => [p.tienda, p.precio])).toEqual([['Oechsle', 549.9], ['Footloose', 499.9]])
    expect(ultimaFecha(lista)).toBe('2026-11-23T11:00:00-05:00')
  })
})
