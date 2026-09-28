import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export default function Home() {
  return (
    <Layout
      title="Módulo de pessoas"
      subtitle="OficinaOS • Sprint atual"
      documentTitle="OficinaDS | Início"
    >
      <section className="intro">
        <div>
          <span className="story-label">Suas histórias</span>
          <h2>Clientes e funcionários</h2>
          <p>
            Este projeto implementa somente as histórias atribuídas a você, já
            conectadas ao backend e ao banco MySQL.
          </p>
        </div>
      </section>

      <section className="home-grid" aria-label="Funcionalidades disponíveis">
        <article className="home-card">
          <span className="home-card__number">67</span>
          <h3>Consultar clientes</h3>
          <p>
            Veja clientes cadastrados, seus dados principais, status e os
            veículos associados a cada um.
          </p>
          <Link className="button button--primary" to="/clientes">
            Abrir clientes
          </Link>
        </article>

        <article className="home-card">
          <span className="home-card__number">100</span>
          <h3>Pesquisar funcionários</h3>
          <p>
            Pesquise a equipe por nome, CPF, e-mail ou cargo e filtre pelo
            status do funcionário.
          </p>
          <Link className="button button--primary" to="/funcionarios">
            Abrir funcionários
          </Link>
        </article>
      </section>
    </Layout>
  );
}