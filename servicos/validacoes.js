/**
 * @file servicos/validacoes.js
 * @description Módulo de validação rigorosa de entradas de dados da aplicação.
 * Pertence à camada de serviços. Valida tipo, formato, faixa e regras temporais
 * no servidor antes que qualquer dado seja processado ou persistido.
*/

const { ErroValidacao } = require('./erros');

/**
 * Valida se um valor de texto é uma string válida e atende aos limites de tamanho.

 * @param {*} valor Dado a ser testado
 * @param {string} nomeCampo Nome do campo para exibição em caso de erro
 * @param {number} [min=1] Comprimento mínimo
 * @param {number} [max=255] Comprimento máximo
 * @returns {string} Texto tratado (sem espaços nas pontas)
 * @throws {ErroValidacao} 400 se o valor for inválido ou estiver fora da faixa
*/

function validarTexto(valor, nomeCampo, min = 1, max = 255) {
  if (typeof valor !== 'string') {
    throw new ErroValidacao(`O campo '${nomeCampo}' deve ser uma cadeia de texto.`);
  }
  const textoLimpo = valor.trim();
  if (textoLimpo.length < min) {
    throw new ErroValidacao(`O campo '${nomeCampo}' deve conter no mínimo ${min} caractere(s).`);
  }
  if (textoLimpo.length > max) {
    throw new ErroValidacao(`O campo '${nomeCampo}' não pode exceder ${max} caracteres.`);
  }
  return textoLimpo;
}

/**
 * Valida o formato de um endereço de e-mail.

 * @param {*} email E-mail a ser verificado
 * @returns {string} E-mail em minúsculas e sem espaços
 * @throws {ErroValidacao} 400 se o formato for inválido
*/

function validarEmail(email) {
  const emailLimpo = validarTexto(email, 'email', 5, 120).toLowerCase();

  // Expressão regular para validação sintática de e-mail
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(emailLimpo)) {
    throw new ErroValidacao('O e-mail informado possui formato inválido.');
  }
  return emailLimpo;
}

/**
 * Valida os requisitos mínimos de uma senha.

 * @param {*} senha Senha informada
 * @returns {string} Senha validada
 * @throws {ErroValidacao} 400 se a senha for muito curta
*/

function validarSenha(senha) {
  if (typeof senha !== 'string' || senha.length < 6) {
    throw new ErroValidacao('A senha deve ser uma string com no mínimo 6 caracteres.');
  }
  return senha;
}

/**
 * Valida se um identificador é um número inteiro positivo.

 * @param {*} id Identificador a validar
 * @param {string} [nomeCampo='id'] Nome do campo para o erro
 * @returns {number} Inteiro validado
 * @throws {ErroValidacao} 400 se não for um número inteiro válido
*/

function validarId(id, nomeCampo = 'id') {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new ErroValidacao(`O identificador '${nomeCampo}' deve ser um número inteiro positivo.`);
  }
  return numero;
}

/**
 * Valida data e horário para agendamento de consultas.

 * REGRAS DE NEGÓCIO VERIFICADAS NO SERVIDOR:
 * 1. Formato de data/hora válido;
 * 2. Horário deve ser futuro com antecedência mínima de 2 horas;
 * 3. Atendimento apenas de segunda a sexta-feira (dias úteis);
 * 4. Atendimento apenas dentro do horário comercial (das 08:00 às 18:00);
 * 5. Consultas em intervalos fechados de 30 minutos (ex.: 08:00, 08:30, 09:00).

 * @param {string} dataHoraStr String representando a data e hora
 * @returns {string} Data e hora normalizada no padrão SQL: YYYY-MM-DD HH:MM:00
 * @throws {ErroValidacao} 400 se desrespeitar qualquer uma das regras temporais
*/

function validarDataHoraConsulta(dataHoraStr) {
  if (!dataHoraStr || typeof dataHoraStr !== 'string') {
    throw new ErroValidacao('A data e horário da consulta são obrigatórios.');
  }

  // Normaliza separador 'T' para espaço caso venha do input datetime-local do HTML
  const normalizada = dataHoraStr.trim().replace('T', ' ');
  const data = new Date(normalizada.replace(' ', 'T'));

  if (Number.isNaN(data.getTime())) {
    throw new ErroValidacao('Data e horário com formato inválido. Utilize o formato YYYY-MM-DD HH:mm.');
  }

  const agora = new Date();
  const diferencaHoras = (data.getTime() - agora.getTime()) / (1000 * 60 * 60);

  // Regra de negócio: Antecedência mínima de 2 horas
  if (diferencaHoras < 2) {
    throw new ErroValidacao('A consulta deve ser agendada com antecedência mínima de 2 horas a partir de agora.');
  }

  // Regra de negócio: Apenas dias úteis (Segunda = 1 a Sexta = 5)
  const diaSemana = data.getDay();
  if (diaSemana === 0 || diaSemana === 6) {
    throw new ErroValidacao('Agendamentos permitidos apenas em dias úteis (Segunda a sexta-feira).');
  }

  // Regra de negócio: Horário comercial (08:00 às 18:00)
  const hora = data.getHours();
  const minutos = data.getMinutes();

  if (hora < 8 || hora >= 18) {
    throw new ErroValidacao('O horário de atendimento da clínica é das 08:00 às 18:00.');
  }

  // Regra de negócio: Consultas devem ser agendadas em blocos de 30 minutos (:00 ou :30)
  if (minutos !== 0 && minutos !== 30) {
    throw new ErroValidacao('Os horários das consultas devem ser em intervalos de 30 minutos (ex: 08:00 ou 08:30).');
  }

  // Formata para o padrão armazenado no SQLite: YYYY-MM-DD HH:MM:00
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const horaFormatada = String(hora).padStart(2, '0');
  const minFormatado = String(minutos).padStart(2, '0');

  return `${ano}-${mes}-${dia} ${horaFormatada}:${minFormatado}:00`;
}

module.exports = {
  validarTexto,
  validarEmail,
  validarSenha,
  validarId,
  validarDataHoraConsulta
};
