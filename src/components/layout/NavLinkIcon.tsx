import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
      "relative h-12 w-24 rounded-lg flex flex-col items-center justify-center gap-1 text-primary hover:text-primary transition-colors",
      "focus-visible:ring-offset-0 focus-visible:ring-transparent",
      "hover:bg-transparent", // Explicitly remove background hover
      isActive && "text-primary"
    )}>
      <Link to={to} className="group flex flex-col items-center justify-center w-full h-full">
        <Icon className="h-6 w-6" />
        <span className="text-xs mt-1">{label}</span>
        {/* Underline always rendered, controlled by classes */}
        <div className={cn(
          "absolute bottom-0 h-1 bg-icon-active-underline rounded-t-sm transition-all duration-200",
          "w-0 opacity-0", // Hidden by default
          "group-hover:w-1/2 group-hover:opacity-100", // Visible on hover
          isActive && "w-1/2 opacity-100" // Always visible and correct width when active
        )} />
      </Link>
    </Button>
  );
}