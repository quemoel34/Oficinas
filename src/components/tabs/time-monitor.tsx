'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { type Visit, type Fleet, type Workshop, OrderType } from '@/lib/types';
import { Clock, Wrench, PackageSearch, Gauge, CheckCircle, Calendar as CalendarIcon, X, ClipboardCheck, Search, Target } from 'lucide-react';
import { TimerDisplay } from '../timer-display';
import { ProactiveAiSection } from '../proactive-ai-section';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import dynamic from 'next/dynamic';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { orderTypeVariant } from './visits-list';

const FinalizedVisitsDialog = dynamic(() => import('../finalized-visits-dialog').then(mod => mod.FinalizedVisitsDialog));
const MaintenanceTypeChart = dynamic(() => import('../maintenance-type-chart').then(mod => mod.MaintenanceTypeChart), {
  loading: () => (
    <Card className="h-[348px] bg-card/50">
      <CardHeader className="items-center pb-0">
        <CardTitle>Ordens Finalizadas (Total)</CardTitle>
        <CardDescription>
          Distribuição por tipo de ordem
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center">
        <Skeleton className="h-48 w-48 rounded-full" />
      </CardContent>
    </Card>
  ),
  ssr: false,
});
const VisitDetailsDialog = dynamic(() => import('../visit-details-dialog').then(mod => mod.VisitDetailsDialog));


// Helper function to format duration
function formatDuration(totalSeconds: number): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      return '00:00:00';
    }
  
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
  
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Stats card component
const MetricCard = ({
  title,
  icon: Icon,
  averageSeconds,
  targetSeconds,
  vehicleCount,
  value,
  description,
  onClick,
}: {
  title: string;
  icon: React.ElementType;
  averageSeconds?: number;
  targetSeconds?: number;
  vehicleCount?: number;
  value?: string | number;
  description?: string;
  onClick?: () => void;
}) => {
  const isDurationCard = averageSeconds !== undefined && vehicleCount !== undefined;

  const displayValue = isDurationCard ? formatDuration(averageSeconds) : value;
  const displayDescription = description ?? (isDurationCard ? `Tempo médio de ${vehicleCount} veículo(s)` : 'Nenhum veículo no momento');

  const showContent = isDurationCard ? vehicleCount! > 0 : value !== undefined;
  
  const progress = isDurationCard && targetSeconds && averageSeconds > 0 ? Math.min(100, (averageSeconds / targetSeconds) * 100) : 0;
  const isOverSLA = progress >= 100;

  return (
    <Card 
      className={cn(
        "flex flex-col transform-gpu transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card/50 border-border/50",
        onClick && "cursor-pointer",
        isOverSLA && "border-destructive/50 bg-destructive/10"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-5 w-5 text-muted-foreground", isOverSLA ? "text-destructive" : "text-primary")} />
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center">
        {showContent ? (
          <>
            <p className="text-3xl font-bold tracking-tighter">{displayValue}</p>
            <p className="text-xs text-muted-foreground">{displayDescription}</p>
          </>
        ) : (
          <div className="flex items-center justify-center h-full pt-2">
            <p className="text-sm text-muted-foreground">Nenhum veículo.</p>
          </div>
        )}
      </CardContent>
      {isDurationCard && targetSeconds && showContent ? (
         <CardFooter className="flex flex-col items-start gap-1 p-6 pt-0">
          <div className="flex w-full justify-between text-xs text-muted-foreground">
            <span>Meta: {formatDuration(targetSeconds)}</span>
            <span className={isOverSLA ? 'text-destructive font-semibold' : 'text-primary'}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <Progress value={progress} className={cn("w-full h-2", isOverSLA ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
        </CardFooter>
      ) : null}
    </Card>
  );
};

interface TimeMonitorState {
    groupedVisits: {
        'Em Fila': Visit[];
        'Em Manutenção': Visit[];
        'Aguardando Peça': Visit[];
    };
    metrics: {
        avgQueueSeconds: number;
        queueCount: number;
        avgAwaitingPartSeconds: number;
        awaitingPartCount: number;
        avgMaintenanceCorrectiveSeconds: number;
        maintenanceCorrectiveCount: number;
        avgMaintenancePreventiveSeconds: number;
        maintenancePreventiveCount: number;
        avgMaintenanceInspectionSeconds: number;
        maintenanceInspectionCount: number;
        avgMaintenanceCalibrationSeconds: number;
        maintenanceCalibrationCount: number;
        finalizedInPeriodCount: number;
    };
    finalizedVisitsInPeriod: Visit[];
    allFinalizedVisits: Visit[];
    dateFilteredVisits: Visit[];
}

// Main component
export default function TimeMonitor({ visits, fleets }: { visits: Visit[]; fleets: Fleet[] }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [workshopFilter, setWorkshopFilter] = useState<'all' | Workshop>('all');
  const [showFinalizedDialog, setShowFinalizedDialog] = useState(false);
  const [selectedFinalizedVisit, setSelectedFinalizedVisit] = useState<Visit | null>(null);
  
  const [calculatedData, setCalculatedData] = useState<TimeMonitorState | null>(null);

  useEffect(() => {
    const calculate = () => {
        const now = Date.now();
        const safeOrderType = (v: Visit): OrderType[] => Array.isArray(v.orderType) ? v.orderType : [v.orderType];
        
        const workshopFilteredVisits = visits.filter(visit => {
            if (workshopFilter === 'all') return true;
            return visit.workshop === workshopFilter;
        });

        const dateFilteredVisits = workshopFilteredVisits.filter((visit) => {
          if (!selectedDate) return true;
          const visitDate = new Date(visit.arrivalTimestamp);
          return (
            visitDate.getFullYear() === selectedDate.getFullYear() &&
            visitDate.getMonth() === selectedDate.getMonth() &&
            visitDate.getDate() === selectedDate.getDate()
          );
        });

        const activeVisitsForLists = dateFilteredVisits.filter((v) => v.status !== 'Finalizado');

        const groupedForLists = {
          'Em Fila': activeVisitsForLists.filter((v) => v.status === 'Em Fila').sort((a,b) => a.arrivalTimestamp - b.arrivalTimestamp),
          'Em Manutenção': activeVisitsForLists.filter((v) => v.status === 'Em Manutenção').sort((a,b) => (a.maintenanceStartTimestamp || 0) - (b.maintenanceStartTimestamp || 0)),
          'Aguardando Peça': activeVisitsForLists.filter((v) => v.status === 'Aguardando Peça').sort((a,b) => (a.awaitingPartTimestamp || 0) - (b.awaitingPartTimestamp || 0)),
        };

        const activeVisitsForMetrics = workshopFilteredVisits.filter(v => {
            if (v.status === 'Finalizado') return false;
            if (selectedDate) {
                const arrivalDate = new Date(v.arrivalTimestamp);
                return (
                    arrivalDate.getFullYear() === selectedDate.getFullYear() &&
                    arrivalDate.getMonth() === selectedDate.getMonth() &&
                    arrivalDate.getDate() === selectedDate.getDate()
                );
            }
            return true; // Include all non-finalized if no date is selected
        });

        const groupedForMetrics = {
          'Em Fila': activeVisitsForMetrics.filter((v) => v.status === 'Em Fila'),
          'Em Manutenção': activeVisitsForMetrics.filter((v) => v.status === 'Em Manutenção'),
          'Aguardando Peça': activeVisitsForMetrics.filter((v) => v.status === 'Aguardando Peça'),
        };
        
        const calculateAverage = (items: Visit[], getStartTime: (v: Visit) => number | undefined) => {
            if (items.length === 0) return 0;
            const totalSeconds = items.reduce((acc, visit) => {
                const startTime = getStartTime(visit);
                return acc + (startTime ? (now - startTime) / 1000 : 0);
            }, 0);
            return totalSeconds / items.length;
        };
        
        const maintenanceCorrective = groupedForMetrics['Em Manutenção'].filter(v => safeOrderType(v).includes('Corretiva'));
        const maintenancePreventive = groupedForMetrics['Em Manutenção'].filter(v => 
            safeOrderType(v).some(ot => ['Preventiva', 'Preditiva'].includes(ot))
        );
        const maintenanceInspection = groupedForMetrics['Em Manutenção'].filter(v => 
            safeOrderType(v).includes('Inspeção')
        );
        const maintenanceCalibration = groupedForMetrics['Em Manutenção'].filter(v => 
            safeOrderType(v).includes('Calibragem')
        );

        const metrics = {
            avgQueueSeconds: calculateAverage(groupedForMetrics['Em Fila'], v => v.arrivalTimestamp),
            queueCount: groupedForMetrics['Em Fila'].length,
            avgAwaitingPartSeconds: calculateAverage(groupedForMetrics['Aguardando Peça'], v => v.awaitingPartTimestamp),
            awaitingPartCount: groupedForMetrics['Aguardando Peça'].length,
            avgMaintenanceCorrectiveSeconds: calculateAverage(maintenanceCorrective, v => v.maintenanceStartTimestamp),
            maintenanceCorrectiveCount: maintenanceCorrective.length,
            avgMaintenancePreventiveSeconds: calculateAverage(maintenancePreventive, v => v.maintenanceStartTimestamp),
            maintenancePreventiveCount: maintenancePreventive.length,
            avgMaintenanceInspectionSeconds: calculateAverage(maintenanceInspection, v => v.maintenanceStartTimestamp),
            maintenanceInspectionCount: maintenanceInspection.length,
            avgMaintenanceCalibrationSeconds: calculateAverage(maintenanceCalibration, v => v.maintenanceStartTimestamp),
            maintenanceCalibrationCount: maintenanceCalibration.length,
        };

        const finalizedInPeriod = selectedDate
          ? dateFilteredVisits.filter(v => v.status === 'Finalizado')
          : workshopFilteredVisits.filter(
              (v) =>
                v.status === 'Finalizado' &&
                v.finishTimestamp &&
                v.finishTimestamp >= now - 24 * 60 * 60 * 1000
            );
        
        const allFinalizedVisits = workshopFilteredVisits.filter((v) => v.status === 'Finalizado');

        setCalculatedData({
            groupedVisits: groupedForLists,
            metrics: {
                ...metrics,
                finalizedInPeriodCount: finalizedInPeriod.length,
            },
            finalizedVisitsInPeriod: finalizedInPeriod.sort((a, b) => (b.finishTimestamp || 0) - (a.finishTimestamp || 0)),
            allFinalizedVisits: allFinalizedVisits,
            dateFilteredVisits: dateFilteredVisits,
        });
    };
    
    calculate();
    const timerId = setInterval(calculate, 1500);
    
    return () => clearInterval(timerId);
  }, [visits, selectedDate, workshopFilter]);


  const { groupedVisits, metrics, finalizedVisitsInPeriod, allFinalizedVisits, dateFilteredVisits } = calculatedData || {
      groupedVisits: { 'Em Fila': [], 'Em Manutenção': [], 'Aguardando Peça': [] },
      metrics: {
          avgQueueSeconds: 0,
          queueCount: 0,
          avgAwaitingPartSeconds: 0,
          awaitingPartCount: 0,
          avgMaintenanceCorrectiveSeconds: 0,
          maintenanceCorrectiveCount: 0,
          avgMaintenancePreventiveSeconds: 0,
          maintenancePreventiveCount: 0,
          avgMaintenanceInspectionSeconds: 0,
          maintenanceInspectionCount: 0,
          avgMaintenanceCalibrationSeconds: 0,
          maintenanceCalibrationCount: 0,
          finalizedInPeriodCount: 0,
      },
      finalizedVisitsInPeriod: [],
      allFinalizedVisits: [],
      dateFilteredVisits: [],
  };

  const getTimerStartTime = (visit: Visit) => {
    switch(visit.status) {
      case 'Em Manutenção':
        return visit.maintenanceStartTimestamp || visit.arrivalTimestamp;
      case 'Aguardando Peça':
        return visit.awaitingPartTimestamp || visit.maintenanceStartTimestamp || visit.arrivalTimestamp;
      default:
        return visit.arrivalTimestamp;
    }
  }
  
  const SLA_SECONDS = {
    QUEUE: 10 * 3600,
    CORRECTIVE: 10 * 3600,
    PREVENTIVE: 20 * 3600,
    INSPECTION: 2 * 3600,
    CALIBRATION: 1 * 3600,
  };
  
  const chartVisits = selectedDate
    ? dateFilteredVisits.filter(v => v.status === 'Finalizado')
    : allFinalizedVisits;
    
  const fleetsForProactiveSection = useMemo(() => {
    if (workshopFilter === 'all') {
        return fleets;
    }
    const fleetsInWorkshop = new Set(
        visits.filter(v => v.workshop === workshopFilter).map(v => v.fleetId)
    );
    return fleets.filter(f => fleetsInWorkshop.has(f.id));
  }, [fleets, visits, workshopFilter]);
  
  const noVehiclesInOperation = Object.values(groupedVisits).every(list => list.length === 0);

  return (
    <div className="space-y-8">
       <Card className="p-4 bg-card/50">
          <div className="flex flex-col sm:flex-row items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full sm:w-[280px] justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : <span>Filtrar por data de chegada</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {selectedDate && (
                 <Button variant="ghost" onClick={() => setSelectedDate(undefined)} className="h-9 w-9 p-0">
                   <X className="h-4 w-4"/>
                   <span className="sr-only">Limpar filtro de data</span>
                </Button>
              )}
              <div className="w-full sm:w-auto sm:ml-auto">
                <Select value={workshopFilter} onValueChange={(v) => setWorkshopFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Filtrar por oficina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Oficinas</SelectItem>
                    <SelectItem value="Monte Líbano">Monte Líbano</SelectItem>
                    <SelectItem value="Vale das Carretas">Vale das Carretas</SelectItem>
                    <SelectItem value="CMC">CMC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
       </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
           <Card className="bg-transparent border-none shadow-none">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Gauge className="h-6 w-6 text-primary" />
                Métricas de Desempenho (Veículos Ativos)
              </CardTitle>
              <CardDescription>
                Acompanhe os indicadores da operação em relação às metas (SLA). 
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 grid gap-4 md:grid-cols-3">
                <MetricCard 
                    title="Tempo em Fila"
                    icon={Clock}
                    averageSeconds={metrics.avgQueueSeconds}
                    targetSeconds={SLA_SECONDS.QUEUE}
                    vehicleCount={metrics.queueCount}
                />
                <MetricCard 
                    title="Manut. Corretiva"
                    icon={Wrench}
                    averageSeconds={metrics.avgMaintenanceCorrectiveSeconds}
                    targetSeconds={SLA_SECONDS.CORRECTIVE}
                    vehicleCount={metrics.maintenanceCorrectiveCount}
                />
                <MetricCard 
                    title="Manut. Preventiva"
                    icon={Wrench}
                    averageSeconds={metrics.avgMaintenancePreventiveSeconds}
                    targetSeconds={SLA_SECONDS.PREVENTIVE}
                    vehicleCount={metrics.maintenancePreventiveCount}
                />
                <MetricCard 
                    title="Manut. Inspeção"
                    icon={Search}
                    averageSeconds={metrics.avgMaintenanceInspectionSeconds}
                    targetSeconds={SLA_SECONDS.INSPECTION}
                    vehicleCount={metrics.maintenanceInspectionCount}
                />
                <MetricCard 
                    title="Manut. Calibragem"
                    icon={Target}
                    averageSeconds={metrics.avgMaintenanceCalibrationSeconds}
                    targetSeconds={SLA_SECONDS.CALIBRATION}
                    vehicleCount={metrics.maintenanceCalibrationCount}
                />
                <MetricCard 
                    title="Aguardando Peças"
                    icon={PackageSearch}
                    averageSeconds={metrics.avgAwaitingPartSeconds}
                    vehicleCount={metrics.awaitingPartCount}
                />
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <ClipboardCheck className="h-6 w-6 text-primary" />
                      Visitas Finalizadas no Período
                  </CardTitle>
                  <CardDescription>
                      {selectedDate ? `Veículos que chegaram em ${format(selectedDate, 'dd/MM/yyyy')} e foram finalizados.` : 'Veículos finalizados nas últimas 24 horas.'}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Frota</TableHead>
                              <TableHead>Tipo Manutenção</TableHead>
                              <TableHead>T. Fila</TableHead>
                              <TableHead>T. Manut.</TableHead>
                              <TableHead>Finalização</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {finalizedVisitsInPeriod.length > 0 ? (
                              finalizedVisitsInPeriod.map((visit) => (
                                  <TableRow key={visit.id} className="cursor-pointer" onClick={() => setSelectedFinalizedVisit(visit)}>
                                      <TableCell className="font-medium">{visit.fleetId}</TableCell>
                                      <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                              {(Array.isArray(visit.orderType) ? visit.orderType : [visit.orderType]).map(type => (
                                                  <Badge key={type} variant={orderTypeVariant[type as OrderType]}>{type}</Badge>
                                              ))}
                                          </div>
                                      </TableCell>
                                      <TableCell>
                                          <TimerDisplay startTime={visit.arrivalTimestamp} endTime={visit.maintenanceStartTimestamp} />
                                      </TableCell>
                                      <TableCell>
                                          <TimerDisplay startTime={visit.maintenanceStartTimestamp} endTime={visit.finishTimestamp} />
                                      </TableCell>
                                      <TableCell>
                                          {visit.finishTimestamp ? format(new Date(visit.finishTimestamp), 'dd/MM HH:mm') : '–'}
                                      </TableCell>
                                  </TableRow>
                              ))
                          ) : (
                              <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center">Nenhuma visita finalizada no período.</TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Area */}
        <div className="lg:col-span-1 space-y-6">
           <Card className="bg-card/50">
            <CardHeader>
                <CardTitle className="text-base">Visão Geral da Operação</CardTitle>
            </CardHeader>
            <CardContent>
                 <MetricCard
                  title={selectedDate ? "Finalizados (Dia)" : "Finalizados (24h)"}
                  icon={CheckCircle}
                  value={metrics.finalizedInPeriodCount}
                  description={selectedDate ? "Veículos que chegaram e finalizaram no dia" : "Veículos finalizados nas últimas 24h"}
                  onClick={() => metrics.finalizedInPeriodCount > 0 && setShowFinalizedDialog(true)}
                />
            </CardContent>
          </Card>
          
          <MaintenanceTypeChart visits={chartVisits} className="bg-card/50" />

          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Veículos em Operação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {noVehiclesInOperation && (
                   <p className="text-sm text-muted-foreground text-center py-4">Nenhum veículo em operação.</p>
                )}
                {(Object.keys(groupedVisits) as Array<keyof typeof groupedVisits>).map((status) => {
                  const visitsInGroup = groupedVisits[status];
                  if (visitsInGroup.length === 0) return null;
                  
                  return (
                    <div key={status}>
                        <h4 className="font-semibold text-sm mb-2 flex justify-between items-center">
                            <span>{status}</span>
                            <Badge variant="secondary">{visitsInGroup.length}</Badge>
                        </h4>
                        <div className="space-y-2">
                            {visitsInGroup.map((visit) => (
                                <div key={visit.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                                <div>
                                    <p className="font-semibold">{visit.fleetId} ({visit.plate})</p>
                                    <p className="text-xs text-muted-foreground">{Array.isArray(visit.orderType) ? visit.orderType.join(', ') : visit.orderType} • {visit.workshop}</p>
                                </div>
                                <TimerDisplay 
                                    startTime={getTimerStartTime(visit)}
                                />
                                </div>
                            ))}
                        </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <ProactiveAiSection fleets={fleetsForProactiveSection} />

      {showFinalizedDialog && (
        <FinalizedVisitsDialog
          open={showFinalizedDialog}
          onOpenChange={setShowFinalizedDialog}
          visits={finalizedVisitsInPeriod}
          title={selectedDate ? `Veículos Finalizados em ${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}` : 'Veículos Finalizados (Últimas 24h)'}
          description="Lista detalhada de veículos que tiveram sua manutenção concluída."
        />
      )}

      {selectedFinalizedVisit && (
          <VisitDetailsDialog
              visit={selectedFinalizedVisit}
              open={!!selectedFinalizedVisit}
              onOpenChange={() => setSelectedFinalizedVisit(null)}
          />
      )}
    </div>
  );
}
