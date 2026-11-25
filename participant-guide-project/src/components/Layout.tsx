import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { VidaCareAssistant } from './VidaCareAssistant';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#F0FCF8] text-[#202B29]">
      <Navbar />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
      <VidaCareAssistant />
    </div>
  );
};
