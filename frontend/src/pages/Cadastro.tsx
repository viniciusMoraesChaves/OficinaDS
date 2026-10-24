import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../services/api';
import type { Perfil } from '../types/perfil';

type TipoAcesso = 'oficina' | 'cliente';

const VEICULO_VAZIO = { placa: '', marca: '', modelo: '', ano: '', cor: '' };

export default function Cadastro() {
  const [tipoAcesso, setTipoAcesso] = useState<TipoAcesso>('cliente');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [veiculo, setVeiculo] = useState(VEICULO_VAZIO);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    document.title = 'OficinaDS | Criar conta';
  }, []);

  function campoVeiculo(campo: keyof typeof VEICULO_VAZIO, valor: string) {
    setVeiculo((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');

    if (!nome.trim()) return setErro('Informe o seu nome.');
    if (cpf.replace(/\D/g, '').length !== 11) return setErro('Informe um CPF válido com 11 dígitos.');
    if (!email.trim()) return setErro('Informe o seu e-mail.');
    if (senha.length < 6) return setErro('A senha deve ter ao menos 6 caracteres.');

    setLoading(true);

    try {
      const { dados } = await apiPost<{ dados: { token: string; perfil: Perfil } }>(
        '/api/cadastro',
        {
          tipoAcesso,
          nome,
          cpf,
          telefone,
          email,
          senha,
          ...(tipoAcesso === 'cliente' ? { veiculo } : {})
        }
      );
      login(dados.token, dados.perfil);
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
        Escolha o tipo de conta e preencha os dados abaixo.
      </p>

      <div className="auth-field" role="radiogroup" aria-label="Tipo de conta">
        <label style={{ marginBottom: '8px', display: 'block' }}>Como você quer se cadastrar?</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`button ${tipoAcesso === 'oficina' ? 'button--primary' : 'button--secondary'}`}
            aria-pressed={tipoAcesso === 'oficina'}
            onClick={() => setTipoAcesso('oficina')}
            style={{ flex: 1 }}
          >
            Sou da oficina
          </button>
          <button
            type="button"
            className={`button ${tipoAcesso === 'cliente' ? 'button--primary' : 'button--secondary'}`}
            aria-pressed={tipoAcesso === 'cliente'}
            onClick={() => setTipoAcesso('cliente')}
            style={{ flex: 1 }}
          >
            Sou cliente
          </button>
        </div>
      </div>

      {erro && <p className="auth-form__error">{erro}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="cadastro-nome">Nome completo</label>
          <input
            id="cadastro-nome"
            type="text"
            placeholder="Ex: Maria Silva"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="cadastro-cpf">CPF</label>
          <input
            id="cadastro-cpf"
            type="text"
            inputMode="numeric"
            placeholder="Somente números"
            maxLength={14}
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="cadastro-telefone">Telefone</label>
          <input
            id="cadastro-telefone"
            type="tel"
            placeholder="(11) 90000-0000"
            autoComplete="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
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
            placeholder="Mínimo de 6 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        {tipoAcesso === 'cliente' && (
          <>
            <p className="auth-form__subtitle" style={{ marginTop: '16px' }}>
              Veículo (opcional — você pode cadastrar depois com a oficina)
            </p>

            <div className="auth-field">
              <label htmlFor="cadastro-placa">Placa</label>
              <input
                id="cadastro-placa"
                type="text"
                placeholder="ABC1D23"
                maxLength={10}
                value={veiculo.placa}
                onChange={(e) => campoVeiculo('placa', e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="cadastro-marca">Marca</label>
              <input
                id="cadastro-marca"
                type="text"
                placeholder="Ex: Fiat"
                value={veiculo.marca}
                onChange={(e) => campoVeiculo('marca', e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="cadastro-modelo">Modelo</label>
              <input
                id="cadastro-modelo"
                type="text"
                placeholder="Ex: Argo"
                value={veiculo.modelo}
                onChange={(e) => campoVeiculo('modelo', e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="cadastro-ano">Ano</label>
              <input
                id="cadastro-ano"
                type="number"
                inputMode="numeric"
                placeholder="2022"
                value={veiculo.ano}
                onChange={(e) => campoVeiculo('ano', e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="cadastro-cor">Cor</label>
              <input
                id="cadastro-cor"
                type="text"
                placeholder="Ex: Prata"
                value={veiculo.cor}
                onChange={(e) => campoVeiculo('cor', e.target.value)}
              />
            </div>
          </>
        )}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar conta'} <ArrowRight size={18} />
        </button>
      </form>

      <hr className="auth-form__divider" />

      <p className="auth-form__switch">
        Já tem uma conta? <Link to="/login">Fazer login</Link>
      </p>
    </AuthLayout>
  );
}
