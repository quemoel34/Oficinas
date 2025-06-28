'use client';

import { Dashboard } from '@/components/dashboard';
import Header from '@/components/header';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SidebarNav } from '@/components/sidebar-nav';
import { BottomNav } from '@/components/bottom-nav';
import { logActivity } from '@/lib/activity-logger';
import { Button } from '@/components/ui/button';
import { RequestAccessDialog } from '@/components/auth/request-access-dialog';

function LoginPrompt({ onRequestAccessClick }: { onRequestAccessClick: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-transparent -m-4 md:-m-8">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/50 to-background opacity-50 z-0"></div>
      <Card className="w-full max-w-md text-center shadow-2xl bg-card/80 backdrop-blur-sm border-primary/20 transform-gpu transition-all hover:scale-[1.02] duration-300 z-10">
        <CardHeader>
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent/80 mb-4 shadow-lg ring-4 ring-primary/10">
            <Truck className="h-12 w-12 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent tracking-tight">
            Carretômetro
          </CardTitle>
          <CardDescription className="text-lg text-foreground/80">
            Gestão Inteligente de Frotas
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Acesse o sistema ou solicite seu cadastro para começar.
          </p>
          <Button variant="link" className="mt-4 text-accent" onClick={onRequestAccessClick}>
            Solicitar Acesso
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [activePage, setActivePage] = useState('monitor');
  const [requestAccessOpen, setRequestAccessOpen] = useState(false);

  const onPageChange = (page: string) => {
    setActivePage(page);
    if (isAuthenticated && user) {
      logActivity(user.name, 'NAVIGATION', `Navegou para a aba: ${page}`);
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('Service Worker registration successful with scope: ', registration.scope);
          },
          (err) => {
            console.log('Service Worker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return (
    <>
      <div className="flex min-h-screen w-full bg-background">
        {isAuthenticated && <SidebarNav activePage={activePage} onPageChange={onPageChange} />}
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-20 md:pb-8 relative">
            {isAuthenticated ? (
              <Dashboard activeTab={activePage} onTabChange={onPageChange} />
            ) : (
              <LoginPrompt onRequestAccessClick={() => setRequestAccessOpen(true)} />
            )}
          </main>
        </div>
        {isAuthenticated && <BottomNav activePage={activePage} onPageChange={onPageChange} />}
      </div>
      <RequestAccessDialog open={requestAccessOpen} onOpenChange={setRequestAccessOpen} />
    </>
  );
}
