-- OficinaDS | Consulta Clientes e Pesquisa Funcionários
-- Compatível com MySQL 8.0+
-- Execute este arquivo conectado como root no MySQL Workbench.

CREATE DATABASE IF NOT EXISTS oficina_ds
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE oficina_ds;

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_usuario_email UNIQUE (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS cargo (
  id_cargo INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  descricao VARCHAR(255),
  CONSTRAINT uq_cargo_nome UNIQUE (nome)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS funcionario (
  id_funcionario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NULL,
  id_cargo INT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  cpf CHAR(11) NOT NULL,
  email VARCHAR(150) NOT NULL,
  telefone VARCHAR(20),
  data_admissao DATE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_funcionario_usuario UNIQUE (id_usuario),
  CONSTRAINT uq_funcionario_cpf UNIQUE (cpf),
  CONSTRAINT uq_funcionario_email UNIQUE (email),
  CONSTRAINT ck_funcionario_cpf CHECK (CHAR_LENGTH(cpf) = 11),
  CONSTRAINT fk_funcionario_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_funcionario_cargo
    FOREIGN KEY (id_cargo) REFERENCES cargo (id_cargo),
  INDEX idx_funcionario_nome (nome),
  INDEX idx_funcionario_ativo (ativo),
  INDEX idx_funcionario_cargo (id_cargo)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS cliente (
  id_cliente INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NULL,
  nome VARCHAR(120) NOT NULL,
  cpf CHAR(11) NOT NULL,
  email VARCHAR(150) NOT NULL,
  telefone VARCHAR(20),
  endereco VARCHAR(255),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_cliente_usuario UNIQUE (id_usuario),
  CONSTRAINT uq_cliente_cpf UNIQUE (cpf),
  CONSTRAINT uq_cliente_email UNIQUE (email),
  CONSTRAINT ck_cliente_cpf CHECK (CHAR_LENGTH(cpf) = 11),
  CONSTRAINT fk_cliente_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  INDEX idx_cliente_nome (nome),
  INDEX idx_cliente_ativo (ativo)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS veiculo (
  id_veiculo INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT UNSIGNED NOT NULL,
  placa VARCHAR(10) NOT NULL,
  marca VARCHAR(60) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  ano SMALLINT UNSIGNED NOT NULL,
  cor VARCHAR(40),
  chassi VARCHAR(30),
  CONSTRAINT uq_veiculo_placa UNIQUE (placa),
  CONSTRAINT uq_veiculo_chassi UNIQUE (chassi),
  CONSTRAINT ck_veiculo_ano CHECK (ano BETWEEN 1900 AND 2200),
  CONSTRAINT fk_veiculo_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente),
  INDEX idx_veiculo_cliente (id_cliente)
) ENGINE = InnoDB;
