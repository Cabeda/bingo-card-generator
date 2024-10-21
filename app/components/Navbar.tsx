// components/Navbar.tsx
'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="navbar">
      <ul>
        <li>
          <Link href="/" className="nav-link">
            Card Generator
          </Link>
        </li>
        <li>
          <Link href="/game" className="nav-link">
            Play Game
          </Link>
        </li>
      </ul>
    </nav>
  );
}