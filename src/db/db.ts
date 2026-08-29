import Dexie, { Table } from 'dexie';
import { Cliente, Agendamento, HorarioConfig } from '../types';

export class AppDatabase extends Dexie {
  clientes!: Table<Cliente, number>;
  agendamentos!: Table<Agendamento, number>;
  horariosConfig!: Table<HorarioConfig, number>;

  constructor() {
    super('AgendaTerapiaDB');
    this.version(1).stores({
      clientes: '++id, nome, cpf, celular',
      agendamentos: '++id, clienteId, data, horario, status',
      horariosConfig: '++id, diaSemana, horario'
    });
  }
}

export const db = new AppDatabase();