import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { apiFetch } from '../services/api';
import { formatCurrency } from '../utils/format';
import type { ClienteDetalhe } from '../types/cliente';

type LinhaCusto = { id: number; descricao: string; valor: string };

let proximoId = 1;
function novaLinha(): LinhaCusto {
  return { id: proximoId++, descricao: '', valor: '' };
}

export default function NovoOrcamento() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clienteId = Number(params.get('clienteId'));

  const [cliente, setCliente] = useState<ClienteDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [idVeiculo, setIdVeiculo] = useState<number | ''>('');
  const [situacaoVeiculo, setSituacaoVeiculo] = useState('');
  const [itens, setItens] = useState<LinhaCusto[]>([novaLinha()]);

  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [idOrcamentoCriado, setIdOrcamentoCriado] = useState<number | null>(null);
  const [orcamentoEnviado, setOrcamentoEnviado] = useState(false);

  useEffect(() => {
    document.title = 'OficinaDS | Novo orçamento';
  }, []);

  useEffect(() => {
    if (!clienteId) {
      setErro('Cliente inválido.');
      setLoading(false);
      return;
    }

    apiFetch<{ dados: ClienteDetalhe }>(`/api/clientes/${clienteId}`)
      .then((res) => {
        setCliente(res.dados);
        if (res.dados.veiculos.length === 1) {
          setIdVeiculo(res.dados.veiculos[0].id);
        }
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'Erro ao carregar cliente.'))
      .finally(() => setLoading(false));
  }, [clienteId]);

  const valorTotal = itens.reduce((soma, item) => soma + (Number(item.valor) || 0), 0);

  function atualizarItem(id: number, campo: 'descricao' | 'valor', valor: string) {
    setItens((atuais) => atuais.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(id: number) {
    setItens((atuais) => (atuais.length > 1 ? atuais.filter((item) => item.id !== id) : atuais));
  }

  async function handleSubmit() {
    setErroForm('');

    if (!idVeiculo) {
      setErroForm('Selecione o veículo.');
      return;
    }

    if (!situacaoVeiculo.trim()) {
      setErroForm('Descreva a situação do veículo.');
      return;
    }

    const itensValidos = itens
      .map((item) => ({ descricao: item.descricao.trim(), valor: Number(item.valor) }))
      .filter((item) => item.descricao && Number.isFinite(item.valor) && item.valor >= 0);

    if (itensValidos.length === 0) {
      setErroForm('Adicione ao menos um item de custo válido.');
      return;
    }

    setEnviando(true);

    try {
      const atendimento = await apiFetch<{ dados: { id: number } }>('/api/atendimentos', {
        method: 'POST',
        body: JSON.stringify({ idCliente: clienteId, idVeiculo })
      });

      const orcamento = await apiFetch<{ dados: { id: number } }>(
        `/api/atendimentos/${atendimento.dados.id}/orcamento`,
        {
          method: 'POST',
          body: JSON.stringify({ situacaoVeiculo, itens: itensValidos })
        }
      );

      setIdOrcamentoCriado(orcamento.dados.id);
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao criar orçamento.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleEnviarAoCliente() {
    if (!idOrcamentoCriado) return;
    setEnviando(true);
    setErroForm('');

    try {
      await apiFetch(`/api/orcamentos/${idOrcamentoCriado}/status`, { method: 'PATCH' });
      setOrcamentoEnviado(true);
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao enviar orçamento.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Layout
      title="Novo orçamento"
      subtitle="Registrar atendimento e montar o orçamento"
      documentTitle="OficinaDS | Novo orçamento"
    >
      {loading && <Feedback type="loading" message="Carregando dados do cliente..." />}
      {erro && <Feedback type="error" message={erro} />}

      {!loading && cliente && !idOrcamentoCriado && (
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>{cliente.nome}</h3>
              <p>{cliente.email}</p>
            </div>
          </header>

          <div className="dialog__body">
            {erroForm && <Feedback type="error" message={erroForm} />}

            <div className="field">
              <label htmlFor="veiculo">Veículo</label>
              <select
                id="veiculo"
                value={idVeiculo}
                onChange={(e) => setIdVeiculo(Number(e.target.value))}
              >
                <option value="">Selecione...</option>
                {cliente.veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa} — {v.marca} {v.modelo}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="situacao">Situação do veículo</label>
              <textarea
                id="situacao"
                rows={4}
                value={situacaoVeiculo}
                onChange={(e) => setSituacaoVeiculo(e.target.value)}
                placeholder="Descreva o problema identificado e o serviço a ser feito."
              />
            </div>

            <div className="field">
              <label>Itens de custo (peças e serviços)</label>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Valor (R$)</th>
                      <th><span className="visually-hidden">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="text"
                            value={item.descricao}
                            onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                            placeholder="Ex: Pastilha de freio (par)"
                          />
                        </td>
                        <td className="nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.valor}
                            onChange={(e) => atualizarItem(item.id, 'valor', e.target.value)}
                            placeholder="0,00"
                          />
                        </td>
                        <td className="align-right">
                          <button
                            type="button"
                            className="button button--secondary button--small"
                            onClick={() => removerItem(item.id)}
                            disabled={itens.length === 1}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="button button--ghost"
                onClick={() => setItens((atuais) => [...atuais, novaLinha()])}
              >
                + Adicionar item
              </button>
            </div>

            <p className="search-summary">
              <strong>Total: {formatCurrency(valorTotal)}</strong>
            </p>

            <div className="dialog__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => navigate('/clientes')}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleSubmit}
                disabled={enviando}
              >
                {enviando ? 'Salvando...' : 'Salvar orçamento'}
              </button>
            </div>
          </div>
        </section>
      )}

      {idOrcamentoCriado && (
        <section className="panel">
          <div className="dialog__body">
            {erroForm && <Feedback type="error" message={erroForm} />}

            {!orcamentoEnviado ? (
              <>
                <p>Orçamento salvo como rascunho. Envie para o cliente decidir.</p>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleEnviarAoCliente}
                  disabled={enviando}
                >
                  {enviando ? 'Enviando...' : 'Enviar ao cliente'}
                </button>
              </>
            ) : (
              <>
                <p>Orçamento enviado ao cliente. Ele já pode visualizar em "Meus orçamentos".</p>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => navigate('/clientes')}
                >
                  Voltar para clientes
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </Layout>
  );
}