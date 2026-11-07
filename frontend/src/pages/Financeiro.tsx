import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { apiFetch } from '../services/api';
import { formatCurrency } from '../utils/format';
import type { ResumoInadimplencia } from '../types/inadimplencia';
import '../styles/painel.css';

export default function Financeiro() {
  const [resumo, setResumo] = useState<ResumoInadimplencia | null>(null);

  useEffect(() => {
    let ativo = true;

    apiFetch<{ dados: ResumoInadimplencia }>('/api/financeiro/inadimplencias/resumo')
      .then((resposta) => {
        if (ativo) setResumo(resposta.dados);
      })
      .catch(() => {
        if (ativo) setResumo(null);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const clientes = resumo?.clientesInadimplentes ?? 0;

  return (
    <Layout
      title="Financeiro"
      subtitle="Acesso restrito ao Administrador"
      documentTitle="OficinaDS | Financeiro"
    >
      <section className="intro">
        <div>
          <h2>Módulo financeiro</h2>
          <p>
            Acompanhe os valores a receber da oficina. Novas áreas do financeiro serão
            adicionadas aqui.
          </p>
        </div>
      </section>

      <section className="painel-indicadores" aria-label="Áreas do financeiro">
        <Link
          className={`painel-card ${resumo && resumo.cobrancasVencidas > 0 ? 'painel-card--atencao' : ''}`}
          to="/financeiro/inadimplencias"
        >
          <span className="painel-card__rotulo">Inadimplências</span>
          <strong className="painel-card__valor">
            {resumo ? formatCurrency(resumo.valorVencido) : '—'}
          </strong>
          <small>
            {resumo
              ? `${clientes} cliente${clientes === 1 ? '' : 's'} com valores vencidos`
              : 'Consultar valores em aberto'}
          </small>
        </Link>
      </section>
    </Layout>
  );
}
