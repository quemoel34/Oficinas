'use client';

import {useState, useEffect, useRef} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Bot, Loader2, User, FileText, Wrench, Package, Clock, AlertTriangle, MessageSquare, MapPin, History } from 'lucide-react';
import {type Fleet, type Visit} from '@/lib/types';
import {chatWithFleet} from '@/app/actions';
import {cn} from '@/lib/utils';

interface FleetChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleet: Fleet;
  visits: Visit[];
}

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

const initialOptions = [
    { text: 'Fazer um resumo geral do histórico', icon: FileText },
    { text: 'Listar todos os serviços realizados', icon: Wrench },
    { text: 'Listar todas as peças substituídas', icon: Package },
    { text: 'Analisar os tempos de parada (fila, manutenção)', icon: Clock },
    { text: 'Identificar problemas recorrentes', icon: AlertTriangle },
    { text: 'Analisar observações de chegada', icon: MessageSquare },
    { text: 'Listar oficinas e boxes visitados', icon: MapPin },
    { text: 'Detalhar a última visita', icon: History },
]

export function FleetChatDialog({open, onOpenChange, fleet, visits}: FleetChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [options, setOptions] = useState(initialOptions);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([
        {
          role: 'model',
          content: `Olá! Sou seu assistente de auditoria para a frota ${fleet.id}. Selecione uma opção abaixo para começar a análise.`,
        },
      ]);
      setOptions(initialOptions);
    }
  }, [open, fleet.id]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleOptionClick = async (question: string) => {
    if (isPending) return;

    const userMessage: ChatMessage = {role: 'user', content: question};
    setMessages(prev => [...prev, userMessage]);
    setIsPending(true);
    setOptions([]);

    try {
      const responseText = await chatWithFleet(
        {
          fleetId: fleet.id,
          visitHistory: JSON.stringify(visits),
          question
        }
      );
      const modelMessage: ChatMessage = {role: 'model', content: responseText};
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'model',
        content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsPending(false);
      setOptions(initialOptions);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] h-[80vh] max-h-[700px] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot /> Auditor de Frota: {fleet.id}
          </DialogTitle>
          <DialogDescription>
            Placa: {fleet.plate} | Transportadora: {fleet.carrier}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
           <div className="p-4 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={cn('flex items-start gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'model' && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                      'max-w-2xl rounded-lg px-4 py-2 whitespace-pre-wrap', 
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {msg.content}
                  </div>
                   {msg.role === 'user' && (
                     <Avatar className="w-8 h-8">
                       <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                     </Avatar>
                  )}
                </div>
              ))}
               {isPending && (
                <div className="flex items-start gap-3 justify-start">
                    <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    <div className="max-w-md rounded-lg px-4 py-2 bg-muted flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analisando...</span>
                    </div>
                </div>
               )}
            </div>
        </ScrollArea>
        <div className="p-4 border-t">
          {options.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.map((opt, index) => (
                <Button 
                    key={index}
                    variant="outline"
                    onClick={() => handleOptionClick(opt.text)}
                    className="justify-start text-left h-auto py-2"
                >
                    <opt.icon className="mr-2 h-4 w-4 shrink-0" />
                    {opt.text}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
