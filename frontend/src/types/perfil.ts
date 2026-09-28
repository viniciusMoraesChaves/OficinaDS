export type Perfil = 'Administrador' | 'Funcionario' | 'Cliente';

export const PERFIS = {
  ADMINISTRADOR: 'Administrador',
  FUNCIONARIO: 'Funcionario',
  CLIENTE: 'Cliente'
} as const satisfies Record<string, Perfil>;