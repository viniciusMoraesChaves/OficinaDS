import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { PERFIS, type Perfil } from '../types/perfil';

type Card = { icon: string; titulo: string; texto: string; to: string; botao: string };

const CARDS: Record<string, Card> = {
  atendimentos: {
    icon: '🔧',
    titulo: 'Atendimentos',
    texto: 'Veja quem está sendo atendido agora, adicione clientes e monte orçamentos de serviço.',
    to: '/atendimentos',
    botao: 'Abrir atendimentos'
  },
  clientes: {
    icon: '♙',
    titulo: 'Consultar clientes',
    texto: 'Veja clientes cadastrados, seus dados principais, status e os veículos associados a cada um.',
    to: '/clientes',
    botao: 'Abrir clientes'
  },
  funcionarios: {
    icon: '⚙',
    titulo: 'Pesquisar funcionários',
    texto: 'Pesquise a equipe por nome, CPF, e-mail ou cargo e filtre pelo status do funcionário.',
    to: '/funcionarios',
    botao: 'Abrir funcionários'
  },
  usuarios: {
    icon: '☺',
    titulo: 'Usuários',
    texto: 'Consulte as contas de acesso e os perfis de cada usuário.',
    to: '/usuarios',
    botao: 'Abrir usuários'
  },
  financeiro: {
    icon: '$',
    titulo: 'Financeiro',
    texto: 'Área financeira da oficina, exclusiva do Administrador.',
    to: '/financeiro',
    botao: 'Abrir financeiro'
  },
  orcamentos: {
    icon: '🧾',
    titulo: 'Meus orçamentos',
    texto: 'Acompanhe os orçamentos enviados pela oficina e aceite ou recuse cada um.',
    to: '/meus-orcamentos',
    botao: 'Abrir meus orçamentos'
  },
  agendamentos: {
    icon: '◷',
    titulo: 'Meus agendamentos',
    texto: 'Veja a data, o horário e a situação dos serviços agendados para o seu veículo.',
    to: '/meus-agendamentos',
    botao: 'Abrir meus agendamentos'
  }
};

const CARDS_POR_PERFIL: Record<Perfil, string[]> = {
  [PERFIS.ADMINISTRADOR]: ['atendimentos', 'clientes', 'funcionarios', 'usuarios', 'financeiro'],
  [PERFIS.FUNCIONARIO]: ['atendimentos', 'clientes'],
  [PERFIS.CLIENTE]: ['orcamentos', 'agendamentos']
};

export default function Home() {
  const { perfil } = useAuth();
  const cards = (perfil ? CARDS_POR_PERFIL[perfil] : []).map((chave) => CARDS[chave]);

  return (
    <Layout
      title="Painel"
      subtitle="OficinaOS"
      documentTitle="OficinaDS | Início"
    >
      <section className="intro">
        <div>
          <span className="story-label">Painel da oficina</span>
          <h2>{perfil === PERFIS.CLIENTE ? 'Seus orçamentos e agendamentos' : 'Clientes, atendimentos e equipe'}</h2>
          <p>
            {perfil === PERFIS.CLIENTE
              ? 'Acompanhe os orçamentos e os serviços agendados pela oficina para o seu veículo.'
              : 'Acompanhe os atendimentos em andamento, consulte clientes e gerencie a equipe da oficina em um só lugar.'}
          </p>
        </div>
      </section>

      <section className="home-grid" aria-label="Funcionalidades disponíveis">
        {cards.map((card) => (
          <article className="home-card" key={card.to}>
            <span className="home-card__number">{card.icon}</span>
            <h3>{card.titulo}</h3>
            <p>{card.texto}</p>
            <Link className="button button--primary" to={card.to}>
              {card.botao}
            </Link>
          </article>
        ))}
      </section>
    </Layout>
  );
}
