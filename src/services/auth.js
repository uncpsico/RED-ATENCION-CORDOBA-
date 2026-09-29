import { supabase } from '../lib/supabase.js';

async function esAdmin(session) {
  if (!session) return false;
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  return !!data;
}

export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(/invalid/i.test(error.message) ? 'Email o contraseña incorrectos.' : 'No se pudo iniciar sesión. Probá de nuevo.');
  if (!(await esAdmin(data.session))) {
    await supabase.auth.signOut();
    throw new Error('Esta cuenta no tiene permisos de administración.');
  }
}

export async function cerrarSesion() { await supabase.auth.signOut(); }

/** Llama a `cb(esAdmin, email)` al iniciar y cada vez que cambia la sesión. */
export function escucharSesion(cb) {
  supabase.auth.onAuthStateChange((_evento, session) => {
    // se difiere para no llamar a Supabase dentro del callback de auth
    setTimeout(async () => cb(await esAdmin(session), session?.user?.email || ''), 0);
  });
}
