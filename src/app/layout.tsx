import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Skeelus - Learn Real Skills, Get Verified',
  description: 'Accreditation platform for real-world skills. Natural language input → AI generates personalized curriculum → guided 5-stage learning journey → verified portfolio output.',
  keywords: ['learning', 'accreditation', 'skills', 'AI', 'education', 'portfolio'],
  authors: [{ name: 'Skeelus Team' }],
  openGraph: {
    title: 'Skeelus - Learn Real Skills, Get Verified',
    description: 'Transform your learning into verified skills and shareable certificates.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skeelus - Learn Real Skills, Get Verified',
    description: 'Transform your learning into verified skills and shareable certificates.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}