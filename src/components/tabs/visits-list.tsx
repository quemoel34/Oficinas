'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Visit, type MaintenanceStatus, type OrderType, type Fleet, type Workshop } from '@/lib/types';
import { Button } from '../ui/button';
import { ArrowUp, ArrowDown, Edit, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';

export const statusVariant: { [key in MaintenanceStatus]: 'default' | 'secondary' | 'destructive' | 'outline' | 'accent' } = {
  'Em Fila': 'accent',
  'Em Manutenção': 'default',
  'Aguardando Peça': 'destructive',
  Finalizado: 'outline',
  Movimentação: 'secondary',
};

export const orderTypeVariant: { [key in OrderType]: 'default' | 'secondary' | 'outline' } = {
  Preventiva: 'secondary',
  Corretiva: 'default',
  Preditiva: 'outline',
  Calibragem: 'secondary',
  Inspeção: 'outline',
};

const VisitDetailsDialog = dynamic(() => import('../visit-details-dialog').then(mod => mod.VisitDetailsDialog));

interface VisitsListProps {
  visits: Visit[];
  onEditVisit: (visit: Visit) => void;
  onDeleteVisit: (visitId: string, visitFleetId: string) => void;
}

type SortableKey = keyof Visit | 'queueTime' | 'maintenanceTime' | 'partsTime' | 'totalTime';

const getDurationInSeconds = (start?: number, end?: number) => {
    if (typeof start !== 'number' || typeof end !== 'number' || end < start) {
        return 0;
    }
    return (end - start) / 1000;
};


export default function VisitsList({ visits, onEditVisit, onDeleteVisit }: VisitsListProps) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');
  const [workshopFilter, setWorkshopFilter] = useState<Workshop | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: 'asc' | 'desc' }>({ key: 'arrivalTimestamp', direction: 'desc' });
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const workshops = useMemo(() => Array.from(new Set(visits.map(v => v.workshop).filter(Boolean))) as Workshop[], [visits]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    return ['admin01', 'quemoel457359'].includes(user.name);
  }, [user]);

  const sortedVisits = useMemo(() => {
    const filtered = visits
      .filter((visit) => statusFilter === 'all' || visit.status === statusFilter)
      .filter((visit) => typeFilter === 'all' || (Array.isArray(visit.orderType) ? visit.orderType.includes(typeFilter) : visit.orderType === typeFilter))
      .filter((visit) => workshopFilter === 'all' || visit.workshop === workshopFilter);

    const now = Date.now();
    const augmentedVisits = filtered.map(visit => {
        const queueTime = getDurationInSeconds(visit.arrivalTimestamp, visit.maintenanceStartTimestamp);
        const maintenanceTime = getDurationInSeconds(visit.maintenanceStartTimestamp, visit.awaitingPartTimestamp || visit.finishTimestamp);
        const partsTime = getDurationInSeconds(visit.awaitingPartTimestamp, visit.finishTimestamp);
        const totalTime = getDurationInSeconds(visit.arrivalTimestamp, visit.finishTimestamp);

        const getRunningTime = (start?: number) => typeof start === 'number' ? (now - start) / 1000 : 0;

        return {
            ...visit,
            queueTime: visit.status === 'Em Fila' ? getRunningTime(visit.arrivalTimestamp) : queueTime,
            maintenanceTime: visit.status === 'Em Manutenção' ? getRunningTime(visit.maintenanceStartTimestamp) : maintenanceTime,
            partsTime: visit.status === 'Aguardando Peça' ? getRunningTime(visit.awaitingPartTimestamp) : partsTime,
            totalTime: visit.status !== 'Finalizado' ? getRunningTime(visit.arrivalTimestamp) : totalTime,
        };
    });

    augmentedVisits.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return augmentedVisits;
  }, [visits, statusFilter, typeFilter, workshopFilter, sortConfig]);

  const requestSort = (key: SortableKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortableKey) => {
    if (sortConfig.key !== key) return <span className="w-4 h-4" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const SortableHeader = ({ sortKey, children, className }: { sortKey: SortableKey; children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => requestSort(sortKey)} className="px-1">
        {children}
        {getSortIcon(sortKey)}
      </Button>
    </TableHead>
  );

  return (
    <>
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Visitas Registradas</CardTitle>
          <div className="flex flex-col md:flex-row gap-2 md:items-center mt-4 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="Em Fila">Em Fila</SelectItem>
                <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                <SelectItem value="Movimentação">Movimentação</SelectItem>
                <SelectItem value="Finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="Calibragem">Calibragem</SelectItem>
                <SelectItem value="Inspeção">Inspeção</SelectItem>
                <SelectItem value="Preventiva">Preventiva</SelectItem>
                <SelectItem value="Corretiva">Corretiva</SelectItem>
                <SelectItem value="Preditiva">Preditiva</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workshopFilter} onValueChange={(v) => setWorkshopFilter(v as any)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por Oficina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Oficinas</SelectItem>
                {workshops.map(ws => <SelectItem key={ws} value={ws!}>{ws}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader sortKey="fleetId">Frota</SortableHeader>
                <SortableHeader sortKey="workshop">Oficina</SortableHeader>
                <TableHead>Tipo</TableHead>
                <SortableHeader sortKey="status">Status</SortableHeader>
                <SortableHeader sortKey="boxNumber">Box</SortableHeader>
                 <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVisits.length > 0 ? (
                sortedVisits.map((visit) => (
                <TableRow key={visit.id} onClick={() => setSelectedVisit(visit)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{visit.fleetId}</div>
                    <div className="text-sm text-muted-foreground">{visit.plate}</div>
                  </TableCell>
                  <TableCell>{visit.workshop || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(visit.orderType) ? visit.orderType : [visit.orderType]).map((type: string) => (
                        <Badge key={type} variant={orderTypeVariant[type as OrderType] || 'default'}>{type}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[visit.status]}>{visit.status}</Badge>
                  </TableCell>
                  <TableCell>{visit.boxNumber || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEditVisit(visit); }}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar Visita</span>
                        </Button>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Excluir Visita</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro da visita da frota <strong>{visit.fleetId}</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDeleteVisit(visit.id, visit.fleetId); }}>
                                  Sim, excluir visita
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhuma visita encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
            )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedVisit && (
        <VisitDetailsDialog
          visit={selectedVisit}
          open={!!selectedVisit}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedVisit(null);
            }
          }}
          onEditVisit={onEditVisit}
        />
      )}
    </>
  );
}
