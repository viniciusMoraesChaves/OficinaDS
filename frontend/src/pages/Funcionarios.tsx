import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { EstrelasMedia } from '../components/EstrelasNota';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { apiFetch } from '../services/api';
import { formatCpf, formatDate, formatPhone } from '../utils/format';
import type {
  Funcionario,
  FuncionarioDetalhado,
  ListaFuncionariosResponse,
  RelatorioDiarioDados,
  RelatorioDiarioResponse,
  ServicoFuncionario,
  StatusFiltro,
} from '../types/funcionario';
import type { Paginacao } from '../types/cliente';
import type { Cargo, ListaCargosResponse } from '../types/cargo';
import '../styles/avaliacoes.css';

const LIMITE = 8;

type Filtros = { busca: string; status: StatusFiltro };
const FILTROS_INICIAIS: Filtros = { busca: '', status: 'todos' };

type EdicaoFuncionario = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  dataAdmissao: string;
  idCargo: string;
  ativo: boolean;
};

export default function Funcionarios() {
  // o que está no formulário
  const [inputBusca, setInputBusca] = useState('');
  const [inputStatus, setInputStatus] = useState<StatusFiltro>('todos');

  // a busca aplicada (dispara o fetch)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [pagina, setPagina] = useState(1);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [funcionarioSelecionado, setFuncionarioSelecionado] =
  useState<Funcionario | null>(null);
  const [edicaoFuncionario, setEdicaoFuncionario] = useState<EdicaoFuncionario | null>(null);
  const [servicosFuncionario, setServicosFuncionario] = useState<ServicoFuncionario[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [salvandoFuncionario, setSalvandoFuncionario] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');
  const [modalNovoCargoAberto, setModalNovoCargoAberto] = useState(false);
  const [nomeNovoCargo, setNomeNovoCargo] = useState('');
  const [descricaoNovoCargo, setDescricaoNovoCargo] = useState('');
  const [salvandoNovoCargo, setSalvandoNovoCargo] = useState(false);
  const [erroNovoCargo, setErroNovoCargo] = useState('');
  const [recarregar, setRecarregar] = useState(0);

  const [modalNovoFuncionarioAberto, setModalNovoFuncionarioAberto] = useState(false);
  const [novoFuncionario, setNovoFuncionario] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    dataAdmissao: '',
    idCargo: '',
    senha: ''
  });
  const [salvandoNovoFuncionario, setSalvandoNovoFuncionario] = useState(false);
  const [erroNovoFuncionario, setErroNovoFuncionario] = useState('');

  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [dataRelatorio, setDataRelatorio] = useState(() => {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset() * 60000;
    return new Date(hoje.getTime() - offset).toISOString().split('T')[0];
});
  const [funcionarioRelatorioId, setFuncionarioRelatorioId] = useState<number | null>(null);
  const [relatorioDados, setRelatorioDados] = useState<RelatorioDiarioDados | null>(null);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);
  const [erroRelatorio, setErroRelatorio] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const novoCargoDialogRef = useRef<HTMLDialogElement>(null);
  const novoFuncionarioDialogRef = useRef<HTMLDialogElement>(null);
  const relatorioDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function pesquisar() {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        pagina: String(pagina),
        limite: String(LIMITE),
        busca: filtros.busca,
        status: filtros.status,
      });

      try {
        const result = await apiFetch<ListaFuncionariosResponse>(
          `/api/funcionarios?${params}`
        );
        if (cancelled) return;
        setFuncionarios(result.dados);
        setPaginacao(result.paginacao);
      } catch (err) {
        if (cancelled) return;
        setFuncionarios([]);
        setPaginacao(null);
        setError(err instanceof Error ? err.message : 'Erro desconhecido.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    pesquisar();
    return () => {
      cancelled = true;
    };
  }, [filtros, pagina, recarregar]);

  useEffect(() => {
    async function carregarCargos() {
      try {
        const result = await apiFetch<ListaCargosResponse>('/api/cargos');
        setCargos(result.dados);
      } catch (err) {
        console.error('Erro ao carregar cargos:', err);
      }
    }

    carregarCargos();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (funcionarioSelecionado && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [funcionarioSelecionado]);

  useEffect(() => {
    const dialog = novoCargoDialogRef.current;

    if (modalNovoCargoAberto && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [modalNovoCargoAberto]);

  useEffect(() => {
    const dialog = novoFuncionarioDialogRef.current;

    if (modalNovoFuncionarioAberto && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [modalNovoFuncionarioAberto]);

  useEffect(() => {
    const dialog = relatorioDialogRef.current;

    if (modalRelatorioAberto && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [modalRelatorioAberto]);

  useEffect(() => {
    if (!modalRelatorioAberto) return;
    let cancelled = false;

    async function carregarRelatorio() {
      setCarregandoRelatorio(true);
      setErroRelatorio('');

      const params = new URLSearchParams({ data: dataRelatorio });
      if (funcionarioRelatorioId) {
        params.set('idFuncionario', String(funcionarioRelatorioId));
      }

      try {
        const resposta = await apiFetch<RelatorioDiarioResponse>(
          `/api/funcionarios/relatorio-diario?${params}`
        );
        if (cancelled) return;
        setRelatorioDados(resposta.dados);
      } catch (err) {
        if (cancelled) return;
        setRelatorioDados(null);
        setErroRelatorio(
          err instanceof Error ? err.message : 'Erro ao carregar relatório diário.'
        );
      } finally {
        if (!cancelled) setCarregandoRelatorio(false);
      }
    }

    carregarRelatorio();
    return () => {
      cancelled = true;
    };
  }, [modalRelatorioAberto, dataRelatorio, funcionarioRelatorioId]);

  function abrirRelatorio(idFuncionario: number | null = null) {
    setFuncionarioRelatorioId(idFuncionario);
    setModalRelatorioAberto(true);
  }

  function aplicar(busca: string, status: StatusFiltro) {
    setFiltros({ busca, status });
    setPagina(1);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    aplicar(inputBusca.trim(), inputStatus);
  }

  function handleStatusChange(status: StatusFiltro) {
    setInputStatus(status);
    aplicar(inputBusca.trim(), status); // equivale ao requestSubmit() do original
  }

  function handleClear() {
    setInputBusca('');
    setInputStatus('todos');
    aplicar('', 'todos');
    searchRef.current?.focus();
  }

  function resumo(total: number) {
    const partes: string[] = [];
    if (filtros.busca) partes.push(`“${filtros.busca}”`);
    if (filtros.status !== 'todos') partes.push(filtros.status);

    return partes.length
      ? `${total} resultado${total === 1 ? '' : 's'} para ${partes.join(' • ')}`
      : `${total} funcionário${total === 1 ? '' : 's'} no total`;
  }

  async function handleEditarFuncionario(funcionario: Funcionario) {
    setFuncionarioSelecionado(funcionario);
    setEdicaoFuncionario({
      nome: funcionario.nome,
      cpf: funcionario.cpf,
      email: funcionario.email,
      telefone: funcionario.telefone || '',
      dataAdmissao: String(funcionario.dataAdmissao).slice(0, 10),
      idCargo: String(funcionario.cargoId),
      ativo: Boolean(funcionario.ativo),
    });
    setServicosFuncionario([]);
    setErroEdicao('');
    setCarregandoDetalhes(true);

    try {
      const resposta = await apiFetch<{ dados: FuncionarioDetalhado }>(
        `/api/funcionarios/${funcionario.id}`
      );
      const detalhe = resposta.dados;
      setEdicaoFuncionario({
        nome: detalhe.nome,
        cpf: detalhe.cpf,
        email: detalhe.email,
        telefone: detalhe.telefone || '',
        dataAdmissao: detalhe.dataAdmissao.slice(0, 10),
        idCargo: String(detalhe.cargoId),
        ativo: Boolean(detalhe.ativo),
      });
      setServicosFuncionario(detalhe.servicos);
    } catch (err) {
      setErroEdicao(err instanceof Error ? err.message : 'Erro ao carregar funcionário.');
    } finally {
      setCarregandoDetalhes(false);
    }
  }

  async function handleSalvarFuncionario(event: FormEvent) {
    event.preventDefault();
    if (!funcionarioSelecionado || !edicaoFuncionario) return;

    if (!edicaoFuncionario.nome.trim()) {
      setErroEdicao('Informe o nome do funcionário.');
      return;
    }

    if (edicaoFuncionario.cpf.replace(/\D/g, '').length !== 11) {
      setErroEdicao('Informe um CPF válido com 11 dígitos.');
      return;
    }

    setSalvandoFuncionario(true);
    setErroEdicao('');

    try {
      await apiFetch(`/api/funcionarios/${funcionarioSelecionado.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...edicaoFuncionario,
          nome: edicaoFuncionario.nome.trim(),
          cpf: edicaoFuncionario.cpf,
          email: edicaoFuncionario.email.trim(),
          telefone: edicaoFuncionario.telefone.trim(),
          idCargo: Number(edicaoFuncionario.idCargo),
        }),
      });

      dialogRef.current?.close();
      setRecarregar((valor) => valor + 1);
    } catch (err) {
      setErroEdicao(err instanceof Error ? err.message : 'Erro ao atualizar funcionário.');
    } finally {
      setSalvandoFuncionario(false);
    }
  }

  async function handleCadastrarCargo() {
    const nome = nomeNovoCargo.trim();
    const descricao = descricaoNovoCargo.trim();

    if (!nome) {
      setErroNovoCargo('Informe o nome do cargo.');
      return;
    }

    setSalvandoNovoCargo(true);
    setErroNovoCargo('');

    try {
      const resultado = await apiFetch<{
        dados: Cargo;
        mensagem: string;
      }>('/api/cargos', {
        method: 'POST',
        body: JSON.stringify({
          nome,
          descricao
        })
      });

      setCargos((atuais) => [...atuais, resultado.dados]);

      setNomeNovoCargo('');
      setDescricaoNovoCargo('');

      novoCargoDialogRef.current?.close();
    } catch (err) {
      setErroNovoCargo(
        err instanceof Error ? err.message : 'Erro ao cadastrar cargo.'
      );
    } finally {
      setSalvandoNovoCargo(false);
    }
  }

  async function handleCadastrarFuncionario() {
    const { nome, cpf, email, telefone, dataAdmissao, idCargo, senha } = novoFuncionario;

    if (!nome.trim()) {
      setErroNovoFuncionario('Informe o nome do funcionário.');
      return;
    }
    if (cpf.replace(/\D/g, '').length !== 11) {
      setErroNovoFuncionario('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!email.trim()) {
      setErroNovoFuncionario('Informe o e-mail do funcionário.');
      return;
    }
    if (!dataAdmissao) {
      setErroNovoFuncionario('Informe a data de admissão.');
      return;
    }
    if (!idCargo) {
      setErroNovoFuncionario('Selecione um cargo.');
      return;
    }
    if (senha.length < 6) {
      setErroNovoFuncionario('A senha deve ter ao menos 6 caracteres.');
      return;
    }

    setSalvandoNovoFuncionario(true);
    setErroNovoFuncionario('');

    try {
      const criado = await apiFetch<{ posicao?: number }>('/api/funcionarios', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          cpf,
          email: email.trim(),
          telefone,
          dataAdmissao,
          idCargo: Number(idCargo),
          senha
        })
      });

      setNovoFuncionario({ nome: '', cpf: '', email: '', telefone: '', dataAdmissao: '', idCargo: '', senha: '' });
      novoFuncionarioDialogRef.current?.close();

      // Limpa os filtros e abre a página onde o novo funcionário aparece
      // (a lista é paginada e ordenada por nome).
      setInputBusca('');
      setInputStatus('todos');
      setFiltros({ busca: '', status: 'todos' });
      setPagina(criado.posicao ? Math.max(1, Math.ceil(criado.posicao / LIMITE)) : 1);
      setRecarregar((v) => v + 1);
    } catch (err) {
      setErroNovoFuncionario(
        err instanceof Error ? err.message : 'Erro ao cadastrar funcionário.'
      );
    } finally {
      setSalvandoNovoFuncionario(false);
    }
  }

  const maxServicosGrafico = Math.max(
    ...(relatorioDados?.graficoSemanal.map((g) => g.totalServicos) || [1]),
    1
  );

  return (
    <Layout
      title="Funcionários"
      subtitle="Equipe e cargos da oficina"
      documentTitle="OficinaDS | Pesquisar funcionários"
    >
      <section className="intro">
        <div>
          <h2>Pesquisar funcionários</h2>
          <p>
            Digite um nome, CPF, e-mail ou cargo. Você também pode limitar o
            resultado a funcionários ativos ou inativos.
          </p>
        </div>
      </section>

      <form className="search-panel" role="search" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="funcionarios-search">O que você procura?</label>
          <input
            ref={searchRef}
            id="funcionarios-search"
            name="busca"
            type="search"
            maxLength={100}
            placeholder="Ex.: Carlos, Mecânico ou CPF"
            autoComplete="off"
            value={inputBusca}
            onChange={(e) => setInputBusca(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="funcionarios-status">Status</label>
          <select
            id="funcionarios-status"
            name="status"
            value={inputStatus}
            onChange={(e) => handleStatusChange(e.target.value as StatusFiltro)}
          >
            <option value="todos">Todos</option>
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente inativos</option>
          </select>
        </div>

        <button className="button button--primary" type="submit" disabled={loading}>
          Pesquisar
        </button>
        <button className="button button--ghost" type="button" onClick={handleClear}>
          Limpar
        </button>
      </form>

      <section className="panel" aria-labelledby="funcionarios-list-title">
        <header className="panel__header">
          <div>
            <h3 id="funcionarios-list-title">Resultado da pesquisa</h3>
            <p className="search-summary">{paginacao ? resumo(paginacao.total) : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => abrirRelatorio(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <BarChart3 size={16} aria-hidden="true" />
              Relatório diário
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setModalNovoCargoAberto(true)}
            >
              Novo cargo
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={() => setModalNovoFuncionarioAberto(true)}
            >
              Novo funcionário
            </button>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Pesquisando funcionários..." />}
        {error && <Feedback type="error" message={error} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Funcionário</th>
                <th scope="col">Cargo</th>
                <th scope="col">Avaliação</th>
                <th scope="col">CPF</th>
                <th scope="col">Telefone</th>
                <th scope="col">Admissão</th>
                <th scope="col">Status</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && funcionarios.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={8}>
                    Nenhum funcionário corresponde à pesquisa.
                  </td>
                </tr>
              )}

              {funcionarios.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar avatar--blue">
                        {f.nome.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="person-cell__identity">
                        <strong>{f.nome}</strong>
                        <small>{f.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>{f.cargo}</td>
                  <td>
                    <EstrelasMedia media={f.avaliacaoMedia} total={f.totalAvaliacoes} />
                  </td>
                  <td className="nowrap">{formatCpf(f.cpf)}</td>
                  <td className="nowrap">{formatPhone(f.telefone)}</td>
                  <td className="nowrap">{formatDate(f.dataAdmissao)}</td>
                  <td><StatusBadge active={Boolean(f.ativo)} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="button button--ghost button--small"
                        type="button"
                        onClick={() => abrirRelatorio(f.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <TrendingUp size={14} aria-hidden="true" />
                        Desempenho
                      </button>
                      <button
                        className="button button--secondary button--small"
                        type="button"
                        onClick={() => handleEditarFuncionario(f)}
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginacao && (
          <Pagination
            pagina={paginacao.pagina}
            totalPaginas={paginacao.totalPaginas}
            total={paginacao.total}
            onPageChange={setPagina}
          />
        )}
      </section>
      {funcionarioSelecionado && (
        <dialog
          ref={dialogRef}
          className="dialog dialog--employee"
          onClose={() => {
            setFuncionarioSelecionado(null);
            setEdicaoFuncionario(null);
            setServicosFuncionario([]);
          }}
        >
          <div className="dialog__header">
            <h2>Administrar funcionário</h2>

            <button
              className="dialog__close"
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar"
              disabled={salvandoFuncionario}
            >
              ×
            </button>
          </div>

          {edicaoFuncionario && (
            <form className="dialog__body employee-admin" onSubmit={handleSalvarFuncionario}>
              {carregandoDetalhes && (
                <Feedback type="loading" message="Carregando dados e serviços..." />
              )}

              <div className="employee-form-grid">
                <div className="field employee-form-grid__wide">
                  <label htmlFor="editar-func-nome">Nome</label>
                  <input
                    id="editar-func-nome"
                    type="text"
                    maxLength={120}
                    value={edicaoFuncionario.nome}
                    onChange={(e) => setEdicaoFuncionario({ ...edicaoFuncionario, nome: e.target.value })}
                    disabled={salvandoFuncionario}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="editar-func-cpf">CPF</label>
                  <input
                    id="editar-func-cpf"
                    type="text"
                    maxLength={14}
                    value={edicaoFuncionario.cpf}
                    onChange={(e) => setEdicaoFuncionario({ ...edicaoFuncionario, cpf: e.target.value })}
                    disabled={salvandoFuncionario}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="editar-func-telefone">Telefone</label>
                  <input
                    id="editar-func-telefone"
                    type="text"
                    maxLength={20}
                    value={edicaoFuncionario.telefone}
                    onChange={(e) => setEdicaoFuncionario({ ...edicaoFuncionario, telefone: e.target.value })}
                    disabled={salvandoFuncionario}
                  />
                </div>

                <div className="field employee-form-grid__wide">
                  <label htmlFor="editar-func-email">E-mail de acesso</label>
                  <input
                    id="editar-func-email"
                    type="email"
                    maxLength={150}
                    value={edicaoFuncionario.email}
                    onChange={(e) => setEdicaoFuncionario({ ...edicaoFuncionario, email: e.target.value })}
                    disabled={salvandoFuncionario}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="editar-func-admissao">Data de admissão</label>
                  <input
                    id="editar-func-admissao"
                    type="date"
                    value={edicaoFuncionario.dataAdmissao}
                    onChange={(e) => setEdicaoFuncionario({ ...edicaoFuncionario, dataAdmissao: e.target.value })}
                    disabled={salvandoFuncionario}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="editar-func-cargo">Cargo</label>
                  <select
                    id="editar-func-cargo"
                    value={edicaoFuncionario.idCargo}
                    onChange={(e) => setEdicaoFuncionario({ ...edicaoFuncionario, idCargo: e.target.value })}
                    disabled={salvandoFuncionario}
                    required
                  >
                    <option value="">Selecione um cargo</option>
                    {cargos.map((cargo) => (
                      <option key={cargo.id} value={cargo.id}>{cargo.nome}</option>
                    ))}
                  </select>
                </div>

                <label className="employee-active-toggle employee-form-grid__wide">
                  <input
                    type="checkbox"
                    checked={edicaoFuncionario.ativo}
                    onChange={(e) => setEdicaoFuncionario({ ...edicaoFuncionario, ativo: e.target.checked })}
                    disabled={salvandoFuncionario}
                  />
                  <span>
                    <strong>Funcionário ativo</strong>
                    <small>Inativos permanecem no histórico, mas não recebem novos serviços.</small>
                  </span>
                </label>
              </div>

              <section className="employee-rating" aria-labelledby="avaliacao-funcionario-title">
                <div>
                  <h3 id="avaliacao-funcionario-title">Avaliação dos clientes</h3>
                  <p>Média das notas de 1 a 5 estrelas dadas aos atendimentos deste profissional.</p>
                </div>
                <EstrelasMedia
                  media={funcionarioSelecionado.avaliacaoMedia}
                  total={funcionarioSelecionado.totalAvaliacoes}
                />
              </section>

              <section className="employee-services" aria-labelledby="servicos-funcionario-title">
                <div className="employee-services__header">
                  <div>
                    <h3 id="servicos-funcionario-title">Serviços atribuídos</h3>
                    <p>Agendamentos e atendimentos vinculados a este profissional.</p>
                  </div>
                  <span>{servicosFuncionario.length}</span>
                </div>

                {!carregandoDetalhes && servicosFuncionario.length === 0 && (
                  <p className="employee-services__empty">Nenhum serviço atribuído.</p>
                )}

                <div className="employee-services__list">
                  {servicosFuncionario.map((servico) => (
                    <article className="employee-service" key={`${servico.tipo}-${servico.referencia}`}>
                      <div>
                        <span className="order-code">{servico.referencia}</span>
                        <strong>{servico.servico}</strong>
                        <small>{servico.veiculo}</small>
                      </div>
                      <div className="employee-service__meta">
                        <span>{servico.status}</span>
                        <small>{formatDate(servico.dataHora)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {erroEdicao && <Feedback type="error" message={erroEdicao} />}

              <div className="dialog__actions">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  disabled={salvandoFuncionario}
                >
                  Fechar
                </button>

                <button
                  className="button button--primary"
                  type="submit"
                  disabled={salvandoFuncionario || carregandoDetalhes}
                >
                  {salvandoFuncionario ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          )}
        </dialog>
      )}
        {modalNovoCargoAberto && (
          <dialog 
            ref={novoCargoDialogRef}
            className="dialog"
            onClose={() => setModalNovoCargoAberto(false)}
          >
            <div className="dialog__header">
              <h2>Novo cargo</h2>
              <button
                className="dialog__close"
                type="button"
                onClick={() => novoCargoDialogRef.current?.close()}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="dialog__body">
              <div className="field">
                <label htmlFor="nome-novo-cargo">Nome</label>

                <input
                  id="nome-novo-cargo"
                  type="text"
                  value={nomeNovoCargo}
                  onChange={(e) => setNomeNovoCargo(e.target.value)}
                  placeholder="Ex.: Eletricista"
                />
              </div>

              <div className="field">
                <label htmlFor="descricao-novo-cargo">Descrição</label>

                <input
                  id="descricao-novo-cargo"
                  type="text"
                  value={descricaoNovoCargo}
                  onChange={(e) => setDescricaoNovoCargo(e.target.value)}
                  placeholder="Ex.: Responsável por serviços elétricos"
                />
              </div>
              {erroNovoCargo && (
                <Feedback
                  type="error"
                  message={erroNovoCargo}
                />
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '20px'
                }}
              >
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => novoCargoDialogRef.current?.close()}
                  disabled={salvandoNovoCargo}
                >
                  Cancelar
                </button>

                <button
                  className="button button--primary"
                  type="button"
                  onClick={handleCadastrarCargo}
                  disabled={salvandoNovoCargo}
                >
                  {salvandoNovoCargo ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </dialog>
        )}
        {modalNovoFuncionarioAberto && (
          <dialog
            ref={novoFuncionarioDialogRef}
            className="dialog"
            onClose={() => setModalNovoFuncionarioAberto(false)}
          >
            <div className="dialog__header">
              <h2>Novo funcionário</h2>
              <button
                className="dialog__close"
                type="button"
                onClick={() => novoFuncionarioDialogRef.current?.close()}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="dialog__body">
              <div className="field">
                <label htmlFor="novo-func-nome">Nome</label>
                <input
                  id="novo-func-nome"
                  type="text"
                  value={novoFuncionario.nome}
                  onChange={(e) => setNovoFuncionario((v) => ({ ...v, nome: e.target.value }))}
                  placeholder="Ex.: Maria Souza"
                />
              </div>

              <div className="field">
                <label htmlFor="novo-func-cpf">CPF</label>
                <input
                  id="novo-func-cpf"
                  type="text"
                  value={novoFuncionario.cpf}
                  onChange={(e) => setNovoFuncionario((v) => ({ ...v, cpf: e.target.value }))}
                  placeholder="Somente números"
                  maxLength={14}
                />
              </div>

              <div className="field">
                <label htmlFor="novo-func-email">E-mail</label>
                <input
                  id="novo-func-email"
                  type="email"
                  value={novoFuncionario.email}
                  onChange={(e) => setNovoFuncionario((v) => ({ ...v, email: e.target.value }))}
                  placeholder="maria.souza@oficina.test"
                />
              </div>

              <div className="field">
                <label htmlFor="novo-func-telefone">Telefone</label>
                <input
                  id="novo-func-telefone"
                  type="text"
                  value={novoFuncionario.telefone}
                  onChange={(e) => setNovoFuncionario((v) => ({ ...v, telefone: e.target.value }))}
                  placeholder="(11) 90000-0000"
                />
              </div>

              <div className="field">
                <label htmlFor="novo-func-admissao">Data de admissão</label>
                <input
                  id="novo-func-admissao"
                  type="date"
                  value={novoFuncionario.dataAdmissao}
                  onChange={(e) => setNovoFuncionario((v) => ({ ...v, dataAdmissao: e.target.value }))}
                />
              </div>

              <div className="field">
                <label htmlFor="novo-func-cargo">Cargo</label>
                <select
                  id="novo-func-cargo"
                  value={novoFuncionario.idCargo}
                  onChange={(e) => setNovoFuncionario((v) => ({ ...v, idCargo: e.target.value }))}
                >
                  <option value="">Selecione um cargo</option>
                  {cargos.map((cargo) => (
                    <option key={cargo.id} value={cargo.id}>{cargo.nome}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="novo-func-senha">Senha de acesso</label>
                <input
                  id="novo-func-senha"
                  type="password"
                  value={novoFuncionario.senha}
                  onChange={(e) => setNovoFuncionario((v) => ({ ...v, senha: e.target.value }))}
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>

              {erroNovoFuncionario && <Feedback type="error" message={erroNovoFuncionario} />}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => novoFuncionarioDialogRef.current?.close()}
                  disabled={salvandoNovoFuncionario}
                >
                  Cancelar
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={handleCadastrarFuncionario}
                  disabled={salvandoNovoFuncionario}
                >
                  {salvandoNovoFuncionario ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </dialog>
        )}

      {modalRelatorioAberto && (
        <dialog
          ref={relatorioDialogRef}
          className="dialog dialog--employee"
          onClose={() => {
            setModalRelatorioAberto(false);
            setFuncionarioRelatorioId(null);
          }}
        >
          <div className="dialog__header">
            <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} aria-hidden="true" />
              {funcionarioRelatorioId
                ? 'Desempenho individual do funcionário'
                : 'Relatório diário da equipe'}
            </h2>
            <button
              className="dialog__close"
              type="button"
              onClick={() => relatorioDialogRef.current?.close()}
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="dialog__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="field" style={{ margin: 0 }}>
                <label
                  htmlFor="relatorio-data"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Calendar size={14} aria-hidden="true" />
                  Data de referência
                </label>
                <input
                  id="relatorio-data"
                  type="date"
                  value={dataRelatorio}
                  onChange={(e) => setDataRelatorio(e.target.value)}
                />
              </div>

              {funcionarioRelatorioId && (
                <button
                  className="button button--ghost button--small"
                  type="button"
                  onClick={() => setFuncionarioRelatorioId(null)}
                >
                  Ver toda a equipe
                </button>
              )}
            </div>

            {carregandoRelatorio && (
              <Feedback type="loading" message="Calculando desempenho e carregando gráficos..." />
            )}
            {erroRelatorio && <Feedback type="error" message={erroRelatorio} />}

            {!carregandoRelatorio && !erroRelatorio && relatorioDados && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <small
                      style={{
                        color: '#6b7280',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px',
                      }}
                    >
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Serviços concluídos
                    </small>
                    <strong style={{ fontSize: '1.35rem', display: 'block' }}>
                      {relatorioDados.resumoGeral.totalServicosDia}
                    </strong>
                  </div>

                  <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <small
                      style={{
                        color: '#6b7280',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px',
                      }}
                    >
                      <Award size={14} aria-hidden="true" />
                      Índice médio de desempenho
                    </small>
                    <strong style={{ fontSize: '1.35rem', display: 'block' }}>
                      {relatorioDados.resumoGeral.mediaDesempenhoEquipe}%
                    </strong>
                  </div>

                  <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <small
                      style={{
                        color: '#6b7280',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px',
                      }}
                    >
                      <Calendar size={14} aria-hidden="true" />
                      Data consultada
                    </small>
                    <strong style={{ fontSize: '1.1rem', display: 'block' }}>
                      {formatDate(relatorioDados.dataReferencia)}
                    </strong>
                  </div>
                </div>

                <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <h3
                    style={{
                      margin: '0 0 12px',
                      fontSize: '0.95rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <TrendingUp size={16} aria-hidden="true" />
                    Serviços concluídos nos últimos 7 dias
                  </h3>

                  {(() => {
                    const mapaDias = new Map(
                      relatorioDados.graficoSemanal.map((p) => [p.dia, p])
                    );

                    const seteDias = Array.from({ length: 7 }, (_, i) => {
                      const base = new Date(`${dataRelatorio}T12:00:00`);
                      base.setDate(base.getDate() - (6 - i));
                      const iso = base.toISOString().split('T')[0];
                      return (
                        mapaDias.get(iso) || {
                          dia: iso,
                          totalServicos: 0,
                          tempoMedioMinutos: 0,
                        }
                      );
                    });

                    const maxServicos = Math.max(...seteDias.map((d) => d.totalServicos), 1);

                    return (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '130px' }}>
                        {seteDias.map((ponto) => {
                          const altura =
                            ponto.totalServicos > 0
                              ? Math.max(Math.round((ponto.totalServicos / maxServicos) * 90), 12)
                              : 4;

                          return (
                            <div
                              key={ponto.dia}
                              style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <small style={{ fontWeight: 600, color: ponto.totalServicos > 0 ? '#111827' : '#9ca3af' }}>
                                {ponto.totalServicos}
                              </small>
                              <div
                                title={
                                  ponto.totalServicos > 0
                                    ? `${ponto.totalServicos} serviço(s) • Tempo médio: ${ponto.tempoMedioMinutos} min`
                                    : 'Nenhum serviço concluído'
                                }
                                style={{
                                  width: '60%',
                                  maxWidth: '36px',
                                  height: `${altura}px`,
                                  backgroundColor: ponto.totalServicos > 0 ? '#f59e0b' : '#e5e7eb',
                                  borderRadius: '4px 4px 0 0',
                                  transition: 'height 0.2s ease',
                                }}
                              />
                              <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                {ponto.dia.slice(8, 10)}/{ponto.dia.slice(5, 7)}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Funcionário</th>
                        <th scope="col">Serviços</th>
                        <th scope="col">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} aria-hidden="true" />
                            Tempo médio
                          </span>
                        </th>
                        <th scope="col">Dificuldades (B / M / A)</th>
                        <th scope="col">Desempenho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioDados.funcionarios.length === 0 && (
                        <tr>
                          <td className="empty-cell" colSpan={5}>
                            Nenhum registro encontrado para esta data.
                          </td>
                        </tr>
                      )}
                      {relatorioDados.funcionarios.map((f) => (
                        <tr key={f.id}>
                          <td>
                            <strong>{f.nome}</strong>
                            <small style={{ display: 'block', color: '#6b7280' }}>{f.cargo}</small>
                          </td>
                          <td>{f.totalServicos}</td>
                          <td className="nowrap">{f.tempoMedioMinutos} min</td>
                          <td className="nowrap">
                            {f.distribuicaoDificuldade.baixa} / {f.distribuicaoDificuldade.media} / {f.distribuicaoDificuldade.alta}
                          </td>
                          <td>
                            <strong>{f.indiceDesempenho}%</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="dialog__actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => relatorioDialogRef.current?.close()}
              >
                Fechar
              </button>
            </div>
          </div>
        </dialog>
      )}
    </Layout>
  );
}