'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [isSticky, setIsSticky] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 1);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return (
    <nav className={`shadow-md sticky top-0 z-10 transition-colors duration-300 ${
      isSticky ? 'bg-[var(--background)]' : 'bg-primary'
    }`}>
      <div className="container mx-auto px-4 py-3">
        <ul className="flex gap-6 items-center justify-center font-bold">
          <li className="transform hover:rotate-2 transition-transform">
            <Link href="/" className="flex items-center gap-2 hover:text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Home
            </Link>
          </li>
          {/* Other menu items remain the same */}
          <li className="transform hover:-rotate-2 transition-transform">
            <Link href="/upload-file" className="flex items-center gap-2 hover:text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4a.5.5 0 01-.5-.5v-6.293l2.146 2.147a.5.5 0 00.708 0L8.5 8.207l2.146 2.147a.5.5 0 00.708 0L13.5 8.207l2.146 2.147a.5.5 0 00.708 0L18 8.207V14.5a.5.5 0 01-.5.5z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M8 9a2 2 0 100-4 2 2 0 000 4zm0-3a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              Translate
            </Link>
          </li>
          <li className="transform hover:-rotate-2 transition-transform">
            <Link href="/community" className="flex items-center gap-2 hover:text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              Community
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}