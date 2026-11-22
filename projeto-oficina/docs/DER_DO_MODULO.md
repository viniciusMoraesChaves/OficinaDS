# DER do módulo

Este é o recorte necessário para DM-67 e DM-100. Ele mantém os mesmos nomes e relações centrais do DER geral enviado pelo grupo.

```mermaid
erDiagram
    USUARIO {
        int id_usuario PK
        varchar email UK
        varchar senha_hash
        boolean ativo
    }

    CARGO {
        int id_cargo PK
        varchar nome UK
        varchar descricao
    }

    FUNCIONARIO {
        int id_funcionario PK
        int id_usuario FK
        int id_cargo FK
        varchar nome
        char cpf UK
        varchar email UK
        varchar telefone
        date data_admissao
        boolean ativo
    }

    CLIENTE {
        int id_cliente PK
        int id_usuario FK
        varchar nome
        char cpf UK
        varchar email UK
        varchar telefone
        varchar endereco
        boolean ativo
    }

    VEICULO {
        int id_veiculo PK
        int id_cliente FK
        varchar placa UK
        varchar marca
        varchar modelo
        int ano
        varchar cor
        varchar chassi UK
    }

    USUARIO ||--o| CLIENTE : identifica
    USUARIO ||--o| FUNCIONARIO : identifica
    CARGO ||--o{ FUNCIONARIO : possui
    CLIENTE ||--o{ VEICULO : possui
```

## Observações importantes

- `cpf` é texto, não número: pode começar com zero e não é usado em cálculos.
- `id_usuario` é nulo neste estágio para permitir consultar clientes e funcionários antes da história de login integrar as contas.
- CPF, e-mail, placa e chassi possuem restrições de unicidade.
- `LEFT JOIN` é usado na listagem de clientes para incluir clientes sem veículo.
- índices de nome, status e chaves estrangeiras ajudam as consultas do módulo.
