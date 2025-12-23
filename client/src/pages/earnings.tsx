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
  TrendingUp,
  Copy,
  ArrowUpDown,
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
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { EarningForm } from "@/components/earning-form";
import { Link } from "wouter";
import type { Earning, Income } from "@shared/schema";

function formatCurrency(value: string | number) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue);
}

function EarningCard({
  earning,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  earning: Earning;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{earning.description}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {earning.client && (
                <Badge variant="secondary" className="text-xs">
                  {earning.client}
                </Badge>
              )}
            </div>
          </div>
          <div className="font-mono font-semibold">
            {formatCurrency(parseFloat(earning.amount.toString()))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span>{(() => {
              const [year, month, day] = earning.date.split('-');
              return `${day}/${month}/${year}`;
            })()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar receita">
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

function EarningRow({
  earning,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  earning: Earning;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{earning.description}</span>
            {earning.client && (
              <Badge variant="secondary" className="text-xs">
                {earning.client}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{(() => {
              const [year, month, day] = earning.date.split('-');
              return `${day}/${month}/${year}`;
            })()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end">
        <div className="font-mono font-semibold sm:mr-4">
          {formatCurrency(parseFloat(earning.amount.toString()))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar receita">
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
    </div>
  );
}

export default function Earnings() {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEarning, setEditingEarning] = useState<Earning | null>(null);
  const [duplicatingEarning, setDuplicatingEarning] = useState<Earning | null>(null);
  const [deletingEarning, setDeletingEarning] = useState<Earning | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Income management
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncomeValue, setTempIncomeValue] = useState("");

  const { data: earnings, isLoading } = useQuery<Earning[]>({
    queryKey: ["earnings", { sortBy, dateFilter }],
    queryFn: async () => {
      const token = await getAccessToken();
      const params = new URLSearchParams();
      if (sortBy) params.set("sortBy", sortBy);
      
      // Add date parameters
      const dateParams = getDateParams();
      if (dateParams.startDate) params.set("startDate", dateParams.startDate);
      if (dateParams.endDate) params.set("endDate", dateParams.endDate);
      
      const response = await fetch(`/api/earnings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch earnings");
      return response.json();
    },
  });

  const { data: incomes } = useQuery<Income[]>({
    queryKey: ["incomes"],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch("/api/incomes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch incomes");
      return response.json();
    },
  });

  // Get available years from earnings
  const availableYears = Array.from(
    new Set(earnings?.map(earning => earning.date.split('-')[0]) || [])
  ).sort((a, b) => parseInt(b) - parseInt(a));

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getAccessToken();
      const response = await fetch(`/api/earnings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete earning");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["earnings"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["expenses-stats"] });
      toast({
        title: "Sucesso",
        description: "Receita excluída com sucesso",
      });
      setDeletingEarning(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir receita",
        variant: "destructive",
      });
    },
  });

  const filteredEarnings = earnings?.filter((earning) => {
    const matchesSearch = earning.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      earning.client?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  }) || [];

  const totalPages = Math.ceil(filteredEarnings.length / itemsPerPage);
  const paginatedEarnings = filteredEarnings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalEarnings = filteredEarnings.reduce((sum, earning) => sum + parseFloat(earning.amount.toString()), 0);

  const handleEdit = (earning: Earning) => {
    setEditingEarning(earning);
    setIsFormOpen(true);
  };

  const handleDuplicate = (earning: Earning) => {
    setDuplicatingEarning(earning);
    setIsFormOpen(true);
  };

  const handleDelete = (earning: Earning) => {
    setDeletingEarning(earning);
  };

  const confirmDelete = () => {
    if (deletingEarning) {
      deleteMutation.mutate(deletingEarning.id);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEarning(null);
    setDuplicatingEarning(null);
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["earnings"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["expenses-stats"], exact: false });
    setIsFormOpen(false);
    setEditingEarning(null);
    setDuplicatingEarning(null);
  };

  const handleEditIncome = () => {
    const monthlyIncome = incomes?.find(income => income.isMonthly);
    setTempIncomeValue(monthlyIncome ? monthlyIncome.amount.toString() : "");
    setIsEditingIncome(true);
  };

  const handleSaveIncome = async () => {
    if (!tempIncomeValue) return;

    try {
      const token = await getAccessToken();
      const monthlyIncome = incomes?.find(income => income.isMonthly);

      if (monthlyIncome) {
        // Update existing
        const response = await fetch(`/api/incomes/${monthlyIncome.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: tempIncomeValue.replace(",", "."),
          }),
        });
        if (!response.ok) throw new Error("Failed to update income");
      } else {
        // Create new
        const response = await fetch("/api/incomes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            description: "Renda Mensal",
            amount: tempIncomeValue.replace(",", "."),
            isMonthly: true,
          }),
        });
        if (!response.ok) throw new Error("Failed to create income");
      }

      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-stats"] });
      setIsEditingIncome(false);
      setTempIncomeValue("");
      toast({
        title: "Sucesso",
        description: "Renda mensal atualizada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar renda mensal",
        variant: "destructive",
      });
    }
  };

  const handleCancelIncomeEdit = () => {
    setIsEditingIncome(false);
    setTempIncomeValue("");
  };

  const handleDeleteIncome = async () => {
    if (!confirm("Tem certeza que deseja remover a renda mensal?")) return;

    try {
      const token = await getAccessToken();
      const monthlyIncomes = incomes?.filter(income => income.isMonthly) || [];

      for (const income of monthlyIncomes) {
        const response = await fetch(`/api/incomes/${income.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status !== 404 && !response.ok) throw new Error("Failed to delete income");
      }

      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-stats"] });
      toast({
        title: "Sucesso",
        description: "Renda mensal removida com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover renda mensal",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Receitas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas receitas e ganhos extras
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Receita
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Renda Mensal</CardTitle>
            <CardDescription>
              Configure sua renda mensal fixa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingIncome ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={tempIncomeValue}
                  onChange={(e) => setTempIncomeValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveIncome();
                    if (e.key === 'Escape') handleCancelIncomeEdit();
                  }}
                  onBlur={handleSaveIncome}
                  placeholder="Ex: 5000"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground">BRL</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(Number(incomes?.find(i => i.isMonthly)?.amount || 0))}
                  </p>
                  <p className="text-sm text-muted-foreground">Renda mensal</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleEditIncome}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {(Number(incomes?.find(i => i.isMonthly)?.amount || 0) > 0 && (
                    <Button variant="outline" size="sm" onClick={handleDeleteIncome}>
                      <X className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Total de Receitas</CardTitle>
            <CardDescription>
              Valor total das receitas registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalEarnings)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filteredEarnings.length} receita{filteredEarnings.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                  Lista de Receitas
                </CardTitle>
                <CardDescription>
                  Visualize e gerencie todas as suas receitas registradas
                </CardDescription>
              </div>
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
                        onValueChange={(value: 'all' | 'year' | 'month' | 'range') =>
                          setDateFilter(prev => ({ ...prev, mode: value }))
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
                            <Button variant="ghost" size="sm" onClick={() => setDateFilter(prev => ({ ...prev, years: [] }))}>
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
                              <Button variant="ghost" size="sm" onClick={() => setDateFilter(prev => ({ ...prev, years: [] }))}>
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
                              <Button variant="ghost" size="sm" onClick={() => setDateFilter(prev => ({ ...prev, months: [] }))}>
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
                              onChange={(e) =>
                                setDateFilter(prev => ({
                                  ...prev,
                                  from: e.target.value
                                }))
                              }
                              className="flex-1"
                            />
                            {dateFilter.from && (
                              <Button variant="ghost" size="sm" onClick={() => setDateFilter(prev => ({ ...prev, from: '' }))}>
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
                              <Button variant="ghost" size="sm" onClick={() => setDateFilter(prev => ({ ...prev, to: '' }))}>
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
          </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
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
            </div>

            <div className="space-y-4">
              {paginatedEarnings.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">Nenhuma receita encontrada</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm ? "Tente ajustar sua busca" : "Comece adicionando sua primeira receita"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden sm:block">
                    {paginatedEarnings.map((earning) => (
                      <EarningRow
                        key={earning.id}
                        earning={earning}
                        onEdit={() => handleEdit(earning)}
                        onDelete={() => handleDelete(earning)}
                        onDuplicate={() => handleDuplicate(earning)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:hidden">
                    {paginatedEarnings.map((earning) => (
                      <EarningCard
                        key={earning.id}
                        earning={earning}
                        onEdit={() => handleEdit(earning)}
                        onDelete={() => handleDelete(earning)}
                        onDuplicate={() => handleDuplicate(earning)}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {paginatedEarnings.length} de {filteredEarnings.length} receitas
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEarning ? "Editar Receita" : duplicatingEarning ? "Duplicar Receita" : "Nova Receita"}
            </DialogTitle>
          </DialogHeader>
          <EarningForm
            earning={editingEarning}
            initialData={duplicatingEarning}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEarning} onOpenChange={() => setDeletingEarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Receita</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a receita "{deletingEarning?.description}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}