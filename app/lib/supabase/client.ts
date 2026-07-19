import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

function createMissingSupabaseClient() {
  const missingClientError = () => {
    throw new Error(
      "Supabase environment variables are required to use this feature. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  };

  const proxyHandler: ProxyHandler<typeof missingClientError> = {
    get() {
      return proxyClient;
    },
    apply() {
      missingClientError();
      return undefined;
    },
  };

  const proxyClient = new Proxy(missingClientError, proxyHandler);
  return proxyClient as unknown as ReturnType<typeof createClient>;
}

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : createMissingSupabaseClient();