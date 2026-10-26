import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { PedidoStatusBadge } from '../components/PedidoStatusBadge';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { formatDateTime } from '../utils/format';
import { PERFIS } from '../types/perfil';
import type { Paginacao } from '../types/cliente';
import type {
  FiltroStatusPedido,
  ItemNovoPedido,
  ListaPedidosResponse,
  OpcoesPedido,
  PedidoPeca,
  PedidoPecaDetalhe,
  ResumoPedidos,
} from '../types/pedidoPeca';
import '../styles/pedidos-pecas.css';

const LIMITE = 8;
const QUANTIDADE_MAXIMA = 999;

const RESUMO_VAZIO: ResumoPedidos = {
  total: 0,
  rascunho: 0,
  enviado: 0,
  aprovado: 0,
  rejeitado: 0,
};

const OPCOES_VAZIAS: OpcoesPedido = { pecas: [], atendimentos: [] };

function mensagemDeErro(err: unknown, padrao: string): string {
  return err instanceof Error ? err.message : padrao;
}

function descricaoAtendimento(pedido: PedidoPeca): string {
  if (pedido.atendimentoId === null) return '—';
  return `${pedido.cliente} • ${pedido.placa}`;
}

export default function PedidosPecas() {
  const { perfil } = useAuth();
  const administrador = perfil === PERFIS.ADMINISTRADOR;

  // Lista
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusPedido>('todos');
  const [pagina, setPagina] = useState(1);
  const [pedidos, setPedidos] = useState<PedidoPeca[]>([]);
  const [resumo, setResumo] = useState<ResumoPedidos>(RESUMO_VAZIO);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Detalhe, envio e decisão
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<PedidoPecaDetalhe | null>(null);
  const [detalheCarregando, setDetalheCarregando] = useState(false);
  const [detalheErro, setDetalheErro] = useState('');
  const [motivo, setMotivo] = useState('');
  const [acaoEmCurso, setAcaoEmCurso] = useState(false);
  const detalheDialogRef = useRef<HTMLDialogElement>(null);

  // Novo pedido
  const [novoAberto, setNovoAberto] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesPedido>(OPCOES_VAZIAS);
  const [novoItens, setNovoItens] = useState<ItemNovoPedido[]>([]);
  const [pecaSelecionada, setPecaSelecionada] = useState('');
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState('1');
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState('');
  const [observacao, setObservacao] = useState('');
  const [novoErro, setNovoErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const novoDialogRef = useRef<HTMLDialogElement>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        limite: String(LIMITE),
        status: filtroStatus,
      });
      const resultado = await apiFetch<ListaPedidosResponse>(`/api/pedidos-pecas?${params}`);
      setPedidos(resultado.dados);
      setResumo(resultado.resumo);
      setPaginacao(resultado.paginacao);
    } catch (err) {
      setPedidos([]);
      setPaginacao(null);
      setError(mensagemDeErro(err, 'Erro ao carregar os pedidos de peças.'));
    } finally {
      setLoading(false);
    }
  }, [pagina, filtroStatus]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const detalheAberto = detalheId !== null;

  useEffect(() => {
    const dialog = detalheDialogRef.current;
    if (!dialog) return;

    if (detalheAberto && !dialog.open) {
      dialog.showModal();
    } else if (!detalheAberto && dialog.open) {
      dialog.close();
    }
  }, [detalheAberto]);

  useEffect(() => {
    const dialog = novoDialogRef.current;
    if (!dialog) return;

    if (novoAberto && !dialog.open) {
      dialog.showModal();
    } else if (!novoAberto && dialog.open) {
      dialog.close();
    }
  }, [novoAberto]);

  /* ---------- Detalhe, envio e decisão ---------- */

  async function abrirDetalhe(id: number) {
    setDetalheId(id);
    setDetalhe(null);
    setDetalheErro('');
    setMotivo('');
    setSuccess('');
    setDetalheCarregando(true);

    try {
      const resposta = await apiFetch<{ dados: PedidoPecaDetalhe }>(`/api/pedidos-pecas/${id}`);
      setDetalhe(resposta.dados);
    } catch (err) {
      setDetalheErro(mensagemDeErro(err, 'Não foi possível carregar o pedido.'));
    } finally {
      setDetalheCarregando(false);
    }
  }

  function fecharDetalhe() {
    if (!acaoEmCurso) setDetalheId(null);
  }

  async function enviarPedido(id: number) {
    setAcaoEmCurso(true);
    setError('');
    setDetalheErro('');

    try {
      await apiFetch(`/api/pedidos-pecas/${id}/enviar`, { method: 'PATCH' });
      setDetalheId(null);
      setSuccess(`Pedido PP-${id} enviado ao superior.`);
      await carregar();
    } catch (err) {
      const texto = mensagemDeErro(err, 'Não foi possível enviar o pedido.');
      if (detalheId !== null) setDetalheErro(texto);
      else setError(texto);
    } finally {
      setAcaoEmCurso(false);
    }
  }

  async function decidirPedido(decisao: 'aprovado' | 'rejeitado') {
    if (!detalhe) return;

    if (decisao === 'rejeitado' && motivo.trim().length < 3) {
      setDetalheErro('Informe o motivo da rejeição (pelo menos 3 caracteres).');
      return;
    }

    setAcaoEmCurso(true);
    setDetalheErro('');

    try {
      await apiFetch(`/api/pedidos-pecas/${detalhe.id}/decisao`, {
        method: 'PATCH',
        body: JSON.stringify({ decisao, motivo: motivo.trim() }),
      });
      setDetalheId(null);
      setSuccess(`Pedido PP-${detalhe.id} ${decisao === 'aprovado' ? 'aprovado' : 'rejeitado'}.`);
      await carregar();
    } catch (err) {
      setDetalheErro(mensagemDeErro(err, 'Não foi possível registrar a decisão.'));
      await carregar();
    } finally {
      setAcaoEmCurso(false);
    }
  }

  /* ---------- Novo pedido ---------- */

  async function abrirNovo() {
    setNovoItens([]);
    setPecaSelecionada('');
    setQuantidadeSelecionada('1');
    setAtendimentoSelecionado('');
    setObservacao('');
    setNovoErro('');
    setSuccess('');
    setNovoAberto(true);

    try {
      const resposta = await apiFetch<{ dados: OpcoesPedido }>('/api/pedidos-pecas/opcoes');
      setOpcoes(resposta.dados);
    } catch (err) {
      setNovoErro(mensagemDeErro(err, 'Não foi possível carregar as peças.'));
    }
  }

  function fecharNovo() {
    if (!salvando) setNovoAberto(false);
  }

  function adicionarItem() {
    setNovoErro('');

    if (!pecaSelecionada) {
      setNovoErro('Escolha a peça que deseja adicionar.');
      return;
    }

    const quantidade = Number(quantidadeSelecionada);

    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA) {
      setNovoErro(`Informe uma quantidade inteira entre 1 e ${QUANTIDADE_MAXIMA}.`);
      return;
    }

    const pecaId = Number(pecaSelecionada);

    setNovoItens((atuais) => {
      const existente = atuais.find((item) => item.pecaId === pecaId);

      // A mesma peça não repete: soma na linha que já existe.
      if (existente) {
        return atuais.map((item) =>
          item.pecaId === pecaId
            ? { ...item, quantidade: Math.min(item.quantidade + quantidade, QUANTIDADE_MAXIMA) }
            : item
        );
      }

      return [...atuais, { pecaId, quantidade }];
    });

    setPecaSelecionada('');
    setQuantidadeSelecionada('1');
  }

  function removerItem(pecaId: number) {
    setNovoItens((atuais) => atuais.filter((item) => item.pecaId !== pecaId));
  }

  async function salvarNovo(enviar: boolean) {
    setNovoErro('');

    if (novoItens.length === 0) {
      setNovoErro('Adicione pelo menos uma peça ao pedido.');
      return;
    }

    setSalvando(true);

    try {
      const resposta = await apiFetch<{ mensagem: string }>('/api/pedidos-pecas', {
        method: 'POST',
        body: JSON.stringify({
          itens: novoItens,
          observacao: observacao.trim(),
          atendimentoId: atendimentoSelecionado ? Number(atendimentoSelecionado) : null,
          enviar,
        }),
      });

      setNovoAberto(false);
      setSuccess(resposta.mensagem);
      setFiltroStatus('todos');
      setPagina(1);
      await carregar();
    } catch (err) {
      setNovoErro(mensagemDeErro(err, 'Não foi possível salvar o pedido.'));
    } finally {
      setSalvando(false);
    }
  }

  function dadosDaPeca(pecaId: number) {
    return opcoes.pecas.find((peca) => peca.id === pecaId);
  }

  const totalUnidadesNovo = novoItens.reduce((soma, item) => soma + item.quantidade, 0);
  const colunas = administrador ? 7 : 6;

  return (
    <Layout
      title="Pedidos de peças"
      subtitle="Solicite peças ao superior e acompanhe a resposta"
      documentTitle="OficinaDS | Pedidos de peças"
    >
      <section className="intro">
        <div>
          <span className="story-label">Pedidos de peças</span>
          <h2>{administrador ? 'Pedidos de peças da equipe' : 'Solicitar peças ao superior'}</h2>
          <p>
            {administrador
              ? 'Analise os pedidos enviados pela equipe e aprove ou rejeite cada um. Você também pode criar os seus.'
              : 'Monte um pedido com as peças e quantidades de que precisa, envie ao superior e acompanhe se foi aprovado ou rejeitado.'}
          </p>
        </div>

        <button className="button button--primary" type="button" onClick={abrirNovo}>
          + Novo pedido
        </button>
      </section>

      <section className="pedido-resumo" aria-label="Resumo dos pedidos">
        <div className="pedido-resumo__item">
          <span>Rascunhos</span>
          <strong>{resumo.rascunho}</strong>
        </div>
        <div className={`pedido-resumo__item ${resumo.enviado > 0 ? 'is-attention' : ''}`}>
          <span>Aguardando decisão</span>
          <strong>{resumo.enviado}</strong>
        </div>
        <div className="pedido-resumo__item">
          <span>Aprovados</span>
          <strong>{resumo.aprovado}</strong>
        </div>
        <div className="pedido-resumo__item">
          <span>Rejeitados</span>
          <strong>{resumo.rejeitado}</strong>
        </div>
      </section>

      <form
        className="search-panel search-panel--pedidos"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="field">
          <label htmlFor="pedido-filtro-status">Situação</label>
          <select
            id="pedido-filtro-status"
            value={filtroStatus}
            onChange={(event) => {
              setFiltroStatus(event.target.value as FiltroStatusPedido);
              setPagina(1);
            }}
          >
            <option value="todos">Todos</option>
            <option value="rascunho">Rascunhos</option>
            <option value="enviado">Aguardando decisão</option>
            <option value="aprovado">Aprovados</option>
            <option value="rejeitado">Rejeitados</option>
          </select>
        </div>

        <button
          className="button button--secondary"
          type="button"
          disabled={loading}
          onClick={carregar}
        >
          ↻ Atualizar
        </button>
      </form>

      <section className="panel" aria-labelledby="pedidos-list-title">
        <header className="panel__header">
          <div>
            <h3 id="pedidos-list-title">
              {administrador ? 'Todos os pedidos' : 'Meus pedidos'}
            </h3>
            <p className="search-summary">
              {paginacao
                ? `${paginacao.total} pedido${paginacao.total === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Carregando pedidos..." />}
        {error && <Feedback type="error" message={error} />}
        {success && <p className="feedback feedback--success">{success}</p>}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Pedido</th>
                {administrador && <th scope="col">Solicitante</th>}
                <th scope="col">Peças</th>
                <th scope="col">Atendimento</th>
                <th scope="col">Situação</th>
                <th scope="col">Atualizado em</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && pedidos.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={colunas}>
                    {filtroStatus === 'todos'
                      ? 'Nenhum pedido de peças ainda. Use "Novo pedido" para criar o primeiro.'
                      : 'Nenhum pedido com essa situação.'}
                  </td>
                </tr>
              )}

              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>
                    <span className="order-code">PP-{pedido.id}</span>
                    <small className="table-secondary">
                      {pedido.observacao ?? 'Sem observação'}
                    </small>
                  </td>
                  {administrador && <td>{pedido.solicitante}</td>}
                  <td className="nowrap">
                    <strong>
                      {pedido.totalItens} peça{pedido.totalItens === 1 ? '' : 's'}
                    </strong>
                    <small className="table-secondary">
                      {pedido.totalUnidades} unidade{pedido.totalUnidades === 1 ? '' : 's'}
                    </small>
                  </td>
                  <td>{descricaoAtendimento(pedido)}</td>
                  <td>
                    <PedidoStatusBadge status={pedido.status} />
                  </td>
                  <td className="nowrap">
                    {formatDateTime(pedido.decididoEm ?? pedido.enviadoEm ?? pedido.criadoEm)}
                  </td>
                  <td className="align-right">
                    <div className="pedido-actions">
                      <button
                        className="button button--secondary button--small"
                        type="button"
                        onClick={() => abrirDetalhe(pedido.id)}
                      >
                        {pedido.permissoes.podeDecidir ? 'Analisar' : 'Detalhes'}
                      </button>
                      {pedido.permissoes.podeEnviar && (
                        <button
                          className="button button--primary button--small"
                          type="button"
                          disabled={acaoEmCurso}
                          onClick={() => enviarPedido(pedido.id)}
                        >
                          Enviar ao superior
                        </button>
                      )}
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

      {/* ---------- Detalhe do pedido ---------- */}
      <dialog
        ref={detalheDialogRef}
        className="dialog dialog--pedido"
        aria-labelledby="pedido-detalhe-title"
        onClose={() => setDetalheId(null)}
        onClick={(event) => {
          if (event.target === detalheDialogRef.current) fecharDetalhe();
        }}
      >
        <header className="dialog__header">
          <h2 id="pedido-detalhe-title">
            {detalheId !== null ? `Pedido PP-${detalheId}` : 'Pedido'}
          </h2>
          <button
            className="dialog__close"
            type="button"
            aria-label="Fechar"
            onClick={fecharDetalhe}
            disabled={acaoEmCurso}
          >
            ✕
          </button>
        </header>

        <div className="dialog__body pedido-form">
          {detalheCarregando && <Feedback type="loading" message="Carregando pedido..." />}
          {detalheErro && <Feedback type="error" message={detalheErro} />}

          {detalhe && (
            <>
              <dl className="pedido-info">
                <div>
                  <dt>Situação</dt>
                  <dd>
                    <PedidoStatusBadge status={detalhe.status} />
                  </dd>
                </div>
                <div>
                  <dt>Solicitante</dt>
                  <dd>{detalhe.solicitante}</dd>
                </div>
                <div>
                  <dt>Criado em</dt>
                  <dd>{formatDateTime(detalhe.criadoEm)}</dd>
                </div>
                <div>
                  <dt>Enviado em</dt>
                  <dd>{detalhe.enviadoEm ? formatDateTime(detalhe.enviadoEm) : '—'}</dd>
                </div>
                <div className="pedido-info__wide">
                  <dt>Atendimento</dt>
                  <dd>
                    {detalhe.atendimentoId === null
                      ? 'Sem atendimento vinculado'
                      : `${detalhe.cliente} • ${detalhe.marca} ${detalhe.modelo} • ${detalhe.placa}`}
                  </dd>
                </div>
                <div className="pedido-info__wide">
                  <dt>Observação</dt>
                  <dd>{detalhe.observacao ?? 'Sem observação'}</dd>
                </div>
              </dl>

              {(detalhe.status === 'aprovado' || detalhe.status === 'rejeitado') && (
                <div
                  className={`pedido-decisao ${
                    detalhe.status === 'rejeitado' ? 'pedido-decisao--rejeitado' : ''
                  }`}
                >
                  <strong>
                    {detalhe.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                    {detalhe.decididoPor ? ` por ${detalhe.decididoPor}` : ''}
                    {detalhe.decididoEm ? ` em ${formatDateTime(detalhe.decididoEm)}` : ''}
                  </strong>
                  {detalhe.motivoDecisao ?? 'Sem observação do superior.'}
                </div>
              )}

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Código</th>
                      <th scope="col">Peça</th>
                      <th scope="col">Pedido</th>
                      <th scope="col">Em estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhe.itens.map((item) => (
                      <tr key={item.id}>
                        <td className="nowrap">
                          <strong>{item.codigo}</strong>
                        </td>
                        <td>
                          <span className="person-cell__identity">
                            <strong>{item.nome}</strong>
                            <small>{item.categoria}</small>
                          </span>
                        </td>
                        <td className="nowrap">
                          <strong>{item.quantidade}</strong>
                        </td>
                        <td className="nowrap">
                          {item.estoque}
                          {item.quantidade > item.estoque && (
                            <span className="estoque-alerta">Estoque insuficiente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detalhe.permissoes.podeDecidir && (
                <div className="field">
                  <label htmlFor="pedido-motivo">Motivo (obrigatório para rejeitar)</label>
                  <textarea
                    id="pedido-motivo"
                    className="pedido-observacao"
                    maxLength={255}
                    placeholder="Ex.: já temos essa peça em estoque."
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    disabled={acaoEmCurso}
                  />
                </div>
              )}

              <div className="dialog__actions">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={fecharDetalhe}
                  disabled={acaoEmCurso}
                >
                  Fechar
                </button>

                {detalhe.permissoes.podeEnviar && (
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => enviarPedido(detalhe.id)}
                    disabled={acaoEmCurso}
                  >
                    {acaoEmCurso ? 'Enviando...' : 'Enviar ao superior'}
                  </button>
                )}

                {detalhe.permissoes.podeDecidir && (
                  <>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => decidirPedido('rejeitado')}
                      disabled={acaoEmCurso}
                    >
                      Rejeitar
                    </button>
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => decidirPedido('aprovado')}
                      disabled={acaoEmCurso}
                    >
                      {acaoEmCurso ? 'Salvando...' : 'Aprovar'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </dialog>

      {/* ---------- Novo pedido ---------- */}
      <dialog
        ref={novoDialogRef}
        className="dialog dialog--pedido"
        aria-labelledby="pedido-novo-title"
        onClose={() => setNovoAberto(false)}
        onClick={(event) => {
          if (event.target === novoDialogRef.current) fecharNovo();
        }}
      >
        <header className="dialog__header">
          <h2 id="pedido-novo-title">Novo pedido de peças</h2>
          <button
            className="dialog__close"
            type="button"
            aria-label="Fechar"
            onClick={fecharNovo}
            disabled={salvando}
          >
            ✕
          </button>
        </header>

        <form
          className="dialog__body pedido-form"
          onSubmit={(event: FormEvent) => event.preventDefault()}
        >
          <div className="field">
            <label htmlFor="pedido-atendimento">Atendimento (opcional)</label>
            <select
              id="pedido-atendimento"
              value={atendimentoSelecionado}
              onChange={(event) => setAtendimentoSelecionado(event.target.value)}
              disabled={salvando}
            >
              <option value="">Sem atendimento vinculado</option>
              {opcoes.atendimentos.map((atendimento) => (
                <option key={atendimento.id} value={atendimento.id}>
                  {atendimento.cliente} • {atendimento.marca} {atendimento.modelo} •{' '}
                  {atendimento.placa}
                </option>
              ))}
            </select>
          </div>

          <div className="pedido-add">
            <div className="field">
              <label htmlFor="pedido-peca">Peça</label>
              <select
                id="pedido-peca"
                value={pecaSelecionada}
                onChange={(event) => setPecaSelecionada(event.target.value)}
                disabled={salvando}
              >
                <option value="">Selecione uma peça</option>
                {opcoes.pecas.map((peca) => (
                  <option key={peca.id} value={peca.id}>
                    {peca.nome} • {peca.codigo} (estoque: {peca.quantidade})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="pedido-quantidade">Quantidade</label>
              <input
                id="pedido-quantidade"
                type="number"
                min={1}
                max={QUANTIDADE_MAXIMA}
                step={1}
                value={quantidadeSelecionada}
                onChange={(event) => setQuantidadeSelecionada(event.target.value)}
                disabled={salvando}
              />
            </div>

            <button
              className="button button--secondary"
              type="button"
              onClick={adicionarItem}
              disabled={salvando}
            >
              Adicionar
            </button>
          </div>

          <div>
            {novoItens.length === 0 ? (
              <p className="pedido-itens-vazio">
                Nenhuma peça adicionada ainda. Escolha a peça e a quantidade e clique em
                "Adicionar".
              </p>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Peça</th>
                        <th scope="col">Quantidade</th>
                        <th scope="col">
                          <span className="visually-hidden">Remover</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {novoItens.map((item) => {
                        const peca = dadosDaPeca(item.pecaId);

                        return (
                          <tr key={item.pecaId}>
                            <td>
                              <span className="person-cell__identity">
                                <strong>{peca ? peca.nome : `Peça ${item.pecaId}`}</strong>
                                <small>
                                  {peca ? `${peca.codigo} • estoque: ${peca.quantidade}` : ''}
                                </small>
                              </span>
                            </td>
                            <td className="nowrap">
                              <strong>{item.quantidade}</strong>
                              {peca && item.quantidade > peca.quantidade && (
                                <span className="estoque-alerta">Maior que o estoque</span>
                              )}
                            </td>
                            <td className="align-right">
                              <button
                                className="button button--ghost button--small"
                                type="button"
                                onClick={() => removerItem(item.pecaId)}
                                disabled={salvando}
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="pedido-itens-total">
                  {novoItens.length} peça{novoItens.length === 1 ? '' : 's'} •{' '}
                  {totalUnidadesNovo} unidade{totalUnidadesNovo === 1 ? '' : 's'}
                </p>
              </>
            )}
          </div>

          <div className="field">
            <label htmlFor="pedido-observacao">Observação (opcional)</label>
            <textarea
              id="pedido-observacao"
              className="pedido-observacao"
              maxLength={255}
              placeholder="Ex.: para o carro que chega amanhã às 9h."
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              disabled={salvando}
            />
          </div>

          {novoErro && <Feedback type="error" message={novoErro} />}

          <div className="dialog__actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={fecharNovo}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => salvarNovo(false)}
              disabled={salvando || novoItens.length === 0}
            >
              Salvar rascunho
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={() => salvarNovo(true)}
              disabled={salvando || novoItens.length === 0}
            >
              {salvando ? 'Salvando...' : 'Enviar ao superior'}
            </button>
          </div>
        </form>
      </dialog>
    </Layout>
  );
}
