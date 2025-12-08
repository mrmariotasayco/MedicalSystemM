import React, { useState, useMemo, useEffect } from 'react';
import { LabResult } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, TrendingUp, Search, Plus, FileText, X, Upload, Save, Loader2, File, Printer, Filter, Hash, AlignLeft, Eye, Edit2, Trash2, ExternalLink, AlertTriangle, ListFilter } from 'lucide-react';
import { analyzeLabResults } from '../services/geminiService';
import { uploadLabFile } from '../services/dbService';

interface LabResultsProps {
  results: LabResult[];
  onAddResult: (result: LabResult) => Promise<void>;
  onUpdateResult: (result: LabResult) => Promise<void>;
  onDeleteResult: (id: string) => Promise<void>;
}

export const LabResults: React.FC<LabResultsProps> = ({ results, onAddResult, onUpdateResult, onDeleteResult }) => {
  // --- CHART LOGIC ---
  const availableTests = useMemo(() => {
    const tests = Array.from(new Set(
        results
        .filter(r => r.resultType === 'quantitative' && r.value !== undefined && r.value !== null)
        .map(r => r.testName)
    ));
    return tests.length > 0 ? tests : [];
  }, [results]);

  const [selectedChartTest, setSelectedChartTest] = useState<string>('');

  // Effect to set initial chart selection or update it when new tests arrive
  useEffect(() => {
      if (availableTests.length > 0 && (!selectedChartTest || !availableTests.includes(selectedChartTest))) {
          setSelectedChartTest(availableTests[0]);
      }
  }, [availableTests, selectedChartTest]);

  const chartData = useMemo(() => {
    if (!selectedChartTest) return [];
    return results
        .filter(r => r.testName === selectedChartTest && r.resultType === 'quantitative' && r.value !== undefined)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(r => ({ date: r.date, value: r.value }));
  }, [results, selectedChartTest]);

  // --- STATE ---
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingResult, setViewingResult] = useState<LabResult | null>(null);
  const [resultToDelete, setResultToDelete] = useState<LabResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'quantitative' | 'qualitative'>('all');

  // File Upload State
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const [formData, setFormData] = useState<Partial<LabResult>>({
    date: new Date().toISOString().split('T')[0],
    testName: '',
    resultType: 'quantitative',
    value: 0,
    textValue: '',
    unit: 'mg/dL',
    isAbnormal: false,
    category: 'Bioquímica',
    fileName: '',
    fileUrl: ''
  });

  const unitOptions = [
      'mg/dL', 'g/dL', '%', 'fl', 'mm3', 'UI/L', 'mEq/L', 'ng/mL', 'pg/mL', 'mcg/dL', 'mmol/L', 'x10^9/L', 'x10^12/L', 'min', 'seg', 'grados', 'cel/uL', 'copias/mL'
  ];

  const filteredResults = useMemo(() => {
      return results.filter(r => {
          if (typeFilter === 'all') return true;
          return r.resultType === typeFilter;
      });
  }, [results, typeFilter]);

  // --- HANDLERS ---

  const handleAnalyze = async (id: string, name: string, val: number | undefined, textVal: string | undefined, unit: string | undefined) => {
      if (aiAnalysis[id]) return; 
      
      setAnalyzingIds(prev => new Set(prev).add(id));
      
      let promptVal: any = val;
      if (textVal) promptVal = textVal;

      const text = await analyzeLabResults(name, promptVal, unit || '');
      setAiAnalysis(prev => ({ ...prev, [id]: text }));
      setAnalyzingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
  };

  const handleOpenFile = (url: string) => {
      if (url) {
        window.open(url, '_blank');
      } else {
          alert("No hay archivo adjunto disponible para este examen.");
      }
  };

  // ... (Report Generation Logic maintained) ...
  const handleGenerateReport = () => {
    setIsGeneratingPdf(true);
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("Por favor habilite las ventanas emergentes para generar el reporte."); setIsGeneratingPdf(false); return; }
    
    // Generate Rows
    const rows = results.map(r => `
        <tr>
            <td>${r.date}</td>
            <td>${r.testName}</td>
            <td>${r.category}</td>
            <td>${r.resultType === 'quantitative' ? `${r.value} ${r.unit}` : r.textValue}</td>
            <td style="color: ${r.isAbnormal ? 'red' : 'green'}; font-weight: bold;">${r.isAbnormal ? 'ANORMAL' : 'NORMAL'}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte Lab</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { text-align: center; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body onload="window.print()">
            <h1>Reporte de Resultados de Laboratorio</h1>
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Examen</th><th>Categoría</th><th>Resultado</th><th>Estado</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </body>
        </html>`;
    
    printWindow.document.write(htmlContent); 
    printWindow.document.close();
    setIsGeneratingPdf(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setFileToUpload(file);
          setFormData(prev => ({ ...prev, fileName: file.name }));
      }
  };

  const handleOpenCreate = () => {
      setIsEditing(false);
      setFileToUpload(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        testName: '',
        resultType: 'quantitative',
        value: 0,
        textValue: '',
        unit: 'mg/dL',
        isAbnormal: false,
        category: 'Bioquímica',
        fileName: '',
        fileUrl: ''
      });
      setIsFormOpen(true);
  };

  const handleOpenEdit = (result: LabResult) => {
      setIsEditing(true);
      setFileToUpload(null); 
      setFormData({ ...result });
      setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.testName || !formData.date) return;
      setIsSaving(true);
      try {
          let uploadedUrl = formData.fileUrl;
          if (fileToUpload) {
              const url = await uploadLabFile(fileToUpload);
              if (url) uploadedUrl = url;
          }
          const resultData: LabResult = {
              id: formData.id || '',
              date: formData.date!,
              testName: formData.testName!,
              category: (formData.category as any) || 'Bioquímica',
              isAbnormal: !!formData.isAbnormal,
              // referenceRange removed
              fileName: formData.fileName,
              fileUrl: uploadedUrl,
              resultType: (formData.resultType as 'quantitative' | 'qualitative'),
              value: formData.resultType === 'quantitative' ? Number(formData.value) : undefined,
              unit: formData.resultType === 'quantitative' ? formData.unit! : undefined,
              textValue: formData.resultType === 'qualitative' ? formData.textValue! : undefined
          };
          if (isEditing) { await onUpdateResult(resultData); } else { await onAddResult(resultData); if (resultData.resultType === 'quantitative' && resultData.value !== undefined) { setSelectedChartTest(resultData.testName); } }
          setIsFormOpen(false);
      } catch (error: any) { alert("Error al guardar: " + error.message); } finally { setIsSaving(false); }
  };

  const confirmDelete = async () => {
      if (resultToDelete) { await onDeleteResult(resultToDelete.id); setResultToDelete(null); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Sticky Header - Title Only */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm -mx-4 px-4 md:-mx-8 md:px-8 pt-4 pb-2 border-b border-slate-200 mb-4 shadow-sm transition-all">
        <h2 className="text-3xl font-bold text-slate-800">Resultados de Laboratorio</h2>
        <p className="text-slate-500">Visualización de tendencias y registros de exámenes auxiliares.</p>
      </div>

      {/* Buttons (Not Sticky) */}
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mb-6">
            <button 
                onClick={handleGenerateReport}
                className="flex items-center justify-center space-x-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2.5 rounded-lg transition-colors border border-slate-200"
                disabled={isGeneratingPdf}
            >
                {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                <span>Generar Reporte</span>
            </button>
            <button 
                onClick={handleOpenCreate}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm"
            >
                <Plus size={18} />
                <span>Registrar Examen</span>
            </button>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-2">
                <TrendingUp className="text-blue-600" />
                <h3 className="text-lg font-bold text-slate-800">Tendencias Históricas</h3>
            </div>
            <select
                value={selectedChartTest}
                onChange={(e) => setSelectedChartTest(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={availableTests.length === 0}
            >
                {availableTests.map(test => (
                    <option key={test} value={test}>{test}</option>
                ))}
                {availableTests.length === 0 && <option>Sin datos numéricos</option>}
            </select>
        </div>
        <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: '#64748b' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }} 
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <TrendingUp size={48} className="mb-2 opacity-20" />
                    <p>No hay datos suficientes para graficar.</p>
                </div>
            )}
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-2">
              <button 
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${typeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                  Todos
              </button>
              <button 
                onClick={() => setTypeFilter('quantitative')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${typeFilter === 'quantitative' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                  <Hash size={12} /> Numéricos
              </button>
              <button 
                onClick={() => setTypeFilter('qualitative')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${typeFilter === 'qualitative' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                  <AlignLeft size={12} /> Texto
              </button>
          </div>

          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Examen</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Resultado</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IA</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                      {filteredResults.length > 0 ? (
                          filteredResults.map((result) => (
                              <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{result.date}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="font-bold text-slate-800">{result.testName}</div>
                                      <div className="text-xs text-slate-500">{result.category}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      {result.resultType === 'quantitative' ? (
                                          <span className="font-mono font-medium text-slate-700">{result.value} <span className="text-slate-400 text-xs">{result.unit}</span></span>
                                      ) : (
                                          <span className="italic text-slate-600 text-sm max-w-[200px] truncate block" title={result.textValue}>{result.textValue}</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      {result.isAbnormal ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                              <AlertCircle size={12} className="mr-1" /> Anormal
                                          </span>
                                      ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                              <CheckCircle size={12} className="mr-1" /> Normal
                                          </span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4">
                                      {aiAnalysis[result.id] ? (
                                          <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100 max-w-[250px]">
                                              {aiAnalysis[result.id]}
                                          </div>
                                      ) : analyzingIds.has(result.id) ? (
                                          <span className="text-xs text-slate-400 flex items-center"><Loader2 size={12} className="animate-spin mr-1"/> Analizando...</span>
                                      ) : (
                                          <button 
                                            onClick={() => handleAnalyze(result.id, result.testName, result.value, result.textValue, result.unit)}
                                            className="text-xs text-blue-600 hover:underline flex items-center"
                                          >
                                              <Search size={12} className="mr-1" /> Interpretar
                                          </button>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <div className="flex justify-end space-x-2">
                                          {result.fileUrl && (
                                              <button onClick={() => handleOpenFile(result.fileUrl!)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Ver Archivo">
                                                  <FileText size={16} />
                                              </button>
                                          )}
                                          <button onClick={() => handleOpenEdit(result)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Editar">
                                              <Edit2 size={16} />
                                          </button>
                                          <button onClick={() => setResultToDelete(result)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar">
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                  No hay resultados que coincidan con los filtros.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* FORM MODAL */}
      {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in flex flex-col">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                      <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Resultado' : 'Nuevo Resultado'}</h2>
                      <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                              <input type="date" required name="date" value={formData.date} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                              <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg">
                                  <option value="Bioquímica">Bioquímica</option>
                                  <option value="Hematología">Hematología</option>
                                  <option value="Inmunología">Inmunología</option>
                                  <option value="Microbiología">Microbiología</option>
                                  <option value="Patología">Patología</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Examen</label>
                          <input type="text" required name="testName" placeholder="Ej. Glucosa, Hemoglobina..." value={formData.testName} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Resultado</label>
                          <div className="flex space-x-4">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                  <input type="radio" name="resultType" value="quantitative" checked={formData.resultType === 'quantitative'} onChange={handleInputChange} className="text-blue-600" />
                                  <span className="text-sm">Numérico</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                  <input type="radio" name="resultType" value="qualitative" checked={formData.resultType === 'qualitative'} onChange={handleInputChange} className="text-blue-600" />
                                  <span className="text-sm">Texto / Cualitativo</span>
                              </label>
                          </div>
                      </div>

                      {formData.resultType === 'quantitative' ? (
                          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                                  <input type="number" step="0.01" name="value" value={formData.value} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unidad</label>
                                  <select name="unit" value={formData.unit} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg">
                                      {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                  </select>
                              </div>
                          </div>
                      ) : (
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Resultado (Texto)</label>
                              <textarea name="textValue" rows={3} placeholder="Ej. Positivo, No se observan..." value={formData.textValue} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                          </div>
                      )}

                      <div className="flex items-center space-x-2 py-2">
                          <input type="checkbox" id="isAbnormal" name="isAbnormal" checked={formData.isAbnormal} onChange={handleInputChange} className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500" />
                          <label htmlFor="isAbnormal" className="text-sm font-medium text-red-700">Marcar como Resultado Anormal</label>
                      </div>

                      <div className="border-t border-slate-200 pt-4">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Adjuntar Archivo (PDF/Imagen)</label>
                          <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                      <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                      <p className="text-sm text-slate-500"><span className="font-semibold">Clic para subir</span> o arrastrar</p>
                                      {fileToUpload && <p className="text-xs text-blue-600 mt-2 font-medium">{fileToUpload.name}</p>}
                                      {formData.fileUrl && !fileToUpload && <p className="text-xs text-green-600 mt-2 font-medium">Archivo actual conservado</p>}
                                  </div>
                                  <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
                              </label>
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end space-x-3 sticky bottom-0 bg-white border-t border-slate-100 -mx-6 -mb-6 p-6">
                          <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">Cancelar</button>
                          <button type="submit" disabled={isSaving} className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center shadow-lg disabled:opacity-70">
                              {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                              {isEditing ? 'Actualizar' : 'Guardar'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* DELETE MODAL */}
      {resultToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-fade-in text-center p-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-red-600" size={32} /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Resultado?</h3>
                  <p className="text-slate-600 mb-6">Se eliminará el registro de <span className="font-bold">{resultToDelete.testName}</span> del {resultToDelete.date}.</p>
                  <div className="flex space-x-3 justify-center">
                      <button onClick={() => setResultToDelete(null)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg">Cancelar</button>
                      <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-lg">Sí, Eliminar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
