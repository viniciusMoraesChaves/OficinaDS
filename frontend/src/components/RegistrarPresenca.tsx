import { useState } from 'react';
import { apiFetch } from '../services/api';
import type { Agendamento } from '../types/agendamento';

type Props = {
  agendamento: Agendamento;
  onRegistrado: (mensagem: string) => void;
  onErro: (mensagem: string) => void;
};

// Botões "Compareceu" / "Não compareceu" de um agendamento (equipe).
export function RegistrarPresenca({ agendamento, onRegistrado, onErro }: Props) {
  const [salvando, setSalvando] = useState(false);
  const { permitido, motivo } = agendamento.presenca;

  async function registrar(resultado: 'compareceu' | 'nao_compareceu') {
    setSalvando(true);
    try {
      await apiFetch(`/api/agendamentos/${agendamento.id}/presenca`, {
        method: 'PATCH',
        body: JSON.stringify({ resultado }),
      });
      onRegistrado(
        resultado === 'compareceu'
          ? `Presença de AG-${agendamento.id} registrada: em atendimento.`
          : `AG-${agendamento.id} marcado como não compareceu.`
      );
    } catch (err) {
      onErro(err instanceof Error ? err.message : 'Não foi possível registrar a presença.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="button button--secondary button--small"
        disabled={!permitido || salvando}
        title={motivo ?? undefined}
        onClick={() => registrar('compareceu')}
      >
        Compareceu
      </button>
      <button
        type="button"
        className="button button--secondary button--small"
        disabled={!permitido || salvando}
        title={motivo ?? undefined}
        onClick={() => registrar('nao_compareceu')}
      >
        Não compareceu
      </button>
    </>
  );
}
