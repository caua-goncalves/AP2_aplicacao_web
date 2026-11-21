/**
 * @file servicos/consultasServico.js
 * @description Módulo central de regras de negócio para agendamento e gestão de consultas.
 * Pertence à camada de serviços. Centraliza todas as validações de regra, prevenção
 * contra conflito de horários (regra principal), controle de acesso anti-IDOR e
 * agregações com programação funcional (map, filter, reduce).

*/

const consultasDados = require('../dados/consultasDados');
const medicosDados = require('../dados/medicosDados');
const usuariosDados = require('../dados/usuariosDados');
const {
  validarId,
  validarTexto,
  validarDataHoraConsulta
} = require('./validacoes');
const {
  ErroValidacao,
  ErroPermissao,
  ErroNaoEncontrado,
  ErroConflito
} = require('./erros');

/**
 * Registra um novo agendamento de consulta na clínica.

 * REGRA DE NEGÓCIO PRINCIPAL:
 * O médico não pode ter duas consultas agendadas no mesmo horário.
 * O serviço verifica previamente a disponibilidade via SQL parametrizado e, além disso, captura   * qualquer violação da constraint UNIQUE do banco traduzindo ambas as situações no 
 * código HTTP 409 (Conflict).

 * DECISÃO DE SEGURANÇA (Anti-IDOR):
 * Se o usuário autenticado for do papel 'paciente', o 'pacienteId' é obrigatoriamente
 * extraído do token JWT autenticado (usuarioAutenticado.id), nunca do corpo da requisição.
 * Isso impede que um paciente agende consultas em nome de outra pessoa.

 * @param {object} dados Dados da consulta a agendar
 * @param {number} dados.medicoId ID do médico
 * @param {string} dados.dataHora Data e horário pretendidos
 * @param {string} [dados.observacoes] Queixa ou observação prévia
 * @param {object} usuarioAutenticado Dados do usuário decodificados do token JWT
 * @returns {object} Consulta criada
 * @throws {ErroValidacao} 400 se entradas forem inválidas ou horário fora das regras
 * @throws {ErroNaoEncontrado} 404 se o médico não existir
 * @throws {ErroConflito} 409 se o médico já tiver consulta no horário solicitado
*/

function agendarConsulta(dados, usuarioAutenticado) {
  const medicoId = validarId(dados.medicoId, 'médico');
  const dataHoraFormatada = validarDataHoraConsulta(dados.dataHora);
  const observacoes = dados.observacoes ? validarTexto(dados.observacoes, 'observações', 0, 500) : '';

  // SEGURANÇA ANTI-IDOR: O paciente logado é sempre o paciente da consulta
  let pacienteId;
  if (usuarioAutenticado.papel === 'paciente') {
    pacienteId = usuarioAutenticado.id;
  } else {
    // Caso um médico/administrador esteja agendando para um paciente
    pacienteId = validarId(dados.pacienteId, 'paciente');
    const pacienteExiste = usuariosDados.buscarPorId(pacienteId);
    if (!pacienteExiste || pacienteExiste.papel !== 'paciente') {
      throw new ErroNaoEncontrado('O paciente informado não foi encontrado.');
    }
  }

  // Verifica se o médico existe no sistema
  const medicoExiste = medicosDados.buscarPorId(medicoId);
  if (!medicoExiste) {
    throw new ErroNaoEncontrado('Médico selecionado não encontrado.');
  }

  // REGRA DE NEGÓCIO 1 (Servidor): Verificar se o médico já possui agendamento no horário
  const conflito = consultasDados.buscarConflitoHorario(medicoId, dataHoraFormatada);
  if (conflito) {
    throw new ErroConflito(
      `O Dr(a). ${medicoExiste.nome} já possui uma consulta agendada para ${dataHoraFormatada}. Por favor, selecione outro horário.`
    );
  }

  try {
    const novaConsulta = consultasDados.inserirConsulta({
      pacienteId,
      medicoId,
      dataHora: dataHoraFormatada,
      observacoes
    });

    return {
      mensagem: 'Consulta agendada com sucesso.',
      consulta: novaConsulta
    };
  } catch (err) {
    // Redundância defensiva: se duas requisições simultâneas passarem pelo check acima,
    // a constraint UNIQUE (medico_id, data_hora) do SQLite dispara e é capturada aqui.
    if (err.message && err.message.includes('UNIQUE')) {
      throw new ErroConflito('Conflito de horário detectado: este médico já possui consulta confirmada para o horário solicitado.');
    }
    throw err;
  }
}

/**
 * Lista consultas respeitando filtros e permissões de privacidade do usuário.

 * DECISÃO DE SEGURANÇA (Anti-IDOR):
 * - Paciente só pode visualizar suas próprias consultas.
 * - Médico só pode visualizar as consultas da sua própria agenda.
 *
 * @param {object} filtros Filtros de busca (status, data)
 * @param {object} usuarioAutenticado Usuário vindo do token JWT
 * @returns {Array<object>} Lista de consultas formatadas
*/

function listarConsultas(filtros = {}, usuarioAutenticado) {
  const paramsFiltro = {};

  if (filtros.status) {
    const statusValidos = ['agendada', 'concluida', 'cancelada'];
    if (!statusValidos.includes(filtros.status)) {
      throw new ErroValidacao("Status inválido. Escolha entre: 'agendada', 'concluida', 'cancelada'.");
    }
    paramsFiltro.status = filtros.status;
  }

  if (filtros.data) {
    paramsFiltro.data = filtros.data;
  }

  // Controle de acesso Anti-IDOR:
  if (usuarioAutenticado.papel === 'paciente') {
    paramsFiltro.pacienteId = usuarioAutenticado.id;
  } else if (usuarioAutenticado.papel === 'medico') {
    // Localiza o ID do perfil médico associado a este usuário
    const perfilMedico = medicosDados.buscarPorUsuarioId(usuarioAutenticado.id);
    if (perfilMedico) {
      paramsFiltro.medicoId = perfilMedico.id;
    }
  }

  const consultas = consultasDados.listar(paramsFiltro);

  // Uso de map para sanitizar e formartar a saída
  return consultas.map((c) => ({
    id: c.id,
    dataHora: c.data_hora,
    status: c.status,
    observacoes: c.observacoes || '',
    paciente: {
      id: c.paciente_id,
      nome: c.paciente_nome,
      email: c.paciente_email
    },
    medico: {
      id: c.medico_id,
      nome: c.medico_nome,
      crm: c.medico_crm,
      especialidade: c.medico_especialidade,
      precoConsulta: Number(c.preco_consulta)
    }
  }));
}

/**
 * Busca uma consulta por ID e valida permissão de acesso contra IDOR.

 * DECISÃO DE SEGURANÇA (Anti-IDOR):
 * Verifica se a consulta pertence ao paciente logado ou se o médico logado é
 * o responsável pela consulta. Se um paciente tentar passar o ID da consulta
 * de outro paciente pela URL, a operação é terminantemente negada com HTTP 403.

 * @param {number|string} id Identificador da consulta
 * @param {object} usuarioAutenticado Usuário vindo do JWT
 * @returns {object} Consulta encontrada
 * @throws {ErroValidacao} 400 se ID inválido
 * @throws {ErroNaoEncontrado} 404 se consulta não existir
 * @throws {ErroPermissao} 403 se o usuário não for o dono do registro
*/

function buscarConsultaPorId(id, usuarioAutenticado) {
  const idConsulta = validarId(id, 'consulta');
  const consulta = consultasDados.buscarPorId(idConsulta);

  if (!consulta) {
    throw new ErroNaoEncontrado(`Consulta de ID ${idConsulta} não foi encontrada.`);
  }

  // Defesa Anti-IDOR:
  if (usuarioAutenticado.papel === 'paciente') {
    if (consulta.paciente_id !== usuarioAutenticado.id) {
      throw new ErroPermissao('Acesso negado: você não tem permissão para visualizar os detalhes desta consulta.');
    }
  } else if (usuarioAutenticado.papel === 'medico') {
    const perfilMedico = medicosDados.buscarPorUsuarioId(usuarioAutenticado.id);
    if (!perfilMedico || consulta.medico_id !== perfilMedico.id) {
      throw new ErroPermissao('Acesso negado: esta consulta não pertence à sua escala de atendimentos.');
    }
  }

  return {
    id: consulta.id,
    dataHora: consulta.data_hora,
    status: consulta.status,
    observacoes: consulta.observacoes || '',
    criadoEm: consulta.criado_em,
    paciente: {
      id: consulta.paciente_id,
      nome: consulta.paciente_nome,
      email: consulta.paciente_email
    },
    medico: {
      id: consulta.medico_id,
      nome: consulta.medico_nome,
      crm: consulta.medico_crm,
      especialidade: consulta.medico_especialidade,
      precoConsulta: Number(consulta.preco_consulta)
    }
  };
}

/**
 * Cancela uma consulta existente.

 * REGRA DE NEGÓCIO:
 * 1. Consulta já 'concluida' não pode ser cancelada (409 Conflict).
 * 2. Consulta já 'cancelada' não pode ser cancelada novamente (409 Conflict).
 * 3. Defesa Anti-IDOR: apenas o próprio paciente ou o médico da consulta podem cancelar.

 * @param {number|string} id Identificador da consulta
 * @param {object} usuarioAutenticado Usuário vindo do JWT
 * @returns {{ mensagem: string, id: number }}
 * @throws {ErroConflito} 409 se a consulta já foi realizada ou já estava cancelada
*/

function cancelarConsulta(id, usuarioAutenticado) {
  const consulta = buscarConsultaPorId(id, usuarioAutenticado);

  if (consulta.status === 'concluida') {
    throw new ErroConflito('Operação inválida: não é permitido cancelar uma consulta que já foi concluída.');
  }

  if (consulta.status === 'cancelada') {
    throw new ErroConflito('Esta consulta já se encontra cancelada.');
  }

  consultasDados.atualizarStatus(consulta.id, 'cancelada');

  return {
    mensagem: 'Consulta cancelada com sucesso.',
    id: consulta.id
  };
}

/**
 * Remarca uma consulta para uma nova data e hora.

 * REGRA DE NEGÓCIO:
 * 1. Apenas consultas com status 'agendada' podem ser remarcadas.
 * 2. A nova data deve atender às validações temporais (futura, comercial).
 * 3. Garante que o médico não tenha outra consulta no novo horário (409 Conflict).

 * @param {number|string} id Identificador da consulta
 * @param {string} novaDataHora Nova data e horário pretendidos
 * @param {object} usuarioAutenticado Usuário autenticado
 * @returns {object} Consulta com nova data
*/

function remarcarConsulta(id, novaDataHora, usuarioAutenticado) {
  const consulta = buscarConsultaPorId(id, usuarioAutenticado);

  if (consulta.status !== 'agendada') {
    throw new ErroConflito(`Não é possível remarcar uma consulta com status '${consulta.status}'.`);
  }

  const dataHoraFormatada = validarDataHoraConsulta(novaDataHora);

  // Regra de negócio 1: verifica conflito no novo horário, ignorando o próprio ID
  const conflito = consultasDados.buscarConflitoHorario(consulta.medico.id, dataHoraFormatada, consulta.id);
  if (conflito) {
    throw new ErroConflito('O médico já possui outro agendamento neste horário escolhido.');
  }

  consultasDados.atualizarDataHora(consulta.id, dataHoraFormatada);

  return {
    mensagem: 'Consulta remarcada com sucesso.',
    id: consulta.id,
    novaDataHora: dataHoraFormatada
  };
}

/**
 * Conclui um atendimento médico.

 * REGRA DE NEGÓCIO:
 * Apenas médicos podem marcar um atendimento como concluído.
 *
 * @param {number|string} id Identificador da consulta
 * @param {object} usuarioAutenticado Usuário médico autenticado
 * @returns {object} Resultado da operação
*/

function concluirConsulta(id, usuarioAutenticado) {
  if (usuarioAutenticado.papel !== 'medico') {
    throw new ErroPermissao('Apenas o médico responsável pode registrar a conclusão do atendimento.');
  }

  const consulta = buscarConsultaPorId(id, usuarioAutenticado);

  if (consulta.status !== 'agendada') {
    throw new ErroConflito(`Apenas consultas em aberto podem ser concluídas. Status atual: ${consulta.status}.`);
  }

  consultasDados.atualizarStatus(consulta.id, 'concluida');

  return {
    mensagem: 'Atendimento médico concluído com sucesso.',
    id: consulta.id
  };
}

/**
 * Remove uma consulta da base de dados.

 * DECISÃO DE PROJETO (Status HTTP 409):
 * Conforme detalhado não se apaga consulta em aberto.
 * Para ser excluída, a consulta deve estar previamente cancelada.

 * @param {number|string} id Identificador da consulta
 * @param {object} usuarioAutenticado Usuário logado
 * @returns {{ mensagem: string }}
 * @throws {ErroConflito} 409 se a consulta não estiver cancelada
*/

function excluirConsulta(id, usuarioAutenticado) {
  const consulta = buscarConsultaPorId(id, usuarioAutenticado);

  // Regra de negócio: só é permitido excluir se a consulta estiver cancelada
  if (consulta.status !== 'cancelada') {
    throw new ErroConflito('Decisão de projeto: consultas ativas ou concluídas não podem ser apagadas do histórico. Cancele-a antes.');
  }

  consultasDados.deletar(consulta.id);
  return {
    mensagem: 'Consulta excluída do histórico com sucesso.'
  };
}

/**
 * Gera estatísticas e relatórios agregados da clínica.

 * USO DE FUNÇÕES DE ALTA ORDEM (filter, reduce):
 * Demonstra as exigências do projeto usando filter e reduce para consolidar indicadores
 * gerais a partir das consultas retornadas.
 *
 * @param {object} usuarioAutenticado Usuário autenticado (exige papel 'medico')
 * @returns {object} Relatório consolidado
*/

function obterRelatorios(usuarioAutenticado) {
  if (usuarioAutenticado.papel !== 'medico') {
    throw new ErroPermissao('Acesso a relatórios restrito aos profissionais da clínica.');
  }

  // Agregações nativas realizadas no banco de dados
  const porEspecialidade = consultasDados.obterRelatorioPorEspecialidade();
  const porMedico = consultasDados.obterEstatisticasMedicos();

  // Consolidação analítica em JavaScript com reduce e filter
  const todasConsultas = consultasDados.listar({});
  const concluidas = todasConsultas.filter((c) => c.status === 'concluida');
  const canceladas = todasConsultas.filter((c) => c.status === 'cancelada');

  const faturamentoTotalGeral = concluidas.reduce(
    (acumulador, atual) => acumulador + Number(atual.preco_consulta || 0),
    0
  );

  return {
    totaisGerais: {
      totalCadastradas: todasConsultas.length,
      totalConcluidas: concluidas.length,
      totalCanceladas: canceladas.length,
      faturamentoGeral: faturamentoTotalGeral,
      faturamentoFormatado: `R$ ${faturamentoTotalGeral.toFixed(2).replace('.', ',')}`
    },
    relatorioPorEspecialidade: porEspecialidade,
    relatorioPorMedico: porMedico
  };
}

module.exports = {
  agendarConsulta,
  listarConsultas,
  buscarConsultaPorId,
  cancelarConsulta,
  remarcarConsulta,
  concluirConsulta,
  excluirConsulta,
  obterRelatorios
};
