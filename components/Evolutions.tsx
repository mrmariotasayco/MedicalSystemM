import React, { useState } from 'react';
import { EvolutionNote } from '../types';
import { Clock, Stethoscope, Sparkles, Plus, X, Save, FilePlus, Edit2, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { generateEvolutionSummary } from '../services/geminiService';

interface EvolutionsProps {
  evolutions: EvolutionNote[];
  onAddEvolution: (note: EvolutionNote) => void;
  onUpdateEvolution: (note: EvolutionNote) => void;
  onDeleteEvolution: (id: string) => void;
}

export const Evolutions: React.FC<EvolutionsProps> = ({ evolutions, onAddEvolution, onUpdateEvolution, onDeleteEvolution }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<EvolutionNote | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<EvolutionNote>>({
    date: new Date().toISOString().split('T')[0],
    severity: 'Baja',
    doctor: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  // --- CHECK 24H LOCK ---
  const isEditable = (dateStr?: string) => {
      if (!dateStr) return true; // Newly created or local mock without timestamp might be editable
      const created = new Date(dateStr);
      const now = new Date();
      // Calculate difference in hours
      const diffMs = now.getTime() - created.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours < 24;
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    const result = await generateEvolutionSummary(evolutions);
    setSummary(result);
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
        date: new Date().toISOString().split('T')[0],
        severity: 'Baja',
        doctor: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (note: EvolutionNote) => {
    setIsEditing(true);
    setEditingId(note.id);
    setFormData({ ...note });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctor || !formData.date || !formData.assessment || !formData.plan) return;

    if (isEditing && editingId) {
        // UPDATE MODE
        const updatedNote: EvolutionNote = {
            id: editingId, // Keep existing ID
            date: formData.date!,
            doctor: formData.doctor!,
            severity: formData.severity as 'Baja' | 'Media' | 'Alta',
            subjective: formData.subjective || '',
            objective: formData.objective || '',
            assessment: formData.assessment!,
            plan: formData.plan!,
            createdAt: formData.createdAt // Preserve creation time
        };
        onUpdateEvolution(updatedNote);
    } else {
        // CREATE MODE
        const newNote: EvolutionNote = {
            id: '', // Empty ID handled by DB or App
            date: formData.date!,
            doctor: formData.doctor!,
            severity: formData.severity as 'Baja' | 'Media' | 'Alta',
            subjective: formData.subjective || 'Sin datos subjetivos.',
            objective: formData.objective || 'Sin datos objetivos.',
            assessment: formData.assessment!,
            plan: formData.plan!
        };
        onAddEvolution(newNote);
    }

    setIsFormOpen(false);
  };

  const confirmDelete = () => {
      if (noteToDelete) {
          onDeleteEvolution(noteToDelete.id);
          setNoteToDelete(null);
      }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Evoluciones Médicas</h2>
            <p className="text-slate-500">Registro cronológico del progreso del paciente.</p>
        </div>
        <div className="flex space-x-3">
            <button 
                onClick={handleOpenCreate}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm"
            >
                <Plus size={18} />
                <span>Nueva Evolución</span>
            </button>
            <button 
                onClick={handleGenerateSummary}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
                <Sparkles size={18} />
                <span>{loading ? 'Analizando...' : 'Resumen IA'}</span>
            </button>
        </div>
      </header>

      {summary && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl animate-fade-in relative">
            <div className="absolute top-4 right-4 text-indigo-300">
                <Sparkles size={40} opacity={0.2} />
            </div>
            <h3 className="text-indigo-900 font-bold mb-2 flex items-center">
                <Sparkles size={16} className="mr-2" />
                Resumen Inteligente
            </h3>
            <p className="text-indigo-800 leading-relaxed text-sm md:text-base">{summary}</p>
        </div>
      )}

      <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-12">
        {evolutions.length === 0 && (
            <div className="ml-8 p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-500">
                <FilePlus size={48} className="mx-auto mb-3 text-slate-400" />
                <p>No hay evoluciones registradas para este paciente.</p>
                <button onClick={handleOpenCreate} className="mt-2 text-blue-600 font-medium hover:underline">Registrar la primera</button>
            </div>
        )}

        {evolutions.map((note) => {
            const canEdit = isEditable(note.createdAt);
            
            return (
            <div key={note.id} className="relative pl-8 group animate-fade-in">
                {/* Timeline Dot */}
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                    note.severity === 'Alta' ? 'bg-red-500' : note.severity === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative">
                    
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex space-x-2">
                        {canEdit ? (
                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-lg">
                                <button 
                                    onClick={() => handleOpenEdit(note)}
                                    className="p-1.5 text-slate-500 bg-slate-100 hover:text-blue-600 hover:bg-blue-50 rounded border border-slate-200 shadow-sm transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={() => setNoteToDelete(note)}
                                    className="p-1.5 text-slate-500 bg-slate-100 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200 shadow-sm transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="text-slate-300" title="Edición bloqueada después de 24h">
                                <Lock size={16} />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center space-x-3">
                            <Clock size={16} className="text-slate-400" />
                            <span className="font-semibold text-slate-700">{note.date}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                note.severity === 'Alta' ? 'bg-red-100 text-red-700' : note.severity === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                Prioridad {note.severity}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-500 text-sm mt-2 md:mt-0 pr-12 md:pr-0">
                            <Stethoscope size={16} />
                            <span>{note.doctor}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Subjetivo (S)</h4>
                                <p className="text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">{note.subjective}</p>
                            </div>
                            <div>
                                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Objetivo (O)</h4>
                                <p className="text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">{note.objective}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Análisis (A)</h4>
                                <p className="text-slate-800 font-medium text-sm whitespace-pre-line">{note.assessment}</p>
                            </div>
                            <div>
                                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Plan / Tratamiento (P)</h4>
                                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                                    {note.plan}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            );
        })}
      </div>

      {/* Form Modal (Create/Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in flex flex-col">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Stethoscope size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">
                                {isEditing ? 'Editar Evolución' : 'Registrar Evolución'}
                            </h2>
                            <p className="text-sm text-slate-500">Formato SOAP (Subjetivo, Objetivo, Análisis, Plan)</p>
                        </div>
                    </div>
                    <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Header Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                name="date"
                                required
                                value={formData.date}
                                onChange={handleInputChange}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Médico Tratante</label>
                            <input
                                type="text"
                                name="doctor"
                                required
                                placeholder="Ej. Dr. Juan Pérez"
                                value={formData.doctor}
                                onChange={handleInputChange}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad / Severidad</label>
                            <select
                                name="severity"
                                value={formData.severity}
                                onChange={handleInputChange}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="Baja">Baja - Control Rutina</option>
                                <option value="Media">Media - Requiere Seguimiento</option>
                                <option value="Alta">Alta - Urgente / Crítico</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Observations */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">
                                    <span>Subjetivo (S)</span>
                                    <span className="text-xs text-slate-400 font-normal">Síntomas reportados por paciente</span>
                                </label>
                                <textarea
                                    name="subjective"
                                    rows={4}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="El paciente refiere dolor de cabeza..."
                                    value={formData.subjective}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">
                                    <span>Objetivo (O)</span>
                                    <span className="text-xs text-slate-400 font-normal">Signos vitales, examen físico</span>
                                </label>
                                <textarea
                                    name="objective"
                                    rows={4}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="TA: 120/80, FC: 70..."
                                    value={formData.objective}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Right Column: Analysis & Plan */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">
                                    <span>Análisis (A)</span>
                                    <span className="text-xs text-slate-400 font-normal">Diagnóstico o impresión clínica</span>
                                </label>
                                <textarea
                                    name="assessment"
                                    required
                                    rows={4}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-blue-50/30"
                                    placeholder="Hipertensión arterial controlada..."
                                    value={formData.assessment}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">
                                    <span>Plan / Tratamiento (P)</span>
                                    <span className="text-xs text-slate-400 font-normal">Medicación, estudios, indicaciones</span>
                                </label>
                                <textarea
                                    name="plan"
                                    required
                                    rows={4}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-blue-50/30"
                                    placeholder="Continuar tratamiento actual. Paracetamol 500mg..."
                                    value={formData.plan}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsFormOpen(false)}
                            className="px-5 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center shadow-lg shadow-blue-600/20"
                        >
                            <Save size={18} className="mr-2" />
                            {isEditing ? 'Actualizar Evolución' : 'Guardar Evolución'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {noteToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Evolución?</h3>
                    <p className="text-slate-600 mb-6">
                        Está a punto de eliminar permanentemente la nota de evolución del <span className="font-bold">{noteToDelete.date}</span>.
                    </p>
                    
                    <div className="flex space-x-3 justify-center">
                        <button 
                            onClick={() => setNoteToDelete(null)}
                            className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDelete}
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
    </div>
  );
};