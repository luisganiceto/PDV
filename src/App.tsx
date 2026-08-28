import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialData, playBeep } from './db/db';
import type { Produto } from './types';
import { Navbar } from './components/Navbar';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { VendasPDV } from './components/VendasPDV';
import { EstoqueView } from './components/EstoqueView';
import { ClientesFiadoView } from './components/ClientesFiadoView';
import { ContasPagarView } from './components/ContasPagarView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { PwaInstallModal } from './components/PwaInstallModal';
import { BackupModal } from './components/BackupModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDbReady, setIsDbReady] = useState(false);

  // Scanner modal state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerContext, setScannerContext] = useState<'venda' | 'entrada' | 'general'>('general');
  const [scannedBarcodeForPDV, setScannedBarcodeForPDV] = useState<string | null>(null);

  // Cross-component triggers
  const [quickAddStockProdutoId, setQuickAddStockProdutoId] = useState<number | null>(null);
  const [directPayContaId, setDirectPayContaId] = useState<number | null>(null);

  // Other Modals
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Initialize DB and Service Worker
  useEffect(() => {
    const init = async () => {
      try {
        await seedInitialData(false);
      } catch (err) {
        console.error('Erro ao inicializar DB:', err);
      } finally {
        setIsDbReady(true);
      }
    };

    init();

    // Register Service Worker for PWA offline capabilities
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('Service Worker registration failed:', err);
        });
      });
    }
  }, []);

  // Live queries for navigation badges
  const produtos = useLiveQuery(() => db.produtos.toArray()) || [];
  const clientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const contasPagar = useLiveQuery(() => db.contasPagar.toArray()) || [];

  const todayStr = new Date().toISOString().split('T')[0];

  const estoqueCriticoCount = produtos.filter(
    (p) => (p.quantidade || 0) <= (p.estoqueMinimo || 0)
  ).length;

  const fiadoCount = clientes.filter((c) => (c.saldoDevedor || 0) > 0).length;

  const contasVencidasCount = contasPagar.filter(
    (c) => c.status === 'Em Aberto' && c.dataVencimento < todayStr
  ).length;

  // Scanner Handlers
  const handleOpenScannerGeneral = () => {
    setScannerContext(activeTab === 'vendas' ? 'venda' : 'entrada');
    setShowScanner(true);
  };

  const handleOpenScannerEntrada = () => {
    setScannerContext('entrada');
    setShowScanner(true);
  };

  const handleBarcodeScanned = async (code: string) => {
    setShowScanner(false);

    if (scannerContext === 'venda') {
      setScannedBarcodeForPDV(code);
      setActiveTab('vendas');
    } else {
      // Entrada de Estoque por código de barras
      const prod = await db.produtos.where('codigoBarras').equals(code).first();
      if (prod && prod.id) {
        setActiveTab('estoque');
        setQuickAddStockProdutoId(prod.id);
        playBeep('success');
      } else {
        playBeep('warning');
        if (confirm(`Produto com código "${code}" não cadastrado. Deseja cadastrá-lo agora no Estoque?`)) {
          setActiveTab('estoque');
        }
      }
    }
  };

  // Dashboard quick triggers
  const handleOpenNovaVenda = () => {
    setActiveTab('vendas');
  };

  const handleOpenNovoProduto = () => {
    setActiveTab('estoque');
  };

  const handleOpenNovoCliente = () => {
    setActiveTab('clientes');
  };

  const handleQuickAddStockFromDash = (produtoId: number) => {
    setActiveTab('estoque');
    setQuickAddStockProdutoId(produtoId);
  };

  const handlePagarContaFromDash = (contaId: number) => {
    setActiveTab('contas');
    setDirectPayContaId(contaId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white font-sans antialiased">
      {/* Top Sticky Header */}
      <Navbar
        onOpenScanner={handleOpenScannerGeneral}
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenPwaGuide={() => setShowPwaGuide(true)}
        activeTab={activeTab}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            onChangeTab={setActiveTab}
            onOpenScannerEntrada={handleOpenScannerEntrada}
            onOpenNovaVenda={handleOpenNovaVenda}
            onOpenNovoProduto={handleOpenNovoProduto}
            onOpenNovoCliente={handleOpenNovoCliente}
            onQuickAddStock={handleQuickAddStockFromDash}
            onPagarConta={handlePagarContaFromDash}
          />
        )}

        {activeTab === 'vendas' && (
          <VendasPDV
            onOpenScanner={() => {
              setScannerContext('venda');
              setShowScanner(true);
            }}
            onOpenNovoCliente={() => setActiveTab('clientes')}
            scannedBarcode={scannedBarcodeForPDV}
            onClearScannedBarcode={() => setScannedBarcodeForPDV(null)}
          />
        )}

        {activeTab === 'estoque' && (
          <EstoqueView
            onOpenScannerForEntry={handleOpenScannerEntrada}
            quickAddStockProdutoId={quickAddStockProdutoId}
            onClearQuickAddStock={() => setQuickAddStockProdutoId(null)}
          />
        )}

        {activeTab === 'clientes' && <ClientesFiadoView />}

        {activeTab === 'contas' && (
          <ContasPagarView
            directPayContaId={directPayContaId}
            onClearDirectPayConta={() => setDirectPayContaId(null)}
          />
        )}
      </main>

      {/* Mobile Native Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        badgeCounts={{
          estoqueCritico: estoqueCriticoCount,
          fiadoCount: fiadoCount,
          contasVencidas: contasVencidasCount,
        }}
      />

      {/* Barcode Scanner Modal with Camera Access */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
        title={
          scannerContext === 'venda'
            ? 'Adicionar Produto ao Carrinho'
            : 'Dar Entrada de Estoque'
        }
        subtitle={
          scannerContext === 'venda'
            ? 'Aponte para o código de barras para adicionar à venda'
            : 'Aponte para o código de barras do produto para reabastecer'
        }
      />

      {/* PWA Installation Guide Modal */}
      <PwaInstallModal
        isOpen={showPwaGuide}
        onClose={() => setShowPwaGuide(false)}
      />

      {/* Backup & Local Database Modal */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </div>
  );
}
