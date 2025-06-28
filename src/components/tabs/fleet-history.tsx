'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { type Visit, type Fleet, type OrderType } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../ui/button';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { statusVariant, orderTypeVariant } from './visits-list';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { getFleetAnalysis } from '@/app/actions';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import dynamic from 'next/dynamic';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const VisitDetailsDialog = dynamic(() => import('../visit-details-dialog').then(mod => mod.VisitDetailsDialog));

interface FleetHistoryProps {
  fleet: Fleet;
  visits: Visit[];
  onBack: () => void;
  onEditVisit: (visit: Visit) => void;
}

export default function FleetHistory({ fleet, visits, onBack, onEditVisit }: FleetHistoryProps) {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const isOnline = useOnlineStatus();
  const [isAnalyzing, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<string>('');
  const [analysisTitle, setAnalysisTitle] = useState<string>('');

  const sortedVisits = [...visits].sort((a, b) => b.arrivalTimestamp - a.arrivalTimestamp);
  
  const handleAnalysis = (type: 'FULL' | 'SUMMARY' | 'RECURRING_ISSUES' | 'DOWNTIME', title: string) => {
    if (!isOnline || isAnalyzing) return;
    setAnalysis('');
    setAnalysisTitle(title);
    startTransition(async () => {
      const result = await getFleetAnalysis(fleet.id, sortedVisits, type);
      setAnalysis(result);
    });
  }

  return (
    <>
      <Card className="relative">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Histórico da Frota: {fleet.id}</CardTitle>
              <CardDescription>Placa: {fleet.plate} | Transportadora: {fleet.carrier}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={!isOnline || isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      {isAnalyzing ? 'Analisando...' : 'Análise com IA'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Selecione um tipo de análise</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAnalysis('FULL', 'Análise Completa')}>Análise Completa</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAnalysis('SUMMARY', 'Resumo de Manutenções')}>Resumo de Manutenções</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAnalysis('RECURRING_ISSUES', 'Problemas Recorrentes')}>Problemas Recorrentes</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAnalysis('DOWNTIME', 'Análise de Tempos de Parada')}>Análise de Tempos de Parada</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           {isAnalyzing && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Análise em Andamento: {analysisTitle}</AlertTitle>
              <AlertDescription>
                A IA está processando o histórico do veículo. Isso pode levar alguns instantes.
              </AlertDescription>
            </Alert>
          )}
          {analysis && !isAnalyzing && (
            <Alert className="mb-4">
              <Sparkles className="h-4 w-4" />
              <AlertTitle>{analysisTitle} sobre {fleet.id}</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">{analysis}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data de Chegada</TableHead>
                <TableHead>Tipo de Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Oficina</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVisits.map((visit) => (
                <TableRow key={visit.id} className="cursor-pointer" onClick={() => setSelectedVisit(visit)}>
                  <TableCell>{format(new Date(visit.arrivalTimestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(visit.orderType) ? visit.orderType : [visit.orderType]).map((type: string) => (
                          <Badge key={type} variant={orderTypeVariant[type as OrderType]}>{type}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[visit.status]}>{visit.status}</Badge>
                  </TableCell>
                  <TableCell>{visit.workshop}</TableCell>
                </TableRow>
              ))}
              {sortedVisits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum histórico de visita encontrado para esta frota.
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
