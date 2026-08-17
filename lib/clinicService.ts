import { supabase } from '@/lib/supabase';

export interface ClinicSettings {
  name: string;
  subtitle: string;
  address: string;
  phone: string;
  logo_url?: string;
}

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  name: 'Clínica Axis GC',
  subtitle: 'Agendamento de Consultas',
  address: 'Av. Paulista, 1000 - São Paulo, SP',
  phone: '(11) 3222-4444',
  logo_url: ''
};

const LOCAL_STORAGE_KEY = 'auriculocare_clinic';
const LOCAL_STORAGE_KEY_ALT = 'axis_clinic_settings';

/**
 * Carrega as configurações da clínica (localStorage + Supabase com fallback)
 */
export async function getClinicSettings(organizationId?: string | null): Promise<ClinicSettings> {
  let settings: ClinicSettings = { ...DEFAULT_CLINIC_SETTINGS };

  // 1. Tenta carregar do localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LOCAL_STORAGE_KEY_ALT);
      if (saved) {
        const parsed = JSON.parse(saved);
        settings = { ...settings, ...parsed };
      }
    } catch (e) {
      console.warn('Erro ao ler clinic settings do localStorage:', e);
    }
  }

  // 2. Tenta buscar no Supabase
  if (supabase) {
    try {
      // 2.a Tenta buscar da tabela system_settings (útil para acessos públicos como /pre-agendamento)
      const { data: sysData } = await supabase
        .from('system_settings')
        .select('clinic_info')
        .eq('id', 1)
        .maybeSingle();

      if (sysData && (sysData as any).clinic_info) {
        const info = (sysData as any).clinic_info;
        if (info.name) settings.name = info.name;
        if (info.subtitle) settings.subtitle = info.subtitle;
        if (info.address) settings.address = info.address;
        if (info.phone) settings.phone = info.phone;
        if (info.logo_url !== undefined) settings.logo_url = info.logo_url;
      }

      // 2.b Se organizationId for fornecido, tenta buscar dados da organização para sobrepor
      if (organizationId) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name, metadata')
          .eq('id', organizationId)
          .maybeSingle();

        if (orgData) {
          const meta = (orgData.metadata as any) || {};
          settings = {
            ...settings,
            name: orgData.name || settings.name,
            subtitle: meta.subtitle || settings.subtitle,
            address: meta.address || settings.address,
            phone: meta.phone || settings.phone,
            logo_url: meta.logo_url || settings.logo_url
          };
        }
      }
    } catch (err) {
      console.warn('Aviso ao carregar clinic settings do Supabase:', err);
    }
  }

  return settings;
}

/**
 * Salva as configurações da clínica no localStorage e no Supabase
 */
export async function saveClinicSettings(
  newSettings: ClinicSettings,
  organizationId?: string | null
): Promise<{ success: boolean; message?: string }> {
  try {
    const updatedSettings: ClinicSettings = {
      name: newSettings.name.trim() || DEFAULT_CLINIC_SETTINGS.name,
      subtitle: newSettings.subtitle?.trim() || DEFAULT_CLINIC_SETTINGS.subtitle,
      address: newSettings.address?.trim() || DEFAULT_CLINIC_SETTINGS.address,
      phone: newSettings.phone?.trim() || DEFAULT_CLINIC_SETTINGS.phone,
      logo_url: newSettings.logo_url || ''
    };

    // 1. Salva no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSettings));
      localStorage.setItem(LOCAL_STORAGE_KEY_ALT, JSON.stringify(updatedSettings));
      window.dispatchEvent(new CustomEvent('clinic_settings_updated', { detail: updatedSettings }));
    }

    // 2. Salva no Supabase (system_settings e organizations)
    if (supabase) {
      // 2.a Atualiza em system_settings para acesso público (/pre-agendamento)
      const { error: sysErr } = await supabase
        .from('system_settings')
        .upsert({
          id: 1,
          clinic_info: updatedSettings,
          updated_at: new Date().toISOString()
        } as any);

      if (sysErr) {
        console.warn('Aviso ao atualizar system_settings:', sysErr.message);
      }

      // 2.b Se houver organizationId, atualiza em organizations
      if (organizationId) {
        const { error: orgErr } = await supabase
          .from('organizations')
          .update({
            name: updatedSettings.name,
            metadata: {
              subtitle: updatedSettings.subtitle,
              address: updatedSettings.address,
              phone: updatedSettings.phone,
              logo_url: updatedSettings.logo_url
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', organizationId);

        if (orgErr) {
          console.warn('Aviso ao atualizar organizations:', orgErr.message);
        }
      }
    }

    return { success: true, message: 'Configurações da clínica salvas com sucesso!' };
  } catch (err: any) {
    console.error('Erro ao salvar configurações da clínica:', err);
    return { success: false, message: err.message || 'Erro ao salvar no banco de dados.' };
  }
}
