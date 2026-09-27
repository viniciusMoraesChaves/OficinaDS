import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import Home from './pages/Home';
import Clientes from './pages/Clientes';
import NotFound from './pages/NotFound';
import Funcionarios from './pages/Funcionarios';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/clientes" element={<RequireAuth><Clientes /></RequireAuth>} />
          <Route path="/funcionarios" element={<RequireAuth><Funcionarios /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}