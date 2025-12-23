import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/img/Logo_AppFinance.png";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  HelpCircle,
  Mail,
  Clock,
  Receipt,
  Send,
  Copyright,
  Instagram,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const authenticatedContactSchema = z.object({
  subject: z.string().min(5, "Assunto deve ter pelo menos 5 caracteres"),
  category: z.string().min(1, "Selecione uma categoria"),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
});

const unauthenticatedContactSchema = z.object({
  email: z.string().email("Email inválido"),
  subject: z.string().min(5, "Assunto deve ter pelo menos 5 caracteres"),
  category: z.string().min(1, "Selecione uma categoria"),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
});

type AuthenticatedContactFormData = z.infer<typeof authenticatedContactSchema>;
type UnauthenticatedContactFormData = z.infer<typeof unauthenticatedContactSchema>;

export default function SupportPage() {
  const { isAuthenticated, user, getAccessToken } = useAuth();
  const { toast } = useToast();

  const contactForm = useForm<AuthenticatedContactFormData | UnauthenticatedContactFormData>({
    resolver: zodResolver(isAuthenticated ? authenticatedContactSchema : unauthenticatedContactSchema),
    defaultValues: {
      ...(isAuthenticated ? {} : { email: "" }),
      subject: "",
      category: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: AuthenticatedContactFormData | UnauthenticatedContactFormData) => {
      const token = isAuthenticated ? await getAccessToken() : undefined;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...data,
          ...(isAuthenticated ? {} : {}), // Para usuários autenticados, o email vem do token
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao enviar mensagem");
      }
      return response.json();
    },
    onSuccess: () => {
      contactForm.reset({
        ...(isAuthenticated ? {} : { email: "" }),
        subject: "",
        category: "",
        message: "",
      });
      toast({
        title: "Mensagem enviada",
        description:
          "Sua mensagem foi enviada com sucesso. Responderemos em breve.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          error?.message || "Não foi possível enviar a mensagem.",
      });
    },
  });

  const onContactSubmit = (data: AuthenticatedContactFormData | UnauthenticatedContactFormData) => {
    contactMutation.mutate(data);
  };

  // Versão para usuário não autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - AppFinance branding */}
        <div className="flex flex-col justify-center px-6 py-12 flex-1 bg-gradient-to-br from-primary/10 to-primary/5 lg:flex">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center gap-2 mb-8">
              <img src={logo} alt="AppFinance Logo" className="h-8 w-8" />
              <span className="text-2xl font-bold">AppFinance</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Controle suas finanças com facilidade
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie suas finanças, acompanhe seu orçamento e tome decisões
              financeiras inteligentes.
            </p>
            <div className="mt-8">
              <Link href="/auth">
                <Button size="lg" className="w-full">
                  Entrar na minha conta
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right side - Support content */}
        <div className="relative flex flex-col flex-1 lg:flex">
          <div className="absolute top-4 right-4 z-10">
            <ThemeToggle />
          </div>
          <div className="flex flex-col justify-center px-6 py-12 flex-1">
            <div className="mx-auto w-full max-w-md">
              <div className="text-center mb-8">
                <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
                <h2 className="text-2xl font-bold">Suporte</h2>
                <p className="text-muted-foreground">Estamos aqui para ajudar</p>
              </div>

            <Card>
              <CardHeader>
                <CardTitle>Entre em Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...contactForm}>
                  <form
                    onSubmit={contactForm.handleSubmit(onContactSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={contactForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Digite seu email para contato"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assunto</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Digite o assunto da sua mensagem"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="bug">Relatar Bug</SelectItem>
                              <SelectItem value="feature">
                                Sugestão de Funcionalidade
                              </SelectItem>
                              <SelectItem value="account">
                                Problemas com Conta
                              </SelectItem>
                              <SelectItem value="other">
                                Outro
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensagem</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descreva detalhadamente sua dúvida ou problema"
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={contactMutation.isPending}
                    >
                      {contactMutation.isPending ? (
                        "Enviando..."
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Mensagem
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="mt-6 text-center">
              <Link
                href="/auth"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Voltar ao Login
              </Link>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Copyright className="h-3 w-3" />
                  <span>Rodrigo Pires Figueiredo | 2025</span>
                </div>
                <span className="hidden sm:block">|</span>
                <a
                  href="https://instagram.com/_pires.r"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  <span className="hidden sm:block">@_pires.r</span>
                </a>  
              </div>
              <p className="text-xs opacity-70 max-w-md text-center">
                AppFinance - Sua ferramenta completa para gestão financeira pessoal.
                Mantenha o controle das suas finanças com facilidade e segurança.
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Versão para usuário autenticado
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Suporte</h1>
        <p className="text-muted-foreground">
          Estamos aqui para ajudar. Entre em contato conosco.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Entre em Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...contactForm}>
              <form
                onSubmit={contactForm.handleSubmit(onContactSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={contactForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assunto</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digite o assunto da sua mensagem"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bug">Relatar Bug</SelectItem>
                          <SelectItem value="feature">
                            Sugestão de Funcionalidade
                          </SelectItem>
                          <SelectItem value="account">
                            Problemas com Conta
                          </SelectItem>
                          <SelectItem value="other">
                            Outro
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Descreva detalhadamente sua dúvida ou problema"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={contactMutation.isPending}
                >
                  {contactMutation.isPending ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Como adicionar uma despesa?</h4>
                <p className="text-sm text-muted-foreground">
                  Vá para a página de Despesas e clique em &quot;Adicionar
                  Despesa&quot;.
                </p>
              </div>
              <div>
                <h4 className="font-medium">Como alterar minha senha?</h4>
                <p className="text-sm text-muted-foreground">
                  Use a opção &quot;Esqueceu a senha&quot; na página de login ou
                  vá ao seu perfil.
                </p>
              </div>
              <div>
                <h4 className="font-medium">Como exportar meus dados?</h4>
                <p className="text-sm text-muted-foreground">
                  Entre em contato conosco para solicitar a exportação dos seus
                  dados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
