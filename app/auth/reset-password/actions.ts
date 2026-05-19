'use server';

import { createClient } from '@/lib/supabase/server';

export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string;

  if (!password || password.trim().length < 6) {
    return { error: 'Informe uma nova senha com pelo menos 6 caracteres.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message || 'Não foi possível atualizar a senha. Tente novamente.' };
  }

  return { success: true };
}
