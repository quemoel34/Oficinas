'use server';

import { proactiveMaintenanceSuggestions } from '@/ai/flows/proactive-maintenance-suggestions';
import { Fleet, Visit } from '@/lib/types';
import { generateAnalyticsReport } from '@/ai/flows/generate-report-flow';
import { chatWithFleet as chatWithFleetFlow, type FleetChatInput } from '@/ai/flows/fleet-chat-flow';
import { analyzeFleetHistory, type FleetAnalysisInput } from '@/ai/flows/fleet-analysis-flow';


export async function getProactiveSuggestions(
  vehicleId: string,
  allFleetsJSON: string,
  allVisitsJSON:string,
) {
  try {
    const allFleets: Fleet[] = JSON.parse(allFleetsJSON);
    const allVisits: Visit[] = JSON.parse(allVisitsJSON);

    const vehicle = allFleets.find(f => f.id === vehicleId);
    if (!vehicle) {
        throw new Error("Veículo não encontrado.");
    }

    const relevantData = {
      vehicleDetails: vehicle,
      historicalVisits: allVisits.filter(v => v.fleetId === vehicleId),
      similarVehicleVisits: allVisits.filter(v => v.equipmentType === vehicle.equipmentType && v.fleetId !== vehicleId)
    };
    
    const fleetDataString = JSON.stringify(relevantData, null, 2);

    const result = await proactiveMaintenanceSuggestions({
      fleetData: fleetDataString,
      vehicleId: vehicleId,
    });

    return result.suggestions;
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return 'Ocorreu um erro ao gerar as sugestões. Por favor, tente novamente mais tarde.';
  }
}

export async function generateReportAction(visitsJson: string) {
    try {
        const report = await generateAnalyticsReport({ visitsJson });
        return report;
    } catch (error) {
        console.error('Error generating AI report:', error);
        return null;
    }
}

export async function chatWithFleet(input: FleetChatInput): Promise<string> {
  try {
    const response = await chatWithFleetFlow(input);
    return response;
  } catch (error) {
    console.error('Error with fleet chat flow:', error);
    return 'Desculpe, ocorreu um erro ao me comunicar com a IA. Por favor, tente novamente.';
  }
}

export async function getFleetAnalysis(
  fleetId: string,
  visits: Visit[],
  analysisType: FleetAnalysisInput['analysisType']
): Promise<string> {
  try {
    const result = await analyzeFleetHistory({
      fleetId,
      visitHistory: JSON.stringify(visits),
      analysisType,
    });
    return result.analysis;
  } catch (error) {
    console.error('Error generating fleet analysis:', error);
    return 'Ocorreu um erro ao gerar a análise da frota. Por favor, tente novamente mais tarde.';
  }
}
