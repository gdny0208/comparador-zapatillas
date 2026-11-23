import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Comparador de zapatillas',
  description: 'Compara precios de zapatillas en tiendas peruanas con búsqueda BM25',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
