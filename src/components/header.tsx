'use client';

import { Truck, LogOut, UserCog, User, Download, Link as LinkIcon, RefreshCw, Power, BellRing, FileClock, Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LoginDialog } from './auth/login-dialog';
import { RegisterUserDialog } from './auth/register-user-dialog';
import { AdminLoginDialog } from './auth/admin-login-dialog';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ManageUsersDialog } from './auth/manage-users-dialog';
import { ExportDialog } from './export-dialog'; 
import { getVisits, getFleets } from '@/lib/data-manager';
import { cn } from '@/lib/utils';
import { ActivityMonitorDialog } from './auth/activity-monitor-dialog';
import { useTheme } from '@/contexts/theme-provider';

export default function Header() {
  const { isAuthenticated, user, logout, getAccessRequests, getPendingPasswordRequests } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [manageUsersOpen, setManageUsersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activityMonitorOpen, setActivityMonitorOpen] = useState(false);
  const [adminLoginForMonitorOpen, setAdminLoginForMonitorOpen] = useState(false);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const { theme, setTheme } = useTheme();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const prevOnlineStatus = useRef(isOnline);

  useEffect(() => {
    // Check for pending access and password requests to show notifications.
    if(isAuthenticated && user?.role === 'SUPER_ADMIN'){
      const pendingAccess = getAccessRequests().filter(req => req.status === 'PENDING');
      const pendingPasswords = getPendingPasswordRequests();
      setHasPendingRequests(pendingAccess.length > 0 || pendingPasswords.length > 0);
    } else {
      setHasPendingRequests(false);
    }
  }, [getAccessRequests, getPendingPasswordRequests, isAuthenticated, user, manageUsersOpen]);
  
  useEffect(() => {
    // Detect if the app has come back online
    if (!prevOnlineStatus.current && isOnline) {
      toast({
        title: 'Conexão Restaurada!',
        description: 'Iniciando sincronização automática de dados...',
      });
      // Simulate sync after a short delay
      setTimeout(() => {
        toast({
            title: 'Sincronização Automática Concluída!',
            description: 'Seus dados locais foram atualizados.',
        });
      }, 2000);
    }
    // Update the previous status for the next check
    prevOnlineStatus.current = isOnline;
  }, [isOnline, toast]);


  const handleAdminSuccess = () => {
    setAdminLoginOpen(false);
    setManageUsersOpen(true);
  };
  
  const handleAdminSuccessForMonitor = () => {
    setAdminLoginForMonitorOpen(false);
    setActivityMonitorOpen(true);
  };

  const handleManageUsersClick = () => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') {
        setManageUsersOpen(true);
    } else {
        setAdminLoginOpen(true);
    }
  };

  const handleActivityMonitorClick = () => {
      if (isAuthenticated && user?.role === 'SUPER_ADMIN') {
          setActivityMonitorOpen(true);
      } else {
          setAdminLoginForMonitorOpen(true);
      }
  };

  const handleSync = () => {
    toast({
      title: 'Sincronização iniciada',
      description: 'Seus dados estão sendo sincronizados. (Simulação)',
    });
    setTimeout(() => {
        toast({
            title: 'Sincronização Concluída!',
            description: 'Seus dados locais foram atualizados.',
        });
    }, 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6">
        <div className="flex-1" />
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Alternar tema</span>
          </Button>
          
          {isAuthenticated && (
            <>
            <TooltipProvider>
                <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setExportOpen(true)}>
                        <Download className="h-5 w-5"/>
                        <span className="sr-only">Exportar Dados</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Exportar Dados</p>
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            </>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="relative">
                  <User className="h-5 w-5" />
                  <span className="hidden md:inline ml-2">{user?.name}</span>
                   {hasPendingRequests && user?.role === 'SUPER_ADMIN' && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta ({user?.role})</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isOnline && (
                  <DropdownMenuItem onClick={handleSync}>
                    <RefreshCw className="mr-2 h-4 w-4"/>
                    <span>Sincronizar Dados</span>
                  </DropdownMenuItem>
                )}

                {user?.role === 'SUPER_ADMIN' && (
                  <>
                    <DropdownMenuItem onClick={handleActivityMonitorClick}>
                      <FileClock className="mr-2 h-4 w-4"/>
                      <span>Monitorar Atividade</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleManageUsersClick}>
                      <UserCog className="mr-2 h-4 w-4"/>
                      <span>Gerenciar Usuário</span>
                       {hasPendingRequests && (
                        <BellRing className="ml-auto h-4 w-4 text-destructive animate-pulse" />
                      )}
                    </DropdownMenuItem>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <DropdownMenuItem disabled>
                              <LinkIcon className="mr-2 h-4 w-4"/>
                              <span>Link Power BI (Premium)</span>
                            </DropdownMenuItem>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>A conexão direta requer um banco de dados na nuvem.</p>
                          <p className="text-xs text-muted-foreground">
                            Use a opção "Exportar Dados" por enquanto.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4"/>
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={handleActivityMonitorClick}>
                <FileClock className="mr-2 h-4 w-4" />
                Monitorar Atividade
              </Button>
              <Button variant="ghost" onClick={handleManageUsersClick} className="relative">
                Gerenciar Usuário
                {hasPendingRequests && <span className="absolute top-0 right-0 flex h-3 w-3 -mt-1 -mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>}
              </Button>
              <Button variant="outline" onClick={() => setLoginOpen(true)}>
                Login
              </Button>
            </>
          )}
           {!isOnline && (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                            <Power className="h-4 w-4" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Você está offline</p>
                    </TooltipContent>
                </Tooltip>
             </TooltipProvider>
           )}
        </div>
      </header>

      {/* Dialogs */}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <AdminLoginDialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen} onSuccess={handleAdminSuccess} />
      <AdminLoginDialog open={adminLoginForMonitorOpen} onOpenChange={setAdminLoginForMonitorOpen} onSuccess={handleAdminSuccessForMonitor} />
      <ManageUsersDialog open={manageUsersOpen} onOpenChange={setManageUsersOpen} />
      <RegisterUserDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <ActivityMonitorDialog open={activityMonitorOpen} onOpenChange={setActivityMonitorOpen} />
      
      {isAuthenticated && (
        <>
            <ExportDialog open={exportOpen} onOpenChange={setExportOpen} visits={getVisits()} fleets={getFleets()} />
        </>
      )}
    </>
  );
}
