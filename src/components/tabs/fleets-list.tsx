'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { type Fleet, type Visit } from '@/lib/types';
import { Button } from '../ui/button';
import { History, Truck, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '../ui/input';

interface FleetsListProps {
  fleets: Fleet[];
  visits: Visit[];
  onViewHistory: (fleet: Fleet) => void;
}

export default function FleetsList({ fleets, visits, onViewHistory }: FleetsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getFleetStats = (fleetId: string) => {
    const fleetVisits = visits
      .filter((v) => v.fleetId === fleetId)
      .sort((a, b) => b.arrivalTimestamp - a.arrivalTimestamp);
    
    const totalVisits = fleetVisits.length;
    const lastVisitDate = totalVisits > 0 ? format(new Date(fleetVisits[0].arrivalTimestamp), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';

    return { totalVisits, lastVisitDate };
  };

  const filteredFleets = searchTerm
    ? fleets.filter(fleet =>
        fleet.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fleet.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fleet.carrier.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : fleets;

  return (
    <div className="space-y-4">
       <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por Frota, Placa ou Transportadora..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredFleets.length > 0 ? (
          filteredFleets.map((fleet) => {
            const stats = getFleetStats(fleet.id);
            return (
              <Card key={fleet.id} className="transform-gpu transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group bg-card/50 overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative">
                  <div>
                      <CardTitle className="text-base font-bold">{fleet.id}</CardTitle>
                      <p className="text-xs text-muted-foreground">{fleet.plate}</p>
                  </div>
                  <Truck className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{fleet.carrier}</p>
                   <p className="text-xs text-muted-foreground">{fleet.equipmentType}</p>
                  <div className="mt-4 space-y-1 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de Visitas:</span>
                      <span className="font-bold">{stats.totalVisits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última Visita:</span>
                      <span className="font-bold">{stats.lastVisitDate}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline" onClick={() => onViewHistory(fleet)}>
                    <History className="mr-2 h-4 w-4" /> Ver Histórico
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4">Nenhuma frota encontrada com os critérios de busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}
