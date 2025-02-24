import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-background shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <ul className="flex gap-6">
          <li><Link href="/" className="hover:text-foreground/70">Home</Link></li>
          <li><Link href="/upload-file" className="hover:text-foreground/70">Translate</Link></li>
        </ul>
      </div>
    </nav>
  );
}