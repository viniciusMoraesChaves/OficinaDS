const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');

const clientesRoutes = require('./routes/clientesRoutes');
const historicoRoutes = require('./routes/historicoRoutes');
const veiculosRoutes = require('./routes/veiculosRoutes');
const funcionariosRoutes = require('./routes/funcionariosRoutes');
const cargosRoutes = require('./routes/cargosRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const financeiroRoutes = require('./routes/financeiroRoutes');
const atendimentosRoutes = require('./routes/atendimentosRoutes');
const orcamentosRoutes = require('./routes/orcamentosRoutes');
const diagnosticosRoutes = require('./routes/diagnosticosRoutes');
const painelRoutes = require('./routes/painelRoutes');
const pecasRoutes = require('./routes/pecasRoutes');
const pedidosPecasRoutes = require('./routes/pedidosPecasRoutes');
const { notFoundApi, errorHandler } = require('./middlewares/errorHandler');
const agendamentosRoutes = require('./routes/agendamentosRoutes');

const app = express();
const distDirectory = path.resolve(__dirname, '../frontend/dist');
const indexFile = path.join(distDirectory, 'index.html');

app.disable('x-powered-by');
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/api/saude', (req, res) => {
  res.json({ status: 'ok', aplicacao: 'OficinaDS' });
});

app.use('/api', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/cargos', cargosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/atendimentos', atendimentosRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/diagnosticos', diagnosticosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/veiculos', historicoRoutes);
app.use('/api/painel', painelRoutes);
app.use('/api/pecas', pecasRoutes);
app.use('/api/pedidos-pecas', pedidosPecasRoutes);
app.use('/api', notFoundApi);


// Front-end React (build do Vite)
if (fs.existsSync(distDirectory)) {
  app.use(express.static(distDirectory));
}

// Servir o index.html do frontend ou fallback para testes quando a build não existe
app.use((req, res, next) => {
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(200).send('API OficinaDS rodando.');
  }
});

app.use(errorHandler);

module.exports = app;
