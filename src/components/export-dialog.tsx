'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Sparkles, FileDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { type Visit, type Fleet, type OrderType, type Workshop } from '@/lib/types';
import { exportVisitsToExcel } from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';
import { generateReportAction } from '@/app/actions';
import type { ReportData } from './report-display-dialog';
import dynamic from 'next/dynamic';

const ReportDisplayDialog = dynamic(() => import('./report-display-dialog').then(mod => mod.ReportDisplayDialog));


const exportFormSchema = z.object({
  dateRange: z.object({ from: z.date().optional(), to: z.date().optional() }).optional(),
  orderType: z.string().optional(),
  workshop: z.string().optional(),
  fleetId: z.string().optional(),
  exportType: z.enum(['excel', 'ai_report']),
});

type ExportFormValues = z.infer<typeof exportFormSchema>;

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visits: Visit[];
  fleets: Fleet[];
}

export function ExportDialog({ open, onOpenChange, visits, fleets }: ExportDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      orderType: 'all',
      workshop: 'all',
      fleetId: 'all',
      exportType: 'excel',
    },
  });

  const orderTypes = useMemo(() => Array.from(new Set(visits.flatMap(v => v.orderType))), [visits]);
  const workshops = useMemo(() => Array.from(new Set(visits.map(v => v.workshop).filter(Boolean))), [visits]);

  const onSubmit = (values: ExportFormValues) => {
    startTransition(() => {
      const { dateRange, orderType, workshop, fleetId, exportType } = values;
      
      const filteredVisits = visits.filter(visit => {
        const arrivalDate = new Date(visit.arrivalTimestamp);
        if (dateRange?.from && arrivalDate < dateRange.from) return false;
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999); // Include the whole day
            if (arrivalDate > toDate) return false;
        }
        if (orderType && orderType !== 'all' && !(Array.isArray(visit.orderType) ? visit.orderType.includes(orderType as OrderType) : visit.orderType === orderType)) return false;
        if (workshop && workshop !== 'all' && visit.workshop !== workshop) return false;
        if (fleetId && fleetId !== 'all' && visit.fleetId !== fleetId) return false;
        return true;
      });

      if (filteredVisits.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não há visitas que correspondam aos filtros selecionados.",
          variant: "destructive",
        });
        return;
      }
      
      if (exportType === 'excel') {
        exportVisitsToExcel(filteredVisits);
        onOpenChange(false);
        form.reset();
      } else if (exportType === 'ai_report') {
        generateReportAction(JSON.stringify(filteredVisits))
          .then((result) => {
             if (result) {
                setReportData(result);
                setIsReportOpen(true);
             } else {
                throw new Error("O relatório da IA retornou vazio.");
             }
          })
          .catch(err => {
            console.error("AI Report Error:", err);
            toast({
              title: "Erro ao gerar relatório",
              description: "A IA não conseguiu processar os dados. Tente novamente ou com filtros diferentes.",
              variant: "destructive",
            });
          })
          .finally(() => {
            onOpenChange(false);
            form.reset();
          });
      }
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Dados</DialogTitle>
          <DialogDescription>
            Selecione os filtros e o formato de exportação desejado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Período</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value?.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value?.from ? (
                            field.value.to ? (
                              <>
                                {format(field.value.from, "LLL dd, y")} -{" "}
                                {format(field.value.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(field.value.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Selecione um período</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={field.value?.from}
                          selected={field.value as DateRange}
                          onSelect={field.onChange}
                          numberOfMonths={2}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ordem</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos os Tipos</SelectItem>
                        {orderTypes.map(type => <SelectItem key={type as string} value={type as string}>{type as string}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todas as Oficinas</SelectItem>
                        {workshops.map(ws => <SelectItem key={ws} value={ws!}>{ws}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="fleetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frota</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todas as Frotas</SelectItem>
                        {fleets.map(f => <SelectItem key={f.id} value={f.id}>{f.id} - {f.plate}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formato de Saída</FormLabel>
                    <FormControl>
                       <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="excel" />
                          </FormControl>
                          <FormLabel className="font-normal">Excel</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="ai_report" />
                          </FormControl>
                          <FormLabel className="font-normal">Relatório Analítico (IA)</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (form.watch('exportType') === 'excel' ? <FileDown className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />) }
                {isPending ? 'Gerando...' : (form.watch('exportType') === 'excel' ? 'Baixar Excel' : 'Gerar Relatório com IA')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    {reportData && (
        <ReportDisplayDialog
            open={isReportOpen}
            onOpenChange={setIsReportOpen}
            reportData={reportData}
        />
    )}
    </>
  );
}
