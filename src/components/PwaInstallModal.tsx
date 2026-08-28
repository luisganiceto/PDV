import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share,
  PlusSquare,
  Sparkles,
  WifiOff,
  ShieldCheck,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos) {
      setPlatform('ios');
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleTriggerNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-none">
                Instalar Aplicativo no Celular (PWA)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Uso 100% offline e acesso rápido sem precisar de App Store
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Native Install Button if available */}
          {deferredPrompt && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-xl text-white space-y-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold text-sm">Instalação Direta Disponível!</span>
              </div>
              <p className="text-xs text-emerald-100">
                Seu navegador suporta instalação em 1 clique.
              </p>
              <button
                onClick={handleTriggerNativeInstall}
                className="w-full bg-white text-slate-950 font-black py-2.5 rounded-lg text-xs shadow hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Instalar Agora na Tela Inicial
              </button>
            </div>
          )}

          {/* Benefits Box */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Dados salvos no Dexie (IndexedDB)</span>
            </div>
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Funciona sem internet</span>
            </div>
          </div>

          {/* OS Selector */}
          <div>
            <label className="font-bold text-slate-300 mb-2 block">
              Selecione o sistema operacional do seu celular:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlatform('android')}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  platform === 'android'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Android (Chrome)</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('ios')}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  platform === 'ios'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>iPhone / iPad (Safari)</span>
              </button>
            </div>
          </div>

          {/* Step by step guide */}
          {platform === 'android' ? (
            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs text-emerald-400">
                Passo a Passo no Android (Google Chrome):
              </h4>
              <ol className="space-y-2 text-slate-300 pl-1 list-decimal list-inside leading-relaxed">
                <li>
                  Abra este link no navegador <strong>Google Chrome</strong> do seu celular.
                </li>
                <li>
                  Toque no ícone de <strong>3 pontinhos (⋮)</strong> no canto superior direito do Chrome.
                </li>
                <li>
                  Toque na opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </li>
                <li>
                  Confirme em <strong>"Instalar"</strong>. O ícone aparecerá como um app nativo!
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs text-cyan-400">
                Passo a Passo no iPhone / iPad (Safari):
              </h4>
              <ol className="space-y-2 text-slate-300 pl-1 list-decimal list-inside leading-relaxed">
                <li>
                  Abra este link no navegador <strong>Safari</strong> do iPhone.
                </li>
                <li>
                  Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima <Share className="w-3.5 h-3.5 inline mx-0.5 text-cyan-400" /> na barra inferior).
                </li>
                <li>
                  Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-cyan-400" />.
                </li>
                <li>
                  Toque em <strong>"Adicionar"</strong> no canto superior direito.
                </li>
              </ol>
            </div>
          )}

          {/* Offline Persistence Guarantee */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl text-emerald-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Garantia de Persistência Offline
            </p>
            <p className="text-[11px] text-emerald-300/80">
              Todos os seus produtos, vendas, fiados e contas ficam armazenados no <strong>IndexedDB local (Dexie.js)</strong> do seu aparelho. Você pode desligar o celular ou fechar o navegador sem perder nenhum dado!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
