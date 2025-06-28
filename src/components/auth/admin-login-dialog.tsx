'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const formSchema = z.object({
  username: z.string().min(1, 'O nome de usuário é obrigatório.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

interface AdminLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminLoginDialog({ open, onOpenChange, onSuccess }: AdminLoginDialogProps) {
  const { toast } = useToast();
  const { getUsers } = useAuth();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const users = getUsers();
    const adminUser = users.find(
      u =>
        u.name.toLowerCase() === values.username.toLowerCase() &&
        u.password_plaintext === values.password &&
        u.role === 'SUPER_ADMIN'
    );

    if (adminUser) {
      toast({ title: "Acesso de administrador concedido." });
      onSuccess();
      form.reset();
    } else {
      toast({ title: "Credenciais Inválidas", description: "Acesso negado. Apenas Super Admins podem acessar esta área.", variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acesso de Administrador</DialogTitle>
          <DialogDescription>
            Insira suas credenciais de Super Administrador para continuar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário (Super Admin)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Validar Acesso
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
