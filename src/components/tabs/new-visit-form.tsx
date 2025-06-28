'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Camera, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { type Visit, type Workshop, type Fleet, type OrderType } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { getFleets } from '@/lib/data-manager';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '@/lib/utils';

const workshopOptions: Workshop[] = ['Monte Líbano', 'Vale das Carretas', 'CMC'];
const orderTypeOptions: OrderType[] = ['Calibragem', 'Inspeção', 'Corretiva', 'Preventiva', 'Preditiva'];

const formSchema = z.object({
  fleetId: z.string().min(1, { message: 'O número da frota é obrigatório.' }),
  plate: z.string().min(1, { message: 'A placa/tag é obrigatória.' }),
  carrier: z.string().min(1, { message: 'A transportadora é obrigatória.' }),
  orderType: z.array(z.string()).refine((value) => value.length > 0, {
    message: 'Você deve selecionar pelo menos um tipo de ordem.',
  }),
  workshop: z.enum(workshopOptions, {
    required_error: 'A oficina é obrigatória.',
  }),
  arrivalTimestamp: z.string().min(1, { message: 'A data de chegada é obrigatória.' }),
  notes: z.string().optional(),
  imageUrl: z.any().optional(),
});

interface NewVisitFormProps {
  onAddVisit: (visit: Omit<Visit, 'id' | 'equipmentType' | 'createdBy' | 'createdAt'> & { carrier: string }) => void;
}

// Helper to get local date time as string for input type="datetime-local"
const toLocalISOString = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function NewVisitForm({ onAddVisit }: NewVisitFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);

  // Autocomplete state
  const [allFleets, setAllFleets] = useState<Fleet[]>([]);
  const [suggestions, setSuggestions] = useState<Fleet[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  useEffect(() => {
    setAllFleets(getFleets());
  }, []);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fleetId: '',
      plate: '',
      carrier: '',
      orderType: [],
      workshop: undefined,
      arrivalTimestamp: toLocalISOString(new Date()),
      notes: '',
      imageUrl: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newVisit: Omit<Visit, 'id' | 'equipmentType' | 'createdBy' | 'createdAt'> & { carrier: string } = {
      ...values,
      fleetId: values.fleetId.toUpperCase(),
      plate: values.plate.toUpperCase(),
      carrier: values.carrier.toUpperCase(),
      orderType: values.orderType as OrderType[],
      arrivalTimestamp: new Date(values.arrivalTimestamp).getTime(),
      status: 'Em Fila',
      imageUrl: preview || undefined,
      serviceHistory: [],
    };

    onAddVisit(newVisit);

    toast({
      title: 'Visita Registrada com Sucesso!',
      description: `A frota ${values.fleetId} foi registrada com status "Em Fila".`,
    });
    form.reset({
      ...form.getValues(),
      fleetId: '',
      plate: '',
      notes: '',
      orderType: [],
      imageUrl: undefined,
      arrivalTimestamp: toLocalISOString(new Date()),
    });
    setPreview(null);
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('imageUrl', file);
    }
  };

  const handleFleetIdChange = (value: string) => {
    const upperValue = value.toUpperCase();
    form.setValue('fleetId', upperValue);

    if (upperValue) {
      const filteredFleets = allFleets.filter(fleet => 
        fleet.id.toLowerCase().startsWith(upperValue.toLowerCase())
      );
      setSuggestions(filteredFleets);
      setIsSuggestionsOpen(filteredFleets.length > 0);
    } else {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
    }
  };

  const handleSuggestionClick = (fleet: Fleet) => {
    form.setValue('fleetId', fleet.id);
    form.setValue('plate', fleet.plate);
    form.setValue('carrier', fleet.carrier);
    setSuggestions([]);
    setIsSuggestionsOpen(false);
  };


  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle>Cadastro de Nova Visita</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="fleetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Frota</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="Ex: F1234"
                          {...field}
                          onChange={(e) => handleFleetIdChange(e.target.value)}
                          onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 150)}
                          autoComplete="off"
                          className="uppercase"
                        />
                      </FormControl>
                      {isSuggestionsOpen && suggestions.length > 0 && (
                        <div className="absolute z-10 w-full bg-background border rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                          {suggestions.map((fleet) => (
                            <div
                              key={fleet.id}
                              className="p-2 hover:bg-accent cursor-pointer"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSuggestionClick(fleet);
                              }}
                            >
                              <p className="font-semibold">{fleet.id}</p>
                              <p className="text-xs text-muted-foreground">{fleet.plate} &bull; {fleet.carrier}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa / Tag</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: ABC-1D23"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transportadora</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Trans-Veloz"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="workshop"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oficina</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a oficina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Monte Líbano">Monte Líbano</SelectItem>
                        <SelectItem value="Vale das Carretas">Vale das Carretas</SelectItem>
                        <SelectItem value="CMC">CMC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="arrivalTimestamp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e Hora de Chegada</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
               <FormField
                control={form.control}
                name="orderType"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Tipo de Ordem</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value?.length && "text-muted-foreground")}>
                            {field.value?.length
                              ? field.value.join(', ')
                              : "Selecione um ou mais tipos"}
                          </Button>
                        </FormControl>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                        {orderTypeOptions.map((item) => (
                          <DropdownMenuCheckboxItem
                            key={item}
                            checked={field.value?.includes(item)}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              return checked
                                ? field.onChange([...currentValues, item])
                                : field.onChange(
                                    currentValues.filter(
                                      (value) => value !== item
                                    )
                                  );
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {item}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem className="md:col-span-3">
                <FormLabel>Foto do Veículo</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    <Button asChild variant="outline">
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <Camera className="mr-2 h-4 w-4" />
                        Tirar/Enviar Foto
                      </label>
                    </Button>
                    <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    {preview && (
                       <Image
                          src={preview}
                          alt="Pré-visualização da foto"
                          width={80}
                          height={80}
                          className="rounded-md object-cover"
                        />
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o problema ou serviço necessário..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={user?.role === 'VIEWER'}>
                <Save className="mr-2 h-4 w-4" />
                Registrar Visita
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
