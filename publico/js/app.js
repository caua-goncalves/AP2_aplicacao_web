/**
 * @file publico/js/app.js
 * @description Script principal do front-end da Clínica Médica.
 * Pertence à camada de Apresentação do Cliente (Front-end Vanilla).
 * Gerencia o estado da sessão (JWT), consome a API REST com fetch,
 * implementa rigorosamente os 4 estados de tela (carregando, vazio, erro, sucesso)
 * e aplica defesas ativas contra textContent e duplo clique.
*/

// 1. Constantes de Armazenamento e Estado Global
const STORAGE_TOKEN = 'clinica_jwt_token';
const STORAGE_USUARIO = 'clinica_usuario_info';

let usuarioAtual = null;

// 2. Inicialização do Ciclo de Vida da Aplicação
document.addEventListener('DOMContentLoaded', () => {
  configurarEventosAbas();
  configurarFormularios();
  recuperarSessao();
});

/**
 * Configura alternância entre abas de Login e Cadastro na tela pública.
*/

function configurarEventosAbas() {
  const abaLogin = document.getElementById('aba-login');
  const abaCadastro = document.getElementById('aba-cadastro');
  const formLogin = document.getElementById('form-login');
  const formCadastro = document.getElementById('form-cadastro');

  abaLogin.addEventListener('click', () => {
    abaLogin.classList.add('ativa');
    abaCadastro.classList.remove('ativa');
    formLogin.classList.remove('oculto');
    formCadastro.classList.add('oculto');
    limparAlertas();
  });

  abaCadastro.addEventListener('click', () => {
    abaCadastro.classList.add('ativa');
    abaLogin.classList.remove('ativa');
    formCadastro.classList.remove('oculto');
    formLogin.classList.add('oculto');
    limparAlertas();
  });

  // Botão de Logout
  const btnLogout = document.getElementById('btn-logout');
  btnLogout.addEventListener('click', encerrarSessao);
}

/**
 * Configura submissão dos formulários e filtros de listagem.
*/

function configurarFormularios() {
  document.getElementById('form-login').addEventListener('submit', lidarComLogin);
  document.getElementById('form-cadastro').addEventListener('submit', lidarComCadastro);
  document.getElementById('form-agendar').addEventListener('submit', lidarComAgendamento);

  // Filtros dinâmicos
  document.getElementById('filtro-status-paciente').addEventListener('change', (e) => {
    carregarConsultasPaciente(e.target.value);
  });

  document.getElementById('filtro-status-medico').addEventListener('change', (e) => {
    carregarAgendaMedico(e.target.value);
  });

  // Atualiza valor/especialidade dinamicamente ao escolher o médico
  document.getElementById('agendar-medico').addEventListener('change', (e) => {
    const info = document.getElementById('info-medico-selecionado');
    const opt = e.target.selectedOptions[0];
    if (opt && opt.dataset.preco) {
      info.textContent = `Especialidade: ${opt.dataset.especialidade} | Valor da consulta: ${opt.dataset.preco}`;
    } else {
      info.textContent = '';
    }
  });
}

// 3. Comunicação HTTP com a API (Fetch com Tratamento Centralizado)

/**
 * Executa requisições autenticadas para a API REST incluindo o cabeçalho Authorization.

 * @param {string} url Caminho do endpoint 
 * @param {RequestInit} [opcoes={}] Opções adicionais do fetch
 * @returns {Promise<any>} Dados JSON retornados pela API
 * @throws {Error} Mensagem de erro retornada pelo servidor
*/

async function apiFetch(url, opcoes = {}) {
  const token = localStorage.getItem(STORAGE_TOKEN);
  const headers = {
    'Content-Type': 'application/json',
    ...(opcoes.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resposta = await fetch(url, { ...opcoes, headers });

  // Tratamento de sessão expirada ou inválida (HTTP 401)
  if (resposta.status === 401 && !url.includes('/api/auth/login')) {
    encerrarSessao();
    throw new Error('Sessão expirada. Por favor, autentique-se novamente.');
  }

  // Resposta 204 No Content (DELETE)
  if (resposta.status === 204) {
    return null;
  }

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    // Extrai a mensagem de erro semântica traduzida pelo middleware 'tratarErros'
    throw new Error(dados.erro || `Falha na requisição (Status HTTP ${resposta.status}).`);
  }

  return dados;
}

// 4. Fluxo de Autenticação e Sessão

/**
 * Processa a submissão do formulário de Login.
 * Aplica proteção contra clique duplo desabilitando o botão durante a requisição.
*/

async function lidarComLogin(evento) {
  evento.preventDefault();
  const btn = document.getElementById('btn-login');
  const msgBox = document.getElementById('msg-login');

  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  // DECISÃO DE SEGURANÇA E UX: Proteção contra clique duplo
  bloquearBotao(btn, 'Entrando...');
  exibirAlerta(msgBox, null);

  try {
    const dados = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });

    salvarSessao(dados.token, dados.usuario);
  } catch (erro) {
    exibirAlerta(msgBox, erro.message, 'erro');
  } finally {
    desbloquearBotao(btn, 'Entrar');
  }
}

/**
 * Processa o cadastro de novo paciente.
*/

async function lidarComCadastro(evento) {
  evento.preventDefault();
  const btn = document.getElementById('btn-cadastro');
  const msgBox = document.getElementById('msg-cadastro');

  const nome = document.getElementById('cad-nome').value.trim();
  const email = document.getElementById('cad-email').value.trim();
  const senha = document.getElementById('cad-senha').value;

  bloquearBotao(btn, 'Cadastrando...');
  exibirAlerta(msgBox, null);

  try {
    const resultado = await apiFetch('/api/auth/cadastro', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha })
    });

    exibirAlerta(msgBox, `${resultado.mensagem} Faça login com seu e-mail e senha.`, 'sucesso');
    document.getElementById('form-cadastro').reset();

    // Alterna para aba de login automaticamente após 1.5s
    setTimeout(() => {
      document.getElementById('aba-login').click();
      document.getElementById('login-email').value = email;
    }, 1500);
  } catch (erro) {
    exibirAlerta(msgBox, erro.message, 'erro');
  } finally {
    desbloquearBotao(btn, 'Criar Minha Conta');
  }
}

function salvarSessao(token, usuario) {
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.setItem(STORAGE_USUARIO, JSON.stringify(usuario));
  usuarioAtual = usuario;
  renderizarInterfacePorPapel();
}

function recuperarSessao() {
  const token = localStorage.getItem(STORAGE_TOKEN);
  const usuarioArmazenado = localStorage.getItem(STORAGE_USUARIO);

  if (token && usuarioArmazenado) {
    try {
      usuarioAtual = JSON.parse(usuarioArmazenado);
      renderizarInterfacePorPapel();
      return;
    } catch {
      encerrarSessao();
    }
  }
  exibirSecaoAuth();
}

function encerrarSessao() {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USUARIO);
  usuarioAtual = null;
  exibirSecaoAuth();
}

/**
 * Ajusta a visibilidade dos módulos e painéis conforme o perfil logado.
*/

function renderizarInterfacePorPapel() {
  const secaoAuth = document.getElementById('secao-auth');
  const secaoPaciente = document.getElementById('secao-paciente');
  const secaoMedico = document.getElementById('secao-medico');
  const painelUsuario = document.getElementById('painel-usuario');
  const lblNome = document.getElementById('usuario-nome');
  const badgePapel = document.getElementById('usuario-badge');

  secaoAuth.classList.add('oculto');
  painelUsuario.classList.remove('oculto');

  // DECISÃO DE SEGURANÇA: textContent em dados vindos de sessão/API
  lblNome.textContent = usuarioAtual.nome;
  badgePapel.textContent = usuarioAtual.papel;
  badgePapel.className = `badge badge-${usuarioAtual.papel}`;

  if (usuarioAtual.papel === 'paciente') {
    secaoPaciente.classList.remove('oculto');
    secaoMedico.classList.add('oculto');
    popularSelectMedicos();
    carregarConsultasPaciente();
  } else if (usuarioAtual.papel === 'medico') {
    secaoMedico.classList.remove('oculto');
    secaoPaciente.classList.add('oculto');
    carregarAgendaMedico('agendada');
    carregarRelatoriosMedico();
  }
}

function exibirSecaoAuth() {
  document.getElementById('secao-auth').classList.remove('oculto');
  document.getElementById('secao-paciente').classList.add('oculto');
  document.getElementById('secao-medico').classList.add('oculto');
  document.getElementById('painel-usuario').classList.add('oculto');
  limparAlertas();
}

// 5. Funções do Painel do Paciente

/**
 * Popula a lista suspensa de médicos disponíveis no formulário de agendamento.
*/

async function popularSelectMedicos() {
  const select = document.getElementById('agendar-medico');
  select.innerHTML = '';

  const optPlaceholder = document.createElement('option');
  optPlaceholder.value = '';
  optPlaceholder.textContent = 'Carregando médicos...';
  select.appendChild(optPlaceholder);

  try {
    const medicos = await apiFetch('/api/medicos');
    select.innerHTML = '';

    const optDefault = document.createElement('option');
    optDefault.value = '';
    optDefault.textContent = '-- Selecione um médico --';
    select.appendChild(optDefault);

    medicos.forEach((medico) => {
      const opt = document.createElement('option');
      opt.value = medico.id;

      // DECISÃO DE SEGURANÇA: textContent evita injeção de HTML/scripts
      opt.textContent = `${medico.nome} — ${medico.especialidade} (${medico.precoFormatado})`;
      opt.dataset.preco = medico.precoFormatado;
      opt.dataset.especialidade = medico.especialidade;
      select.appendChild(opt);
    });
  } catch (erro) {
    select.innerHTML = '';
    const optErro = document.createElement('option');
    optErro.value = '';
    optErro.textContent = 'Erro ao carregar médicos disponíveis.';
    select.appendChild(optErro);
  }
}

/**
 * Processa o agendamento de uma nova consulta pelo paciente.
*/

async function lidarComAgendamento(evento) {
  evento.preventDefault();
  const btn = document.getElementById('btn-agendar');
  const msgBox = document.getElementById('msg-agendar');

  const medicoId = document.getElementById('agendar-medico').value;
  const dataHora = document.getElementById('agendar-data-hora').value;
  const observacoes = document.getElementById('agendar-obs').value.trim();

  bloquearBotao(btn, 'Agendando consulta...');
  exibirAlerta(msgBox, null);

  try {
    const resultado = await apiFetch('/api/consultas', {
      method: 'POST',
      body: JSON.stringify({ medicoId, dataHora, observacoes })
    });

    exibirAlerta(msgBox, resultado.mensagem, 'sucesso');
    document.getElementById('form-agendar').reset();
    document.getElementById('info-medico-selecionado').textContent = '';

    // Atualiza a listagem de consultas imediatamente
    carregarConsultasPaciente();
  } catch (erro) {
    // Exibe o erro de regra de negócio retornado pela API
    exibirAlerta(msgBox, erro.message, 'erro');
  } finally {
    desbloquearBotao(btn, 'Confirmar Agendamento');
  }
}

/**
 * Carrega a lista de consultas do paciente aplicando os 4 Estados de Tela

 * @param {string} [filtroStatus=''] Filtro opcional por status
*/
async function carregarConsultasPaciente(filtroStatus = '') {
  const container = document.getElementById('container-estado-paciente');

  // ESTADO 1: CARREGANDO
  renderizarEstadoCarregando(container, 'Buscando suas consultas...');

  try {
    const url = filtroStatus ? `/api/consultas?status=${filtroStatus}` : '/api/consultas';
    const consultas = await apiFetch(url);

    // ESTADO 2: VAZIO
    if (!consultas || consultas.length === 0) {
      renderizarEstadoVazio(container, 'Nenhuma consulta encontrada para o filtro selecionado.');
      return;
    }

    // ESTADO 4: SUCESSO
    renderizarTabelaPaciente(container, consultas);
  } catch (erro) {
    // ESTADO 3: ERRO
    renderizarEstadoErro(container, erro.message, () => carregarConsultasPaciente(filtroStatus));
  }
}

/**
 * Renderiza a tabela de consultas do paciente usando manipulação estrita do DOM.
 * DECISÃO DE SEGURANÇA: Uso exclusivo de textContent para prevenir XSS
*/

function renderizarTabelaPaciente(container, consultas) {
  container.innerHTML = '';

  const tabelaWrapper = document.createElement('div');
  tabelaWrapper.className = 'tabela-container';

  const tabela = document.createElement('table');
  tabela.className = 'tabela-dados';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  ['Médico', 'Especialidade', 'Data e Horário', 'Status', 'Ações'].forEach((titulo) => {
    const th = document.createElement('th');
    th.textContent = titulo;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  tabela.appendChild(thead);

  const tbody = document.createElement('tbody');

  consultas.forEach((c) => {
    const tr = document.createElement('tr');

    const tdMedico = document.createElement('td');
    tdMedico.textContent = c.medico.nome;

    const tdEsp = document.createElement('td');
    tdEsp.textContent = c.medico.especialidade;

    const tdData = document.createElement('td');
    tdData.textContent = formatarDataHora(c.dataHora);

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge badge-${c.status}`;
    badge.textContent = c.status;
    tdStatus.appendChild(badge);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'acoes';

    if (c.status === 'agendada') {
      const btnCancelar = document.createElement('button');
      btnCancelar.className = 'btn btn-perigo btn-sm';
      btnCancelar.textContent = 'Cancelar';
      btnCancelar.addEventListener('click', () => confirmarCancelamento(c.id));
      tdAcoes.appendChild(btnCancelar);
    } else if (c.status === 'cancelada') {
      const btnExcluir = document.createElement('button');
      btnExcluir.className = 'btn btn-secundario btn-sm';
      btnExcluir.textContent = 'Excluir Histórico';
      btnExcluir.addEventListener('click', () => confirmarExclusao(c.id));
      tdAcoes.appendChild(btnExcluir);
    } else {
      const spanConcluido = document.createElement('span');
      spanConcluido.className = 'texto-ajuda';
      spanConcluido.textContent = 'Realizada';
      tdAcoes.appendChild(spanConcluido);
    }

    tr.appendChild(tdMedico);
    tr.appendChild(tdEsp);
    tr.appendChild(tdData);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);
  tabelaWrapper.appendChild(tabela);
  container.appendChild(tabelaWrapper);
}

async function confirmarCancelamento(consultaId) {
  if (!confirm('Deseja realmente cancelar este agendamento?')) return;

  try {
    await apiFetch(`/api/consultas/${consultaId}/cancelar`, { method: 'PATCH' });
    carregarConsultasPaciente(document.getElementById('filtro-status-paciente').value);
  } catch (erro) {
    alert(`Erro ao cancelar: ${erro.message}`);
  }
}

async function confirmarExclusao(consultaId) {
  if (!confirm('Deseja excluir permanentemente esta consulta do histórico?')) return;

  try {
    await apiFetch(`/api/consultas/${consultaId}`, { method: 'DELETE' });
    carregarConsultasPaciente(document.getElementById('filtro-status-paciente').value);
  } catch (erro) {
    alert(`Erro ao excluir: ${erro.message}`);
  }
}

// 6. Funções do Painel do Médico

/**
 * Carrega a agenda do médico logado aplicando os 4 estados de tela.
*/

async function carregarAgendaMedico(filtroStatus = '') {
  const container = document.getElementById('container-estado-medico');

  // ESTADO 1: CARREGANDO
  renderizarEstadoCarregando(container, 'Carregando sua agenda de atendimentos...');

  try {
    const url = filtroStatus ? `/api/consultas?status=${filtroStatus}` : '/api/consultas';
    const consultas = await apiFetch(url);

    // ESTADO 2: VAZIO
    if (!consultas || consultas.length === 0) {
      renderizarEstadoVazio(container, 'Nenhuma consulta encontrada na sua agenda com este filtro.');
      return;
    }

    // ESTADO 4: SUCESSO
    renderizarTabelaMedico(container, consultas);
  } catch (erro) {
    // ESTADO 3: ERRO
    renderizarEstadoErro(container, erro.message, () => carregarAgendaMedico(filtroStatus));
  }
}

function renderizarTabelaMedico(container, consultas) {
  container.innerHTML = '';

  const tabelaWrapper = document.createElement('div');
  tabelaWrapper.className = 'tabela-container';

  const tabela = document.createElement('table');
  tabela.className = 'tabela-dados';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  ['Paciente', 'E-mail', 'Data e Horário', 'Observações', 'Status', 'Ações'].forEach((titulo) => {
    const th = document.createElement('th');
    th.textContent = titulo;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  tabela.appendChild(thead);

  const tbody = document.createElement('tbody');

  consultas.forEach((c) => {
    const tr = document.createElement('tr');

    const tdPaciente = document.createElement('td');
    tdPaciente.textContent = c.paciente.nome;

    const tdEmail = document.createElement('td');
    tdEmail.textContent = c.paciente.email;

    const tdData = document.createElement('td');
    tdData.textContent = formatarDataHora(c.dataHora);

    const tdObs = document.createElement('td');
    tdObs.textContent = c.observacoes || 'Sem observações';

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge badge-${c.status}`;
    badge.textContent = c.status;
    tdStatus.appendChild(badge);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'acoes';

    if (c.status === 'agendada') {
      const btnConcluir = document.createElement('button');
      btnConcluir.className = 'btn btn-sucesso btn-sm';
      btnConcluir.textContent = 'Concluir';
      btnConcluir.addEventListener('click', () => confirmarConclusao(c.id));
      tdAcoes.appendChild(btnConcluir);

      const btnCancelar = document.createElement('button');
      btnCancelar.className = 'btn btn-perigo btn-sm';
      btnCancelar.textContent = 'Cancelar';
      btnCancelar.addEventListener('click', () => confirmarCancelamentoMedico(c.id));
      tdAcoes.appendChild(btnCancelar);
    } else {
      const spanStatus = document.createElement('span');
      spanStatus.className = 'texto-ajuda';
      spanStatus.textContent = c.status === 'concluida' ? 'Atendido' : 'Cancelado';
      tdAcoes.appendChild(spanStatus);
    }

    tr.appendChild(tdPaciente);
    tr.appendChild(tdEmail);
    tr.appendChild(tdData);
    tr.appendChild(tdObs);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);
  tabelaWrapper.appendChild(tabela);
  container.appendChild(tabelaWrapper);
}

async function confirmarConclusao(consultaId) {
  if (!confirm('Confirmar a realização deste atendimento médico?')) return;

  try {
    await apiFetch(`/api/consultas/${consultaId}/concluir`, { method: 'PATCH' });
    carregarAgendaMedico(document.getElementById('filtro-status-medico').value);
    carregarRelatoriosMedico();
  } catch (erro) {
    alert(`Erro ao concluir atendimento: ${erro.message}`);
  }
}

async function confirmarCancelamentoMedico(consultaId) {
  if (!confirm('Deseja cancelar esta consulta da sua agenda?')) return;

  try {
    await apiFetch(`/api/consultas/${consultaId}/cancelar`, { method: 'PATCH' });
    carregarAgendaMedico(document.getElementById('filtro-status-medico').value);
    carregarRelatoriosMedico();
  } catch (erro) {
    alert(`Erro ao cancelar: ${erro.message}`);
  }
}

/**
 * Carrega relatórios e indicadores agregados (COUNT, SUM, GROUP BY) para o médico.
*/

async function carregarRelatoriosMedico() {
  const container = document.getElementById('container-estado-relatorios');
  renderizarEstadoCarregando(container, 'Consolidando estatísticas da clínica...');

  try {
    const dados = await apiFetch('/api/consultas/relatorios');

    // Atualiza cards de métricas
    document.getElementById('metrica-total').textContent = dados.totaisGerais.totalCadastradas;
    document.getElementById('metrica-concluidas').textContent = dados.totaisGerais.totalConcluidas;
    document.getElementById('metrica-canceladas').textContent = dados.totaisGerais.totalCanceladas;
    document.getElementById('metrica-faturamento').textContent = dados.totaisGerais.faturamentoFormatado;

    // Renderiza tabela por especialidade
    container.innerHTML = '';
    const tabelaWrapper = document.createElement('div');
    tabelaWrapper.className = 'tabela-container';

    const tabela = document.createElement('table');
    tabela.className = 'tabela-dados';

    const thead = document.createElement('thead');
    const trH = document.createElement('tr');
    ['Especialidade', 'Total Agendado', 'Concluídas', 'Canceladas', 'Receita Confirmada'].forEach((t) => {
      const th = document.createElement('th');
      th.textContent = t;
      trH.appendChild(th);
    });
    thead.appendChild(trH);
    tabela.appendChild(thead);

    const tbody = document.createElement('tbody');
    dados.relatorioPorEspecialidade.forEach((r) => {
      const tr = document.createElement('tr');

      const tdEsp = document.createElement('td');
      tdEsp.textContent = r.especialidade;

      const tdTotal = document.createElement('td');
      tdTotal.textContent = r.total_consultas;

      const tdConcl = document.createElement('td');
      tdConcl.textContent = r.consultas_concluidas;

      const tdCanc = document.createElement('td');
      tdCanc.textContent = r.consultas_canceladas;

      const tdRec = document.createElement('td');
      tdRec.textContent = `R$ ${Number(r.receita_confirmada || 0).toFixed(2).replace('.', ',')}`;

      tr.appendChild(tdEsp);
      tr.appendChild(tdTotal);
      tr.appendChild(tdConcl);
      tr.appendChild(tdCanc);
      tr.appendChild(tdRec);
      tbody.appendChild(tr);
    });

    tabela.appendChild(tbody);
    tabelaWrapper.appendChild(tabela);
    container.appendChild(tabelaWrapper);
  } catch (erro) {
    renderizarEstadoErro(container, `Erro ao carregar relatórios: ${erro.message}`);
  }
}

// 7. Componentes Visuais dos 4 Estados de Tela 

// Renderiza o Estado 1: CARREGANDO

function renderizarEstadoCarregando(container, mensagem = 'Carregando dados...') {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'estado-carregando';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';

  const p = document.createElement('p');
  p.textContent = mensagem;

  div.appendChild(spinner);
  div.appendChild(p);
  container.appendChild(div);
}


// Renderiza o Estado 2: VAZIO

function renderizarEstadoVazio(container, mensagem = 'Nenhum registro encontrado.') {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'estado-vazio';

  const icone = document.createElement('div');
  icone.className = 'icone-vazio';
  icone.textContent = '📂';

  const p = document.createElement('p');
  p.textContent = mensagem;

  div.appendChild(icone);
  div.appendChild(p);
  container.appendChild(div);
}

// Renderiza o Estado 3: ERRO

function renderizarEstadoErro(container, mensagem, callbackTentarNovamente = null) {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'estado-erro';

  const h3 = document.createElement('h3');
  h3.textContent = '⚠️ Falha ao carregar informações';

  const p = document.createElement('p');
  p.textContent = mensagem;

  div.appendChild(h3);
  div.appendChild(p);

  if (callbackTentarNovamente) {
    const btnTentar = document.createElement('button');
    btnTentar.className = 'btn btn-secundario btn-sm espaco-topo';
    btnTentar.textContent = 'Tentar Novamente';
    btnTentar.addEventListener('click', callbackTentarNovamente);
    div.appendChild(btnTentar);
  }

  container.appendChild(div);
}


// 8. Funções Utilitárias e de Proteção

// Proteção contra clique duplo: desabilita o botão e altera seu rótulo visual.
function bloquearBotao(btn, textoTemporario = 'Processando...') {
  btn.disabled = true;
  btn.dataset.textoOriginal = btn.textContent;
  btn.textContent = textoTemporario;
}

// Restaura o botão após conclusão da requisição HTTP.
function desbloquearBotao(btn, textoPadrao = null) {
  btn.disabled = false;
  btn.textContent = textoPadrao || btn.dataset.textoOriginal || 'Enviar';
}

function exibirAlerta(elementoBox, mensagem, tipo = 'erro') {
  if (!mensagem) {
    elementoBox.className = 'mensagem-alerta oculto';
    elementoBox.textContent = '';
    return;
  }
  elementoBox.className = `mensagem-alerta ${tipo}`;
  elementoBox.textContent = mensagem;
}

function limparAlertas() {
  document.querySelectorAll('.mensagem-alerta').forEach((el) => {
    el.className = 'mensagem-alerta oculto';
    el.textContent = '';
  });
}

function formatarDataHora(isoString) {
  if (!isoString) return '-';
  const limpa = isoString.replace(' ', 'T');
  const d = new Date(limpa);
  if (Number.isNaN(d.getTime())) return isoString;

  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}
