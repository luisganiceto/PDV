import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { ActiveTab } from './BottomNav';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Package,
  ShoppingCart,
  Users,
  ReceiptText,
  QrCode,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface DashboardProps {
  onChangeTab: (tab: ActiveTab) => void;
  onOpenScannerEntrada: () => void;
  onOpenNovaVenda: () => void;
  onOpenNovoProduto: () => void;
  onOpenNovoCliente: () => void;
  onQuickAddStock: (produtoId: number) => void;
  onPagarConta: (contaId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onChangeTab,
  onOpenScannerEntrada,
  onOpenNovaVenda,
  onOpenNovoProduto,
  onOpenNovoCliente,
  onQuickAddStock,
  onPagarConta,
}) => {
  const clientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const produtos = useLiveQuery(() => db.produtos.toArray()) || [];
  const vendas = useLiveQuery(() => db.vendas.orderBy('id').reverse().toArray()) || [];
  const contasPagar = useLiveQuery(() => db.contasPagar.toArray()) || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7); // "YYYY-MM"

  // 1. Total a Receber (Fiado)
  const totalReceberFiado = clientes.reduce(
    (acc, c) => acc + (c.saldoDevedor || 0),
    0
  );
  const clientesEmDebito = clientes.filter((c) => (c.saldoDevedor || 0) > 0);

  // 2. Total a Pagar (Fornecedores em Aberto)
  const contasEmAberto = contasPagar.filter((cp) => cp.status === 'Em Aberto');
  const totalPagar = contasEmAberto.reduce((acc, cp) => acc + (cp.valor || 0), 0);
  const contasVencidas = contasEmAberto.filter(
    (cp) => cp.dataVencimento < todayStr
  );
  const totalVencido = contasVencidas.reduce((acc, cp) => acc + (cp.valor || 0), 0);

  // 3. Valor Total em Estoque
  const valorEstoqueCusto = produtos.reduce(
    (acc, p) => acc + (p.quantidade || 0) * (p.precoCusto || 0),
    0
  );
  const valorEstoqueVenda = produtos.reduce(
    (acc, p) => acc + (p.quantidade || 0) * (p.precoVenda || 0),
    0
  );
  const produtosEstoqueBaixo = produtos.filter(
    (p) => (p.quantidade || 0) <= (p.estoqueMinimo || 0)
  );

  // 4. Vendas do Mês e Vendas de Hoje
  const vendasMes = vendas.filter(
    (v) => v.data && v.data.startsWith(currentMonthPrefix)
  );
  const totalVendasMes = vendasMes.reduce((acc, v) => acc + (v.valorTotal || 0), 0);

  const vendasHoje = vendas.filter(
    (v) => v.data && v.data.startsWith(todayStr)
  );
  const totalVendasHoje = vendasHoje.reduce((acc, v) => acc + (v.valorTotal || 0), 0);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 pb-12 animate-fade-in">
      {/* Welcome & Quick Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Painel Geral
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Visão financeira e operacional em tempo real (100% offline).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl font-mono">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* 4 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total a Receber (Fiado) */}
        <div
          id="card-dashboard-fiado"
          onClick={() => onChangeTab('clientes')}
          className="group relative bg-slate-900/90 hover:bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 p-4 rounded-2xl transition-all shadow-lg shadow-amber-950/20 cursor-pointer overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            {clientesEmDebito.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {clientesEmDebito.length} devendo
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Total a Receber (Fiado)
            </p>
            <h3 className="text-2xl font-black text-amber-400 mt-0.5 tracking-tight font-mono">
              {formatBRL(totalReceberFiado)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              Ver clientes e abater dívidas <ArrowUpRight className="w-3 h-3 text-amber-400/70" />
            </p>
          </div>
        </div>

        {/* Card 2: Total a Pagar (Fornecedores) */}
        <div
          id="card-dashboard-contas-pagar"
          onClick={() => onChangeTab('contas')}
          className={`group relative bg-slate-900/90 hover:bg-slate-900 border p-4 rounded-2xl transition-all shadow-lg cursor-pointer overflow-hidden ${
            contasVencidas.length > 0
              ? 'border-rose-500/50 shadow-rose-950/30 ring-1 ring-rose-500/20'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ReceiptText className="w-5 h-5" />
            </div>
            {contasVencidas.length > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                {contasVencidas.length} vencida(s)!
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {contasEmAberto.length} em aberto
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Total a Pagar (Fornecedores)
            </p>
            <h3 className="text-2xl font-black text-rose-400 mt-0.5 tracking-tight font-mono">
              {formatBRL(totalPagar)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              {contasVencidas.length > 0
                ? `${formatBRL(totalVencido)} vencidos`
                : 'Gerenciar contas a pagar'}{' '}
              <ArrowUpRight className="w-3 h-3 text-rose-400/70" />
            </p>
          </div>
        </div>

        {/* Card 3: Valor Total em Estoque */}
        <div
          id="card-dashboard-estoque"
          onClick={() => onChangeTab('estoque')}
          className="group relative bg-slate-900/90 hover:bg-slate-900 border border-cyan-500/30 hover:border-cyan-500/60 p-4 rounded-2xl transition-all shadow-lg shadow-cyan-950/20 cursor-pointer overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            {produtosEstoqueBaixo.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {produtosEstoqueBaixo.length} em falta
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Valor Total em Estoque (Custo)
            </p>
            <h3 className="text-2xl font-black text-cyan-400 mt-0.5 tracking-tight font-mono">
              {formatBRL(valorEstoqueCusto)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Venda projetada:</span>
              <span className="text-emerald-400 font-mono font-semibold">
                {formatBRL(valorEstoqueVenda)}
              </span>
            </p>
          </div>
        </div>

        {/* Card 4: Vendas do Mês */}
        <div
          id="card-dashboard-vendas-mes"
          onClick={() => onChangeTab('vendas')}
          className="group relative bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 p-4 rounded-2xl transition-all shadow-lg shadow-emerald-950/20 cursor-pointer overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {vendasMes.length} vendas
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Vendas do Mês Atual
            </p>
            <h3 className="text-2xl font-black text-emerald-400 mt-0.5 tracking-tight font-mono">
              {formatBRL(totalVendasMes)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Hoje:</span>
              <span className="text-emerald-300 font-mono font-semibold">
                {formatBRL(totalVendasHoje)} ({vendasHoje.length})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          Ações Rápidas do Dia a Dia
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Action 1: Dar Entrada via Câmera */}
          <button
            id="btn-quick-camera-entry"
            onClick={onOpenScannerEntrada}
            className="flex flex-col items-center justify-center p-3 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-emerald-300 font-semibold text-xs transition-all active:scale-95 cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center mb-1.5 shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5" />
            </div>
            <span>Entrada via Câmera</span>
            <span className="text-[10px] text-emerald-400/80 font-normal">
              Bipar e repor estoque
            </span>
          </button>

          {/* Action 2: Nova Venda / PDV */}
          <button
            id="btn-quick-nova-venda"
            onClick={onOpenNovaVenda}
            className="flex flex-col items-center justify-center p-3 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 hover:border-blue-500/60 rounded-xl text-blue-300 font-semibold text-xs transition-all active:scale-95 cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center mb-1.5 shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span>Nova Venda / PDV</span>
            <span className="text-[10px] text-blue-400/80 font-normal">
              À vista ou Fiado
            </span>
          </button>

          {/* Action 3: Cadastrar Produto */}
          <button
            id="btn-quick-novo-produto"
            onClick={onOpenNovoProduto}
            className="flex flex-col items-center justify-center p-3 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 hover:border-purple-500/60 rounded-xl text-purple-300 font-semibold text-xs transition-all active:scale-95 cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500 text-white flex items-center justify-center mb-1.5 shadow-md shadow-purple-500/30 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span>Novo Produto</span>
            <span className="text-[10px] text-purple-400/80 font-normal">
              Preço, código e foto
            </span>
          </button>

          {/* Action 4: Novo Cliente */}
          <button
            id="btn-quick-novo-cliente"
            onClick={onOpenNovoCliente}
            className="flex flex-col items-center justify-center p-3 bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-amber-300 font-semibold text-xs transition-all active:scale-95 cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center mb-1.5 shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span>Novo Cliente</span>
            <span className="text-[10px] text-amber-400/80 font-normal">
              Cadastro e limite fiado
            </span>
          </button>
        </div>
      </div>

      {/* Critical Stock Alert Section */}
      {produtosEstoqueBaixo.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Alerta: {produtosEstoqueBaixo.length} Produto(s) com Estoque
                  Crítico ou Zerado
                </h4>
                <p className="text-xs text-rose-300/80">
                  Itens abaixo da quantidade mínima estipulada.
                </p>
              </div>
            </div>
            <button
              onClick={() => onChangeTab('estoque')}
              className="text-xs text-rose-300 hover:text-white font-semibold flex items-center gap-1"
            >
              Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {produtosEstoqueBaixo.slice(0, 3).map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">
                      Restam: {prod.quantidade} un
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Mín: {prod.estoqueMinimo})
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white truncate mt-1">
                    {prod.nome}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Custo: {formatBRL(prod.precoCusto)} | Venda: {formatBRL(prod.precoVenda)}
                  </p>
                </div>
                <button
                  onClick={() => prod.id && onQuickAddStock(prod.id)}
                  className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  + Repor
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Payables Alert Section */}
      {contasVencidas.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-5 h-5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Atenção: {contasVencidas.length} Conta(s) a Pagar Vencida(s)
                </h4>
                <p className="text-xs text-amber-300/80">
                  Total de {formatBRL(totalVencido)} com vencimento expirado.
                </p>
              </div>
            </div>
            <button
              onClick={() => onChangeTab('contas')}
              className="text-xs text-amber-300 hover:text-white font-semibold flex items-center gap-1"
            >
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {contasVencidas.slice(0, 2).map((conta) => (
              <div
                key={conta.id}
                className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {conta.fornecedorNome || 'Fornecedor'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                      Venceu em {conta.dataVencimento.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{conta.descricao}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-rose-400 font-mono">
                    {formatBRL(conta.valor)}
                  </span>
                  <button
                    onClick={() => conta.id && onPagarConta(conta.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Dar Baixa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales Activity */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-400" /> Vendas Recentes
          </h3>
          <button
            onClick={() => onChangeTab('vendas')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Ver histórico completo <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {vendas.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            Nenhuma venda registrada ainda. Clique em "Nova Venda" para começar!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {vendas.slice(0, 4).map((venda) => (
              <div
                key={venda.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 truncate">
                      {venda.clienteNome || 'Venda Balcão / Avulsa'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        venda.statusPagamento === 'Pago'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400 font-bold'
                      }`}
                    >
                      {venda.statusPagamento === 'Pago' ? `Pago (${venda.formaPagamento})` : 'Fiado'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] truncate mt-0.5">
                    {venda.itens?.map((i) => `${i.quantidade}x ${i.nome}`).join(', ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-white font-mono text-sm">
                    {formatBRL(venda.valorTotal)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(venda.data).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
