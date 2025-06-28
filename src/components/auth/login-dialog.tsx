'use client';

import { useAuth } from '@/contexts/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { ForgotPasswordDialog } from './forgot-password-dialog';

const formSchema = z.object({
  name: z.string().min(1, 'O nome de usuário é obrigatório.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { login } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', password: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    const success = login(values.name, values.password);
    if (success) {
      onOpenChange(false);
      form.reset();
    }
    setIsPending(false);
  };
  
  const handleForgotPasswordSuccess = () => {
    setForgotPasswordOpen(false);
    onOpenChange(false); // Close login dialog as well
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login de Usuário</DialogTitle>
            <DialogDescription>
              Insira suas credenciais para acessar o sistema.
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
                      <Input placeholder="Seu nome" {...field} />
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
                      <Input type="password" placeholder="Sua senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between items-center">
                 <Button variant="link" type="button" className="p-0 h-auto" onClick={() => setForgotPasswordOpen(true)}>
                  Esqueceu a senha?
                </Button>
                <Button type="submit" disabled={isPending}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {isPending ? 'Entrando...' : 'Entrar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ForgotPasswordDialog 
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        onSuccess={handleForgotPasswordSuccess}
      />
    </>
  );
}
