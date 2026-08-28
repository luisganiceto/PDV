export interface Cliente {
  id?: number;
  nome: string;
  telefone: string;
  saldoDevedor: number; // para controle de fiado
  endereco?: string;
  observacoes?: string;
  criadoEm: string;
}

export interface Fornecedor {
  id?: number;
  nome: string;
  marca: string; // ex: Natura, Eudora, O Boticário, Canecas/Brindes
  telefone: string;
  pixOuContato?: string;
  criadoEm: string;
}

export interface Produto {
  id?: number;
  codigoBarras: string;
  nome: string;
  categoria: string; // ex: Presentes Personalizados, Kits, Perfumaria, Cosméticos, Maquiagem
  precoCusto: number;
  precoVenda: number;
  quantidade: number;
  estoqueMinimo: number;
  fornecedorId?: number;
  descricao?: string;
  criadoEm: string;
}

export interface ItemVenda {
  produtoId: number;
  codigoBarras?: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
}

export type StatusPagamentoVenda = 'Pago' | 'Pendente/Fiado';
export type FormaPagamento = 'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito' | 'Fiado';

export interface Venda {
  id?: number;
  clienteId?: number | null;
  clienteNome?: string;
  data: string; // ISO string
  itens: ItemVenda[];
  valorTotal: number;
  statusPagamento: StatusPagamentoVenda;
  formaPagamento: FormaPagamento;
  observacoes?: string;
}

export type StatusContaPagar = 'Pago' | 'Em Aberto';

export interface ContaPagar {
  id?: number;
  fornecedorId?: number;
  fornecedorNome?: string;
  descricao: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  status: StatusContaPagar;
  dataPagamento?: string;
  numeroNota?: string;
  criadoEm: string;
}

export interface MovimentacaoEstoque {
  id?: number;
  produtoId: number;
  produtoNome: string;
  tipo: 'Entrada' | 'Saida' | 'Venda' | 'Ajuste';
  quantidade: number;
  motivo: string;
  data: string;
}

export interface PagamentoFiado {
  id?: number;
  clienteId: number;
  clienteNome: string;
  valor: number;
  data: string;
  formaPagamento: 'Dinheiro' | 'Pix' | 'Cartão';
  observacao?: string;
}
