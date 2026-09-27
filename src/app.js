const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const { exigirAutenticacao } = require('./middlewares/authMiddleware');

const clientesRoutes = require('./routes/clientesRoutes');
const funcionariosRoutes = require('./routes/funcionariosRoutes');
const { notFoundApi, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const distDirectory = path.resolve(__dirname, '../frontend/dist');
const indexFile = path.join(distDirectory, 'index.html');

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
app.use('/api/funcionarios', funcionariosRoutes); // perfil exigido já validado dentro da rota
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