import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CATEGORIES, PAYMENT_METHODS, type Expense } from "@shared/schema";

const formSchema = z.object({
  date: z.date({ required_error: "Data é obrigatória" }),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  unitValue: z.string().refine(
    (val) => {
      const num = parseFloat(val.replace(",", "."));
      return !isNaN(num) && num > 0 && num <= 1000000000;
    },
    "Valor deve ser maior que zero e no máximo 1 bilhão"
  ),
  quantity: z.number().int().min(1, "Quantidade deve ser pelo menos 1"),
  paymentMethod: z.string().min(1, "Forma de pagamento é obrigatória"),
  account: z.string().optional(),
  location: z.string().optional(),
  isFixed: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: Expense | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const { getAccessToken, user } = useAuth();
  const { toast } = useToast();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: expense ? new Date(expense.date + 'T12:00:00') : new Date(),
      category: expense?.category || "",
      description: expense?.description || "",
      unitValue: expense ? String(expense.unitValue).replace(".", ",") : "",
      quantity: expense?.quantity || 1,
      paymentMethod: expense?.paymentMethod || "",
      account: expense?.account || "",
      location: expense?.location || "",
      isFixed: expense?.isFixed || false,
      notes: expense?.notes || "",
    },
  });

  const unitValue = form.watch("unitValue");
  const quantity = form.watch("quantity");
  const description = form.watch("description");

  const totalValue =
    parseFloat(String(unitValue).replace(",", ".") || "0") * (quantity || 1);

  const { data: suggestions } = useQuery<string[]>({
    queryKey: ["/api/expenses/autocomplete", description, user?.id],
    queryFn: async () => {
      if (!description || description.length < 2) return [];
      const token = await getAccessToken();
      const response = await fetch(
        `/api/expenses/autocomplete?q=${encodeURIComponent(description)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: description?.length >= 2 && !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const token = await getAccessToken();
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`,
          unitValue: String(data.unitValue).replace(",", "."),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create expense");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Despesa criada",
        description: "A despesa foi adicionada com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível criar a despesa.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const token = await getAccessToken();
      const response = await fetch(`/api/expenses/${expense!.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`,
          unitValue: String(data.unitValue).replace(",", "."),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update expense");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Despesa atualizada",
        description: "A despesa foi atualizada com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar a despesa.",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (expense) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-date-picker"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (!date) return field.onChange(undefined);
                        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                        field.onChange(d);  // Data limpa: só Y-M-D + 12:00:00
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    ref={descriptionRef}
                    placeholder="Ex: Almoço, Uber, Supermercado..."
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    data-testid="input-description"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {suggestions.map((suggestion, index) => (
                              <CommandItem
                                key={index}
                                onSelect={() => {
                                  form.setValue("description", suggestion);
                                  setShowSuggestions(false);
                                }}
                              >
                                {suggestion}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="unitValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Unitário</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      {...field}
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      className="pl-10 font-mono"
                      data-testid="input-unit-value"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    data-testid="input-quantity"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-2">
            <FormLabel>Valor Total</FormLabel>
            <div
              className="flex h-9 items-center rounded-md border bg-muted px-3 font-mono font-semibold text-muted-foreground"
              data-testid="text-total-value"
            >
              {formatCurrency(totalValue)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forma de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conta (opcional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex: Nubank, Itaú..."
                    data-testid="input-account"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local (opcional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex: Shopping, Centro..."
                  data-testid="input-location"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isFixed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Despesa Fixa</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Marque se esta despesa se repete mensalmente
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-is-fixed"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Adicione notas sobre esta despesa..."
                  className="resize-none"
                  rows={3}
                  data-testid="textarea-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-submit">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {expense ? "Salvar Alterações" : "Adicionar Despesa"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
