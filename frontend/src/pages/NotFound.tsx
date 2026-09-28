import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  useEffect(() => {
    document.title = 'OficinaOS | Página não encontrada';
  }, []);

  return (
    <main className="error-page">
      <section className="error-card">
        <strong>404</strong>
        <h1>Página não encontrada</h1>
        <p>O endereço informado não existe neste módulo da OficinaOS.</p>
        <Link className="button button--primary" to="/">
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}