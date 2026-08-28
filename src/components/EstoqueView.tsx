import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, darEntradaEstoque, playBeep } from '../db/db';
import type { Produto, Fornecedor, MovimentacaoEstoque } from '../types';
import {
  Package,
  QrCode,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Tag,
  Barcode,
  History,
  X,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface EstoqueViewProps {
  onOpenScannerForEntry: () => void;
  quickAddStockProdutoId?: number | null;
  onClearQuickAddStock?: () => void;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  onOpenScannerForEntry,
  quickAddStockProdutoId,
  onClearQuickAddStock,
}) => {
  const [subTab, setSubTab] = useState<'produtos' | 'movimentacoes'>('produtos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);

  // Quick Add Stock Modal state
  const [quickAddModalProduct, setQuickAddModalProduct] = useState<Produto | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [motivoEntrada, setMotivoEntrada] = useState('Reposição de Estoque');
  const [gerarContaPagar, setGerarContaPagar] = useState(false);
  const [fornecedorContaId, setFornecedorContaId] = useState<number | ''>('');
  const [vencimentoConta, setVencimentoConta] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );

  // Product Form state
  const [formCodigoBarras, setFormCodigoBarras] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formCategoria, setFormCategoria] = useState('Perfumaria');
  const [formPrecoCusto, setFormPrecoCusto] = useState('');
  const [formPrecoVenda, setFormPrecoVenda] = useState('');
  const [formQuantidade, setFormQuantidade] = useState('');
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState('3');
  const [formFornecedorId, setFormFornecedorId] = useState<number | ''>('');
  const [formDescricao, setFormDescricao] = useState('');

  // Live queries
  const produtos = useLiveQuery(() => db.produtos.toArray()) || [];
  const fornecedores = useLiveQuery(() => db.fornecedores.toArray()) || [];
  const movimentacoes = useLiveQuery(() => db.movimentacoes.orderBy('id').reverse().toArray()) || [];

  // React to prop trigger for quick adding
  React.useEffect(() => {
    if (quickAddStockProdutoId) {
      const prod = produtos.find((p) => p.id === quickAddStockProdutoId);
      if (prod) {
        setQuickAddModalProduct(prod);
        setQuantityToAdd(Math.max(1, (prod.estoqueMinimo || 5) - (prod.quantidade || 0)));
      }
      if (onClearQuickAddStock) onClearQuickAddStock();
    }
  }, [quickAddStockProdutoId, produtos]);

  // Categories list
  const predefinedCategories = [
    'Perfumaria',
    'Kits & Presentes',
    'Presentes Personalizados',
    'Canecas & Brindes',
    'Cosméticos',
    'Maquiagem',
    'Acessórios',
    'Outros',
  ];

  const categories = ['Todos', ...Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean)))];

  // Filtering
  const filteredProducts = produtos.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigoBarras.includes(searchTerm) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Todos' || p.categoria === selectedCategory;
    const isBelowMin = (p.quantidade || 0) <= (p.estoqueMinimo || 0);
    const matchAlert = !filterAlertOnly || isBelowMin;
    return matchSearch && matchCat && matchAlert;
  });

  const countAlert = produtos.filter((p) => (p.quantidade || 0) <= (p.estoqueMinimo || 0)).length;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setFormCodigoBarras(String(Date.now()).slice(-8)); // auto-generated code
    setFormNome('');
    setFormCategoria('Perfumaria');
    setFormPrecoCusto('');
    setFormPrecoVenda('');
    setFormQuantidade('5');
    setFormEstoqueMinimo('3');
    setFormFornecedorId('');
    setFormDescricao('');
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: Produto) => {
    setEditingProduct(prod);
    setFormCodigoBarras(prod.codigoBarras);
    setFormNome(prod.nome);
    setFormCategoria(prod.categoria);
    setFormPrecoCusto(String(prod.precoCusto));
    setFormPrecoVenda(String(prod.precoVenda));
    setFormQuantidade(String(prod.quantidade));
    setFormEstoqueMinimo(String(prod.estoqueMinimo));
    setFormFornecedorId(prod.fornecedorId || '');
    setFormDescricao(prod.descricao || '');
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formCodigoBarras.trim()) {
      alert('Preencha o Nome e o Código de Barras do produto.');
      return;
    }

    try {
      const precoCusto = Number(formPrecoCusto) || 0;
      const precoVenda = Number(formPrecoVenda) || 0;
      const quantidade = Number(formQuantidade) || 0;
      const estoqueMinimo = Number(formEstoqueMinimo) || 0;

      if (editingProduct && editingProduct.id) {
        await db.produtos.update(editingProduct.id, {
          codigoBarras: formCodigoBarras.trim(),
          nome: formNome.trim(),
          categoria: formCategoria,
          precoCusto,
          precoVenda,
          quantidade,
          estoqueMinimo,
          fornecedorId: formFornecedorId ? Number(formFornecedorId) : undefined,
          descricao: formDescricao.trim() || undefined,
        });
      } else {
        // Check uniqueness of barcode
        const existing = await db.produtos.where('codigoBarras').equals(formCodigoBarras.trim()).first();
        if (existing) {
          alert('Já existe um produto cadastrado com este mesmo código de barras.');
          return;
        }

        const newId = await db.produtos.add({
          codigoBarras: formCodigoBarras.trim(),
          nome: formNome.trim(),
          categoria: formCategoria,
          precoCusto,
          precoVenda,
          quantidade,
          estoqueMinimo,
          fornecedorId: formFornecedorId ? Number(formFornecedorId) : undefined,
          descricao: formDescricao.trim() || undefined,
          criadoEm: new Date().toISOString(),
        });

        // Register initial stock movement
        if (quantidade > 0) {
          await db.movimentacoes.add({
            produtoId: newId,
            produtoNome: formNome.trim(),
            tipo: 'Entrada',
            quantidade,
            motivo: 'Estoque inicial de cadastro',
            data: new Date().toISOString(),
          });
        }
      }

      playBeep('success');
      setShowProductModal(false);
    } catch (err: unknown) {
      console.error('Erro ao salvar produto:', err);
      alert('Erro ao salvar produto no banco de dados local.');
    }
  };

  const handleDeleteProduct = async (id: number, nome: string) => {
    if (confirm(`Deseja realmente excluir o produto "${nome}"?`)) {
      await db.produtos.delete(id);
      playBeep('warning');
    }
  };

  // Quick Add Stock submit handler
  const handleConfirmQuickAddStock = async () => {
    if (!quickAddModalProduct || !quickAddModalProduct.id) return;
    const qtd = Number(quantityToAdd);
    if (qtd <= 0) {
      alert('A quantidade a adicionar deve ser maior que zero.');
      return;
    }

    try {
      await darEntradaEstoque(quickAddModalProduct.id, qtd, motivoEntrada);

      // Opcional: Gerar Conta a Pagar correspondente
      if (gerarContaPagar && fornecedorContaId) {
        const fornecedor = fornecedores.find((f) => f.id === Number(fornecedorContaId));
        const valorCustoTotal = qtd * (quickAddModalProduct.precoCusto || 0);

        await db.contasPagar.add({
          fornecedorId: Number(fornecedorContaId),
          fornecedorNome: fornecedor?.nome || 'Fornecedor',
          descricao: `Reabastecimento: ${qtd}x ${quickAddModalProduct.nome}`,
          valor: valorCustoTotal,
          dataVencimento: vencimentoConta,
          status: 'Em Aberto',
          criadoEm: new Date().toISOString(),
        });
      }

      playBeep('success');
      setQuickAddModalProduct(null);
      setQuantityToAdd(1);
    } catch (err: unknown) {
      console.error('Erro ao adicionar estoque:', err);
      alert('Erro ao atualizar estoque.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4 pb-24 animate-fade-in">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setSubTab('produtos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'produtos'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Produtos ({produtos.length})
          </button>
          <button
            onClick={() => setSubTab('movimentacoes')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'movimentacoes'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Movimentações ({movimentacoes.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Prominent "Dar Entrada via Câmera" button */}
          <button
            id="btn-estoque-entrada-camera"
            onClick={onOpenScannerForEntry}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Dar Entrada via Câmera</span>
          </button>

          <button
            id="btn-estoque-novo-produto"
            onClick={handleOpenNewProduct}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Novo Produto</span>
          </button>
        </div>
      </div>

      {subTab === 'produtos' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Search */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-busca-estoque"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, código de barras ou categoria..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Alert Filter Toggle */}
            <div className="sm:col-span-6 flex items-center gap-2">
              <button
                id="btn-filtro-estoque-baixo"
                onClick={() => setFilterAlertOnly(!filterAlertOnly)}
                className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  filterAlertOnly
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 ring-1 ring-rose-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Estoque Crítico ({countAlert})</span>
              </button>
            </div>
          </div>

          {/* Categories Pill list */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs flex flex-col items-center">
              <Package className="w-10 h-10 text-slate-600 mb-2 stroke-1" />
              <p className="font-semibold text-slate-400">Nenhum produto encontrado.</p>
              <p className="text-slate-500 text-[11px] mt-1">
                Tente ajustar a busca ou cadastre um novo produto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((prod) => {
                const isBelowMin = (prod.quantidade || 0) <= (prod.estoqueMinimo || 0);
                const lucro = (prod.precoVenda || 0) - (prod.precoCusto || 0);
                const margemPct =
                  prod.precoVenda > 0
                    ? Math.round((lucro / prod.precoVenda) * 100)
                    : 0;

                return (
                  <div
                    key={prod.id}
                    className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between transition-all shadow-md ${
                      isBelowMin
                        ? 'border-rose-500/50 bg-gradient-to-b from-rose-950/20 to-slate-900'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top status badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[120px]">
                          {prod.categoria}
                        </span>

                        {isBelowMin ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Estoque Crítico
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Normal
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h4 className="text-sm font-bold text-white leading-tight mb-1">
                        {prod.nome}
                      </h4>

                      {/* Barcode */}
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mb-3">
                        <Barcode className="w-3.5 h-3.5 text-slate-500" />
                        {prod.codigoBarras}
                      </p>

                      {/* Stock Counts Box */}
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <p className="text-[10px] text-slate-500">Estoque Atual:</p>
                          <p
                            className={`text-base font-black font-mono ${
                              isBelowMin ? 'text-rose-400 font-black' : 'text-emerald-400'
                            }`}
                          >
                            {prod.quantidade} un
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Mínimo:</p>
                          <p className="text-sm font-bold text-slate-300 font-mono">
                            {prod.estoqueMinimo} un
                          </p>
                        </div>
                      </div>

                      {/* Prices Box */}
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
                        <div>
                          <p className="text-[10px] text-slate-500">Custo:</p>
                          <p className="font-semibold text-slate-300 font-mono">
                            {formatBRL(prod.precoCusto)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Preço Venda:</p>
                          <p className="font-black text-emerald-400 font-mono text-sm">
                            {formatBRL(prod.precoVenda)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Margem:</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                            +{margemPct}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setQuickAddModalProduct(prod);
                          setQuantityToAdd(1);
                        }}
                        className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs py-2 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Entrada Rápida</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditProduct(prod)}
                        className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                        title="Editar Produto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => prod.id && handleDeleteProduct(prod.id, prod.nome)}
                        className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                        title="Excluir Produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Movimentações Sub-Tab */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" /> Histórico de Entradas e Baixas
          </h3>

          {movimentacoes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Nenhuma movimentação registrada ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {movimentacoes.map((m) => (
                <div
                  key={m.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          m.tipo === 'Entrada'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {m.tipo === 'Entrada' ? `+ ${m.quantidade} un` : `- ${m.quantidade} un`}
                      </span>
                      <span className="font-bold text-white">{m.produtoNome}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Motivo: {m.motivo}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(m.data).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Add Stock Modal (Solicitado pelo usuário ao escanear código de barras ou clicar) */}
      {quickAddModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Dar Entrada no Estoque
              </h3>
              <button
                onClick={() => setQuickAddModalProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Product Info Preview */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 font-mono">
                  {quickAddModalProduct.codigoBarras} • {quickAddModalProduct.categoria}
                </p>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {quickAddModalProduct.nome}
                </h4>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Estoque Atual:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {quickAddModalProduct.quantidade} unidades
                  </span>
                </div>
              </div>

              {/* Input "Qual quantidade deseja adicionar?" */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Qual quantidade deseja adicionar ao estoque?
                </label>
                <input
                  id="input-qtd-adicionar-estoque"
                  type="number"
                  min="1"
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-black text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 flex justify-between">
                  <span>Novo estoque projetado:</span>
                  <strong className="text-emerald-300 font-mono">
                    {(quickAddModalProduct.quantidade || 0) + (Number(quantityToAdd) || 0)} unidades
                  </strong>
                </p>
              </div>

              {/* Motivo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Motivo / Observação:
                </label>
                <input
                  type="text"
                  value={motivoEntrada}
                  onChange={(e) => setMotivoEntrada(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Optional Checkbox: Gerar Conta a Pagar para Fornecedor */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gerarContaPagar}
                    onChange={(e) => setGerarContaPagar(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-0 w-4 h-4 bg-slate-900 border-slate-700"
                  />
                  <span>Gerar Conta a Pagar para Fornecedor</span>
                </label>

                {gerarContaPagar && (
                  <div className="pt-2 space-y-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">
                        Selecionar Fornecedor:
                      </label>
                      <select
                        value={fornecedorContaId}
                        onChange={(e) =>
                          setFornecedorContaId(e.target.value ? Number(e.target.value) : '')
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                      >
                        <option value="">Selecione um fornecedor...</option>
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome} ({f.marca})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400">
                        Data de Vencimento da Fatura:
                      </label>
                      <input
                        type="date"
                        value={vencimentoConta}
                        onChange={(e) => setVencimentoConta(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex gap-2">
              <button
                type="button"
                onClick={() => setQuickAddModalProduct(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-entrada-estoque"
                type="button"
                onClick={handleConfirmQuickAddStock}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              {/* Barcode & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    Código de Barras (EAN): *
                  </label>
                  <input
                    id="input-cad-codigo-barras"
                    type="text"
                    required
                    value={formCodigoBarras}
                    onChange={(e) => setFormCodigoBarras(e.target.value)}
                    placeholder="Ex: 7891033451234"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    Categoria: *
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {predefinedCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Nome do Produto: *
                </label>
                <input
                  id="input-cad-nome"
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Perfume Kaiak Tradicional 100ml"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Preço Custo e Venda */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    Preço de Custo (R$): *
                  </label>
                  <input
                    id="input-cad-preco-custo"
                    type="number"
                    step="0.01"
                    required
                    value={formPrecoCusto}
                    onChange={(e) => setFormPrecoCusto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    Preço de Venda (R$): *
                  </label>
                  <input
                    id="input-cad-preco-venda"
                    type="number"
                    step="0.01"
                    required
                    value={formPrecoVenda}
                    onChange={(e) => setFormPrecoVenda(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Quantidade Inicial e Estoque Mínimo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    Quantidade em Estoque: *
                  </label>
                  <input
                    id="input-cad-quantidade"
                    type="number"
                    required
                    value={formQuantidade}
                    onChange={(e) => setFormQuantidade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    Estoque Mínimo (Alerta): *
                  </label>
                  <input
                    id="input-cad-estoque-minimo"
                    type="number"
                    required
                    value={formEstoqueMinimo}
                    onChange={(e) => setFormEstoqueMinimo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Fornecedor */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Fornecedor / Marca Vinculada (opcional):
                </label>
                <select
                  value={formFornecedorId}
                  onChange={(e) =>
                    setFormFornecedorId(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Nenhum fornecedor selecionado</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({f.marca})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Descrição / Notas:
                </label>
                <textarea
                  rows={2}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Detalhes, fragrância, variações..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-produto"
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
