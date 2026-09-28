type PaginationProps = {
  pagina: number;
  totalPaginas: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ pagina, totalPaginas, total, onPageChange }: PaginationProps) {
  return (
    <div className="pagination">
      <p className="pagination__summary">
        {total} registro{total === 1 ? '' : 's'}
      </p>

      {totalPaginas > 1 && (
        <div className="pagination__controls">
          <button
            type="button"
            className="button button--secondary button--small"
            disabled={pagina <= 1}
            onClick={() => onPageChange(pagina - 1)}
          >
            Anterior
          </button>
          <span className="pagination__page">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            className="button button--secondary button--small"
            disabled={pagina >= totalPaginas}
            onClick={() => onPageChange(pagina + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}