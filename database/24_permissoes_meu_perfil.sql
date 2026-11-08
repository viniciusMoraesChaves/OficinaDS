USE oficina_ds;

SET @coluna_existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario' AND COLUMN_NAME = 'nome'
);
SET @sql := IF(@coluna_existe = 0,
  'ALTER TABLE usuario ADD COLUMN nome VARCHAR(120) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna_existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario' AND COLUMN_NAME = 'telefone'
);
SET @sql := IF(@coluna_existe = 0,
  'ALTER TABLE usuario ADD COLUMN telefone VARCHAR(20) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna_existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario' AND COLUMN_NAME = 'cpf'
);
SET @sql := IF(@coluna_existe = 0,
  'ALTER TABLE usuario ADD COLUMN cpf CHAR(11) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @indice_existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario'
    AND INDEX_NAME = 'uq_usuario_cpf'
);
SET @sql := IF(@indice_existe = 0,
  'ALTER TABLE usuario ADD UNIQUE INDEX uq_usuario_cpf (cpf)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

GRANT UPDATE (email, senha_hash, nome, telefone, cpf)
ON oficina_ds.usuario
TO 'oficina_app'@'localhost';

GRANT UPDATE (nome, telefone, email)
ON oficina_ds.funcionario
TO 'oficina_app'@'localhost';

GRANT UPDATE (nome, telefone, endereco, email)
ON oficina_ds.cliente
TO 'oficina_app'@'localhost';
