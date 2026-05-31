import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

// Primary font for UI
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Heading font for "Premium" feel
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'linq | College-First Operating System',
  description: 'Unified digital infrastructure for colleges, clubs, and events.',
};

import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import AICopilot from '@/components/AICopilot';
import PostAnnouncementFAB from '@/components/PostAnnouncementFAB';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body style={{ fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
        <ThemeProvider>
          <AuthProvider>
            <AICopilot />
            <PostAnnouncementFAB />
            <main className="min-h-screen flex flex-col">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
