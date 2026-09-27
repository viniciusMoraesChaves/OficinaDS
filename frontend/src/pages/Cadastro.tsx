import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../services/api';

export default function Cadastro() {
  const [nomeOficina, setNomeOficina] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    document.title = 'OficinaOS | Criar conta';
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { dados } = await apiPost<{ dados: { token: string } }>('/api/cadastro', {
        email,
        senha,
      });
      login(dados.token);
      navigate('/');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2>Crie sua conta</h2>
      <p className="auth-form__subtitle">
        Preencha os dados abaixo para iniciar seu teste gratuito.
      </p>

      {erro && <p className="auth-form__error">{erro}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="cadastro-oficina">Nome da Oficina</label>
          <input
            id="cadastro-oficina"
            type="text"
            placeholder="Ex: Auto Center Silva"
            value={nomeOficina}
            onChange={(e) => setNomeOficina(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="cadastro-email">E-mail</label>
          <input
            id="cadastro-email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="cadastro-senha">Senha</label>
          <input
            id="cadastro-senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar conta gratuitamente'} <ArrowRight size={18} />
        </button>
      </form>

      <hr className="auth-form__divider" />

      <p className="auth-form__switch">
        Já é cliente? <Link to="/login">Fazer login</Link>
      </p>
    </AuthLayout>
  );
}