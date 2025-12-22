import { useState, useMemo, useEffect } from "react";
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
import { useAuth } from "@/lib/auth";
import { User, Lock, Eye, EyeOff } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

const emailSchema = z.object({
  email: z.string().email("Email inválido"),
});

const codeOnlySchema = z.object({
  code: z.string().min(6, "Código deve ter 6 dígitos"),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type CodeOnlyFormData = z.infer<typeof codeOnlySchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

export default function ProfilePage() {
  const { user, getAccessToken, updateUser } = useAuth();
  const { toast } = useToast();
  const [resetStep, setResetStep] = useState<'email' | 'verify-code' | 'password' | 'success'>('email');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedCode, setVerifiedCode] = useState<string>('');

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: user?.email || "",
    },
  });

  const codeForm = useForm<CodeOnlyFormData>({
    resolver: zodResolver(codeOnlySchema),
    defaultValues: {
      code: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Atualiza o valor do email quando o usuário muda
  useEffect(() => {
    if (user?.email) {
      emailForm.setValue('email', user.email);
    }
  }, [user?.email, emailForm]);

  // Reseta o codeForm quando entra na etapa de verificação
  useEffect(() => {
    if (resetStep === 'verify-code') {
      codeForm.reset({ code: "" });
    }
  }, [resetStep, codeForm]);

  // Reseta o passwordForm quando entra na etapa de alteração de senha
  useEffect(() => {
    if (resetStep === 'password') {
      passwordForm.reset({ newPassword: "", confirmPassword: "" });
    }
  }, [resetStep, passwordForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const token = await getAccessToken();
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["expenses"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["earnings"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["expenses-stats"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["incomes"], refetchType: "active" });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar o perfil.",
      });
    },
  });

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
        throw new Error(error.message || "Failed to send reset code");
      }
      return response.json();
    },
    onSuccess: () => {
      setResetStep('verify-code');
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
    onSuccess: (data, variables) => {
      setVerifiedCode(variables.code);
      setResetStep('password');
      codeForm.reset();
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

  const verifyResetCodeMutation = useMutation({
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
        throw new Error(error.message || "Failed to verify code");
      }
      return response.json();
    },
    onSuccess: () => {
      setVerifiedCode('');
      setResetStep('success');
      passwordForm.reset();
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      setTimeout(() => {
        setVerifiedCode('');
        setResetStep('email');
      }, 3000);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Código inválido ou expirado.",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onEmailSubmit = (data: EmailFormData) => {
    sendResetCodeMutation.mutate(data.email);
  };

  const onCodeSubmit = (data: CodeOnlyFormData) => {
    verifyCodeMutation.mutate({
      email: user?.email || "",
      code: data.code,
    });
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    verifyResetCodeMutation.mutate({
      email: user?.email || "",
      code: verifiedCode,
      newPassword: data.newPassword,
    });
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Usuário não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-muted"
                    data-testid="input-email-disabled"
                  />
                  <p className="text-xs text-muted-foreground">
                    Entre em contato com suporte para alterar seu email.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-update-profile"
                >
                  {updateProfileMutation.isPending ? "Atualizando..." : "Atualizar Perfil"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resetStep === 'success' ? (
              <div className="text-center py-4">
                <div className="text-green-600 text-lg font-semibold mb-2">✓ Senha alterada com sucesso!</div>
                <p className="text-sm text-muted-foreground">Você pode fazer login com a nova senha.</p>
              </div>
            ) : resetStep === 'email' ? (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" disabled readOnly data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={sendResetCodeMutation.isPending}
                    data-testid="button-send-code"
                  >
                    {sendResetCodeMutation.isPending ? "Enviando..." : "Enviar Código"}
                  </Button>
                </form>
              </Form>
            ) : resetStep === 'verify-code' ? (
              <Form {...codeForm}>
                <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Código de Verificação</label>
                    <input
                      {...codeForm.register('code')}
                      type="text"
                      placeholder="Digite o código de 6 dígitos"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      data-testid="input-code"
                    />
                    {codeForm.formState.errors.code && (
                      <p className="text-sm font-medium text-destructive">{codeForm.formState.errors.code.message}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={verifyCodeMutation.isPending}
                      data-testid="button-verify-code"
                    >
                      {verifyCodeMutation.isPending ? "Verificando..." : "Verificar Código"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetStep('email')}
                    >
                      Voltar
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              type={showNewPassword ? "text" : "password"}
                              autoComplete="new-password"
                              disabled={false}
                              className="pr-10"
                              data-testid="input-new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword((p) => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showNewPassword ? (
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

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              type={showConfirmPassword ? "text" : "password"}
                              autoComplete="new-password"
                              disabled={false}
                              className="pr-10"
                              data-testid="input-confirm-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((p) => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showConfirmPassword ? (
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

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={verifyResetCodeMutation.isPending}
                      data-testid="button-change-password"
                    >
                      {verifyResetCodeMutation.isPending ? "Alterando..." : "Alterar Senha"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetStep('verify-code')}
                    >
                      Voltar
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}