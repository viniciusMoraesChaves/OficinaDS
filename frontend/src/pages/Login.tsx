import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    document.title = 'OficinaOS | Entrar';
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { dados } = await apiPost<{ dados: { token: string } }>('/api/login', {
        email,
        senha,
      });
      login(dados.token);
      navigate('/');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2>Bem-vindo de volta</h2>
      <p className="auth-form__subtitle">
        Insira suas credenciais para acessar o painel.
      </p>

      {erro && <p className="auth-form__error">{erro}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label htmlFor="login-senha">Senha</label>
            <Link className="auth-field__link" to="/recuperar-senha">
              Esqueceu a senha?
            </Link>
          </div>
          <input
            id="login-senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar na plataforma'} <ArrowRight size={18} />
        </button>
      </form>

      <hr className="auth-form__divider" />

      <p className="auth-form__switch">
        Ainda não usa o OficinaOS? <Link to="/cadastro">Abra sua conta</Link>
      </p>
    </AuthLayout>
  );
}