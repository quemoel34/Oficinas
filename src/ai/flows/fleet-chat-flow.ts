'use server';
/**
 * @fileOverview An AI agent for auditing a single vehicle's maintenance history.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import { Visit } from '@/lib/types';

// Schemas are not exported because of 'use server' constraints.
const FleetChatInputSchema = z.object({
  fleetId: z.string(),
  visitHistory: z.string().describe("The vehicle's entire maintenance history as a JSON string."),
  question: z.string().describe("The specific question the user wants an answer to."),
});
export type FleetChatInput = z.infer<typeof FleetChatInputSchema>;


// Helper to format timestamps for the AI prompt
const formatDate = (timestamp?: number) => {
  return timestamp ? format(new Date(timestamp), 'dd/MM/yyyy HH:mm', {locale: ptBR}) : null;
};

const transformVisitForAI = (visit: Visit) => ({
  ...visit,
  arrivalTimestamp: formatDate(visit.arrivalTimestamp),
  maintenanceStartTimestamp: formatDate(visit.maintenanceStartTimestamp),
  awaitingPartTimestamp: formatDate(visit.awaitingPartTimestamp),
  finishTimestamp: formatDate(visit.finishTimestamp),
  boxEntryTimestamp: formatDate(visit.boxEntryTimestamp),
  createdAt: formatDate(visit.createdAt),
  updatedAt: formatDate(visit.updatedAt),
  serviceHistory: visit.serviceHistory?.map(log => ({
    ...log,
    startTimestamp: formatDate(log.startTimestamp),
    finishTimestamp: formatDate(log.finishTimestamp),
  })),
});

export async function chatWithFleet(input: FleetChatInput): Promise<string> {
  const transformedHistory = JSON.stringify(
    JSON.parse(input.visitHistory).map(transformVisitForAI),
    null,
    2
  );

  const systemPrompt = `Você é um especialista em auditoria de manutenção de frotas. Sua única fonte de conhecimento é o histórico de manutenção em formato JSON fornecido abaixo para o veículo com ID: ${input.fleetId}.

Responda de forma direta e completa à pergunta do usuário, baseando-se estritamente nos dados fornecidos. Formate sua resposta de forma clara usando títulos, listas ou parágrafos curtos.

Histórico de Manutenção do Veículo ${input.fleetId}:
${transformedHistory}

Pergunta do Usuário:
"${input.question}"
`;

  const {response} = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: systemPrompt,
  });

  return response.text;
}
