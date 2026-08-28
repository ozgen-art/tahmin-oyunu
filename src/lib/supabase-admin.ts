import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SADECE sunucu tarafında (server action,
 * server component, lib fonksiyonu) kullanılmalıdır — service-role anahtarı
 * RLS'i bypass eder. `server-only` importu, bu dosyanın yanlışlıkla bir
 * client component'e bundle edilmesini derleme zamanında engeller.
 *
 * (JCI Bursa projesindeki aynı desenin kopyası.)
 */
let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase ortam değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env dosyasında tanımlı olmalı."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}
