import React, { ReactNode } from 'react';
import { NewHeader } from './NewHeader';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export function EnhancedLayout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <NewHeader />
      <main className="main-content">
        <div className="container mx-auto">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}