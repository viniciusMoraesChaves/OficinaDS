const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const { exigirAutenticacao } = require('./middlewares/authMiddleware');

const clientesRoutes = require('./routes/clientesRoutes');
const funcionariosRoutes = require('./routes/funcionariosRoutes');
const historicoRoutes = require('./routes/historicoRoutes');
const veiculosRoutes = require('./routes/veiculosRoutes');
const { notFoundApi, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const distDirectory = path.resolve(__dirname, '../frontend/dist');

app.disable('x-powered-by');
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/api/saude', (req, res) => {
  res.json({ status: 'ok', aplicacao: 'OficinaOS' });
});

app.use('/api', authRoutes);

app.use('/api/clientes', exigirAutenticacao, clientesRoutes);
app.use('/api/funcionarios', exigirAutenticacao, funcionariosRoutes);
// GET /api/veiculos/:id/historico?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
app.use('/api/veiculos', exigirAutenticacao, veiculosRoutes);

// GET /api/veiculos/:id/historico?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
app.use('/api/veiculos', exigirAutenticacao, historicoRoutes);
app.use('/api', notFoundApi);

// Front-end React (build do Vite)
app.use(express.static(distDirectory));

// Qualquer outra rota devolve o index.html; o React Router decide (inclusive o 404)
app.use((req, res) => {
  res.sendFile(path.join(distDirectory, 'index.html'));
});

app.use(errorHandler);

module.exports = app;