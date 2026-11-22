import type { HorariosDoDia } from '../types/agendamento';

type SeletorHorarioProps = {
  idPrefix: string;
  data: string;
  minData: string;
  maxData: string;
  horarios: HorariosDoDia | null;
  carregando: boolean;
  erro: string;
  horaSelecionada: string;
  desabilitado?: boolean;
  textoSemData?: string;
  onDataChange: (valor: string) => void;
  onHoraChange: (valor: string) => void;
};

export function SeletorHorario({
  idPrefix,
  data,
  minData,
  maxData,
  horarios,
  carregando,
  erro,
  horaSelecionada,
  desabilitado = false,
  textoSemData = 'Escolha uma data para ver os horários.',
  onDataChange,
  onHoraChange,
}: SeletorHorarioProps) {
  const livres = horarios?.horarios.filter((item) => item.disponivel).length ?? 0;

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-data`}>Data</label>
        <input
          id={`${idPrefix}-data`}
          type="date"
          value={data}
          min={minData}
          max={maxData}
          onChange={(event) => onDataChange(event.target.value)}
          disabled={desabilitado}
          required
        />
      </div>

      <div className="field">
        <span className="field__label" id={`${idPrefix}-horarios-label`}>
          Horário
        </span>

        {!data && <p className="slot-message">{textoSemData}</p>}
        {data && carregando && <p className="slot-message">Consultando horários...</p>}
        {data && !carregando && erro && (
          <p className="slot-message slot-message--error">{erro}</p>
        )}
        {data && !carregando && !erro && horarios?.fechado && (
          <p className="slot-message">A oficina não atende neste dia. Escolha outra data.</p>
        )}

        {data && !carregando && !erro && horarios && !horarios.fechado && (
          <>
            <div
              className="slot-grid"
              role="group"
              aria-labelledby={`${idPrefix}-horarios-label`}
            >
              {horarios.horarios.map((item) => (
                <button
                  key={item.hora}
                  type="button"
                  className={`slot ${horaSelecionada === item.hora ? 'is-selected' : ''}`}
                  disabled={!item.disponivel || desabilitado}
                  aria-pressed={horaSelecionada === item.hora}
                  aria-label={
                    item.disponivel ? item.hora : `${item.hora} indisponível: ${item.motivo}`
                  }
                  title={item.motivo ?? 'Horário disponível'}
                  onClick={() => onHoraChange(item.hora)}
                >
                  {item.hora}
                </button>
              ))}
            </div>
            <small className="field__hint slot-hint">
              {livres === 0
                ? 'Nenhum horário livre nesta data. Tente outro dia.'
                : `${livres} horário${livres === 1 ? '' : 's'} livre${livres === 1 ? '' : 's'}. Passe o mouse sobre um horário cinza para ver o motivo.`}
            </small>
          </>
        )}
      </div>
    </>
  );
}
