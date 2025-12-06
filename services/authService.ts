import { supabase, isDbConfigured } from './supabaseClient';
import CryptoJS from 'crypto-js';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  // New Professional Fields
  specialty?: string;
  licenseNumber?: string;
  phone?: string;
}

// --- AUTHENTICATION SERVICES ---

export const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
    if (!isDbConfigured || !supabase) {
        throw new Error("Base de datos no configurada.");
    }

    // 1. Try Supabase Auth (Native) first - Best practice
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    // CRITICAL FIX: Handle unverified email explicitly
    if (authError) {
        if (authError.message.includes("Email not confirmed")) {
            throw new Error("Email not confirmed");
        }
    }

    if (!authError && authData.user) {
        // Fetch extra profile details form public.users table
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        return {
            id: authData.user.id,
            email: authData.user.email!,
            fullName: profile?.full_name || authData.user.user_metadata.full_name || 'Usuario',
            role: 'medico',
            specialty: profile?.specialty || '',
            licenseNumber: profile?.license_number || '',
            phone: profile?.phone || ''
        };
    }

    // 2. FALLBACK: Custom Table Auth (Legacy support)
    const passwordHash = CryptoJS.SHA256(password).toString();
    
    const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('username', email)
        .eq('password_hash', passwordHash)
        .single();

    if (dbError || !dbUser) {
        throw new Error('Credenciales inválidas');
    }

    return {
        id: dbUser.id,
        email: dbUser.username,
        fullName: dbUser.full_name || 'Dr. Admin',
        role: dbUser.role || 'admin',
        specialty: dbUser.specialty,
        licenseNumber: dbUser.license_number,
        phone: dbUser.phone
    };
};

export const registerUser = async (
    email: string, 
    password: string, 
    fullName: string,
    specialty?: string,
    licenseNumber?: string,
    phone?: string
): Promise<UserProfile> => {
    if (!isDbConfigured || !supabase) {
        throw new Error("Base de datos no configurada.");
    }

    // 0. MANUAL DUPLICATE CHECK
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', email)
        .maybeSingle();

    if (existingUser) {
        throw new Error("Este correo electrónico ya está registrado. Por favor inicie sesión.");
    }

    // 1. Register in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                specialty,
                license_number: licenseNumber,
                phone
            }
        }
    });

    if (error) {
        if (error.message.includes("already registered") || error.status === 422) {
            throw new Error("Este correo electrónico ya está registrado.");
        }
        throw error;
    }

    if (data.user && !data.session) {
         throw new Error("Registro exitoso. Por favor revise su correo para confirmar la cuenta antes de ingresar.");
    }

    if (data.user) {
        // Force insert into public table to ensure extra fields are saved immediately
        // The trigger might handle this, but explicit upsert ensures data integrity for new fields
        await supabase.from('users').upsert({
            id: data.user.id,
            username: email,
            full_name: fullName,
            specialty: specialty,
            license_number: licenseNumber,
            phone: phone,
            role: 'medico',
            password_hash: 'google_auth_placeholder'
        });

        return {
            id: data.user.id,
            email: data.user.email!,
            fullName: fullName,
            role: 'medico',
            specialty,
            licenseNumber,
            phone
        };
    }
    
    throw new Error("Error desconocido al registrar.");
};

export const updateUserProfile = async (
    userId: string, 
    fullName: string,
    specialty?: string,
    licenseNumber?: string,
    phone?: string
): Promise<boolean> => {
    if (!isDbConfigured || !supabase) return false;

    // 1. Update Supabase Auth Metadata
    const { error: authError } = await supabase.auth.updateUser({
        data: { 
            full_name: fullName,
            specialty,
            license_number: licenseNumber,
            phone
        }
    });

    if (authError) {
        console.error("Auth update error:", authError);
        throw new Error("Error al actualizar credenciales: " + authError.message);
    }

    // 2. Update Public Users Table
    const { data: { user } } = await supabase.auth.getUser();

    const { error: dbError } = await supabase
        .from('users')
        .upsert({ 
            id: userId, 
            full_name: fullName,
            specialty: specialty,
            license_number: licenseNumber,
            phone: phone,
            username: user?.email || 'unknown',
            role: 'medico',
            password_hash: 'google_auth_placeholder' 
        }, { onConflict: 'id' });

    if (dbError) {
        console.error("DB Sync error:", dbError);
        throw new Error("Error al guardar datos en base de datos: " + dbError.message);
    }

    return true;
};

export const deleteUserAccount = async (): Promise<void> => {
    if (!isDbConfigured || !supabase) return;

    // 1. Try to delete public profile directly first (needs RLS policy)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // We attempt this but ignore errors if RLS blocks it, as the RPC below is the ultimate authority
        await supabase.from('users').delete().eq('id', user.id);
    }

    // 2. Call the RPC function to self-delete from auth.users (and clean up public via RPC logic)
    const { error } = await supabase.rpc('delete_own_account');

    if (error) {
        console.error("Error deleting account:", error);
        throw new Error("No se pudo eliminar la cuenta: " + error.message);
    }

    await supabase.auth.signOut();
};

export const signOut = async () => {
    if (supabase) {
        await supabase.auth.signOut();
    }
};

export const getCurrentSession = async (): Promise<UserProfile | null> => {
    if (!supabase) return null;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
        // Fetch full profile from DB to get extra fields
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

         return {
            id: session.user.id,
            email: session.user.email!,
            fullName: profile?.full_name || session.user.user_metadata.full_name || 'Usuario',
            role: 'medico',
            specialty: profile?.specialty || '',
            licenseNumber: profile?.license_number || '',
            phone: profile?.phone || ''
        };
    }
    return null;
};