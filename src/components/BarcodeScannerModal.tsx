import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Camera,
  RefreshCw,
  Flashlight,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { playBeep } from '../db/db';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Leitor de Código de Barras',
  subtitle = 'Aponte a câmera para o código de barras ou QR Code do produto',
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-scanner-viewport';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScannedResult(null);
      setCameraError(null);
      setManualCode('');
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsScanning(true);

        // Allow DOM to settle
        await new Promise((r) => setTimeout(r, 100));

        if (!document.getElementById(scannerContainerId)) return;

        // Cleanup existing instance if any
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
          } catch {
            // Ignore stop errors
          }
        }

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport,
          verbose: false,
        });

        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode },
          config,
          (decodedText) => {
            if (!isMounted) return;
            playBeep('success');
            setScannedResult(decodedText);
            // Stop scanning and trigger callback
            stopScanner();
            setTimeout(() => {
              onScan(decodedText);
            }, 300);
          },
          () => {
            // Ignore frame parse misses
          }
        );

        // Check torch capability
        try {
          const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.() || (html5QrCode as any).getRunningTrackCapabilities?.();
          if (track && (track.torch || (track.torchFeature && track.torchFeature()))) {
            setHasTorch(true);
          }
        } catch {
          // Torch not available
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : String(err);
        console.warn('Erro ao inicializar câmera:', message);
        setCameraError(
          'Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou digite o código manualmente abaixo.'
        );
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, facingMode]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // Ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep('success');
    setScannedResult(manualCode.trim());
    stopScanner();
    setTimeout(() => {
      onScan(manualCode.trim());
    }, 200);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch {
      // Ignore
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-none">
                {title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
            </div>
          </div>
          <button
            id="btn-close-scanner"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center">
          {/* Scanner Viewport */}
          <div className="relative w-full aspect-square max-w-[320px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            <div id={scannerContainerId} className="w-full h-full scanner-container" />

            {/* Target Reticle Overlay */}
            {isScanning && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-60 h-40 border-2 border-dashed border-emerald-400/80 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm -mt-0.5 -ml-0.5"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm -mt-0.5 -mr-0.5"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm -mb-0.5 -ml-0.5"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm -mb-0.5 -mr-0.5"></div>
                  {/* Laser line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent top-1/2 -translate-y-1/2 animate-pulse"></div>
                </div>
              </div>
            )}

            {/* Scanned Success Feedback */}
            {scannedResult && (
              <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-4 text-center z-10">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                <p className="text-sm font-semibold text-emerald-200">
                  Código Lido com Sucesso!
                </p>
                <span className="font-mono text-xs bg-emerald-900/60 px-3 py-1 rounded-full text-emerald-300 mt-2 border border-emerald-500/40">
                  {scannedResult}
                </span>
              </div>
            )}

            {/* Camera error fallback view */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-xs text-amber-200 leading-relaxed">
                  {cameraError}
                </p>
              </div>
            )}
          </div>

          {/* Scanner Controls (Flash & Switch Camera) */}
          <div className="flex items-center gap-3 mt-3">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Flashlight className="w-4 h-4" />
                <span>{torchOn ? 'Lanterna Ligada' : 'Lanterna'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Inverter Câmera</span>
            </button>
          </div>

          {/* Manual Barcode Input Fallback */}
          <div className="w-full mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-500" /> Ou digite o código de barras / EAN:
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                id="input-scanner-manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ex: 7891033451234"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                id="btn-scanner-confirm-manual"
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Buscar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
