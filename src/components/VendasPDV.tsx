import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db, processarVenda, playBeep } from '../db/db';
import type { Cliente, Produto, ItemVenda, Venda, FormaPagamento, StatusPagamentoVenda } from '../types';
import {
  ShoppingCart,
  QrCode,
  Search,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  UserPlus,
  CheckCircle2,
  Share2,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  Send,
  Receipt,
  X,
  Sparkles,
  AlertCircle,
  Package,
} from 'lucide-react';

interface VendasPDVProps {
  onOpenScanner: () => void;
  onOpenNovoCliente: () => void;
  scannedBarcode?: string | null;
  onClearScannedBarcode?: () => void;
}

export const VendasPDV: React.FC<VendasPDVProps> = ({
  onOpenScanner,
  onOpenNovoCliente,
  scannedBarcode,
  onClearScannedBarcode,
}) => {
  const [subTab, setSubTab] = useState<'pdv' | 'historico'>('pdv');
  const [cart, setCart] = useState<ItemVenda[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedVenda, setCompletedVenda] = useState<Venda | null>(null);

  // Checkout form state
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('Pix');
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamentoVenda>('Pago');
  const [dinheiroRecebido, setDinheiroRecebido] = useState<string>('');
  const [observacoesVenda, setObservacoesVenda] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Live queries from Dexie
  const clientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const produtos = useLiveQuery(() => db.produtos.toArray()) || [];
  const vendas = useLiveQuery(() => db.vendas.orderBy('id').reverse().toArray()) || [];

  // React to barcode scanned from parent
  React.useEffect(() => {
    if (scannedBarcode) {
      const match = produtos.find((p) => p.codigoBarras === scannedBarcode);
      if (match) {
        addToCart(match);
        playBeep('success');
      } else {
        playBeep('warning');
        alert(`Produto com código de barras "${scannedBarcode}" não encontrado no cadastro.`);
      }
      if (onClearScannedBarcode) onClearScannedBarcode();
    }
  }, [scannedBarcode, produtos]);

  // Categories list
  const categories = ['Todos', ...Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean)))];

  // Filtered products
  const filteredProducts = produtos.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.codigoBarras.includes(searchProduct) ||
      p.categoria.toLowerCase().includes(searchProduct.toLowerCase());
    const matchCat = selectedCategory === 'Todos' || p.categoria === selectedCategory;
    return matchSearch && matchCat;
  });

  const selectedCliente = clientes.find((c) => c.id === selectedClienteId);

  // Cart operations
  const addToCart = (produto: Produto) => {
    if ((produto.quantidade || 0) <= 0) {
      alert(`Atenção: O produto "${produto.nome}" está com estoque zerado! Você pode adicioná-lo, mas revise o estoque.`);
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.produtoId === produto.id);
      if (existing) {
        return prev.map((i) =>
          i.produtoId === produto.id
            ? {
                ...i,
                quantidade: i.quantidade + 1,
                subtotal: (i.quantidade + 1) * i.precoUnitario,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          produtoId: produto.id!,
          codigoBarras: produto.codigoBarras,
          nome: produto.nome,
          precoUnitario: produto.precoVenda,
          quantidade: 1,
          subtotal: produto.precoVenda,
        },
      ];
    });
  };

  const updateQuantity = (produtoId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.produtoId === produtoId) {
            const newQtd = item.quantidade + delta;
            if (newQtd <= 0) return null;
            return {
              ...item,
              quantidade: newQtd,
              subtotal: newQtd * item.precoUnitario,
            };
          }
          return item;
        })
        .filter(Boolean) as ItemVenda[];
    });
  };

  const removeFromCart = (produtoId: number) => {
    setCart((prev) => prev.filter((i) => i.produtoId !== produtoId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClienteId(null);
  };

  const totalCart = cart.reduce((acc, i) => acc + i.subtotal, 0);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Handle Checkout submission
  const handleFinalizarVenda = async () => {
    if (cart.length === 0) return;

    if (statusPagamento === 'Pendente/Fiado' && !selectedClienteId) {
      alert('Para registrar uma venda a FIADO, é obrigatório selecionar um cliente!');
      return;
    }

    try {
      setIsProcessing(true);

      const novaVenda: Omit<Venda, 'id'> = {
        clienteId: selectedClienteId || null,
        clienteNome: selectedCliente?.nome || 'Venda Balcão / Avulsa',
        data: new Date().toISOString(),
        itens: [...cart],
        valorTotal: totalCart,
        statusPagamento,
        formaPagamento: statusPagamento === 'Pendente/Fiado' ? 'Fiado' : formaPagamento,
        observacoes: observacoesVenda.trim() || undefined,
      };

      const vendaId = await processarVenda(novaVenda);
      const vendaCompleta: Venda = { ...novaVenda, id: vendaId };

      setCompletedVenda(vendaCompleta);
      setShowCheckoutModal(false);
      setShowSuccessModal(true);
      setCart([]);
      setObservacoesVenda('');
      setDinheiroRecebido('');

      // Launch victory confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      playBeep('success');
    } catch (err: unknown) {
      console.error('Erro ao finalizar venda:', err);
      alert('Erro ao processar a venda no banco de dados local.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate WhatsApp formatted receipt message
  const gerarTextoWhatsApp = (venda: Venda) => {
    const dataFormatada = new Date(venda.data).toLocaleString('pt-BR');
    let texto = `🛍️ *COMPROVANTE DE COMPRA*\n`;
    texto += `📅 *Data:* ${dataFormatada}\n`;
    texto += `👤 *Cliente:* ${venda.clienteNome}\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `*ITENS:*\n`;

    venda.itens.forEach((item) => {
      texto += `• ${item.quantidade}x ${item.nome} - ${formatBRL(item.subtotal)}\n`;
    });

    texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `💰 *VALOR TOTAL:* ${formatBRL(venda.valorTotal)}\n`;
    texto += `💳 *PAGAMENTO:* ${venda.statusPagamento === 'Pendente/Fiado' ? '⚠️ FIADO / A PRAZO' : `✅ PAGO (${venda.formaPagamento})`}\n`;

    if (venda.statusPagamento === 'Pendente/Fiado' && selectedCliente) {
      const saldoAtualizado = (selectedCliente.saldoDevedor || 0) + (completedVenda ? 0 : venda.valorTotal);
      texto += `📌 *Saldo Devedor Total Atual:* ${formatBRL(saldoAtualizado)}\n`;
    }

    texto += `\nMuito obrigado pela preferência! 😊✨`;
    return encodeURIComponent(texto);
  };

  const handleEnviarWhatsApp = (venda: Venda) => {
    const telefone = selectedCliente?.telefone?.replace(/\D/g, '') || '';
    const texto = gerarTextoWhatsApp(venda);
    const url = telefone ? `https://wa.me/55${telefone}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4 pb-24 animate-fade-in">
      {/* Sub Tabs: PDV vs Histórico */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            id="tab-pdv-novo"
            onClick={() => setSubTab('pdv')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'pdv'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Frente de Caixa (PDV)
          </button>
          <button
            id="tab-pdv-historico"
            onClick={() => setSubTab('historico')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'historico'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Histórico ({vendas.length})
          </button>
        </div>

        {subTab === 'pdv' && (
          <button
            id="btn-pdv-abrir-camera"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Bipar Produto</span>
          </button>
        )}
      </div>

      {subTab === 'pdv' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left / Top: Catalog & Product Search (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search & Category filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-busca-pdv-produto"
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="Buscar produto por nome, código ou categoria..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                {searchProduct && (
                  <button
                    onClick={() => setSearchProduct('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Categories horizontally scrollable */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                  Nenhum produto encontrado com os filtros aplicados.
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const inCartItem = cart.find((i) => i.produtoId === prod.id);
                  const isLow = (prod.quantidade || 0) <= (prod.estoqueMinimo || 0);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => addToCart(prod)}
                      className={`relative bg-slate-900/90 hover:bg-slate-800/90 border rounded-xl p-3 flex flex-col justify-between transition-all active:scale-98 cursor-pointer group select-none ${
                        inCartItem
                          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {inCartItem && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                          {inCartItem.quantidade}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 mb-1">
                          <span className="truncate max-w-[80px] font-mono">
                            {prod.categoria}
                          </span>
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded ${
                              isLow
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            Estoque: {prod.quantidade}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-tight group-hover:text-emerald-300 transition-colors">
                          {prod.nome}
                        </h4>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <span className="text-sm font-black text-emerald-400 font-mono">
                          {formatBRL(prod.precoVenda)}
                        </span>
                        <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Cart & Customer Selection (5 cols on lg) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl min-h-[500px]">
            <div className="space-y-4">
              {/* Header: Select Customer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Cliente da Venda:
                  </label>
                  <button
                    onClick={onOpenNovoCliente}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Novo
                  </button>
                </div>

                <select
                  id="select-pdv-cliente"
                  value={selectedClienteId || ''}
                  onChange={(e) =>
                    setSelectedClienteId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Venda Avulsa / Balcão</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}{' '}
                      {(c.saldoDevedor || 0) > 0
                        ? `(⚠️ Deve: ${formatBRL(c.saldoDevedor)})`
                        : ''}
                    </option>
                  ))}
                </select>

                {selectedCliente && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">
                        {selectedCliente.nome}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {selectedCliente.telefone || 'Sem telefone'}
                      </p>
                    </div>
                    {(selectedCliente.saldoDevedor || 0) > 0 ? (
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Fiado Atual: {formatBRL(selectedCliente.saldoDevedor)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Em dia (Sem fiado)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Cart List */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
                  <span>Itens no Carrinho ({cart.length})</span>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Limpar
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-800/80 max-h-[260px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
                      <p>Carrinho vazio</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Clique nos produtos ou use o leitor de código de barras
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.produtoId}
                        className="py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {item.nome}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {formatBRL(item.precoUnitario)} un
                          </p>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          <button
                            onClick={() => updateQuantity(item.produtoId, -1)}
                            className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-white min-w-[20px] text-center font-mono">
                            {item.quantidade}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.produtoId, 1)}
                            className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right min-w-[65px]">
                          <p className="text-xs font-bold text-emerald-400 font-mono">
                            {formatBRL(item.subtotal)}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.produtoId)}
                            className="text-[10px] text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Total and Checkout CTA */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs">Subtotal:</span>
                <span className="text-sm font-bold font-mono">
                  {formatBRL(totalCart)}
                </span>
              </div>
              <div className="flex items-center justify-between text-white">
                <span className="text-sm font-bold">Total a Pagar:</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {formatBRL(totalCart)}
                </span>
              </div>

              <button
                id="btn-pdv-finalizar"
                disabled={cart.length === 0}
                onClick={() => setShowCheckoutModal(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Avançar para Pagamento</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History of Sales SubTab */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" /> Histórico de Vendas Realizadas
            </h3>
            <span className="text-xs text-slate-400">
              Total: {vendas.length} registro(s)
            </span>
          </div>

          {vendas.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Nenhuma venda registrada ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 space-y-2">
              {vendas.map((v) => (
                <div
                  key={v.id}
                  className="pt-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        Venda #{v.id}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-300">
                        {v.clienteNome || 'Venda Balcão'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          v.statusPagamento === 'Pago'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {v.statusPagamento === 'Pago' ? `Pago (${v.formaPagamento})` : 'Fiado / Pendente'}
                      </span>
                    </div>

                    <p className="text-slate-400 text-[11px]">
                      {new Date(v.data).toLocaleString('pt-BR')} • {v.itens.length} produto(s)
                    </p>

                    <div className="bg-slate-950 p-2 rounded-lg text-[11px] text-slate-300 space-y-0.5 mt-1">
                      {v.itens.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {it.quantidade}x {it.nome}
                          </span>
                          <span className="font-mono text-slate-400">
                            {formatBRL(it.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {formatBRL(v.valorTotal)}
                    </span>
                    <button
                      onClick={() => handleEnviarWhatsApp(v)}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Comprovante</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Finalizar Venda
              </h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Summary box */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">Cliente:</p>
                  <p className="text-sm font-bold text-white">
                    {selectedCliente?.nome || 'Venda Avulsa / Balcão'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total:</p>
                  <p className="text-xl font-black text-emerald-400 font-mono">
                    {formatBRL(totalCart)}
                  </p>
                </div>
              </div>

              {/* Status de Pagamento: Pago vs Fiado */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Condição de Pagamento:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusPagamento('Pago')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      statusPagamento === 'Pago'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Pago no Ato</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedClienteId) {
                        alert('Atenção: Para vender FIADO, selecione um cliente primeiro!');
                        return;
                      }
                      setStatusPagamento('Pendente/Fiado');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      statusPagamento === 'Pendente/Fiado'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-amber-400" />
                    <span>Venda a FIADO</span>
                  </button>
                </div>
              </div>

              {/* Se for Pago, escolher Forma de Pagamento */}
              {statusPagamento === 'Pago' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Forma de Pagamento:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Pix', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'] as FormaPagamento[]).map(
                      (forma) => (
                        <button
                          key={forma}
                          type="button"
                          onClick={() => setFormaPagamento(forma)}
                          className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            formaPagamento === forma
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {forma}
                        </button>
                      )
                    )}
                  </div>

                  {formaPagamento === 'Dinheiro' && (
                    <div className="mt-3 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <label className="text-xs text-slate-400">
                        Valor Entregue pelo Cliente (para calcular troco):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={dinheiroRecebido}
                        onChange={(e) => setDinheiroRecebido(e.target.value)}
                        placeholder="R$ 0,00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      />
                      {Number(dinheiroRecebido) > totalCart && (
                        <p className="text-xs font-bold text-emerald-400 flex justify-between">
                          <span>Troco a devolver:</span>
                          <span className="font-mono text-sm">
                            {formatBRL(Number(dinheiroRecebido) - totalCart)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Se for Fiado, aviso explicativo de soma no saldo devedor */}
              {statusPagamento === 'Pendente/Fiado' && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    Controle de Fiado Automático
                  </p>
                  <p>
                    O valor de <strong className="text-white">{formatBRL(totalCart)}</strong> será somado automaticamente ao saldo devedor do cliente{' '}
                    <strong className="text-white">{selectedCliente?.nome}</strong>.
                  </p>
                  <p className="text-[11px] text-amber-300/80">
                    Novo saldo devedor projetado:{' '}
                    <strong className="font-mono text-white">
                      {formatBRL((selectedCliente?.saldoDevedor || 0) + totalCart)}
                    </strong>
                  </p>
                </div>
              )}

              {/* Observações */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Observações da Venda (opcional):
                </label>
                <input
                  type="text"
                  value={observacoesVenda}
                  onChange={(e) => setObservacoesVenda(e.target.value)}
                  placeholder="Ex: Entrega agendada, embrulho para presente..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                id="btn-confirmar-venda-checkout"
                type="button"
                disabled={isProcessing}
                onClick={handleFinalizarVenda}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isProcessing ? 'Gravando...' : 'Confirmar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with WhatsApp sharing */}
      {showSuccessModal && completedVenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                Venda Registrada com Sucesso!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Estoque atualizado e registro salvo no banco Dexie.js.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Valor Total:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatBRL(completedVenda.valorTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Condição:</span>
                <span className="font-bold text-white">
                  {completedVenda.statusPagamento === 'Pendente/Fiado'
                    ? '⚠️ Fiado'
                    : `✅ Pago (${completedVenda.formaPagamento})`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-semibold text-slate-200">
                  {completedVenda.clienteNome}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                id="btn-whatsapp-comprovante"
                onClick={() => handleEnviarWhatsApp(completedVenda)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar Comprovante via WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCompletedVenda(null);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
