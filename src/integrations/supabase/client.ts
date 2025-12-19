const API_URL = `http://${window.location.hostname}:3001/api`;

const createChain = (table: string, method: string = 'GET', body?: any) => {
  const chain: any = {
    select: (cols: string) => {
      // In our simple case, we ignore columns and just fetch everything
      return chain;
    },
    eq: (key: string, value: any) => {
      // Simple filter simulation or query param building
      return chain;
    },
    order: (col: string, opts: any) => {
      return chain;
    },
    single: async () => {
      const res = await fetch(`${API_URL}/${table}`);
      const data = await res.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    },
    insert: (obj: any) => {
      return createChain(table, 'POST', obj);
    },
    update: (obj: any) => {
      return createChain(table, 'PATCH', obj);
    },
    delete: () => {
      return createChain(table, 'DELETE');
    },
    // Chained methods return the chain
    limit: () => chain,
    range: () => chain,
    abortSignal: () => chain,
    // Final executor
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
    }
  }
};
