'use server';

/**
 * @fileOverview An AI agent that analyzes a single vehicle's maintenance history.
 *
 * - analyzeFleetHistory - A function that generates a detailed analysis for a vehicle.
 * - FleetAnalysisInput - The input type for the analyzeFleetHistory function.
 * - FleetAnalysisOutput - The return type for the analyzeFleetHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const FleetAnalysisInputSchema = z.object({
  fleetId: z.string().describe('The ID of the vehicle to be analyzed.'),
  visitHistory: z
    .string()
    .describe('The complete maintenance visit history for the vehicle, in JSON format.'),
  analysisType: z.enum(['FULL', 'SUMMARY', 'RECURRING_ISSUES', 'DOWNTIME'])
    .describe('The specific type of analysis to perform.'),
});
export type FleetAnalysisInput = z.infer<typeof FleetAnalysisInputSchema>;

const FleetAnalysisOutputSchema = z.object({
  analysis: z
    .string()
    .describe('A detailed, comprehensive analysis of the vehicle\'s maintenance history. The analysis should be in Portuguese.'),
});
export type FleetAnalysisOutput = z.infer<typeof FleetAnalysisOutputSchema>;

export async function analyzeFleetHistory(
  input: FleetAnalysisInput
): Promise<FleetAnalysisOutput> {
  return fleetAnalysisFlow(input);
}

const basePromptText = `Você é um "Analista de Frota Sênior", um especialista em Planejamento e Controle de Manutenção (PCM) com vasta experiência em carretas. Sua tarefa é realizar uma auditoria do histórico de manutenção de um veículo específico e gerar um relatório técnico, detalhado e perspicaz em português.

O histórico de visitas está no formato JSON abaixo.

Veículo ID: {{{fleetId}}}
Histórico de Visitas:
{{{visitHistory}}}

Sua resposta DEVE ser formatada usando Markdown (títulos, negrito, listas). Baseie TODAS as suas conclusões estritamente nos dados fornecidos.`;


const fullAnalysisPrompt = ai.definePrompt({
  name: 'fleetFullAnalysisPrompt',
  input: {schema: FleetAnalysisInputSchema},
  output: {schema: FleetAnalysisOutputSchema},
  prompt: `${basePromptText}

### Análise Completa:

Realize uma auditoria completa e gere um relatório técnico com os seguintes tópicos:

#### 1. Resumo do Perfil de Manutenção
- Avalie o perfil geral do veículo. Ele é mais reativo (muitas corretivas) ou proativo (preventivas e preditivas dominam)?
- Comente sobre a frequência geral das visitas.

#### 2. Análise de Padrões e Recorrências
- Identifique problemas ou trocas de peças que se repetem. Há algum sistema do veículo (freios, suspensão, elétrico) que apresenta falhas constantes?
- Analise os tipos de ordem de serviço mais comuns para este veículo.

#### 3. Análise de Tempos de Parada (Downtime)
- Com base nos timestamps, comente sobre os tempos médios de fila e de manutenção. Existem gargalos evidentes?
- Destaque as visitas com os maiores tempos de parada e, se possível, aponte a causa.

#### 4. Recomendações Técnicas e Proativas
- Com base na análise, forneça de 2 a 3 recomendações claras e acionáveis para otimizar a manutenção deste veículo.
- Exemplo: "Recomendo uma inspeção detalhada do sistema de suspensão a cada 3 meses..."

#### 5. Alertas e Pontos de Atenção
- Aponte quaisquer anomalias ou observações críticas que um gerente de frota precise saber.
`,
});

const summaryAnalysisPrompt = ai.definePrompt({
  name: 'fleetSummaryAnalysisPrompt',
  input: {schema: FleetAnalysisInputSchema},
  output: {schema: FleetAnalysisOutputSchema},
  prompt: `${basePromptText}

### Foco da Análise: Resumo do Perfil de Manutenção

Gere um relatório focado APENAS nos seguintes pontos:
- Avalie o perfil geral do veículo (reativo vs. proativo).
- Comente sobre a frequência geral das visitas.
- Liste os tipos de ordem de serviço em ordem de frequência, indicando a quantidade de cada um.
`,
});

const recurringIssuesAnalysisPrompt = ai.definePrompt({
  name: 'fleetRecurringIssuesAnalysisPrompt',
  input: {schema: FleetAnalysisInputSchema},
  output: {schema: FleetAnalysisOutputSchema},
  prompt: `${basePromptText}

### Foco da Análise: Problemas Recorrentes

Gere um relatório focado APENAS nos seguintes pontos:
- Identifique problemas ou trocas de peças que se repetem.
- Especifique quais sistemas do veículo (freios, suspensão, elétrico) apresentam falhas constantes.
- Liste as peças mais substituídas para este veículo e a frequência.
`,
});

const downtimeAnalysisPrompt = ai.definePrompt({
  name: 'fleetDowntimeAnalysisPrompt',
  input: {schema: FleetAnalysisInputSchema},
  output: {schema: FleetAnalysisOutputSchema},
  prompt: `${basePromptText}

### Foco da Análise: Tempos de Parada (Downtime)

Gere um relatório focado APENAS nos seguintes pontos:
- Calcule e comente sobre os tempos médios de fila e de manutenção para este veículo.
- Compare os tempos deste veículo com os padrões da oficina, se possível.
- Destaque as visitas com os maiores tempos de parada e aponte a causa principal (ex: espera por peça, complexidade do serviço).
`,
});


const fleetAnalysisFlow = ai.defineFlow(
  {
    name: 'fleetAnalysisFlow',
    inputSchema: FleetAnalysisInputSchema,
    outputSchema: FleetAnalysisOutputSchema,
  },
  async input => {
    let promptToRun;
    switch (input.analysisType) {
      case 'SUMMARY':
        promptToRun = summaryAnalysisPrompt;
        break;
      case 'RECURRING_ISSUES':
        promptToRun = recurringIssuesAnalysisPrompt;
        break;
      case 'DOWNTIME':
        promptToRun = downtimeAnalysisPrompt;
        break;
      case 'FULL':
      default:
        promptToRun = fullAnalysisPrompt;
    }
    const {output} = await promptToRun(input);
    return output!;
  }
);
