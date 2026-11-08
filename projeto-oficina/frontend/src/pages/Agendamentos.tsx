import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { AgendamentoStatusBadge } from '../components/AgendamentoStatusBadge';
import { SeletorHorario } from '../components/SeletorHorario';
import { apiFetch } from '../services/api';
import type {
  Agendamento,
  HorariosDoDia,
  OpcoesAgendamento,
} from '../types/agendamento';

type NovoFormState = {
  veiculoId: string;
  funcionarioId: string;
  servico: string;
  data: string;
  hora: string;
};

const NOVO_FORM_VAZIO: NovoFormState = {
  veiculoId: '',
  funcionarioId: '',
  servico: '',
  data: '',
  hora: '',
};

const OPCOES_VAZIAS: OpcoesAgendamento = {
  veiculos: [],
  funcionarios: [],
  regras: {
    duracaoMinutos: 60,
    antecedenciaReagendamentoHoras: 24,
    antecedenciaNovoHorarioHoras: 2,
    janelaMaximaDias: 60,
    capacidadeSimultanea: 3,
    statusReagendaveis: ['Agendado', 'Confirmado'],
    expediente: '',
  },
};

// As datas do backend chegam como 'AAAA-MM-DDTHH:mm:ss' (horário local da oficina).
function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function toISODate(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
}

function somarDias(date: Date, dias: number): Date {
  const copia = new Date(date);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

type ResultadoHorarios = {
  url: string;
  horarios: HorariosDoDia | null;
  erro: string;
};

// Consulta os horários livres sempre que a URL muda. Com url = null não consulta.
function useHorarios(url: string | null) {
  const [resultado, setResultado] = useState<ResultadoHorarios | null>(null);

  useEffect(() => {
    if (!url) return;

    let cancelado = false;

    apiFetch<{ dados: HorariosDoDia }>(url)
      .then((resposta) => {
        if (!cancelado) setResultado({ url, horarios: resposta.dados, erro: '' });
      })
      .catch((err) => {
        if (!cancelado) {
          setResultado({
            url,
            horarios: null,
            erro: err instanceof Error ? err.message : 'Não foi possível consultar os horários.',
          });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [url]);

  if (!url || !resultado || resultado.url !== url) {
    return { horarios: null, carregando: url !== null, erro: '' };
  }

  return { horarios: resultado.horarios, carregando: false, erro: resultado.erro };
}

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [opcoes, setOpcoes] = useState<OpcoesAgendamento>(OPCOES_VAZIAS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Novo agendamento
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoForm, setNovoForm] = useState<NovoFormState>(NOVO_FORM_VAZIO);
  const [novoErro, setNovoErro] = useState('');
  const [novoSalvando, setNovoSalvando] = useState(false);
  const [novoTentativa, setNovoTentativa] = useState(0);
  const novoDialogRef = useRef<HTMLDialogElement>(null);

  // Reagendamento
  const [reagendando, setReagendando] = useState<Agendamento | null>(null);
  const [reData, setReData] = useState('');
  const [reHora, setReHora] = useState('');
  const [reErro, setReErro] = useState('');
  const [reSalvando, setReSalvando] = useState(false);
  const [reTentativa, setReTentativa] = useState(0);
  const reDialogRef = useRef<HTMLDialogElement>(null);

  const [hoje] = useState(() => new Date());
  const minData = toISODate(hoje);
  const maxData = toISODate(somarDias(hoje, opcoes.regras.janelaMaximaDias));

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [lista, selecoes] = await Promise.all([
        apiFetch<{ dados: Agendamento[] }>('/api/agendamentos'),
        apiFetch<{ dados: OpcoesAgendamento }>('/api/agendamentos/opcoes'),
      ]);

      setAgendamentos(lista.dados);
      setOpcoes(selecoes.dados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agendamentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    const dialog = novoDialogRef.current;
    if (!dialog) return;

    if (novoAberto && !dialog.open) {
      dialog.showModal();
    } else if (!novoAberto && dialog.open) {
      dialog.close();
    }
  }, [novoAberto]);

  const reagendandoAberto = reagendando !== null;

  useEffect(() => {
    const dialog = reDialogRef.current;
    if (!dialog) return;

    if (reagendandoAberto && !dialog.open) {
      dialog.showModal();
    } else if (!reagendandoAberto && dialog.open) {
      dialog.close();
    }
  }, [reagendandoAberto]);

  const urlHorariosNovo =
    novoAberto && novoForm.data && novoForm.funcionarioId && novoForm.veiculoId
      ? `/api/agendamentos/horarios?data=${novoForm.data}` +
        `&funcionarioId=${novoForm.funcionarioId}&veiculoId=${novoForm.veiculoId}` +
        `&t=${novoTentativa}`
      : null;

  const urlHorariosReagendar =
    reagendando && reData
      ? `/api/agendamentos/${reagendando.id}/horarios?data=${reData}&t=${reTentativa}`
      : null;

  const horariosNovo = useHorarios(urlHorariosNovo);
  const horariosReagendar = useHorarios(urlHorariosReagendar);

  /* ---------- Novo agendamento ---------- */

  function abrirNovo() {
    setNovoForm(NOVO_FORM_VAZIO);
    setNovoErro('');
    setSuccess('');
    setNovoAberto(true);
  }

  function fecharNovo() {
    if (!novoSalvando) setNovoAberto(false);
  }

  async function salvarNovo(event: FormEvent) {
    event.preventDefault();
    setNovoErro('');

    if (!novoForm.veiculoId) {
      setNovoErro('Selecione o veículo.');
      return;
    }

    if (!novoForm.funcionarioId) {
      setNovoErro('Selecione o profissional responsável.');
      return;
    }

    if (novoForm.servico.trim().length < 3) {
      setNovoErro('Informe o serviço com pelo menos 3 caracteres.');
      return;
    }

    if (!novoForm.data || !novoForm.hora) {
      setNovoErro('Escolha a data e o horário.');
      return;
    }

    setNovoSalvando(true);

    try {
      await apiFetch('/api/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          veiculoId: Number(novoForm.veiculoId),
          funcionarioId: Number(novoForm.funcionarioId),
          servico: novoForm.servico.trim(),
          data: novoForm.data,
          hora: novoForm.hora,
        }),
      });

      setNovoAberto(false);
      setSuccess('Agendamento criado com sucesso.');
      await carregarDados();
    } catch (err) {
      setNovoErro(err instanceof Error ? err.message : 'Não foi possível criar o agendamento.');
      // O horário pode ter sido ocupado por outra pessoa: consulta de novo.
      setNovoForm((atual) => ({ ...atual, hora: '' }));
      setNovoTentativa((valor) => valor + 1);
    } finally {
      setNovoSalvando(false);
    }
  }

  /* ---------- Reagendamento ---------- */

  function abrirReagendar(agendamento: Agendamento) {
    setReagendando(agendamento);
    setReData(agendamento.dataHora.slice(0, 10));
    setReHora('');
    setReErro('');
    setSuccess('');
  }

  function fecharReagendar() {
    if (!reSalvando) setReagendando(null);
  }

  async function salvarReagendamento(event: FormEvent) {
    event.preventDefault();
    if (!reagendando) return;

    setReErro('');

    if (!reData || !reHora) {
      setReErro('Escolha a nova data e o novo horário.');
      return;
    }

    setReSalvando(true);

    try {
      await apiFetch(`/api/agendamentos/${reagendando.id}/reagendar`, {
        method: 'PATCH',
        body: JSON.stringify({ data: reData, hora: reHora }),
      });

      setReagendando(null);
      setSuccess(
        `Agendamento AG-${reagendando.id} reagendado para ${formatDateTime(`${reData}T${reHora}:00`)}.`
      );
      await carregarDados();
    } catch (err) {
      setReErro(err instanceof Error ? err.message : 'Não foi possível reagendar.');
      setReHora('');
      setReTentativa((valor) => valor + 1);
    } finally {
      setReSalvando(false);
    }
  }

  const { regras } = opcoes;

  return (
    <Layout
      title="Agendamentos"
      subtitle="Serviços agendados e reagendamento"
      documentTitle="OficinaDS | Agendamentos"
    >
      <section className="intro">
        <div>
          <span className="story-label">Reagendamento</span>
          <h2>Agendar e reagendar serviços</h2>
          <p>
            Consulte os serviços marcados, crie um novo agendamento ou altere a data e o
            horário de um serviço já agendado.
          </p>
        </div>

        <button className="button button--primary" type="button" onClick={abrirNovo}>
          + Novo agendamento
        </button>
      </section>

      <section className="schedule-rules" aria-labelledby="regras-title">
        <h3 id="regras-title">Regras do reagendamento</h3>
        <ul>
          <li>
            Só é possível reagendar serviços <strong>Agendado</strong> ou{' '}
            <strong>Confirmado</strong>.
          </li>
          <li>
            O reagendamento exige pelo menos{' '}
            <strong>{regras.antecedenciaReagendamentoHoras} horas</strong> de antecedência em
            relação ao horário atual.
          </li>
          <li>
            O novo horário precisa estar livre para o profissional, para o veículo e para a
            oficina (até {regras.capacidadeSimultanea} atendimentos ao mesmo tempo), com
            antecedência mínima de {regras.antecedenciaNovoHorarioHoras} horas.
          </li>
          {regras.expediente && <li>{regras.expediente}</li>}
        </ul>
      </section>

      <section className="panel" aria-labelledby="agendamentos-list-title">
        <header className="panel__header">
          <div>
            <h3 id="agendamentos-list-title">Agendamentos</h3>
            <p>
              {agendamentos.length} registro{agendamentos.length === 1 ? '' : 's'} no total
            </p>
          </div>
          <button
            className="button button--secondary button--small"
            type="button"
            onClick={carregarDados}
            disabled={loading}
          >
            ↻ Atualizar
          </button>
        </header>

        {loading && <Feedback type="loading" message="Carregando agendamentos..." />}
        {error && <Feedback type="error" message={error} />}
        {success && <p className="feedback feedback--success">{success}</p>}

        <div className="table-wrapper">
          <table className="data-table schedule-table">
            <thead>
              <tr>
                <th scope="col">Serviço / veículo</th>
                <th scope="col">Cliente</th>
                <th scope="col">Data e hora</th>
                <th scope="col">Responsável</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && agendamentos.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    Nenhum agendamento foi cadastrado ainda.
                  </td>
                </tr>
              )}

              {agendamentos.map((agendamento) => (
                <tr key={agendamento.id}>
                  <td>
                    <span className="order-code">AG-{agendamento.id}</span>
                    <strong className="table-primary">{agendamento.servico}</strong>
                    <small className="table-secondary">
                      {agendamento.marca} {agendamento.modelo} • {agendamento.placa}
                    </small>
                  </td>
                  <td>{agendamento.cliente}</td>
                  <td className="nowrap">
                    {formatDateTime(agendamento.dataHora)}
                    {agendamento.qtdReagendamentos > 0 && (
                      <small className="table-secondary">
                        Reagendado {agendamento.qtdReagendamentos}x
                      </small>
                    )}
                  </td>
                  <td>{agendamento.funcionario}</td>
                  <td>
                    <AgendamentoStatusBadge status={agendamento.status} />
                  </td>
                  <td className="align-right">
                    <div className="table-actions">
                      <button
                        className="button button--secondary button--small"
                        type="button"
                        onClick={() => abrirReagendar(agendamento)}
                        disabled={!agendamento.reagendamento.permitido}
                        title={
                          agendamento.reagendamento.motivo ??
                          'Alterar a data ou o horário deste agendamento'
                        }
                      >
                        Reagendar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Novo agendamento ---------- */}
      <dialog
        ref={novoDialogRef}
        className="dialog"
        aria-labelledby="novo-agendamento-title"
        onClose={() => setNovoAberto(false)}
        onClick={(event) => {
          if (event.target === novoDialogRef.current) fecharNovo();
        }}
      >
        <header className="dialog__header">
          <h2 id="novo-agendamento-title">Novo agendamento</h2>
          <button
            className="dialog__close"
            type="button"
            aria-label="Fechar"
            onClick={fecharNovo}
            disabled={novoSalvando}
          >
            ✕
          </button>
        </header>

        <form className="dialog__body schedule-form" onSubmit={salvarNovo}>
          <div className="field">
            <label htmlFor="novo-veiculo">Veículo</label>
            <select
              id="novo-veiculo"
              value={novoForm.veiculoId}
              onChange={(event) =>
                setNovoForm({ ...novoForm, veiculoId: event.target.value, hora: '' })
              }
              disabled={novoSalvando}
              required
            >
              <option value="">Selecione um veículo</option>
              {opcoes.veiculos.map((veiculo) => (
                <option key={veiculo.id} value={veiculo.id}>
                  {veiculo.placa} • {veiculo.marca} {veiculo.modelo} • {veiculo.cliente}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="novo-funcionario">Profissional responsável</label>
            <select
              id="novo-funcionario"
              value={novoForm.funcionarioId}
              onChange={(event) =>
                setNovoForm({ ...novoForm, funcionarioId: event.target.value, hora: '' })
              }
              disabled={novoSalvando}
              required
            >
              <option value="">Selecione um profissional</option>
              {opcoes.funcionarios.map((funcionario) => (
                <option key={funcionario.id} value={funcionario.id}>
                  {funcionario.nome} • {funcionario.cargo}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="novo-servico">Serviço</label>
            <input
              id="novo-servico"
              type="text"
              maxLength={150}
              placeholder="Ex.: Revisão dos 30.000 km"
              value={novoForm.servico}
              onChange={(event) => setNovoForm({ ...novoForm, servico: event.target.value })}
              disabled={novoSalvando}
              required
            />
          </div>

          <SeletorHorario
            idPrefix="novo"
            data={novoForm.data}
            minData={minData}
            maxData={maxData}
            horarios={horariosNovo.horarios}
            carregando={horariosNovo.carregando}
            erro={horariosNovo.erro}
            horaSelecionada={novoForm.hora}
            desabilitado={novoSalvando}
            textoSemData="Escolha o veículo, o profissional e a data para ver os horários."
            onDataChange={(valor) => setNovoForm({ ...novoForm, data: valor, hora: '' })}
            onHoraChange={(valor) => setNovoForm({ ...novoForm, hora: valor })}
          />

          {novoErro && <Feedback type="error" message={novoErro} />}

          <div className="dialog__actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={fecharNovo}
              disabled={novoSalvando}
            >
              Cancelar
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={novoSalvando || !novoForm.hora}
            >
              {novoSalvando ? 'Salvando...' : 'Criar agendamento'}
            </button>
          </div>
        </form>
      </dialog>

      {/* ---------- Reagendar ---------- */}
      <dialog
        ref={reDialogRef}
        className="dialog"
        aria-labelledby="reagendar-title"
        onClose={() => setReagendando(null)}
        onClick={(event) => {
          if (event.target === reDialogRef.current) fecharReagendar();
        }}
      >
        <header className="dialog__header">
          <h2 id="reagendar-title">Reagendar serviço</h2>
          <button
            className="dialog__close"
            type="button"
            aria-label="Fechar"
            onClick={fecharReagendar}
            disabled={reSalvando}
          >
            ✕
          </button>
        </header>

        {reagendando && (
          <form className="dialog__body schedule-form" onSubmit={salvarReagendamento}>
            <div className="schedule-current">
              <span className="order-code">AG-{reagendando.id}</span>
              <strong className="table-primary">{reagendando.servico}</strong>
              <small className="table-secondary">
                {reagendando.marca} {reagendando.modelo} • {reagendando.placa} •{' '}
                {reagendando.cliente}
              </small>
              <small className="table-secondary">
                Profissional: {reagendando.funcionario}
              </small>
              <p className="schedule-current__when">
                Horário atual: <strong>{formatDateTime(reagendando.dataHora)}</strong>
              </p>
            </div>

            <SeletorHorario
              idPrefix="reagendar"
              data={reData}
              minData={minData}
              maxData={maxData}
              horarios={horariosReagendar.horarios}
              carregando={horariosReagendar.carregando}
              erro={horariosReagendar.erro}
              horaSelecionada={reHora}
              desabilitado={reSalvando}
              onDataChange={(valor) => {
                setReData(valor);
                setReHora('');
              }}
              onHoraChange={setReHora}
            />

            {reErro && <Feedback type="error" message={reErro} />}

            <div className="dialog__actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={fecharReagendar}
                disabled={reSalvando}
              >
                Cancelar
              </button>
              <button
                className="button button--primary"
                type="submit"
                disabled={reSalvando || !reHora}
              >
                {reSalvando ? 'Reagendando...' : 'Confirmar reagendamento'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </Layout>
  );
}
