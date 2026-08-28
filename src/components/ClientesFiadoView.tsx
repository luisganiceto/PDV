import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db, registrarPagamentoFiado, playBeep } from '../db/db';
import type { Cliente, Venda, PagamentoFiado } from '../types';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MapPin,
  DollarSign,
  Receipt,
  Share2,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  CreditCard,
  Edit2,
  Trash2,
  Send,
  MessageCircle,
} from 'lucide-react';

interface ClientesFiadoViewProps {
  initialOpenNovoCliente?: boolean;
}

export const ClientesFiadoView: React.FC<ClientesFiadoViewProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFiadoOnly, setFilterFiadoOnly] = useState(false);

  // Selected client for Profile view
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  // New/Edit Client Modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formSaldoDevedor, setFormSaldoDevedor] = useState('0.00');
  const [formObservacoes, setFormObservacoes] = useState('');

  // Payment/Amortization Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [valorPagamento, setValorPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix');
  const [obsPagamento, setObsPagamento] = useState('');

  // Live queries
  const clientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const vendas = useLiveQuery(() => db.vendas.toArray()) || [];
  const pagamentos = useLiveQuery(() => db.pagamentosFiado.toArray()) || [];

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Filtered clients list
  const filteredClientes = clientes.filter((c) => {
    const matchSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone.includes(searchTerm) ||
      (c.endereco || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isDebtor = (c.saldoDevedor || 0) > 0;
    const matchFiado = !filterFiadoOnly || isDebtor;
    return matchSearch && matchFiado;
  });

  const totalFiado = clientes.reduce((acc, c) => acc + (c.saldoDevedor || 0), 0);
  const countDevedores = clientes.filter((c) => (c.saldoDevedor || 0) > 0).length;

  const handleOpenNewClient = () => {
    setEditingClient(null);
    setFormNome('');
    setFormTelefone('');
    setFormEndereco('');
    setFormSaldoDevedor('0.00');
    setFormObservacoes('');
    setShowClientModal(true);
  };

  const handleOpenEditClient = (c: Cliente, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClient(c);
    setFormNome(c.nome);
    setFormTelefone(c.telefone);
    setFormEndereco(c.endereco || '');
    setFormSaldoDevedor(String(c.saldoDevedor || 0));
    setFormObservacoes(c.observacoes || '');
    setShowClientModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('Nome do cliente é obrigatório.');
      return;
    }

    try {
      const saldoDevedor = Number(formSaldoDevedor) || 0;

      if (editingClient && editingClient.id) {
        await db.clientes.update(editingClient.id, {
          nome: formNome.trim(),
          telefone: formTelefone.trim(),
          endereco: formEndereco.trim() || undefined,
          saldoDevedor,
          observacoes: formObservacoes.trim() || undefined,
        });

        // Update selected if open
        if (selectedCliente?.id === editingClient.id) {
          setSelectedCliente({
            ...editingClient,
            nome: formNome.trim(),
            telefone: formTelefone.trim(),
            endereco: formEndereco.trim() || undefined,
            saldoDevedor,
            observacoes: formObservacoes.trim() || undefined,
          });
        }
      } else {
        await db.clientes.add({
          nome: formNome.trim(),
          telefone: formTelefone.trim(),
          endereco: formEndereco.trim() || undefined,
          saldoDevedor,
          observacoes: formObservacoes.trim() || undefined,
          criadoEm: new Date().toISOString(),
        });
      }

      playBeep('success');
      setShowClientModal(false);
    } catch (err: unknown) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente.');
    }
  };

  const handleDeleteClient = async (id: number, nome: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`Deseja excluir o cliente "${nome}"?`)) {
      await db.clientes.delete(id);
      if (selectedCliente?.id === id) {
        setSelectedCliente(null);
      }
      playBeep('warning');
    }
  };

  // Submit debt payment / amortization
  const handleConfirmPayment = async () => {
    if (!selectedCliente || !selectedCliente.id) return;
    const valor = Number(valorPagamento);
    if (valor <= 0) {
      alert('Informe um valor válido a ser abatido.');
      return;
    }

    try {
      const novoSaldo = await registrarPagamentoFiado(
        selectedCliente.id,
        valor,
        formaPagamento,
        obsPagamento.trim() || undefined
      );

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
      playBeep('success');

      // Update selected client
      setSelectedCliente({
        ...selectedCliente,
        saldoDevedor: novoSaldo,
      });

      setShowPaymentModal(false);
      setValorPagamento('');
      setObsPagamento('');
    } catch (err: unknown) {
      console.error('Erro ao registrar pagamento:', err);
      alert('Erro ao processar abatimento no banco local.');
    }
  };

  // WhatsApp friendly reminder
  const handleEnviarCobrancaAmigavel = (c: Cliente) => {
    const fone = c.telefone.replace(/\D/g, '');
    let msg = `Olá, *${c.nome}*! Tudo bem? 😊\n\n`;
    msg += `Passando para enviar o lembrete amigável do seu saldo em aberto conosco:\n`;
    msg += `💰 *Valor Pendente:* ${formatBRL(c.saldoDevedor)}\n\n`;
    msg += `Você pode efetuar o pagamento via Pix ou diretamente na loja física.\n`;
    msg += `Qualquer dúvida estamos à disposição! Muito obrigado(a)! ✨`;

    const encoded = encodeURIComponent(msg);
    const url = fone ? `https://wa.me/55${fone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // WhatsApp payment receipt
  const handleEnviarReciboPagamento = (c: Cliente, p: PagamentoFiado) => {
    const fone = c.telefone.replace(/\D/g, '');
    let msg = `🧾 *COMPROVANTE DE PAGAMENTO DE FIADO*\n\n`;
    msg += `👤 *Cliente:* ${c.nome}\n`;
    msg += `💵 *Valor Pago:* ${formatBRL(p.valor)}\n`;
    msg += `💳 *Forma:* ${p.formaPagamento}\n`;
    msg += `📅 *Data:* ${new Date(p.data).toLocaleString('pt-BR')}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 *Saldo Devedor Restante:* ${formatBRL(c.saldoDevedor)}\n\n`;
    msg += `Pagamento registrado com sucesso. Muito obrigado! 🙏✨`;

    const encoded = encodeURIComponent(msg);
    const url = fone ? `https://wa.me/55${fone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Filter history of sales for selected client
  const clientVendas = selectedCliente?.id
    ? vendas.filter((v) => v.clienteId === selectedCliente.id)
    : [];

  const clientPagamentos = selectedCliente?.id
    ? pagamentos.filter((p) => p.clienteId === selectedCliente.id)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4 pb-24 animate-fade-in">
      {/* Header with Metrics & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Clientes & Controle de Fiado
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento de saldos devedores, quitações e cobranças.
          </p>
        </div>

        <button
          id="btn-clientes-novo"
          onClick={handleOpenNewClient}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Novo Cliente</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Total a Receber em Fiado</p>
            <p className="text-xl font-black text-amber-400 font-mono mt-0.5">
              {formatBRL(totalFiado)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Clientes com Débito</p>
            <p className="text-xl font-black text-white font-mono mt-0.5">
              {countDevedores} de {clientes.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Status Geral</p>
            <p className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Banco Local Dexie.js Ativo
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-busca-clientes"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone ou endereço..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-4 flex items-center gap-2">
          <button
            onClick={() => setFilterFiadoOnly(!filterFiadoOnly)}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              filterFiadoOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Apenas com Débito ({countDevedores})</span>
          </button>
        </div>
      </div>

      {/* Clients Grid / List */}
      {filteredClientes.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          Nenhum cliente encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredClientes.map((cliente) => {
            const hasDebt = (cliente.saldoDevedor || 0) > 0;

            return (
              <div
                key={cliente.id}
                onClick={() => setSelectedCliente(cliente)}
                className={`bg-slate-900/90 hover:bg-slate-800/90 border rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer shadow-md group ${
                  hasDebt
                    ? 'border-amber-500/40 hover:border-amber-500/70'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                        {cliente.nome}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {cliente.telefone || 'Sem telefone'}
                      </p>
                    </div>

                    {hasDebt ? (
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                        Deve {formatBRL(cliente.saldoDevedor)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Em dia
                      </span>
                    )}
                  </div>

                  {cliente.endereco && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      {cliente.endereco}
                    </p>
                  )}

                  {cliente.observacoes && (
                    <p className="text-[11px] text-slate-500 italic mt-1.5 line-clamp-1 bg-slate-950/60 px-2 py-1 rounded">
                      "{cliente.observacoes}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    Abrir Perfil & Fiado →
                  </span>

                  <div className="flex items-center gap-1">
                    {hasDebt && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnviarCobrancaAmigavel(cliente);
                        }}
                        className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg"
                        title="Enviar Cobrança no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => handleOpenEditClient(cliente, e)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Profile Modal with Debt Clearance (Abatimento) & History */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Perfil do Cliente
                </h3>
                <p className="text-xs text-slate-400">{selectedCliente.nome}</p>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Financial Box (Saldo Devedor) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Saldo Devedor Atual (Fiado):</p>
                  <p
                    className={`text-2xl font-black font-mono mt-0.5 ${
                      (selectedCliente.saldoDevedor || 0) > 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {formatBRL(selectedCliente.saldoDevedor)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tel: {selectedCliente.telefone || 'Não informado'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(selectedCliente.saldoDevedor || 0) > 0 && (
                    <>
                      {/* Botão Registrar Pagamento / Abater Dívida */}
                      <button
                        id="btn-abater-divida-modal"
                        onClick={() => {
                          setValorPagamento(String(selectedCliente.saldoDevedor));
                          setShowPaymentModal(true);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Abater / Quitar Fiado</span>
                      </button>

                      {/* Cobrança WhatsApp */}
                      <button
                        onClick={() => handleEnviarCobrancaAmigavel(selectedCliente)}
                        className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>Cobrar WhatsApp</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Purchase History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <Receipt className="w-4 h-4 text-emerald-400" /> Histórico de Compras ({clientVendas.length})
                </h4>

                {clientVendas.length === 0 ? (
                  <div className="bg-slate-950 p-4 rounded-xl text-center text-slate-500 text-xs">
                    Nenhuma compra registrada para este cliente.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {clientVendas.map((v) => (
                      <div
                        key={v.id}
                        className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">Venda #{v.id}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                v.statusPagamento === 'Pago'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {v.statusPagamento === 'Pago' ? `Pago (${v.formaPagamento})` : 'Fiado'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(v.data).toLocaleDateString('pt-BR')} •{' '}
                            {v.itens?.map((i) => `${i.quantidade}x ${i.nome}`).join(', ')}
                          </p>
                        </div>
                        <span className="font-bold text-emerald-400 font-mono text-xs">
                          {formatBRL(v.valorTotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <History className="w-4 h-4 text-cyan-400" /> Histórico de Abatimentos / Pagamentos ({clientPagamentos.length})
                </h4>

                {clientPagamentos.length === 0 ? (
                  <div className="bg-slate-950 p-4 rounded-xl text-center text-slate-500 text-xs">
                    Nenhum pagamento registrado ainda.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {clientPagamentos.map((p) => (
                      <div
                        key={p.id}
                        className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-emerald-400">
                            - {formatBRL(p.valor)} ({p.formaPagamento})
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {new Date(p.data).toLocaleString('pt-BR')}{' '}
                            {p.observacao ? `• "${p.observacao}"` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEnviarReciboPagamento(selectedCliente, p)}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3" /> Recibo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
              <button
                onClick={() => handleOpenEditClient(selectedCliente)}
                className="text-xs text-slate-300 hover:text-white font-semibold flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar Cadastro
              </button>

              <button
                onClick={() => setSelectedCliente(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment / Amortization SubModal */}
      {showPaymentModal && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Registrar Pagamento de Dívida
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400">Cliente:</p>
                <p className="font-bold text-white">{selectedCliente.nome}</p>
                <p className="text-[11px] text-amber-400">
                  Dívida Total Atual: {formatBRL(selectedCliente.saldoDevedor)}
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Valor a ser Abatido (R$): *
                </label>
                <input
                  id="input-valor-abatimento"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCliente.saldoDevedor}
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-black text-emerald-400 font-mono"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Forma de Pagamento:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Pix', 'Dinheiro', 'Cartão'] as ('Pix' | 'Dinheiro' | 'Cartão')[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormaPagamento(f)}
                      className={`p-2 rounded-xl text-xs font-semibold border text-center ${
                        formaPagamento === f
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Observação (opcional):
                </label>
                <input
                  type="text"
                  value={obsPagamento}
                  onChange={(e) => setObsPagamento(e.target.value)}
                  placeholder="Ex: Quitação parcial, transferência Pix..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-abatimento-submit"
                type="button"
                onClick={handleConfirmPayment}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 rounded-xl text-xs shadow-md"
              >
                Confirmar Abatimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button
                onClick={() => setShowClientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Nome Completo: *
                </label>
                <input
                  id="input-cad-cliente-nome"
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Mariana Silva Souza"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Telefone / WhatsApp:
                </label>
                <input
                  id="input-cad-cliente-telefone"
                  type="text"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Endereço:
                </label>
                <input
                  type="text"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  placeholder="Ex: Rua das Flores, 120"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Saldo Devedor Inicial / Fiado Atual (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formSaldoDevedor}
                  onChange={(e) => setFormSaldoDevedor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Observações:
                </label>
                <textarea
                  rows={2}
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Ex: Paga todo dia 10, prefere kits..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-cliente-submit"
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingClient ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
