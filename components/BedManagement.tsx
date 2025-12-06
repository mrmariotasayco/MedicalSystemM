import React, { useState } from 'react';
import { Bed, ArrowLeft, Activity, ClipboardList, FlaskConical, CheckCircle2, User, Thermometer, FileText, History, UserPlus, LogOut, Save, X, Edit3, Trash2, Plus, AlertTriangle, Hash, AlignLeft, Tag } from 'lucide-react';
import { BedData, DischargedPatient, LabSection, LabMetric, CarePlanData } from '../types';

interface BedManagementProps {
  beds: BedData[];
  history: DischargedPatient[];
  onBack: () => void;
  onUpdateBed: (bed: BedData) => void;
  onDischarge: (bed: BedData) => void;
}

export const BedManagement: React.FC<BedManagementProps> = ({ beds, history, onBack, onUpdateBed, onDischarge }) => {
  
  // UI State
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<DischargedPatient | null>(null);
  
  // Discharge Confirmation State
  const [bedToDischarge, setBedToDischarge] = useState<BedData | null>(null);

  // Form State for Edit/Create
  const [formData, setFormData] = useState<Partial<BedData>>({});
  const [tempSummary, setTempSummary] = useState('');
  const [tempPlan, setTempPlan] = useState('');

  // --- HANDLERS ---

  const handleOpenBed = (bed: BedData) => {
    setSelectedBed(bed);
    // Initialize form data
    setFormData(JSON.parse(JSON.stringify(bed))); // Deep copy
    setTempSummary(bed.clinicalSummary?.join('\n') || '');
    setTempPlan(bed.plan?.join('\n') || '');
    
    // If bed is available, go straight to edit mode (Registration)
    if (bed.status === 'available') {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedBed(null);
    setIsEditing(false);
    setFormData({});
  };

  const handleSave = () => {
    if (!selectedBed) return;

    // Process textareas back to arrays
    const updatedBed: BedData = {
      ...selectedBed, // Keep original ID and structure
      ...formData,    // Overwrite with form data
      id: selectedBed.id, // Ensure ID is never overwritten by empty form data
      status: 'occupied', // Ensure it's marked occupied if we save
      clinicalSummary: tempSummary.split('\n').filter(line => line.trim() !== ''),
      plan: tempPlan.split('\n').filter(line => line.trim() !== ''),
      // Ensure lab sections exist
      labSections: formData.labSections || []
    } as BedData;

    onUpdateBed(updatedBed);
    setSelectedBed(updatedBed); // Update local view
    setIsEditing(false);
  };

  const updateCarePlan = (field: keyof CarePlanData, value: any) => {
      setFormData(prev => ({
          ...prev,
          carePlan: { ...(prev.carePlan || {} as CarePlanData), [field]: value }
      }));
  };

  const initiateDischarge = () => {
    if (selectedBed && selectedBed.status === 'occupied') {
        setBedToDischarge(selectedBed);
    }
  };

  const confirmDischarge = () => {
    if (!bedToDischarge) return;
    onDischarge(bedToDischarge);
    setBedToDischarge(null);
    handleCloseModal();
  };

  // Helper to manage Lab Sections in Form
  const addLabSection = () => {
    const newSection: LabSection = {
        title: 'Nuevo Reporte',
        date: new Date().toISOString().split('T')[0],
        metrics: [{ name: '', value: '', type: 'quantitative', category: 'Bioquímica' }]
    };
    setFormData(prev => ({
        ...prev,
        labSections: [...(prev.labSections || []), newSection]
    }));
  };

  const updateLabSection = (index: number, field: keyof LabSection, value: any) => {
      const sections = [...(formData.labSections || [])];
      sections[index] = { ...sections[index], [field]: value };
      setFormData(prev => ({ ...prev, labSections: sections }));
  };

  const updateLabMetric = (sectionIndex: number, metricIndex: number, field: keyof LabMetric, value: any) => {
      const sections = [...(formData.labSections || [])];
      const metrics = [...sections[sectionIndex].metrics];
      metrics[metricIndex] = { ...metrics[metricIndex], [field]: value };
      sections[sectionIndex].metrics = metrics;
      setFormData(prev => ({ ...prev, labSections: sections }));
  };

  const addMetricToSection = (sectionIndex: number) => {
      const sections = [...(formData.labSections || [])];
      sections[sectionIndex].metrics.push({ name: '', value: '', type: 'quantitative', category: 'Bioquímica' });
      setFormData(prev => ({ ...prev, labSections: sections }));
  };

  const deleteLabSection = (index: number) => {
      const sections = [...(formData.labSections || [])];
      sections.splice(index, 1);
      setFormData(prev => ({ ...prev, labSections: sections }));
  };

  // --- RENDER HELPERS ---

  const renderLabForm = () => (
      <div className="space-y-4">
          <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-slate-700">Secciones de Laboratorio</label>
              <button 
                type="button"
                onClick={addLabSection}
                className="text-xs flex items-center bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
              >
                  <Plus size={14} className="mr-1" /> Agregar Sección
              </button>
          </div>
          {formData.labSections?.map((section, sIdx) => (
              <div key={sIdx} className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative">
                  <button 
                    onClick={() => deleteLabSection(sIdx)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                  >
                      <Trash2 size={16} />
                  </button>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                      <input 
                        type="text" 
                        placeholder="Título (ej. Post Hemodiálisis)"
                        value={section.title}
                        onChange={(e) => updateLabSection(sIdx, 'title', e.target.value)}
                        className="p-2 border rounded text-sm font-bold"
                      />
                      <input 
                        type="date" 
                        value={section.date}
                        onChange={(e) => updateLabSection(sIdx, 'date', e.target.value)}
                        className="p-2 border rounded text-sm"
                      />
                  </div>
                  <div className="space-y-3">
                      {section.metrics.map((metric, mIdx) => (
                          <div key={mIdx} className="flex flex-col md:flex-row gap-2 items-start bg-white p-2 rounded border border-slate-100">
                               {/* Row 1: Type & Category */}
                               <div className="flex flex-col gap-1 w-full md:w-auto">
                                   <select
                                        value={metric.type || 'quantitative'}
                                        onChange={(e) => updateLabMetric(sIdx, mIdx, 'type', e.target.value)}
                                        className="text-xs p-2 border rounded bg-slate-50 w-full md:w-24 shrink-0"
                                    >
                                        <option value="quantitative">Numérico</option>
                                        <option value="qualitative">Texto</option>
                                    </select>
                                    <select
                                        value={metric.category || 'Bioquímica'}
                                        onChange={(e) => updateLabMetric(sIdx, mIdx, 'category', e.target.value)}
                                        className="text-xs p-2 border rounded bg-slate-50 w-full md:w-24 shrink-0"
                                        title="Categoría"
                                    >
                                        <option value="Bioquímica">Bioquímica</option>
                                        <option value="Hematología">Hematología</option>
                                        <option value="Inmunología">Inmunología</option>
                                        <option value="Microbiología">Microbiología</option>
                                        <option value="Patología">Patología</option>
                                    </select>
                               </div>
                              
                              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
                                <input 
                                    type="text" 
                                    placeholder="Métrica (ej. Glucosa)"
                                    value={metric.name}
                                    onChange={(e) => updateLabMetric(sIdx, mIdx, 'name', e.target.value)}
                                    className="p-2 border rounded text-xs w-full"
                                />
                                <input 
                                    type="text" 
                                    placeholder={metric.type === 'qualitative' ? "Ej. Positivo" : "Ej. 100 mg/dL"}
                                    value={metric.value}
                                    onChange={(e) => updateLabMetric(sIdx, mIdx, 'value', e.target.value)}
                                    className="p-2 border rounded text-xs w-full"
                                />
                                <input 
                                    type="text" 
                                    placeholder="Ref. (Ej. 70-100)"
                                    value={metric.reference || ''}
                                    onChange={(e) => updateLabMetric(sIdx, mIdx, 'reference', e.target.value)}
                                    className="p-2 border rounded text-xs w-full col-span-2 md:col-span-1"
                                />
                              </div>
                              <label className="flex items-center space-x-1 cursor-pointer mt-2 md:mt-2 shrink-0">
                                  <input 
                                    type="checkbox" 
                                    checked={metric.isAbnormal}
                                    onChange={(e) => updateLabMetric(sIdx, mIdx, 'isAbnormal', e.target.checked)}
                                    className="w-4 h-4 text-red-600"
                                  />
                                  <span className="text-[10px] text-red-600 font-bold">!</span>
                              </label>
                          </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => addMetricToSection(sIdx)}
                        className="text-xs text-blue-500 hover:underline mt-1"
                      >
                          + Agregar métrica
                      </button>
                  </div>
              </div>
          ))}
      </div>
  );

  const renderDetailContent = (data: BedData | DischargedPatient) => (
    <div className="space-y-8">
        {/* 1. Resumen Clínico */}
        <section>
            <div className="flex items-center space-x-2 mb-4 text-blue-800">
                <FileText size={20} />
                <h4 className="text-lg font-bold">Resumen Clínico</h4>
            </div>
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 text-slate-700 shadow-sm">
                <ul className="list-disc list-inside space-y-2">
                    {data.clinicalSummary?.map((line, idx) => (
                        <li key={idx} className="leading-relaxed">{line}</li>
                    )) || <li className="italic text-slate-400">Sin resumen registrado.</li>}
                </ul>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 2. Plan / Pendientes */}
            <section>
                    <div className="flex items-center space-x-2 mb-4 text-emerald-800">
                    <ClipboardList size={20} />
                    <h4 className="text-lg font-bold">Plan Médico</h4>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full">
                    <ul className="divide-y divide-slate-100">
                        {data.plan?.map((item, idx) => (
                            <li key={idx} className="p-4 flex items-start space-x-3 hover:bg-slate-50 transition-colors">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                                <span className="text-slate-700 text-sm font-medium">{item}</span>
                            </li>
                        )) || <li className="p-4 text-slate-400 italic">Sin plan registrado.</li>}
                    </ul>
                </div>
            </section>

            {/* 3. Laboratorio Detallado */}
            <section className="mt-6 lg:mt-0">
                <div className="flex items-center space-x-2 mb-4 text-indigo-800">
                    <FlaskConical size={20} />
                    <h4 className="text-lg font-bold">Laboratorio Reciente</h4>
                </div>
                <div className="space-y-4">
                    {data.labSections?.map((section, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-bold text-slate-700 text-sm">{section.title}</span>
                                <div className="flex items-center text-xs text-slate-400">
                                    <Thermometer size={12} className="mr-1" />
                                    {section.date}
                                </div>
                            </div>
                            {/* Table Header for metrics - Updated cols */}
                            <div className="grid grid-cols-12 bg-slate-50/50 px-4 py-1 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                <div className="col-span-3">Examen</div>
                                <div className="col-span-2">Categoría</div>
                                <div className="col-span-3">Resultado</div>
                                <div className="col-span-2">Referencia</div>
                                <div className="col-span-2 text-right">Estado</div>
                            </div>
                            <div className="p-0">
                                {section.metrics.map((metric, mIdx) => (
                                    <div key={mIdx} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                                        <div className="col-span-3">
                                            <div className="text-xs text-slate-700 font-bold">{metric.name}</div>
                                            <div className={`text-[9px] px-1 py-0.5 rounded inline-block mt-0.5 ${
                                                metric.type === 'qualitative' 
                                                ? 'bg-purple-50 text-purple-700' 
                                                : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                {metric.type === 'qualitative' ? 'Cualit.' : 'Cuantit.'}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex items-center text-slate-500">
                                                <Tag size={10} className="mr-1 opacity-50" />
                                                <span className="text-[10px] font-medium">{metric.category || 'General'}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                             <span className={`text-sm font-medium ${metric.isAbnormal ? 'text-red-600' : 'text-slate-800'} ${metric.type === 'qualitative' ? 'italic' : ''} break-words block`}>
                                                {metric.value}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-xs text-slate-500">
                                            {metric.reference || '-'}
                                        </div>
                                        <div className="col-span-2 text-right">
                                            {metric.isAbnormal ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                                    Anormal
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                                    Normal
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) || <div className="text-slate-400 italic">Sin resultados registrados.</div>}
                </div>
            </section>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in p-6">
      {/* Header and Grid remain same as previous... */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* ... (Same Header) ... */}
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Bed className="text-blue-600" size={32} />
              Gestión de Camas Hospitalarias
            </h2>
            <p className="text-slate-500">Control de ocupación, ingresos y altas médicas.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
             <button onClick={() => setShowHistory(true)} className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm">
                <History size={18} />
                <span className="font-medium hidden sm:inline">Historial de Altas</span>
             </button>
             <div className="flex space-x-2 text-sm font-medium">
                <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span><span className="text-slate-700">{beds.filter(b => b.status === 'occupied').length} Ocupadas</span>
                </div>
                <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-slate-700">{beds.filter(b => b.status === 'available').length} Disponibles</span>
                </div>
            </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
        {beds.map((bed) => (
          <div key={bed.id} className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden group ${bed.status === 'occupied' ? 'bg-white border-red-100 hover:border-red-300 shadow-sm' : 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-300 border-dashed'}`}>
            <div className={`px-4 py-2 flex justify-between items-center text-sm font-bold ${bed.status === 'occupied' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <span>Cama {bed.id}</span>
              {bed.status === 'occupied' ? <Activity size={16} /> : <CheckCircle2 size={16} />}
            </div>
            <div className="p-5 min-h-[160px] flex flex-col">
              {bed.status === 'occupied' ? (
                <>
                  <div className="flex-1">
                    <div className="flex items-start space-x-2 text-slate-800 font-bold mb-2"><User size={18} className="text-slate-400 shrink-0 mt-0.5" /><span className="line-clamp-2 leading-tight">{bed.patientName}</span></div>
                    <div className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-md font-medium mb-3 border border-blue-200 line-clamp-1">{bed.condition || 'Sin diagnóstico'}</div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">Ingreso: {bed.admissionDate}</span>
                    <button onClick={() => handleOpenBed(bed)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors shadow-sm">Gestionar</button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-emerald-600/60 py-4">
                    <Bed size={40} strokeWidth={1.5} className="mb-2" /><span className="font-medium text-sm mb-4">Disponible</span>
                    <button onClick={() => handleOpenBed(bed)} className="flex items-center space-x-1 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-bold"><UserPlus size={16} /><span>Ocupar</span></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* BED DETAIL / EDIT MODAL */}
      {selectedBed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto animate-fade-in flex flex-col">
            
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start sticky top-0 z-20">
              <div className="flex items-start space-x-4">
                 <div className={`p-3 border rounded-xl shadow-sm text-center min-w-[80px] ${selectedBed.status === 'occupied' ? 'bg-white border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <span className="block text-xs text-slate-400 font-bold uppercase">Cama</span>
                    <span className={`block text-3xl font-bold ${selectedBed.status === 'occupied' ? 'text-red-600' : 'text-emerald-600'}`}>{selectedBed.id}</span>
                 </div>
                 <div>
                    {isEditing || selectedBed.status === 'available' ? (
                        <h3 className="text-2xl font-bold text-slate-800">{selectedBed.status === 'available' ? 'Registrar Ingreso de Paciente' : 'Editar Datos Clínicos'}</h3>
                    ) : (
                        <>
                            <h3 className="text-2xl font-bold text-slate-800">{selectedBed.patientName}</h3>
                            <div className="flex items-center space-x-2 mt-1"><span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-sm font-bold border border-blue-200">{selectedBed.condition}</span><span className="text-slate-500 text-sm">| Ingreso: {selectedBed.admissionDate}</span></div>
                        </>
                    )}
                 </div>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto">
                {isEditing ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Paciente</label>
                                <input type="text" value={formData.patientName || ''} onChange={e => setFormData({...formData, patientName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Ingreso</label>
                                <input type="date" value={formData.admissionDate || ''} onChange={e => setFormData({...formData, admissionDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico / Condición</label>
                                <input type="text" value={formData.condition || ''} onChange={e => setFormData({...formData, condition: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Resumen Clínico (Cada línea será una viñeta)</label>
                            <textarea rows={4} value={tempSummary} onChange={e => setTempSummary(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg resize-y" placeholder="- Paciente masculino..." />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Plan Médico (Cada línea será un pendiente)</label>
                            <textarea rows={4} value={tempPlan} onChange={e => setTempPlan(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg resize-y" placeholder="- Dieta blanda..." />
                        </div>

                        {/* --- CARE PLAN INPUTS ADDED HERE FOR EDITING --- */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mt-6">
                            <h5 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Activity size={18} /> Insumos y Monitoreo (Datos para Receta)
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HGT 14:00</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.carePlan?.hgt1400 || ''} onChange={e => updateCarePlan('hgt1400', e.target.value)} placeholder="mg%" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HGT 22:00</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.carePlan?.hgt2200 || ''} onChange={e => updateCarePlan('hgt2200', e.target.value)} placeholder="mg%" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HGT 06:00</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.carePlan?.hgt0600 || ''} onChange={e => updateCarePlan('hgt0600', e.target.value)} placeholder="mg%" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catéter (No.)</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.carePlan?.catheterType || ''} onChange={e => updateCarePlan('catheterType', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aguja (No.)</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.carePlan?.needleSize || ''} onChange={e => updateCarePlan('needleSize', e.target.value)} />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 mt-4 p-3 bg-white rounded-lg border border-slate-100">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.carePlan?.venoclysis || false} onChange={e => updateCarePlan('venoclysis', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Equipo Venoclisis</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.carePlan?.tripleWayCode || false} onChange={e => updateCarePlan('tripleWayCode', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Llave Triple Vía</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.carePlan?.microdropper || false} onChange={e => updateCarePlan('microdropper', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Microgotero</span>
                                </label>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6 mt-6">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <FlaskConical size={20} /> Datos de Laboratorio
                            </h4>
                            {renderLabForm()}
                        </div>
                    </div>
                ) : (
                    // VIEW MODE
                    selectedBed && renderDetailContent(selectedBed)
                )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-20">
                {isEditing ? (
                    <>
                        <button onClick={() => selectedBed.status === 'available' ? handleCloseModal() : setIsEditing(false)} className="px-5 py-2.5 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium">Cancelar</button>
                        <button onClick={handleSave} className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center shadow-md"><Save size={18} className="mr-2" /> Guardar Cambios</button>
                    </>
                ) : (
                    <>
                         <button onClick={() => setIsEditing(true)} className="mr-auto px-5 py-2.5 text-slate-700 bg-white border border-slate-300 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 rounded-lg font-medium flex items-center transition-colors"><Edit3 size={18} className="mr-2" /> Editar Datos</button>
                        <button onClick={handleCloseModal} className="px-5 py-2.5 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium">Cerrar</button>
                        <button onClick={initiateDischarge} className="px-5 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium flex items-center shadow-md shadow-red-200"><LogOut size={18} className="mr-2" /> Dar de Alta</button>
                    </>
                )}
            </div>

          </div>
        </div>
      )}

      {bedToDischarge && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-red-600" size={32} /></div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Confirmar Alta Médica?</h3>
              <p className="text-slate-600 mb-6">Está a punto de dar de alta al paciente <span className="font-semibold text-slate-800">{bedToDischarge.patientName}</span> de la Cama {bedToDischarge.id}.<br /><br />Esta acción liberará la cama inmediatamente y guardará el registro en el historial.</p>
              <div className="flex space-x-3 justify-center">
                <button onClick={() => setBedToDischarge(null)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={confirmDischarge} className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-lg shadow-red-600/30"><LogOut size={18} className="mr-2" /> Confirmar Alta</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modals remain unchanged... */}
      {showHistory && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History className="text-blue-600" /> Historial de Altas</h3>
                    <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {history.length > 0 ? (
                        <div className="space-y-3">
                            {history.map((patient, idx) => (
                                <div key={idx} onClick={() => setSelectedHistoryItem(patient)} className="p-4 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all flex justify-between items-center group">
                                    <div><h4 className="font-bold text-slate-800 group-hover:text-blue-700">{patient.patientName}</h4><p className="text-sm text-slate-500">{patient.condition}</p></div>
                                    <div className="text-right"><div className="text-xs font-bold text-slate-400 uppercase">Fecha Alta</div><div className="text-slate-700">{patient.dischargeDate}</div></div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="text-center py-12 text-slate-400"><History size={48} className="mx-auto mb-3 opacity-20" /><p>No hay registros de pacientes dados de alta.</p></div>}
                </div>
            </div>
          </div>
      )}

      {selectedHistoryItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in flex flex-col">
                    <div className="p-6 border-b border-slate-200 bg-slate-100 flex justify-between items-start sticky top-0 z-10">
                         <div>
                            <div className="flex items-center space-x-2 text-slate-500 text-sm mb-1 uppercase font-bold tracking-wider"><History size={14} /> <span>Registro Histórico</span></div>
                            <h3 className="text-2xl font-bold text-slate-800">{selectedHistoryItem.patientName}</h3>
                            <div className="flex items-center space-x-2 mt-1"><span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-sm font-medium">Cama {selectedHistoryItem.id} (Anterior)</span><span className="text-slate-400">|</span><span className="text-slate-600 font-medium">Alta: {selectedHistoryItem.dischargeDate}</span></div>
                         </div>
                         <button onClick={() => setSelectedHistoryItem(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24} className="text-slate-500" /></button>
                    </div>
                    <div className="p-8">{renderDetailContent(selectedHistoryItem)}</div>
               </div>
          </div>
      )}
    </div>
  );
};