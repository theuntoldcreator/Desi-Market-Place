import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export function FloatingHomeButton() {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button asChild size="icon" className="rounded-full shadow-lg h-14 w-14">
        <Link to="/">
          <Home className="h-6 w-6" />
          <span className="sr-only">Go to Home</span>
        </Link>
      </Button>
    </div>
  );
}