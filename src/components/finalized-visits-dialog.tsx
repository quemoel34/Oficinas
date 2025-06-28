'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from './ui/badge';
import { TimerDisplay } from './timer-display';
import { orderTypeVariant } from './tabs/visits-list';
import { type Visit, OrderType } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const VisitDetailsDialog = dynamic(() => import('./visit-details-dialog').then(mod => mod.VisitDetailsDialog));


interface FinalizedVisitsDialogProps {
  visits: Visit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}

export function FinalizedVisitsDialog({
  visits,
  open,
  onOpenChange,
  title,
  description,
}: FinalizedVisitsDialogProps) {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  
  if (!visits) return null;

  const formatDate = (timestamp?: number) => {
    return timestamp
      ? format(new Date(timestamp), 'dd/MM/yy HH:mm', { locale: ptBR })
      : '—';
  };
  
  const safeOrderType = (visit: Visit) => Array.isArray(visit.orderType) ? visit.orderType : [visit.orderType];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[70vh] overflow-y-auto pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frota</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo Ordem</TableHead>
                  <TableHead>Entrada Box</TableHead>
                  <TableHead>Finalização</TableHead>
                  <TableHead>T. Fila</TableHead>
                  <TableHead>T. Manut.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.length > 0 ? (
                  visits.map((visit) => (
                    <TableRow key={visit.id} className="cursor-pointer" onClick={() => setSelectedVisit(visit)}>
                      <TableCell className="font-medium">{visit.fleetId}</TableCell>
                      <TableCell>{visit.plate}</TableCell>
                      <TableCell>
                         <div className="flex flex-wrap gap-1">
                          {safeOrderType(visit).map((type: OrderType) => (
                            <Badge key={type} variant={orderTypeVariant[type]}>
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(visit.boxEntryTimestamp)}</TableCell>
                      <TableCell>{formatDate(visit.finishTimestamp)}</TableCell>
                      <TableCell>
                        <TimerDisplay
                          startTime={visit.arrivalTimestamp}
                          endTime={visit.maintenanceStartTimestamp}
                        />
                      </TableCell>
                      <TableCell>
                        <TimerDisplay
                          startTime={visit.maintenanceStartTimestamp}
                          endTime={visit.finishTimestamp}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Nenhuma visita finalizada encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      {selectedVisit && (
        <VisitDetailsDialog
          visit={selectedVisit}
          open={!!selectedVisit}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedVisit(null);
            }
          }}
        />
      )}
    </>
  );
}
