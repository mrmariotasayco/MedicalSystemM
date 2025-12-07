import React from 'react';
import { Patient } from '../types';
import { User, Calendar, Droplet, Phone, UserCog, AlertTriangle, FileText } from 'lucide-react';

interface AffiliationDataProps {
  patient: Patient;
  onEditPatientProfile: () => void;
}

export const AffiliationData: React.FC<AffiliationDataProps> = ({ patient, onEditPatientProfile }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="mb-4">
        <h2 className="text-3xl font-bold text-slate-800">Datos de Filiación</h2>
        <p className="text-slate-500">Información demográfica y antecedentes del paciente.</p>
      </header>

      {/* Patient Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                        <User size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold">{patient.name}</h3>
                        <p className="opacity-70 text-sm">ID Paciente: {patient.id}</p>
                    </div>
                </div>
                <button onClick={onEditPatientProfile} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white flex items-center space-x-2">
                    <UserCog size={20} />
                    <span className="text-sm font-medium hidden md:inline">Editar Perfil</span>
                </button>
            </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start space-x-3">
                <Calendar className="text-blue-500 mt-1" size={20} />
                <div><p className="text-sm text-slate-500">Fecha de Nacimiento</p><p className="font-semibold text-slate-800">{patient.dob}</p></div>
            </div>
            <div className="flex items-start space-x-3">
                <User className="text-blue-500 mt-1" size={20} />
                <div><p className="text-sm text-slate-500">Género</p><p className="font-semibold text-slate-800">{patient.gender}</p></div>
            </div>
            <div className="flex items-start space-x-3">
                <Droplet className="text-red-500 mt-1" size={20} />
                <div><p className="text-sm text-slate-500">Grupo Sanguíneo</p><p className="font-semibold text-slate-800">{patient.bloodType}</p></div>
            </div>
            <div className="flex items-start space-x-3">
                <Phone className="text-green-500 mt-1" size={20} />
                <div><p className="text-sm text-slate-500">Contacto</p><p className="font-semibold text-slate-800">{patient.contact}</p></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center space-x-2 mb-4"><AlertTriangle className="text-amber-500" /><h4 className="text-lg font-bold text-slate-800">Alergias Conocidas</h4></div>
            <div className="flex flex-wrap gap-2">
                {patient.allergies.length > 0 ? patient.allergies.map((allergy, idx) => (
                    <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium">{allergy}</span>
                )) : <span className="text-slate-400 italic text-sm">No registra alergias.</span>}
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center space-x-2 mb-4"><FileText className="text-blue-500" /><h4 className="text-lg font-bold text-slate-800">Antecedentes Patológicos</h4></div>
            <ul className="space-y-2">
                {patient.chronicConditions.length > 0 ? patient.chronicConditions.map((condition, idx) => (
                    <li key={idx} className="flex items-center text-slate-700"><span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>{condition}</li>
                )) : <li className="text-slate-400 italic text-sm">No registra enfermedades crónicas.</li>}
            </ul>
        </div>
      </div>
    </div>
  );
};
