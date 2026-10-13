import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { apiFetch } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import type { ClienteOpcao } from '../types/cliente';
import type { AtendimentoAberto, ItemOrcamentoForm, OrcamentoEquipe, StatusOrcamento } from '../types/orcamento';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Aguardando cliente',
  aceito: 'Aceito',
  recusado: 'Recusado'
};

const INTERVALO_ATUALIZACAO_MS = 10000;

export default function Atendimentos() {
  const [atendimentos, setAtendimentos] = useState<AtendimentoAberto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  // --- adicionar cliente ao atendimento ---
  const adicionarDialogRef = useRef<HTMLDialogElement>(null);
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  const [clientes, setClientes] = useState<ClienteOpcao[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<number | ''>('');
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<number | ''>('');
  const [salvandoAtendimento, setSalvandoAtendimento] = useState(false);
  const [erroAtendimento, setErroAtendimento] = useState('');

  // --- orçamento ---
  const orcamentoDialogRef = useRef<HTMLDialogElement>(null);
  const [atendimentoOrcamento, setAtendimentoOrcamento] = useState<AtendimentoAberto | null>(null);
  const [situacaoVeiculo, setSituacaoVeiculo] = useState('');
  const [itens, setItens] = useState<ItemOrcamentoForm[]>([{ descricao: '', valor: 0 }]);
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [erroOrcamento, setErroOrcamento] = useState('');
  const [orcamentoCriadoId, setOrcamentoCriadoId] = useState<number | null>(null);

  const [orcamentos, setOrcamentos] = useState<OrcamentoEquipe[]>([]);

  const carregarOrcamentos = useCallback(async () => {
    try {
      const { dados } = await apiFetch<{ dados: OrcamentoEquipe[] }>('/api/orcamentos');
      setOrcamentos(dados);
    } catch {
      // atualização silenciosa; a próxima tentativa corrige
    }
  }, []);

  const carregarAtendimentos = useCallback(async () => {
    setLoading(true);
    setErro('');

    try {
      const { dados } = await apiFetch<{ dados: AtendimentoAberto[] }>('/api/atendimentos');
      setAtendimentos(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar atendimentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'OficinaOS | Atendimentos';
    carregarAtendimentos();
    carregarOrcamentos();

    // Mostra as decisões dos clientes sem precisar recarregar a página.
    const timer = setInterval(carregarOrcamentos, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(timer);
  }, [carregarAtendimentos, carregarOrcamentos]);

  useEffect(() => {
    const dialog = adicionarDialogRef.current;
    if (modalAdicionarAberto && dialog && !dialog.open) dialog.showModal();
  }, [modalAdicionarAberto]);

  useEffect(() => {
    const dialog = orcamentoDialogRef.current;
    if (atendimentoOrcamento && dialog && !dialog.open) dialog.showModal();
  }, [atendimentoOrcamento]);

  const clienteDetalhe = clientes.find((c) => c.id === clienteSelecionado) ?? null;

  function abrirModalAdicionar() {
    setClienteSelecionado('');
    setVeiculoSelecionado('');
    setErroAtendimento('');
    setClientes([]);
    setCarregandoClientes(true);
    setModalAdicionarAberto(true);

    apiFetch<{ dados: ClienteOpcao[] }>('/api/clientes/opcoes')
      .then((res) => setClientes(res.dados))
      .catch((err) =>
        setErroAtendimento(err instanceof Error ? err.message : 'Não foi possível carregar os clientes.')
      )
      .finally(() => setCarregandoClientes(false));
  }

  function selecionarCliente(id: number | '') {
    setClienteSelecionado(id);
    const cliente = clientes.find((c) => c.id === id);
    setVeiculoSelecionado(cliente?.veiculos[0]?.id ?? '');
  }

  async function handleAdicionarAtendimento(e: FormEvent) {
    e.preventDefault();

    if (clienteSelecionado === '' || veiculoSelecionado === '') {
      setErroAtendimento('Selecione um cliente e um veículo.');
      return;
    }

    setSalvandoAtendimento(true);
    setErroAtendimento('');

    try {
      await apiFetch('/api/atendimentos', {
        method: 'POST',
        body: JSON.stringify({ idCliente: clienteSelecionado, idVeiculo: veiculoSelecionado })
      });
      adicionarDialogRef.current?.close();
      setModalAdicionarAberto(false);
      setMensagem('Cliente adicionado ao atendimento.');
      carregarAtendimentos();
    } catch (err) {
      setErroAtendimento(err instanceof Error ? err.message : 'Erro ao adicionar cliente.');
    } finally {
      setSalvandoAtendimento(false);
    }
  }

  async function handleRemover(id: number) {
    setErro('');
    setMensagem('');

    try {
      await apiFetch(`/api/atendimentos/${id}`, { method: 'DELETE' });
      setMensagem('Cliente removido do atendimento.');
      carregarAtendimentos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover atendimento.');
    }
  }

  function abrirModalOrcamento(atendimento: AtendimentoAberto) {
    setAtendimentoOrcamento(atendimento);
    setSituacaoVeiculo('');
    setItens([{ descricao: '', valor: 0 }]);
    setErroOrcamento('');
    setOrcamentoCriadoId(null);
  }

  function atualizarItem(index: number, campo: 'descricao' | 'valor', valor: string) {
    setItens((atuais) =>
      atuais.map((item, i) =>
        i === index ? { ...item, [campo]: campo === 'valor' ? Number(valor) : valor } : item
      )
    );
  }

  function adicionarItem() {
    setItens((atuais) => [...atuais, { descricao: '', valor: 0 }]);
  }

  function removerItem(index: number) {
    setItens((atuais) => atuais.filter((_, i) => i !== index));
  }

  const totalOrcamento = itens.reduce((soma, item) => soma + (Number(item.valor) || 0), 0);

  async function handleSalvarOrcamento(e: FormEvent) {
    e.preventDefault();
    if (!atendimentoOrcamento) return;

    if (!situacaoVeiculo.trim()) {
      setErroOrcamento('Descreva a situação do veículo.');
      return;
    }

    const itensValidos = itens.filter((item) => item.descricao.trim());
    if (itensValidos.length === 0) {
      setErroOrcamento('Adicione ao menos um item de custo.');
      return;
    }

    setSalvandoOrcamento(true);
    setErroOrcamento('');

    try {
      const resultado = await apiFetch<{ dados: { id: number } }>(
        `/api/atendimentos/${atendimentoOrcamento.id}/orcamento`,
        {
          method: 'POST',
          body: JSON.stringify({ situacaoVeiculo, itens: itensValidos })
        }
      );
      setOrcamentoCriadoId(resultado.dados.id);
    } catch (err) {
      setErroOrcamento(err instanceof Error ? err.message : 'Erro ao criar orçamento.');
    } finally {
      setSalvandoOrcamento(false);
    }
  }

  async function handleEnviarOrcamento() {
    if (!orcamentoCriadoId) return;

    setSalvandoOrcamento(true);
    setErroOrcamento('');

    try {
      await apiFetch(`/api/orcamentos/${orcamentoCriadoId}/status`, { method: 'PATCH' });
      carregarOrcamentos();
      orcamentoDialogRef.current?.close();
      setAtendimentoOrcamento(null);
      setMensagem('Orçamento enviado ao cliente.');
    } catch (err) {
      setErroOrcamento(err instanceof Error ? err.message : 'Erro ao enviar orçamento.');
    } finally {
      setSalvandoOrcamento(false);
    }
  }

  return (
    <Layout
      title="Atendimentos"
      subtitle="Clientes sendo atendidos na oficina agora"
      documentTitle="OficinaOS | Atendimentos"
    >
      <section className="intro">
        <div>
          <h2>Atendimentos em andamento</h2>
          <p>
            Adicione um cliente para iniciar um atendimento, monte o orçamento do
            serviço ou remova quem já foi atendido.
          </p>
        </div>
        <button className="button button--primary" type="button" onClick={abrirModalAdicionar}>
          + Adicionar cliente
        </button>
      </section>

      {mensagem && <Feedback type="success" message={mensagem} />}
      {erro && <Feedback type="error" message={erro} />}
      {loading && <Feedback type="loading" message="Carregando atendimentos..." />}

      <section className="panel" aria-labelledby="atendimentos-list-title">
        <header className="panel__header">
          <div>
            <h3 id="atendimentos-list-title">Clientes em atendimento</h3>
            <p>{atendimentos.length} atendimento{atendimentos.length === 1 ? '' : 's'} aberto{atendimentos.length === 1 ? '' : 's'}</p>
          </div>
        </header>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Veículo</th>
                <th scope="col">Responsável</th>
                <th scope="col">Desde</th>
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && atendimentos.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    Nenhum cliente em atendimento no momento.
                  </td>
                </tr>
              )}

              {atendimentos.map((a) => (
                <tr key={a.id}>
                  <td>{a.clienteNome}</td>
                  <td className="nowrap">{a.placa} — {a.marca} {a.modelo}</td>
                  <td>{a.funcionarioNome}</td>
                  <td className="nowrap">{formatDateTime(a.criadoEm)}</td>
                  <td className="align-right">
                    <button
                      className="button button--primary button--small"
                      type="button"
                      onClick={() => abrirModalOrcamento(a)}
                    >
                      Fazer orçamento
                    </button>{' '}
                    <button
                      className="button button--secondary button--small"
                      type="button"
                      onClick={() => handleRemover(a.id)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="orcamentos-list-title">
        <header className="panel__header">
          <div>
            <h3 id="orcamentos-list-title">Orçamentos enviados</h3>
            <p>Acompanhe aqui se o cliente aceitou ou recusou.</p>
          </div>
        </header>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Veículo</th>
                <th scope="col">Valor</th>
                <th scope="col">Status</th>
                <th scope="col">Decisão em</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    Nenhum orçamento enviado ainda.
                  </td>
                </tr>
              )}

              {orcamentos.map((o) => (
                <tr key={o.id}>
                  <td>{o.clienteNome}</td>
                  <td className="nowrap">{o.placa} — {o.marca} {o.modelo}</td>
                  <td className="nowrap">{formatCurrency(o.valorTotal)}</td>
                  <td>
                    <span className={`status-badge ${o.status === 'recusado' ? 'is-inactive' : 'is-active'}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="nowrap">{o.decididoEm ? formatDateTime(o.decididoEm) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalAdicionarAberto && (
        <dialog
          ref={adicionarDialogRef}
          className="dialog"
          onClose={() => setModalAdicionarAberto(false)}
        >
          <div className="dialog__header">
            <h2>Adicionar cliente ao atendimento</h2>
            <button
              className="dialog__close"
              type="button"
              onClick={() => adicionarDialogRef.current?.close()}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <form className="dialog__body" onSubmit={handleAdicionarAtendimento}>
            <div className="field">
              <label htmlFor="atendimento-cliente">Cliente</label>
              <select
                id="atendimento-cliente"
                value={clienteSelecionado}
                onChange={(e) => selecionarCliente(e.target.value ? Number(e.target.value) : '')}
                disabled={carregandoClientes}
              >
                <option value="">{carregandoClientes ? 'Carregando clientes...' : 'Selecione um cliente'}</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="atendimento-veiculo">Veículo</label>
              <select
                id="atendimento-veiculo"
                value={veiculoSelecionado}
                onChange={(e) => setVeiculoSelecionado(e.target.value ? Number(e.target.value) : '')}
                disabled={!clienteDetalhe || clienteDetalhe.veiculos.length === 0}
              >
                {!clienteDetalhe || clienteDetalhe.veiculos.length === 0 ? (
                  <option value="">Nenhum veículo cadastrado</option>
                ) : (
                  clienteDetalhe.veiculos.map((v) => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>
                  ))
                )}
              </select>
            </div>

            {erroAtendimento && <Feedback type="error" message={erroAtendimento} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => adicionarDialogRef.current?.close()}
                disabled={salvandoAtendimento}
              >
                Cancelar
              </button>
              <button className="button button--primary" type="submit" disabled={salvandoAtendimento}>
                {salvandoAtendimento ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </dialog>
      )}

      {atendimentoOrcamento && (
        <dialog
          ref={orcamentoDialogRef}
          className="dialog dialog--orcamento"
          onClose={() => setAtendimentoOrcamento(null)}
        >
          <div className="dialog__header">
            <h2>Orçamento — {atendimentoOrcamento.clienteNome}</h2>
            <button
              className="dialog__close"
              type="button"
              onClick={() => orcamentoDialogRef.current?.close()}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          {!orcamentoCriadoId ? (
            <form className="dialog__body" onSubmit={handleSalvarOrcamento}>
              <div className="field">
                <label htmlFor="situacao-veiculo">Situação do veículo</label>
                <textarea
                  id="situacao-veiculo"
                  rows={3}
                  value={situacaoVeiculo}
                  onChange={(e) => setSituacaoVeiculo(e.target.value)}
                  placeholder="Ex.: Pastilhas de freio desgastadas, troca de óleo necessária"
                />
              </div>

              <div className="field">
                <label>Itens de custo</label>
                {itens.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Descrição (ex.: Pastilha de freio)"
                      value={item.descricao}
                      onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Valor"
                      value={item.valor}
                      onChange={(e) => atualizarItem(index, 'valor', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="button button--ghost button--small"
                      type="button"
                      onClick={() => removerItem(index)}
                      disabled={itens.length === 1}
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button className="button button--secondary button--small" type="button" onClick={adicionarItem}>
                  + Adicionar item
                </button>
              </div>

              <p style={{ fontWeight: 600, marginTop: '12px' }}>
                Total: {formatCurrency(totalOrcamento)}
              </p>

              {erroOrcamento && <Feedback type="error" message={erroOrcamento} />}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => orcamentoDialogRef.current?.close()}
                  disabled={salvandoOrcamento}
                >
                  Cancelar
                </button>
                <button className="button button--primary" type="submit" disabled={salvandoOrcamento}>
                  {salvandoOrcamento ? 'Salvando...' : 'Salvar orçamento'}
                </button>
              </div>
            </form>
          ) : (
            <div className="dialog__body">
              <Feedback type="success" message="Orçamento salvo como rascunho." />
              {erroOrcamento && <Feedback type="error" message={erroOrcamento} />}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => orcamentoDialogRef.current?.close()}
                  disabled={salvandoOrcamento}
                >
                  Fechar
                </button>
                <button className="button button--primary" type="button" onClick={handleEnviarOrcamento} disabled={salvandoOrcamento}>
                  {salvandoOrcamento ? 'Enviando...' : 'Enviar ao cliente'}
                </button>
              </div>
            </div>
          )}
        </dialog>
      )}
    </Layout>
  );
}
