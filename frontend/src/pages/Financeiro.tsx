import { Layout } from '../components/Layout';

export default function Financeiro() {
  return (
    <Layout
      title="Financeiro"
      subtitle="Acesso restrito ao Administrador"
      documentTitle="OficinaDS | Financeiro"
    >
      <section className="intro">
        <div>
          <span className="story-label">Em construção</span>
          <h2>Módulo financeiro</h2>
          <p>
            As funcionalidades financeiras ainda não foram implementadas.
            Esta página já está protegida e pronta para recebê-las.
          </p>
        </div>
      </section>
    </Layout>
  );
}