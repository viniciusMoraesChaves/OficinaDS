const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const clientesRoutes = require('./routes/clientesRoutes');
const funcionariosRoutes = require('./routes/funcionariosRoutes');
const { notFoundApi, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const publicDirectory = path.resolve(__dirname, '../public');

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

app.use(express.static(publicDirectory, { extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDirectory, '404.html'));
});

app.use(errorHandler);

module.exports = app;
