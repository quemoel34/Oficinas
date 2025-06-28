'use client';

import { useAuth } from '@/contexts/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  password: z.string().min(4, 'A senha deve ter pelo menos 4 caracteres.'),
});

interface RegisterUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterUserDialog({ open, onOpenChange }: RegisterUserDialogProps) {
  const { registerUser } = useAuth();
  const [isPending, setIsPending] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', password: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    const success = registerUser(values.name, values.password);
    if (success) {
      onOpenChange(false);
      form.reset();
    }
    setIsPending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie um novo usuário para acessar o aplicativo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: joao.silva" {...field} />
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
                    <Input type="password" placeholder="Crie uma senha forte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="submit" disabled={isPending}>
                <UserPlus className="mr-2 h-4 w-4" />
                 {isPending ? 'Salvando...' : 'Salvar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
