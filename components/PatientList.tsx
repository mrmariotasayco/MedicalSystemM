import React, { useState, useMemo } from 'react';
import { Patient, BedData, CarePlanData } from '../types';
import { Search, UserPlus, Eye, Edit2, Trash2, Users, AlertTriangle, Bed, PlusCircle, X, Droplet, Calendar, Activity, Save, MapPin, Building } from 'lucide-react';

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
  // State for the new Dropdown logic
  const [selectedPavilion, setSelectedPavilion] = useState<string>('');
  
  // New Care Plan Form State within Assignment
  const [carePlanForm, setCarePlanForm] = useState<CarePlanData>({
      hgt1400: '', hgt2200: '', hgt0600: '',
      catheterType: '', needleSize: '', nasogastricSonde: '', foleySonde: '', oxygenMode: '',
      venoclysis: false, microdropper: false, tripleWayCode: false
  });

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableBeds = useMemo(() => beds.filter(b => b.status === 'available'), [beds]);
  
  // 1. Get Unique Pavilions that have available beds
  const availablePavilions = useMemo(() => {
      const pavs = new Set(availableBeds.map(b => b.pabellon || 'General'));
      // Sort logically (Pabellon 1 I, Pabellon 1 II, etc)
      return Array.from(pavs).sort();
  }, [availableBeds]);

  // 2. Get Beds for Selected Pavilion
  const availableBedsInPavilion = useMemo(() => {
      if (!selectedPavilion) return [];
      return availableBeds
        .filter(b => (b.pabellon || 'General') === selectedPavilion)
        .sort((a, b) => a.id - b.id);
  }, [availableBeds, selectedPavilion]);

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
          const bedPayload: Partial<BedData> = {
              id: selectedBedId,
              carePlan: carePlanForm
          };
          onAssignBed(assigningPatient, bedPayload);
          setAssigningPatient(null);
          setSelectedBedId(null);
          setSelectedPavilion('');
          setCarePlanForm({
            hgt1400: '', hgt2200: '', hgt0600: '',
            catheterType: '', needleSize: '', nasogastricSonde: '', foleySonde: '', oxygenMode: '',
            venoclysis: false, microdropper: false, tripleWayCode: false
          });
      }
  };

  const cancelAssignment = () => {
      setAssigningPatient(null);
      setSelectedBedId(null);
      setSelectedPavilion('');
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
                  Pabellón
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Cama
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const assignedBedInfo = beds.find(b => b.id === patient.bedId);
                  
                  return (
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
                    {/* New Pavilion Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        {assignedBedInfo ? (
                             <div className="flex items-center text-sm text-slate-600">
                                <MapPin size={14} className="mr-1.5 text-slate-400" />
                                <span className="font-medium">{assignedBedInfo.pabellon || 'General'}</span>
                             </div>
                        ) : (
                            <span className="text-xs text-slate-400 italic">No asignado</span>
                        )}
                    </td>
                    {/* Bed Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        {assignedBedInfo ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                <Bed size={12} className="mr-1" /> {assignedBedInfo.bedLabel}
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
                )})
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
                    {/* STEP 1: CARE PLAN FORM (SIMPLIFIED) */}
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">1. Configuración Inicial (HGT)</h4>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <h5 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Activity size={18} /> Monitoreo Hemoglucotest
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
                        </div>
                    </div>

                    {/* STEP 2: SELECT BED (DROPDOWN LOGIC) */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">2. Seleccionar Cama Disponible</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* PAVILION SELECTOR */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pabellón</label>
                                <div className="relative">
                                    <select
                                        value={selectedPavilion}
                                        onChange={(e) => {
                                            setSelectedPavilion(e.target.value);
                                            setSelectedBedId(null); // Reset bed when pavilion changes
                                        }}
                                        className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium disabled:bg-slate-100 disabled:text-slate-400"
                                        disabled={availablePavilions.length === 0}
                                    >
                                        <option value="">-- Seleccionar Pabellón --</option>
                                        {availablePavilions.map(pav => (
                                            <option key={pav} value={pav}>{pav}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                        <Building size={16} />
                                    </div>
                                </div>
                                {availablePavilions.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">No hay pabellones con camas disponibles.</p>
                                )}
                            </div>

                            {/* BED SELECTOR (Dependent on Pavilion) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cama</label>
                                <div className="relative">
                                    <select
                                        value={selectedBedId || ''}
                                        onChange={(e) => setSelectedBedId(Number(e.target.value))}
                                        className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium disabled:bg-slate-100 disabled:text-slate-400"
                                        disabled={!selectedPavilion}
                                    >
                                        <option value="">-- Seleccionar Cama --</option>
                                        {availableBedsInPavilion.map(bed => (
                                            <option key={bed.id} value={bed.id}>{bed.bedLabel}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                        <Bed size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
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
