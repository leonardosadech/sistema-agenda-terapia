export type StatusAgendamento = 'DISPONIVEL' | 'PRE_MARCADO' | 'AGENDADO';

export interface Cliente {
  id?: number;
  nome: string;
  cpf: string;
  celular: string;
  dataNascimento?: string;
  observacoes?: string;
  dataCadastro: string;
}

export interface Agendamento {
  id?: number;
  clienteId?: number;
  data: string;
  horario: string;
  status: StatusAgendamento;
  observacao?: string;
  dataCriacao: string;
}

export interface HorarioConfig {
  id?: number;
  diaSemana: number;
  horario: string;
  ativo: boolean;
}