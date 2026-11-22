// Divide o texto de um arquivo .sql em comandos individuais.
// Respeita textos entre aspas e ignora comentários (-- , # e /* */), então um
// ponto e vírgula dentro de um comentário ou de um texto não quebra o comando.

function dividirSql(texto) {
  const comandos = [];
  let atual = '';
  let aspas = null;

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    const prox = texto[i + 1];

    if (aspas) {
      atual += c;

      if (c === '\\' && aspas !== '`') {
        atual += prox ?? '';
        i += 1;
      } else if (c === aspas) {
        if (prox === aspas) {
          atual += prox;
          i += 1;
        } else {
          aspas = null;
        }
      }

      continue;
    }

    const comentarioDeLinha =
      (c === '-' && prox === '-' && /\s|^$/.test(texto[i + 2] ?? ' ')) || c === '#';

    if (comentarioDeLinha) {
      while (i < texto.length && texto[i] !== '\n') i += 1;
      atual += '\n';
      continue;
    }

    if (c === '/' && prox === '*') {
      const fim = texto.indexOf('*/', i + 2);
      i = fim === -1 ? texto.length : fim + 1;
      atual += ' ';
      continue;
    }

    if (c === "'" || c === '"' || c === '`') {
      aspas = c;
      atual += c;
      continue;
    }

    if (c === ';') {
      if (atual.trim()) comandos.push(atual.trim());
      atual = '';
      continue;
    }

    atual += c;
  }

  if (atual.trim()) comandos.push(atual.trim());

  return comandos;
}

// Comandos que dependem de um usuário administrador do servidor. Bancos na nuvem
// já entregam o usuário pronto, então estes comandos são pulados.
const COMANDO_DE_PERMISSAO = /^(GRANT|REVOKE|CREATE\s+USER|ALTER\s+USER|DROP\s+USER|FLUSH\s+PRIVILEGES)\b/i;

function ehComandoDePermissao(comando) {
  return COMANDO_DE_PERMISSAO.test(comando);
}

// "ADD COLUMN IF NOT EXISTS" só existe no MariaDB; o MySQL 8 recusa.
// Como o executor roda cada script uma única vez, a cláusula pode sair.
function compativelComMySql(comando) {
  return comando.replace(/\b(ADD\s+(?:COLUMN|INDEX|KEY))\s+IF\s+NOT\s+EXISTS\b/gi, '$1');
}

module.exports = { dividirSql, ehComandoDePermissao, compativelComMySql };
