import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { queryClient } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ExpenseForm } from "@/components/expense-form";
import type { Expense } from "@shared/schema";
import { CATEGORIES } from "@shared/schema";

interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatCurrency(value: string | number) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue);
}

function ExpenseRow({
  expense,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`row-expense-${expense.id}`}
    >
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium" data-testid={`text-expense-description-${expense.id}`}>
              {expense.description}
            </span>
            <Badge variant="secondary" className="text-xs">
              {expense.category}
            </Badge>
            {expense.isFixed && (
              <Badge variant="outline" className="text-xs">
                Fixo
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{(() => {
              const [year, month, day] = expense.date.split('-');
              return `${day}/${month}/${year}`;
            })()}</span>
            <span>-</span>
            <span>{expense.paymentMethod}</span>
            {expense.location && (
              <>
                <span>-</span>
                <span>{expense.location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-right">
          {expense.quantity > 1 && (
            <div className="text-xs text-muted-foreground">
              {expense.quantity}x {formatCurrency(expense.unitValue)}
            </div>
          )}
          <div className="font-mono font-semibold" data-testid={`text-expense-total-${expense.id}`}>
            {formatCurrency(expense.totalValue)}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            data-testid={`button-edit-expense-${expense.id}`}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            data-testid={`button-delete-expense-${expense.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpenseCard({
  expense,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card data-testid={`card-expense-${expense.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{expense.description}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {expense.category}
              </Badge>
              {expense.isFixed && (
                <Badge variant="outline" className="text-xs">
                  Fixo
                </Badge>
              )}
            </div>
          </div>
          <div className="font-mono font-semibold">
            {formatCurrency(expense.totalValue)}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span>{(() => {
              const [year, month, day] = expense.date.split('-');
              return `${day}/${month}/${year}`;
            })()}</span>
            <span>-</span>
            <span>{expense.paymentMethod}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExpensesPage() {
  const { getAccessToken, user } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const limit = 10;

  const { data, isLoading, isFetching } = useQuery<ExpensesResponse>({
    queryKey: ["/api/expenses", { page, search, category: categoryFilter, limit, userId: user?.id }],
    queryFn: async () => {
      const token = await getAccessToken();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);

      const response = await fetch(`/api/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken();
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete expense");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/stats"] });
      toast({
        title: "Despesa excluída",
        description: "A despesa foi removida com sucesso.",
      });
      setDeletingExpense(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a despesa.",
      });
    },
  });

  const handleOpenForm = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  const handleFormSuccess = () => {
    handleCloseForm();
    queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    queryClient.invalidateQueries({ queryKey: ["/api/expenses/stats"] });
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setPage(1);
  };

  const hasFilters = search || categoryFilter;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-expenses-title">
            Despesas
          </h1>
          <p className="text-muted-foreground">
            Gerencie todas as suas despesas
          </p>
        </div>
        <Button onClick={() => handleOpenForm()} data-testid="button-add-expense">
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar despesas..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
            {isFetching && !isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : data?.expenses && data.expenses.length > 0 ? (
            <>
              <div className="hidden sm:block">
                {data.expenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onEdit={() => handleOpenForm(expense)}
                    onDelete={() => setDeletingExpense(expense)}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:hidden">
                {data.expenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onEdit={() => handleOpenForm(expense)}
                    onDelete={() => setDeletingExpense(expense)}
                  />
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Receipt className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-medium">Nenhuma despesa encontrada</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFilters
                  ? "Tente ajustar os filtros de busca"
                  : "Comece adicionando sua primeira despesa"}
              </p>
              {!hasFilters && (
                <Button className="mt-4" onClick={() => handleOpenForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Despesa
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <ExpenseForm
            expense={editingExpense}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingExpense?.description}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingExpense && deleteMutation.mutate(deletingExpense.id.toString())}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
