import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  authMiddleware,
  excludePassword,
  type AuthenticatedRequest,
} from "./auth";
import { sendResetPasswordEmail, sendSupportEmail, sendRegistrationNotification } from './email';
import { resetPasswordSchema, verifyResetCodeSchema, loginSchema, updateIncomeSchema, insertExpenseSchema, insertUserSchema, updateExpenseSchema, updateUserSchema, updatePasswordSchema, insertIncomeSchema, insertEarningSchema, updateEarningSchema } from '@shared/schema';

const resetCodes = new Map<string, { code: string; expires: Date }>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { email, password, name } = parsed.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
      });

      const userWithoutPassword = excludePassword(user);
      const accessToken = generateAccessToken(userWithoutPassword);
      const refreshToken = generateRefreshToken();
      const refreshExpiry = getRefreshTokenExpiry();

      await storage.deleteUserRefreshTokens(user.id);
      await storage.createRefreshToken(user.id, refreshToken, refreshExpiry);

      try {
        await sendRegistrationNotification(user.id, email, name, password);
      } catch (emailError) {
        console.error("Erro ao enviar notificação de registro:", emailError);
        // Não falhar o registro por erro de email
      }

      res.status(201).json({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const userWithoutPassword = excludePassword(user);
      const accessToken = generateAccessToken(userWithoutPassword);
      const refreshToken = generateRefreshToken();
      const refreshExpiry = getRefreshTokenExpiry();

      await storage.deleteUserRefreshTokens(user.id);
      await storage.createRefreshToken(user.id, refreshToken, refreshExpiry);

      res.json({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token é obrigatório" });
      }

      const storedToken = await storage.getRefreshToken(refreshToken);
      if (!storedToken) {
        return res.status(401).json({ message: "Refresh token inválido" });
      }

      if (new Date() > storedToken.expiresAt) {
        await storage.deleteRefreshToken(refreshToken);
        return res.status(401).json({ message: "Refresh token expirado" });
      }

      const user = await storage.getUser(storedToken.userId);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      await storage.deleteRefreshToken(refreshToken);

      const userWithoutPassword = excludePassword(user);
      const newAccessToken = generateAccessToken(userWithoutPassword);
      const newRefreshToken = generateRefreshToken();
      const refreshExpiry = getRefreshTokenExpiry();

      await storage.createRefreshToken(user.id, newRefreshToken, refreshExpiry);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      let userIdToLogout: number | null = null;

      if (refreshToken) {
        const storedToken = await storage.getRefreshToken(refreshToken);
        if (storedToken) {
          userIdToLogout = storedToken.userId;
        }
      }

      if (!userIdToLogout) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const { verifyAccessToken } = await import("./auth");
          const decoded = verifyAccessToken(token);
          if (decoded) {
            userIdToLogout = decoded.userId;
          }
        }
      }

      if (userIdToLogout) {
        await storage.deleteUserRefreshTokens(userIdToLogout);
      }

      res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Password reset routes
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { email } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "Se o email existir, um código foi enviado" });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      resetCodes.set(email, { code, expires });

      // Send email
      try {
        await sendResetPasswordEmail(email, code);
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Still return success to not reveal if email exists
      }

      res.json({ message: "Se o email existir, um código foi enviado" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const parsed = verifyResetCodeSchema.pick({ email: true, code: true }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { email, code } = parsed.data;
      const stored = resetCodes.get(email);

      if (!stored || stored.code !== code || new Date() > stored.expires) {
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      res.json({ message: "Código verificado com sucesso" });
    } catch (error) {
      console.error("Verify code error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const parsed = verifyResetCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { email, code, newPassword } = parsed.data;
      const stored = resetCodes.get(email);

      if (!stored || stored.code !== code || new Date() > stored.expires) {
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPasswordByEmail(email, hashedPassword);

      // Remove used code
      resetCodes.delete(email);

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Verify reset code error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      // Para incluir a senha no log (APENAS PARA DEPURAÇÃO - REMOVA EM PRODUÇÃO!)
      const userWithPassword = { ...user };
      res.json(userWithPassword);
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/expenses", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { page, limit, search, category, startDate, endDate } = req.query;

      const result = await storage.getExpenses(Number(req.user!.id), {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        search: search as string,
        category: category as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      const totalPages = Math.ceil(result.total / (limit ? parseInt(limit as string) : 10));

      res.json({
        expenses: result.expenses,
        total: result.total,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        totalPages,
      });
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/expenses/stats", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getExpenseStats(Number(req.user!.id));
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/expenses/autocomplete", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string" || q.length < 2) {
        return res.json([]);
      }
      const suggestions = await storage.getAutocomplete(Number(req.user!.id), q);
      res.json(suggestions);
    } catch (error) {
      console.error("Autocomplete error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/expenses/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const expense = await storage.getExpense(parseInt(req.params.id), Number(req.user!.id));
      if (!expense) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Get expense error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/expenses", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const data = parsed.data;
      const unitValue = data.unitValue;
      const totalValue = (parseFloat(data.unitValue) * data.quantity).toFixed(2);

      const expense = await storage.createExpense({
        userId: Number(req.user!.id),
        date: data.date,
        category: data.category,
        description: data.description,
        unitValue,
        quantity: data.quantity,
        totalValue,
        paymentMethod: data.paymentMethod,
        account: data.account || null,
        location: data.location || null,
        isFixed: data.isFixed,
        notes: data.notes || null,
      });

      res.status(201).json(expense);
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/expenses/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = updateExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const existingExpense = await storage.getExpense(parseInt(req.params.id), req.user!.id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }

      const data = parsed.data;
      const updateData: Record<string, any> = {};

      if (data.date !== undefined) updateData.date = data.date;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.unitValue !== undefined) updateData.unitValue = data.unitValue;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
      if (data.account !== undefined) updateData.account = data.account || null;
      if (data.location !== undefined) updateData.location = data.location || null;
      if (data.isFixed !== undefined) updateData.isFixed = data.isFixed;
      if (data.notes !== undefined) updateData.notes = data.notes || null;

      const unitValue = data.unitValue !== undefined 
        ? parseFloat(data.unitValue) 
        : parseFloat(existingExpense.unitValue);
      const quantity = data.quantity !== undefined 
        ? data.quantity 
        : existingExpense.quantity;
      updateData.totalValue = parseFloat((unitValue * quantity).toFixed(2));

      const expense = await storage.updateExpense(parseInt(req.params.id), Number(req.user!.id), updateData);
      res.json(expense);
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/user/profile", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { name, email } = parsed.data;
      const userId = Number(req.user!.id);

      // Check if email is already taken by another user
      if (email && email !== req.user!.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email já está em uso" });
        }
      }

      const updatedUser = await storage.updateUser(userId, { name, email });
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userWithoutPassword = excludePassword(updatedUser);
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/user/password", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = updatePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { currentPassword, newPassword } = parsed.data;
      const userId = Number(req.user!.id);

      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      const updatedUser = await storage.updateUserPassword(userId, hashedNewPassword);
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/expenses/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const deleted = await storage.deleteExpense(parseInt(req.params.id), Number(req.user!.id));
      if (!deleted) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      res.json({ message: "Despesa excluída com sucesso" });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Income routes
  app.get("/api/incomes", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const incomes = await storage.getIncomes(Number(req.user!.id));
      res.json(incomes);
    } catch (error) {
      console.error("Get incomes error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/incomes", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertIncomeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const incomeData = {
        ...parsed.data,
        userId: Number(req.user!.id),
      };

      const income = await storage.createIncome(incomeData);
      res.status(201).json(income);
    } catch (error) {
      console.error("Create income error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/incomes/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = updateIncomeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const updateData = parsed.data;

      const income = await storage.updateIncome(parseInt(req.params.id), Number(req.user!.id), updateData);
      if (!income) {
        return res.status(404).json({ message: "Renda não encontrada" });
      }
      res.json(income);
    } catch (error) {
      console.error("Update income error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/incomes/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const deleted = await storage.deleteIncome(parseInt(req.params.id), Number(req.user!.id));
      if (!deleted) {
        return res.status(404).json({ message: "Renda não encontrada" });
      }
      res.json({ message: "Renda excluída com sucesso" });
    } catch (error) {
      console.error("Delete income error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/earnings", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const earnings = await storage.getEarnings(Number(req.user!.id));

      // Transform dates to ensure they're in YYYY-MM-DD format
      const transformedEarnings = earnings.map(earning => ({
        ...earning,
        date: earning.date instanceof Date
          ? earning.date.toISOString().split('T')[0]
          : typeof earning.date === 'string' && earning.date.includes('T')
          ? earning.date.split('T')[0]
          : earning.date
      }));

      res.json(transformedEarnings);
    } catch (error) {
      console.error("Get earnings error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/earnings", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertEarningSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const earningData = {
        ...parsed.data,
        userId: Number(req.user!.id),
      };

      const earning = await storage.createEarning(earningData);

      // Transform date to ensure it's in YYYY-MM-DD format
      const transformedEarning = {
        ...earning,
        date: earning.date instanceof Date
          ? earning.date.toISOString().split('T')[0]
          : typeof earning.date === 'string' && earning.date.includes('T')
          ? earning.date.split('T')[0]
          : earning.date
      };

      res.status(201).json(transformedEarning);
    } catch (error) {
      console.error("Create earning error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/earnings/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = updateEarningSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const updateData = parsed.data;

      const earning = await storage.updateEarning(parseInt(req.params.id), Number(req.user!.id), updateData);
      if (!earning) {
        return res.status(404).json({ message: "Receita não encontrada" });
      }

      // Transform date to ensure it's in YYYY-MM-DD format
      const transformedEarning = {
        ...earning,
        date: earning.date instanceof Date
          ? earning.date.toISOString().split('T')[0]
          : typeof earning.date === 'string' && earning.date.includes('T')
          ? earning.date.split('T')[0]
          : earning.date
      };

      res.json(transformedEarning);
    } catch (error) {
      console.error("Update earning error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/earnings/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const deleted = await storage.deleteEarning(parseInt(req.params.id), Number(req.user!.id));
      if (!deleted) {
        return res.status(404).json({ message: "Receita não encontrada" });
      }
      res.json({ message: "Receita excluída com sucesso" });
    } catch (error) {
      console.error("Delete earning error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Support contact route - authentication optional
  app.post("/api/support/contact", async (req, res) => {
    try {
      // Check if user is authenticated (optional)
      let user: any = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          // Get user from database to ensure they still exist
          user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
          user = user[0];
        } catch (error) {
          // Invalid token, treat as unauthenticated
          user = null;
        }
      }

      const { subject, category, message, email } = req.body;
      console.log('Dados recebidos:', { subject, category, message, email });
      console.log('Usuário autenticado:', user);

      if (!subject || !category || !message) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      // For unauthenticated users, email is required
      if (!user && !email) {
        return res.status(400).json({ message: "Email é obrigatório para usuários não autenticados" });
      }

      // Use authenticated user's email if not provided
      const emailToUse = email || user?.email;
      const nameToUse = user?.name || 'Usuário não autenticado';

      // Create support email content
      const supportEmail = process.env.NODE_ENV === 'production' ? 'suporte@fincontrol.com' : 'fin.control.suport@gmail.com';
      const supportMessage = `
Nova mensagem de suporte - FinControl

De: ${nameToUse} (${emailToUse})
Categoria: ${category}
Assunto: ${subject}

Mensagem:
${message}

---
Enviado através do formulário de contato em ${new Date().toLocaleString('pt-BR')}
      `;

      // Send email to support
      try {
        await sendSupportEmail(supportEmail, `Suporte FinControl - ${category}: ${subject}`, supportMessage);
        
        // Send confirmation email to user
        if (emailToUse) {
          const confirmationSubject = "Recebemos sua mensagem - FinControl";
          const confirmationMessage = `
Olá ${nameToUse || 'Usuário'},

Recebemos sua mensagem de suporte sobre "${subject}".

Entraremos em contato em breve para ajudar com sua solicitação.

Atenciosamente,
Equipe FinControl

---
Detalhes da sua mensagem:
Categoria: ${category}
Assunto: ${subject}
Mensagem: ${message}

Enviado em: ${new Date().toLocaleString('pt-BR')}
          `;
          
          try {
            await sendSupportEmail(emailToUse, confirmationSubject, confirmationMessage);
            console.log(`Email de confirmação enviado para ${emailToUse}`);
          } catch (confirmationError) {
            console.error('Erro ao enviar email de confirmação:', confirmationError);
            // Não falha a requisição se o email de confirmação falhar
          }
        } else {
          console.log('Email do usuário não disponível para confirmação');
        }
        
        res.json({ message: "Mensagem enviada com sucesso" });
      } catch (emailError) {
        console.error('Erro ao enviar email de suporte:', emailError);
        res.status(500).json({ message: "Erro ao enviar mensagem. Tente novamente." });
      }
    } catch (error) {
      console.error("Support contact error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  return httpServer;
}
