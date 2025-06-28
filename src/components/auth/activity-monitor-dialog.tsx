'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getLogs, type ActivityLog } from '@/lib/activity-logger';
import { type StoredUser } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityMonitorDialog({ open, onOpenChange }: ActivityMonitorDialogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userLastActivity, setUserLastActivity] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (open) {
      const currentLogs = getLogs();
      const currentUsersJson = localStorage.getItem('app-users');
      const currentUsers: StoredUser[] = currentUsersJson ? JSON.parse(currentUsersJson) : [];
      
      setLogs(currentLogs);
      setUsers(currentUsers);

      const lastActivityMap = new Map<string, number>();
      for (const log of currentLogs) {
        if (!lastActivityMap.has(log.user) || log.timestamp > lastActivityMap.get(log.user)!) {
          lastActivityMap.set(log.user, log.timestamp);
        }
      }
      setUserLastActivity(lastActivityMap);
    }
  }, [open]);

  const filteredLogs = useMemo(() => {
    if (!selectedUser) {
      return logs;
    }
    return logs.filter(log => log.user === selectedUser);
  }, [logs, selectedUser]);
  
  const actionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
      switch(action.toUpperCase()) {
          case 'LOGIN': return 'default';
          case 'LOGOUT': return 'destructive';
          case 'UPDATE': return 'secondary';
          case 'CREATE': return 'default';
          case 'NAVIGATION': return 'outline';
          default: return 'outline';
      }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Monitor de Atividades</DialogTitle>
          <DialogDescription>
            Acompanhe as ações dos usuários no sistema. O status de atividade é baseado no último registro de log.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">
            <div className="md:col-span-1 border-r pr-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5" />
                    Usuários
                </h3>
                <ScrollArea className="h-full pr-2">
                    <div className="space-y-2">
                        {users.map(user => {
                            const lastActivityTimestamp = userLastActivity.get(user.name);
                            return (
                                <Button
                                    key={user.name}
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start h-auto py-2 px-3 text-left",
                                        selectedUser === user.name && "bg-muted"
                                    )}
                                    onClick={() => setSelectedUser(user.name)}
                                >
                                    <div className="flex flex-col">
                                       <span className="font-semibold">{user.name}</span>
                                       {lastActivityTimestamp ? (
                                           <span className="text-xs text-muted-foreground">
                                               Visto {formatDistanceToNow(new Date(lastActivityTimestamp), { addSuffix: true, locale: ptBR })}
                                           </span>
                                       ) : (
                                            <span className="text-xs text-muted-foreground">Nenhuma atividade</span>
                                       )}
                                    </div>
                                </Button>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>

            <div className="md:col-span-3 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Logs para: {selectedUser || 'Todos'}
                    </h3>
                    {selectedUser && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>Mostrar Todos</Button>
                    )}
                </div>
                 <ScrollArea className="flex-1 border rounded-md">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead className="w-[180px]">Data/Hora</TableHead>
                            <TableHead className="w-[150px]">Usuário</TableHead>
                            <TableHead className="w-[150px]">Ação</TableHead>
                            <TableHead>Detalhes</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{format(new Date(log.timestamp), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}</TableCell>
                                <TableCell className="font-medium">{log.user}</TableCell>
                                <TableCell><Badge variant={actionBadgeVariant(log.action)}>{log.action}</Badge></TableCell>
                                <TableCell>{log.details}</TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                Nenhum registro de atividade encontrado{selectedUser ? ` para ${selectedUser}` : ''}.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
