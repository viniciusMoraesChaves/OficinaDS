import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { apiFetch } from '../services/api';

type DadosPerfil = {
  id: number;
  email: string;
  perfil: string;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  endereco: string | null;
  possuiCadastroPessoal: number;
};

type RespostaMensagem = {
  mensagem?: string;
};

type CampoSenhaProps = {
  id: string;
  rotulo: string;
  valor: string;
  aoAlterar: (valor: string) => void;
  desabilitado: boolean;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
};

function CampoSenha({
  id,
  rotulo,
  valor,
  aoAlterar,
  desabilitado,
  autoComplete,
  minLength
}: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{rotulo}</label>

      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => aoAlterar(e.target.value)}
          disabled={desabilitado}
          minLength={minLength}
          required
          style={{ paddingRight: '48px' }}
        />

        <button
          type="button"
          onClick={() => setVisivel((anterior) => !anterior)}
          aria-label={
            visivel
              ? `Ocultar ${rotulo.toLowerCase()}`
              : `Mostrar ${rotulo.toLowerCase()}`
          }
          aria-pressed={visivel}
          title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          style={{
            position: 'absolute',
            top: '50%',
            right: '10px',
            transform: 'translateY(-50%)',
            display: 'grid',
            placeItems: 'center',
            width: '34px',
            height: '34px',
            padding: 0,
            border: 'none',
            borderRadius: '6px',
            background: 'transparent',
            color: '#666',
            cursor: 'pointer'
          }}
        >
          {visivel ? (
            <EyeOff size={19} aria-hidden="true" />
          ) : (
            <Eye size={19} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function MeuPerfil() {
  const [dados, setDados] = useState<DadosPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');

  function preencherCampos(perfil: DadosPerfil) {
    setDados(perfil);
    setNome(perfil.nome ?? '');
    setEmail(perfil.email);
    setTelefone(perfil.telefone ?? '');
    setEndereco(perfil.endereco ?? '');
  }

  async function carregarPerfil() {
    const resposta = await apiFetch<{ dados: DadosPerfil }>(
      '/api/me/perfil'
    );

    preencherCampos(resposta.dados);
  }

  useEffect(() => {
    async function iniciarCarregamento() {
      try {
        await carregarPerfil();
      } catch (err) {
        setErro(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar seu perfil.'
        );
      } finally {
        setLoading(false);
      }
    }

    iniciarCarregamento();
  }, []);

  useEffect(() => {
    if (!sucesso) return;

    const temporizador = setTimeout(() => {
      setSucesso('');
    }, 5000);

    return () => clearTimeout(temporizador);
  }, [sucesso]);

  const possuiCadastroPessoal =
    dados?.possuiCadastroPessoal === 1;

  function iniciarEdicao() {
    if (!dados) return;

    preencherCampos(dados);
    setErro('');
    setSucesso('');
    setEditando(true);
  }

  function cancelarEdicao() {
    if (!dados || salvando) return;

    preencherCampos(dados);
    setErro('');
    setEditando(false);
  }

  async function enviarAtualizacao(
    rota: string,
    corpo: object
  ) {
    const token = sessionStorage.getItem('oficinaos:token');

    const resposta = await fetch(rota, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(corpo)
    });

    const resultado: RespostaMensagem = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ??
        'Não foi possível salvar as alterações.'
      );
    }
  }

  async function salvarAlteracoes() {
    if (!dados || salvando) return;

    setErro('');
    setSucesso('');

    const novoEmail = email.trim();
    const novoNome = nome.trim();
    const novoTelefone = telefone.trim();
    const novoEndereco = endereco.trim();

    if (
      !novoEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail)
    ) {
      setErro('Informe um e-mail válido.');
      return;
    }

    if (possuiCadastroPessoal && !novoNome) {
      setErro('Informe um nome válido.');
      return;
    }

    const emailAlterado = novoEmail !== dados.email;

    const dadosAlterados =
      possuiCadastroPessoal &&
      (
        novoNome !== (dados.nome ?? '') ||
        novoTelefone !== (dados.telefone ?? '') ||
        (
          dados.perfil === 'Cliente' &&
          novoEndereco !== (dados.endereco ?? '')
        )
      );

    if (!emailAlterado && !dadosAlterados) {
      setSucesso('Nenhuma alteração foi necessária.');
      setEditando(false);
      return;
    }

    setSalvando(true);
    let algumaAlteracaoSalva = false;

    try {
      if (dadosAlterados) {
        await enviarAtualizacao('/api/me/perfil/dados', {
          nome: novoNome,
          telefone: novoTelefone,
          endereco: novoEndereco
        });

        algumaAlteracaoSalva = true;
      }

      if (emailAlterado) {
        await enviarAtualizacao('/api/me/perfil/email', {
          email: novoEmail
        });

        algumaAlteracaoSalva = true;
      }

      await carregarPerfil();

      setEditando(false);
      setSucesso('Informações atualizadas com sucesso!');
    } catch (err) {
      setErro(
        algumaAlteracaoSalva
          ? 'Parte das alterações foi salva, mas ocorreu um erro: ' +
            (err instanceof Error
              ? err.message
              : 'Erro desconhecido.')
          : err instanceof Error
            ? err.message
            : 'Não foi possível salvar suas informações.'
      );

      if (algumaAlteracaoSalva) {
        try {
          await carregarPerfil();
          setEditando(false);
        } catch {
        }
      }
    } finally {
      setSalvando(false);
    }
  }

  async function alterarSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (alterandoSenha) return;

    setErroSenha('');
    setSucesso('');

    if (!senhaAtual || !novaSenha || !confirmacaoSenha) {
      setErroSenha('Preencha todos os campos de senha.');
      return;
    }

    if (
      novaSenha.length < 8 ||
      new TextEncoder().encode(novaSenha).length > 72
    ) {
      setErroSenha(
        'A nova senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.'
      );
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      setErroSenha(
        'A confirmação da senha não corresponde à nova senha.'
      );
      return;
    }

    if (senhaAtual === novaSenha) {
      setErroSenha(
        'A nova senha deve ser diferente da senha atual.'
      );
      return;
    }

    setAlterandoSenha(true);

    try {
      await enviarAtualizacao('/api/me/perfil/senha', {
        senhaAtual,
        novaSenha
      });

      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacaoSenha('');

      setErroSenha('');
      setSucesso('Senha alterada com sucesso!');
    } catch (err) {
      setErroSenha(
        err instanceof Error
          ? err.message
          : 'Não foi possível alterar sua senha.'
      );
    } finally {
      setAlterandoSenha(false);
    }
  }

  return (
    <Layout
      title="Meu Perfil"
      subtitle="Consulte suas informações pessoais"
      documentTitle="OficinaDS | Meu Perfil"
    >
      {loading && (
        <Feedback type="loading" message="Carregando perfil..." />
      )}

      {erro && <Feedback type="error" message={erro} />}

      {sucesso && (
        <div className="perfil-notificacao" role="status">
          {sucesso}
        </div>
      )}

      {dados && (
        <>
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Minhas informações</h2>
                <p>Dados associados à sua conta.</p>
              </div>

              <div className="perfil-acoes">
                {!editando ? (
                  <button
                    type="button"
                    className="perfil-botao perfil-botao--primario"
                    onClick={iniciarEdicao}
                  >
                    Editar informações
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="perfil-botao perfil-botao--secundario"
                      onClick={cancelarEdicao}
                      disabled={salvando}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      className="perfil-botao perfil-botao--primario"
                      onClick={salvarAlteracoes}
                      disabled={salvando}
                    >
                      {salvando
                        ? 'Salvando...'
                        : 'Salvar alterações'}
                    </button>
                  </>
                )}
              </div>
            </header>

            <div
              style={{
                padding: '20px',
                display: 'grid',
                gap: '16px'
              }}
            >
              <div className="field">
                <label htmlFor="perfil-nome">
                  Nome completo
                </label>
                <input
                  id="perfil-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  readOnly={
                    !editando || !possuiCadastroPessoal
                  }
                  disabled={salvando}
                />
              </div>

              <div className="field">
                <label htmlFor="perfil-email">
                  E-mail
                </label>
                <input
                  id="perfil-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!editando}
                  disabled={salvando}
                />
              </div>

              <div className="field">
                <label htmlFor="perfil-cpf">
                  CPF
                </label>
                <input
                  id="perfil-cpf"
                  value={dados.cpf ?? ''}
                  readOnly
                />
              </div>

              <div className="field">
                <label htmlFor="perfil-telefone">
                  Telefone
                </label>
                <input
                  id="perfil-telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  readOnly={
                    !editando || !possuiCadastroPessoal
                  }
                  disabled={salvando}
                />
              </div>

              {dados.perfil === 'Cliente' && (
                <div className="field">
                  <label htmlFor="perfil-endereco">
                    Endereço
                  </label>
                  <input
                    id="perfil-endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    readOnly={
                      !editando || !possuiCadastroPessoal
                    }
                    disabled={salvando}
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="perfil-acesso">
                  Perfil de acesso
                </label>
                <input
                  id="perfil-acesso"
                  value={dados.perfil}
                  readOnly
                />
              </div>
            </div>
          </section>

          <section
            className="panel"
            style={{ marginTop: '24px' }}
          >
            <header className="panel__header">
              <div>
                <h2>Segurança da conta</h2>
                <p>
                  Altere sua senha para manter sua conta protegida.
                </p>
              </div>
            </header>

            <form
              onSubmit={alterarSenha}
              style={{
                padding: '20px',
                display: 'grid',
                gap: '16px'
              }}
            >
              {erroSenha && (
                <p
                  role="alert"
                  style={{
                    color: '#b42318',
                    margin: 0,
                    fontSize: '13px'
                  }}
                >
                  {erroSenha}
                </p>
              )}

              <CampoSenha
                id="perfil-senha-atual"
                rotulo="Senha atual"
                valor={senhaAtual}
                aoAlterar={setSenhaAtual}
                desabilitado={alterandoSenha}
                autoComplete="current-password"
              />

              <CampoSenha
                id="perfil-nova-senha"
                rotulo="Nova senha"
                valor={novaSenha}
                aoAlterar={setNovaSenha}
                desabilitado={alterandoSenha}
                autoComplete="new-password"
                minLength={8}
              />

              <CampoSenha
                id="perfil-confirmar-senha"
                rotulo="Confirmar nova senha"
                valor={confirmacaoSenha}
                aoAlterar={setConfirmacaoSenha}
                desabilitado={alterandoSenha}
                autoComplete="new-password"
              />

              <div className="perfil-acoes">
                <button
                  type="submit"
                  className="perfil-botao perfil-botao--primario"
                  disabled={alterandoSenha}
                >
                  {alterandoSenha
                    ? 'Alterando senha...'
                    : 'Alterar senha'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </Layout>
  );
}