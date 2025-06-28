'use server';

/**
 * @fileOverview An AI agent that proactively suggests maintenance tasks for fleet vehicles.
 *
 * - proactiveMaintenanceSuggestions - A function that generates maintenance suggestions.
 * - ProactiveMaintenanceSuggestionsInput - The input type for the proactiveMaintenanceSuggestions function.
 * - ProactiveMaintenanceSuggestionsOutput - The return type for the proactiveMaintenanceSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProactiveMaintenanceSuggestionsInputSchema = z.object({
  fleetData: z
    .string()
    .describe('Dados históricos e atuais de manutenção da frota e características operacionais do veículo.'),
  vehicleId: z.string().describe('O ID do veículo para o qual as sugestões serão geradas.'),
});
export type ProactiveMaintenanceSuggestionsInput = z.infer<typeof ProactiveMaintenanceSuggestionsInputSchema>;

const ProactiveMaintenanceSuggestionsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe('Sugestões de manutenção proativa para o veículo, com base em dados históricos e condições de operação. A resposta deve ser em português do Brasil.'),
});
export type ProactiveMaintenanceSuggestionsOutput = z.infer<typeof ProactiveMaintenanceSuggestionsOutputSchema>;

export async function proactiveMaintenanceSuggestions(
  input: ProactiveMaintenanceSuggestionsInput
): Promise<ProactiveMaintenanceSuggestionsOutput> {
  return proactiveMaintenanceSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'proactiveMaintenanceSuggestionsPrompt',
  input: {schema: ProactiveMaintenanceSuggestionsInputSchema},
  output: {schema: ProactiveMaintenanceSuggestionsOutputSchema},
  prompt: `Você é um especialista em manutenção de frotas. Com base nos dados históricos da frota e nas condições operacionais atuais para o veículo de ID {{{vehicleId}}}, forneça sugestões de manutenção proativa para prevenir quebras e otimizar os cronogramas de manutenção.

A sua resposta deve ser em Português do Brasil.

Dados da Frota:
{{{fleetData}}}

Sugestões:`,
});

const proactiveMaintenanceSuggestionsFlow = ai.defineFlow(
  {
    name: 'proactiveMaintenanceSuggestionsFlow',
    inputSchema: ProactiveMaintenanceSuggestionsInputSchema,
    outputSchema: ProactiveMaintenanceSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
