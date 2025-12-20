import {
  users,
  expenses,
  incomes,
  earnings,
  refreshTokens,
  type User,
  type InsertUser,
  type Expense,
  type InsertExpense,
  type Income,
  type InsertIncome,
  type Earning,
  type InsertEarning,
  type InsertIncome,
  type RefreshToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<Pick<User, "name" | "email">>): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined>;
  updateUserPasswordByEmail(email: string, hashedPassword: string): Promise<boolean>;
  
  createRefreshToken(userId: number, token: string, expiresAt: Date): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteUserRefreshTokens(userId: number): Promise<void>;
  
  getExpenses(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      fixed?: boolean;
      paid?: boolean;
    }
  ): Promise<{ expenses: Expense[]; total: number }>;
  getExpense(id: number, userId: number): Promise<Expense | undefined>;
  createExpense(expense: Omit<Expense, "id">): Promise<Expense>;
  updateExpense(id: number, userId: number, data: Partial<Omit<Expense, "id" | "userId">>): Promise<Expense | undefined>;
  deleteExpense(id: number, userId: number): Promise<boolean>;
  getExpenseStats(userId: number): Promise<{
    totalSpent: number;
    monthlySpent: number;
    fixedExpenses: number;
    expenseCount: number;
    categoryBreakdown: Record<string, number>;
    monthlyIncome: number;
    incomeCount: number;
  }>;
  getAutocomplete(userId: number, query: string): Promise<string[]>;

  getIncomes(userId: number): Promise<Income[]>;
  getIncome(id: number, userId: number): Promise<Income | undefined>;
  createIncome(income: Omit<Income, "id" | "createdAt">): Promise<Income>;
  updateIncome(id: number, userId: number, data: Partial<Omit<Income, "id" | "userId" | "createdAt">>): Promise<Income | undefined>;
  deleteIncome(id: number, userId: number): Promise<boolean>;

  getEarnings(userId: number, options?: { sortBy?: string }): Promise<Earning[]>;
  getEarning(id: number, userId: number): Promise<Earning | undefined>;
  createEarning(earning: Omit<Earning, "id">): Promise<Earning>;
  updateEarning(id: number, userId: number, data: Partial<Omit<Earning, "id" | "userId">>): Promise<Earning | undefined>;
  deleteEarning(id: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<Pick<User, "name" | "email">>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserPasswordByEmail(email: string, hashedPassword: string): Promise<boolean> {
    const result = await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email));
    return result.rowCount > 0;
  }

  async createRefreshToken(userId: number, token: string, expiresAt: Date): Promise<RefreshToken> {
    const [refreshToken] = await db
      .insert(refreshTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return refreshToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token));
    return refreshToken || undefined;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteUserRefreshTokens(userId: number): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  async getExpenses(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      fixed?: boolean;
      paid?: boolean;
      sortBy?: string;
    } = {}
  ): Promise<{ expenses: Expense[]; total: number }> {
    const { page = 1, limit = 10, search, category, startDate, endDate, fixed, paid, sortBy = "date_desc" } = options;
    const offset = (page - 1) * limit;

    const conditions = [eq(expenses.userId, userId)];

    if (search) {
      conditions.push(sql`${expenses.description} LIKE ${`%${search}%`}`);
    }
    if (category) {
      conditions.push(eq(expenses.category, category));
    }
    if (startDate) {
      conditions.push(gte(expenses.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(expenses.date, endDate));
    }
    if (fixed !== undefined) {
      conditions.push(eq(expenses.isFixed, fixed));
    }
    if (paid !== undefined) {
      conditions.push(eq(expenses.isPaid, paid));
    }

    const whereClause = and(...conditions);

    // Define ordenação baseada no parâmetro sortBy
    let orderByClause;
    switch (sortBy) {
      case "date_asc":
        // Ordenação ascendente — usa uma expressão condicional para escolher a data correta:
        // - Se é fixa e ainda não paga, usa a data de registro (date)
        // - Se tem paymentDate (foi paga), usa paymentDate
        // - Caso contrário, usa date
        orderByClause = asc(sql`CASE WHEN ${expenses.isFixed} = true AND ${expenses.isPaid} = false THEN ${expenses.date} WHEN ${expenses.paymentDate} IS NOT NULL THEN ${expenses.paymentDate} ELSE ${expenses.date} END`);
        break;
      case "amount_desc":
        // Para ordenação por valor, usar uma expressão que calcula o valor correto
        // Se tem installments, usar totalValue / installments, senão usar totalValue
        orderByClause = desc(sql`CASE WHEN ${expenses.installments} IS NOT NULL AND ${expenses.installments} > 1 THEN ${expenses.totalValue} / ${expenses.installments} ELSE ${expenses.totalValue} END`);
        break;
      case "amount_asc":
        orderByClause = asc(sql`CASE WHEN ${expenses.installments} IS NOT NULL AND ${expenses.installments} > 1 THEN ${expenses.totalValue} / ${expenses.installments} ELSE ${expenses.totalValue} END`);
        break;
      case "date_desc":
      default:
        // Ordenação descendente — usa a mesma expressão condicional explicita para escolher a data correta
        orderByClause = desc(sql`CASE WHEN ${expenses.isFixed} = true AND ${expenses.isPaid} = false THEN ${expenses.date} WHEN ${expenses.paymentDate} IS NOT NULL THEN ${expenses.paymentDate} ELSE ${expenses.date} END`);
        break;
    }

    const [expensesList, countResult] = await Promise.all([
      db
        .select()
        .from(expenses)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(expenses)
        .where(whereClause),
    ]);

    return {
      expenses: expensesList,
      total: countResult[0]?.count || 0,
    };
  }

  async getExpense(id: number, userId: number): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
    return expense || undefined;
  }

  async createExpense(expense: Omit<Expense, "id">): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(
    id: number,
    userId: number,
    data: Partial<Omit<Expense, "id" | "userId">>
  ): Promise<Expense | undefined> {
    const [updated] = await db
      .update(expenses)
      .set(data)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteExpense(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning({ id: expenses.id });
    return result.length > 0;
  }

  async getExpenseStats(userId: number): Promise<{
    totalSpent: number;
    monthlySpent: number;
    fixedExpenses: number;
    expenseCount: number;
    categoryBreakdown: Record<string, number>;
    monthlyIncome: number;
    incomeCount: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDateStr = startOfMonth.toISOString().split("T")[0];
    const endDateStr = endOfMonth.toISOString().split("T")[0];

    const [totalResult, monthlyResult, fixedResult, countResult, categoryResult, incomeResult, incomeCountResult, earningsResult] =
      await Promise.all([
        db
          .select({ total: sql<number>`COALESCE(SUM(total_value), 0)` })
          .from(expenses)
          .where(eq(expenses.userId, userId)),
        db
          .select({ total: sql<number>`COALESCE(SUM(total_value), 0)` })
          .from(expenses)
          .where(
            and(
              eq(expenses.userId, userId),
              gte(expenses.date, startDateStr),
              lte(expenses.date, endDateStr)
            )
          ),
        db
          .select({ total: sql<number>`COALESCE(SUM(total_value), 0)` })
          .from(expenses)
          .where(and(eq(expenses.userId, userId), eq(expenses.isFixed, true))),
        db
          .select({ count: sql<number>`count(*)` })
          .from(expenses)
          .where(eq(expenses.userId, userId)),
        db
          .select({
            category: expenses.category,
            total: sql<number>`SUM(total_value)`,
          })
          .from(expenses)
          .where(eq(expenses.userId, userId))
          .groupBy(expenses.category),
        db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(incomes)
          .where(and(eq(incomes.userId, userId), eq(incomes.isMonthly, true))),
        db
          .select({ count: sql<number>`count(*)` })
          .from(incomes)
          .where(eq(incomes.userId, userId)),
        db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(earnings)
          .where(
            and(
              eq(earnings.userId, userId),
              gte(earnings.date, startDateStr),
              lte(earnings.date, endDateStr)
            )
          ),
      ]);

    const categoryBreakdown: Record<string, number> = {};
    for (const row of categoryResult) {
      categoryBreakdown[row.category] = Number(row.total) || 0;
    }

    return {
      totalSpent: Number(totalResult[0]?.total) || 0,
      monthlySpent: Number(monthlyResult[0]?.total) || 0,
      fixedExpenses: Number(fixedResult[0]?.total) || 0,
      expenseCount: countResult[0]?.count || 0,
      categoryBreakdown,
      monthlyIncome: (Number(incomeResult[0]?.total) || 0) + (Number(earningsResult[0]?.total) || 0),
      incomeCount: incomeCountResult[0]?.count || 0,
    };
  }

  async getAutocomplete(userId: number, query: string): Promise<string[]> {
    const results = await db
      .selectDistinct({ description: expenses.description })
      .from(expenses)
      .where(
        and(eq(expenses.userId, userId), sql`${expenses.description} LIKE ${`%${query}%`}`)
      )
      .limit(10);
    return results.map((r: {description: string}) => r.description);
  }

  async getIncomes(userId: number): Promise<Income[]> {
    return await db
      .select()
      .from(incomes)
      .where(eq(incomes.userId, userId))
      .orderBy(desc(incomes.createdAt));
  }

  async getIncome(id: number, userId: number): Promise<Income | undefined> {
    const [income] = await db
      .select()
      .from(incomes)
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)));
    return income || undefined;
  }

  async createIncome(income: Omit<Income, "id" | "createdAt">): Promise<Income> {
    const [newIncome] = await db.insert(incomes).values(income).returning();
    return newIncome;
  }

  async updateIncome(id: number, userId: number, data: Partial<Omit<Income, "id" | "userId" | "createdAt">>): Promise<Income | undefined> {
    const [income] = await db.update(incomes).set(data).where(and(eq(incomes.id, id), eq(incomes.userId, userId))).returning();
    return income || undefined;
  }

  async deleteIncome(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId)));
    return result.rowCount > 0;
  }

  async getEarnings(userId: number, options: { sortBy?: string } = {}): Promise<Earning[]> {
    const { sortBy = "date_desc" } = options;

    let orderByClause;
    switch (sortBy) {
      case "date_asc":
        orderByClause = [asc(earnings.date), asc(earnings.id)];
        break;
      case "amount_desc":
        orderByClause = [desc(earnings.amount), desc(earnings.id)];
        break;
      case "amount_asc":
        orderByClause = [asc(earnings.amount), asc(earnings.id)];
        break;
      case "date_desc":
      default:
        orderByClause = [desc(earnings.date), desc(earnings.id)];
        break;
    }

    return await db
      .select()
      .from(earnings)
      .where(eq(earnings.userId, userId))
      .orderBy(orderByClause[0], orderByClause[1]);
  }

  async getEarning(id: number, userId: number): Promise<Earning | undefined> {
    const [earning] = await db
      .select()
      .from(earnings)
      .where(and(eq(earnings.id, id), eq(earnings.userId, userId)));
    return earning || undefined;
  }

  async createEarning(earning: Omit<Earning, "id">): Promise<Earning> {
    const [newEarning] = await db.insert(earnings).values(earning).returning();
    return newEarning;
  }

  async updateEarning(id: number, userId: number, data: Partial<Omit<Earning, "id" | "userId">>): Promise<Earning | undefined> {
    const [earning] = await db.update(earnings).set(data).where(and(eq(earnings.id, id), eq(earnings.userId, userId))).returning();
    return earning || undefined;
  }

  async deleteEarning(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(earnings).where(and(eq(earnings.id, id), eq(earnings.userId, userId)));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
