import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  ReceiptText,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'vendas' | 'estoque' | 'clientes' | 'contas';

interface BadgeCounts {
  estoqueCritico?: number;
  fiadoCount?: number;
  contasVencidas?: number;
  carrinhoCount?: number;
}

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  badgeCounts?: BadgeCounts;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  badgeCounts,
}) => {
  const counts = badgeCounts || {};
  const tabs: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Início',
      icon: LayoutDashboard,
    },
    {
      id: 'vendas',
      label: 'Vendas/PDV',
      icon: ShoppingCart,
      badge: counts.carrinhoCount,
      badgeColor: 'bg-emerald-500 text-white',
    },
    {
      id: 'estoque',
      label: 'Estoque',
      icon: Package,
      badge: counts.estoqueCritico,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'clientes',
      label: 'Clientes/Fiado',
      icon: Users,
      badge: counts.fiadoCount,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'contas',
      label: 'Contas Pagar',
      icon: ReceiptText,
      badge: counts.contasVencidas,
      badgeColor: 'bg-red-500 text-white animate-pulse',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-btn-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 ? (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      tab.badgeColor || 'bg-rose-500 text-white'
                    }`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[65px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
