/**

 * @file app.js (Front-end)
 * @description Script inicial do front-end para teste de conectividade com a API.
 
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('api-status');
  if (!statusElement) return;

  try {
    const resposta = await fetch('/api/status');
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    statusElement.textContent = `API Conectada: ${dados.servico}`;
    statusElement.style.color = '#16a34a';
  } catch (erro) {
    statusElement.textContent = 'Erro ao conectar com a API';
    statusElement.style.color = '#dc2626';
  }
});
