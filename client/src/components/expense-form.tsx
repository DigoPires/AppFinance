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
import { queryClient } from "@/lib/queryClient";
import { CATEGORIES, PAYMENT_METHODS, type Expense } from "@shared/schema";

const formSchema = z.object({
  date: z.date().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  unitValue: z.string().refine(
    (val) => {
      const num = parseFloat(val.replace(",", "."));
      return !isNaN(num) && num > 0 && num <= 10000000; // 10 milhões
    },
    "Valor deve ser maior que zero e no máximo 10 milhões"
  ),
  quantity: z.number().int().min(1, "Quantidade deve ser pelo menos 1"),
  paymentMethod: z.string().min(1, "Forma de pagamento é obrigatória"),
  account: z.string().optional(),
  location: z.string().optional(),
  isFixed: z.boolean().default(false),
  paymentDate: z.date().optional(),
  isPaid: z.boolean().default(false),
  installments: z.number().int().min(1).max(60).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // Se não for fixa, data é obrigatória
  if (!data.isFixed && !data.date) {
    return false;
  }
  return true;
}, {
  message: "Data é obrigatória para despesas não fixas",
  path: ["date"],
});

type FormData = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: Expense | null;
  initialData?: Expense | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function ExpenseForm({ expense, initialData, onSuccess, onCancel }: ExpenseFormProps) {
  const { getAccessToken, user } = useAuth();
  const { toast } = useToast();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);

  const dataSource = initialData || expense;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: dataSource ? new Date(dataSource.date + 'T12:00:00') : new Date(),
      category: dataSource?.category || "",
      description: dataSource?.description || "",
      unitValue: dataSource ? String(dataSource.unitValue).replace(".", ",") : "",
      quantity: dataSource?.quantity || 1,
      paymentMethod: dataSource?.paymentMethod || "",
      account: dataSource?.account || "",
      location: dataSource?.location || "",
      isFixed: dataSource?.isFixed || false,
      paymentDate: dataSource?.paymentDate ? new Date(dataSource.paymentDate + 'T12:00:00') : (dataSource?.isPaid ? new Date() : undefined),
      isPaid: dataSource?.isPaid || false,
      installments: dataSource?.installments || undefined,
      notes: dataSource?.notes || "",
    },
  });

  const unitValue = form.watch("unitValue");
  const quantity = form.watch("quantity");
  const description = form.watch("description");
  const isFixed = form.watch("isFixed");
  const isPaid = form.watch("isPaid");
  const paymentMethod = form.watch("paymentMethod");

  // Quando marcar como pago, definir data de pagamento automaticamente se estiver vazia
  useEffect(() => {
    if (isPaid && !form.getValues("paymentDate")) {
      form.setValue("paymentDate", new Date());
    }
  }, [isPaid, form]);

  // Quando desabilitar despesa fixa, resetar campos relacionados ao pagamento
  useEffect(() => {
    if (!isFixed) {
      form.setValue("isPaid", false);
      form.setValue("paymentDate", undefined);
    }
  }, [isFixed, form]);

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
      
      const dateToUse = data.isFixed && !expense ? new Date() : data.date!;
      const paymentDateToUse = data.isPaid ? (data.paymentDate || new Date()) : data.paymentDate;
      
      // Despesa normal (mesmo com parcelas, criamos apenas uma entrada)
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          date: `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}-${String(dateToUse.getDate()).padStart(2, '0')}`,
          paymentDate: paymentDateToUse ? `${paymentDateToUse.getFullYear()}-${String(paymentDateToUse.getMonth() + 1).padStart(2, '0')}-${String(paymentDateToUse.getDate()).padStart(2, '0')}T12:00:00` : undefined,
          unitValue: String(data.unitValue).replace(",", "."),
          isPaid: Boolean(data.isPaid),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create expense");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/stats"] });
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
          date: `${(data.date || new Date()).getFullYear()}-${String((data.date || new Date()).getMonth() + 1).padStart(2, '0')}-${String((data.date || new Date()).getDate()).padStart(2, '0')}`,
          paymentDate: data.paymentDate ? `${data.paymentDate.getFullYear()}-${String(data.paymentDate.getMonth() + 1).padStart(2, '0')}-${String(data.paymentDate.getDate()).padStart(2, '0')}T12:00:00` : undefined,
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
      queryClient.invalidateQueries({ queryKey: ["expenses"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/stats"] });
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
        <FormField
          control={form.control}
          name="isFixed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm sm:text-base">Despesa Fixa</FormLabel>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Marque se esta despesa se repete mensalmente
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  data-testid="switch-is-fixed"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {!isFixed && (
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
          )}
          
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

          <FormItem>
            <FormLabel>Valor Total</FormLabel>
            <div
              className="flex h-9 items-center rounded-md border bg-muted px-3 font-mono font-semibold text-muted-foreground"
              data-testid="text-total-value"
            >
              {formatCurrency(totalValue)}
            </div>
          </FormItem>
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

        {paymentMethod?.toLowerCase().includes('crédito') && (
          <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Parcelas (opcional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={60}
                    placeholder="1"
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    data-testid="input-installments"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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

        {isFixed && (
          <FormField
            control={form.control}
            name="isPaid"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                <div className="space-y-0.5">
                <FormLabel className="text-sm sm:text-base">Pago</FormLabel>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Marque se esta despesa já foi paga
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  data-testid="switch-is-paid"
                  disabled={!isFixed}
                />
              </FormControl>
            </FormItem>
          )}
        />
        )}

        {isPaid && (
          <>
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Pagamento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-payment-date-picker"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione a data de pagamento</span>
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
                          field.onChange(d);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

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
