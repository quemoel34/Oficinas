'use client';

import Link from 'next/link';
import { Truck, LayoutDashboard, PlusCircle, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: 'monitor', label: 'Monitor', icon: LayoutDashboard },
  { id: 'new-visit', label: 'Nova Visita', icon: PlusCircle },
  { id: 'visits', label: 'Visitas', icon: List },
  { id: 'fleets', label: 'Frotas', icon: Truck },
];

export function SidebarNav({ activePage, onPageChange }: SidebarNavProps) {
  return (
    <aside className="hidden border-r bg-card md:flex md:flex-col">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <button onClick={() => onPageChange('monitor')} className="flex items-center gap-3 font-semibold text-foreground">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg shadow-md">
                <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-lg tracking-tight">Carretômetro</span>
          </button>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={'ghost'}
                size="lg"
                className={cn(
                    "justify-start gap-3 my-1 relative transition-all duration-200",
                    activePage === item.id 
                      ? "bg-primary/10 text-primary font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={() => onPageChange(item.id)}
              >
                 <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary transition-all duration-300",
                    activePage === item.id ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                )} />
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
