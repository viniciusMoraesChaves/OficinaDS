import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { apiFetch } from '../services/api';
import { formatCpf, formatDate, formatPhone } from '../utils/format';
import type {
  Funcionario,
  ListaFuncionariosResponse,
  StatusFiltro,
} from '../types/funcionario';
import type { Paginacao } from '../types/cliente';
import type { Cargo, ListaCargosResponse } from '../types/cargo';

const LIMITE = 8;

type Filtros = { busca: string; status: StatusFiltro };
const FILTROS_INICIAIS: Filtros = { busca: '', status: 'todos' };

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
  const [cargoSelecionado, setCargoSelecionado] = useState<number | null>(null);
  const [salvandoCargo, setSalvandoCargo] = useState(false);
  const [erroCargo, setErroCargo] = useState('');
  const [listaCargosAberta, setListaCargosAberta] = useState(false);
  const [modalNovoCargoAberto, setModalNovoCargoAberto] = useState(false);
  const [nomeNovoCargo, setNomeNovoCargo] = useState('');
  const [descricaoNovoCargo, setDescricaoNovoCargo] = useState('');
  const [salvandoNovoCargo, setSalvandoNovoCargo] = useState(false);
  const [erroNovoCargo, setErroNovoCargo] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const novoCargoDialogRef = useRef<HTMLDialogElement>(null);

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
  }, [filtros, pagina]);

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

  function handleEditarFuncionario(funcionario: Funcionario) {
    setFuncionarioSelecionado(funcionario);
    setCargoSelecionado(funcionario.cargoId);
  }
  async function handleSalvarCargo() {
    if (!funcionarioSelecionado || cargoSelecionado === null) {
      return;
    }

    setSalvandoCargo(true);
    setErroCargo('');

    try {
      await apiFetch(
        `/api/funcionarios/${funcionarioSelecionado.id}/cargo`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            idCargo: cargoSelecionado
          })
        }
      );
      const cargoAtualizado = cargos.find(
        (cargo) => cargo.id === cargoSelecionado
      );

      if (cargoAtualizado) {
        setFuncionarios((atuais) =>
          atuais.map((funcionario) =>
            funcionario.id === funcionarioSelecionado.id
              ? {
                  ...funcionario,
                  cargoId: cargoAtualizado.id,
                  cargo: cargoAtualizado.nome
                }
              : funcionario
          )
        );
      }

      dialogRef.current?.close();
    } catch (err) {
      setErroCargo(
        err instanceof Error ? err.message : 'Erro ao atualizar cargo.'
      );
    } finally {
      setSalvandoCargo(false);
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

  return (
    <Layout
      title="Funcionários"
      subtitle="Equipe e cargos da oficina"
      documentTitle="OficinaDS | Pesquisar funcionários"
    >
      <section className="intro">
        <div>
          <span className="story-label">DM-100</span>
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
          <button
            className="button button--primary"
            type="button"
            onClick={() => setModalNovoCargoAberto(true)}
          >
            Novo cargo
          </button>
        </header>

        {loading && <Feedback type="loading" message="Pesquisando funcionários..." />}
        {error && <Feedback type="error" message={error} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Funcionário</th>
                <th scope="col">Cargo</th>
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
                  <td className="empty-cell" colSpan={7}>
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
                  <td className="nowrap">{formatCpf(f.cpf)}</td>
                  <td className="nowrap">{formatPhone(f.telefone)}</td>
                  <td className="nowrap">{formatDate(f.dataAdmissao)}</td>
                  <td><StatusBadge active={Boolean(f.ativo)} /></td>
                  <td>
                    <button
                      className="button button--secondary button--small"
                      type="button"
                      onClick={() => handleEditarFuncionario(f)}
                    >
                      Editar
                    </button>
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
          className="dialog dialog--cargo"
          onClose={() => {
            setFuncionarioSelecionado(null);
            setCargoSelecionado(null);
          }}
        >
          <div className="dialog__header">
            <h2>Editar cargo</h2>

            <button
              className="dialog__close"
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <div className="dialog__body">
            <div className="field">
              <label htmlFor="cargo-funcionario">
                Cargo de {funcionarioSelecionado.nome}
              </label>

              <div className="cargo-select">
                <button
                  className="cargo-select__button"
                  type="button"
                  onClick={() => setListaCargosAberta((aberta) => !aberta)}
                >
                  <span>
                    {cargos.find((cargo) => cargo.id === cargoSelecionado)?.nome ??
                      'Selecione um cargo'}
                  </span>

                  <span className="cargo-select__arrow">
                    {listaCargosAberta ? '▲' : '▼'}
                  </span>
                </button>

                {listaCargosAberta && (
                  <div className="cargo-select__options">
                    {cargos.map((cargo) => (
                      <button
                        key={cargo.id}
                        className={
                          cargo.id === cargoSelecionado
                            ? 'cargo-select__option cargo-select__option--selected'
                            : 'cargo-select__option'
                        }
                        type="button"
                        onClick={() => {
                          setCargoSelecionado(cargo.id);
                          setListaCargosAberta(false);
                        }}
                      >
                        {cargo.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {erroCargo && (
              <Feedback
                type="error"
                message={erroCargo}
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
                onClick={() => dialogRef.current?.close()}
                disabled={salvandoCargo}
              >
                Cancelar
              </button>

              <button
                className="button button--primary"
                type="button"
                onClick={handleSalvarCargo}
                disabled={salvandoCargo}
              >
                {salvandoCargo ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
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
    </Layout>
  );
}