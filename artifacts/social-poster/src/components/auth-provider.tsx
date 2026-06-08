import { createContext, useContext } from "react";
import { useGetMe } from "@workspace/api-client-react";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  username: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useGetMe();

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!data?.authenticated,
        isLoading,
        username: data?.username || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);