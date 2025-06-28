'use server';

/**
 * @fileOverview An AI agent that analyzes fleet visit data and generates a structured report.
 *
 * - generateAnalyticsReport - A function that generates the report.
 * - GenerateAnalyticsReportInput - The input type for the function.
 * - GenerateAnalyticsReportOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary-foreground))', 'hsl(var(--muted-foreground))', 'hsl(var(--destructive))', '#8884d8'];


const GenerateAnalyticsReportInputSchema = z.object({
  visitsJson: z.string().describe('A JSON string representing an array of visit objects to be analyzed.'),
});
export type GenerateAnalyticsReportInput = z.infer<typeof GenerateAnalyticsReportInputSchema>;

const GenerateAnalyticsReportOutputSchema = z.object({
  reportTitle: z.string().describe('A concise and descriptive title for the report.'),
  summary: z.string().describe('A paragraph summarizing the key findings from the data. Should be in Portuguese.'),
  keyMetrics: z.object({
    totalVisits: z.number().describe('The total number of visits in the dataset.'),
    averageQueueTime: z.string().describe('The average time vehicles spent in the queue (from arrival to maintenance start), formatted as "X days, Y hours, Z minutes". Should be in Portuguese.'),
    averageMaintenanceTime: z.string().describe('The average time vehicles spent in maintenance (from maintenance start to finish), formatted as "X days, Y hours, Z minutes". Should be in Portuguese.'),
  }),
  visitsByOrderType: z.array(z.object({
    name: z.string(),
    value: z.number(),
    fill: z.string(),
  })).describe('An array of objects for a pie chart, showing the count of visits for each order type.'),
  visitsByWorkshop: z.array(z.object({
    name: z.string(),
    value: z.number(),
    fill: z.string(),
  })).describe('An array of objects for a bar chart, showing the count of visits for each workshop.'),
  insights: z.array(z.string()).describe('Up to 3 bullet-point analytical insights, anomalies, or noteworthy patterns found in the data. Should be in Portuguese.'),
});
export type GenerateAnalyticsReportOutput = z.infer<typeof GenerateAnalyticsReportOutputSchema>;

export async function generateAnalyticsReport(input: GenerateAnalyticsReportInput): Promise<GenerateAnalyticsReportOutput> {
  const result = await generateAnalyticsReportFlow(input);
  
  // Assign colors to chart data - AI can't do this reliably
  if (result.visitsByOrderType) {
    result.visitsByOrderType.forEach((item, index) => {
      item.fill = COLORS[index % COLORS.length];
    });
  }
  if (result.visitsByWorkshop) {
     result.visitsByWorkshop.forEach((item, index) => {
      item.fill = COLORS[index % COLORS.length];
    });
  }
  
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateAnalyticsReportPrompt',
  input: { schema: GenerateAnalyticsReportInputSchema },
  output: { schema: GenerateAnalyticsReportOutputSchema },
  prompt: `Você é um analista de dados especialista em manutenção de frotas. Sua tarefa é analisar o JSON de visitas de veículos fornecido e gerar um relatório analítico estruturado.

Sempre responda em português do Brasil.

Analise os seguintes dados:
{{{visitsJson}}}

Sua análise deve ser completa e fornecer os seguintes componentes no formato JSON de saída:
1.  **reportTitle**: Um título claro, como "Relatório Analítico de Visitas de Frota".
2.  **summary**: Um parágrafo resumindo as principais descobertas.
3.  **keyMetrics**:
    - Conte o número total de visitas.
    - Calcule o tempo médio que os veículos passaram na fila (de arrivalTimestamp até maintenanceStartTimestamp).
    - Calcule o tempo médio de manutenção (de maintenanceStartTimestamp até finishTimestamp).
    - Formate as durações médias de forma legível (ex: "1 dia, 4 horas, 30 minutos"). Se o tempo for zero, retorne "0 minutos".
4.  **visitsByOrderType**: Agrupe as visitas por 'orderType' e conte o número de ocorrências de cada tipo.
5.  **visitsByWorkshop**: Agrupe as visitas por 'workshop' e conte o número de ocorrências em cada oficina.
6.  **insights**: Identifique até 3 padrões, anomalias ou insights acionáveis a partir dos dados. Por exemplo, uma oficina com tempos de manutenção muito longos, um tipo de ordem que é muito frequente, etc.

Preste muita atenção ao schema de saída e forneça todos os campos necessários. Os timestamps estão em milissegundos Unix.
`,
});

const generateAnalyticsReportFlow = ai.defineFlow(
  {
    name: 'generateAnalyticsReportFlow',
    inputSchema: GenerateAnalyticsReportInputSchema,
    outputSchema: GenerateAnalyticsReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
