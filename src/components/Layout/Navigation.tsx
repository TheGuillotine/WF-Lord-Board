import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export function Navigation() {
  const router = useRouter();
  
  const isActive = (path: string) => {
    return router.pathname === path ? 'active' : '';
  };
  
  return (
    <nav className="main-nav">
      <ul className="nav-links">
        <li className={`nav-item ${isActive('/')}`}>
          <Link href="/">
            <span className="nav-link">Lords List</span>
          </Link>
        </li>
        <li className={`nav-item ${isActive('/stakers')}`}>
          <Link href="/stakers">
            <span className="nav-link">Stakers Data</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}