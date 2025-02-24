export default function Footer() {
  return (
    <footer className="bg-background border-t border-foreground/10 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-foreground/70"> &copy; {new Date().getFullYear()} Your Site Name. All rights reserved.</p>
      </div>
    </footer>
  );
}