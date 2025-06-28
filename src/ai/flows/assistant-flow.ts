'use server';
/**
 * @fileOverview A conversational AI assistant for the fleet management app.
 */

import {ai} from '@/ai/genkit';
import {Message} from 'genkit';
import {z} from 'zod';
import {type Fleet, type Visit, type Workshop, type MaintenanceStatus} from '@/lib/types';
import {format, intervalToDuration} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Schemas for the flow input
const AssistantFlowInputSchema = z.object({
  history: z.array(z.any()), // Using any for simplicity with Genkit Message type
  allVisitsJSON: z.string().describe('The entire visit history as a JSON string.'),
  allFleetsJSON: z.string().describe('The entire fleet list as a JSON string.'),
});
type AssistantFlowInput = z.infer<typeof AssistantFlowInputSchema>;


const formatDate = (timestamp?: number) => {
  return timestamp ? format(new Date(timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A';
};

const formatDuration = (start?: number, end?: number) => {
    if (typeof start !== 'number' || typeof end !== 'number' || end < start) return 'N/A';
    const duration = intervalToDuration({ start: new Date(start), end: new Date(end) });
    const parts = [];
    if (duration.days) parts.push(`${duration.days}d`);
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);
    return parts.length > 0 ? parts.join(' ') : '0m';
}


// Schemas for Tool Outputs
const VisitDetailsSchema = z.object({
    ID_Visita: z.string(),
    Frota: z.string(),
    Placa: z.string(),
    Status_Atual: z.string(),
    Oficina: z.string().optional().nullable(),
    Box: z.string().optional().nullable(),
    Tipo_Ordem: z.string(),
    Observacoes_Iniciais: z.string().optional().nullable(),
    Servico_Executado_Atual: z.string().optional().nullable(),
    Peca_Utilizada_Atual: z.string().optional().nullable(),
    Quantidade_Peca_Atual: z.number().optional().nullable(),
    Datas_Principais: z.object({
      Chegada: z.string(),
      Inicio_Manutencao: z.string(),
      Aguardando_Peca: z.string(),
      Finalizacao: z.string(),
    }),
    Tempos_de_Parada_Calculados: z.object({
      Tempo_Total_em_Fila: z.string(),
      Tempo_Total_em_Manutencao: z.string(),
      Tempo_Total_Visita: z.string(),
    }),
    Historico_Servicos_Concluidos_na_Visita: z.array(z.object({
      Tipo_Servico: z.string(),
      Servico_Realizado: z.string().optional().nullable(),
      Peca_Utilizada: z.string().optional().nullable(),
      Quantidade_Peca: z.number().optional().nullable(),
      Data_Inicio_Atividade: z.string(),
      Data_Fim_Atividade: z.string(),
    })).optional().nullable(),
  }).describe("Os detalhes completos de uma única visita de um veículo à oficina.");
  
const FindVisitsOutputSchema = z.array(VisitDetailsSchema).describe('Uma lista de visitas com todos os detalhes que correspondem aos filtros.');

const FleetDetailsSchema = z.object({
    id: z.string().describe("O ID único da frota, ex: 'F1234'"),
    plate: z.string().describe("A placa do veículo, ex: 'ABC-1D23'"),
    equipmentType: z.string().describe("O tipo de equipamento, ex: 'Carreta'"),
    carrier: z.string().describe("O nome da transportadora."),
}).describe("Os detalhes de uma frota.");

const FindFleetsOutputSchema = z.array(FleetDetailsSchema).describe('Uma lista de frotas que correspondem à busca.');


/**
 * Main function to interact with the conversational assistant.
 * @param input The user's chat history and the app's data.
 * @returns The AI's text response.
 */
export async function askAssistant(input: AssistantFlowInput): Promise<string> {
  const allVisits: Visit[] = JSON.parse(input.allVisitsJSON);
  const allFleets: Fleet[] = JSON.parse(input.allFleetsJSON);

  // By defining tools inside the flow, they gain access to the data
  // passed in the `input` (allVisits, allFleets).
  const findVisitsTool = ai.defineTool(
    {
      name: 'findVisits',
      description:
        'Busca e recupera registros de visitas de veículos com base em uma busca por palavra-chave. A busca é flexível e procura em todos os campos da visita, incluindo IDs, placas, status, oficinas, observações e peças.',
      inputSchema: z.object({
        query: z.string().describe('Uma busca por palavras-chave sobre visitas. Pode ser um ID de frota, placa, status, oficina, ou texto das observações ou serviços.'),
      }),
      outputSchema: FindVisitsOutputSchema,
    },
    async ({ query }) => {
      const lowerCaseQuery = query.toLowerCase();
      const results = allVisits.filter(v => {
        const orderTypeString = (Array.isArray(v.orderType) ? v.orderType.join(' ') : v.orderType) || "";
        
        const serviceHistoryString = v.serviceHistory?.map(sh => 
          [
            sh.orderType,
            sh.partUsed,
            sh.servicePerformed,
            sh.partQuantity?.toString()
          ].filter(Boolean).join(' ')
        ).join(' ') || "";

        const searchableText = [
          v.fleetId,
          v.plate,
          v.status,
          v.workshop,
          v.notes,
          v.servicePerformed,
          v.partUsed,
          v.partQuantity?.toString(),
          orderTypeString,
          serviceHistoryString,
        ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
        
        return searchableText.includes(lowerCaseQuery);
      });
      // Return a very detailed version to the AI
      return results.map(v => ({
        ID_Visita: v.id,
        Frota: v.fleetId,
        Placa: v.plate,
        Status_Atual: v.status,
        Oficina: v.workshop ?? null,
        Box: v.boxNumber ?? null,
        Tipo_Ordem: Array.isArray(v.orderType) ? v.orderType.join(', ') : v.orderType,
        Observacoes_Iniciais: v.notes ?? null,
        Servico_Executado_Atual: v.servicePerformed ?? null,
        Peca_Utilizada_Atual: v.partUsed ?? null,
        Quantidade_Peca_Atual: v.partQuantity ?? null,
        Datas_Principais: {
            Chegada: formatDate(v.arrivalTimestamp),
            Inicio_Manutencao: formatDate(v.maintenanceStartTimestamp),
            Aguardando_Peca: formatDate(v.awaitingPartTimestamp),
            Finalizacao: formatDate(v.finishTimestamp),
        },
        Tempos_de_Parada_Calculados: {
            Tempo_Total_em_Fila: formatDuration(v.arrivalTimestamp, v.maintenanceStartTimestamp),
            Tempo_Total_em_Manutencao: formatDuration(v.maintenanceStartTimestamp, v.finishTimestamp),
            Tempo_Total_Visita: formatDuration(v.arrivalTimestamp, v.finishTimestamp),
        },
        Historico_Servicos_Concluidos_na_Visita: v.serviceHistory?.map(log => ({
            Tipo_Servico: log.orderType,
            Servico_Realizado: log.servicePerformed ?? null,
            Peca_Utilizada: log.partUsed ?? null,
            Quantidade_Peca: log.partQuantity ?? null,
            Data_Inicio_Atividade: formatDate(log.startTimestamp),
            Data_Fim_Atividade: formatDate(log.finishTimestamp),
        })) ?? null,
    }));
    }
  );

  const findFleetsTool = ai.defineTool(
    {
        name: 'findFleets',
        description: 'Busca e recupera informações de veículos da frota com base em uma busca por palavra-chave (ID, placa ou transportadora).',
        inputSchema: z.object({
            query: z.string().describe("Uma busca por palavras-chave sobre frotas. Pode ser um ID, placa, ou nome da transportadora."),
        }),
        outputSchema: FindFleetsOutputSchema,
    },
    async ({ query }) => {
        const lowerCaseQuery = query.toLowerCase();
        return allFleets.filter(fleet => 
            fleet.id.toLowerCase().includes(lowerCaseQuery) ||
            fleet.plate.toLowerCase().includes(lowerCaseQuery) ||
            fleet.carrier.toLowerCase().includes(lowerCaseQuery)
        );
    }
  );


  const {response} = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    system: `Você é a "IA Carretômetro", uma assistente especialista em gestão e manutenção de frotas de veículos pesados, com profundo conhecimento em PCM (Planejamento e Controle de Manutenção) e mecânica de carretas.

Seu objetivo é responder de forma completa e detalhada às perguntas do usuário sobre as frotas, visitas, histórico de serviços, peças, tempos de parada e desempenho geral da oficina.

Para encontrar informações, use as ferramentas \`findVisits\` e \`findFleets\`. Em vez de filtros rígidos, você pode buscar por qualquer palavra-chave. Analise a pergunta do usuário e extraia os termos mais importantes (como IDs de frota, placas, status, problemas descritos, nomes de peças, etc.) e use-os no parâmetro \`query\` da ferramenta. A busca é flexível e procurará em todos os campos relevantes. Você deve basear suas respostas estritamente nos dados retornados por essas ferramentas.

Seja amigável, conversacional e proativa. Ao apresentar dados como listas ou históricos, formate-os em tabelas ou listas de tópicos para garantir clareza e fácil leitura. Se o usuário perguntar seu nome, diga que é a IA Carretômetro.`,
    tools: [findVisitsTool, findFleetsTool],
    history: input.history,
  });

  return response.text;
}
