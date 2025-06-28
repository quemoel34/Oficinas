'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { StoredUser, PasswordResetRequest, AccessRequest, UserRole } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, UserPlus, Shield, UserCog, Eye, Ban, BellRing, Check, X } from 'lucide-react';
import { EditUserDialog } from './edit-user-dialog';
import { RegisterUserDialog } from './register-user-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

interface ManageUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleMap: { [key in StoredUser['role']]: { label: string; icon: React.ElementType } } = {
  SUPER_ADMIN: { label: 'Super Admin', icon: Shield },
  EDITOR: { label: 'Editor', icon: UserCog },
  VIEWER: { label: 'Visualizador', icon: Eye },
};

const statusMap: { [key in StoredUser['status']]: { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' | null | undefined } } = {
  ACTIVE: { label: 'Ativo', variant: 'default' },
  BLOCKED: { label: 'Bloqueado', variant: 'destructive' },
};


export function ManageUsersDialog({ open, onOpenChange }: ManageUsersDialogProps) {
  const { 
    user: loggedInUser,
    getUsers, 
    getPendingPasswordRequests, 
    approvePasswordReset, 
    denyPasswordReset,
    getAccessRequests,
    approveAccessRequest,
    denyAccessRequest,
  } = useAuth();
  
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  
  const [editingUser, setEditingUser] = useState<StoredUser | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [selectedPasswordRequest, setSelectedPasswordRequest] = useState<PasswordResetRequest | null>(null);
  const [selectedAccessRequest, setSelectedAccessRequest] = useState<AccessRequest | null>(null);
  const [roleToAssign, setRoleToAssign] = useState<UserRole>('EDITOR');

  const IMMUTABLE_ADMIN = 'quemoel457359';

  
  const refreshData = () => {
    setUsers(getUsers());
    setPasswordRequests(getPendingPasswordRequests());
    const allAccessRequests = getAccessRequests();
    setAccessRequests(allAccessRequests.filter(req => req.status === 'PENDING'));
  };
  
  useEffect(() => {
    if (open) {
      refreshData();
    }
  }, [open]);

  const handleEditSuccess = () => {
    setEditingUser(null);
    refreshData();
  }
  
  const handleRegisterDialogClose = () => {
    setIsRegistering(false);
    refreshData();
  }
  
  const handleApprovePassword = () => {
    if (!selectedPasswordRequest) return;
    approvePasswordReset(selectedPasswordRequest.username);
    setSelectedPasswordRequest(null);
    refreshData();
  };

  const handleDenyPassword = () => {
    if (!selectedPasswordRequest) return;
    denyPasswordReset(selectedPasswordRequest.username);
    setSelectedPasswordRequest(null);
    refreshData();
  };

  const handleApproveAccess = () => {
    if (!selectedAccessRequest) return;
    approveAccessRequest(selectedAccessRequest.id, roleToAssign);
    setSelectedAccessRequest(null);
    setRoleToAssign('EDITOR');
    refreshData();
  };

  const handleDenyAccess = () => {
    if (!selectedAccessRequest) return;
    denyAccessRequest(selectedAccessRequest.id);
    setSelectedAccessRequest(null);
    refreshData();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Usuários e Acessos</DialogTitle>
            <DialogDescription>
              Adicione usuários, aprove solicitações de acesso e gerencie permissões.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">Usuários ({users.length})</TabsTrigger>
              <TabsTrigger value="access-requests" className="relative">
                Solicitações de Acesso
                {accessRequests.length > 0 && <span className="absolute top-0 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>}
              </TabsTrigger>
              <TabsTrigger value="password-requests" className="relative">
                Redefinição de Senha
                {passwordRequests.length > 0 && <span className="absolute top-0 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="mt-4">
               <div className="flex justify-end mb-4">
                  <Button onClick={() => setIsRegistering(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Adicionar Usuário Manualmente
                  </Button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto pr-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Permissão</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => {
                          const roleInfo = roleMap[user.role];
                          const statusInfo = user.status ? statusMap[user.status] : undefined;

                          const isImmutable = user.name === IMMUTABLE_ADMIN;
                          const canManageAdmins = loggedInUser?.name === IMMUTABLE_ADMIN;
                          const isTargetAdmin = user.role === 'SUPER_ADMIN';
                          const isEditDisabled = isImmutable || (isTargetAdmin && !canManageAdmins);

                          return (
                            <TableRow key={user.name}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>
                                    {roleInfo ? (
                                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                            {React.createElement(roleInfo.icon, { className: 'h-3 w-3' })}
                                            {roleInfo.label}
                                        </Badge>
                                    ) : <Badge variant="destructive">Inválida</Badge>}
                                </TableCell>
                                <TableCell>
                                   {statusInfo ? <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge> : <Badge variant="destructive">Inválido</Badge>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)} disabled={isEditDisabled}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="access-requests" className="mt-4">
              <div className="max-h-[50vh] overflow-y-auto pr-2">
                <Table>
                    <TableHeader><TableRow><TableHead>Solicitante</TableHead><TableHead>Oficina</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {accessRequests.length > 0 ? accessRequests.map(req => (
                            <TableRow key={req.id} className="cursor-pointer" onClick={() => setSelectedAccessRequest(req)}>
                                <TableCell>
                                    <div className="font-medium">{req.fullName}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {req.email ? `${req.email} | ` : ''}
                                      {req.npNumber ? `NP: ${req.npNumber}` : ''}
                                      {req.managerName ? `Gestor: ${req.managerName}` : ''}
                                    </div>
                                </TableCell>
                                <TableCell>{req.workshop}</TableCell>
                                <TableCell>{format(new Date(req.requestedAt), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                            </TableRow>
                        )) : (
                          <TableRow><TableCell colSpan={3} className="h-24 text-center">Nenhuma solicitação de acesso pendente.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="password-requests" className="mt-4">
               <div className="max-h-[50vh] overflow-y-auto pr-2">
                <Table>
                    <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {passwordRequests.length > 0 ? passwordRequests.map(req => (
                        <TableRow key={req.username}>
                          <TableCell className="font-medium">{req.username}</TableCell>
                          <TableCell>{format(new Date(req.requestedAt), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPasswordRequest(req)}>Analisar</Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center">Nenhuma solicitação de senha pendente.</TableCell></TableRow>
                      )}
                    </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

        </DialogContent>
      </Dialog>
      
      {editingUser && (
        <EditUserDialog 
            user={editingUser}
            open={!!editingUser}
            onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}
            onSuccess={handleEditSuccess}
        />
      )}
      
      <RegisterUserDialog
        open={isRegistering}
        onOpenChange={(isOpen) => {
            if(!isOpen) handleRegisterDialogClose();
            else setIsRegistering(true);
        }}
      />
      
      <AlertDialog open={!!selectedPasswordRequest} onOpenChange={(isOpen) => !isOpen && setSelectedPasswordRequest(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Aprovar Redefinição de Senha?</AlertDialogTitle>
                <AlertDialogDescription>
                    O usuário "{selectedPasswordRequest?.username}" solicitou uma nova senha. Você deseja aprovar ou negar esta alteração? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <Button variant="outline" onClick={() => setSelectedPasswordRequest(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDenyPassword}><X className="mr-2 h-4 w-4" />Negar</Button>
                <Button onClick={handleApprovePassword}><Check className="mr-2 h-4 w-4" />Aprovar</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!selectedAccessRequest} onOpenChange={(isOpen) => !isOpen && setSelectedAccessRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analisar Solicitação de Acesso</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-2 mt-4 text-sm">
                <p><strong>Nome:</strong> {selectedAccessRequest?.fullName}</p>
                {selectedAccessRequest?.email && <p><strong>Email:</strong> {selectedAccessRequest.email}</p>}
                {selectedAccessRequest?.npNumber && <p><strong>NP:</strong> {selectedAccessRequest.npNumber}</p>}
                {selectedAccessRequest?.managerName && <p><strong>Gestor Responsável:</strong> {selectedAccessRequest.managerName}</p>}
                <p><strong>Oficina:</strong> {selectedAccessRequest?.workshop}</p>
                <p><strong>Data:</strong> {selectedAccessRequest && format(new Date(selectedAccessRequest.requestedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                <Separator className="my-4 bg-border" />
                <div className="!mt-4 space-y-2">
                  <p className="font-bold text-foreground">Credenciais Geradas:</p>
                  <p><strong>Usuário:</strong> {selectedAccessRequest ? (selectedAccessRequest.managerName ? (selectedAccessRequest.fullName.split(' ')[0]).toLowerCase() : ((selectedAccessRequest.fullName.split(' ')[0]) + selectedAccessRequest.npNumber!).toLowerCase()) : ''}</p>
                  <p><strong>Senha:</strong> {selectedAccessRequest ? (selectedAccessRequest.managerName ? `${(selectedAccessRequest.fullName.split(' ')[0]).toLowerCase()}123` : selectedAccessRequest.npNumber!.toLowerCase()) : ''}</p>
                </div>
                <Separator className="my-4 bg-border" />
                 <div className="!mt-4 space-y-2">
                    <Label htmlFor="role-assignment" className="font-bold text-foreground">Permissão a ser concedida:</Label>
                    <Select value={roleToAssign} onValueChange={(v) => setRoleToAssign(v as UserRole)}>
                        <SelectTrigger id="role-assignment">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SUPER_ADMIN">Super Admin (Acesso Total)</SelectItem>
                            <SelectItem value="EDITOR">Editor (Padrão)</SelectItem>
                            <SelectItem value="VIEWER">Visualizador (Somente Leitura)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setSelectedAccessRequest(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDenyAccess}><X className="mr-2 h-4 w-4" />Negar</Button>
            <Button onClick={handleApproveAccess}><Check className="mr-2 h-4 w-4" />Aprovar e Criar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
