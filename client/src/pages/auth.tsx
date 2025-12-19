import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Receipt, Loader2, Instagram, Copyright } from "lucide-react";
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
  const { login, register } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
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

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });
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

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    setTimeout(() => {
      loginForm.reset({
        email: "",
        password: "",
      });
      registerForm.reset({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    }, 0);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        {/* Coluna esquerda (desktop) */}
        <div className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
          <div className="flex flex-col items-center text-center text-primary-foreground">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Receipt className="h-10 w-10" />
            </div>
            <h1 className="mb-4 text-4xl font-bold">AppFinance</h1>
            <p className="max-w-md text-lg opacity-90">
              Controle suas finanças de forma simples e eficiente.
              Acompanhe suas finanças pessoais em tempo real.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold">100%</div>
                <div className="text-sm opacity-80">Portável</div>
              </div>
              <div>
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-sm opacity-80">Disponível</div>
              </div>
              <div>
                <div className="text-3xl font-bold">Seguro</div>
                <div className="text-sm opacity-80">JWT Auth</div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna direita (form + copyright interno, igual suporte) */}
        <div className="flex w-full flex-col lg:w-1/2">
          <div className="flex justify-end p-4">
            <ThemeToggle />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary lg:hidden">
                  <Receipt className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl" data-testid="text-auth-title">
                  {isLogin ? "Entrar" : "Criar Conta"}
                </CardTitle>
                <CardDescription>
                  {isLogin
                    ? "Entre com suas credenciais para acessar"
                    : "Preencha os dados para criar sua conta"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLogin ? (
                  <Form key="login-form" {...loginForm}>
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
                                placeholder="seu@email.com"
                                data-testid="input-email"
                                autoComplete="email"
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
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                data-testid="input-password"
                                autoComplete="current-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        data-testid="button-login"
                      >
                        {isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Entrar
                      </Button>
                      <div className="text-center">
                        <Link
                          href="/forgot-password"
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          Esqueceu a senha?
                        </Link>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <Form key="register-form" {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Seu nome"
                                data-testid="input-name"
                                autoComplete="name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="seu@email.com"
                                data-testid="input-register-email"
                                autoComplete="email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                data-testid="input-register-password"
                                autoComplete="new-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                data-testid="input-confirm-password"
                                autoComplete="new-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        data-testid="button-register"
                      >
                        {isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Criar Conta
                      </Button>
                    </form>
                  </Form>
                )}

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">
                    {isLogin ? "Não tem uma conta? " : "Já tem uma conta? "}
                  </span>
                  <button
                    type="button"
                    onClick={switchMode}
                    className="font-medium text-primary hover:underline"
                    data-testid="button-switch-auth-mode"
                  >
                    {isLogin ? "Criar conta" : "Entrar"}
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <Link
                    href="/support"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Precisa de ajuda? Contate o suporte
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* bloco de copyright no fim da coluna, igual suporte */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Copyright className="h-3 w-3" />
              <span>Desenvolvido por Rodrigo Pires Figueiredo | 2025</span>
              <a
                href="https://instagram.com/_pires.r"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:text-primary"
              >
                <Instagram className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
