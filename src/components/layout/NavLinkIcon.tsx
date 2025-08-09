import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Corrected from '=>' to 'from'
import React from 'react';

interface NavLinkIconProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

export function NavLinkIcon({ to, icon: Icon, label }: NavLinkIconProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Button asChild variant="ghost" className={cn(
      "relative h-12 w-24 rounded-lg flex flex-col items-center justify-center gap-1 text-primary hover:text-primary transition-colors", // Changed text color to green
      "hover:bg-icon-bg focus-visible:ring-offset-0 focus-visible:ring-transparent",
      isActive && "text-primary" // Ensure active text is also green
    )}>
      <Link to={to} className="flex flex-col items-center justify-center w-full h-full">
        <Icon className="h-6 w-6" />
        <span className="text-xs mt-1">{label}</span>
        {isActive && (
          // Reduced width to w-1/2
          <div className="absolute bottom-0 h-1 w-1/2 bg-icon-active-underline rounded-t-sm" /> 
        )}
      </Link>
    </Button>
  );
}