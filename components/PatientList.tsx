import React, { useState } from 'react';
import { Patient, BedData, CarePlanData } from '../types';
import { Search, UserPlus, Eye, Edit2, Trash2, Users, AlertTriangle, Bed, PlusCircle, X, Droplet, Calendar, Activity, Save } from 'lucide-react';

interface PatientListProps {
  patients: Patient[];
  beds: BedData[];
  onSelectPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (id: string) => void;
  onAddPatient: () => void;
  onViewBeds: () => void;
  onAssignBed: (patient: Patient, bedData: Partial<BedData>) => void;
}

export const PatientList: React.FC<PatientListProps> = ({ 
  patients, 
  beds,
  onSelectPatient, 
  onEditPatient, 
  onDeletePatient,
  onAddPatient,
  onViewBeds,
  onAssignBed
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  
  // Assignment Flow State
  const [assigningPatient, setAssigningPatient] = useState<Patient | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  
  // New Care Plan Form State within Assignment
  const [carePlanForm, setCarePlanForm] = useState<CarePlanData>({
      hgt1400: '', hgt2200: '', hgt0600: '',
      catheterType: '18', needleSize: '21', nasogastricSonde: '', foleySonde: '', oxygenMode: '',
      venoclysis: true, microdropper: false, tripleWayCode: true
  });

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableBeds = beds.filter(b => b.status === 'available');

  const handleConfirmDelete = () => {
    if (patientToDelete) {
      onDeletePatient(patientToDelete.id);
      setPatientToDelete(null);
    }
  };

  const handleUpdateCarePlan = (field: keyof CarePlanData, value: any) => {
      setCarePlanForm(prev => ({ ...prev, [field]: value }));
  };

  const finalizeAssignment = () => {
      if (assigningPatient && selectedBedId) {
          // Construct the payload including the care plan
          const bedPayload: Partial<BedData> = {
              id: selectedBedId,
              carePlan: carePlanForm
              // The parent App.tsx handles pulling the diagnosis/summary from patient history
          };
          onAssignBed(assigningPatient, bedPayload);
          
          // Reset
          setAssigningPatient(null);
          setSelectedBedId(null);
          setCarePlanForm({
            hgt1400: '', hgt2200: '', hgt0600: '',
            catheterType: '18', needleSize: '21', nasogastricSonde: '', foleySonde: '', oxygenMode: '',
            venoclysis: true, microdropper: false, tripleWayCode: true
          });
      }
  };

  const cancelAssignment = () => {
      setAssigningPatient(null);
      setSelectedBedId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Dashboard de Pacientes</h2>
          <p className="text-slate-500">Gestión general de registros clínicos MedicalMarioLT.</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
             <button 
                onClick={onViewBeds}
                className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg transition-colors shadow-sm font-medium"
            >
                <Bed size={20} />
                <span>Camas Disponibles</span>
            </button>
            <button 
                onClick={onAddPatient}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg transition-colors shadow-sm font-medium"
            >
                <UserPlus size={20} />
                <span>Registrar Paciente</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Paciente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Género
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sangre
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  F. Nacimiento
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                          <Users size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900">{patient.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="text-sm text-slate-700">{patient.gender}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                            <Droplet size={10} className="mr-1" />
                            {patient.bloodType}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-500">
                            <Calendar size={14} className="mr-1.5 text-slate-400" />
                            {patient.dob}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {patient.contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        {patient.bedId ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <Bed size={12} className="mr-1" /> Cama {patient.bedId}
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                Sin Asignar
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {!patient.bedId && (
                            <button 
                                onClick={() => setAssigningPatient(patient)}
                                className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 p-2 rounded-lg transition-colors inline-flex items-center"
                                title="Asignar Cama"
                            >
                                <Bed size={18} />
                                <PlusCircle size={10} className="-ml-1 -mt-2" />
                            </button>
                        )}
                      <button 
                        onClick={() => onSelectPatient(patient)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg transition-colors inline-flex items-center"
                        title="Ver Historia Clínica"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => onEditPatient(patient)}
                        className="text-amber-600 hover:text-amber-900 bg-amber-50 p-2 rounded-lg transition-colors inline-flex items-center"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setPatientToDelete(patient)}
                        className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg transition-colors inline-flex items-center"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron pacientes que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {patientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Paciente?</h3>
              <p className="text-slate-600 mb-6">
                Está a punto de eliminar el registro de <span className="font-semibold text-slate-800">{patientToDelete.name}</span>. 
                Esta acción no se puede deshacer y se perderán todos sus datos asociados.
              </p>
              
              <div className="flex space-x-3 justify-center">
                <button 
                  onClick={() => setPatientToDelete(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-lg shadow-red-600/30"
                >
                  <Trash2 size={18} className="mr-2" />
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Bed Wizard Modal */}
      {assigningPatient && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                     <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Bed className="text-blue-600" /> Ingreso Hospitalario
                        </h3>
                        <p className="text-sm text-slate-500">Paciente: <span className="font-bold">{assigningPatient.name}</span></p>
                     </div>
                    <button onClick={cancelAssignment} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {/* STEP 1: CARE PLAN FORM (MOVED TO TOP) */}
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">1. Configuración Inicial de Cuidados</h4>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <h5 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Activity size={18} /> Insumos y Monitoreo (Datos para Receta)
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HGT 14:00</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={carePlanForm.hgt1400} onChange={e => handleUpdateCarePlan('hgt1400', e.target.value)} placeholder="mg%" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HGT 22:00</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={carePlanForm.hgt2200} onChange={e => handleUpdateCarePlan('hgt2200', e.target.value)} placeholder="mg%" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HGT 06:00</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={carePlanForm.hgt0600} onChange={e => handleUpdateCarePlan('hgt0600', e.target.value)} placeholder="mg%" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catéter (No.)</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={carePlanForm.catheterType} onChange={e => handleUpdateCarePlan('catheterType', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aguja (No.)</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={carePlanForm.needleSize} onChange={e => handleUpdateCarePlan('needleSize', e.target.value)} />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 mt-4 p-3 bg-white rounded-lg border border-slate-100">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={carePlanForm.venoclysis} onChange={e => handleUpdateCarePlan('venoclysis', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Equipo Venoclisis</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={carePlanForm.tripleWayCode} onChange={e => handleUpdateCarePlan('tripleWayCode', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Llave Triple Vía</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={carePlanForm.microdropper} onChange={e => handleUpdateCarePlan('microdropper', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Microgotero</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: SELECT BED (MOVED TO BOTTOM) */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">2. Seleccionar Cama Disponible</h4>
                        {availableBeds.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {availableBeds.map(bed => (
                                    <button
                                        key={bed.id}
                                        onClick={() => setSelectedBedId(bed.id)}
                                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                                            selectedBedId === bed.id 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' 
                                            : 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300'
                                        }`}
                                    >
                                        <Bed size={32} className={`mb-2 ${selectedBedId === bed.id ? 'text-white' : 'text-emerald-600'}`} />
                                        <span className={`font-bold ${selectedBedId === bed.id ? 'text-white' : 'text-emerald-800'}`}>Cama {bed.id}</span>
                                        <span className={`text-xs ${selectedBedId === bed.id ? 'text-blue-100' : 'text-emerald-600'}`}>Disponible</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-amber-50 rounded-lg border border-amber-200">
                                <AlertTriangle size={24} className="mx-auto text-amber-500 mb-1" />
                                <p className="text-slate-800 font-bold text-sm">No hay camas disponibles.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                    <button onClick={cancelAssignment} className="px-5 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={finalizeAssignment}
                        disabled={!selectedBedId}
                        className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} className="mr-2" />
                        Confirmar Ingreso
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};