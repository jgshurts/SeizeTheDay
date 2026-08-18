import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { MainPage } from "./pages/MainPage";

function AppShell() {
  const { user } = useAuth();
  return user ? <MainPage /> : <LoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
