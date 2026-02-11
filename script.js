const STORAGE_COBRANCAS = 'cobrancas_2026';
const STORAGE_INVEST = 'investimentos_2026';

let cobrancas = JSON.parse(localStorage.getItem(STORAGE_COBRANCAS)) || [];
let investimentos = JSON.parse(localStorage.getItem(STORAGE_INVEST)) || 
  Array(12).fill().map(() => ({ valor: "0.00", descricao: "" }));

let abaAtiva = 'atrasados';
let modoAtivo = 'faturamento';
let mesAtivo = new Date().getMonth();
const nomesMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const formatarMoeda = v => Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getVencimentoDate(str) {
  const d = new Date(str + 'T00:00:00');
  return isNaN(d) ? null : d;
}

function gerarMenuMeses() {
  const menu = document.getElementById('menu-meses');
  menu.innerHTML = `
    <div class="pasta-meses" id="pasta-meses-container">
      <div class="pasta-header" onclick="document.getElementById('pasta-meses-container').classList.toggle('aberto')">
        <span>📅 Selecionar Mês</span>
        <span>▼</span>
      </div>
      <div class="sub-lista-meses">
        ${nomesMeses.map((nome, i) => `
          <button class="${i === mesAtivo && modoAtivo === 'faturamento' ? 'active' : ''}" 
                  onclick="mesAtivo = ${i}; mudarModo('faturamento');">
            ${nome}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById('titulo-pagina').textContent = nomesMeses[mesAtivo];
}

function mudarModo(modo) {
  modoAtivo = modo;
  const viewC = document.getElementById('view-cobrancas');
  const viewI = document.getElementById('view-investimentos');
  const painel = document.getElementById('painel-resumo');

  if (modo === 'investimentos') {
    viewC.style.display = 'none'; viewI.style.display = 'block'; painel.style.display = 'none';
    renderizarInvestimentos();
  } else {
    viewC.style.display = 'block'; viewI.style.display = 'none'; painel.style.display = 'grid';
    atualizarTudoCobrancas();
  }
  gerarMenuMeses();
}

function mudarAba(aba) {
  abaAtiva = aba;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-aba="${aba}"]`)?.classList.add('active');
  renderizarCobrancas();
}

function adicionarCobranca() {
  const nome = document.getElementById('nome').value.trim();
  const tel = document.getElementById('telefone').value.replace(/\D/g,'');
  const val = Number(document.getElementById('valor').value);
  const data = document.getElementById('data').value;
  const rep = parseInt(document.getElementById('repetir').value);

  if (!nome || !val || !data) return alert("Preencha tudo.");
  const baseDate = getVencimentoDate(data);

  for (let i = 0; i < rep; i++) {
    const dv = new Date(baseDate);
    dv.setDate(dv.getDate() + i * 7);
    cobrancas.push({
      id: Date.now() + i,
      nome: rep > 1 ? `${nome} (${i+1}/${rep})` : nome,
      telefone: tel,
      valor: val.toFixed(2),
      pagoParcial: "0.00",
      data: dv.toISOString().split('T')[0],
      pago: false
    });
  }
  atualizarTudoCobrancas();
}

// NOVO: Função para enviar cobrança para o próximo mês
function copiarParaProximoMes(id) {
  const original = cobrancas.find(c => c.id === id);
  if (!original) return;

  const dataOriginal = getVencimentoDate(original.data);
  const dataNova = new Date(dataOriginal);
  dataNova.setMonth(dataNova.getMonth() + 1);

  const novaCobranca = {
    ...original,
    id: Date.now(),
    data: dataNova.toISOString().split('T')[0],
    pago: false,
    pagoParcial: "0.00"
  };

  cobrancas.push(novaCobranca);
  alert(`Cobrança de ${original.nome} copiada para ${nomesMeses[dataNova.getMonth()]}`);
  atualizarTudoCobrancas();
}

function renderizarCobrancas() {
  const lista = document.getElementById('listaPrincipal');
  const busca = document.getElementById('buscaNome').value.toLowerCase().trim();
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  const filtrados = cobrancas.filter(c => {
    const matchNome = c.nome.toLowerCase().includes(busca);
    if (!matchNome) return false;
    if (busca !== "") return true;

    const dv = getVencimentoDate(c.data);
    if (!dv || dv.getMonth() !== mesAtivo) return false;

    if (abaAtiva === 'atrasados') return !c.pago && dv < hoje;
    if (abaAtiva === 'pendentes') return !c.pago && dv >= hoje;
    if (abaAtiva === 'pagos') return c.pago;
    if (abaAtiva === 'parcelados') return c.nome.includes('(');
    return false;
  });

  const grupos = {};
  filtrados.forEach(c => {
    const base = c.nome.split(' (')[0].trim();
    if (!grupos[base]) grupos[base] = [];
    grupos[base].push(c);
  });

  lista.innerHTML = '';
  Object.entries(grupos).forEach(([base, itens]) => {
    const li = document.createElement('li');
    if (itens.length > 1 || abaAtiva === 'parcelados' || busca !== "") {
      li.className = 'item-agrupado';
      const falta = itens.reduce((s, i) => s + (Number(i.valor) - Number(i.pagoParcial)), 0);
      li.innerHTML = `
        <div class="pasta-header" onclick="this.parentElement.classList.toggle('aberto')">
          <span>📁 ${base} (${itens.length})</span>
          <span style="color:${falta>0?'var(--danger)':'var(--success)'}">${falta>0?formatarMoeda(falta):'✓'}</span>
        </div>
        <div class="sub-lista">${itens.map(i => criarItemCobranca(i, hoje)).join('')}</div>`;
      if (busca !== "") li.classList.add('aberto');
    } else {
      li.innerHTML = criarItemCobranca(itens[0], hoje);
    }
    lista.appendChild(li);
  });
}

function criarItemCobranca(c, hoje) {
  const dv = getVencimentoDate(c.data);
  const total = Number(c.valor);
  const pago = Number(c.pagoParcial || 0);
  const falta = total - pago;
  const pct = (pago / total) * 100;
  const classe = c.pago ? 'pago-row' : (dv < hoje ? 'atrasado-row' : 'pendente-row');

  return `
    <div class="${classe}" style="padding:15px;">
      <div style="display:flex; justify-content:space-between;">
        <div>
          <strong>${c.nome}</strong><br>
          <small>${nomesMeses[dv.getMonth()]} - ${c.data.split('-').reverse().join('/')}</small>
        </div>
        <div class="acoes">
          <button class="btn-proximo" title="Copiar para Próximo Mês" onclick="copiarParaProximoMes(${c.id})">⏭️</button>
          <button class="btn-whatsapp" onclick="enviarWhatsApp('${c.telefone}','${c.nome}','${falta}')">📲</button>
          <button class="btn-editar" onclick="abrirModal(${c.id})">✏️</button>
          <button class="btn-pagar" onclick="toggleStatus(${c.id})">${c.pago?'↩️':'✅'}</button>
          <button class="btn-excluir" onclick="excluir(${c.id})">🗑️</button>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-top:10px;">
        <span>Total: ${formatarMoeda(total)}</span>
        <strong style="color:var(--danger)">Falta: ${formatarMoeda(falta)}</strong>
      </div>
      <div class="progress-container"><div class="progress-bar" style="width:${pct}%"></div></div>
    </div>`;
}

// Suporte e Init
function toggleStatus(id) {
  cobrancas = cobrancas.map(c => c.id === id ? {...c, pago: !c.pago, pagoParcial: !c.pago ? c.valor : "0.00"} : c);
  atualizarTudoCobrancas();
}
function excluir(id) { if (confirm("Excluir?")) { cobrancas = cobrancas.filter(c => c.id !== id); atualizarTudoCobrancas(); } }

function atualizarTudoCobrancas() {
  localStorage.setItem(STORAGE_COBRANCAS, JSON.stringify(cobrancas));
  let atr = 0, pen = 0, rec = 0;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  cobrancas.forEach(c => {
    const dv = getVencimentoDate(c.data);
    if (dv && dv.getMonth() === mesAtivo) {
      const v = Number(c.valor), p = Number(c.pagoParcial);
      rec += (c.pago ? v : p);
      if (!c.pago) { if (dv < hoje) atr += (v-p); else pen += (v-p); }
    }
  });
  document.getElementById('totalAtrasados').textContent = formatarMoeda(atr);
  document.getElementById('totalPendentes').textContent = formatarMoeda(pen);
  document.getElementById('totalRecebido').textContent = formatarMoeda(rec);
  renderizarCobrancas();
}

function enviarWhatsApp(tel, nome, saldo) {
  if (!tel) return alert("Sem telefone.");
  window.open(`https://wa.me/55${tel}?text=Olá ${nome}, pendente: ${formatarMoeda(saldo)}`, '_blank');
}

function abrirModal(id) {
  const c = cobrancas.find(x => x.id === id);
  if (!c) return;
  document.getElementById('edit-id').value = c.id;
  document.getElementById('edit-nome').value = c.nome;
  document.getElementById('edit-valor').value = c.valor;
  document.getElementById('edit-pago-parcial').value = c.pagoParcial;
  document.getElementById('edit-data').value = c.data;
  document.getElementById('modalEdicao').style.display = 'flex';
}
function fecharModal() { document.getElementById('modalEdicao').style.display = 'none'; }
function salvarEdicao() {
  const id = Number(document.getElementById('edit-id').value);
  cobrancas = cobrancas.map(c => {
    if (c.id !== id) return c;
    const v = document.getElementById('edit-valor').value;
    const p = document.getElementById('edit-pago-parcial').value;
    return { ...c, nome: document.getElementById('edit-nome').value, valor: v, pagoParcial: p, data: document.getElementById('edit-data').value, pago: Number(p) >= Number(v) };
  });
  fecharModal(); atualizarTudoCobrancas();
}

function renderizarInvestimentos() {
  const select = document.getElementById('mes-invest');
  if (select.children.length <= 1) nomesMeses.forEach((m, i) => select.innerHTML += `<option value="${i}">${m}</option>`);
  const valores = investimentos.map(i => Number(i.valor));
  document.getElementById('total-investido-valor').textContent = formatarMoeda(valores.reduce((a,b)=>a+b,0));
  const ctx = document.getElementById('graficoInvestimentos').getContext('2d');
  if (window.meuGrafico) window.meuGrafico.destroy();
  window.meuGrafico = new Chart(ctx, { type: 'doughnut', data: { labels: nomesMeses, datasets: [{ data: valores, backgroundColor: ['#1abc9c','#2ecc71','#3498db','#9b59b6','#34495e','#f1c40f','#e67e22','#e74c3c','#95a5a6','#d35400','#c0392b','#bdc3c7'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' } });
  const lista = document.getElementById('lista-investimentos');
  lista.innerHTML = '';
  investimentos.forEach((inv, idx) => { if (Number(inv.valor) > 0) lista.innerHTML += `<li style="display:flex; justify-content:space-between; background:#f8f9fa; padding:10px; margin-bottom:5px; border-radius:8px;"><span><strong>${nomesMeses[idx]}</strong><br><small>${inv.descricao}</small></span><span>${formatarMoeda(inv.valor)}</span></li>`; });
}

function adicionarInvestimento() {
  const m = document.getElementById('mes-invest').value;
  const v = document.getElementById('valor-invest').value;
  if (m==="") return alert("Mês!");
  investimentos[m] = { valor: Number(v).toFixed(2), descricao: document.getElementById('descricao-invest').value };
  localStorage.setItem(STORAGE_INVEST, JSON.stringify(investimentos));
  renderizarInvestimentos();
}

gerarMenuMeses();
atualizarTudoCobrancas();
document.getElementById('buscaNome').addEventListener('input', renderizarCobrancas);

// Função para Exportar os Dados (Download de arquivo .json)
function exportarDados() {
  const dados = {
    cobrancas: JSON.parse(localStorage.getItem(STORAGE_COBRANCAS)) || [],
    investimentos: JSON.parse(localStorage.getItem(STORAGE_INVEST)) || []
  };

  const dataBlob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_sistema_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}

// Função para Importar os Dados (Leitura de arquivo .json)
function importarDados(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = function(e) {
    try {
      const dados = JSON.parse(e.target.result);
      
      if (confirm("Isso irá substituir todos os dados atuais. Deseja continuar?")) {
        localStorage.setItem(STORAGE_COBRANCAS, JSON.stringify(dados.cobrancas));
        localStorage.setItem(STORAGE_INVEST, JSON.stringify(dados.investimentos));
        
        // Recarregar a página para aplicar os dados
        window.location.reload();
      }
    } catch (err) {
      alert("Erro ao ler o arquivo de backup. Verifique se o formato está correto.");
    }
  };
  leitor.readAsText(arquivo);
}