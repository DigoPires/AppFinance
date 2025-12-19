import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { insertEarningSchema, updateEarningSchema, type Earning } from "@shared/schema";

const formSchema = z.object({
  date: z.date({ required_error: "Data é obrigatória" }),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().refine(
    (val) => {
      const num = parseFloat(val.replace(",", "."));
      return !isNaN(num) && num > 0 && num <= 1000000000;
    },
    "Valor deve ser maior que zero e no máximo 1 bilhão"
  ),
  client: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface EarningFormProps {
  earning?: Earning | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EarningForm({ earning, onSuccess, onCancel }: EarningFormProps) {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: earning ? new Date(earning.date + 'T12:00:00') : new Date(),
      description: earning?.description || "",
      amount: earning ? String(earning.amount).replace(".", ",") : "",
      client: earning?.client || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const token = await getAccessToken();
      const response = await fetch("/api/earnings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`,
          amount: String(data.amount).replace(",", "."),
          client: data.client || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar receita");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Receita criada",
        description: "A receita foi adicionada com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível criar a receita.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const token = await getAccessToken();
      const response = await fetch(`/api/earnings/${earning!.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`,
          amount: String(data.amount).replace(",", "."),
          client: data.client || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar receita");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Receita atualizada",
        description: "A receita foi atualizada com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar a receita.",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    setIsSubmitting(true);
    if (earning) {
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
                      onSelect={field.onChange}
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
            name="amount"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Valor (R$)</FormLabel>
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
                      data-testid="input-amount"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex: Venda de produto, Freelance..."
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="client"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente (Opcional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Ex: Empresa XYZ, João Silva..."
                  data-testid="input-client"
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
            {earning ? "Salvar Alterações" : "Adicionar Receita"}
          </Button>
        </div>
      </form>
    </Form>
  );
}