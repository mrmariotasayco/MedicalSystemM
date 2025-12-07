import React, { useState, useEffect } from 'react';
import { Patient, Appointment, Prescription, MedicationItem, CarePlanData, BedData } from '../types';
import { User, Calendar, Droplet, AlertTriangle, FileText, Phone, Sparkles, Clock, CalendarPlus, X, Save, History, CheckCircle2, FileDown, Printer, MapPin, Edit2, Ban, UserCog, Bed, Pill, Plus, Trash2, Lock, Activity, Eye } from 'lucide-react';
import { generateClinicalRecommendations } from '../services/geminiService';
import { UserProfile } from '../services/authService';

interface ClinicalHistoryProps {
  patient: Patient;
  appointments: Appointment[];
  prescriptions: Prescription[]; 
  doctorProfile: UserProfile | null;
  assignedBed?: BedData; // New prop to receive bed data
  onAddAppointment: (appt: Appointment) => void;
  onUpdateAppointment: (appt: Appointment) => void;
  onAddPrescription: (presc: Prescription) => void;
  onDeletePrescription: (id: string) => void;
  onEditPatientProfile: () => void;
}

export const ClinicalHistory: React.FC<ClinicalHistoryProps> = ({ 
    patient, 
    appointments, 
    prescriptions = [],
    doctorProfile,
    assignedBed,
    onAddAppointment, 
    onUpdateAppointment, 
    onAddPrescription, 
    onDeletePrescription,
    onEditPatientProfile 
}) => {
  const [aiRecommendation, setAiRecommendation] = useState<string>('Analizando perfil clínico...');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isApptFormOpen, setIsApptFormOpen] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [apptToCancel, setApptToCancel] = useState<Appointment | null>(null);
  
  // New state for viewing appointment detail
  const [viewingAppt, setViewingAppt] = useState<Appointment | null>(null);

  // Prescription UI State
  const [isPrescFormOpen, setIsPrescFormOpen] = useState(false);
  
  // Helper to format date without timezone shift
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  // Separate appointments
  const now = new Date();
  const upcomingAppointments = appointments
    .filter(a => {
        const apptDate = new Date(`${a.date}T${a.time}`);
        return apptDate > now && a.status === 'Programada';
    })
    .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  const pastAppointments = appointments
    .filter(a => {
        const apptDate = new Date(`${a.date}T${a.time}`);
        return apptDate <= now || a.status !== 'Programada';
    })
    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  // Appointment Form State
  const [newAppt, setNewAppt] = useState<Partial<Appointment>>({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    doctor: '',
    reason: '',
    status: 'Programada',
    location: 'Consultorio Principal'
  });

  // Prescription Form State
  const [prescForm, setPrescForm] = useState<{
      weight: string;
      height: string;
      temperature: string;
      diagnosis: string;
      diet: string;
      medications: MedicationItem[];
  }>({
      weight: '',
      height: '',
      temperature: '',
      diagnosis: '',
      diet: 'DIETA HIPOSÓDICA E HIPOGLÚCIDA',
      medications: []
  });

  useEffect(() => {
    const fetchRecommendation = async () => {
        setIsLoadingAi(true);
        const rec = await generateClinicalRecommendations(patient);
        setAiRecommendation(rec);
        setIsLoadingAi(false);
    };
    fetchRecommendation();
  }, [patient]);

  // --- PRESCRIPTION HANDLERS ---

  const handleOpenPrescriptionForm = () => {
      setPrescForm({
          weight: '',
          height: '',
          temperature: '',
          diagnosis: '',
          diet: 'DIETA HIPOSÓDICA E HIPOGLÚCIDA',
          medications: []
      });
      setIsPrescFormOpen(true);
  };

  const addMedication = () => {
      setPrescForm(prev => ({
          ...prev,
          medications: [
              ...prev.medications, 
              { 
                  name: '', 
                  dosage: '', 
                  frequency: '', 
                  route: 'VO', 
                  form: 'TAB', 
                  totalQuantity: '1' 
              }
          ]
      }));
  };

  const updateMedication = (index: number, field: keyof MedicationItem, value: string) => {
      const newMeds = [...prescForm.medications];
      newMeds[index] = { ...newMeds[index], [field]: value };
      setPrescForm(prev => ({ ...prev, medications: newMeds }));
  };

  const removeMedication = (index: number) => {
      const newMeds = prescForm.medications.filter((_, i) => i !== index);
      setPrescForm(prev => ({ ...prev, medications: newMeds }));
  };

  const submitPrescription = (e: React.FormEvent) => {
      e.preventDefault();
      if (!prescForm.diagnosis) return;

      // AUTOMATICALLY PULL CARE PLAN FROM ASSIGNED BED OR USE DEFAULTS
      const autoCarePlan: CarePlanData = assignedBed?.carePlan || {
          hgt1400: '', hgt2200: '', hgt0600: '',
          catheterType: '', needleSize: '', nasogastricSonde: '', foleySonde: '', oxygenMode: '',
          venoclysis: false, microdropper: false, tripleWayCode: false
      };

      const newPrescription: Prescription = {
          id: '', // Generated by DB
          patientId: patient.id,
          doctorName: doctorProfile?.fullName || 'Dr. Admin',
          doctorLicense: doctorProfile?.licenseNumber || '',
          date: new Date().toISOString().split('T')[0],
          diagnosis: prescForm.diagnosis,
          weight: prescForm.weight,
          height: prescForm.height,
          temperature: prescForm.temperature,
          diet: prescForm.diet,
          carePlan: autoCarePlan, // Hidden auto-fill
          allergiesSnapshot: patient.allergies,
          medications: prescForm.medications
      };

      onAddPrescription(newPrescription);
      setIsPrescFormOpen(false);
  };

  const handlePrintPrescription = (presc: Prescription) => {
    // Generate PDF Logic
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Calculate Age
    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
    // Ensure carePlan exists for printing even if empty
    const cp = presc.carePlan || { hgt1400:'', hgt2200:'', hgt0600:'', catheterType:'', needleSize:'', venoclysis:false, tripleWayCode:false, microdropper:false };

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>HOJA DE PRESCRIPCIÓN - ${patient.name}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            <style>
                /* ... (Styles remain the same) ... */
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #eee; color: #000; }
                .wrapper { display: flex; justify-content: center; padding: 20px; }
                .sheet { 
                    width: 215.9mm; 
                    min-height: 279.4mm; 
                    background: white; 
                    padding: 10mm 15mm; 
                    box-sizing: border-box; 
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
                    position: relative;
                }
                table { border-collapse: collapse; width: 100%; font-size: 11px; }
                th, td { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .bg-yellow { background-color: #ffff00; }
                
                /* Layout classes specific to the hospital format */
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 5px; }
                .hospital-info { width: 60%; font-size: 12px; }
                .hospital-name { font-weight: 900; font-size: 14px; text-transform: uppercase; }
                .dept-title { font-weight: bold; font-size: 12px; text-transform: uppercase; }
                .sheet-title-box { background-color: #ffff00; border: 1px solid #000; text-align: center; font-weight: 900; font-size: 16px; padding: 4px; margin-top: 5px; }
                
                .grid-info { display: flex; margin-bottom: 10px; border: 1px solid #000; }
                .col-dates { width: 25%; border-right: 1px solid #000; padding: 4px; font-size: 10px; }
                .col-bed { width: 35%; display: flex; align-items: center; justify-content: center; background-color: #ffff00; border-right: 1px solid #000; }
                .bed-text { font-size: 24px; font-weight: 900; }
                .col-ids { width: 40%; }
                
                .id-row { display: flex; border-bottom: 1px solid #000; }
                .id-label { width: 40%; background: #f0f0f0; padding: 2px; font-weight: bold; font-size: 10px; border-right: 1px solid #000; }
                .id-val { width: 60%; padding: 2px; font-size: 10px; }
                
                .patient-header { background: #e0e0e0; font-weight: bold; text-align: center; font-size: 11px; }
                .meds-header { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 10px; }
                .footer { margin-top: 40px; display: flex; justify-content: flex-end; }
                .signature-box { text-align: center; width: 250px; }
                .sign-line { border-top: 1px solid #000; margin-bottom: 5px; }

                @media print {
                    body { background: white; }
                    .wrapper { padding: 0; }
                    .sheet { box-shadow: none; width: 100%; height: auto; }
                    .no-print { display: none; }
                }
            </style>
            <script>
                function download() {
                    const el = document.getElementById('sheet');
                    const btn = document.getElementById('btn-dl');
                    btn.style.display = 'none';
                    const opt = {
                        margin: 0,
                        filename: 'Receta_Loayza_${patient.name.replace(/\s+/g, '_')}.pdf',
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
                    };
                    html2pdf().set(opt).from(el).save().then(() => { btn.style.display = 'block'; });
                }
            </script>
        </head>
        <body>
            <div class="wrapper">
                <button id="btn-dl" onclick="download()" class="no-print" style="position:fixed; top:10px; right:10px; padding:10px; background:blue; color:white; border:none; cursor:pointer; z-index:100;">Descargar PDF</button>
                <div id="sheet" class="sheet">
                    
                    <!-- HEADER -->
                    <div class="header-container">
                        <div class="hospital-info">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:40px; height:40px; border:1px dashed #ccc; display:flex; align-items:center; justify-content:center; font-size:8px;">LOGO</div>
                                <div>
                                    <div class="hospital-name">HOSPITAL NACIONAL ARZOBISPO LOAYZA</div>
                                    <div>Av. Alfonso Ugarte # 848 - Teléfono: 614-4646</div>
                                </div>
                            </div>
                        </div>
                        <div style="width:40%; text-align:right;">
                            <div class="dept-title">DEPARTAMENTO<br>DE MEDICINA INTERNA</div>
                            <div class="sheet-title-box">HOJA DE PRESCRIPCIÓN</div>
                        </div>
                    </div>

                    <!-- TOP GRID -->
                    <div class="grid-info">
                        <div class="col-dates">
                            <div style="display:flex; justify-content:space-between;"><strong>SERVICIO DE MEDICINA 2 II</strong></div>
                            <div style="margin-top:5px;">
                                <div><strong>FIE:</strong> ${presc.date}</div>
                                <div><strong>FIP:</strong> ${presc.date}</div>
                                <div><strong>DH:</strong> 01</div>
                            </div>
                        </div>
                        <div class="col-bed">
                            <div class="bed-text">CAMA ${patient.bedId || 'S/C'}</div>
                        </div>
                        <div class="col-ids">
                            <div class="id-row"><div class="id-label">Nº:</div><div class="id-val"></div></div>
                            <div class="id-row"><div class="id-label">DNI:</div><div class="id-val">${patient.id.substring(0,8)}</div></div>
                            <div class="id-row"><div class="id-label">Nº H.C:</div><div class="id-val">${patient.id.substring(0,8)}</div></div>
                            <div class="id-row"><div class="id-label">Nº CUENTA:</div><div class="id-val">6649410</div></div>
                            <div class="id-row"><div class="id-label" style="width:100%; text-align:center; background:#fff; font-size:9px;">DOSIS UNITARIA R.M. 552-2007/MINSA</div></div>
                        </div>
                    </div>

                    <!-- PATIENT DATA -->
                    <table>
                        <tr><td colspan="4" class="patient-header">NOMBRES Y APELLIDOS</td></tr>
                        <tr><td colspan="4" style="font-weight:bold; font-size:12px; text-align:center;">${patient.name}</td></tr>
                        <tr>
                            <td style="width:15%"><strong>EDAD:</strong> ${age}</td>
                            <td style="width:15%"><strong>PESO:</strong> ${presc.weight || '-'}</td>
                            <td style="width:55%"></td>
                            <td style="width:15%"><strong>TALLA:</strong> ${presc.height || '-'}</td>
                        </tr>
                    </table>

                    <!-- DIAGNOSIS -->
                    <table>
                        <tr style="background:#e0e0e0;">
                            <td style="width:70%"><strong>DIAGNÓSTICOS PRINCIPALES</strong></td>
                            <td style="width:30%"><strong>CIE 10</strong></td>
                        </tr>
                        <tr><td style="border-bottom:none;">1. ${presc.diagnosis}</td><td style="border-bottom:none;"></td></tr>
                        <tr><td style="border-bottom:none; border-top:none;">2. ${patient.chronicConditions[0] || ''}</td><td style="border-bottom:none; border-top:none;"></td></tr>
                        <tr><td style="border-bottom:none; border-top:none;">3.</td><td style="border-bottom:none; border-top:none;"></td></tr>
                        <tr><td style="border-top:none;">4.</td><td style="border-top:none;"></td></tr>
                    </table>

                    <!-- ALERGIES ROW -->
                    <table style="margin-top:-1px;">
                        <tr>
                            <td style="width:20%"><strong>PROCEDIMIENTO:</strong></td><td></td>
                            <td style="width:20%"><strong>ALERGIAS:</strong></td><td>${presc.allergiesSnapshot?.join(', ') || 'NIEGA'}</td>
                        </tr>
                    </table>

                    <!-- MEDICATION TABLE -->
                    <table style="margin-top:5px;">
                        <thead>
                            <tr class="meds-header">
                                <th style="width:15%">FECHA/ HORA</th><th style="width:30%">MEDICAMENTO EN DCI</th><th style="width:10%">DOSIS</th>
                                <th style="width:15%">FRECUENCIA</th><th style="width:5%">V.A.</th><th style="width:5%">F.F.</th>
                                <th style="width:5%">C.C.</th><th style="width:10%">CANTIDAD</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td class="text-center">${presc.date}</td><td colspan="7"><strong>Dieta:</strong> ${presc.diet}</td></tr>
                            ${presc.medications.map((med, idx) => `
                                <tr>
                                    <td class="text-center">${idx + 1}.</td><td>${med.name}</td><td class="text-center">${med.dosage || '-'}</td>
                                    <td class="text-center">${med.frequency}</td><td class="text-center">${med.route}</td><td class="text-center">${med.form || ''}</td>
                                    <td></td><td class="text-center">${med.totalQuantity}</td>
                                </tr>
                            `).join('')}
                            ${Array.from({ length: Math.max(0, 15 - presc.medications.length) }).map((_, i) => `
                                <tr><td class="text-center">${presc.medications.length + i + 1}.</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- MONITORING GRID (FROM ASSIGNED BED/CARE PLAN) -->
                    <table style="margin-top:10px; font-size:9px;">
                         <tr>
                            <td colspan="2" class="text-center bg-gray-200 font-bold">HEMOGLUCOTEST</td>
                            <td colspan="5" class="text-center bg-gray-200 font-bold">INSUMOS DISPOSITIVOS MÉDICOS</td>
                         </tr>
                         <tr>
                            <td width="10%">14:00</td><td width="10%">${cp.hgt1400 || ''} mg%</td>
                            <td width="30%">Brazalete ID</td><td width="10%">verde</td><td width="10%">rojo</td>
                            <td width="20%">Equipo venoclisis</td><td width="10%">${cp.venoclysis ? 'X' : ''}</td>
                         </tr>
                         <tr>
                            <td>22:00</td><td>${cp.hgt2200 || ''} mg%</td>
                            <td>Aguja</td><td>${cp.needleSize || ''}</td><td></td>
                            <td>Llave triple vía</td><td>${cp.tripleWayCode ? 'X' : ''}</td>
                         </tr>
                         <tr>
                            <td>06:00</td><td>${cp.hgt0600 || ''} mg%</td>
                            <td>Apósito transparente</td><td></td><td></td>
                            <td>Microgotero</td><td>${cp.microdropper ? 'X' : ''}</td>
                         </tr>
                         <tr>
                            <td>FC</td><td></td>
                            <td>Catéter endovenoso</td><td>${cp.catheterType || ''}</td><td></td>
                            <td>Na Cl 0.9% 1000cc</td><td></td>
                         </tr>
                    </table>

                    <div class="footer">
                        <div class="signature-box">
                            <div class="sign-line"></div>
                            <div style="font-weight:bold; font-size:11px;">FIRMA Y SELLO MEDICO TRATANTE</div>
                            <div style="font-size:10px;">Dr. ${presc.doctorName}</div>
                            <div style="font-size:10px;">CMP: ${presc.doctorLicense || '-----'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ... (Appointment handlers remain same) ...
  const handleOpenAddForm = () => {
    setEditingApptId(null);
    setNewAppt({
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        doctor: doctorProfile?.fullName || '',
        reason: '',
        status: 'Programada',
        location: 'Consultorio Principal'
    });
    setIsApptFormOpen(true);
  };

  const handleOpenEditForm = (appt: Appointment) => {
    setEditingApptId(appt.id);
    setNewAppt({ ...appt });
    setIsApptFormOpen(true);
  };

  const initiateCancel = (appt: Appointment) => {
    setApptToCancel(appt);
  };

  const confirmCancel = () => {
    if (apptToCancel) {
        onUpdateAppointment({ ...apptToCancel, status: 'Cancelada' });
        setApptToCancel(null);
    }
  };

  const handleApptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure all required fields are present and valid
    if (newAppt.date && newAppt.time && newAppt.doctor && newAppt.reason) {
        const appointmentData: Appointment = {
            id: editingApptId || `appt-${Date.now()}`, // Fallback ID for optimistic UI
            date: newAppt.date,
            time: newAppt.time,
            doctor: newAppt.doctor,
            reason: newAppt.reason,
            // Ensure status is strictly typed
            status: (newAppt.status as 'Programada' | 'Completada' | 'Cancelada') || 'Programada',
            location: newAppt.location || 'Consultorio Principal'
        };

        if (editingApptId) {
            onUpdateAppointment(appointmentData);
        } else {
            onAddAppointment(appointmentData);
        }
        setIsApptFormOpen(false);
    } else {
        alert("Por favor complete todos los campos obligatorios.");
    }
  };
  
  const handleDownloadAppointmentPDF = (appt: Appointment) => {
      const printWindow = window.open('', '_blank');
      if(!printWindow) return;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>TICKET DE CITA</title>
            <style>
                body { font-family: monospace; padding: 20px; }
                .ticket { border: 1px dashed #000; padding: 20px; max-width: 300px; margin: 0 auto; }
                h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
                .info { margin-bottom: 10px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
        </head>
        <body onload="window.print()">
            <div class="ticket">
                <h1>RECORDATORIO DE CITA</h1>
                <div class="info"><strong>PACIENTE:</strong><br/>${patient.name}</div>
                <div class="info"><strong>FECHA:</strong><br/>${formatDate(appt.date)}</div>
                <div class="info"><strong>HORA:</strong><br/>${appt.time}</div>
                <div class="info"><strong>MÉDICO:</strong><br/>${appt.doctor}</div>
                <div class="info"><strong>MOTIVO:</strong><br/>${appt.reason}</div>
                <div class="info"><strong>UBICACIÓN:</strong><br/>${appt.location || 'Consultorio'}</div>
                <div class="footer">Por favor llegar 15 min antes.</div>
            </div>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-slate-800">Historia Clínica</h2>
                {/* BED INDICATOR */}
                {assignedBed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm animate-fade-in">
                        <Bed size={16} />
                        {assignedBed.pabellon} - {assignedBed.bedLabel}
                    </span>
                ) : patient.bedId ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm animate-fade-in">
                        <Bed size={16} />
                        Cama {patient.bedId}
                    </span>
                ) : null}
            </div>
            <p className="text-slate-500">Gestión de citas, recetas y análisis clínico.</p>
        </div>
        <button 
            onClick={handleOpenAddForm}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition-colors"
        >
            <CalendarPlus size={18} />
            <span>Agendar Cita</span>
        </button>
      </header>

      {/* AI NOTE & ALERTS */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Sparkles size={120} />
        </div>
        <div className="flex items-start space-x-4 relative z-10">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                <Sparkles size={24} className={isLoadingAi ? "animate-pulse" : ""} />
            </div>
            <div className="space-y-3 w-full">
                <div>
                    <h4 className="text-blue-900 font-bold text-lg mb-1">Nota Clínica Importante (IA)</h4>
                    <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                        {isLoadingAi ? "Generando recomendaciones personalizadas..." : aiRecommendation}
                    </p>
                </div>
                <div className={`mt-4 p-4 rounded-lg border flex items-center space-x-3 ${nextAppointment ? 'bg-white/60 border-blue-200' : 'bg-slate-50/50 border-slate-200'}`}>
                    <Clock size={20} className={nextAppointment ? "text-blue-600" : "text-slate-400"} />
                    <div className="flex-1">
                        {nextAppointment ? (
                            <>
                                <span className="block font-semibold text-blue-900">Próxima Cita Programada</span>
                                <span className="text-sm text-blue-800 capitalize">
                                    {formatDate(nextAppointment.date)} a las {nextAppointment.time} con {nextAppointment.doctor}
                                </span>
                            </>
                        ) : (
                            <span className="text-slate-500 font-medium">No hay citas futuras programadas.</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* APPOINTMENTS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-blue-50/50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                  <Calendar className="text-blue-600" size={20} />
                  <h4 className="text-slate-800 font-bold">Citas Médicas</h4>
              </div>
          </div>
          <div className="p-4">
              {/* Upcoming */}
              <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Próximas</h5>
              <div className="space-y-3 mb-6">
                  {upcomingAppointments.length > 0 ? upcomingAppointments.map(appt => (
                      <div key={appt.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                          <div className="flex items-center space-x-4">
                              <div className="text-center min-w-[60px]">
                                  <span className="block text-xl font-bold text-blue-600">{appt.time}</span>
                                  <span className="text-xs text-slate-500">{formatDate(appt.date)}</span>
                              </div>
                              <div className="h-8 w-px bg-slate-200"></div>
                              <div>
                                  <p className="font-bold text-slate-800">{appt.reason}</p>
                                  <div className="flex items-center text-xs text-slate-500">
                                      <User size={12} className="mr-1" /> {appt.doctor}
                                      <span className="mx-2">•</span>
                                      <MapPin size={12} className="mr-1" /> {appt.location}
                                  </div>
                              </div>
                          </div>
                          <div className="flex space-x-1">
                               <button onClick={() => setViewingAppt(appt)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver Detalle">
                                  <Eye size={16} />
                               </button>
                               <button onClick={() => handleDownloadAppointmentPDF(appt)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" title="Imprimir Ticket">
                                  <Printer size={16} />
                              </button>
                              <button onClick={() => handleOpenEditForm(appt)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                                  <Edit2 size={16} />
                              </button>
                              <button onClick={() => initiateCancel(appt)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancelar/Eliminar">
                                  <Ban size={16} />
                              </button>
                          </div>
                      </div>
                  )) : <p className="text-sm text-slate-400 italic">No hay citas próximas programadas.</p>}
              </div>

              {/* Past */}
              <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Historial Reciente</h5>
              <div className="space-y-2">
                  {pastAppointments.length > 0 ? pastAppointments.slice(0, 5).map(appt => (
                       <div key={appt.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded transition-colors text-sm">
                           <div className="flex items-center space-x-3">
                               <div className={`w-2 h-2 rounded-full ${appt.status === 'Completada' ? 'bg-green-500' : appt.status === 'Cancelada' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                               <span className="text-slate-700 font-medium">{formatDate(appt.date)} - {appt.time}</span>
                               <span className="text-slate-500 hidden md:inline">({appt.reason})</span>
                           </div>
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                appt.status === 'Completada' ? 'bg-green-100 text-green-700' : 
                                appt.status === 'Cancelada' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {appt.status}
                            </span>
                       </div>
                  )) : <p className="text-sm text-slate-400 italic">Sin historial.</p>}
              </div>
          </div>
      </div>
      
      {/* PRESCRIPTIONS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-emerald-50/50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                  <Pill className="text-emerald-600" size={20} />
                  <h4 className="text-slate-800 font-bold">Recetas Médicas</h4>
              </div>
              <button 
                onClick={handleOpenPrescriptionForm}
                className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-colors"
              >
                  <Plus size={14} />
                  <span>Generar Receta</span>
              </button>
          </div>
          <div className="divide-y divide-slate-100">
              {prescriptions.length > 0 ? (
                  prescriptions.map(presc => (
                      <div key={presc.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-bold text-slate-800">{formatDate(presc.date)}</span>
                                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Dr. {presc.doctorName}</span>
                              </div>
                              <p className="text-sm text-slate-600 font-medium">{presc.diagnosis}</p>
                              <p className="text-xs text-slate-400 mt-1">{presc.medications.length} Medicamentos recetados</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2 md:mt-0">
                              <button 
                                onClick={() => handlePrintPrescription(presc)}
                                className="flex items-center space-x-1 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded transition-all shadow-sm"
                              >
                                  <Printer size={14} />
                                  <span>Imprimir</span>
                              </button>
                              <button 
                                onClick={() => onDeletePrescription(presc.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Eliminar Receta"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="p-8 text-center text-slate-400">
                      <Pill size={48} className="mx-auto mb-2 opacity-20" />
                      <p>No hay recetas generadas.</p>
                  </div>
              )}
          </div>
      </div>

       {/* PRESCRIPTION MODAL */}
       {isPrescFormOpen && (
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-fade-in flex flex-col">
                   <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                       <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                           <Pill className="text-emerald-600" /> Nueva Receta Médica
                       </h2>
                       <button onClick={() => setIsPrescFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                           <X size={24} />
                       </button>
                   </div>
                   
                   <form onSubmit={submitPrescription} className="p-6 flex-1 overflow-y-auto">
                       <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
                           <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase">Datos del Paciente</h4>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                               <div><span className="text-slate-500">Nombre:</span> <span className="font-semibold">{patient.name}</span></div>
                               <div><span className="text-slate-500">Edad:</span> <span className="font-semibold">{new Date().getFullYear() - new Date(patient.dob).getFullYear()} años</span></div>
                               <div><span className="text-slate-500">Género:</span> <span className="font-semibold">{patient.gender}</span></div>
                               <div><span className="text-slate-500">Alergias:</span> <span className="font-semibold text-red-600">{patient.allergies.join(', ') || 'Ninguna'}</span></div>
                           </div>
                           {assignedBed && assignedBed.carePlan && (
                               <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-blue-600 font-bold flex items-center">
                                   <CheckCircle2 size={14} className="mr-1" />
                                   Datos de insumos y monitoreo precargados automáticamente desde Cama {assignedBed.id}.
                               </div>
                           )}
                       </div>

                       <div className="grid grid-cols-3 gap-4 mb-4">
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Peso (kg)</label>
                               <input type="text" className="w-full p-2 border rounded" value={prescForm.weight} onChange={e => setPrescForm({...prescForm, weight: e.target.value})} />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Talla (m)</label>
                               <input type="text" className="w-full p-2 border rounded" value={prescForm.height} onChange={e => setPrescForm({...prescForm, height: e.target.value})} />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Temp (°C)</label>
                               <input type="text" className="w-full p-2 border rounded" value={prescForm.temperature} onChange={e => setPrescForm({...prescForm, temperature: e.target.value})} />
                           </div>
                       </div>

                       <div className="mb-6">
                           <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico Principal</label>
                           <input 
                                required 
                                type="text" 
                                className="w-full p-2 border rounded" 
                                placeholder="Ej. Infección respiratoria aguda"
                                value={prescForm.diagnosis} 
                                onChange={e => setPrescForm({...prescForm, diagnosis: e.target.value})} 
                            />
                       </div>

                       <div className="mb-6">
                           <label className="block text-sm font-medium text-slate-700 mb-1">Dieta Indicada</label>
                           <textarea
                                required
                                rows={2}
                                className="w-full p-2 border rounded bg-yellow-50/50" 
                                placeholder="Ej. HIPOGLUCIDA E HIPOSODICA"
                                value={prescForm.diet} 
                                onChange={e => setPrescForm({...prescForm, diet: e.target.value})} 
                            />
                       </div>

                       <div className="border-t border-slate-200 pt-4">
                           <div className="flex justify-between items-center mb-3">
                               <h4 className="font-bold text-slate-700">Medicamentos e Indicaciones</h4>
                               <button type="button" onClick={addMedication} className="text-xs flex items-center bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">
                                   <Plus size={14} className="mr-1" /> Agregar Fila
                               </button>
                           </div>
                           
                           {/* HEADER FOR MEDS */}
                           <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-bold text-slate-500 uppercase px-2">
                               <div className="col-span-3">Medicamento (DCI)</div>
                               <div className="col-span-2">Dosis</div>
                               <div className="col-span-2">Frecuencia</div>
                               <div className="col-span-1">V.A.</div>
                               <div className="col-span-2">Forma (F.F.)</div>
                               <div className="col-span-1">Cant.</div>
                               <div className="col-span-1"></div>
                           </div>

                           {prescForm.medications.map((med, idx) => (
                               <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-start bg-slate-50 p-2 rounded border border-slate-100">
                                   <div className="col-span-3">
                                       <input placeholder="Nombre Genérico" className="w-full p-1.5 border rounded text-sm" value={med.name} onChange={e => updateMedication(idx, 'name', e.target.value)} />
                                   </div>
                                   <div className="col-span-2">
                                       <input placeholder="500mg" className="w-full p-1.5 border rounded text-sm" value={med.dosage} onChange={e => updateMedication(idx, 'dosage', e.target.value)} />
                                   </div>
                                   <div className="col-span-2">
                                       <input placeholder="C/8H" className="w-full p-1.5 border rounded text-sm" value={med.frequency} onChange={e => updateMedication(idx, 'frequency', e.target.value)} />
                                   </div>
                                   <div className="col-span-1">
                                       <select className="w-full p-1.5 border rounded text-sm" value={med.route} onChange={e => updateMedication(idx, 'route', e.target.value)}>
                                            <option value="VO">VO</option><option value="EV">EV</option><option value="IM">IM</option><option value="SC">SC</option><option value="SL">SL</option><option value="TOP">TOP</option>
                                        </select>
                                   </div>
                                   <div className="col-span-2">
                                       <select className="w-full p-1.5 border rounded text-sm" value={med.form} onChange={e => updateMedication(idx, 'form', e.target.value)}>
                                            <option value="TAB">TAB (Tableta)</option><option value="CAP">CAP (Cápsula)</option><option value="JBE">JBE (Jarabe)</option><option value="AMP">AMP (Ampolla)</option><option value="FCO">FCO (Frasco)</option><option value="UNG">UNG (Ungüento)</option><option value="SOL">SOL (Solución)</option>
                                        </select>
                                   </div>
                                   <div className="col-span-1">
                                       <input placeholder="01" className="w-full p-1.5 border rounded text-sm text-center" value={med.totalQuantity} onChange={e => updateMedication(idx, 'totalQuantity', e.target.value)} />
                                   </div>
                                   <div className="col-span-1 flex justify-center">
                                       <button type="button" onClick={() => removeMedication(idx)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                   </div>
                               </div>
                           ))}
                       </div>

                       <div className="pt-6 flex justify-end gap-3">
                           <button type="button" onClick={() => setIsPrescFormOpen(false)} className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
                           <button type="submit" className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors flex items-center shadow-md">
                               <Save size={18} className="mr-2" /> Guardar Receta
                           </button>
                       </div>
                   </form>
               </div>
           </div>
       )}

       {/* Appointment Modal (Edit/Create) */}
       {isApptFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] animate-fade-in flex flex-col">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">{editingApptId ? 'Editar Cita' : 'Nueva Cita'}</h2>
                    <button onClick={() => setIsApptFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleApptSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                            <input type="date" required value={newAppt.date} onChange={(e) => setNewAppt({...newAppt, date: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                            <input type="time" required value={newAppt.time} onChange={(e) => setNewAppt({...newAppt, time: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Médico</label>
                        <input type="text" required placeholder="Ej. Dr. Especialista" value={newAppt.doctor} onChange={(e) => setNewAppt({...newAppt, doctor: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                        <input required placeholder="Ej. Revisión" value={newAppt.reason} onChange={(e) => setNewAppt({...newAppt, reason: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                        <input type="text" value={newAppt.location} onChange={(e) => setNewAppt({...newAppt, location: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                        <select value={newAppt.status} onChange={(e) => setNewAppt({...newAppt, status: e.target.value as any})} className="w-full p-2 border border-slate-300 rounded-lg">
                            <option value="Programada">Programada</option>
                            <option value="Completada">Completada</option>
                            <option value="Cancelada">Cancelada</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center">
                        <Save size={18} className="mr-2" /> {editingApptId ? 'Actualizar' : 'Guardar'}
                    </button>
                </form>
            </div>
        </div>
       )}

       {/* Appointment DETAIL Modal (Read Only) */}
       {viewingAppt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0 rounded-t-xl z-10">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="text-blue-600" /> Detalle de Cita</h2>
                    <button onClick={() => setViewingAppt(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="flex justify-center mb-4">
                         <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                             <Clock size={32} />
                         </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-slate-800">{formatDate(viewingAppt.date)}</h3>
                        <p className="text-xl text-blue-600 font-bold">{viewingAppt.time} hrs</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                         <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente</label>
                             <div className="font-semibold text-slate-800">{patient.name}</div>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                             <div className={`font-bold ${viewingAppt.status === 'Programada' ? 'text-blue-600' : viewingAppt.status === 'Completada' ? 'text-green-600' : 'text-red-600'}`}>{viewingAppt.status}</div>
                         </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Médico Tratante</label>
                             <div className="flex items-center gap-2 text-slate-800">
                                 <User size={16} /> <span>{viewingAppt.doctor}</span>
                             </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo de Consulta</label>
                             <div className="text-slate-700 bg-white border border-slate-100 p-3 rounded-lg italic">"{viewingAppt.reason}"</div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ubicación</label>
                             <div className="flex items-center gap-2 text-slate-800">
                                 <MapPin size={16} /> <span>{viewingAppt.location || 'No especificada'}</span>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-xl">
                    <button onClick={() => setViewingAppt(null)} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-medium shadow-sm">Cerrar</button>
                </div>
            </div>
        </div>
       )}

       {apptToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-red-600" size={32} /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">¿Cancelar Cita?</h3>
                    <p className="text-slate-600 mb-6">Se cancelará la cita del {formatDate(apptToCancel.date)}.</p>
                    <div className="flex space-x-3 justify-center">
                        <button onClick={() => setApptToCancel(null)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg">Volver</button>
                        <button onClick={confirmCancel} className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700">Sí, Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
       )}
    </div>
  );
}
