'use client';

import { useAuth } from '@/contexts/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { type Workshop, type AccessRequest } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';

const workshopOptions: (Workshop | 'Outra')[] = ['Monte Líbano', 'Vale das Carretas', 'CMC', 'Outra'];

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('Por favor, insira um email válido.').optional(),
  npNumber: z.string().optional(),
  workshop: z.enum(workshopOptions, {
    required_error: 'A oficina é obrigatória.',
  }),
  hasNoNp: z.boolean().default(false),
  hasNoEmail: z.boolean().default(false),
  managerName: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.hasNoEmail && !data.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O email é obrigatório.',
      path: ['email'],
    });
  }
  if (!data.hasNoNp && !data.npNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O número do NP é obrigatório.',
      path: ['npNumber'],
    });
  }
  if ((data.hasNoNp || data.hasNoEmail) && (!data.managerName || data.managerName.length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O nome do gestor é obrigatório (mínimo 3 caracteres).',
      path: ['managerName'],
    });
  }
});

interface RequestAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestAccessDialog({ open, onOpenChange }: RequestAccessDialogProps) {
  const { requestAccess } = useAuth();
  const [isPending, setIsPending] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      fullName: '', 
      email: '', 
      npNumber: '', 
      workshop: undefined,
      hasNoNp: false,
      hasNoEmail: false,
      managerName: '',
    },
  });

  const hasNoNp = form.watch('hasNoNp');
  const hasNoEmail = form.watch('hasNoEmail');
  const showManagerField = hasNoNp || hasNoEmail;

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    const { hasNoEmail, hasNoNp, ...rest } = values;
    
    const requestData: Omit<AccessRequest, 'id' | 'requestedAt'> = {
      ...rest,
      email: hasNoEmail ? undefined : rest.email,
      npNumber: hasNoNp ? undefined : rest.npNumber,
    };

    const success = requestAccess(requestData);
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
          <DialogTitle>Solicitar Acesso</DialogTitle>
          <DialogDescription>
            Preencha o formulário. Sua solicitação será enviada para aprovação.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="hasNoEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Não tenho email Suzano ou de Terceiro
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="email" placeholder="seu.email@dominio.com" {...field} disabled={hasNoEmail} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasNoNp"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Não tenho NP
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="npNumber"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Seu número NP" {...field} disabled={hasNoNp} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workshop"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oficina</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua oficina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workshopOptions.map(ws => <SelectItem key={ws} value={ws}>{ws}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showManagerField && (
               <FormField
                control={form.control}
                name="managerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Gestor Responsável</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo do seu gestor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
               <Button type="submit" disabled={isPending}>
                <Send className="mr-2 h-4 w-4" />
                 {isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
