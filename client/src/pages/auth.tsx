import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Receipt,
  Loader2,
  Instagram,
  Copyright,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";

/* ================= SCHEMAS ================= */
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPasswords, setShowRegisterPasswords] = useState(false);

  const { login, register } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    setShowLoginPassword(false);
    setShowRegisterPasswords(false);
    loginForm.reset();
    registerForm.reset();
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description:
          error instanceof Error ? error.message : "Credenciais inválidas",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await register(data.name, data.email, data.password);
      toast({
        title: "Conta criada!",
        description: "Sua conta foi criada com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a conta",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-primary lg:flex items-center justify-center">
        <div className="text-center text-primary-foreground max-w-md">
          <Receipt className="mx-auto mb-6 h-10 w-10" />
          <h1 className="mb-3 text-4xl font-bold">AppFinance</h1>
          <p className="opacity-90">
            Controle suas finanças de forma simples e eficiente.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>{isLogin ? "Entrar" : "Criar Conta"}</CardTitle>
              <CardDescription>
                {isLogin
                  ? "Entre com suas credenciais"
                  : "Crie sua conta gratuitamente"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* ================= LOGIN ================= */}
              {isLogin ? (
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              autoComplete="email"
                              placeholder="seu@email.com"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showLoginPassword ? "text" : "password"}
                                autoComplete="current-password"
                                className="pr-10"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowLoginPassword((p) => !p)
                                }
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showLoginPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button className="w-full" disabled={isLoading}>
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Entrar
                    </Button>
                  </form>
                </Form>
              ) : (
                /* ================= CADASTRO ================= */
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    {/* ✅ CONTROLLER PARA NOME */}
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Controller
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              placeholder="Seu nome"
                              autoComplete="name"
                            />
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    {/* ✅ CONTROLLER PARA EMAIL */}
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Controller
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                            />
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    {/* ✅ FORMFIELD PARA SENHA (sem Controller) */}
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showRegisterPasswords ? "text" : "password"}
                                autoComplete="new-password"
                                className="pr-10"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowRegisterPasswords((p) => !p)
                                }
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showRegisterPasswords ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* ✅ FORMFIELD PARA CONFIRMAR SENHA (sem Controller) */}
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Senha</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type={showRegisterPasswords ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="••••••••"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button className="w-full" disabled={isLoading}>
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Criar Conta
                    </Button>
                  </form>
                </Form>
              )}

              <div className="mt-6 text-center text-sm">
                {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
                <button
                  onClick={switchMode}
                  className="font-medium text-primary hover:underline"
                >
                  {isLogin ? "Criar conta" : "Entrar"}
                </button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Copyright className="h-3 w-3" />
            <span>Rodrigo Pires Figueiredo | 2025</span>
            <a
              href="https://instagram.com/_pires.r"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
