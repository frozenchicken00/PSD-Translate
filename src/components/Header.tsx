import Link from 'next/link';
import { auth } from '@/auth';

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="bg-background border-b border-foreground/10 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Site Name</h1>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {user.image && (
                <img 
                  src={user.image} 
                  alt={user.name || 'User'} 
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium">
                <Link href="/profile" className="hover:text-foreground/70">{user.name}</Link>
              </span>
            </div>
          ) : (
            <Link 
              href="/signin" 
              className="hover:text-foreground/70"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}