import { sql, relations } from "drizzle-orm";
import { pgTable, text, serial, numeric, boolean, timestamp, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  expenses: many(expenses),
  incomes: many(incomes),
  earnings: many(earnings),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  unitValue: numeric("unit_value", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  totalValue: numeric("total_value", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  account: text("account"),
  location: text("location"),
  isFixed: boolean("is_fixed").notNull().default(false),
  paymentDate: date("payment_date"),
  isPaid: boolean("is_paid").notNull().default(false),
  installments: integer("installments"),
  installmentNumber: integer("installment_number"),
  originalExpenseId: integer("original_expense_id"),
  notes: text("notes"),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  isMonthly: boolean("is_monthly").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, {
    fields: [incomes.userId],
    references: [users.id],
  }),
}));

export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  client: text("client"),
});

export const earningsRelations = relations(earnings, ({ one }) => ({
  user: one(users, {
    fields: [earnings.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
}).extend({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

export const updateUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
}).extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().min(6, "Código deve ter 6 dígitos"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  userId: true,
  totalValue: true,
}).extend({
  date: z.string(),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  unitValue: z.string().refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 1000000000;
  }, "Valor deve ser maior que zero e no máximo 1 bilhão"),
  quantity: z.number().int().min(1, "Quantidade deve ser pelo menos 1"),
  paymentMethod: z.string().min(1, "Forma de pagamento é obrigatória"),
  account: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  isFixed: z.boolean().default(false),
  paymentDate: z.string().optional(),
  isPaid: z.boolean().default(false),
  installments: z.number().int().min(1).max(60).optional(),
  installmentNumber: z.number().int().min(1).optional(),
  originalExpenseId: z.number().int().optional(),
  notes: z.string().optional().nullable(),
});

export const updateExpenseSchema = insertExpenseSchema.partial();

export const insertIncomeSchema = createInsertSchema(incomes).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().refine(val => {
    const num = parseFloat(val.replace(",", "."));
    return !isNaN(num) && num > 0 && num <= 1000000000;
  }, "Valor deve ser maior que zero e no máximo 1 bilhão"),
  isMonthly: z.boolean().default(true),
});

export const updateIncomeSchema = insertIncomeSchema.partial();

export const insertEarningSchema = createInsertSchema(earnings).omit({
  id: true,
  userId: true,
}).extend({
  date: z.string().refine(val => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && val.match(/^\d{4}-\d{2}-\d{2}$/);
  }, "Data deve estar no formato YYYY-MM-DD"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().refine(val => {
    const num = parseFloat(val.replace(",", "."));
    return !isNaN(num) && num > 0 && num <= 1000000000;
  }, "Valor deve ser maior que zero e no máximo 1 bilhão"),
  client: z.string().optional().nullable(),
});

export const updateEarningSchema = insertEarningSchema.partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdatePassword = z.infer<typeof updatePasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type VerifyResetCode = z.infer<typeof verifyResetCodeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type UserWithoutPassword = Omit<User, "password">;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type UpdateExpense = z.infer<typeof updateExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Tipo extendido para despesas com informações de parcelas calculadas
export type ExpenseWithInstallments = Expense & {
  currentInstallment?: number;
  totalInstallments?: number;
  currentInstallmentValue?: number;
  displayDescription?: string;
};

export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type UpdateIncome = z.infer<typeof updateIncomeSchema>;
export type Income = typeof incomes.$inferSelect;

export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type UpdateEarning = z.infer<typeof updateEarningSchema>;
export type Earning = typeof earnings.$inferSelect;

export type RefreshToken = typeof refreshTokens.$inferSelect;

export const CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Vestuário",
  "Serviços",
  "Pet",
  "Outros",
] as const;

export const PAYMENT_METHODS = [
  "Cartão de Crédito",
  "Cartão de Débito",
  "PIX",
  "VR",
  "VA",
  "VT",
  "Dinheiro",
  "Transferência",
  "Boleto",
] as const;
