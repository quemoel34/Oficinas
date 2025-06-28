'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { StoredUser, UserRole } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, Trash2 } from 'lucide-react';

interface EditUserDialogProps {
  user: StoredUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditUserDialog({ user: userToEdit, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const { user: loggedInUser, updateUser, deleteUser } = useAuth();
  const [role, setRole] = useState<UserRole>(userToEdit.role);
  const [status, setStatus] = useState<StoredUser['status']>(userToEdit.status);
  const [isSaving, setIsSaving] = useState(false);

  const IMMUTABLE_ADMIN = 'quemoel457359';

  const isImmutable = userToEdit.name === IMMUTABLE_ADMIN;
  const canManageAdmins = loggedInUser?.name === IMMUTABLE_ADMIN;
  const isTargetAdmin = userToEdit.role === 'SUPER_ADMIN';

  const isFormDisabled = isImmutable || (isTargetAdmin && !canManageAdmins);

  const handleSave = () => {
    setIsSaving(true);
    const success = updateUser(userToEdit.name, { role, status });
    if (success) {
      onSuccess();
    }
    setIsSaving(false);
  };
  
  const handleDelete = () => {
    const success = deleteUser(userToEdit.name);
    if(success) {
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário: {userToEdit.name}</DialogTitle>
          <DialogDescription>
            Altere as permissões e o status de acesso do usuário.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-select">Permissão</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)} id="role-select" disabled={isFormDisabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canManageAdmins && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                <SelectItem value="EDITOR">Editor (Pode criar e editar dados)</SelectItem>
                <SelectItem value="VIEWER">Visualizador (Pode apenas ver os dados)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status do Acesso</Label>
            <RadioGroup value={status} onValueChange={(v) => setStatus(v as StoredUser['status'])} className="flex items-center gap-4" disabled={isFormDisabled}>
               <div className="flex items-center space-x-2">
                <RadioGroupItem value="ACTIVE" id="r-active" />
                <Label htmlFor="r-active">Ativo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="BLOCKED" id="r-blocked" />
                <Label htmlFor="r-blocked">Bloqueado</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter className="justify-between">
           <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isFormDisabled}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover Usuário
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso removerá permanentemente o usuário "{userToEdit.name}" e ele perderá o acesso ao sistema.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Confirmar e Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          <Button onClick={handleSave} disabled={isSaving || isFormDisabled}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
