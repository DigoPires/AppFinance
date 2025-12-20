import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { 
  TrendingDown, 
  Calendar, 
  Repeat, 
  ArrowUpRight,
  Receipt,
  Wallet,
  PiggyBank,
  Utensils,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  Shirt,
  Wrench,
  MoreHorizontal,
  DollarSign,
  Plus,
  Edit,
  X,
  Check,
  ChevronDown,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CATEGORIES, PAYMENT_METHODS } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ExpenseWithInstallments, Income } from "@shared/schema";

interface ExpenseStats {
  totalSpent: number;
  monthlySpent: number;
  fixedExpenses: number;
  expenseCount: number;
  categoryBreakdown: Record<string, number>;
  monthlyIncome: number;
  incomeCount: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
const categoryIcons: Record<string, React.ElementType> = {
  "Alimentação": Utensils,
  "Transporte": Car,
  "Moradia": Home,
  "Saúde": Heart,
  "Educação": GraduationCap,
  "Lazer": Gamepad2,
  "Vestuário": Shirt,
  "Serviços": Wrench,
  "Outros": MoreHorizontal,
};
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}) {
  return (
    <Card className="min-h-[100px]">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
        <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
        ) : (
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold font-mono truncate" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </span>
            {trend && (
              <span
                className={`flex items-center text-xs font-medium ${
                  trend === "down" ? "text-destructive" : trend === "up" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <ArrowUpRight className={`h-3 w-3 ${trend === "down" ? "rotate-90" : ""}`} />
              </span>
            )}
          </div>
        )}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryCard({
  category,
  amount,
  total,
  loading,
}: {
  category: string;
  amount: number;
  total: number;
  loading?: boolean;
}) {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  const IconComponent = categoryIcons[category] || Receipt;
  
  return (
    <div className="flex items-center gap-3 sm:gap-4 rounded-lg border bg-card p-3 sm:p-4">
      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
        <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-medium truncate">{category}</span>
          {loading ? (
            <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
          ) : (
            <span className="text-xs sm:text-sm font-mono font-semibold text-muted-foreground">
              {formatCurrency(amount)}
            </span>
          )}
        </div>
        <div className="mt-2 h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function RecentExpenseItem({ expense }: { expense: ExpenseWithInstallments }) {
  const IconComponent = categoryIcons[expense.category] || Wallet;
  // Usar paymentDate para despesas fixas pagas, senão usar date
  // Para despesas fixas pendentes, não mostrar data
  const displayDate = expense.isFixed && expense.isPaid && expense.paymentDate ? expense.paymentDate : expense.date;
  const isPending = expense.isFixed && !expense.isPaid;
  const shouldShowDate = !isPending;

  return (
    <div className={`flex items-center justify-between gap-2 sm:gap-4 py-3 ${isPending ? 'opacity-75' : ''}`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg flex-shrink-0 ${isPending ? 'bg-orange-100' : 'bg-primary/10'}`}>
          <IconComponent className={`h-3 w-3 sm:h-4 sm:w-4 ${isPending ? 'text-orange-600' : 'text-primary'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs sm:text-sm font-medium">
            {expense.displayDescription || expense.description}
            {isPending && <span className="ml-1 sm:ml-2 text-xs text-orange-600 font-medium">(Pendente)</span>}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {expense.category}
            {expense.installments && expense.installments > 1 && (
              <span className="ml-1">• {expense.currentInstallment}/{expense.totalInstallments}x</span>
            )}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-mono text-xs sm:text-sm font-semibold">
          {expense.installments && expense.installments > 1
            ? formatCurrency(expense.currentInstallmentValue || 0)
            : formatCurrency(Number(expense.totalValue))
          }
        </p>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {shouldShowDate ? (() => {
            const [year, month, day] = displayDate.split('-');
            return format(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)), "dd MMM", { locale: ptBR });
          })() : expense.paymentMethod}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, getAccessToken } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Função para normalizar texto (remover acentos e converter para minúsculas)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    category: [] as string[],
    description: '',
    paymentMethod: [] as string[],
    account: [] as string[],
    location: [] as string[],
    isFixed: false,
    notes: '',
    dateFilter: {
      mode: 'all' as 'all' | 'year' | 'month' | 'range',
      years: [] as string[],
      months: [] as string[],
      year: '',
      month: '',
      from: '',
      to: '',
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ExpenseStats>({
    queryKey: ["expenses-stats", { userId: user?.id }],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch("/api/expenses/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: allExpenses, isLoading: allExpensesLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", { userId: user?.id, type: "dashboard" }],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch("/api/expenses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      return data.expenses;
    },
    enabled: !!user,
  });

  const { data: recentExpenses, isLoading: recentLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", { userId: user?.id, type: "recent" }],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch("/api/expenses?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      return data.expenses;
    },
    enabled: !!user,
  });

  const { data: pendingFixedExpenses, isLoading: pendingLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", { userId: user?.id, type: "pending-fixed" }],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch("/api/expenses?fixed=true&paid=false", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch pending fixed expenses");
      const data = await response.json();
      return data.expenses;
    },
    enabled: !!user,
  });

  const { data: incomes } = useQuery({
    queryKey: ["incomes", { userId: user?.id }],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch("/api/incomes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch incomes");
      return response.json();
    },
    enabled: !!user,
  });

  const handleSaveIncome = async () => {
    const value = parseFloat(tempValue);
    if (isNaN(value) || value <= 0) {
      toast({
        variant: "destructive",
        title: "Valor inválido",
        description: "Por favor, insira um valor maior que zero.",
      });
      return;
    }
    if (value > 1000000000) {
      toast({
        variant: "destructive",
        title: "Valor muito alto",
        description: "O valor não pode ser maior que 1 bilhão.",
      });
      return;
    }

    const token = await getAccessToken();
    if (!token) return;

    const monthlyIncome = incomes?.find((inc: any) => inc.isMonthly);
    if (monthlyIncome) {
      // Update existing
      const response = await fetch(`/api/incomes/${monthlyIncome.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ amount: value.toString() }),
      });
      if (!response.ok) throw new Error("Failed to update income");
    } else {
      // Create new
      const response = await fetch("/api/incomes", {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          description: "Renda Mensal", 
          amount: value.toString(), 
          isMonthly: true 
        }),
      });
      if (!response.ok) throw new Error("Failed to create income");
    }
    // Invalidate queries to refresh stats
    queryClient.invalidateQueries({ queryKey: ["expenses-stats"], refetchType: "active" });
    queryClient.invalidateQueries({ queryKey: ["incomes"], refetchType: "active" });
    setIsEditing(false);
    setTempValue('');
  };

  const handleEditIncome = () => {
    const current = stats?.monthlyIncome || 0;
    setTempValue(current.toString());
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempValue('');
  };

  const filteredExpenses = allExpenses?.filter(expense => {
    const [expYear, expMonth, expDay] = expense.date.split('-').map(Number);
    let dateMatch = true;

    if (filters.dateFilter.mode === 'year' && filters.dateFilter.years.length > 0) {
      dateMatch = filters.dateFilter.years.includes(expYear.toString());
    } else if (filters.dateFilter.mode === 'month' && filters.dateFilter.years.length > 0 && filters.dateFilter.months.length > 0) {
      dateMatch = filters.dateFilter.years.includes(expYear.toString()) &&
                  filters.dateFilter.months.includes(expMonth.toString());
    } else if (filters.dateFilter.mode === 'range') {
      const fromDate = filters.dateFilter.from ? new Date(filters.dateFilter.from + 'T00:00:00') : null;
      const toDate = filters.dateFilter.to ? new Date(filters.dateFilter.to + 'T23:59:59.999') : null;
      const expenseDate = new Date(expYear, expMonth - 1, expDay);
      dateMatch = (!fromDate || expenseDate >= fromDate) && (!toDate || expenseDate <= toDate);
    }

    return (
      (filters.category.length === 0 || filters.category.includes(expense.category)) &&
      (!filters.description || normalizeText(expense.description).includes(normalizeText(filters.description))) &&
      (filters.paymentMethod.length === 0 || filters.paymentMethod.includes(expense.paymentMethod)) &&
      (filters.account.length === 0 || (expense.account && filters.account.includes(expense.account))) &&
      (filters.location.length === 0 || (expense.location && filters.location.includes(expense.location))) &&
      (!filters.isFixed || expense.isFixed === filters.isFixed) &&
      (!filters.notes || (expense.notes && normalizeText(expense.notes).includes(normalizeText(filters.notes)))) &&
      dateMatch
    );
  }) || [];

  const filteredRecentExpenses = recentExpenses?.filter(expense => {
    // Para despesas fixas pagas, usar a data de pagamento
    const dateToUse = expense.isFixed && expense.isPaid && expense.paymentDate ? expense.paymentDate : expense.date;
    const [expYear, expMonth, expDay] = dateToUse.split('-').map(Number);
    let dateMatch = true;

    if (filters.dateFilter.mode === 'year' && filters.dateFilter.year) {
      dateMatch = expYear.toString() === filters.dateFilter.year;
    } else if (filters.dateFilter.mode === 'month' && filters.dateFilter.year && filters.dateFilter.month) {
      dateMatch = expYear.toString() === filters.dateFilter.year &&
                  expMonth.toString() === filters.dateFilter.month;
    } else if (filters.dateFilter.mode === 'range') {
      const fromDate = filters.dateFilter.from ? new Date(filters.dateFilter.from + 'T00:00:00') : null;
      const toDate = filters.dateFilter.to ? new Date(filters.dateFilter.to + 'T23:59:59.999') : null;
      const expenseDate = new Date(expYear, expMonth - 1, expDay);
      dateMatch = (!fromDate || expenseDate >= fromDate) && (!toDate || expenseDate <= toDate);
    }

    return (
      (filters.category.length === 0 || filters.category.includes(expense.category)) &&
      (!filters.description || normalizeText(expense.description).includes(normalizeText(filters.description))) &&
      (filters.paymentMethod.length === 0 || filters.paymentMethod.includes(expense.paymentMethod)) &&
      (filters.account.length === 0 || (expense.account && filters.account.includes(expense.account))) &&
      (filters.location.length === 0 || (expense.location && filters.location.includes(expense.location))) &&
      (!filters.isFixed || expense.isFixed === filters.isFixed) &&
      (!filters.notes || (expense.notes && normalizeText(expense.notes).includes(normalizeText(filters.notes)))) &&
      dateMatch &&
      // Incluir apenas despesas não fixas OU despesas fixas pagas
      (!expense.isFixed || expense.isPaid)
    );
  }) || [];

  // Extrair anos únicos dos dados de despesas
  const availableYears = allExpenses ? 
    allExpenses
      .map(expense => {
        const [year] = expense.date.split('-');
        return parseInt(year);
      })
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort((a, b) => b - a) // Ordenar do mais recente para o mais antigo
    : [];

  const filteredStats = filteredExpenses ? {
    totalSpent: filteredExpenses.reduce((sum, exp) => {
      // Para despesas parceladas, usar o valor da parcela atual
      const value = exp.installments && exp.installments > 1 
        ? (exp.currentInstallmentValue || 0) 
        : parseFloat(exp.totalValue.toString());
      return sum + value;
    }, 0),
    monthlySpent: filteredExpenses
      .filter(exp => {
        const [expYear, expMonth] = exp.date.split('-').map(Number);
        const now = new Date();
        return expMonth - 1 === now.getMonth() && expYear === now.getFullYear();
      })
      .reduce((sum, exp) => {
        // Para despesas parceladas, usar o valor da parcela atual
        const value = exp.installments && exp.installments > 1 
          ? (exp.currentInstallmentValue || 0) 
          : parseFloat(exp.totalValue.toString());
        return sum + value;
      }, 0),
    fixedExpenses: filteredExpenses.filter(exp => exp.isFixed).reduce((sum, exp) => {
      // Para despesas fixas parceladas, usar o valor da parcela atual
      const value = exp.installments && exp.installments > 1 
        ? (exp.currentInstallmentValue || 0) 
        : parseFloat(exp.totalValue.toString());
      return sum + value;
    }, 0),
    expenseCount: filteredExpenses.length,
    categoryBreakdown: filteredExpenses.reduce((acc, exp) => {
      // Para despesas parceladas, usar o valor da parcela atual
      const value = exp.installments && exp.installments > 1 
        ? (exp.currentInstallmentValue || 0) 
        : parseFloat(exp.totalValue.toString());
      acc[exp.category] = (acc[exp.category] || 0) + value;
      return acc;
    }, {} as Record<string, number>),
    monthlyIncome: stats?.monthlyIncome || 0,
    incomeCount: stats?.incomeCount || 0,
  } : stats;

  const currentMonth = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const monthStart = format(startOfMonth(new Date()), "dd/MM");
  const monthEnd = format(endOfMonth(new Date()), "dd/MM");

  const categoryEntries = filteredStats?.categoryBreakdown 
    ? Object.entries(filteredStats.categoryBreakdown).sort((a, b) => {
        // "Outros" sempre no final
        if (a[0] === 'Outros') return 1;
        if (b[0] === 'Outros') return -1;
        // Outras categorias ordenadas por valor decrescente
        return b[1] - a[1];
      })
    : [];

  // Dynamic options based on existing data
  const availableAccounts = Array.from(new Set(allExpenses?.map(exp => exp.account).filter((account): account is string => account !== null && account !== undefined) || []));
  const availableLocations = Array.from(new Set(allExpenses?.map(exp => exp.location).filter((location): location is string => location !== null && location !== undefined) || []));

  return (
    <div className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral das suas finanças
          </p>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveIncome();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              onBlur={handleSaveIncome}
              className="px-3 py-2 border border-input bg-background text-foreground rounded-md text-sm w-full sm:w-40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Ex: 5000"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">BRL</span>
          </div>
        ) : (stats?.monthlyIncome || 0) > 0 ? (
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Renda Total (Mês Atual)</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold font-mono">
                {formatCurrency(stats?.monthlyIncome || 0)}
              </span>
              <Link href="/earnings">
                <Button variant="ghost" size="sm" title="Gerenciar receitas">
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <Link href="/earnings">
            <Button className="sm:w-auto" data-testid="button-add-income">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Renda
            </Button>
          </Link>
        )}
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto justify-between transition-all duration-200 hover:bg-muted/50">
            Filtros
            <ChevronDown className={`h-4 w-4 transition-all duration-300 ease-in-out ${filtersOpen ? 'rotate-180 scale-110' : 'rotate-0 scale-100'}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className={`mt-4 transition-all duration-1000 ease-out ${filtersOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} origin-top`}>
            <div className="flex flex-col gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/50 shadow-sm backdrop-blur-sm transform transition-all duration-800 ease-out delay-200">
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:flex 2xl:flex-wrap 2xl:gap-4 2xl:items-end">
              <div className={`flex flex-col gap-2 ${filtersOpen ? 'animate-in fade-in slide-in-from-left-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-left-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '0ms' : '350ms' }}>
                <label className="text-sm font-medium">Período</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start transition-all duration-200 hover:scale-105 hover:shadow-md">
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.dateFilter.mode === 'all' && 'Todos os períodos'}
                      {filters.dateFilter.mode === 'year' && filters.dateFilter.year && `${filters.dateFilter.year}`}
                      {filters.dateFilter.mode === 'month' && filters.dateFilter.year && filters.dateFilter.month &&
                        `${filters.dateFilter.month.padStart(2, '0')}/${filters.dateFilter.year}`}
                      {filters.dateFilter.mode === 'range' && filters.dateFilter.from && filters.dateFilter.to &&
                        `${new Date(filters.dateFilter.from).toLocaleDateString('pt-BR')} - ${new Date(filters.dateFilter.to).toLocaleDateString('pt-BR')}`}
                      {filters.dateFilter.mode === 'range' && filters.dateFilter.from && !filters.dateFilter.to &&
                        `A partir de ${new Date(filters.dateFilter.from).toLocaleDateString('pt-BR')}`}
                      {filters.dateFilter.mode === 'range' && !filters.dateFilter.from && filters.dateFilter.to &&
                        `Até ${new Date(filters.dateFilter.to).toLocaleDateString('pt-BR')}`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Tipo de filtro</h4>
                        <Select
                          value={filters.dateFilter.mode}
                          onValueChange={(value: 'all' | 'year' | 'month' | 'range') =>
                            setFilters(prev => ({
                              ...prev,
                              dateFilter: { ...prev.dateFilter, mode: value }
                            }))
                          }
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

                      {filters.dateFilter.mode === 'year' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Anos</label>
                          <div className="flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="flex-1 min-w-0 justify-start transition-all duration-200 hover:scale-105 hover:shadow-md">
                                  <span className="truncate">
                                    {filters.dateFilter.years.length === 0
                                      ? "Selecionar anos"
                                      : filters.dateFilter.years.length === availableYears.length
                                      ? "Todos os anos"
                                      : (() => {
                                          const sortedYears = [...filters.dateFilter.years].sort((a, b) => parseInt(a) - parseInt(b));
                                          const text = sortedYears.join(", ");
                                          return text.length > 25 ? text.slice(0, 22) + "..." : text;
                                        })()
                                    }
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar ano..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum ano.</CommandEmpty>
                                    <CommandGroup>
                                      {availableYears.map((year) => (
                                        <CommandItem
                                          key={year}
                                          onSelect={() => {
                                            setFilters(prev => ({
                                              ...prev,
                                              dateFilter: {
                                                ...prev.dateFilter,
                                                years: prev.dateFilter.years.includes(year.toString())
                                                  ? prev.dateFilter.years.filter(y => y !== year.toString())
                                                  : [...prev.dateFilter.years, year.toString()]
                                              }
                                            }));
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              filters.dateFilter.years.includes(year.toString()) ? "opacity-100" : "opacity-0"
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
                            {filters.dateFilter.years.length > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, years: [] } }))}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {filters.dateFilter.mode === 'month' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Anos</label>
                            <div className="flex gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="flex-1 min-w-0 justify-start transition-all duration-200 hover:scale-105 hover:shadow-md">
                                    <span className="truncate">
                                      {filters.dateFilter.years.length === 0
                                        ? "Selecionar anos"
                                        : filters.dateFilter.years.length === availableYears.length
                                        ? "Todos"
                                        : (() => {
                                            const sortedYears = [...filters.dateFilter.years].sort((a, b) => parseInt(a) - parseInt(b));
                                            const text = sortedYears.join(", ");
                                            return text.length > 20 ? text.slice(0, 17) + "..." : text;
                                          })()
                                      }
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar ano..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum ano.</CommandEmpty>
                                      <CommandGroup>
                                        {availableYears.map((year) => (
                                          <CommandItem
                                            key={year}
                                            onSelect={() => {
                                              setFilters(prev => ({
                                                ...prev,
                                                dateFilter: {
                                                  ...prev.dateFilter,
                                                  years: prev.dateFilter.years.includes(year.toString())
                                                    ? prev.dateFilter.years.filter(y => y !== year.toString())
                                                    : [...prev.dateFilter.years, year.toString()]
                                                }
                                              }));
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                filters.dateFilter.years.includes(year.toString()) ? "opacity-100" : "opacity-0"
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
                              {filters.dateFilter.years.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, years: [] } }))}>
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
                                  <Button variant="outline" className="flex-1 min-w-0 justify-start transition-all duration-200 hover:scale-105 hover:shadow-md">
                                    <span className="truncate">
                                      {filters.dateFilter.months.length === 0
                                        ? "Selecionar meses"
                                        : filters.dateFilter.months.length === 12
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
                                            const sortedMonths = [...filters.dateFilter.months].sort((a, b) => parseInt(a) - parseInt(b));
                                            const text = sortedMonths.map(m => monthLabels.find(ml => ml.value === m)?.label).join(", ");
                                            return text.length > 20 ? text.slice(0, 17) + "..." : text;
                                          })()
                                      }
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
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
                                              setFilters(prev => ({
                                                ...prev,
                                                dateFilter: {
                                                  ...prev.dateFilter,
                                                  months: prev.dateFilter.months.includes(month.value)
                                                    ? prev.dateFilter.months.filter(m => m !== month.value)
                                                    : [...prev.dateFilter.months, month.value]
                                                }
                                              }));
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                filters.dateFilter.months.includes(month.value) ? "opacity-100" : "opacity-0"
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
                              {filters.dateFilter.months.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, months: [] } }))}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {filters.dateFilter.mode === 'range' && (
                        <div className="space-y-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Data inicial</label>
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={filters.dateFilter.from}
                                onChange={(e) =>
                                  setFilters(prev => ({
                                    ...prev,
                                    dateFilter: { ...prev.dateFilter, from: e.target.value }
                                  }))
                                }
                                className="flex-1"
                              />
                              {filters.dateFilter.from && (
                                <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, from: '' } }))}>
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
                                value={filters.dateFilter.to}
                                onChange={(e) =>
                                  setFilters(prev => ({
                                    ...prev,
                                    dateFilter: { ...prev.dateFilter, to: e.target.value }
                                  }))
                                }
                                className="flex-1"
                              />
                              {filters.dateFilter.to && (
                                <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, to: '' } }))}>
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
              <div className={`flex flex-col gap-2 ${filtersOpen ? 'animate-in fade-in slide-in-from-left-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-left-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '50ms' : '300ms' }}>
                <label className="text-sm font-medium">Categoria</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 min-w-0 justify-start transition-all duration-200 hover:scale-105 hover:shadow-md">
                        <span className="truncate">
                          {filters.category.length === 0
                            ? "Selecionar categorias"
                            : filters.category.length === CATEGORIES.length
                            ? "Todas"
                            : (() => {
                                const text = filters.category.join(", ");
                                return text.length > 20 ? text.slice(0, 17) + "..." : text;
                              })()
                          }
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar categoria..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                          <CommandGroup>
                            {CATEGORIES.map((cat) => (
                              <CommandItem
                                key={cat}
                                onSelect={() => {
                                  setFilters(prev => ({
                                    ...prev,
                                    category: prev.category.includes(cat)
                                      ? prev.category.filter(c => c !== cat)
                                      : [...prev.category, cat]
                                  }));
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filters.category.includes(cat) ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {cat}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filters.category.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, category: [] }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className={`flex flex-col gap-2 ${filtersOpen ? 'animate-in fade-in slide-in-from-left-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-left-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '25ms' : '325ms' }}>
                <label className="text-sm font-medium">Método de Pagamento</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        {filters.paymentMethod.length === 0
                          ? "Selecionar métodos"
                          : filters.paymentMethod.length === PAYMENT_METHODS.length
                          ? "Todos"
                          : (() => {
                              const text = filters.paymentMethod.join(", ");
                              return text.length > 20 ? text.slice(0, 17) + "..." : text;
                            })()
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar método..." />
                        <CommandList>
                          <CommandEmpty>Nenhum método encontrado.</CommandEmpty>
                          <CommandGroup>
                            {PAYMENT_METHODS.map((method) => (
                              <CommandItem
                                key={method}
                                onSelect={() => {
                                  setFilters(prev => ({
                                    ...prev,
                                    paymentMethod: prev.paymentMethod.includes(method)
                                      ? prev.paymentMethod.filter(m => m !== method)
                                      : [...prev.paymentMethod, method]
                                  }));
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filters.paymentMethod.includes(method) ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {method}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filters.paymentMethod.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, paymentMethod: [] }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className={`flex flex-col gap-2 ${filtersOpen ? 'animate-in fade-in slide-in-from-left-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-left-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '50ms' : '300ms' }}>
                <label className="text-sm font-medium">Conta</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-48 justify-start">
                        {filters.account.length === 0
                          ? "Selecionar contas"
                          : filters.account.length === availableAccounts.length
                          ? "Todas"
                          : (() => {
                              const text = filters.account.join(", ");
                              return text.length > 25 ? text.slice(0, 22) + "..." : text;
                            })()
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar conta..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                          <CommandGroup>
                            {availableAccounts.map((account) => (
                              <CommandItem
                                key={account}
                                onSelect={() => {
                                  setFilters(prev => ({
                                    ...prev,
                                    account: prev.account.includes(account)
                                      ? prev.account.filter(a => a !== account)
                                      : [...prev.account, account]
                                  }));
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filters.account.includes(account) ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {account}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filters.account.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, account: [] }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className={`flex flex-col gap-2 ${filtersOpen ? 'animate-in fade-in slide-in-from-left-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-left-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '75ms' : '275ms' }}>
                <label className="text-sm font-medium">Localização</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-48 justify-start">
                        {filters.location.length === 0
                          ? "Selecionar localizações"
                          : filters.location.length === availableLocations.length
                          ? "Todas"
                          : (() => {
                              const text = filters.location.join(", ");
                              return text.length > 25 ? text.slice(0, 22) + "..." : text;
                            })()
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar localização..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma localização encontrada.</CommandEmpty>
                          <CommandGroup>
                            {availableLocations.map((location) => (
                              <CommandItem
                                key={location}
                                onSelect={() => {
                                  setFilters(prev => ({
                                    ...prev,
                                    location: prev.location.includes(location)
                                      ? prev.location.filter(l => l !== location)
                                      : [...prev.location, location]
                                  }));
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filters.location.includes(location) ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {location}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filters.location.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, location: [] }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className={`flex flex-col gap-2 ${filtersOpen ? 'animate-in fade-in slide-in-from-left-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-left-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '100ms' : '250ms' }}>
                <label className="text-sm font-medium">Descrição</label>
            <div className="flex gap-2">
              <Input
                placeholder="Descrição"
                value={filters.description}
                onChange={(e) => setFilters(prev => ({ ...prev, description: e.target.value }))}
                className="w-full sm:w-40"
              />
              {filters.description && (
                <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, description: '' }))}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
              <div className={`flex flex-col gap-2 ${filtersOpen ? 'animate-in fade-in slide-in-from-left-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-left-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '125ms' : '225ms' }}>
                <label className="text-sm font-medium">Observações</label>
            <div className="flex gap-2">
              <Input
                placeholder="Observações"
                value={filters.notes}
                onChange={(e) => setFilters(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full sm:w-40"
              />
              {filters.notes && (
                <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({ ...prev, notes: '' }))}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
              <div className={`flex flex-col gap-2 ${filtersOpen ? 'animate-in fade-in slide-in-from-left-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-left-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '150ms' : '200ms' }}>
                <label className="text-sm font-medium">Despesa Fixa</label>
                <div className="flex items-center h-9 md:ml-6">
                  <Switch
                    checked={filters.isFixed}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, isFixed: !!checked }))}
                  />
                </div>
              </div>
              <div className={`flex justify-end sm:col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-1 2xl:ml-auto ${filtersOpen ? 'animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both' : 'animate-out fade-out slide-out-to-bottom-2 duration-300 fill-mode-both'}`} style={{ animationDelay: filtersOpen ? '400ms' : '0ms' }}>
                <Button className="w-full sm:w-auto transition-all duration-200 hover:scale-105 hover:shadow-md" onClick={() => setFilters({
                  category: [],
                  description: '',
                  paymentMethod: [],
                  account: [],
                  location: [],
                  isFixed: false,
                  notes: '',
                  dateFilter: {
                    mode: 'all',
                    year: '',
                    month: '',
                    from: '',
                    to: '',
                  },
                })}>
                  Limpar Filtros
                </Button>
              </div>
        </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Total de Despesas"
          value={formatCurrency(filteredStats?.totalSpent || 0)}
          icon={TrendingDown}
          description="Todas as despesas registradas"
          loading={allExpensesLoading || statsLoading}
        />
        <StatCard
          title="Este Mês"
          value={formatCurrency(filteredStats?.monthlySpent || 0)}
          icon={Calendar}
          description={`${monthStart} - ${monthEnd}`}
          loading={allExpensesLoading || statsLoading}
        />
        <StatCard
          title="Despesas Fixas"
          value={formatCurrency(filteredStats?.fixedExpenses || 0)}
          icon={Repeat}
          description="Despesas recorrentes"
          loading={allExpensesLoading || statsLoading}
        />
        <StatCard
          title="Transações"
          value={String(filteredStats?.expenseCount || 0)}
          icon={PiggyBank}
          description="Total de registros"
          loading={allExpensesLoading || statsLoading}
        />
        {(stats?.monthlyIncome || 0) > 0 ? (
          <StatCard
            title="Saldo Restante"
            value={formatCurrency((stats?.monthlyIncome || 0) - (filteredStats?.monthlySpent || 0))}
            icon={Wallet}
            description="Renda mensal - despesas do mês"
            loading={allExpensesLoading || statsLoading}
          />
        ) : (
          <StatCard
            title="Saldo Restante"
            value="Adicione sua renda"
            icon={Wallet}
            description="Para calcular o saldo disponível"
            loading={allExpensesLoading || statsLoading}
          />
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {allExpensesLoading || statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : categoryEntries.length > 0 ? (
              categoryEntries.slice(0, 5).map(([category, amount]) => (
                <CategoryCard
                  key={category}
                  category={category}
                  amount={amount}
                  total={filteredStats?.totalSpent || 0}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhuma despesa registrada ainda
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-4 sm:gap-6">
              {(() => {
                const pendingCount = pendingFixedExpenses?.length || 0;
                const recentCount = filteredRecentExpenses?.length || 0;

                const sections = [
                  {
                    key: 'pending',
                    title: 'Fixas Pendentes',
                    data: pendingFixedExpenses,
                    loading: pendingLoading,
                    emptyIcon: Check,
                    emptyText: 'Nenhuma pendente',
                    slice: 5
                  },
                  {
                    key: 'recent',
                    title: 'Recentes',
                    data: filteredRecentExpenses,
                    loading: recentLoading,
                    emptyIcon: Wallet,
                    emptyText: 'Nenhuma recente',
                    slice: 5
                  }
                ];

                // Para telas xl+, sempre mostrar ambas as seções empilhadas
                // Para telas menores, mostrar apenas seções com conteúdo
                const isLargeScreen = typeof window !== 'undefined' && window.innerWidth >= 1280;
                const sectionsToShow = isLargeScreen 
                  ? sections 
                  : sections.filter(section => 
                      (section.data && section.data.length > 0) || section.loading
                    );

                return sectionsToShow.map((section) => (
                  <div key={section.key}>
                    <h3 className="font-medium text-sm text-muted-foreground mb-3">{section.title}</h3>
                    {section.loading ? (
                      <div className="flex flex-col gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : section.data && section.data.length > 0 ? (
                      <div className="divide-y">
                        {section.data.slice(0, section.slice).map((expense) => (
                          <RecentExpenseItem key={expense.id} expense={expense} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <section.emptyIcon className="h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {section.emptyText}
                        </p>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
