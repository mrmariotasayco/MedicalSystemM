import React, { useState } from 'react';
import { X, Save, User, Mail, Shield, AlertCircle, Phone, Award, FileBadge, Trash2, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../services/authService';

interface UserProfileModalProps {
  user: UserProfile;
  onSave: (fullName: string, specialty: string, licenseNumber: string, phone: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onSave, onDelete, onClose }) => {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [specialty, setSpecialty] = useState(user.specialty || '');
  const [licenseNumber, setLicenseNumber] = useState(user.licenseNumber || '');
  const [phone, setPhone] = useState(user.phone || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
        await onSave(fullName, specialty, licenseNumber, phone);
    } catch (err: any) {
        setError(err.message || "Error al guardar");
        setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
      setIsLoading(true);
      try {
          await onDelete();
      } catch (err: any) {
          setError(err.message || "Error al eliminar cuenta");
          setIsLoading(false);
          setShowDeleteConfirm(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="text-blue-600" /> Perfil de Usuario
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3 border-4 border-white shadow-lg">
                        {fullName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{user.role}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Su nombre"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Especialidad</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Award size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej. Cardiología"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cédula Prof.</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FileBadge size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={licenseNumber}
                                onChange={(e) => setLicenseNumber(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Num. Licencia"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="+52 ..."
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2 border border-red-100">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="pt-2 flex justify-end space-x-3 border-t border-slate-100 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center shadow-md disabled:opacity-70"
                    >
                        <Save size={18} className="mr-2" />
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>

            {/* Danger Zone */}
            <div className="border-t-2 border-red-100 pt-6 mt-6">
                <h4 className="text-red-700 font-bold mb-2">Zona de Peligro</h4>
                <div className="bg-red-50 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-red-800 font-medium">Eliminar Cuenta de Usuario</p>
                        <p className="text-xs text-red-600 mt-1">Esta acción es irreversible. Se eliminará su acceso y perfil.</p>
                    </div>
                    <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold shadow-sm flex items-center"
                    >
                        <Trash2 size={16} className="mr-2" /> Eliminar
                    </button>
                </div>
            </div>
        </div>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
            <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">¿Estás absolutamente seguro?</h3>
                <p className="text-slate-600 mb-6 max-w-xs">
                    Su cuenta será eliminada permanentemente. No podrá recuperar su perfil ni su historial personal.
                </p>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleDeleteAccount}
                        className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-lg shadow-red-600/30"
                    >
                        {isLoading ? 'Eliminando...' : 'Sí, Eliminar Cuenta'}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};