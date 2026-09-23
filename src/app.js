const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const clientesRoutes = require('./routes/clientesRoutes');
const funcionariosRoutes = require('./routes/funcionariosRoutes');
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

app.use('/api/clientes', clientesRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api', notFoundApi);

// Front-end React (build do Vite)
app.use(express.static(distDirectory));

// Qualquer outra rota devolve o index.html; o React Router decide (inclusive o 404)
app.use((req, res) => {
  res.sendFile(path.join(distDirectory, 'index.html'));
});

app.use(errorHandler);

module.exports = app;