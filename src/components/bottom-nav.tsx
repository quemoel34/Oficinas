'use client';

import { LayoutDashboard, PlusCircle, List, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: 'monitor', label: 'Monitor', icon: LayoutDashboard },
  { id: 'new-visit', label: 'Nova', icon: PlusCircle },
  { id: 'visits', label: 'Visitas', icon: List },
  { id: 'fleets', label: 'Frotas', icon: Truck },
];

export function BottomNav({ activePage, onPageChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-card/80 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-4 items-center justify-items-center">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              'flex h-full w-full flex-col items-center justify-center gap-1 rounded-none relative pt-2 pb-1 transition-colors duration-200',
              activePage === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onPageChange(item.id)}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
            <div className={cn(
                "absolute top-0 h-1 w-10 rounded-b-full bg-gradient-to-r from-primary to-accent transition-all duration-300",
                activePage === item.id ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
            )} />
          </Button>
        ))}
      </div>
    </nav>
  );
}
