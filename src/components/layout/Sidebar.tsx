import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { 
  LayoutDashboard, 
  Landmark, 
  CreditCard, 
  Receipt, 
  Settings, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Zap, 
  Minimize2, 
  TrendingUp, 
  PlusCircle,
  Leaf,
  Flame,
  ShoppingCart,
  Target,
  Repeat,
  LogOut,
  Building
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'contas', label: 'Contas', icon: Landmark },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'lancamentos', label: 'Lançamentos', icon: Receipt },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'emprestimos', label: 'Empréstimos', icon: Building },
  { id: 'metas', label: 'Cofres', icon: Target },
];

const bottomItems = [
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate }) => {
  const { currentUser, logout } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleNavigate = (tab: string) => {
    onNavigate(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-card border border-border p-2 rounded-lg shadow-lg cursor-pointer"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`
          fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-card border-r border-border shadow-lg
          transition-all duration-300
          ${isCollapsed ? 'w-16' : 'w-60'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative md:h-screen
        `}
      >
        {/* Logo / Header */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-border ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <TrendingUp size={18} className="text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <span className="block font-bold text-base leading-tight truncate">FinanceOS</span>
              <span className="block text-xs text-muted-foreground">Sistema Pessoal</span>
            </div>
          )}
          {/* Collapse/Expand button – desktop only */}
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="hidden md:flex text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
          >
            <Menu size={16} />
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`nav-${id}`}
                onClick={() => handleNavigate(id)}
                title={isCollapsed ? label : ''}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 cursor-pointer text-left
                  ${isActive 
                    ? 'bg-primary/10 text-primary font-semibold' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon size={18} className="shrink-0" />
                {!isCollapsed && <span>{label}</span>}
                {isActive && !isCollapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-2 py-4 border-t border-border space-y-1">
          {bottomItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => handleNavigate(id)}
              title={isCollapsed ? label : ''}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all cursor-pointer text-left
                ${activeTab === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </button>
          ))}

          {/* User profile identifier */}
          {currentUser && (
            <div className={`flex items-center gap-2.5 px-3 py-2 text-xs border border-border bg-muted/20 rounded-xl overflow-hidden ${isCollapsed ? 'justify-center p-2.5' : ''}`}>
              <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 font-bold">
                {currentUser.name ? currentUser.name[0].toUpperCase() : '?'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <span className="font-semibold block truncate text-left">{currentUser.name || 'Sem Nome'}</span>
                </div>
              )}
            </div>
          )}

          {currentUser && (
            <button
              onClick={() => {
                if (confirm('Deseja realmente sair e trocar de perfil?')) {
                  logout();
                }
              }}
              title={isCollapsed ? 'Trocar Perfil' : ''}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut size={18} className="shrink-0" />
              {!isCollapsed && <span>Sair / Perfis</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
