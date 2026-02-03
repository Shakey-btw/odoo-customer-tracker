import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Odoo Customer Tracking Bot',
  description: 'Automated tracking of new Odoo customers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
