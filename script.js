let cobrancas = JSON.parse(localStorage.getItem('cobrancas')) || [];
let abaAtiva = 'atrasados';

function mudarAba(idAba) {
    abaAtiva = idAba;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${idAba}`).classList.add('active');
    renderizar();
}

function adicionarCobranca() {
    const nome = document.getElementById('nome');
    const tel = document.getElementById('telefone');
    const val = document.getElementById('valor');
    const dat = document.getElementById('data');
    const rep = parseInt(document.getElementById('repetir').value);

    if (!nome.value || !val.value || !dat.value) return alert("Preencha Nome, Valor e Data!");

    for (let i = 0; i < rep; i++) {
        let d = new Date(dat.value + 'T00:00:00');
        d.setDate(d.getDate() + (i * 7));

        cobrancas.push({
            id: Date.now() + i,
            nome: rep > 1 ? `${nome.value} (${i+1}/${rep})` : nome.value,
            telefone: tel.value.replace(/\D/g, ''),
            valor: parseFloat(val.value).toFixed(2),
            data: d.toISOString().split('T')[0],
            pago: false
        });
    }
    salvarEAtualizar();
    nome.value = ''; tel.value = ''; val.value = ''; dat.value = '';
}

function salvarEAtualizar() {
    localStorage.setItem('cobrancas', JSON.stringify(cobrancas));
    atualizarTotais();
    renderizar();
}

function atualizarTotais() {
    let atrasado = 0, pendente = 0, recebido = 0;
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    cobrancas.forEach(c => {
        const v = parseFloat(c.valor);
        const dataVenc = new Date(c.data + 'T00:00:00');
        if (c.pago) recebido += v;
        else dataVenc < hoje ? atrasado += v : pendente += v;
    });

    const format = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });
    document.getElementById('totalAtrasados').innerText = format(atrasado);
    document.getElementById('totalPendentes').innerText = format(pendente);
    document.getElementById('totalRecebido').innerText = format(recebido);
}

function renderizar() {
    const lista = document.getElementById('listaPrincipal');
    const busca = document.getElementById('buscaNome').value.toLowerCase();
    lista.innerHTML = '';
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    let filtrados = cobrancas.filter(c => {
        const dv = new Date(c.data + 'T00:00:00');
        const atendeBusca = c.nome.toLowerCase().includes(busca);
        let atendeAba = false;

        if (abaAtiva === 'atrasados') atendeAba = !c.pago && dv < hoje;
        else if (abaAtiva === 'pendentes') atendeAba = !c.pago && dv >= hoje;
        else if (abaAtiva === 'pagos') atendeAba = c.pago;
        else if (abaAtiva === 'parcelados') atendeAba = c.nome.includes('(');

        return atendeBusca && atendeAba;
    });

    const grupos = {};
    filtrados.forEach(c => {
        const nomeBase = c.nome.split(' (')[0];
        if (!grupos[nomeBase]) grupos[nomeBase] = [];
        grupos[nomeBase].push(c);
    });

    Object.keys(grupos).forEach(nomeCliente => {
        const itens = grupos[nomeCliente];
        const eParcelado = itens.some(i => i.nome.includes('('));

        if (eParcelado) {
            const li = document.createElement('li');
            li.className = 'item-agrupado';
            const totalVal = itens.reduce((acc, cur) => acc + parseFloat(cur.valor), 0);
            
            li.innerHTML = `
                <div class="pasta-header" onclick="this.parentElement.classList.toggle('aberto')">
                    <span>📁 ${nomeCliente} (${itens.length}x)</span>
                    <span>R$ ${totalVal.toFixed(2)} <span class="seta-pasta">▼</span></span>
                </div>
                <div class="sub-lista">
                    ${itens.map(i => {
                        const dvParcela = new Date(i.data + 'T00:00:00');
                        let corLinha = i.pago ? "pago-row" : (dvParcela < hoje ? "atrasado-row" : "pendente-row");
                        return `
                        <div class="parcela-linha ${corLinha}">
                            <span><strong>${i.nome.match(/\((.*?)\)/)[0]}</strong> - ${i.data.split('-').reverse().join('/')} <b>R$ ${i.valor}</b></span>
                            <div class="acoes">
                                <button class="btn-whatsapp" onclick="enviar('${i.telefone}','${i.nome}','${i.valor}','${i.data}')">📲</button>
                                <button class="btn-pagar" onclick="status(${i.id})">${i.pago ? '↩️' : '✅'}</button>
                                <button class="btn-excluir" onclick="excluir(${i.id})">🗑️</button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>`;
            lista.appendChild(li);
        } else {
            itens.forEach(c => {
                const dv = new Date(c.data + 'T00:00:00');
                const li = document.createElement('li');
                li.className = c.pago ? 'pagamento-confirmado' : (dv < hoje ? 'atrasado' : 'pendente-no-prazo');
                li.style.padding = "15px"; li.style.flexDirection = "row"; li.style.justifyContent = "space-between"; li.style.alignItems = "center";
                li.innerHTML = `
                    <div><strong>${c.nome}</strong><br><small>R$ ${c.valor} | ${c.data.split('-').reverse().join('/')}</small></div>
                    <div class="acoes">
                        ${!c.pago ? `<button class="btn-whatsapp" onclick="enviar('${c.telefone}','${c.nome}','${c.valor}','${c.data}')">📲</button>` : ''}
                        <button class="btn-editar" onclick="prepararEdicao(${c.id})">✏️</button>
                        <button class="btn-pagar" onclick="status(${c.id})">${c.pago ? '↩️' : '✅'}</button>
                        <button class="btn-excluir" onclick="excluir(${c.id})">🗑️</button>
                    </div>`;
                lista.appendChild(li);
            });
        }
    });
}

function prepararEdicao(id) {
    const c = cobrancas.find(item => item.id === id);
    if (!c) return;
    document.getElementById('nome').value = c.nome.split(' (')[0];
    document.getElementById('telefone').value = c.telefone;
    document.getElementById('valor').value = c.valor;
    document.getElementById('data').value = c.data;
    if(confirm("Deseja editar? O registro original será removido.")) {
        cobrancas = cobrancas.filter(item => item.id !== id);
        salvarEAtualizar();
        window.scrollTo(0,0);
    }
}

function status(id) { 
    cobrancas = cobrancas.map(c => c.id === id ? {...c, pago: !c.pago} : c); 
    salvarEAtualizar(); 
}

function excluir(id) { 
    if(confirm("Excluir esta cobrança?")) { 
        cobrancas = cobrancas.filter(c => c.id !== id); 
        salvarEAtualizar(); 
    } 
}

function enviar(tel, n, v, d) {
    const dataFormat = d.split('-').reverse().join('/');
    const m = encodeURIComponent(`Olá ${n}, lembrete de pagamento: R$ ${v} para o dia ${dataFormat}.`);
    window.open(`https://wa.me/${tel ? '55'+tel : ''}?text=${m}`, '_blank');
}

function exportarExcel() {
    let csv = "\ufeffNome;Telefone;Valor;Data;Status\n";
    cobrancas.forEach(c => csv += `${c.nome};${c.telefone};${c.valor};${c.data};${c.pago?'Pago':'Pendente'}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio.csv`;
    link.click();
}

atualizarTotais();
renderizar();
