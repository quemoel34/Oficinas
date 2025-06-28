'use client'

import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileDown, Printer, Sparkles, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ChartConfig, ChartContainer } from './ui/chart';

export interface ReportData {
  reportTitle: string;
  summary: string;
  keyMetrics: {
    totalVisits: number;
    averageQueueTime: string;
    averageMaintenanceTime: string;
  };
  visitsByOrderType: { name: string; value: number; fill: string; }[];
  visitsByWorkshop: { name: string; value: number; fill: string; }[];
  insights: string[];
}

interface ReportDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: ReportData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function ReportDisplayDialog({ open, onOpenChange, reportData }: ReportDisplayDialogProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    const reportElement = reportRef.current;
    if (!reportElement) return;

    // Temporarily make all text black for better PDF readability
    reportElement.classList.add('pdf-export-text');
    
    const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
    });

    reportElement.classList.remove('pdf-export-text');

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`relatorio-analitico-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const chartConfigByOrderType = reportData.visitsByOrderType.reduce((acc, item) => {
    acc[item.name] = { label: item.name };
    return acc;
  }, {} as ChartConfig);

  const chartConfigByWorkshop = reportData.visitsByWorkshop.reduce((acc, item) => {
    acc[item.name] = { label: item.name };
    return acc;
  }, {} as ChartConfig);
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{reportData.reportTitle}</DialogTitle>
          <DialogDescription>
            Relatório analítico gerado por IA com base nos filtros selecionados.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4" ref={reportRef}>
          <style>{`.pdf-export-text, .pdf-export-text * { color: #000 !important; }`}</style>
          <div className="space-y-6 p-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumo Executivo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{reportData.summary}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card>
                    <CardHeader><CardTitle className="text-lg">Total de Visitas</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold md:text-3xl">{reportData.keyMetrics.totalVisits}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="text-lg">T. Médio em Fila</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold md:text-3xl">{reportData.keyMetrics.averageQueueTime}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="text-lg">T. Médio de Manutenção</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold md:text-3xl">{reportData.keyMetrics.averageMaintenanceTime}</p></CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Visitas por Tipo de Ordem</CardTitle></CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfigByOrderType} className="h-[250px] w-full">
                        <PieChart>
                          <Pie data={reportData.visitsByOrderType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {reportData.visitsByOrderType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Visitas por Oficina</CardTitle></CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfigByWorkshop} className="h-[250px] w-full">
                        <BarChart data={reportData.visitsByWorkshop} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={80} />
                          <Tooltip />
                          <Bar dataKey="value" name="Visitas" fill="#8884d8" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                </Card>
            </div>

             <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Insights da IA</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 list-disc pl-5">
                    {reportData.insights.map((insight, index) => (
                        <li key={index} className="text-sm text-foreground">{insight}</li>
                    ))}
                </ul>
              </CardContent>
            </Card>

          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleDownloadPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Baixar como PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
