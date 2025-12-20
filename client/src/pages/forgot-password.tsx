import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

const verifyCodeSchema = z.object({
  code: z.string().min(6, "Código deve ter 6 dígitos"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'verify' | 'password'>('email');
  const [email, setEmail] = useState('');

  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const verifyForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (step === 'verify') {
      verifyForm.reset();
    } else if (step === 'password') {
      resetForm.reset();
    }
  }, [step, verifyForm, resetForm]);

  const sendResetCodeMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao enviar código");
      }
      return response.json();
    },
    onSuccess: () => {
      setStep('verify');
      verifyForm.reset();
      toast({
        title: "Código enviado",
        description: "Verifique seu email para o código de 6 dígitos.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível enviar o código.",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Código inválido");
      }
      return response.json();
    },
    onSuccess: () => {
      setStep('password');
      resetForm.reset();
      toast({
        title: "Código verificado",
        description: "Agora você pode definir sua nova senha.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Código inválido ou expirado.",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { email: string; code: string; newPassword: string }) => {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao redefinir senha");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["earnings"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["expenses-stats"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["incomes"], refetchType: "active" });
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso. Você pode fazer login agora.",
      });
      // Redirect to login after success
      setTimeout(() => {
        window.location.href = "/auth";
      }, 2000);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao redefinir senha.",
      });
    },
  });

  const onForgotSubmit = (data: ForgotPasswordFormData) => {
    setEmail(data.email);
    sendResetCodeMutation.mutate(data.email);
  };

  const onVerifySubmit = (data: VerifyCodeFormData) => {
    verifyCodeMutation.mutate({
      email,
      code: data.code,
    });
  };

  const onResetSubmit = (data: ResetPasswordFormData) => {
    // Use the code from verifyForm
    const code = verifyForm.getValues('code');
    resetPasswordMutation.mutate({
      email,
      code,
      newPassword: data.newPassword,
    });
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5" />
            {step === 'email' ? 'Esqueceu a Senha' : step === 'verify' ? 'Verificar Código' : 'Redefinir Senha'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Digite seu email" autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendResetCodeMutation.isPending}
                >
                  {sendResetCodeMutation.isPending ? "Enviando..." : "Enviar Código"}
                </Button>
              </form>
            </Form>
          ) : step === 'verify' ? (
            <Form {...verifyForm} key={`verify-${step}`}>
              <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
                <FormField
                  control={verifyForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Verificação</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite o código de 6 dígitos" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={verifyCodeMutation.isPending}
                  >
                    {verifyCodeMutation.isPending ? "Verificando..." : "Verificar Código"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep('email');
                      verifyForm.reset();
                    }}
                  >
                    Voltar
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...resetForm} key={`password-${step}`}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Digite a nova senha" autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Confirme a nova senha" autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? "Redefinindo..." : "Redefinir Senha"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep('verify');
                      resetForm.reset();
                    }}
                  >
                    Voltar
                  </Button>
                </div>
              </form>
            </Form>
          )}

          <div className="mt-4 text-center">
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="inline mr-1 h-3 w-3" />
              Voltar ao Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}