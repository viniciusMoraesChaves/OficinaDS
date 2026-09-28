import type { ReactNode } from 'react';
import { Wrench, User } from 'lucide-react';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <aside className="auth-page__side">
        <div className="auth-brand">
          <span className="auth-brand__mark" aria-hidden="true">
            <Wrench size={18} />
          </span>
          OficinaOS
        </div>

        <div className="auth-page__pitch">
          <h1>Acelere a gestão da sua oficina mecânica.</h1>
          <p>
            Controle de ordens de serviço, clientes, mecânicos e fluxo de
            caixa em uma única plataforma intuitiva e profissional.
          </p>

          <div className="auth-social-proof">
            <span className="auth-social-proof__avatars" aria-hidden="true">
              <span><User size={16} /></span>
              <span><User size={16} /></span>
              <span><User size={16} /></span>
            </span>
            Junte-se a +2.000 oficinas.
          </div>
        </div>
      </aside>

      <div className="auth-page__form-side">
        <div className="auth-form">{children}</div>
      </div>
    </div>
  );
}