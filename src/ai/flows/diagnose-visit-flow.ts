'use server';

/**
 * @fileOverview An AI agent that diagnoses vehicle issues from notes and photos.
 *
 * - diagnoseVisit - A function that handles the visit diagnosis process.
 * - DiagnoseVisitInput - The input type for the diagnoseVisit function.
 * - DiagnoseVisitOutput - The return type for the diagnoseVisit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {OrderType} from '@/lib/types';

const orderTypes: [OrderType, ...OrderType[]] = ['Calibragem', 'Inspeção', 'Corretiva', 'Preventiva', 'Preditiva'];

const DiagnoseVisitInputSchema = z.object({
  notes: z.string().describe('The user-provided notes describing the vehicle issue.'),
  imageUrl: z.string().optional().describe(
    "An optional photo of the vehicle issue, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type DiagnoseVisitInput = z.infer<typeof DiagnoseVisitInputSchema>;

const DiagnoseVisitOutputSchema = z.object({
  orderType: z.enum(orderTypes).describe('The most likely type of maintenance order based on the issue.'),
  suggestedPart: z.string().describe('The specific part that is likely needed for the repair. Should be in capital letters.'),
  suggestedService: z.string().describe('A brief description of the suggested repair or service to be performed. Should be in capital letters.'),
});
export type DiagnoseVisitOutput = z.infer<typeof DiagnoseVisitOutputSchema>;

export async function diagnoseVisit(input: DiagnoseVisitInput): Promise<DiagnoseVisitOutput> {
  return diagnoseVisitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseVisitPrompt',
  input: {schema: DiagnoseVisitInputSchema},
  output: {schema: DiagnoseVisitOutputSchema},
  prompt: `You are an expert fleet mechanic. Your task is to analyze a user's description of a vehicle problem and an optional photo to pre-fill a service order.

Based on the notes and the image provided, determine the most appropriate "orderType", suggest the most likely "suggestedPart" needed, and formulate a concise "suggestedService" description.

Your response must be in JSON format and adhere to the specified output schema.

Problem Description:
{{{notes}}}

{{#if imageUrl}}
Problem Photo:
{{media url=imageUrl}}
{{/if}}
`,
});

const diagnoseVisitFlow = ai.defineFlow(
  {
    name: 'diagnoseVisitFlow',
    inputSchema: DiagnoseVisitInputSchema,
    outputSchema: DiagnoseVisitOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
