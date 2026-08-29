import React, { useState, useEffect, useRef } from 'react';
import { db } from './db/db';
import { Agendamento, Cliente, StatusAgendamento } from './types';
import { supabase } from './supabaseClient';

interface UsuarioSistema {
  username: string;
  nomeCompleto: string;
  isAdmin: boolean;
}

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [usuarioLogado, setUsuarioLogado] = useState<string>('');
  const [isAdminLogado, setIsAdminLogado] = useState<boolean>(false);
  
  const [userInput, setUserInput] = useState('');
  const [passInput, setPassInput] = useState('');

  const [abaAtiva, setAbaAtiva] = useState<'dashboard' | 'agenda' | 'pacientes'>('dashboard');
  const [dataAtual, setDataAtual] = useState<string>(new Date().toISOString().split('T')[0]);
  const [agendamentosHoje, setAgendamentosHoje] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Cliente[]>([]);
  
  const [nomePaciente, setNomePaciente] = useState('');
  const [cpfPaciente, setCpfPaciente] = useState('');
  const [celularPaciente, setCelularPaciente] = useState('');
  const [pacienteEmEdicaoId, setPacienteEmEdicaoId] = useState<number | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [agendamentoEmEdicaoId, setAgendamentoEmEdicaoId] = useState<number | null>(null);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [duracaoMinutos, setDuracaoMinutos] = useState<number>(50);

  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<number | ''>('');
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [statusSelecionado, setStatusSelecionado] = useState<StatusAgendamento>('AGENDADO');
  const [tipoAtendimento, setTipoAtendimento] = useState<'Presencial' | 'Remoto'>('Presencial');
  const [observacaoAgendamento, setObservacaoAgendamento] = useState('');

  const [modalPacienteAberto, setModalPacienteAberto] = useState(false);

  const [modalUsuariosAberto, setModalUsuariosAberto] = useState(false);
  const [novoUsuarioNomeCompleto, setNovoUsuarioNomeCompleto] = useState('');
  const [novoUsuarioUsername, setNovoUsuarioUsername] = useState('');
  const [novoUsuarioSenha, setNovoUsuarioSenha] = useState('');
  const [novoUsuarioIsAdmin, setNovoUsuarioIsAdmin] = useState(false);

  const timeInputRef = useRef<HTMLInputElement>(null);
  const agendaDateInputRef = useRef<HTMLInputElement>(null);

  const [menuPagamentoAbertoId, setMenuPagamentoAbertoId] = useState<number | null>(null);

  // ESTADOS DE USUÁRIOS PERSISTIDOS NO LOCALSTORAGE
  const [usuariosSistema, setUsuariosSistema] = useState<Record<string, UsuarioSistema>>(() => {
    const salvos = localStorage.getItem('espaco_usuarios_sistema');
    if (salvos) {
      try { return JSON.parse(salvos); } catch (e) { /* fallback */ }
    }
    return {
      'Admin': { username: 'Admin', nomeCompleto: 'Administrador do Sistema', isAdmin: true },
      'LeticiaSepulvida': { username: 'LeticiaSepulvida', nomeCompleto: 'Letícia Sepulvida', isAdmin: false }
    };
  });

  const [senhasUsuarios, setSenhasUsuarios] = useState<Record<string, string>>(() => {
    const salvas = localStorage.getItem('espaco_senhas_usuarios');
    if (salvas) {
      try { return JSON.parse(salvas); } catch (e) { /* fallback */ }
    }
    return {
      'Admin': 'Vida2026',
      'LeticiaSepulvida': 'Vida2026'
    };
  });

  useEffect(() => {
    localStorage.setItem('espaco_usuarios_sistema', JSON.stringify(usuariosSistema));
  }, [usuariosSistema]);

  useEffect(() => {
    localStorage.setItem('espaco_senhas_usuarios', JSON.stringify(senhasUsuarios));
  }, [senhasUsuarios]);

  useEffect(() => {
    if (autenticado) {
      carregarDadosDia(dataAtual);
      carregarPacientes();
    }
  }, [autenticado, dataAtual]);

  async function carregarDadosDia(data: string) {
    const agendamentos = await db.agendamentos.where('data').equals(data).toArray();
    agendamentos.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
    setAgendamentosHoje(agendamentos);
  }

  async function carregarPacientes() {
    const lista = await db.clientes.toArray();
    setPacientes(lista);
  }

  function aplicarMascaraCPF(valor: string) {
    return valor
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  }

  function aplicarMascaraCelular(valor: string) {
    return valor
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d{4})$/, '$1-$2')
      .slice(0, 15);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (senhasUsuarios[userInput] && senhasUsuarios[userInput] === passInput) {
      setAutenticado(true);
      setUsuarioLogado(userInput);
      setIsAdminLogado(usuariosSistema[userInput]?.isAdmin || false);
    } else {
      alert('Usuário ou senha incorretos!');
    }
  }

  const cadastrarNovoUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usuariosSistema[novoUsuarioUsername]) {
      alert('Erro: Já existe um usuário cadastrado com este nome de usuário!');
      return;
    }

    const { error } = await supabase
      .from('usuarios')
      .insert([{ nome: novoUsuarioUsername, senha: novoUsuarioSenha }]);

    if (error) {
      console.log('Erro ao cadastrar no Supabase:', error.message);
    }

    setUsuariosSistema({
      ...usuariosSistema,
      [novoUsuarioUsername]: {
        username: novoUsuarioUsername,
        nomeCompleto: novoUsuarioNomeCompleto,
        isAdmin: novoUsuarioIsAdmin
      }
    });

    setSenhasUsuarios({
      ...senhasUsuarios,
      [novoUsuarioUsername]: novoUsuarioSenha
    });

    setNovoUsuarioNomeCompleto('');
    setNovoUsuarioUsername('');
    setNovoUsuarioSenha('');
    setNovoUsuarioIsAdmin(false);
    alert('Novo usuário cadastrado com sucesso!');
  };

  function excluirUsuario(usernameParaExcluir: string) {
    if (usernameParaExcluir === 'Admin') {
      alert('Erro: O usuário Administrador principal não pode ser excluído.');
      return;
    }

    if (usernameParaExcluir === usuarioLogado) {
      alert('Erro: Você não pode excluir o seu próprio usuário enquanto está logado.');
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o usuário "${usernameParaExcluir}"? Ele perderá o acesso ao sistema.`)) {
      const novosUsuarios = { ...usuariosSistema };
      delete novosUsuarios[usernameParaExcluir];
      setUsuariosSistema(novosUsuarios);

      const novasSenhas = { ...senhasUsuarios };
      delete novasSenhas[usernameParaExcluir];
      setSenhasUsuarios(novasSenhas);

      alert('Usuário excluído com sucesso!');
    }
  }

  function resetarSenhaUsuarioAdmin(usernameAlvo: string) {
    const novaSenhaGerada = prompt(`Digite a nova senha para o usuário "${usernameAlvo}":`);
    if (novaSenhaGerada === null) return;
    if (!novaSenhaGerada.trim()) {
      alert('A senha não pode ser vazia.');
      return;
    }

    setSenhasUsuarios({
      ...senhasUsuarios,
      [usernameAlvo]: novaSenhaGerada.trim()
    });

    alert(`Senha do usuário "${usernameAlvo}" redefinida com sucesso!`);
  }

  function alterarStatusAdminUsuario(usernameAlvo: string, novoStatus: boolean) {
    if (usernameAlvo === 'Admin') {
      alert('Erro: O privilégio do usuário Administrador principal não pode ser alterado.');
      return;
    }
    if (usernameAlvo === usuarioLogado) {
      alert('Erro: Você não pode alterar o seu próprio privilégio de Admin enquanto está logado.');
      return;
    }

    const confirmacao = confirm(`Tem certeza que deseja ${novoStatus ? 'CONCEDER' : 'REMOVER'} o acesso de Administrador para "${usernameAlvo}"?`);
    if (!confirmacao) return;

    setUsuariosSistema({
      ...usuariosSistema,
      [usernameAlvo]: {
        ...usuariosSistema[usernameAlvo],
        isAdmin: novoStatus
      }
    });

    alert(`Privilégio de Admin de "${usernameAlvo}" atualizado com sucesso.`);
  }

  function abrirNovoPaciente() {
    setPacienteEmEdicaoId(null);
    setNomePaciente('');
    setCpfPaciente('');
    setCelularPaciente('');
    setModalPacienteAberto(true);
  }

  function abrirEditarPaciente(p: Cliente) {
    setPacienteEmEdicaoId(p.id || null);
    setNomePaciente(p.name || p.nome || '');
    setCpfPaciente(p.cpf || '');
    setCelularPaciente(p.celular || '');
    setModalPacienteAberto(true);
  }

  async function salvarPaciente(e: React.FormEvent) {
    e.preventDefault();
    if (!nomePaciente || !celularPaciente) {
      alert('Os campos Nome Completo e Celular são obrigatórios!');
      return;
    }

    const todosClientes = await db.clientes.toArray();
    
    if (cpfPaciente) {
      const cpfExiste = todosClientes.some(c => c.id !== pacienteEmEdicaoId && c.cpf && c.cpf.trim() === cpfPaciente.trim());
      if (cpfExiste) {
        alert('Erro: Já existe um paciente cadastrado com este CPF!');
        return;
      }
    }

    const celularExiste = todosClientes.some(c => c.id !== pacienteEmEdicaoId && c.celular && c.celular.trim() === celularPaciente.trim());
    if (celularExiste) {
      alert('Erro: Já existe um paciente cadastrado com este número de celular!');
      return;
    }

    if (pacienteEmEdicaoId) {
      await db.clientes.update(pacienteEmEdicaoId, {
        nome: nomePaciente,
        cpf: cpfPaciente,
        celular: celularPaciente
      });
      alert('Paciente atualizado com sucesso!');
    } else {
      await db.clientes.add({
        nome: nomePaciente,
        cpf: cpfPaciente,
        celular: celularPaciente,
        observacoes: 'Pagamento: Em Dia',
        dataCadastro: new Date().toISOString()
      });
      alert('Paciente cadastrado com sucesso!');
    }

    setNomePaciente('');
    setCpfPaciente('');
    setCelularPaciente('');
    setPacienteEmEdicaoId(null);
    carregarPacientes();
    setModalPacienteAberto(false);
  }

  async function excluirPaciente(id?: number) {
    if (!id) return;
    if (confirm('Tem certeza que deseja excluir este paciente?')) {
      await db.clientes.delete(id);
      carregarPacientes();
    }
  }

  async function alterarStatusPagamento(id?: number, novoStatusStr?: string) {
    if (!id) return;
    await db.clientes.update(id, { observacoes: novoStatusStr });
    setMenuPagamentoAbertoId(null);
    carregarPacientes();
  }

  function abrirNovoAgendamento() {
    setAgendamentoEmEdicaoId(null);
    setHoraInicio('08:00');
    setDuracaoMinutos(50);
    setPacienteSelecionadoId('');
    setBuscaPaciente('');
    setStatusSelecionado('AGENDADO');
    setTipoAtendimento('Presencial');
    setObservacaoAgendamento('');
    setModalAberto(true);
  }

  function abrirEditarAgendamento(ag: Agendamento) {
    if (ag.criadoPor && ag.criadoPor !== usuarioLogado && !isAdminLogado) {
      alert('⚠️ Acesso negado: Você não pode alterar um agendamento criado por outro usuário[cite: 1].');
      return;
    }

    setAgendamentoEmEdicaoId(ag.id || null);
    setHoraInicio(ag.horario || '08:00');
    setDuracaoMinutos(ag.duracao || 50);
    setPacienteSelecionadoId(ag.clienteId || '');
    const p = pacientes.find(cli => cli.id === ag.clienteId);
    setBuscaPaciente(p ? (p.name || p.nome) : '');
    setStatusSelecionado(ag.status);
    setTipoAtendimento((ag.tipoAtendimento as 'Presencial' | 'Remoto') || 'Presencial');
    setObservacaoAgendamento(ag.observacao || '');
    setModalAberto(true);
  }

  function horaParaMinutos(horaStr: string) {
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + m;
  }

  async function salvarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    if (!horaInicio) {
      alert('Informe o horário de início!');
      return;
    }
    if (!pacienteSelecionadoId) {
      alert('Selecione um paciente válido clicando na lista de busca!');
      return;
    }

    const inicioMin = horaParaMinutos(horaInicio);
    const fimMin = inicioMin + Number(duracaoMinutos);

    const conflito = agendamentosHoje.some(a => {
      if (agendamentoEmEdicaoId && a.id === agendamentoEmEdicaoId) return false;

      const aInicioMin = horaParaMinutos(a.horario || '00:00');
      const aDuracao = a.duracao || 50;
      const aFimMin = aInicioMin + aDuracao;

      return (inicioMin < aFimMin && fimMin > aInicioMin);
    });

    if (conflito) {
      alert('⚠️ Conflito de horário! Já existe um atendimento agendado que coincide com este período.');
      return;
    }

    if (agendamentoEmEdicaoId) {
      const agendamentoAtual = agendamentosHoje.find(a => a.id === agendamentoEmEdicaoId);
      if (agendamentoAtual && agendamentoAtual.criadoPor && agendamentoAtual.criadoPor !== usuarioLogado && !isAdminLogado) {
        alert('⚠️ Acesso negado: Você não pode alterar um agendamento criado por outro usuário[cite: 1].');
        return;
      }

      await db.agendamentos.update(agendamentoEmEdicaoId, {
        clienteId: Number(pacienteSelecionadoId),
        horario: horaInicio,
        duracao: Number(duracaoMinutos),
        status: statusSelecionado,
        tipoAtendimento: tipoAtendimento,
        observacao: observacaoAgendamento,
        dataAlteracao: new Date().toISOString()
      });
    } else {
      await db.agendamentos.add({
        clienteId: Number(pacienteSelecionadoId),
        data: dataAtual,
        horario: horaInicio,
        duracao: Number(duracaoMinutos),
        status: statusSelecionado,
        tipoAtendimento: tipoAtendimento,
        observacao: observacaoAgendamento,
        criadoPor: usuarioLogado,
        dataCriacao: new Date().toISOString()
      });
    }

    carregarDadosDia(dataAtual);
    setModalAberto(false);
    alert('Agendamento salvo com sucesso!');
  }

  async function excluirAgendamento(id?: number) {
    if (!id) return;

    const agendamentoAlvo = agendamentosHoje.find(a => a.id === id);
    if (agendamentoAlvo && agendamentoAlvo.criadoPor && agendamentoAlvo.criadoPor !== usuarioLogado && !isAdminLogado) {
      alert('⚠️ Acesso negado: Você não pode excluir um agendamento criado por outro usuário[cite: 1].');
      return;
    }

    if (confirm('Deseja realmente excluir este agendamento?')) {
      await db.agendamentos.delete(id);
      carregarDadosDia(dataAtual);
      setModalAberto(false);
      alert('Agendamento excluído com sucesso!');
    }
  }

  function exportarCSV() {
    const cabecalho = ['Horario', 'Status', 'Paciente', 'Tipo Atendimento', 'Observacao', 'Criado Por'];
    const linhas = agendamentosHoje.map(ag => {
      const p = pacientes.find(cli => cli.id === ag.clienteId);
      const nomeCli = p ? (p.name || p.nome) : 'Desconhecido';
      const statusTxt = ag.status === 'PRE_MARCADO' ? 'Pré-agendado' : 'Agendado';
      return [
        `"${ag.horario}"`,
        `"${statusTxt}"`,
        `"${nomeCli}"`,
        `"${ag.tipoAtendimento || 'Presencial'}"`,
        `"${ag.observacao || ''}"`,
        `"${ag.criadoPor || 'Admin'}"`
      ].join(';');
    });

    const conteudoCSV = [cabecalho.join(';'), ...linhas].join('\n');
    const blob = new Blob(["\uFEFF" + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_agendamentos_${dataAtual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportarXLSX() {
    const cabecalho = ['Horario', 'Status', 'Paciente', 'Tipo Atendimento', 'Observacao', 'Criado Por'];
    const linhas = agendamentosHoje.map(ag => {
      const p = pacientes.find(cli => cli.id === ag.clienteId);
      const nomeCli = p ? (p.name || p.nome) : 'Desconhecido';
      const statusTxt = ag.status === 'PRE_MARCADO' ? 'Pré-agendado' : 'Agendado';
      return [
        ag.horario,
        statusTxt,
        nomeCli,
        ag.tipoAtendimento || 'Presencial',
        ag.observacao || '',
        ag.criadoPor || 'Admin'
      ];
    });

    let htmlTabela = '<table><thead><tr>' + cabecalho.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    linhas.forEach(l => {
      htmlTabela += '<tr>' + l.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    htmlTabela += '</tbody></table>';

    const blob = new Blob([`\uFEFF<html><meta charset="utf-8"/><body>${htmlTabela}</body></html>`], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_agendamentos_${dataAtual}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportarPDF() {
    const janelaPrint = window.open('', '_blank');
    if (!janelaPrint) {
      alert('Permita pop-ups no navegador para gerar o PDF.');
      return;
    }

    const dataFormatada = dataAtual.split('-').reverse().join('/');
    let htmlRows = '';
    agendamentosHoje.forEach(ag => {
      const p = pacientes.find(cli => cli.id === ag.clienteId);
      const nomeCli = p ? (p.name || p.nome) : 'Desconhecido';
      const statusTxt = ag.status === 'PRE_MARCADO' ? 'Pré-agendado' : 'Agendado';
      htmlRows += `
        <tr>
          <td>${ag.horario}</td>
          <td><b>${statusTxt}</b></td>
          <td>${nomeCli}</td>
          <td>${ag.tipoAtendimento || 'Presencial'}</td>
          <td>${ag.observacao || '-'}</td>
          <td>${ag.criadoPor || 'Admin'}</td>
        </tr>
      `;
    });

    janelaPrint.document.write(`
      <html>
        <head>
          <title>Relatório de Agendamentos - ${dataFormatada}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
            h1 { color: #3A5A40; font-size: 20px; margin-bottom: 5px; }
            p { color: #666; font-size: 14px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #A3B19B; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #E9EDC9; color: #3A5A40; }
          </style>
        </head>
        <body>
          <h1>Espaço Terapêutico Vida — Relatório de Agendamentos</h1>
          <p>Data de Referência: <b>${dataFormatada}</b> | Total de registros: ${agendamentosHoje.length}</p>
          <table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Status</th>
                <th>Paciente</th>
                <th>Tipo</th>
                <th>Observações</th>
                <th>Criado Por</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows || '<tr><td colspan="6" style="text-align:center;">Nenhum agendamento nesta data.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    janelaPrint.document.close();
  }

  function exportarPacientesCSV() {
    const cabecalho = ['Nome', 'CPF', 'Celular', 'Pagamento'];
    const linhas = pacientes.map(p => {
      const isPendente = p.observacoes?.includes('Pendente');
      const statusTxt = isPendente ? 'Pendente de pagamento' : 'Em Dia';
      return [
        `"${p.name || p.nome || ''}"`,
        `"${p.cpf || ''}"`,
        `"${p.celular || ''}"`,
        `"${statusTxt}"`
      ].join(';');
    });

    const conteudoCSV = [cabecalho.join(';'), ...linhas].join('\n');
    const blob = new Blob(["\uFEFF" + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_pacientes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportarPacientesXLSX() {
    const cabecalho = ['Nome', 'CPF', 'Celular', 'Pagamento'];
    const linhas = pacientes.map(p => {
      const isPendente = p.observacoes?.includes('Pendente');
      const statusTxt = isPendente ? 'Pendente de pagamento' : 'Em Dia';
      return [
        p.name || p.nome || '',
        p.cpf || '',
        p.celular || '',
        statusTxt
      ];
    });

    let htmlTabela = '<table><thead><tr>' + cabecalho.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    linhas.forEach(l => {
      htmlTabela += '<tr>' + l.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    htmlTabela += '</tbody></table>';

    const blob = new Blob([`\uFEFF<html><meta charset="utf-8"/><body>${htmlTabela}</body></html>`], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_pacientes.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportarPacientesPDF() {
    const janelaPrint = window.open('', '_blank');
    if (!janelaPrint) {
      alert('Permita pop-ups no navegador para gerar o PDF.');
      return;
    }

    let htmlRows = '';
    pacientes.forEach(p => {
      const isPendente = p.observacoes?.includes('Pendente');
      const statusTxt = isPendente ? 'Pendente de pagamento' : 'Em Dia';
      htmlRows += `
        <tr>
          <td><b>${p.name || p.nome || ''}</b></td>
          <td>${p.cpf || 'Não informado'}</td>
          <td>${p.celular || ''}</td>
          <td>${statusTxt}</td>
        </tr>
      `;
    });

    janelaPrint.document.write(`
      <html>
        <head>
          <title>Relatório de Pacientes</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
            h1 { color: #8C6D53; font-size: 20px; margin-bottom: 5px; }
            p { color: #666; font-size: 14px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #A3B19B; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #FEFAE0; color: #8C6D53; }
          </style>
        </head>
        <body>
          <h1>Espaço Terapêutico Vida — Relatório de Pacientes</h1>
          <p>Total de registros: <b>${pacientes.length}</b></p>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Celular / WhatsApp</th>
                <th>Pagamento</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows || '<tr><td colspan="4" style="text-align:center;">Nenhum paciente cadastrado.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    janelaPrint.document.close();
  }

  if (!autenticado) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#F4F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: 0, padding: 16, boxSizing: 'border-box', zIndex: 9999
      }}>
        <div style={{
          backgroundColor: '#ffffff', padding: 32, borderRadius: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '100%', maxWidth: 420, border: '2px solid #A3B19B', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24, width: '100%' }}>
            <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#8C6D53', margin: '0 0 6px 0' }}>Espaço Terapêutico Vida</h1>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Sistema de Agendamento</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#333', fontSize: 14, marginBottom: 4 }}>Usuário</label>
              <input 
                type="text" 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                placeholder="Ex: Admin"
                style={{ width: '100%', padding: 12, border: '1px solid #A3B19B', borderRadius: 12, fontSize: 16, boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#333', fontSize: 14, marginBottom: 4 }}>Senha</label>
              <input 
                type="password" 
                value={passInput} 
                onChange={(e) => setPassInput(e.target.value)} 
                placeholder="********"
                style={{ width: '100%', padding: 12, border: '1px solid #A3B19B', borderRadius: 12, fontSize: 16, boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>
            <button type="submit" style={{ width: '100%', backgroundColor: '#588157', color: '#fff', fontWeight: 'bold', padding: 14, borderRadius: 12, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              ENTRAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F1EA', color: '#2F3E46', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', position: 'relative' }}>
      <style>{`
        .excel-table {
          width: 100%;
          border-collapse: collapse !important;
          border: 2px solid #A3B19B !important;
          background-color: #ffffff;
        }
        .excel-table th, .excel-table td {
          border: 1px solid #A3B19B !important;
          padding: 10px 12px !important;
        }
      `}</style>

      <header style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #A3B19B', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', width: '100%' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ backgroundColor: '#FEFAE0', color: '#8C6D53', fontWeight: 'extrabold', padding: '6px 14px', borderRadius: 14, border: '1px solid #A3B19B', fontSize: 14 }}>
              🌱 Espaço Terapêutico Vida
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, backgroundColor: '#E9EDC9', color: '#3A5A40', padding: '6px 12px', borderRadius: 12, fontWeight: 'bold', border: '1px solid #A3B19B' }}>
              👤 {usuarioLogado} {isAdminLogado && '(Admin)'}
            </span>
            <button onClick={() => setAutenticado(false)} style={{ backgroundColor: '#b76e79', color: '#fff', padding: '6px 14px', borderRadius: 12, fontSize: 14, fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Sair</button>
          </div>
        </div>

        <div style={{ backgroundColor: '#F4F1EA', borderTop: '1px solid #A3B19B', padding: '10px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setAbaAtiva('dashboard')} 
            style={{ padding: '8px 18px', fontWeight: 'bold', borderRadius: 14, fontSize: 14, cursor: 'pointer', border: '1px solid #A3B19B', backgroundColor: abaAtiva === 'dashboard' ? '#588157' : '#ffffff', color: abaAtiva === 'dashboard' ? '#ffffff' : '#3F4F44', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          >
            🏠 Início
          </button>
          <button 
            onClick={() => setAbaAtiva('agenda')} 
            style={{ padding: '8px 18px', fontWeight: 'bold', borderRadius: 14, fontSize: 14, cursor: 'pointer', border: '1px solid #A3B19B', backgroundColor: abaAtiva === 'agenda' ? '#588157' : '#ffffff', color: abaAtiva === 'agenda' ? '#ffffff' : '#3F4F44', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          >
            📅 Agenda
          </button>
          <button 
            onClick={() => setAbaAtiva('pacientes')} 
            style={{ padding: '8px 18px', fontWeight: 'bold', borderRadius: 14, fontSize: 14, cursor: 'pointer', border: '1px solid #A3B19B', backgroundColor: abaAtiva === 'pacientes' ? '#588157' : '#ffffff', color: abaAtiva === 'pacientes' ? '#ffffff' : '#3F4F44', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          >
            👥 Pacientes ({pacientes.length})
          </button>

          {isAdminLogado && (
            <button 
              onClick={() => {
                setNovoUsuarioNomeCompleto('');
                setNovoUsuarioUsername('');
                setNovoUsuarioSenha('');
                setNovoUsuarioIsAdmin(false);
                setModalUsuariosAberto(true);
              }}
              style={{ padding: '8px 18px', fontWeight: 'bold', borderRadius: 14, fontSize: 14, cursor: 'pointer', border: '1px solid #A3B19B', backgroundColor: '#D4A373', color: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
              🔐 Gerenciar Usuários
            </button>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: '24px 16px', maxWidth: '960px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {abaAtiva === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ backgroundColor: '#ffffff', padding: 28, borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', border: '2px solid #A3B19B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #E5E7EB' }}>
                <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#3A5A40', margin: 0 }}>Resumo do Dia ({dataAtual.split('-').reverse().join('/')})</h2>
                <input 
                  type="date" 
                  value={dataAtual} 
                  onChange={(e) => { setDataAtual(e.target.value); }} 
                  style={{ fontSize: 14, padding: '8px 12px', border: '1px solid #A3B19B', borderRadius: 12, fontWeight: 'bold', outline: 'none', backgroundColor: '#F4F1EA', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'center' }}>
                <div style={{ backgroundColor: '#E9EDC9', padding: 20, borderRadius: 18, border: '1px solid #CCD5AE' }}>
                  <p style={{ fontSize: 32, fontWeight: 'bold', color: '#3A5A40', margin: '0 0 4px 0' }}>{agendamentosHoje.length}</p>
                  <p style={{ fontSize: 14, color: '#3F4F44', fontWeight: 'bold', margin: 0 }}>Consultas na Data</p>
                </div>
                <div style={{ backgroundColor: '#FEFAE0', padding: 20, borderRadius: 18, border: '1px solid #D4A373' }}>
                  <p style={{ fontSize: 32, fontWeight: 'bold', color: '#D4A373', margin: '0 0 4px 0' }}>
                    {agendamentosHoje.filter(a => a.status === 'PRE_MARCADO').length}
                  </p>
                  <p style={{ fontSize: 14, color: '#3F4F44', fontWeight: 'bold', margin: 0 }}>Pré-agendados</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button onClick={() => setAbaAtiva('agenda')} style={{ backgroundColor: '#588157', color: '#ffffff', fontSize: 18, fontWeight: 'bold', padding: 20, borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', border: '2px solid #A3B19B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                📅 VER AGENDA COMPLETA
              </button>
              <button onClick={() => setAbaAtiva('pacientes')} style={{ backgroundColor: '#8C6D53', color: '#ffffff', fontSize: 18, fontWeight: 'bold', padding: 20, borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', border: '2px solid #A3B19B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                👥 PACIENTES ({pacientes.length})
              </button>
            </div>
          </div>
        )}

        {abaAtiva === 'agenda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', border: '2px solid #A3B19B', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 'bold', color: '#3A5A40', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selecionar Data da Agenda:</label>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div 
                  onClick={() => {
                    if (agendaDateInputRef.current) {
                      if (typeof agendaDateInputRef.current.showPicker === 'function') {
                        agendaDateInputRef.current.showPicker();
                      } else {
                        agendaDateInputRef.current.focus();
                      }
                    }
                  }}
                  style={{ padding: '12px 16px', border: '2px solid #588157', borderRadius: 16, backgroundColor: '#F4F1EA', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 12, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                >
                  <span style={{ fontSize: 22 }}>📅</span>
                  <input 
                    ref={agendaDateInputRef}
                    type="date" 
                    value={dataAtual} 
                    onChange={(e) => { setDataAtual(e.target.value); }} 
                    style={{ fontSize: 18, padding: 4, background: 'transparent', fontWeight: 'extrabold', color: '#3A5A40', outline: 'none', cursor: 'pointer', border: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button 
                    onClick={exportarPDF} 
                    style={{ backgroundColor: '#b91c1c', color: '#fff', padding: '10px 14px', borderRadius: 12, fontWeight: 'bold', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Exportar Relatório em PDF"
                  >
                    📄 Baixar PDF
                  </button>
                  <button 
                    onClick={exportarXLSX} 
                    style={{ backgroundColor: '#047857', color: '#fff', padding: '10px 14px', borderRadius: 12, fontWeight: 'bold', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Exportar Relatório em Excel"
                  >
                    📊 Baixar XLSX
                  </button>
                  <button 
                    onClick={exportarCSV} 
                    style={{ backgroundColor: '#d97706', color: '#fff', padding: '10px 14px', borderRadius: 12, fontWeight: 'bold', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Exportar Relatório em CSV"
                  >
                    📑 Baixar CSV
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button 
                  onClick={abrirNovoAgendamento}
                  style={{ backgroundColor: '#588157', color: '#ffffff', padding: '12px 20px', borderRadius: 14, fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}
                >
                  ➕ Novo Agendamento
                </button>
                <button onClick={() => setAbaAtiva('dashboard')} style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '12px 20px', borderRadius: 14, fontWeight: 'bold', fontSize: 14, border: 'none', cursor: 'pointer' }}>Voltar</button>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', border: '2px solid #A3B19B', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 'bold', color: '#3A5A40', margin: 0 }}>Agendamentos do dia {dataAtual.split('-').reverse().join('/')}</h3>
                <span style={{ fontSize: 13, backgroundColor: '#E9EDC9', color: '#3A5A40', padding: '6px 14px', borderRadius: 20, fontWeight: 'bold', border: '1px solid #CCD5AE' }}>
                  Total: {agendamentosHoje.length} atendimento(s)
                </span>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="excel-table">
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>Horário</th>
                      <th style={{ width: '150px' }}>Status</th>
                      <th>Paciente</th>
                      <th style={{ width: '130px' }}>Atendimento</th>
                      <th>Observações</th>
                      <th style={{ width: '140px' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentosHoje.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#6b7280', fontStyle: 'italic' }}>
                          Nenhum agendamento nesta data. Clique em "Novo Agendamento" acima para marcar.
                        </td>
                      </tr>
                    ) : (
                      agendamentosHoje.map((ag) => {
                        const pacienteObj = pacientes.find(p => p.id === ag.clienteId);
                        const duracao = ag.duracao || 50;
                        
                        const [h, m] = (ag.horario || '00:00').split(':').map(Number);
                        const totalMinFim = h * 60 + m + duracao;
                        const horaFim = `${String(Math.floor(totalMinFim / 60)).padStart(2, '0')}:${String(totalMinFim % 60).padStart(2, '0')}`;

                        const corBadge = 
                          ag.status === 'PRE_MARCADO' ? 'background-color: #fef3c7; color: #92400e; border-color: #f59e0b;' : 'background-color: #ffe4e6; color: #9f1239; border-color: #fda4af;';

                        const textoStatus = ag.status === 'PRE_MARCADO' ? '🟡 Pré-agendado' : '🔴 Agendado';
                        const tipoAtendimentoStr = ag.tipoAtendimento || 'Presencial';

                        const podeMexer = !ag.criadoPor || ag.criadoPor === usuarioLogado || isAdminLogado;

                        return (
                          <tr key={ag.id}>
                            <td style={{ fontWeight: 'bold', color: '#1f2937' }}>
                              {ag.horario} às {horaFim} <br/>
                              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 'normal' }}>({duracao} min)</span>
                            </td>
                            <td>
                              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', border: '1px solid', display: 'inline-block', ...Object.fromEntries(corBadge.split(';').filter(Boolean).map(s => s.split(':').map(x => x.trim()) as [string, string])) }}>
                                {textoStatus}
                              </span>
                            </td>
                            <td style={{ fontWeight: '600', color: '#3A5A40' }}>
                              {pacienteObj ? `${pacienteObj.name || pacienteObj.nome}` : <span style={{ color: '#ef4444' }}>Paciente não encontrado</span>}
                            </td>
                            <td style={{ fontWeight: '500', color: '#374151', fontSize: 13 }}>
                              <span style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid', fontWeight: 'bold', backgroundColor: tipoAtendimentoStr === 'Remoto' ? '#f3e8ff' : '#e0f2fe', color: tipoAtendimentoStr === 'Remoto' ? '#6b21a8' : '#0369a1', borderColor: tipoAtendimentoStr === 'Remoto' ? '#d8b4fe' : '#bae6fd' }}>
                                {tipoAtendimentoStr === 'Remoto' ? '💻 Remoto' : '🏢 Presencial'}
                              </span>
                            </td>
                            <td style={{ color: '#4b5563', fontSize: 13 }}>
                              {ag.observacao ? <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', display: 'inline-block' }}>{ag.observacao}</span> : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sem obs</span>}
                              <br/>
                              <span style={{ fontSize: 11, color: '#888' }}>Agendado por: <b>{ag.criadoPor || 'Admin'}</b></span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                {podeMexer ? (
                                  <>
                                    <button 
                                      onClick={() => abrirEditarAgendamento(ag)}
                                      style={{ backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                    >
                                      ✏️ Editar
                                    </button>
                                    <button 
                                      onClick={() => excluirAgendamento(ag.id)}
                                      style={{ backgroundColor: '#ffe4e6', color: '#be123c', padding: '6px 8px', borderRadius: 8, fontSize: 12, fontWeight: 'bold', border: '1px solid #fda4af', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                      title="Excluir Agendamento"
                                    >
                                      ❌
                                    </button>
                                  </>
                                ) : (
                                  <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Somente leitura</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'pacientes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 20, borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', border: '2px solid #A3B19B', flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#8C6D53', margin: 0 }}>👥 Cadastro de Pacientes</h2>
              
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button 
                    onClick={exportarPacientesPDF} 
                    style={{ backgroundColor: '#b91c1c', color: '#fff', padding: '10px 14px', borderRadius: 12, fontWeight: 'bold', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Exportar Relatório de Pacientes em PDF"
                  >
                    📄 Baixar PDF
                  </button>
                  <button 
                    onClick={exportarPacientesXLSX} 
                    style={{ backgroundColor: '#047857', color: '#fff', padding: '10px 14px', borderRadius: 12, fontWeight: 'bold', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Exportar Relatório de Pacientes em Excel"
                  >
                    📊 Baixar XLSX
                  </button>
                  <button 
                    onClick={exportarPacientesCSV} 
                    style={{ backgroundColor: '#d97706', color: '#fff', padding: '10px 14px', borderRadius: 12, fontWeight: 'bold', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Exportar Relatório de Pacientes em CSV"
                  >
                    📑 Baixar CSV
                  </button>
                </div>

                <button 
                  onClick={abrirNovoPaciente}
                  style={{ backgroundColor: '#8C6D53', color: '#ffffff', padding: '10px 18px', borderRadius: 14, fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                >
                  ➕ Cadastre um novo paciente
                </button>
                <button onClick={() => setAbaAtiva('dashboard')} style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '10px 18px', borderRadius: 14, fontWeight: 'bold', fontSize: 14, border: 'none', cursor: 'pointer' }}>Voltar</button>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', border: '2px solid #A3B19B', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Planilha de Pacientes Cadastrados ({pacientes.length})</h3>
              {pacientes.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Nenhum paciente cadastrado ainda. Clique em "Cadastre um novo paciente" acima.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th style={{ width: '160px' }}>CPF</th>
                        <th style={{ width: '180px' }}>Celular / WhatsApp</th>
                        <th style={{ width: '180px' }}>Pagamento</th>
                        <th style={{ width: '170px' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pacientes.map((p) => {
                        const isPendente = p.observacoes?.includes('Pendente');
                        const textoStatus = isPendente ? '🔴 Pendente de pagamento' : '🟢 Em Dia';
                        
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: isPendente ? '800' : '600', color: isPendente ? '#dc2626' : '#3A5A40' }}>
                              {p.name || p.nome}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: isPendente ? '800' : 'normal', color: isPendente ? '#dc2626' : '#4b5563' }}>
                              {p.cpf || 'Não informado'}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: isPendente ? '800' : 'normal', color: isPendente ? '#dc2626' : '#4b5563' }}>
                              {p.celular}
                            </td>
                            <td style={{ position: 'relative' }}>
                              <button 
                                onClick={() => setMenuPagamentoAbertoId(menuPagamentoAbertoId === p.id ? null : p.id!)}
                                style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid', cursor: 'pointer', backgroundColor: isPendente ? '#fee2e2' : '#d1fae5', color: isPendente ? '#b91c1c' : '#047857', borderColor: isPendente ? '#fca5a5' : '#6ee7b7' }}
                              >
                                {textoStatus} ▾
                              </button>

                              {menuPagamentoAbertoId === p.id && (
                                <div style={{ position: 'absolute', zIndex: 30, left: '50%', transform: 'translateX(-50%)', marginTop: 8, width: 220, backgroundColor: '#ffffff', border: '2px solid #A3B19B', borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', textAlign: 'left' }}>
                                  <div 
                                    onClick={() => alterarStatusPagamento(p.id, 'Pagamento: Em Dia')}
                                    style={{ padding: '12px 16px', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold', fontSize: 12, color: '#047857', borderBottom: '1px solid #e5e7eb' }}
                                  >
                                    🟢 Em Dia
                                  </div>
                                  <div 
                                    onClick={() => alterarStatusPagamento(p.id, 'Pagamento: Pendente')}
                                    style={{ padding: '12px 16px', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold', fontSize: 12, color: '#b91c1c' }}
                                  >
                                    🔴 Pendente de pagamento
                                  </div>
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                <button 
                                  onClick={() => abrirEditarPaciente(p)}
                                  style={{ backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                >
                                  ✏️ Editar
                                </button>
                                <button 
                                  onClick={() => excluirPaciente(p.id)}
                                  style={{ backgroundColor: '#ffe4e6', color: '#be123c', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 'bold', border: '1px solid #fda4af', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                >
                                  ❌ Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* POP-UP DE NOVO/EDITAR AGENDAMENTO */}
      {modalAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 99999, padding: '16px', boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff', border: '2px solid #A3B19B', borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '580px',
            padding: '28px', textAlign: 'left', color: '#2F3E46', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '2px solid #A3B19B', paddingBottom: '12px', marginBottom: '22px',
              backgroundColor: '#E9EDC9', margin: '-28px -28px 22px -28px', padding: '18px 28px',
              borderTopLeftRadius: '22px', borderTopRightRadius: '22px'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#3A5A40' }}>
                📅 {agendamentoEmEdicaoId ? 'Editar Agendamento' : 'Novo Agendamento'} ({dataAtual.split('-').reverse().join('/')})
              </div>
              <button 
                onClick={() => setModalAberto(false)} 
                style={{
                  background: '#ffffff', border: '1px solid #A3B19B', borderRadius: '50%',
                  width: '32px', height: '32px', fontWeight: 'bold', cursor: 'pointer', color: '#333'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarAgendamento} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                  Pesquisar Paciente <span style={{ color: 'red' }}>*</span>
                </label>
                <input 
                  type="text"
                  value={buscaPaciente}
                  onChange={(e) => {
                    setBuscaPaciente(e.target.value);
                    setPacienteSelecionadoId(''); 
                  }}
                  placeholder="Digite o nome do paciente..."
                  style={{
                    width: '100%', padding: '12px', border: '1px solid #A3B19B',
                    borderRadius: '12px', fontSize: '15px', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box'
                  }}
                />
                {buscaPaciente && !pacienteSelecionadoId && (
                  <div style={{
                    position: 'absolute', zIndex: 99, left: 0, right: 0, marginTop: '4px',
                    backgroundColor: '#fff', border: '1px solid #A3B19B', borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '220px', overflowY: 'auto'
                  }}>
                    {pacientes
                      .filter(p => (p.name || p.nome).toLowerCase().includes(buscaPaciente.toLowerCase()))
                      .map(p => (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setPacienteSelecionadoId(p.id!);
                            setBuscaPaciente(p.name || p.nome);
                          }}
                          style={{
                            padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '14px', fontWeight: '600'
                          }}
                        >
                          {p.name || p.nome} — <span style={{ color: '#666', fontWeight: 'normal', fontSize: '12px' }}>Cel: {p.celular}</span>
                        </div>
                      ))}
                    {pacientes.filter(p => (p.name || p.nome).toLowerCase().includes(buscaPaciente.toLowerCase())).length === 0 && (
                      <div style={{ padding: '12px', color: '#888', fontStyle: 'italic', fontSize: '14px' }}>Nenhum paciente encontrado.</div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '16px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                    Horário de Início <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div 
                    onClick={() => {
                      if (timeInputRef.current) {
                        if (typeof timeInputRef.current.showPicker === 'function') {
                          timeInputRef.current.showPicker();
                        } else {
                          timeInputRef.current.focus();
                        }
                      }
                    }}
                    style={{
                      width: '100%', padding: '12px', border: '1px solid #A3B19B',
                      borderRadius: '12px', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', boxSizing: 'border-box'
                    }}
                  >
                    <input 
                      ref={timeInputRef}
                      type="time" 
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      style={{
                        width: '100%', border: 'none', fontSize: '15px', fontWeight: 'bold',
                        backgroundColor: 'transparent', outline: 'none', cursor: 'pointer'
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                    Duração
                  </label>
                  <select 
                    value={duracaoMinutos}
                    onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
                    style={{
                      width: '100%', padding: '12px', border: '1px solid #A3B19B',
                      borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#fff',
                      outline: 'none', boxSizing: 'border-box', cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10 minutos</option>
                    <option value={20}>20 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={40}>40 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={50}>50 minutos</option>
                    <option value={60}>60 minutos (1h)</option>
                    <option value={70}>70 minutos (1h 10min)</option>
                    <option value={80}>80 minutos (1h 20min)</option>
                    <option value={90}>90 minutos (1h 30min)</option>
                    <option value={100}>100 minutos (1h 40min)</option>
                    <option value={110}>110 minutos (1h 50min)</option>
                    <option value={120}>120 minutos (2h)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                    Status
                  </label>
                  <select 
                    value={statusSelecionado} 
                    onChange={(e) => setStatusSelecionado(e.target.value as StatusAgendamento)}
                    style={{
                      width: '100%', padding: '12px', border: '1px solid #A3B19B',
                      borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#fff',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  >
                    <option value="AGENDADO">🔴 AGENDADO</option>
                    <option value="PRE_MARCADO">🟡 PRÉ-AGENDADO</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                    Tipo de Atendimento
                  </label>
                  <select 
                    value={tipoAtendimento} 
                    onChange={(e) => setTipoAtendimento(e.target.value as 'Presencial' | 'Remoto')}
                    style={{
                      width: '100%', padding: '12px', border: '1px solid #A3B19B',
                      borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#fff',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  >
                    <option value="Presencial">🏢 Presencial</option>
                    <option value="Remoto">💻 Remoto</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                  Observações do Atendimento
                </label>
                <textarea 
                  value={observacaoAgendamento} 
                  onChange={(e) => setObservacaoAgendamento(e.target.value)}
                  placeholder="Ex: Primeira consulta, retorno..." 
                  rows={3}
                  style={{
                    width: '100%', padding: '12px', border: '1px solid #A3B19B',
                    borderRadius: '12px', fontSize: '14px', backgroundColor: '#fff', outline: 'none',
                    resize: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button 
                  type="submit" 
                  style={{
                    flex: 1, backgroundColor: '#588157', color: '#fff', fontWeight: 'bold',
                    padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    fontSize: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  💾 Salvar Agendamento
                </button>
                {agendamentoEmEdicaoId && (
                  <button 
                    type="button" 
                    onClick={() => excluirAgendamento(agendamentoEmEdicaoId)} 
                    style={{
                      backgroundColor: '#ffe4e6', color: '#be123c', fontWeight: 'bold',
                      padding: '14px 18px', borderRadius: '12px', border: '1px solid #fda4af',
                      cursor: 'pointer', fontSize: '15px'
                    }}
                    title="Excluir Agendamento"
                  >
                    🗑️ Excluir
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP DE NOVO/EDITAR PACIENTE */}
      {modalPacienteAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 99999, padding: '16px', boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff', border: '2px solid #A3B19B', borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '580px',
            padding: '28px', textAlign: 'left', color: '#2F3E46', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '2px solid #A3B19B', paddingBottom: '12px', marginBottom: '22px',
              backgroundColor: '#FEFAE0', margin: '-28px -28px 22px -28px', padding: '18px 28px',
              borderTopLeftRadius: '22px', borderTopRightRadius: '22px'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#8C6D53' }}>
                👥 {pacienteEmEdicaoId ? 'Editar Paciente' : 'Novo Paciente'}
              </div>
              <button 
                onClick={() => setModalPacienteAberto(false)} 
                style={{
                  background: '#ffffff', border: '1px solid #A3B19B', borderRadius: '50%',
                  width: '32px', height: '32px', fontWeight: 'bold', cursor: 'pointer', color: '#333'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarPaciente} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                  Nome Completo <span style={{ color: 'red' }}>*</span>
                </label>
                <input 
                  type="text" 
                  value={nomePaciente} 
                  onChange={(e) => setNomePaciente(e.target.value)}
                  placeholder="Ex: Maria da Silva" 
                  style={{
                    width: '100%', padding: '12px', border: '1px solid #A3B19B',
                    borderRadius: '12px', fontSize: '15px', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                    CPF
                  </label>
                  <input 
                    type="text" 
                    value={cpfPaciente} 
                    onChange={(e) => setCpfPaciente(aplicarMascaraCPF(e.target.value))}
                    placeholder="000.000.000-00" 
                    maxLength={14}
                    style={{
                      width: '100%', padding: '12px', border: '1px solid #A3B19B',
                      borderRadius: '12px', fontSize: '15px', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                    Celular / WhatsApp <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={celularPaciente} 
                    onChange={(e) => setCelularPaciente(aplicarMascaraCelular(e.target.value))}
                    placeholder="(21) 99999-9999" 
                    maxLength={15}
                    style={{
                      width: '100%', padding: '12px', border: '1px solid #A3B19B',
                      borderRadius: '12px', fontSize: '15px', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '6px' }}>
                <button 
                  type="submit" 
                  style={{
                    width: '100%', backgroundColor: '#8C6D53', color: '#fff', fontWeight: 'bold',
                    padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    fontSize: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  💾 {pacienteEmEdicaoId ? 'Salvar Alterações' : 'Salvar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP DE GERENCIAMENTO DE USUÁRIOS (EXCLUSIVO ADMIN) */}
      {modalUsuariosAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 99999, padding: '16px', boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff', border: '2px solid #A3B19B', borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '720px',
            padding: '28px', textAlign: 'left', color: '#2F3E46', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '2px solid #A3B19B', paddingBottom: '12px', marginBottom: '22px',
              backgroundColor: '#FEFAE0', margin: '-28px -28px 22px -28px', padding: '18px 28px',
              borderTopLeftRadius: '22px', borderTopRightRadius: '22px'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#8C6D53' }}>
                🔐 Gerenciamento de Usuários do Sistema
              </div>
              <button 
                onClick={() => setModalUsuariosAberto(false)} 
                style={{
                  background: '#ffffff', border: '1px solid #A3B19B', borderRadius: '50%',
                  width: '32px', height: '32px', fontWeight: 'bold', cursor: 'pointer', color: '#333'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', color: '#3A5A40' }}>
                Usuários com Acesso Cadastrados ({Object.keys(usuariosSistema).length})
              </h3>
              <div style={{ border: '1px solid #A3B19B', borderRadius: '12px', overflow: 'hidden' }}>
                <table className="excel-table" style={{ margin: 0, border: 'none' }}>
                  <thead>
                    <tr>
                      <th>Login</th>
                      <th>Nome Completo</th>
                      <th style={{ width: '130px' }}>Admin?</th>
                      <th style={{ width: '250px' }}>Ações de Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(usuariosSistema).map((u) => (
                      <tr key={u.username}>
                        <td style={{ fontWeight: 'bold' }}>{u.username}</td>
                        <td>{u.nomeCompleto}</td>
                        <td>
                          <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: '11px', fontWeight: 'bold', backgroundColor: u.isAdmin ? '#d1fae5' : '#f3f4f6', color: u.isAdmin ? '#047857' : '#374151', display: 'inline-block' }}>
                            {u.isAdmin ? '👑 Sim' : '👤 Não'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                              type="button"
                              onClick={() => alterarStatusAdminUsuario(u.username, !u.isAdmin)}
                              style={{
                                backgroundColor: u.isAdmin ? '#fef3c7' : '#ecfdf5',
                                color: u.isAdmin ? '#92400e' : '#065f46',
                                border: '1px solid',
                                borderColor: u.isAdmin ? '#f59e0b' : '#10b981',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              {u.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                            </button>
                            <button 
                              type="button"
                              onClick={() => resetarSenhaUsuarioAdmin(u.username)}
                              style={{
                                backgroundColor: '#FEFAE0', color: '#8C6D53', border: '1px solid #D4A373',
                                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'
                              }}
                            >
                              🔑 Senha
                            </button>
                            {u.username !== 'Admin' && (
                              <button 
                                type="button"
                                onClick={() => excluirUsuario(u.username)}
                                style={{
                                  backgroundColor: '#ffe4e6', color: '#be123c', border: '1px solid #fda4af',
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                              >
                                ❌ Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed #D4A373', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '14px', color: '#8C6D53' }}>
                ➕ Cadastrar Novo Usuário
              </h3>
              <form onSubmit={cadastrarNovoUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', color: '#333' }}>
                    Nome Completo <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={novoUsuarioNomeCompleto} 
                    onChange={(e) => setNovoUsuarioNomeCompleto(e.target.value)}
                    placeholder="Ex: Leticia Sepulvida" 
                    style={{
                      width: '100%', padding: '10px', border: '1px solid #A3B19B',
                      borderRadius: '12px', fontSize: '14px', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', color: '#333' }}>
                      Nome de Usuário (Login) <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      value={novoUsuarioUsername} 
                      onChange={(e) => setNovoUsuarioUsername(e.target.value)}
                      placeholder="Ex: Leticia" 
                      style={{
                        width: '100%', padding: '10px', border: '1px solid #A3B19B',
                        borderRadius: '12px', fontSize: '14px', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', color: '#333' }}>
                      Senha <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="password" 
                      value={novoUsuarioSenha} 
                      onChange={(e) => setNovoUsuarioSenha(e.target.value)}
                      placeholder="********" 
                      style={{
                        width: '100%', padding: '10px', border: '1px solid #A3B19B',
                        borderRadius: '12px', fontSize: '14px', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input 
                    type="checkbox" 
                    id="chkAdmin"
                    checked={novoUsuarioIsAdmin}
                    onChange={(e) => setNovoUsuarioIsAdmin(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chkAdmin" style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', cursor: 'pointer' }}>
                    Conceder privilégios de Administrador do Sistema para este usuário
                  </label>
                </div>

                <div style={{ marginTop: '6px' }}>
                  <button 
                    type="submit" 
                    style={{
                      width: '100%', backgroundColor: '#D4A373', color: '#fff', fontWeight: 'bold',
                      padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    💾 Cadastrar Novo Usuário
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}