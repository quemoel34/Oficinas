'use client';

import {useState, useEffect, useRef} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Bot, Loader2, Send, Sparkles, User} from 'lucide-react';
import {type Fleet, type Visit} from '@/lib/types';
import {askAssistantAction} from '@/app/actions';
import type {Message} from 'genkit';
import {cn} from '@/lib/utils';
import { getVisits, getFleets } from '@/lib/data-manager';


interface AssistantChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssistantChatDialog({open, onOpenChange}: AssistantChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: [{text: `Olá! Sou a IA Carretômetro, sua assistente especialista em manutenção. Como posso ajudar a analisar os dados da sua frota hoje? Pergunte-me sobre históricos, tempos de parada, peças utilizadas e mais.`}],
        },
      ]);
      setInput('');
    }
  }, [open, messages.length]);
  
  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage: Message = {role: 'user', content: [{text: input}]};
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsPending(true);

    try {
      // Fetch latest data on every interaction
      const allVisits = getVisits();
      const allFleets = getFleets();

      const responseText = await askAssistantAction(
        newMessages,
        JSON.stringify(allVisits),
        JSON.stringify(allFleets)
      );
      const modelMessage: Message = {role: 'model', content: [{text: responseText}]};
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'model',
        content: [{text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.'}],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] h-[80vh] max-h-[700px] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" /> Assistente IA Carretômetro
          </DialogTitle>
          <DialogDescription>
            Faça perguntas sobre a operação para obter respostas e insights.
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
                    {msg.content[0].text}
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
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Quantos veículos estão em manutenção?"
              disabled={isPending}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isPending}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
