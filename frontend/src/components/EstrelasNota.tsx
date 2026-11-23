import { useId, useState } from 'react';
import { Star } from 'lucide-react';

const NOTAS = [1, 2, 3, 4, 5];

function rotuloEstrelas(nota: number): string {
  return `${nota} ${nota === 1 ? 'estrela' : 'estrelas'}`;
}

function formatarMedia(media: number): string {
  return media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

type EstrelasSeletorProps = {
  valor: number | null;
  onChange: (nota: number) => void;
  legenda: string;
  disabled?: boolean;
};

// Escolha da nota de 1 a 5 estrelas. São botões de rádio de verdade, então o teclado
// funciona (setas e Tab) e o leitor de tela anuncia "3 estrelas".
export function EstrelasSeletor({ valor, onChange, legenda, disabled = false }: EstrelasSeletorProps) {
  const nome = useId();
  const [previa, setPrevia] = useState<number | null>(null);
  const destaque = previa ?? valor ?? 0;

  return (
    <fieldset className="estrelas-seletor" disabled={disabled} onMouseLeave={() => setPrevia(null)}>
      <legend className="visually-hidden">{legenda}</legend>

      {NOTAS.map((nota) => (
        <label
          key={nota}
          className="estrelas-seletor__opcao"
          onMouseEnter={() => setPrevia(nota)}
        >
          <input
            type="radio"
            name={nome}
            value={nota}
            checked={valor === nota}
            onChange={() => onChange(nota)}
          />
          <Star size={26} fill={nota <= destaque ? 'currentColor' : 'none'} aria-hidden="true" />
          <span className="visually-hidden">{rotuloEstrelas(nota)}</span>
        </label>
      ))}

      <span className="estrelas-seletor__texto" aria-live="polite">
        {valor ? `${valor} de 5` : 'Escolha de 1 a 5'}
      </span>
    </fieldset>
  );
}

type EstrelasFixasProps = {
  valor: number;
  tamanho?: number;
};

// Estrelas só para mostrar (sem clique): a nota que o cliente já deu, por exemplo.
export function EstrelasFixas({ valor, tamanho = 18 }: EstrelasFixasProps) {
  return (
    <span className="estrelas-fixas" role="img" aria-label={`Nota ${valor} de 5`}>
      {NOTAS.map((nota) => (
        <Star key={nota} size={tamanho} fill={nota <= valor ? 'currentColor' : 'none'} aria-hidden="true" />
      ))}
    </span>
  );
}

type EstrelasMediaProps = {
  media?: number | null;
  total?: number;
};

// Média do funcionário: estrelas, número e quantas avaliações a formaram.
export function EstrelasMedia({ media, total = 0 }: EstrelasMediaProps) {
  if (media === null || media === undefined || total <= 0) {
    return <span className="estrelas-media estrelas-media--vazia">Sem avaliações</span>;
  }

  return (
    <span className="estrelas-media">
      <EstrelasFixas valor={Math.round(media)} tamanho={15} />
      <strong>{formatarMedia(media)}</strong>
      <small>
        ({total} {total === 1 ? 'avaliação' : 'avaliações'})
      </small>
    </span>
  );
}
