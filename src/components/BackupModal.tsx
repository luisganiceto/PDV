import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  X,
} from 'lucide-react';
import {
  exportarBackupJSON,
  importarBackupJSON,
  seedInitialData,
  playBeep,
} from '../db/db';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const jsonString = await exportarBackupJSON();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dataStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup_gestao_comercial_${dataStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playBeep('success');
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Atenção: A importação irá substituir os dados locais atuais pelos dados do arquivo. Deseja continuar?')) {
      return;
    }

    try {
      setIsImporting(true);
      setImportStatus(null);
      const text = await file.text();
      await importarBackupJSON(text);
      setImportStatus('Backup restaurado com sucesso!');
      playBeep('success');
      setTimeout(() => {
        setImportStatus(null);
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Erro na importação: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetDemoData = async () => {
    if (confirm('Restaurar os dados de demonstração (Natura, Eudora, O Boticário, Kits)? Os dados atuais serão substituídos pelos exemplos.')) {
      await seedInitialData(true);
      playBeep('success');
      alert('Dados de demonstração restaurados com sucesso!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-none">
                Backup & Banco Local (Dexie.js)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Segurança e exportação dos dados do dispositivo
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
        <div className="p-5 space-y-4 text-xs">
          {importStatus && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{importStatus}</span>
            </div>
          )}

          {/* Export section */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs text-emerald-400">
              <Download className="w-4 h-4" /> Exportar Backup (Download JSON)
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Baixe uma cópia completa de todos os seus produtos, vendas, fiados e fornecedores para salvar no Google Drive, WhatsApp ou enviar para outro celular.
            </p>
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <FileJson className="w-4 h-4" />
              <span>{isExporting ? 'Gerando arquivo...' : 'Baixar Arquivo de Backup (.JSON)'}</span>
            </button>
          </div>

          {/* Import section */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs text-cyan-400">
              <Upload className="w-4 h-4" /> Restaurar Backup de Arquivo
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Selecione um arquivo <code>.json</code> exportado anteriormente para recuperar todas as informações.
            </p>
            <label className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>{isImporting ? 'Importando...' : 'Selecionar Arquivo JSON'}</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </div>

          {/* Demo Data Restore */}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Dados de Demonstração:</span>
            <button
              onClick={handleResetDemoData}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recarregar Exemplos</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
