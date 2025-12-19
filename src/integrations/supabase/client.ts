const getApiUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '3001';
  // Use HTTPS if the frontend is on HTTPS and we're not on localhost
  // But since port 3001 is likely HTTP only on most dev machines, 
  // we try to be helpful but realistic.
  return `${protocol}//${hostname}:${port}/api`;
};

const API_URL = getApiUrl();

const createChain = (table: string, method: string = 'GET', body?: any) => {
  const chain: any = {
    select: (cols: string) => chain,
    eq: (key: string, value: any) => chain,
    order: (col: string, opts: any) => chain,
    single: async () => {
      try {
        const res = await fetch(`${API_URL}/${table}?single=true`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        return { data: Array.isArray(data) ? data[0] : data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    insert: (obj: any) => createChain(table, 'POST', obj),
    update: (obj: any) => createChain(table, 'PATCH', obj),
    delete: () => createChain(table, 'DELETE'),
    limit: () => chain,
    range: () => chain,
    abortSignal: () => chain,
    maybeSingle: async () => {
      try {
        const res = await fetch(`${API_URL}/${table}?single=true`);
        const data = await res.json();
        return { data: Array.isArray(data) ? data[0] : data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    in: () => chain,
    is: () => chain,
    gte: () => chain,
    lte: () => chain,
    or: () => chain,
    then: async (onfulfilled: any) => {
      try {
        const url = `${API_URL}/${table}`;
        const options: RequestInit = {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {}
        };
        if (body) options.body = JSON.stringify(body);
        
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        return onfulfilled({ data, error: null });
      } catch (err: any) {
        return onfulfilled({ data: null, error: err });
      }
    }
  };
  return chain;
};

export const supabase: any = {
  from: (table: string) => createChain(table),
  rpc: async (fn: string, params: any) => {
    try {
      const res = await fetch(`${API_URL}/rpc/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!res.ok) throw new Error(`RPC error! status: ${res.status}`);
      const data = await res.json();
      return { data, error: null };
    } catch (err: any) {
      console.error(`RPC ${fn} failed:`, err);
      return { data: null, error: err };
    }
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/nodes`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        return { data: { path: data.storage_url }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: path.startsWith('http') ? path : `http://${window.location.hostname}:3001${path}` }
      })
    })
  },
  auth: {
    getUser: async () => ({ data: { user: { id: 'local-user', email: 'local@omni.local' } }, error: null }),
    getSession: async () => ({ data: { session: { user: { id: 'local-user' } } }, error: null }),
    onAuthStateChange: (cb: any) => {
      cb('SIGNED_IN', { user: { id: 'local-user' } });
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async (creds: any) => ({ data: { user: { id: 'local-user' } }, error: null }),
    signUp: async (creds: any) => ({ data: { user: { id: 'local-user' } }, error: null }),
    signOut: async () => ({ error: null })
  }
};
