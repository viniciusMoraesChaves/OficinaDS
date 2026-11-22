import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Feedback } from '../components/Feedback';
import { apiFetch } from '../services/api';

type Usuario = {
  id: number;
  email: string;
  ativo: boolean;
  perfil: string | null;
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setLoading(true);
      setErro('');

      try {
        const { dados } = await apiFetch<{ dados: Usuario[] }>('/api/usuarios');
        if (!cancelado) setUsuarios(dados);
      } catch (err) {
        if (!cancelado) {
          setErro(err instanceof Error ? err.message : 'Não foi possível carregar os usuários.');
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <Layout
      title="Usuários"
      subtitle="Acesso restrito ao Administrador"
      documentTitle="OficinaDS | Usuários"
    >
      {loading && <Feedback type="loading" message="Carregando usuários..." />}
      {erro && <Feedback type="error" message={erro} />}

      {!loading && !erro && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.email}</td>
                  <td>{usuario.perfil ?? 'Sem perfil'}</td>
                  <td>
                    <StatusBadge active={usuario.ativo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}