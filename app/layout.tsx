import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '철도안전관리자 학습앱',
  description: '철도교통안전관리자 자격시험 학습 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}