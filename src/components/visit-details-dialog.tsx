'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { type Visit, CalibrationData, ServiceLog, OrderType } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { statusVariant, orderTypeVariant } from './tabs/visits-list';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { TimerDisplay } from './timer-display';

interface VisitDetailsDialogProps {
  visit: Visit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditVisit?: (visit: Visit) => void;
}

const DetailItem = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-2 py-1">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground">{value || '—'}</dd>
  </div>
);

const CalibrationDetails = ({ data }: { data: CalibrationData }) => {
  const trailers = [
    { title: '1º Reboque', data: data.trailer1 },
    { title: '2º Reboque', data: data.trailer2 },
    { title: '3º Reboque', data: data.trailer3 },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Detalhes da Calibragem</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trailers.map((trailer, index) => {
          const hasData = trailer.data && Object.values(trailer.data).some(v => v);
          if (!hasData) return null;

          return (
            <Card key={index}>
              <CardHeader className="p-4">
                <CardTitle className="text-base">{trailer.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-sm">
                <dl>
                    <DetailItem label="1º Eixo Esq." value={`${trailer.data?.axle1Left || '0'} PSI`} />
                    <DetailItem label="1º Eixo Dir." value={`${trailer.data?.axle1Right || '0'} PSI`} />
                    <DetailItem label="2º Eixo Esq." value={`${trailer.data?.axle2Left || '0'} PSI`} />
                    <DetailItem label="2º Eixo Dir." value={`${trailer.data?.axle2Right || '0'} PSI`} />
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const ServiceHistory = ({ history }: { history: ServiceLog[] }) => {
  if (!history || history.length === 0) {
    return null;
  }

  const formatDate = (timestamp?: number) => {
    return timestamp ? format(new Date(timestamp), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—';
  };

  return (
    <div className="space-y-4">
        <Separator />
        <h3 className="font-semibold text-foreground">Histórico de Serviços Concluídos na Visita</h3>
        {history.map((log, index) => (
            <Card key={index} className="bg-muted/50">
                <CardHeader className="p-4">
                    <CardTitle className="text-base flex justify-between">
                       <span>{log.orderType}</span>
                       <span className="text-sm font-normal text-muted-foreground">
                        Concluído em: {formatDate(log.finishTimestamp)}
                       </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <dl className="space-y-1">
                        <DetailItem label="Início da Atividade" value={formatDate(log.startTimestamp)} />
                        <DetailItem label="Duração da Atividade" value={<TimerDisplay startTime={log.startTimestamp} endTime={log.finishTimestamp} />} />
                        <Separator className="my-2" />
                        <DetailItem label="Serviço" value={log.servicePerformed} />
                        <DetailItem label="Peça" value={log.partUsed} />
                        <DetailItem label="Qtd." value={log.partQuantity} />
                        <DetailItem label="Oficina" value={log.workshop} />
                        <DetailItem label="Box" value={log.boxNumber} />
                    </dl>
                    {log.orderType === 'Calibragem' && log.calibrationData && (
                        <div className="mt-4">
                           <CalibrationDetails data={log.calibrationData} />
                        </div>
                    )}
                </CardContent>
            </Card>
        ))}
    </div>
  )
}

export function VisitDetailsDialog({ visit, open, onOpenChange, onEditVisit }: VisitDetailsDialogProps) {
  const { user } = useAuth();
  
  if (!visit) return null;

  const formatDate = (timestamp?: number) => {
    return timestamp ? format(new Date(timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—';
  };
  
  const handleEditClick = () => {
    if (onEditVisit) {
        onEditVisit(visit);
        onOpenChange(false); // Close the dialog after initiating edit
    }
  }

  const orderTypes = Array.isArray(visit.orderType) ? visit.orderType : [visit.orderType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Detalhes da Visita: {visit.fleetId} ({visit.plate})
          </DialogTitle>
          <DialogDescription>
            Visita registrada em {formatDate(visit.arrivalTimestamp)}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {visit.imageUrl && (
              <div className="md:col-span-2">
                <Image
                  src={visit.imageUrl}
                  alt={`Foto da frota ${visit.fleetId}`}
                  width={600}
                  height={400}
                  className="rounded-md object-cover w-full"
                  data-ai-hint="truck maintenance"
                />
              </div>
            )}
            <dl className="space-y-1">
              <DetailItem label="Frota" value={visit.fleetId} />
              <DetailItem label="Placa" value={visit.plate} />
              <DetailItem label="Tipo Equip." value={visit.equipmentType} />
              <DetailItem label="Oficina" value={visit.workshop} />
            </dl>
            <dl className="space-y-1">
              <DetailItem label="Tipo de Ordem" value={
                <div className="flex flex-wrap gap-1">
                    {orderTypes.map(ot => <Badge key={ot} variant={orderTypeVariant[ot as OrderType]}>{ot}</Badge>)}
                </div>
              } />
              <DetailItem label="Status" value={<Badge variant={statusVariant[visit.status]}>{visit.status}</Badge>} />
              <DetailItem label="Box" value={visit.boxNumber} />
            </dl>
          </div>
          
          <Separator />

          <h3 className="font-semibold text-foreground">Linha do Tempo</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <DetailItem label="Chegada" value={formatDate(visit.arrivalTimestamp)} />
            <DetailItem label="Entrada no Box" value={formatDate(visit.boxEntryTimestamp)} />
            <DetailItem label="Início Manutenção" value={formatDate(visit.maintenanceStartTimestamp)} />
            <DetailItem label="Aguardando Peça" value={formatDate(visit.awaitingPartTimestamp)} />
            <DetailItem label="Finalização" value={formatDate(visit.finishTimestamp)} />
          </dl>
          
          <Separator />

          <div>
              <h3 className="font-semibold text-foreground">Detalhes do Serviço Atual</h3>
              {orderTypes.includes('Calibragem') && visit.calibrationData && !visit.servicePerformed ? (
                <CalibrationDetails data={visit.calibrationData} />
              ) : (
                <dl className="space-y-1">
                    <DetailItem label="Observações Iniciais" value={visit.notes} />
                    <DetailItem label="Serviço Realizado" value={<p className="whitespace-pre-wrap">{visit.servicePerformed || '—'}</p>} />
                    <DetailItem label="Peça Utilizada" value={visit.partUsed} />
                    <DetailItem label="Quantidade" value={visit.partQuantity?.toString()} />
                </dl>
              )}
          </div>
          
          <ServiceHistory history={visit.serviceHistory || []} />

        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button onClick={handleEditClick} disabled={!onEditVisit || visit.status === 'Finalizado' || user?.role === 'VIEWER'}>
                <Edit className="mr-2 h-4 w-4" />
                Atualizar Serviço
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
