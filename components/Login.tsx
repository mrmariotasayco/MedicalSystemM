import React, { useState } from 'react';
import { Stethoscope, Lock, User, ArrowRight, Database, AlertCircle, Loader2, Mail, UserPlus, Phone, Award, FileBadge, CheckCircle2, XCircle } from 'lucide-react';
import { isDbConfigured } from '../services/supabaseClient';
import { loginWithEmail, registerUser, UserProfile } from '../services/authService';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // New Professional Fields
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  
  // UI State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Validation Logic
  const validatePasswordRules = (pass: string, userEmail: string) => {
      if (pass === userEmail) return "La contraseña no puede ser igual al correo electrónico.";
      if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
      if (!/[A-Z]/.test(pass)) return "La contraseña debe incluir al menos una letra mayúscula.";
      if (!/\d/.test(pass)) return "La contraseña debe incluir al menos un número.";
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) return "La contraseña debe incluir al menos un símbolo especial.";
      return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (isRegistering) {
            // REGISTER FLOW
            if (!fullName || !email || !password || !confirmPassword) throw new Error("Todos los campos obligatorios deben llenarse.");
            
            // 1. Check Passwords Match
            if (password !== confirmPassword) {
                throw new Error("Las contraseñas no coinciden.");
            }

            // 2. Validate Password Complexity
            const passwordError = validatePasswordRules(password, email);
            if (passwordError) {
                throw new Error(passwordError);
            }
            
            await registerUser(
                email, 
                password, 
                fullName,
                specialty,
                licenseNumber,
                phone
            );
            
            // SUCCESS: Redirect to Login View instead of auto-login
            alert("Registro exitoso. Por favor inicie sesión con sus nuevas credenciales.");
            setIsRegistering(false);
            setPassword('');
            setConfirmPassword('');
            
        } else {
            // LOGIN FLOW
            if (!email || !password) throw new Error("Ingrese usuario y contraseña.");
            
            // Demo Mode Check (Local fallback)
            if (!isDbConfigured) {
                // Simulate delay
                await new Promise(resolve => setTimeout(resolve, 800));
                if (email === 'admin' && password === 'admin') {
                    onLogin({ 
                        id: 'demo-id', 
                        email: 'admin@demo.com', 
                        fullName: 'Dr. Admin (Demo)', 
                        role: 'admin',
                        specialty: 'Medicina General' 
                    });
                } else {
                    throw new Error("Credenciales inválidas (Demo: admin/admin)");
                }
            } else {
                // Real DB Login
                const user = await loginWithEmail(email, password);
                onLogin(user);
            }
        }
    } catch (err: any) {
        // Translation for common Supabase errors
        let msg = err.message || 'Error de autenticación';
        
        if (msg.includes('Invalid login credentials')) msg = 'Usuario o contraseña incorrectos.';
        if (msg.includes('already registered')) msg = 'Este correo ya está registrado.';
        
        // Custom message for unverified emails
        if (msg.includes('Email not confirmed')) {
            msg = 'Por favor verifica tu usuario para poder ingresar, revisa tu bandeja de entrada o spam.';
        }
        
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setError('');
      // Reset sensitive fields only
      setPassword('');
      setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${isRegistering ? 'max-w-2xl' : 'max-w-md'} overflow-hidden flex flex-col animate-fade-in transition-all duration-500`}>
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-10 -translate-y-10"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-10 translate-y-10"></div>

          <div className="relative z-10">
            <div className="inline-flex p-3 bg-white/20 rounded-xl mb-4 backdrop-blur-sm shadow-inner">
                <Stethoscope size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">MedicalMarioLT</h1>
            <p className="text-blue-100 mt-2 text-sm font-medium opacity-90">Sistema Integral de Gestión Clínica</p>
          </div>
          
          <div className="absolute top-4 right-4 z-20">
             {isDbConfigured ? (
                <div className="flex items-center space-x-1 bg-green-500/20 text-green-100 px-2 py-1 rounded text-[10px] font-bold border border-green-500/30">
                    <Database size={10} />
                    <span>ONLINE</span>
                </div>
             ) : (
                <div className="flex items-center space-x-1 bg-amber-500/20 text-amber-100 px-2 py-1 rounded text-[10px] font-bold border border-amber-500/30" title="Modo Demo">
                    <Database size={10} />
                    <span>DEMO</span>
                </div>
             )}
          </div>
        </div>
        
        <div className="p-8">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-slate-100">
              <button 
                onClick={() => isRegistering && toggleMode()}
                className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${!isRegistering ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                  Iniciar Sesión
              </button>
              <button 
                onClick={() => !isRegistering && toggleMode()}
                className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${isRegistering ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                  Crear Cuenta
              </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors bg-slate-50 focus:bg-white"
                                placeholder="Ej. Dr. Juan Pérez"
                                disabled={loading}
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
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                                placeholder="Ej. Cardiología"
                                disabled={loading}
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
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                                placeholder="Num. Licencia"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono (Opcional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                                placeholder="+52 ..."
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors bg-slate-50 focus:bg-white"
                  placeholder={isRegistering ? "correo@ejemplo.com" : "correo@ejemplo.com"}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={isRegistering ? '' : 'md:col-span-2'}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña *</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-400" />
                        </div>
                        <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors bg-slate-50 focus:bg-white"
                        placeholder="••••••••"
                        disabled={loading}
                        />
                    </div>
                    {isRegistering && password && (
                        <div className="mt-1 text-[10px] text-slate-400">
                            Min 8 caracteres, 1 Mayus, 1 Num, 1 Simbolo.
                        </div>
                    )}
                </div>

                {isRegistering && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Contraseña *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={18} className={confirmPassword && password === confirmPassword ? "text-green-500" : "text-slate-400"} />
                            </div>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 outline-none transition-colors bg-slate-50 focus:bg-white ${
                                    confirmPassword && password !== confirmPassword 
                                    ? 'border-red-300 focus:ring-red-500' 
                                    : 'border-slate-300 focus:ring-blue-500'
                                }`}
                                placeholder="Repetir clave"
                                disabled={loading}
                            />
                            {confirmPassword && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    {password === confirmPassword ? (
                                        <CheckCircle2 size={16} className="text-green-500" />
                                    ) : (
                                        <XCircle size={16} className="text-red-500" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2 animate-fade-in border border-red-100">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="leading-tight">{error}</span>
                </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center space-x-2 bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-all transform active:scale-[0.98] font-bold shadow-lg shadow-slate-900/20 ${loading ? 'opacity-80 cursor-wait' : ''}`}
            >
              {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Procesando...</span>
                  </>
              ) : (
                  <>
                    {isRegistering ? <UserPlus size={18} /> : <ArrowRight size={18} />}
                    <span>{isRegistering ? 'Registrarse' : 'Iniciar Sesión'}</span>
                  </>
              )}
            </button>
          </form>

          {!isDbConfigured && !isRegistering && (
            <div className="mt-6 text-center bg-amber-50 p-3 rounded-lg border border-amber-100 border-dashed">
                <p className="text-[10px] text-amber-600 uppercase font-bold mb-1">Modo Demo Local</p>
                <p className="text-xs text-amber-800">
                    User: <span className="font-mono font-bold">admin</span> <br/> 
                    Pass: <span className="font-mono font-bold">admin</span>
                </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">© 2024 MedicalMarioLT | Seguridad SHA-256</p>
          </div>
        </div>
      </div>
    </div>
  );
};
