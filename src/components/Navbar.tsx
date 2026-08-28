import React, { useState, useEffect } from 'react';
import {
  Store,
  Wifi,
  WifiOff,
  QrCode,
  Download,
  Database,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onOpenScanner: () => void;
  onOpenBackup: () => void;
  onOpenPwaGuide: () => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  onOpenBackup,
  onOpenPwaGuide,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                Gestão Comercial
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PWA
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <Wifi className="w-3 h-3" /> Offline Pronto
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <WifiOff className="w-3 h-3" /> Modo Offline
                </span>
              )}
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 flex items-center gap-0.5">
                <Database className="w-3 h-3 text-cyan-400" /> Dexie DB
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Scanner button */}
          <button
            id="btn-navbar-scanner"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            title="Escanear Código de Barras"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Leitor Câmera</span>
          </button>

          {/* Backup & Dados */}
          <button
            id="btn-navbar-backup"
            onClick={onOpenBackup}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-colors active:scale-95 cursor-pointer"
            title="Backup e Dados (IndexedDB)"
          >
            <Database className="w-4 h-4 text-cyan-400" />
          </button>

          {/* PWA Install / Guia */}
          <button
            id="btn-navbar-pwa"
            onClick={onOpenPwaGuide}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-colors active:scale-95 cursor-pointer"
            title="Como Instalar o App no Celular"
          >
            <Download className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
