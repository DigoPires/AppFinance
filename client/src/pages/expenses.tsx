import { useState, useEffect } from "react";
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
  Check,
  CalendarIcon,
  Copy,
  ArrowUpDown,
  DollarSign,
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
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ExpenseForm } from "@/components/expense-form";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { ExpenseWithInstallments, Expense } from "@shared/schema";
import { CATEGORIES } from "@shared/schema";

interface ExpensesResponse {
  expenses: ExpenseWithInstallments[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ExpenseStats {
  totalSpent: number;
  monthlySpent: number;
  fixedExpenses: number;
  expenseCount: number;
  categoryBreakdown: Record<string, number>;
  monthlyIncome: number;
  incomeCount: number;
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
  onMarkPaid,
  onDuplicate,
}: {
  expense: ExpenseWithInstallments;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  onDuplicate: () => void;
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
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="font-medium text-sm sm:text-base truncate" data-testid={`text-expense-description-${expense.id}`}>
              {expense.displayDescription || expense.description}
            </span>
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {expense.category}
            </Badge>
            {expense.isFixed && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Fixo
              </Badge>
            )}
            {expense.installments && expense.installments > 1 && (
              <Badge variant="default" className="text-xs px-1 py-0">
                {expense.currentInstallment}/{expense.totalInstallments}x
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>{(() => {
              const dateToShow = expense.isFixed && !expense.isPaid ? 'Pendente' : (expense.paymentDate || expense.date);
              if (dateToShow === 'Pendente') return 'Pendente';
              const [year, month, day] = dateToShow.split('-');
              return `${day}/${month}/${year}`;
            })()}</span>
            <span>-</span>
            <span className="truncate">{expense.paymentMethod}</span>
            {expense.location && (
              <>
                <span className="hidden sm:inline">-</span>
                <span className="truncate hidden sm:inline">{expense.location}</span>
              </>
            )}
            {expense.isFixed && expense.paymentDate && expense.paymentDate !== expense.date && (
              <>
                <span className="hidden sm:inline">-</span>
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  Registrado em {(() => {
                    const [year, month, day] = expense.date.split('-');
                    return `${day}/${month}/${year}`;
                  })()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="text-right sm:text-left order-2 sm:order-1">
          {expense.quantity > 1 && (
            <div className="text-xs text-muted-foreground">
              {expense.quantity}x {formatCurrency(expense.unitValue)}
            </div>
          )}
          {expense.installments && expense.installments > 1 && (
            <div className="text-xs text-muted-foreground">
              Parcela {expense.currentInstallment} de {expense.totalInstallments}
            </div>
          )}
          <div className="font-mono font-semibold text-sm sm:text-base" data-testid={`text-expense-total-${expense.id}`}>
            {expense.installments && expense.installments > 1 
              ? formatCurrency(expense.currentInstallmentValue || 0)
              : formatCurrency(expense.totalValue)
            }
          </div>
        </div>

        <div className="flex items-center gap-1 order-1 sm:order-2">
          {expense.isFixed && expense.isPaid ? (
            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 text-xs px-2 py-1">
              Pago
            </Badge>
          ) : expense.isFixed && !expense.isPaid ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkPaid}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 px-2 text-xs"
              title="Marcar como pago"
              data-testid={`button-mark-paid-expense-${expense.id}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Data Pagamento</span>
              <span className="sm:hidden">Data Pag.</span>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            className="h-7 w-7 p-0"
            title="Duplicar despesa"
            data-testid={`button-duplicate-expense-${expense.id}`}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 w-7 p-0"
            data-testid={`button-edit-expense-${expense.id}`}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-7 w-7 p-0"
            data-testid={`button-delete-expense-${expense.id}`}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
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
  onMarkPaid,
  onDuplicate,
}: {
  expense: ExpenseWithInstallments;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  onDuplicate: () => void;
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
              {expense.installments && expense.installments > 1 && (
                <Badge variant="default" className="text-xs">
                  {expense.currentInstallment}/{expense.totalInstallments}x
                </Badge>
              )}
            </div>
          </div>
          <div className="font-mono font-semibold">
            {expense.installments && expense.installments > 1 
              ? formatCurrency(expense.currentInstallmentValue || 0)
              : formatCurrency(expense.totalValue)
            }
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span>{(() => {
              const dateToShow = expense.isFixed && !expense.isPaid ? 'Pendente' : (expense.paymentDate || expense.date);
              if (dateToShow === 'Pendente') return 'Pendente';
              const [year, month, day] = dateToShow.split('-');
              return `${day}/${month}/${year}`;
            })()}</span>
            <span>-</span>
            <span>{expense.paymentMethod}</span>
          </div>
          {expense.installments && expense.installments > 1 && (
            <div className="text-xs">
              Parcela {expense.currentInstallment} de {expense.totalInstallments}
            </div>
          )}
          <div className="flex items-center gap-1">
            {expense.isFixed && expense.isPaid ? (
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                Pago
              </Badge>
            ) : expense.isFixed && !expense.isPaid ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkPaid}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                title="Marcar como pago"
              >
                <Plus className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Data Pagamento</span>
                <span className="sm:hidden">Data Pag.</span>
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar despesa">
              <Copy className="h-4 w-4" />
            </Button>
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
  const [isFixedFilter, setIsFixedFilter] = useState<boolean | undefined>(undefined);
  const [isPaidFilter, setIsPaidFilter] = useState<boolean | undefined>(undefined);

  const [dateFilter, setDateFilter] = useState({
    mode: 'all' as 'all' | 'year' | 'month' | 'range',
    years: [] as string[],
    months: [] as string[],
    year: '',
    month: '',
    from: '',
    to: '',
  });

  // Convert dateFilter to startDate/endDate for API
  const getDateParams = () => {
    if (dateFilter.mode === 'all') {
      return {};
    } else if (dateFilter.mode === 'year' && dateFilter.years.length > 0) {
      const years = dateFilter.years.map(y => parseInt(y)).sort();
      const startYear = Math.min(...years);
      const endYear = Math.max(...years);
      return {
        startDate: `${startYear}-01-01`,
        endDate: `${endYear}-12-31`
      };
    } else if (dateFilter.mode === 'month' && dateFilter.years.length > 0 && dateFilter.months.length > 0) {
      const years = dateFilter.years.map(y => parseInt(y)).sort();
      const months = dateFilter.months.map(m => parseInt(m)).sort();
      const startYear = Math.min(...years);
      const endYear = Math.max(...years);
      const startMonth = Math.min(...months);
      const endMonth = Math.max(...months);

      const lastDayOfEndMonth = new Date(endYear, endMonth, 0).getDate();

      return {
        startDate: `${startYear}-${startMonth.toString().padStart(2, '0')}-01`,
        endDate: `${endYear}-${endMonth.toString().padStart(2, '0')}-${lastDayOfEndMonth.toString().padStart(2, '0')}`
      };
    } else if (dateFilter.mode === 'range') {
      const params: any = {};
      if (dateFilter.from) params.startDate = dateFilter.from;
      if (dateFilter.to) params.endDate = dateFilter.to;
      return params;
    }
    return {};
  };

  const dateParams = getDateParams();
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [duplicatingExpense, setDuplicatingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [markingPaidExpense, setMarkingPaidExpense] = useState<Expense | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);

  const limit = 10;

  const expensesKey = ["expenses", { page, search, categoryFilter, isFixedFilter, isPaidFilter, dateFilter, sortBy, limit, userId: user?.id }];

  const { data, isLoading, isFetching, refetch } = useQuery<ExpensesResponse>({
    queryKey: expensesKey,
    queryFn: async () => {
      const token = await getAccessToken();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (isFixedFilter !== undefined) params.set("fixed", isFixedFilter ? "true" : "false");
      if (isPaidFilter !== undefined) params.set("paid", isPaidFilter ? "true" : "false");
      
      // Add date parameters
      const dateParams = getDateParams();
      if (dateParams.startDate) params.set("startDate", dateParams.startDate);
      if (dateParams.endDate) params.set("endDate", dateParams.endDate);
      
      if (sortBy) params.set("sortBy", sortBy);

      const response = await fetch(`/api/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery<ExpenseStats>({
    queryKey: ["expense-stats", user?.id, search, categoryFilter, isFixedFilter, isPaidFilter, dateFilter],
    queryFn: async () => {
      const token = await getAccessToken();
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (isFixedFilter !== undefined) params.set("fixed", isFixedFilter ? "true" : "false");
      if (isPaidFilter !== undefined) params.set("paid", isPaidFilter ? "true" : "false");
      
      // Date filtering for stats
      if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.set("startDate", dateFilter.from);
        if (dateFilter.to) params.set("endDate", dateFilter.to);
      }

      const response = await fetch(`/api/expenses/stats?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: allExpenses } = useQuery<ExpenseWithInstallments[]>({
    queryKey: ["expenses", { userId: user?.id, type: "all" }],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch("/api/expenses?limit=1000", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      return data.expenses;
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
      queryClient.invalidateQueries({ queryKey: ["expenses"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["expenses-stats"] });
      toast({
        title: "Despesa excluída",
        description: "A despesa foi removida com sucesso.",
      });
      setDeletingExpense(null);
      // Limpar editingExpense se a despesa deletada era a que estava sendo editada
      if (editingExpense && editingExpense.id === deletingExpense?.id) {
        setEditingExpense(null);
        setIsFormOpen(false);
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a despesa.",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, paymentDate }: { id: string; paymentDate: Date }) => {
      const token = await getAccessToken();
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isPaid: true,
          paymentDate: `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-${String(paymentDate.getDate()).padStart(2, '0')}T12:00:00`,
        }),
      });
      if (!response.ok) throw new Error("Failed to mark expense as paid");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["expenses-stats"] });
      toast({
        title: "Despesa marcada como paga",
        description: "A despesa foi atualizada com sucesso.",
      });
      setMarkingPaidExpense(null);
      setPaymentDate(undefined);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar a despesa como paga.",
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
    setDuplicatingExpense(null);
  };

  const handleFormSuccess = () => {
    handleCloseForm();
    queryClient.invalidateQueries({ queryKey: ["expenses"], refetchType: "active" });
    queryClient.invalidateQueries({ queryKey: ["expenses-stats"] });
  };

  const handleDuplicate = (expense: Expense) => {
    setDuplicatingExpense(expense);
    setIsFormOpen(true);
  };

  const handleOpenMarkPaid = (expense: Expense) => {
    setMarkingPaidExpense(expense);
    // Para despesas fixas, sempre preenche com a data atual
    if (expense.isFixed) {
      setPaymentDate(new Date());
    } else {
      setPaymentDate(undefined);
    }
  };

  const handleCloseMarkPaid = () => {
    setMarkingPaidExpense(null);
    setPaymentDate(undefined);
  };

  const handleMarkPaid = () => {
    if (markingPaidExpense) {
      const dateToUse = paymentDate || new Date();
      markPaidMutation.mutate({
        id: markingPaidExpense.id.toString(),
        paymentDate: dateToUse,
      });
    }
  };
  
  const hasFilters = search || categoryFilter || isFixedFilter !== undefined || isPaidFilter !== undefined || 
    (dateFilter.mode !== 'all' && (dateFilter.years.length > 0 || dateFilter.months.length > 0 || dateFilter.from || dateFilter.to));

  // Get available years from expenses
  const availableYears = Array.from(
    new Set(allExpenses?.map(expense => expense.date.split('-')[0]) || [])
  ).sort((a, b) => parseInt(b) - parseInt(a));

  // Calcular estatísticas
  const totalTransactions = data?.total || 0;
  const totalExpensesValue = stats?.totalSpent || 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-expenses-value">
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(totalExpensesValue)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma de todas as despesas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Transações
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-transactions">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                totalTransactions
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Despesas registradas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-expenses-title">
            Despesas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as suas despesas
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <Button onClick={() => handleOpenForm()} data-testid="button-add-expense" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Despesa
          </Button>
        </div>
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

              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-sort-filter">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Data (mais recente)</SelectItem>
                  <SelectItem value="date_asc">Data (mais antiga)</SelectItem>
                  <SelectItem value="amount_desc">Valor (maior)</SelectItem>
                  <SelectItem value="amount_asc">Valor (menor)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Tipo:</label>
                <div className="flex gap-1">
                  <Button
                    variant={isFixedFilter === true && isPaidFilter !== false ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isFixedFilter === true && isPaidFilter !== false) {
                        setIsFixedFilter(undefined);
                        setIsPaidFilter(undefined);
                      } else {
                        setIsFixedFilter(true);
                        setIsPaidFilter(undefined);
                      }
                      setPage(1);
                    }}
                  >
                    Fixo
                  </Button>
                  <Button
                    variant={isFixedFilter === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isFixedFilter === false) {
                        setIsFixedFilter(undefined);
                        setIsPaidFilter(undefined);
                      } else {
                        setIsFixedFilter(false);
                        setIsPaidFilter(undefined);
                      }
                      setPage(1);
                    }}
                  >
                    Não Fixo
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <div className="flex gap-1">
                  <Button
                    variant={isPaidFilter === true && isFixedFilter !== true ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isPaidFilter === true && isFixedFilter !== true) {
                        setIsPaidFilter(undefined);
                        setIsFixedFilter(undefined);
                      } else {
                        setIsPaidFilter(true);
                        setIsFixedFilter(undefined);
                      }
                      setPage(1);
                    }}
                  >
                    Pago
                  </Button>
                  <Button
                    variant={isFixedFilter === true && isPaidFilter === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isFixedFilter === true && isPaidFilter === false) {
                        setIsFixedFilter(undefined);
                        setIsPaidFilter(undefined);
                      } else {
                        setIsFixedFilter(true);
                        setIsPaidFilter(false);
                      }
                      setPage(1);
                    }}
                  >
                    Pendente
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start">
                    <Filter className="mr-2 h-4 w-4" />
                    {dateFilter.mode === 'all' ? 'Todos os períodos' :
                     dateFilter.mode === 'year' ? 'Por ano' :
                     dateFilter.mode === 'month' ? 'Por mês' : 'Período específico'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Modo de filtro</label>
                      <Select
                        value={dateFilter.mode}
                        onValueChange={(value: 'all' | 'year' | 'month' | 'range') => {
                          setDateFilter(prev => ({ ...prev, mode: value }));
                          setPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os períodos</SelectItem>
                          <SelectItem value="year">Por ano</SelectItem>
                          <SelectItem value="month">Por mês</SelectItem>
                          <SelectItem value="range">Período específico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {dateFilter.mode === 'year' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Anos</label>
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="flex-1 min-w-0 justify-start">
                                <span className="truncate">
                                  {dateFilter.years.length === 0
                                    ? "Selecionar anos"
                                    : dateFilter.years.length === availableYears.length
                                    ? "Todos"
                                    : (() => {
                                        const sortedYears = [...dateFilter.years].sort((a, b) => parseInt(a) - parseInt(b));
                                        const text = sortedYears.join(", ");
                                        return text.length > 20 ? text.slice(0, 17) + "..." : text;
                                      })()
                                  }
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0">
                              <Command>
                                <CommandInput placeholder="Buscar ano..." />
                                <CommandList>
                                  <CommandEmpty>Nenhum ano.</CommandEmpty>
                                  <CommandGroup>
                                    {availableYears.map((year) => (
                                      <CommandItem
                                        key={year}
                                        onSelect={() => {
                                          setDateFilter(prev => ({
                                            ...prev,
                                            years: prev.years.includes(year)
                                              ? prev.years.filter(y => y !== year)
                                              : [...prev.years, year]
                                          }));
                                          setPage(1);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            dateFilter.years.includes(year) ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {year}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {dateFilter.years.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              setDateFilter(prev => ({ ...prev, years: [] }));
                              setPage(1);
                            }}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {dateFilter.mode === 'month' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Anos</label>
                          <div className="flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="flex-1 min-w-0 justify-start">
                                  <span className="truncate">
                                    {dateFilter.years.length === 0
                                      ? "Anos"
                                      : dateFilter.years.length === availableYears.length
                                      ? "Todos"
                                      : (() => {
                                          const sortedYears = [...dateFilter.years].sort((a, b) => parseInt(a) - parseInt(b));
                                          const text = sortedYears.join(", ");
                                          return text.length > 20 ? text.slice(0, 17) + "..." : text;
                                        })()
                                    }
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar ano..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum ano.</CommandEmpty>
                                    <CommandGroup>
                                      {availableYears.map((year) => (
                                        <CommandItem
                                          key={year}
                                          onSelect={() => {
                                            setDateFilter(prev => ({
                                              ...prev,
                                              years: prev.years.includes(year)
                                                ? prev.years.filter(y => y !== year)
                                                : [...prev.years, year]
                                            }));
                                            setPage(1);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              dateFilter.years.includes(year) ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          {year}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            {dateFilter.years.length > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                setDateFilter(prev => ({ ...prev, years: [] }));
                                setPage(1);
                              }}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Meses</label>
                          <div className="flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="flex-1 min-w-0 justify-start">
                                  <span className="truncate">
                                    {dateFilter.months.length === 0
                                      ? "Meses"
                                      : dateFilter.months.length === 12
                                      ? "Todos"
                                      : (() => {
                                          const monthLabels = [
                                            { value: '1', label: 'Jan' },
                                            { value: '2', label: 'Fev' },
                                            { value: '3', label: 'Mar' },
                                            { value: '4', label: 'Abr' },
                                            { value: '5', label: 'Mai' },
                                            { value: '6', label: 'Jun' },
                                            { value: '7', label: 'Jul' },
                                            { value: '8', label: 'Ago' },
                                            { value: '9', label: 'Set' },
                                            { value: '10', label: 'Out' },
                                            { value: '11', label: 'Nov' },
                                            { value: '12', label: 'Dez' },
                                          ];
                                          const sortedMonths = [...dateFilter.months].sort((a, b) => parseInt(a) - parseInt(b));
                                          const text = sortedMonths.map(m => monthLabels.find(ml => ml.value === m)?.label).join(", ");
                                          return text.length > 20 ? text.slice(0, 17) + "..." : text;
                                        })()
                                    }
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar mês..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum mês.</CommandEmpty>
                                    <CommandGroup>
                                      {[
                                        { value: '1', label: 'Janeiro' },
                                        { value: '2', label: 'Fevereiro' },
                                        { value: '3', label: 'Março' },
                                        { value: '4', label: 'Abril' },
                                        { value: '5', label: 'Maio' },
                                        { value: '6', label: 'Junho' },
                                        { value: '7', label: 'Julho' },
                                        { value: '8', label: 'Agosto' },
                                        { value: '9', label: 'Setembro' },
                                        { value: '10', label: 'Outubro' },
                                        { value: '11', label: 'Novembro' },
                                        { value: '12', label: 'Dezembro' },
                                      ].map((month) => (
                                        <CommandItem
                                          key={month.value}
                                          onSelect={() => {
                                            setDateFilter(prev => ({
                                              ...prev,
                                              months: prev.months.includes(month.value)
                                                ? prev.months.filter(m => m !== month.value)
                                                : [...prev.months, month.value]
                                            }));
                                            setPage(1);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              dateFilter.months.includes(month.value) ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          {month.label}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            {dateFilter.months.length > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                setDateFilter(prev => ({ ...prev, months: [] }));
                                setPage(1);
                              }}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {dateFilter.mode === 'range' && (
                      <div className="space-y-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Data inicial</label>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={dateFilter.from}
                              onChange={(e) => {
                                setDateFilter(prev => ({
                                  ...prev,
                                  from: e.target.value
                                }));
                                setPage(1);
                              }}
                              className="flex-1"
                            />
                            {dateFilter.from && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                setDateFilter(prev => ({ ...prev, from: '' }));
                                setPage(1);
                              }}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Data final</label>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={dateFilter.to}
                              onChange={(e) =>
                                setDateFilter(prev => ({
                                  ...prev,
                                  to: e.target.value
                                }))
                              }
                              className="flex-1"
                            />
                            {dateFilter.to && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                setDateFilter(prev => ({ ...prev, to: '' }));
                                setPage(1);
                              }}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
                    onMarkPaid={() => handleOpenMarkPaid(expense)}
                    onDuplicate={() => handleDuplicate(expense)}
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
                    onMarkPaid={() => handleOpenMarkPaid(expense)}
                    onDuplicate={() => handleDuplicate(expense)}
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
              {editingExpense ? "Editar Despesa" : duplicatingExpense ? "Duplicar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <ExpenseForm
            expense={editingExpense}
            initialData={duplicatingExpense}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!markingPaidExpense}
        onOpenChange={(open) => !open && handleCloseMarkPaid()}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Marcar como Pago</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Despesa</label>
              <p className="text-sm text-muted-foreground">
                {markingPaidExpense?.description}
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Data de Pagamento</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? (
                      format(paymentDate, "dd/MM/yyyy")
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => {
                      if (date) setPaymentDate(date);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCloseMarkPaid}
              disabled={markPaidMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMarkPaid}
              disabled={(markingPaidExpense?.isFixed && !paymentDate) || markPaidMutation.isPending}
            >
              {markPaidMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Marcar como Pago
            </Button>
          </div>
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
