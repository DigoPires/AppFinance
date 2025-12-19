import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import type { UserWithoutPassword } from "@shared/schema";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: UserWithoutPassword | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<UserWithoutPassword>) => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "expense_tracker_tokens";

function getStoredTokens(): AuthTokens | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    localStorage.removeItem(TOKEN_KEY);
  }
  return null;
}

function setStoredTokens(tokens: AuthTokens | null) {
  if (tokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithoutPassword | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<AuthTokens | null>(getStoredTokens);

  const refreshAccessToken = useCallback(async (): Promise<AuthTokens | null> => {
    const currentTokens = getStoredTokens();
    if (!currentTokens?.refreshToken) return null;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentTokens.refreshToken }),
      });

      if (!response.ok) {
        setStoredTokens(null);
        setTokens(null);
        setUser(null);
        return null;
      }

      const data = await response.json();
      const newTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      setStoredTokens(newTokens);
      setTokens(newTokens);
      return newTokens;
    } catch {
      setStoredTokens(null);
      setTokens(null);
      setUser(null);
      return null;
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const currentTokens = getStoredTokens();
    if (!currentTokens?.accessToken) return null;

    try {
      const payload = JSON.parse(atob(currentTokens.accessToken.split(".")[1]));
      const expiresAt = payload.exp * 1000;
      
      if (Date.now() >= expiresAt - 60000) {
        const newTokens = await refreshAccessToken();
        return newTokens?.accessToken || null;
      }
      
      return currentTokens.accessToken;
    } catch {
      const newTokens = await refreshAccessToken();
      return newTokens?.accessToken || null;
    }
  }, [refreshAccessToken]);

  const fetchUser = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsLoading(false);
          return;
        } else {
          // If unauthorized, clear tokens
          if (response.status === 401) {
            setStoredTokens(null);
            setTokens(null);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          let errorMessage = `Erro ${response.status}: ${response.statusText}`;
          try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } catch {
            // Keep the status error
          }
          
          throw new Error(errorMessage);
        }
      } catch (error) {
        lastError = error as Error;
        
        // If it's a rate limit error, wait before retrying
        if ((error as Error).message.includes('Too many requests') && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // For other errors, don't retry
        break;
      }
    }
    
    // If all retries failed, set user to null
    setUser(null);
    setIsLoading(false);
  }, [getAccessToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          let errorMessage = "Erro ao fazer login";
          try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } catch {
            errorMessage = `Erro ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const newTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
        setStoredTokens(newTokens);
        setTokens(newTokens);
        setUser(data.user);
        
        // Invalidate all queries to refresh data for the new user
        queryClient.invalidateQueries();
        return;
      } catch (error) {
        lastError = error as Error;
        
        // If it's a rate limit error, wait before retrying
        if ((error as Error).message.includes('Too many requests') && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError!;
  };

  const register = async (name: string, email: string, password: string) => {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        if (!response.ok) {
          let errorMessage = "Erro ao criar conta";
          try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } catch {
            errorMessage = `Erro ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const newTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
        setStoredTokens(newTokens);
        setTokens(newTokens);
        setUser(data.user);
        return;
      } catch (error) {
        lastError = error as Error;
        
        // If it's a rate limit error, wait before retrying
        if ((error as Error).message.includes('Too many requests') && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError!;
  };

  const logout = async () => {
    const currentTokens = getStoredTokens();
    if (currentTokens?.refreshToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: currentTokens.refreshToken }),
        });
      } catch {
        // Ignore logout errors
      }
    }
    setStoredTokens(null);
    setTokens(null);
    setUser(null);
    
    // Clear all cached data when logging out
    queryClient.clear();
  };

  const updateUser = (userData: Partial<UserWithoutPassword>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
