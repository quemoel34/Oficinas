'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, WifiOff } from 'lucide-react';
import { getProactiveSuggestions } from '@/app/actions';
import { Fleet } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { getFleets, getVisits } from '@/lib/data-manager';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function ProactiveAiSection({ fleets }: { fleets: Fleet[] }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();

  const handleGenerate = () => {
    if (!selectedVehicleId || !isOnline) return;

    startTransition(async () => {
      // Fetch the latest data from localStorage for the AI
      const allFleets = getFleets();
      const allVisits = getVisits();
      
      const result = await getProactiveSuggestions(
        selectedVehicleId,
        JSON.stringify(allFleets),
        JSON.stringify(allVisits)
      );
      setSuggestions(result);
    });
  };

  return (
    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
          <Sparkles className="h-6 w-6 text-primary" />
          Sugestões de Manutenção Proativa (IA)
        </CardTitle>
        <CardDescription>
          Selecione um veículo para receber sugestões de manutenção baseadas em dados históricos e características de operação para otimizar a performance da frota.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Select onValueChange={setSelectedVehicleId} value={selectedVehicleId} disabled={!isOnline}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder={isOnline ? "Selecione um veículo" : "Internet necessária"} />
            </SelectTrigger>
            <SelectContent>
              {fleets.map((fleet) => (
                <SelectItem key={fleet.id} value={fleet.id}>
                  {fleet.id} - {fleet.plate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={!selectedVehicleId || isPending || !isOnline} className="w-full sm:w-auto">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
             <>
               <Sparkles className="mr-2 h-4 w-4" />
               Gerar Sugestões
             </>
            )}
          </Button>
        </div>
        
        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Modo Offline</AlertTitle>
            <AlertDescription>A geração de sugestões com IA requer uma conexão com a internet. As outras funcionalidades do app continuam disponíveis.</AlertDescription>
          </Alert>
        )}

        {suggestions && isOnline && (
          <Alert className="bg-background/50">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle>Recomendações da IA</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap font-mono">{suggestions}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
