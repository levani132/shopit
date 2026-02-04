import { Noto_Sans_Georgian, Inter } from 'next/font/google';

// Inter for Latin characters - clean, modern font
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Noto Sans Georgian for Georgian characters - excellent Georgian support
export const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian', 'latin'],
  display: 'swap',
  variable: '--font-georgian',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});
