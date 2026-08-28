import Dexie, { type Table } from 'dexie';
import type {
  Cliente,
  Fornecedor,
  Produto,
  Venda,
  ContaPagar,
  MovimentacaoEstoque,
  PagamentoFiado,
} from '../types';

export class GestaoComercialDB extends Dexie {
  clientes!: Table<Cliente, number>;
  fornecedores!: Table<Fornecedor, number>;
  produtos!: Table<Produto, number>;
  vendas!: Table<Venda, number>;
  contasPagar!: Table<ContaPagar, number>;
  movimentacoes!: Table<MovimentacaoEstoque, number>;
  pagamentosFiado!: Table<PagamentoFiado, number>;

  constructor() {
    super('GestaoComercialDB');

    // Dexie schema definition strictly based on prompt requirements
    this.version(1).stores({
      clientes: '++id, nome, telefone, saldoDevedor',
      fornecedores: '++id, nome, marca, telefone',
      produtos: '++id, &codigoBarras, nome, categoria, precoCusto, precoVenda, quantidade, estoqueMinimo',
      vendas: '++id, clienteId, data, statusPagamento, valorTotal',
      contasPagar: '++id, fornecedorId, valor, dataVencimento, status',
      movimentacoes: '++id, produtoId, tipo, data',
      pagamentosFiado: '++id, clienteId, data',
    });
  }
}

export const db = new GestaoComercialDB();

// Audio beep for barcode scan feedback (pleasant high-frequency chirp)
export function playBeep(type: 'success' | 'warning' | 'error' = 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

// Seed initial realistic data if DB is empty
export async function seedInitialData(force = false) {
  const countProdutos = await db.produtos.count();
  if (countProdutos > 0 && !force) {
    return;
  }

  if (force) {
    await db.transaction('rw', [db.clientes, db.fornecedores, db.produtos, db.vendas, db.contasPagar, db.movimentacoes, db.pagamentosFiado], async () => {
      await db.clientes.clear();
      await db.fornecedores.clear();
      await db.produtos.clear();
      await db.vendas.clear();
      await db.contasPagar.clear();
      await db.movimentacoes.clear();
      await db.pagamentosFiado.clear();
    });
  }

  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  // 1. Fornecedores
  const fornecedoresData: Omit<Fornecedor, 'id'>[] = [
    { nome: 'Natura Cosméticos S/A', marca: 'Natura', telefone: '(11) 98765-4321', pixOuContato: 'financeiro@natura.exemplo.com', criadoEm: now },
    { nome: 'Grupo Boticário Distribuidora', marca: 'O Boticário', telefone: '(41) 99123-4567', pixOuContato: 'pix.boticario@exemplo.com', criadoEm: now },
    { nome: 'Eudora Cosméticos & Perfumaria', marca: 'Eudora', telefone: '(11) 97111-2233', pixOuContato: 'eudora.pedidos@exemplo.com', criadoEm: now },
    { nome: 'Gráfica Criativa & Brindes', marca: 'Canecas & Brindes', telefone: '(11) 98888-7766', pixOuContato: 'graficabrindes@exemplo.com', criadoEm: now },
  ];

  const fIds = await db.fornecedores.bulkAdd(fornecedoresData as Fornecedor[], { allKeys: true });

  // 2. Clientes (alguns com fiado/saldoDevedor)
  const clientesData: Omit<Cliente, 'id'>[] = [
    { nome: 'Mariana Silva Souza', telefone: '(11) 98123-4567', saldoDevedor: 145.90, endereco: 'Rua das Flores, 120 - Centro', observacoes: 'Paga todo dia 10', criadoEm: now },
    { nome: 'Carlos Eduardo Santos', telefone: '(11) 99456-7890', saldoDevedor: 89.00, endereco: 'Av. Paulista, 1500', observacoes: 'Preferência por kits de presente', criadoEm: now },
    { nome: 'Fernanda de Oliveira', telefone: '(11) 97321-6549', saldoDevedor: 0.00, endereco: 'Rua do Comércio, 45', observacoes: 'Cliente fiel, compra sempre à vista no Pix', criadoEm: now },
    { nome: 'Juliana Mendes Rocha', telefone: '(11) 98999-1234', saldoDevedor: 230.50, endereco: 'Rua Bela Vista, 88', observacoes: 'Comprou kit de aniversário fiado', criadoEm: now },
    { nome: 'Rafael Costa Lima', telefone: '(11) 97654-3210', saldoDevedor: 0.00, endereco: 'Av. Brasil, 302', observacoes: 'Cliente novo', criadoEm: now },
  ];

  const cIds = await db.clientes.bulkAdd(clientesData as Cliente[], { allKeys: true });

  // 3. Produtos (com códigos de barras reais/EAN13, categorias e alguns abaixo do estoque mínimo)
  const produtosData: Omit<Produto, 'id'>[] = [
    {
      codigoBarras: '7891033451234',
      nome: 'Perfume Kaiak Masculino 100ml',
      categoria: 'Perfumaria',
      precoCusto: 68.00,
      precoVenda: 139.90,
      quantidade: 8,
      estoqueMinimo: 5,
      fornecedorId: fIds[0] as number,
      descricao: 'Fragrância aquática aromática refrescante clássica Natura.',
      criadoEm: now,
    },
    {
      codigoBarras: '7891033455678',
      nome: 'Hidratante Corporal Tododia Cereja e Avelã 400ml',
      categoria: 'Cosméticos',
      precoCusto: 24.50,
      precoVenda: 59.90,
      quantidade: 2, // ALERTA: abaixo do estoque mínimo
      estoqueMinimo: 6,
      fornecedorId: fIds[0] as number,
      descricao: 'Nutrição prebiótica profunda para a pele.',
      criadoEm: now,
    },
    {
      codigoBarras: '7899876543210',
      nome: 'Kit Presente Malbec Tradicional + Desodorante',
      categoria: 'Kits & Presentes',
      precoCusto: 110.00,
      precoVenda: 219.90,
      quantidade: 3, // ALERTA: abaixo do estoque mínimo
      estoqueMinimo: 4,
      fornecedorId: fIds[1] as number,
      descricao: 'Kit especial com caixa de presente personalizada.',
      criadoEm: now,
    },
    {
      codigoBarras: '7899876549999',
      nome: 'Perfume Lily Eau de Parfum 75ml',
      categoria: 'Perfumaria',
      precoCusto: 135.00,
      precoVenda: 269.90,
      quantidade: 5,
      estoqueMinimo: 3,
      fornecedorId: fIds[1] as number,
      descricao: 'Floral bouquet sofisticado extraído com enfleurage.',
      criadoEm: now,
    },
    {
      codigoBarras: '7896541238888',
      nome: 'Batom Mate Fix Glam Eudora Vermelho',
      categoria: 'Maquiagem',
      precoCusto: 18.00,
      precoVenda: 42.90,
      quantidade: 1, // ALERTA: estoque crítico
      estoqueMinimo: 5,
      fornecedorId: fIds[2] as number,
      descricao: 'Alta pigmentação e fixação por até 18 horas.',
      criadoEm: now,
    },
    {
      codigoBarras: '7898523691111',
      nome: 'Caneca Personalizada Porcelana "Melhor Mãe do Mundo"',
      categoria: 'Presentes Personalizados',
      precoCusto: 14.00,
      precoVenda: 39.90,
      quantidade: 12,
      estoqueMinimo: 4,
      fornecedorId: fIds[3] as number,
      descricao: 'Porcelana resinada AAA 325ml com caixa de presente kraft.',
      criadoEm: now,
    },
    {
      codigoBarras: '7898523692222',
      nome: 'Copo Térmico Inox Personalizado a Laser 500ml',
      categoria: 'Presentes Personalizados',
      precoCusto: 32.00,
      precoVenda: 75.00,
      quantidade: 7,
      estoqueMinimo: 5,
      fornecedorId: fIds[3] as number,
      descricao: 'Mantém gelado por 4h, gravação personalizada inclusa.',
      criadoEm: now,
    },
  ];

  const pIds = await db.produtos.bulkAdd(produtosData as Produto[], { allKeys: true });

  // 4. Vendas anteriores
  const dataOntem = new Date(Date.now() - 86400000).toISOString();
  const vendasData: Omit<Venda, 'id'>[] = [
    {
      clienteId: cIds[0] as number,
      clienteNome: 'Mariana Silva Souza',
      data: now,
      itens: [
        {
          produtoId: pIds[0] as number,
          nome: 'Perfume Kaiak Masculino 100ml',
          precoUnitario: 139.90,
          quantidade: 1,
          subtotal: 139.90,
        },
      ],
      valorTotal: 139.90,
      statusPagamento: 'Pendente/Fiado',
      formaPagamento: 'Fiado',
      observacoes: 'Fiado para pagar no dia 10',
    },
    {
      clienteId: cIds[2] as number,
      clienteNome: 'Fernanda de Oliveira',
      data: dataOntem,
      itens: [
        {
          produtoId: pIds[5] as number,
          nome: 'Caneca Personalizada Porcelana "Melhor Mãe do Mundo"',
          precoUnitario: 39.90,
          quantidade: 2,
          subtotal: 79.80,
        },
      ],
      valorTotal: 79.80,
      statusPagamento: 'Pago',
      formaPagamento: 'Pix',
      observacoes: 'Pago no Pix no ato da entrega',
    },
    {
      clienteId: cIds[1] as number,
      clienteNome: 'Carlos Eduardo Santos',
      data: dataOntem,
      itens: [
        {
          produtoId: pIds[4] as number,
          nome: 'Batom Mate Fix Glam Eudora Vermelho',
          precoUnitario: 42.90,
          quantidade: 1,
          subtotal: 42.90,
        },
      ],
      valorTotal: 42.90,
      statusPagamento: 'Pago',
      formaPagamento: 'Cartão de Crédito',
    },
  ];

  await db.vendas.bulkAdd(vendasData as Venda[]);

  // 5. Contas a Pagar (com contas vencidas, vencendo e futuras)
  const ontemVencimento = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  const proximaSemana = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];
  const mesQueVem = new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0];

  const contasPagarData: Omit<ContaPagar, 'id'>[] = [
    {
      fornecedorId: fIds[0] as number,
      fornecedorNome: 'Natura Cosméticos S/A',
      descricao: 'Pedido Ciclo 14 - Perfumes e Hidratantes',
      valor: 450.00,
      dataVencimento: ontemVencimento, // VENCIDA!
      status: 'Em Aberto',
      numeroNota: 'NF-8921',
      criadoEm: now,
    },
    {
      fornecedorId: fIds[1] as number,
      fornecedorNome: 'Grupo Boticário Distribuidora',
      descricao: 'Reposição Linha Malbec e Lily',
      valor: 680.00,
      dataVencimento: today, // VENCE HOJE!
      status: 'Em Aberto',
      numeroNota: 'NF-1044',
      criadoEm: now,
    },
    {
      fornecedorId: fIds[3] as number,
      fornecedorNome: 'Gráfica Criativa & Brindes',
      descricao: 'Lote de 50 Canecas e Copos Inox para Sublimação',
      valor: 320.00,
      dataVencimento: proximaSemana,
      status: 'Em Aberto',
      numeroNota: 'BOL-5542',
      criadoEm: now,
    },
    {
      fornecedorId: fIds[2] as number,
      fornecedorNome: 'Eudora Cosméticos & Perfumaria',
      descricao: 'Kit Maquiagens & Batons Glam',
      valor: 210.00,
      dataVencimento: mesQueVem,
      status: 'Pago',
      dataPagamento: today,
      numeroNota: 'NF-7731',
      criadoEm: now,
    },
  ];

  await db.contasPagar.bulkAdd(contasPagarData as ContaPagar[]);
}

// Transaction: Realizar Venda e abater do estoque + somar no fiado se aplicável
export async function processarVenda(vendaData: Omit<Venda, 'id'>) {
  return await db.transaction('rw', [db.vendas, db.produtos, db.clientes, db.movimentacoes], async () => {
    // 1. Salvar venda
    const vendaId = await db.vendas.add(vendaData as Venda);

    // 2. Dar baixa no estoque de cada produto
    for (const item of vendaData.itens) {
      const prod = await db.produtos.get(item.produtoId);
      if (prod) {
        const novaQtd = Math.max(0, prod.quantidade - item.quantidade);
        await db.produtos.update(item.produtoId, { quantidade: novaQtd });
        await db.movimentacoes.add({
          produtoId: item.produtoId,
          produtoNome: prod.nome,
          tipo: 'Venda',
          quantidade: item.quantidade,
          motivo: `Venda #${vendaId}`,
          data: vendaData.data,
        });
      }
    }

    // 3. Se for fiado e tiver cliente associado, somar ao saldoDevedor
    if (vendaData.statusPagamento === 'Pendente/Fiado' && vendaData.clienteId) {
      const cliente = await db.clientes.get(vendaData.clienteId);
      if (cliente) {
        const novoSaldo = (cliente.saldoDevedor || 0) + vendaData.valorTotal;
        await db.clientes.update(vendaData.clienteId, { saldoDevedor: novoSaldo });
      }
    }

    return vendaId;
  });
}

// Transaction: Dar Entrada de Estoque
export async function darEntradaEstoque(
  produtoId: number,
  quantidadeAdicionar: number,
  motivo = 'Entrada via leitor de código de barras'
) {
  return await db.transaction('rw', [db.produtos, db.movimentacoes], async () => {
    const prod = await db.produtos.get(produtoId);
    if (!prod) throw new Error('Produto não encontrado');

    const novaQtd = prod.quantidade + quantidadeAdicionar;
    await db.produtos.update(produtoId, { quantidade: novaQtd });
    await db.movimentacoes.add({
      produtoId,
      produtoNome: prod.nome,
      tipo: 'Entrada',
      quantidade: quantidadeAdicionar,
      motivo,
      data: new Date().toISOString(),
    });

    return novaQtd;
  });
}

// Transaction: Abater / Quitar Fiado do Cliente
export async function registrarPagamentoFiado(
  clienteId: number,
  valorPago: number,
  formaPagamento: 'Dinheiro' | 'Pix' | 'Cartão',
  observacao?: string
) {
  return await db.transaction('rw', [db.clientes, db.pagamentosFiado], async () => {
    const cliente = await db.clientes.get(clienteId);
    if (!cliente) throw new Error('Cliente não encontrado');

    const novoSaldo = Math.max(0, (cliente.saldoDevedor || 0) - valorPago);
    await db.clientes.update(clienteId, { saldoDevedor: novoSaldo });

    await db.pagamentosFiado.add({
      clienteId,
      clienteNome: cliente.nome,
      valor: valorPago,
      formaPagamento,
      data: new Date().toISOString(),
      observacao,
    });

    return novoSaldo;
  });
}

// Export Database to JSON string for backup
export async function exportarBackupJSON(): Promise<string> {
  const dados = {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    clientes: await db.clientes.toArray(),
    fornecedores: await db.fornecedores.toArray(),
    produtos: await db.produtos.toArray(),
    vendas: await db.vendas.toArray(),
    contasPagar: await db.contasPagar.toArray(),
    movimentacoes: await db.movimentacoes.toArray(),
    pagamentosFiado: await db.pagamentosFiado.toArray(),
  };
  return JSON.stringify(dados, null, 2);
}

// Import Database from JSON backup
export async function importarBackupJSON(jsonStr: string): Promise<boolean> {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.produtos || !parsed.clientes) {
    throw new Error('Arquivo de backup inválido.');
  }

  await db.transaction('rw', [db.clientes, db.fornecedores, db.produtos, db.vendas, db.contasPagar, db.movimentacoes, db.pagamentosFiado], async () => {
    await db.clientes.clear();
    await db.fornecedores.clear();
    await db.produtos.clear();
    await db.vendas.clear();
    await db.contasPagar.clear();
    await db.movimentacoes.clear();
    await db.pagamentosFiado.clear();

    if (parsed.clientes?.length) await db.clientes.bulkAdd(parsed.clientes);
    if (parsed.fornecedores?.length) await db.fornecedores.bulkAdd(parsed.fornecedores);
    if (parsed.produtos?.length) await db.produtos.bulkAdd(parsed.produtos);
    if (parsed.vendas?.length) await db.vendas.bulkAdd(parsed.vendas);
    if (parsed.contasPagar?.length) await db.contasPagar.bulkAdd(parsed.contasPagar);
    if (parsed.movimentacoes?.length) await db.movimentacoes.bulkAdd(parsed.movimentacoes);
    if (parsed.pagamentosFiado?.length) await db.pagamentosFiado.bulkAdd(parsed.pagamentosFiado);
  });

  return true;
}
