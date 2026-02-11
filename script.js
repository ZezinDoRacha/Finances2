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

        if (c.pago) {
            recebido += v;
        } else {
            if (dataVenc < hoje) atrasado += v;
            else pendente += v;
        }
    });

    document.getElementById('totalAtrasados').innerText = `R$ ${atrasado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalPendentes').innerText = `R$ ${pendente.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalRecebido').innerText = `R$ ${recebido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

function renderizar() {
    const lista = document.getElementById('listaPrincipal');
    const busca = document.getElementById('buscaNome').value.toLowerCase();
    lista.innerHTML = '';
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    const filtrados = cobrancas.filter(c => {
        const dv = new Date(c.data + 'T00:00:00');
        const atendeBusca = c.nome.toLowerCase().includes(busca);
        let atendeAba = false;

        if (abaAtiva === 'atrasados') atendeAba = !c.pago && dv < hoje;
        else if (abaAtiva === 'pendentes') atendeAba = !c.pago && dv >= hoje;
        else if (abaAtiva === 'pagos') atendeAba = c.pago;
        else if (abaAtiva === 'parcelados') atendeAba = c.nome.includes('(');

        return atendeBusca && atendeAba;
    });

    filtrados.sort((a,b) => new Date(a.data) - new Date(b.data)).forEach(c => {
        const dv = new Date(c.data + 'T00:00:00');
        const dataBR = c.data.split('-').reverse().join('/');
        const li = document.createElement('li');
        
        if (c.pago) li.classList.add('pagamento-confirmado');
        else if (dv < hoje) li.classList.add('atrasado');
        else li.classList.add('pendente-no-prazo');

        li.innerHTML = `
            <div><strong>${c.nome}</strong><br><small>R$ ${c.valor} | ${dataBR}</small></div>
            <div class="acoes">
                ${!c.pago ? `<button class="btn-whatsapp" onclick="enviar('${c.telefone}','${c.nome}','${c.valor}','${dataBR}')">📲</button>` : ''}
                <button class="btn-editar" onclick="prepararEdicao(${c.id})">✏️</button>
                <button class="btn-pagar" onclick="status(${c.id})">${c.pago ? '↩️' : '✅'}</button>
                <button class="btn-excluir" onclick="excluir(${c.id})">🗑️</button>
            </div>`;
        lista.appendChild(li);
    });
}

function prepararEdicao(id) {
    const c = cobrancas.find(item => item.id === id);
    if (!c) return;
    document.getElementById('nome').value = c.nome.split(' (')[0];
    document.getElementById('telefone').value = c.telefone;
    document.getElementById('valor').value = c.valor;
    document.getElementById('data').value = c.data;
    if(confirm("Dados carregados para o topo. Remover o registro antigo para atualizar ao salvar?")) {
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
    if(confirm("Excluir esta cobrança?")) { cobrancas = cobrancas.filter(c => c.id !== id); salvarEAtualizar(); } 
}

function enviar(tel, n, v, d) {
    const m = encodeURIComponent(`Olá ${n}, lembrete de pagamento: R$ ${v} para o dia ${d}.`);
    window.open(`https://wa.me/${tel ? '55'+tel : ''}?text=${m}`, '_blank');
}

function exportarExcel() {
    let csv = "\ufeffNome;Telefone;Valor;Data;Status\n";
    cobrancas.forEach(c => csv += `${c.nome};${c.telefone};${c.valor};${c.data};${c.pago?'Pago':'Pendente'}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio.csv";
    link.click();
}

atualizarTotais();
renderizar();