'use client';

import { useAuth } from '@/contexts/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'O nome de usuário é obrigatório.'),
  newPassword: z.string().min(4, 'A nova senha deve ter pelo menos 4 caracteres.'),
});

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ForgotPasswordDialog({ open, onOpenChange, onSuccess }: ForgotPasswordDialogProps) {
  const { requestPasswordReset } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', newPassword: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    const success = requestPasswordReset(values.name, values.newPassword);
    if (success) {
      onSuccess();
      form.reset();
    }
    setIsPending(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir Senha</DialogTitle>
          <DialogDescription>
            Insira seu nome de usuário e a nova senha desejada. Um administrador precisará aprovar a alteração.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de Usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome de usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Sua nova senha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                <KeyRound className="mr-2 h-4 w-4" />
                {isPending ? 'Enviando...' : 'Solicitar Redefinição'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
