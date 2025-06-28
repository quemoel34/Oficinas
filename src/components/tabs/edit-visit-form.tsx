'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Camera, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type Visit, type Workshop, type AuthUser, type ServiceLog, OrderType } from '@/lib/types';
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { useEffect, useState } from 'react';
import { Separator } from '../ui/separator';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';

const workshopOptions: Workshop[] = ['Monte Líbano', 'Vale das Carretas', 'CMC'];

const tirePressureSchema = z.object({
  axle1Left: z.coerce.number().optional(),
  axle1Right: z.coerce.number().optional(),
  axle2Left: z.coerce.number().optional(),
  axle2Right: z.coerce.number().optional(),
}).optional();

const formSchema = z.object({
  workshop: z.enum(workshopOptions).optional(),
  status: z.enum(['Em Fila', 'Em Manutenção', 'Aguardando Peça', 'Finalizado', 'Movimentação']),
  orderTypeForService: z.string().optional(), // Used to select which order is being performed now
  boxNumber: z.string().optional(),
  boxEntryTimestamp: z.string().optional(),
  finishTimestamp: z.string().optional(),
  servicePerformed: z.string().optional(),
  partUsed: z.string().optional(),
  partQuantity: z.string().optional(),
  calibrationData: z.object({
    trailer1: tirePressureSchema,
    trailer2: tirePressureSchema,
    trailer3: tirePressureSchema,
  }).optional(),
  imageUrl: z.any().optional(),
});

interface EditVisitFormProps {
  visit: Visit;
  onUpdateVisit: (visit: Visit, user: AuthUser) => void;
  onCancel: () => void;
}

const toISODateString = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const CalibrationInputGrid = ({ control, trailerNumber }: { control: any, trailerNumber: 'trailer1' | 'trailer2' | 'trailer3' }) => {
  const tirePositions = [
      { id: 'axle1Left', label: '1º Eixo Esq.' },
      { id: 'axle1Right', label: '1º Eixo Dir.' },
      { id: 'axle2Left', label: '2º Eixo Esq.' },
      { id: 'axle2Right', label: '2º Eixo Dir.' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tirePositions.map(pos => (
        <FormField
          key={pos.id}
          control={control}
          name={`calibrationData.${trailerNumber}.${pos.id}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{pos.label}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="PSI"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
};


export default function EditVisitForm({ visit, onUpdateVisit, onCancel }: EditVisitFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(visit.imageUrl || null);
  
  const orderTypes = Array.isArray(visit.orderType) ? visit.orderType : [visit.orderType];

  const [currentOrderType, setCurrentOrderType] = useState<OrderType | undefined>(
    orderTypes.length === 1 ? orderTypes[0] : undefined
  );

  const defaultValues = {
    workshop: visit.workshop,
    status: visit.status,
    orderTypeForService: orderTypes.length === 1 ? orderTypes[0] : undefined,
    // If status was 'Movimentação', we are starting a new task, so clear these fields
    boxNumber: visit.status === 'Movimentação' ? '' : visit.boxNumber || '',
    servicePerformed: visit.status === 'Movimentação' ? '' : visit.servicePerformed || '',
    partUsed: visit.status === 'Movimentação' ? '' : visit.partUsed || '',
    partQuantity: visit.status === 'Movimentação' ? '' : visit.partQuantity?.toString() || '',
    calibrationData: visit.status === 'Movimentação' ? {} : visit.calibrationData || {},
    
    // Keep timestamps unless they should be reset
    boxEntryTimestamp: visit.status === 'Movimentação' ? '' : toISODateString(visit.boxEntryTimestamp),
    finishTimestamp: toISODateString(visit.finishTimestamp),
    imageUrl: visit.imageUrl || undefined,
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const status = form.watch('status');
  const oldStatus = visit.status;
  const orderTypeForService = form.watch('orderTypeForService');

  useEffect(() => {
    const now = Date.now();
    if (status !== oldStatus) {
      if (status === 'Em Manutenção' && !visit.maintenanceStartTimestamp) {
          // This timestamp will be set on submit
      }
      if (status === 'Aguardando Peça' && !visit.awaitingPartTimestamp) {
         // This timestamp will be set on submit
      }
      if (status === 'Finalizado' && !form.getValues('finishTimestamp')) {
        form.setValue('finishTimestamp', toISODateString(now));
      }
    }
  }, [status, oldStatus, visit, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('imageUrl', file);
    }
  };


  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!orderTypeForService && orderTypes.length > 1 && values.status !== 'Em Fila') {
        toast({
            title: 'Ação Necessária',
            description: 'Por favor, selecione qual tipo de ordem está sendo executada.',
            variant: 'destructive',
        });
        return;
    }
      
    const updatedVisit: Visit = { ...visit, imageUrl: preview || undefined };
    const now = Date.now();
    const newStatus = values.status;
    
    // Handle the "Movimentação" status change
    if (newStatus === 'Movimentação') {
        const serviceLog: ServiceLog = {
            orderType: orderTypeForService as OrderType,
            servicePerformed: values.servicePerformed,
            partUsed: values.partUsed,
            partQuantity: values.partQuantity ? parseInt(values.partQuantity, 10) : undefined,
            calibrationData: values.calibrationData,
            startTimestamp: visit.maintenanceStartTimestamp || visit.arrivalTimestamp,
            finishTimestamp: now,
            workshop: values.workshop,
            boxNumber: values.boxNumber,
        };

        updatedVisit.serviceHistory = [...(visit.serviceHistory || []), serviceLog];
        
        // Reset fields for the next service
        updatedVisit.servicePerformed = undefined;
        updatedVisit.partUsed = undefined;
        updatedVisit.partQuantity = undefined;
        updatedVisit.calibrationData = undefined;
        updatedVisit.boxNumber = undefined;
        updatedVisit.boxEntryTimestamp = undefined;
        updatedVisit.maintenanceStartTimestamp = now; // Next maintenance starts now
        
        // Change status to 'Em Manutenção' for the next task
        updatedVisit.status = 'Em Manutenção';
        
        // Remove the completed order type from the list
        updatedVisit.orderType = orderTypes.filter(o => o !== orderTypeForService);
        
        toast({
          title: 'Atividade Registrada!',
          description: `Pronto para a próxima tarefa da frota ${visit.fleetId}.`,
        });

    } else { // Handle all other status changes
        updatedVisit.workshop = values.workshop;
        updatedVisit.status = newStatus;
        updatedVisit.boxNumber = values.boxNumber;
        updatedVisit.boxEntryTimestamp = values.boxEntryTimestamp ? new Date(values.boxEntryTimestamp).getTime() : visit.boxEntryTimestamp;
        updatedVisit.finishTimestamp = values.finishTimestamp ? new Date(values.finishTimestamp).getTime() : visit.finishTimestamp;

        updatedVisit.calibrationData = values.calibrationData;
        updatedVisit.servicePerformed = values.servicePerformed;
        updatedVisit.partUsed = values.partUsed;
        updatedVisit.partQuantity = values.partQuantity ? parseInt(values.partQuantity, 10) : undefined;
        
        if (newStatus !== oldStatus) {
            if (newStatus === 'Em Manutenção' && !updatedVisit.maintenanceStartTimestamp) {
                updatedVisit.maintenanceStartTimestamp = now;
            }
            if (newStatus === 'Aguardando Peça' && !updatedVisit.awaitingPartTimestamp) {
                updatedVisit.awaitingPartTimestamp = now;
            }
            if (newStatus === 'Finalizado' && !updatedVisit.finishTimestamp) {
                updatedVisit.finishTimestamp = values.finishTimestamp ? new Date(values.finishTimestamp).getTime() : now;
            }
        }
        
        if (values.boxNumber && !visit.boxEntryTimestamp && !values.boxEntryTimestamp) {
            updatedVisit.boxEntryTimestamp = now;
            form.setValue('boxEntryTimestamp', toISODateString(now));
        }
        
         toast({
            title: 'Visita Atualizada!',
            description: `A visita da frota ${visit.fleetId} foi atualizada com sucesso.`,
         });
    }

    onUpdateVisit(updatedVisit, {name: 'temp-user'}); 
  }
  
  const arrivalDate = format(new Date(visit.arrivalTimestamp), 'dd/MM/yyyy HH:mm');
  const isMultiOrder = orderTypes.length > 1;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Atualizar Serviço: {visit.fleetId} ({visit.plate})</CardTitle>
        <CardDescription>
          Chegada em: {arrivalDate} - Ordens: {orderTypes.join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="workshop"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oficina</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a oficina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Monte Líbano">Monte Líbano</SelectItem>
                        <SelectItem value="Vale das Carretas">Vale das Carretas</SelectItem>
                        <SelectItem value="CMC">CMC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status da Manutenção</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o novo status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Em Fila">Em Fila</SelectItem>
                        <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                        <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                        <SelectItem value="Movimentação" disabled={!isMultiOrder}>Movimentação (Próxima Tarefa)</SelectItem>
                        <SelectItem value="Finalizado">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               {isMultiOrder && status !== 'Em Fila' && (
                <FormField
                    control={form.control}
                    name="orderTypeForService"
                    render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Serviço Sendo Executado</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); setCurrentOrderType(value as OrderType); }} value={field.value} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecione qual ordem está sendo feita agora" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {orderTypes.map(ot => <SelectItem key={ot} value={ot}>{ot}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
               )}
              <FormField
                control={form.control}
                name="boxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Box</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 01"
                        {...field}
                        onChange={(e) => {
                           field.onChange(e.target.value.toUpperCase());
                           if(e.target.value && !form.getValues('boxEntryTimestamp')){
                               form.setValue('boxEntryTimestamp', toISODateString(Date.now()))
                           }
                        }}
                        className="uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="boxEntryTimestamp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entrada no Box</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormItem>
              <FormLabel>Foto do Veículo</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <Button asChild variant="outline">
                    <label htmlFor="edit-photo-upload" className="cursor-pointer">
                      <Camera className="mr-2 h-4 w-4" />
                      Anexar/Alterar Foto
                    </label>
                  </Button>
                  <Input id="edit-photo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {preview && (
                      <Image
                        src={preview}
                        alt="Pré-visualização da foto"
                        width={80}
                        height={80}
                        className="rounded-md object-cover"
                      />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>

            <Separator />

            {orderTypeForService === 'Calibragem' ? (
              <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">1º Reboque</h3>
                    <CalibrationInputGrid control={form.control} trailerNumber="trailer1" />
                </div>
                 <div>
                    <h3 className="text-lg font-medium">2º Reboque</h3>
                    <CalibrationInputGrid control={form.control} trailerNumber="trailer2" />
                </div>
                 <div>
                    <h3 className="text-lg font-medium">3º Reboque</h3>
                    <CalibrationInputGrid control={form.control} trailerNumber="trailer3" />
                </div>
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="servicePerformed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço Realizado</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o serviço realizado no veículo..."
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          className="uppercase"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="partUsed"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Peça Utilizada</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Filtro de Ar"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            className="uppercase"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="partQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <Separator />

            <FormField
              control={form.control}
              name="finishTimestamp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e Hora da Finalização</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} disabled={status !== 'Finalizado'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
               <Button type="button" variant="outline" onClick={onCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={user?.role === 'VIEWER'}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
