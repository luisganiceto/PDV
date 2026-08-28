import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, playBeep } from '../db/db';
import type { ContaPagar, Fornecedor, StatusContaPagar } from '../types';
import {
  ReceiptText,
  Truck,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  Phone,
  Edit2,
  Trash2,
  X,
  Building,
  Check,
  Tag,
} from 'lucide-react';

interface ContasPagarViewProps {
  directPayContaId?: number | null;
  onClearDirectPayConta?: () => void;
}

export const ContasPagarView: React.FC<ContasPagarViewProps> = ({
  directPayContaId,
  onClearDirectPayConta,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'contas' | 'fornecedores'>('contas');
  const [filterStatus, setFilterStatus] = useState<'Todas' | 'Vencidas' | 'Em Aberto' | 'Pagas'>('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Conta a Pagar Modal
  const [showContaModal, setShowContaModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [formFornecedorId, setFormFornecedorId] = useState<number | ''>('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formDataVencimento, setFormDataVencimento] = useState(
    new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
  );
  const [formNumeroNota, setFormNumeroNota] = useState('');

  // Fornecedor Modal
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [fornNome, setFornNome] = useState('');
  const [fornMarca, setFornMarca] = useState('Natura');
  const [fornTelefone, setFornTelefone] = useState('');
  const [fornPix, setFornPix] = useState('');

  // Live queries
  const contasPagar = useLiveQuery(() => db.contasPagar.toArray()) || [];
  const fornecedores = useLiveQuery(() => db.fornecedores.toArray()) || [];

  const todayStr = new Date().toISOString().split('T')[0];

  // React to prop for direct payment trigger
  React.useEffect(() => {
    if (directPayContaId) {
      handleMarcarPago(directPayContaId);
      if (onClearDirectPayConta) onClearDirectPayConta();
    }
  }, [directPayContaId]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Metrics
  const contasEmAberto = contasPagar.filter((c) => c.status === 'Em Aberto');
  const totalEmAberto = contasEmAberto.reduce((acc, c) => acc + (c.valor || 0), 0);

  const contasVencidas = contasEmAberto.filter((c) => c.dataVencimento < todayStr);
  const totalVencido = contasVencidas.reduce((acc, c) => acc + (c.valor || 0), 0);

  const contasPagas = contasPagar.filter((c) => c.status === 'Pago');
  const totalPago = contasPagas.reduce((acc, c) => acc + (c.valor || 0), 0);

  // Filtered contas
  const filteredContas = contasPagar.filter((c) => {
    const isOverdue = c.status === 'Em Aberto' && c.dataVencimento < todayStr;
    const matchSearch =
      c.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.fornecedorNome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.numeroNota || '').includes(searchTerm);

    let matchFilter = true;
    if (filterStatus === 'Vencidas') matchFilter = isOverdue;
    else if (filterStatus === 'Em Aberto') matchFilter = c.status === 'Em Aberto';
    else if (filterStatus === 'Pagas') matchFilter = c.status === 'Pago';

    return matchSearch && matchFilter;
  });

  // Actions on Conta Pagar
  const handleMarcarPago = async (id: number) => {
    await db.contasPagar.update(id, {
      status: 'Pago',
      dataPagamento: new Date().toISOString().split('T')[0],
    });
    playBeep('success');
  };

  const handleMarcarEmAberto = async (id: number) => {
    await db.contasPagar.update(id, {
      status: 'Em Aberto',
      dataPagamento: undefined,
    });
    playBeep('warning');
  };

  const handleDeleteConta = async (id: number, desc: string) => {
    if (confirm(`Excluir conta "${desc}"?`)) {
      await db.contasPagar.delete(id);
      playBeep('warning');
    }
  };

  const handleOpenNewConta = () => {
    setEditingConta(null);
    setFormFornecedorId(fornecedores[0]?.id || '');
    setFormDescricao('');
    setFormValor('');
    setFormDataVencimento(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]);
    setFormNumeroNota('');
    setShowContaModal(true);
  };

  const handleSaveConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescricao.trim() || !formValor) {
      alert('Descrição e Valor são obrigatórios.');
      return;
    }

    try {
      const selectedForn = fornecedores.find((f) => f.id === Number(formFornecedorId));
      const valor = Number(formValor) || 0;

      if (editingConta && editingConta.id) {
        await db.contasPagar.update(editingConta.id, {
          fornecedorId: formFornecedorId ? Number(formFornecedorId) : undefined,
          fornecedorNome: selectedForn?.nome,
          descricao: formDescricao.trim(),
          valor,
          dataVencimento: formDataVencimento,
          numeroNota: formNumeroNota.trim() || undefined,
        });
      } else {
        await db.contasPagar.add({
          fornecedorId: formFornecedorId ? Number(formFornecedorId) : undefined,
          fornecedorNome: selectedForn?.nome || 'Fornecedor',
          descricao: formDescricao.trim(),
          valor,
          dataVencimento: formDataVencimento,
          status: 'Em Aberto',
          numeroNota: formNumeroNota.trim() || undefined,
          criadoEm: new Date().toISOString(),
        });
      }

      playBeep('success');
      setShowContaModal(false);
    } catch (err: unknown) {
      console.error('Erro ao salvar conta:', err);
      alert('Erro ao salvar conta a pagar.');
    }
  };

  // Fornecedor Actions
  const handleOpenNewFornecedor = () => {
    setEditingFornecedor(null);
    setFornNome('');
    setFornMarca('Natura');
    setFornTelefone('');
    setFornPix('');
    setShowFornecedorModal(true);
  };

  const handleOpenEditFornecedor = (f: Fornecedor) => {
    setEditingFornecedor(f);
    setFornNome(f.nome);
    setFornMarca(f.marca);
    setFornTelefone(f.telefone);
    setFornPix(f.pixOuContato || '');
    setShowFornecedorModal(true);
  };

  const handleSaveFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fornNome.trim()) {
      alert('Nome do fornecedor é obrigatório.');
      return;
    }

    try {
      if (editingFornecedor && editingFornecedor.id) {
        await db.fornecedores.update(editingFornecedor.id, {
          nome: fornNome.trim(),
          marca: fornMarca.trim(),
          telefone: fornTelefone.trim(),
          pixOuContato: fornPix.trim() || undefined,
        });
      } else {
        await db.fornecedores.add({
          nome: fornNome.trim(),
          marca: fornMarca.trim(),
          telefone: fornTelefone.trim(),
          pixOuContato: fornPix.trim() || undefined,
          criadoEm: new Date().toISOString(),
        });
      }

      playBeep('success');
      setShowFornecedorModal(false);
    } catch (err: unknown) {
      console.error('Erro ao salvar fornecedor:', err);
      alert('Erro ao salvar fornecedor.');
    }
  };

  const handleDeleteFornecedor = async (id: number, nome: string) => {
    if (confirm(`Deseja excluir o fornecedor "${nome}"?`)) {
      await db.fornecedores.delete(id);
      playBeep('warning');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4 pb-24 animate-fade-in">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
          <button
            id="tab-contas-list"
            onClick={() => setActiveSubTab('contas')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'contas'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Contas a Pagar ({contasPagar.length})
          </button>
          <button
            id="tab-fornecedores-list"
            onClick={() => setActiveSubTab('fornecedores')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'fornecedores'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Fornecedores & Marcas ({fornecedores.length})
          </button>
        </div>

        {activeSubTab === 'contas' ? (
          <button
            id="btn-nova-conta-pagar"
            onClick={handleOpenNewConta}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Conta a Pagar</span>
          </button>
        ) : (
          <button
            id="btn-novo-fornecedor"
            onClick={handleOpenNewFornecedor}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Building className="w-4 h-4" />
            <span>+ Novo Fornecedor</span>
          </button>
        )}
      </div>

      {activeSubTab === 'contas' ? (
        <div className="space-y-4">
          {/* Financial Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Total em Aberto</p>
                <p className="text-xl font-black text-rose-400 font-mono mt-0.5">
                  {formatBRL(totalEmAberto)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <ReceiptText className="w-5 h-5" />
              </div>
            </div>

            <div
              className={`bg-slate-900/90 border p-3.5 rounded-2xl flex items-center justify-between shadow-md ${
                contasVencidas.length > 0 ? 'border-rose-500/50 ring-1 ring-rose-500/30' : 'border-slate-800'
              }`}
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Contas Vencidas</p>
                <p className="text-xl font-black text-rose-300 font-mono mt-0.5">
                  {formatBRL(totalVencido)}{' '}
                  <span className="text-xs font-normal text-rose-400">
                    ({contasVencidas.length})
                  </span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Total Liquidado (Pago)</p>
                <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                  {formatBRL(totalPago)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter pills */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-busca-contas"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar contas por fornecedor, descrição ou nota..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['Todas', 'Vencidas', 'Em Aberto', 'Pagas'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    filterStatus === st
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {st === 'Vencidas' && contasVencidas.length > 0 ? `⚠️ ${st} (${contasVencidas.length})` : st}
                </button>
              ))}
            </div>
          </div>

          {/* Contas List */}
          {filteredContas.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Nenhuma conta a pagar encontrada.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredContas.map((conta) => {
                const isOverdue = conta.status === 'Em Aberto' && conta.dataVencimento < todayStr;
                const isToday = conta.status === 'Em Aberto' && conta.dataVencimento === todayStr;

                return (
                  <div
                    key={conta.id}
                    className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isOverdue
                        ? 'border-rose-500/50 bg-gradient-to-r from-rose-950/20 to-slate-900'
                        : isToday
                        ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/20 to-slate-900'
                        : conta.status === 'Pago'
                        ? 'border-emerald-500/30 opacity-80'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {conta.fornecedorNome || 'Fornecedor Avulso'}
                        </span>
                        {conta.numeroNota && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {conta.numeroNota}
                          </span>
                        )}

                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Vencida em {conta.dataVencimento.split('-').reverse().join('/')}
                          </span>
                        )}

                        {isToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Vence Hoje!
                          </span>
                        )}

                        {conta.status === 'Pago' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Pago em {conta.dataPagamento ? conta.dataPagamento.split('-').reverse().join('/') : ''}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300">{conta.descricao}</p>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Vencimento: {conta.dataVencimento.split('-').reverse().join('/')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <span
                        className={`text-lg font-black font-mono ${
                          conta.status === 'Pago'
                            ? 'text-emerald-400 line-through opacity-70'
                            : isOverdue
                            ? 'text-rose-400'
                            : 'text-white'
                        }`}
                      >
                        {formatBRL(conta.valor)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {conta.status === 'Em Aberto' ? (
                          <button
                            onClick={() => conta.id && handleMarcarPago(conta.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Pagar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => conta.id && handleMarcarEmAberto(conta.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                            title="Reabrir Conta"
                          >
                            Reabrir
                          </button>
                        )}

                        <button
                          onClick={() => conta.id && handleDeleteConta(conta.id, conta.descricao)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-800/80 rounded-xl"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Fornecedores Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fornecedores.map((forn) => (
              <div
                key={forn.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      {forn.marca}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditFornecedor(forn)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => forn.id && handleDeleteFornecedor(forn.id, forn.nome)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white">{forn.nome}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {forn.telefone || 'Sem telefone'}
                  </p>

                  {forn.pixOuContato && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono bg-slate-950 p-1.5 rounded">
                      Chave Pix: {forn.pixOuContato}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                  <span className="text-slate-500 text-[11px]">Marca Oficial</span>
                  <span className="font-semibold text-slate-300">{forn.marca}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New / Edit Conta a Pagar Modal */}
      {showContaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-rose-400" />
                {editingConta ? 'Editar Conta a Pagar' : 'Lançar Conta a Pagar'}
              </h3>
              <button
                onClick={() => setShowContaModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConta} className="p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Fornecedor / Fabricante:
                </label>
                <select
                  value={formFornecedorId}
                  onChange={(e) =>
                    setFormFornecedorId(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Nenhum fornecedor vinculado</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({f.marca})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Descrição da Despesa / Pedido: *
                </label>
                <input
                  id="input-conta-descricao"
                  type="text"
                  required
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Ex: Pedido Ciclo 15 Natura - Linha Kaiak"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    Valor a Pagar (R$): *
                  </label>
                  <input
                    id="input-conta-valor"
                    type="number"
                    step="0.01"
                    required
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    Data de Vencimento: *
                  </label>
                  <input
                    id="input-conta-vencimento"
                    type="date"
                    required
                    value={formDataVencimento}
                    onChange={(e) => setFormDataVencimento(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Número da Nota / Boleto:
                </label>
                <input
                  type="text"
                  value={formNumeroNota}
                  onChange={(e) => setFormNumeroNota(e.target.value)}
                  placeholder="Ex: NF-1290 ou Bol-8823"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowContaModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-conta-submit"
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingConta ? 'Atualizar Conta' : 'Lançar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New / Edit Fornecedor Modal */}
      {showFornecedorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                {editingFornecedor ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
              </h3>
              <button
                onClick={() => setShowFornecedorModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFornecedor} className="p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Razão Social / Nome do Fornecedor: *
                </label>
                <input
                  id="input-cad-fornecedor-nome"
                  type="text"
                  required
                  value={fornNome}
                  onChange={(e) => setFornNome(e.target.value)}
                  placeholder="Ex: Natura Cosméticos S/A"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Marca / Ramo: (ex: Natura, Eudora, O Boticário, Canecas/Brindes) *
                </label>
                <input
                  id="input-cad-fornecedor-marca"
                  type="text"
                  required
                  value={fornMarca}
                  onChange={(e) => setFornMarca(e.target.value)}
                  placeholder="Ex: O Boticário, Canecas & Brindes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Telefone / WhatsApp:
                </label>
                <input
                  type="text"
                  value={fornTelefone}
                  onChange={(e) => setFornTelefone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Chave Pix ou Contato Financeiro:
                </label>
                <input
                  type="text"
                  value={fornPix}
                  onChange={(e) => setFornPix(e.target.value)}
                  placeholder="Ex: financeiro@fornecedor.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFornecedorModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-fornecedor-submit"
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingFornecedor ? 'Atualizar Fornecedor' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
