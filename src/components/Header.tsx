import Link from 'next/link';
import { auth } from '@/auth'
import ThemeToggle from './ThemeSwitch';
import Image from 'next/image';

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="bg-panel border-b-4 border-primary py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="comic-panel bg-primary p-1 rotate-3">
            <h1 className="text-3xl font-bold transform -rotate-3">WebtoonTL</h1>
          </div>
          <span className="text-sm font-medium italic">Your Webtoon Translation Hub</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              {user.image ? (
                <div className="border-2 border-primary rounded-full p-1">
                  <Image
                    src={user.image} 
                    alt={user.name || 'User'} 
                    className="w-10 h-10 rounded-full"
                    width={40}
                    height={40}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center text-lg font-bold">
                  {user.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="speech-bubble py-1 px-3 mb-0">
                <Link href="/profile" className="hover:text-primary font-medium">
                  {user.name}
                </Link>
              </div>
            </div>
          ) : (
            <Link 
              href="/signin" 
              className="btn"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}