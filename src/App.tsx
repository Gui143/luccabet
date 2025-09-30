import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Games from "./pages/Games";
import Mines from "./pages/games/Mines";
import Slots from "./pages/games/Slots";
import Roulette from "./pages/games/Roulette";
import Aviator from "./pages/games/Aviator";
import CrashDuplo from "./pages/games/CrashDuplo";
import Wallet from "./pages/Wallet";
import MyBets from "./pages/MyBets";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/auth" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
              <Route path="/games/mines" element={<ProtectedRoute><Mines /></ProtectedRoute>} />
              <Route path="/games/slots" element={<ProtectedRoute><Slots /></ProtectedRoute>} />
              <Route path="/games/roulette" element={<ProtectedRoute><Roulette /></ProtectedRoute>} />
              <Route path="/games/aviator" element={<ProtectedRoute><Aviator /></ProtectedRoute>} />
              <Route path="/games/crash-duplo" element={<ProtectedRoute><CrashDuplo /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/my-bets" element={<ProtectedRoute><MyBets /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
