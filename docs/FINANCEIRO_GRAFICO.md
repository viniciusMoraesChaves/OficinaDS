# Gráfico do controle financeiro

Na página **Financeiro**, acima da tabela de movimentações, o gráfico mostra **entradas** (verde) e
**saídas** (vermelho) lado a lado. Ele acompanha os mesmos filtros da tabela: período, tipo,
categoria e busca.

## Agrupamento

| Período escolhido | Um grupo de barras por |
| --- | --- |
| Até 31 dias (este mês, últimos 30 dias, datas próximas) | dia |
| Mais de 31 dias, ou "Tudo" (sem data inicial) | mês (no máximo os últimos 36) |

Dias e meses sem movimentação aparecem com zero, para o eixo não ter buracos.

## API

`GET /api/financeiro/movimentacoes/grafico` (somente Administrador). Aceita `inicio`, `fim`, `tipo`,
`categoria` e `busca`, como a listagem. Resposta:

```json
{
  "dados": {
    "granularidade": "dia",
    "serie": [{ "periodo": "2026-11-02", "entradas": 480.5, "saidas": 0 }]
  },
  "filtros": {}
}
```

Entram as mesmas fontes da listagem: lançamentos manuais e cobranças pagas.

## Detalhes da tela

- Desenhado em SVG, sem biblioteca de gráficos.
- Passar o mouse sobre um grupo mostra o dia (ou mês) e os valores.
- "Ver os valores do gráfico" abre a mesma informação em tabela, para leitores de tela e conferência.

## Testes

`test/graficoFinanceiro.test.js` (agrupamento e períodos), `test/graficoRepository.test.js` (SQL) e
`test/graficoRotas.test.js` (login, perfis e respostas).
