import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Games from "./pages/Games";
import Mines from "./pages/games/Mines";
import Slots from "./pages/games/Slots";
import Roulette from "./pages/games/Roulette";
import Aviator from "./pages/games/Aviator";
import GatesOfOlympus from "./pages/games/GatesOfOlympus";
import SweetBonanza from "./pages/games/SweetBonanza";
import Blackjack from "./pages/games/Blackjack";
import Baccarat from "./pages/games/Baccarat";
import Wallet from "./pages/Wallet";
import MyBets from "./pages/MyBets";
import Account from "./pages/Account";
import Affiliates from "./pages/Affiliates";
import Invite from "./pages/Invite";
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
       <ThemeProvider>
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
              <Route path="/games/fortune-tiger" element={<ProtectedRoute><GatesOfOlympus /></ProtectedRoute>} />
              <Route path="/games/sweet-bonanza" element={<ProtectedRoute><SweetBonanza /></ProtectedRoute>} />
              <Route path="/games/blackjack" element={<ProtectedRoute><Blackjack /></ProtectedRoute>} />
              <Route path="/games/baccarat" element={<ProtectedRoute><Baccarat /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/my-bets" element={<ProtectedRoute><MyBets /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="/affiliates" element={<ProtectedRoute><Affiliates /></ProtectedRoute>} />
              <Route path="/invite/:code" element={<Invite />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
       </ThemeProvider>
      </WalletProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
