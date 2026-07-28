import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'ReachInBox — Email Job Scheduler',
  description: 'Schedule and manage email campaigns with intelligent rate limiting and delivery tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e1e45',
                color: '#e2e8f0',
                border: '1px solid #2d2d5e',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
