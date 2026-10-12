import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { apiFetch } from '../services/api';
import type {
  Diagnostico,
  OpcoesDiagnostico,
} from '../types/diagnostico';

type FormState = {
  ordemId: string;
  funcionarioId: string;
  descricao: string;
};

const FORM_VAZIO: FormState = {
  ordemId: '',
  funcionarioId: '',
  descricao: '',
};

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

export default function Diagnosticos() {
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [opcoes, setOpcoes] = useState<OpcoesDiagnostico>({
    ordens: [],
    funcionarios: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [diagnosticoEditando, setDiagnosticoEditando] =
    useState<Diagnostico | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [lista, selecoes] = await Promise.all([
        apiFetch<{ dados: Diagnostico[] }>('/api/diagnosticos'),
        apiFetch<{ dados: OpcoesDiagnostico }>('/api/diagnosticos/opcoes'),
      ]);

      setDiagnosticos(lista.dados);
      setOpcoes(selecoes.dados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar diagnósticos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (modalAberto && !dialog.open) {
      dialog.showModal();
    } else if (!modalAberto && dialog.open) {
      dialog.close();
    }
  }, [modalAberto]);

  function abrirNovo() {
    setDiagnosticoEditando(null);
    setForm(FORM_VAZIO);
    setFormError('');
    setSuccess('');
    setModalAberto(true);
  }

  function abrirEdicao(diagnostico: Diagnostico) {
    setDiagnosticoEditando(diagnostico);
    setForm({
      ordemId: String(diagnostico.ordemId),
      funcionarioId: String(diagnostico.funcionarioId),
      descricao: diagnostico.descricao,
    });
    setFormError('');
    setSuccess('');
    setModalAberto(true);
  }

  function fecharModal() {
    if (!salvando) setModalAberto(false);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    if (!form.ordemId) {
      setFormError('Selecione uma ordem de serviço.');
      return;
    }

    if (!form.funcionarioId) {
      setFormError('Selecione o funcionário responsável.');
      return;
    }

    if (form.descricao.trim().length < 10) {
      setFormError('Descreva o diagnóstico com pelo menos 10 caracteres.');
      return;
    }

    setSalvando(true);

    try {
      const editando = diagnosticoEditando !== null;
      const url = editando
        ? `/api/diagnosticos/${diagnosticoEditando.id}`
        : '/api/diagnosticos';

      await apiFetch(url, {
        method: editando ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ordemId: Number(form.ordemId),
          funcionarioId: Number(form.funcionarioId),
          descricao: form.descricao.trim(),
        }),
      });

      setModalAberto(false);
      setSuccess(
        editando
          ? 'Diagnóstico atualizado com sucesso.'
          : 'Diagnóstico registrado com sucesso.'
      );
      await carregarDados();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível salvar o diagnóstico.'
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(diagnostico: Diagnostico) {
    const confirmado = window.confirm(
      `Excluir o diagnóstico da OS-${diagnostico.ordemId}? Esta ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    setExcluindoId(diagnostico.id);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/api/diagnosticos/${diagnostico.id}`, {
        method: 'DELETE',
      });
      setSuccess('Diagnóstico excluído com sucesso.');
      await carregarDados();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível excluir o diagnóstico.'
      );
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <Layout
      title="Diagnósticos"
      subtitle="Registros técnicos das ordens de serviço"
      documentTitle="OficinaDS | Registrar diagnóstico"
    >
      <section className="intro">
        <div>
          <span className="story-label">DM-180</span>
          <h2>Registrar diagnóstico</h2>
          <p>
            Consulte os problemas identificados nos veículos, registre um novo
            diagnóstico ou edite um registro existente.
          </p>
        </div>

        <button className="button button--primary" type="button" onClick={abrirNovo}>
          + Novo diagnóstico
        </button>
      </section>

      <section className="panel" aria-labelledby="diagnosticos-list-title">
        <header className="panel__header">
          <div>
            <h3 id="diagnosticos-list-title">Diagnósticos registrados</h3>
            <p>
              {diagnosticos.length} registro{diagnosticos.length === 1 ? '' : 's'} no total
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

        {loading && <Feedback type="loading" message="Carregando diagnósticos..." />}
        {error && <Feedback type="error" message={error} />}
        {success && <p className="feedback feedback--success">{success}</p>}

        <div className="table-wrapper">
          <table className="data-table diagnosis-table">
            <thead>
              <tr>
                <th scope="col">Ordem / veículo</th>
                <th scope="col">Cliente</th>
                <th scope="col">Diagnóstico</th>
                <th scope="col">Responsável</th>
                <th scope="col">Registrado em</th>
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && diagnosticos.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    Nenhum diagnóstico foi registrado ainda.
                  </td>
                </tr>
              )}

              {diagnosticos.map((diagnostico) => (
                <tr key={diagnostico.id}>
                  <td>
                    <span className="order-code">OS-{diagnostico.ordemId}</span>
                    <strong className="table-primary">
                      {diagnostico.marca} {diagnostico.modelo}
                    </strong>
                    <small className="table-secondary">{diagnostico.placa}</small>
                  </td>
                  <td>{diagnostico.cliente}</td>
                  <td>
                    <p className="diagnosis-description">{diagnostico.descricao}</p>
                    <small className="table-secondary">
                      Relato: {diagnostico.problemaRelatado}
                    </small>
                  </td>
                  <td>{diagnostico.funcionario}</td>
                  <td className="nowrap">{formatDateTime(diagnostico.dataHora)}</td>
                  <td className="align-right">
                    <div className="table-actions">
                      <button
                        className="button button--secondary button--small"
                        type="button"
                        onClick={() => abrirEdicao(diagnostico)}
                        disabled={excluindoId === diagnostico.id}
                      >
                        Editar
                      </button>
                      <button
                        className="button button--danger button--small"
                        type="button"
                        onClick={() => excluir(diagnostico)}
                        disabled={excluindoId === diagnostico.id}
                      >
                        {excluindoId === diagnostico.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby="diagnostico-dialog-title"
        onClose={() => setModalAberto(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) fecharModal();
        }}
      >
        <header className="dialog__header">
          <h2 id="diagnostico-dialog-title">
            {diagnosticoEditando ? 'Editar diagnóstico' : 'Novo diagnóstico'}
          </h2>
          <button
            className="dialog__close"
            type="button"
            aria-label="Fechar"
            onClick={fecharModal}
            disabled={salvando}
          >
            ✕
          </button>
        </header>

        <form className="dialog__body diagnosis-form" onSubmit={salvar}>
          <div className="field">
            <label htmlFor="diagnostico-ordem">Ordem de serviço</label>
            <select
              id="diagnostico-ordem"
              value={form.ordemId}
              onChange={(event) => setForm({ ...form, ordemId: event.target.value })}
              disabled={salvando}
              required
            >
              <option value="">Selecione uma ordem</option>
              {opcoes.ordens.map((ordem) => (
                <option key={ordem.id} value={ordem.id}>
                  OS-{ordem.id} • {ordem.placa} • {ordem.cliente}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="diagnostico-funcionario">Funcionário responsável</label>
            <select
              id="diagnostico-funcionario"
              value={form.funcionarioId}
              onChange={(event) =>
                setForm({ ...form, funcionarioId: event.target.value })
              }
              disabled={salvando}
              required
            >
              <option value="">Selecione um funcionário</option>
              {opcoes.funcionarios.map((funcionario) => (
                <option key={funcionario.id} value={funcionario.id}>
                  {funcionario.nome} • {funcionario.cargo}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="diagnostico-descricao">Diagnóstico identificado</label>
            <textarea
              id="diagnostico-descricao"
              rows={7}
              maxLength={2000}
              placeholder="Descreva o problema encontrado, a possível causa e a recomendação técnica."
              value={form.descricao}
              onChange={(event) => setForm({ ...form, descricao: event.target.value })}
              disabled={salvando}
              required
            />
            <small className="field__hint">{form.descricao.length}/2000 caracteres</small>
          </div>

          {formError && <Feedback type="error" message={formError} />}

          <div className="dialog__actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={fecharModal}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button className="button button--primary" type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar diagnóstico'}
            </button>
          </div>
        </form>
      </dialog>
    </Layout>
  );
}
