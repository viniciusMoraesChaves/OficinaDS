// O módulo financeiro em si (faturamento, contas, relatórios) ainda não foi
// implementado. Este endpoint existe só para já restringir o acesso à área
// financeira, para quando as funcionalidades forem construídas.
async function resumo(req, res) {
  res.json({
    dados: {
      status: 'em_construcao',
      mensagem: 'Módulo financeiro ainda não implementado.'
    }
  });
}

module.exports = { resumo };