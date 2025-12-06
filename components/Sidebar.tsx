import React from 'react';
import { ClipboardList, Activity, FlaskConical, Stethoscope, User, LogOut, ArrowLeft, Settings } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onLogout: () => void;
  onBackToDashboard: () => void;
  onOpenProfile: () => void;
  patientName?: string;
  doctorName?: string; // New prop for dynamic user name
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout, onBackToDashboard, onOpenProfile, patientName, doctorName }) => {
  const navItems = [
    { id: 'history', label: 'Historia Clínica', icon: ClipboardList },
    { id: 'evolution', label: 'Evoluciones', icon: Activity },
    { id: 'results', label: 'Laboratorio', icon: FlaskConical },
  ];

  return (
    <div className="flex flex-col w-64 bg-slate-900 text-slate-100 h-screen transition-all">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="p-2 bg-blue-600 rounded-lg shrink-0">
            <Stethoscope size={24} className="text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight leading-tight">MedicalMarioLT</span>
      </div>

      <div className="p-4">
        <button 
            onClick={onBackToDashboard}
            className="w-full flex items-center space-x-2 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all mb-4 border border-slate-700/50"
        >
            <ArrowLeft size={18} />
            <span className="font-medium text-sm">Volver al Dashboard</span>
        </button>

        {patientName && (
            <div className="px-4 py-2 mb-4 bg-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Paciente Actual</span>
                <p className="font-medium text-white truncate text-sm mt-1">{patientName}</p>
            </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
                <button
                    key={item.id}
                    onClick={() => onChangeView(item.id as ViewState)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                </button>
            );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div 
            onClick={onOpenProfile}
            className="flex items-center space-x-3 px-4 py-3 text-slate-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg mb-2 cursor-pointer transition-colors group relative"
            title="Configuración de Perfil"
        >
            <div className="p-1.5 bg-slate-700 group-hover:bg-slate-600 rounded-full transition-colors">
                <User size={16} className="text-slate-300" />
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
                <span className="text-sm font-bold text-white truncate">{doctorName || 'Dr. Admin'}</span>
                <span className="text-[10px] uppercase tracking-wide opacity-70">Médico Tratante</span>
            </div>
            <Settings size={14} className="text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all absolute right-2 top-1/2 -translate-y-1/2" />
        </div>
        <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 mt-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors text-sm font-medium border border-transparent hover:border-red-500/20"
        >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};