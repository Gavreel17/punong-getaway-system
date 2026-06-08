// Client-side local storage mock database helpers
const getMockData = (table: string): any[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`mock_db_${table}`);
  if (stored) return JSON.parse(stored);

  // Initialize with realistic seed data
  let initialData: any[] = [];
  if (table === 'rooms') {
    initialData = [
      {
        id: 'room-1',
        name: 'Deluxe Pool Villa',
        type: 'villa',
        description: 'Spacious pool villa with beachfront access and luxurious amenities.',
        price: 12000,
        capacity: 4,
        image_url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6',
        is_available: true,
        status: 'available',
        maintenance_start: null,
        maintenance_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'room-2',
        name: 'Beachfront Cottage',
        type: 'cottage',
        description: 'Charming traditional cottage situated right on the powdery white sand.',
        price: 6500,
        capacity: 2,
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d',
        is_available: true,
        status: 'available',
        maintenance_start: null,
        maintenance_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'room-3',
        name: 'Garden View Room',
        type: 'room',
        description: 'Cozy room overlooking our lush tropical gardens.',
        price: 4000,
        capacity: 2,
        image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
        is_available: true,
        status: 'available',
        maintenance_start: null,
        maintenance_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  } else if (table === 'profiles') {
    initialData = [
      {
        id: 'mock-admin-id',
        fullname: 'Mock Admin',
        email: 'admin@punongresort.com',
        phone: '+63 917 123 4567',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-1',
        fullname: 'John Doe',
        email: 'john@example.com',
        phone: '+63 917 111 2222',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-2',
        fullname: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+63 917 333 4444',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  } else if (table === 'bookings') {
    initialData = [
      {
        id: 'b-1',
        user_id: 'user-1',
        room_id: 'room-1',
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: '+63 917 111 2222',
        check_in: '2026-06-15',
        check_out: '2026-06-18',
        guests: 3,
        total_amount: 36000,
        status: 'approved',
        booking_status: 'approved',
        reservation_color: 'blue',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'b-2',
        user_id: 'user-2',
        room_id: 'room-2',
        guest_name: 'Jane Smith',
        guest_email: 'jane@example.com',
        guest_phone: '+63 917 333 4444',
        check_in: '2026-07-01',
        check_out: '2026-07-03',
        guests: 2,
        total_amount: 13000,
        status: 'pending',
        booking_status: 'pending',
        reservation_color: 'yellow',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  } else if (table === 'payments') {
    initialData = [
      {
        id: 'p-1',
        booking_id: 'b-1',
        user_id: 'user-1',
        amount: 36000,
        receipt_url: '',
        status: 'verified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-2',
        booking_id: 'b-2',
        user_id: 'user-2',
        amount: 13000,
        receipt_url: '',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  } else if (table === 'resort_blocks') {
    initialData = [];
  } else if (table === 'user_roles') {
    initialData = [
      {
        id: 'ur-1',
        user_id: 'mock-admin-id',
        role: 'admin',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ur-2',
        user_id: 'user-1',
        role: 'customer',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ur-3',
        user_id: 'user-2',
        role: 'customer',
        created_at: new Date().toISOString(),
      },
    ];
  }

  localStorage.setItem(`mock_db_${table}`, JSON.stringify(initialData));
  return initialData;
};

const saveMockData = (table: string, data: any[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`mock_db_${table}`, JSON.stringify(data));
};

const resolveRelationships = (table: string, data: any[], query: string) => {
  if (table === 'bookings' && query.includes('room')) {
    const rooms = getMockData('rooms');
    const profiles = getMockData('profiles');
    return data.map(b => ({
      ...b,
      room: rooms.find((r: any) => r.id === b.room_id) || { name: 'Unknown Room' },
      profile: profiles.find((p: any) => p.id === b.user_id) || { fullname: b.guest_name, email: b.guest_email },
    }));
  }
  if (table === 'payments' && query.includes('booking')) {
    const bookings = getMockData('bookings');
    const rooms = getMockData('rooms');
    return data.map(p => {
      const b = bookings.find((bk: any) => bk.id === p.booking_id) || {};
      return {
        ...p,
        booking: {
          ...b,
          guest_name: b.guest_name || 'Unknown Guest',
          room: rooms.find((r: any) => r.id === b.room_id) || { name: 'Unknown Room' },
        },
      };
    });
  }
  return data;
};

class MockQueryBuilder {
  private table: string;
  constructor(table: string) {
    this.table = table;
  }

  select(query: string = '*') {
    let data = getMockData(this.table);
    data = resolveRelationships(this.table, data, query);

    const builder: any = {
      order: (field: string, options?: { ascending: boolean }) => {
        data.sort((a: any, b: any) => {
          const valA = a[field];
          const valB = b[field];
          if (valA < valB) return options?.ascending === false ? 1 : -1;
          if (valA > valB) return options?.ascending === false ? -1 : 1;
          return 0;
        });
        const finalPromise = Promise.resolve({ data, error: null });
        Object.assign(finalPromise, builder);
        return finalPromise;
      },
      eq: (field: string, value: any) => {
        data = data.filter((x: any) => x[field] === value);
        const finalPromise = Promise.resolve({ data, error: null });
        Object.assign(finalPromise, builder);
        return finalPromise;
      },
      single: () => {
        const item = data.length > 0 ? data[0] : null;
        return Promise.resolve({ data: item, error: item ? null : { message: "Not found" } });
      },
      then: (resolve: any) => resolve({ data, error: null }),
    };

    return builder;
  }

  insert(payload: any) {
    const data = getMockData(this.table);

    let payloads = Array.isArray(payload) ? payload : [payload];
    const newRecords = payloads.map(p => {
      let finalPayload = { ...p };
      if (this.table === 'bookings' && finalPayload.status) {
        if (finalPayload.status === 'pending') finalPayload.reservation_color = 'yellow';
        else if (finalPayload.status === 'approved') finalPayload.reservation_color = 'blue';
        else if (finalPayload.status === 'rejected' || finalPayload.status === 'cancelled') finalPayload.reservation_color = 'red';
        finalPayload.booking_status = finalPayload.status;
      }
      return {
        id: Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...finalPayload,
      };
    });

    data.unshift(...newRecords);
    saveMockData(this.table, data);
    return Promise.resolve({ data: Array.isArray(payload) ? newRecords : newRecords[0], error: null });
  }

  update(payload: any) {
    return {
      eq: (field: string, value: any) => {
        const data = getMockData(this.table);
        data.forEach((x: any) => {
          if (x[field] === value) {
            let finalPayload = { ...payload };
            if (this.table === 'bookings' && finalPayload.status) {
              if (finalPayload.status === 'pending') finalPayload.reservation_color = 'yellow';
              else if (finalPayload.status === 'approved') finalPayload.reservation_color = 'blue';
              else if (finalPayload.status === 'rejected' || finalPayload.status === 'cancelled') finalPayload.reservation_color = 'red';
              finalPayload.booking_status = finalPayload.status;
            }
            Object.assign(x, finalPayload, { updated_at: new Date().toISOString() });
          }
        });
        saveMockData(this.table, data);
        return Promise.resolve({ data, error: null });
      },
    };
  }

  delete() {
    return {
      eq: (field: string, value: any) => {
        let data = getMockData(this.table);
        data = data.filter((x: any) => x[field] !== value);
        saveMockData(this.table, data);
        return Promise.resolve({ data, error: null });
      },
    };
  }
}

class MockAuth {
  private listeners: ((event: string, session: any | null) => void)[] = [];

  async signInWithPassword(credentials: { email: string; password?: string }) {
    if (typeof window === 'undefined') return { data: { user: null, session: null }, error: new Error("Window undefined") };
    
    // Find matching profile
    const profiles = getMockData('profiles');
    const profile = profiles.find((p: any) => p.email.toLowerCase() === credentials.email.toLowerCase());
    
    if (!profile) {
      return { data: { user: null, session: null }, error: new Error("Invalid login credentials") };
    }

    const mockUser = {
      id: profile.id,
      email: profile.email,
      user_metadata: { fullname: profile.fullname, phone: profile.phone },
      aud: "authenticated",
      created_at: profile.created_at || new Date().toISOString(),
    };

    const mockSession = {
      user: mockUser,
      access_token: "mock-token",
      refresh_token: "mock-refresh",
      expires_in: 3600,
      token_type: "bearer",
    };

    localStorage.setItem('mock_session', JSON.stringify(mockSession));
    this.notify('SIGNED_IN', mockSession);

    return { data: { user: mockUser, session: mockSession }, error: null };
  }

  async signUp(options: { email: string; password?: string; options?: { data?: any } }) {
    if (typeof window === 'undefined') return { data: { user: null, session: null }, error: new Error("Window undefined") };
    
    const profiles = getMockData('profiles');
    const existing = profiles.find((p: any) => p.email.toLowerCase() === options.email.toLowerCase());
    if (existing) {
      return { data: { user: null, session: null }, error: new Error("User already exists") };
    }

    const newId = 'user-' + Math.random().toString(36).substring(2, 11);
    const newProfile = {
      id: newId,
      fullname: options.options?.data?.fullname || options.email.split('@')[0],
      email: options.email,
      phone: options.options?.data?.phone || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    profiles.push(newProfile);
    saveMockData('profiles', profiles);

    // Save default role as customer
    const userRoles = getMockData('user_roles');
    userRoles.push({
      id: 'role-' + Math.random().toString(36).substring(2, 11),
      user_id: newId,
      role: 'customer',
      created_at: new Date().toISOString(),
    });
    saveMockData('user_roles', userRoles);

    const mockUser = {
      id: newId,
      email: options.email,
      user_metadata: { fullname: newProfile.fullname, phone: newProfile.phone },
      aud: "authenticated",
      created_at: newProfile.created_at,
    };

    const mockSession = {
      user: mockUser,
      access_token: "mock-token",
      refresh_token: "mock-refresh",
      expires_in: 3600,
      token_type: "bearer",
    };

    localStorage.setItem('mock_session', JSON.stringify(mockSession));
    this.notify('SIGNED_IN', mockSession);

    return { data: { user: mockUser, session: mockSession }, error: null };
  }

  async signOut() {
    if (typeof window === 'undefined') return { error: null };
    localStorage.removeItem('mock_session');
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  async getSession() {
    if (typeof window === 'undefined') return { data: { session: null }, error: null };
    const stored = localStorage.getItem('mock_session');
    return { data: { session: stored ? JSON.parse(stored) : null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: any | null) => void) {
    this.listeners.push(callback);
    
    // Immediately send current session
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mock_session');
      if (stored) {
        callback('INITIAL_SESSION', JSON.parse(stored));
      } else {
        callback('INITIAL_SESSION', null);
      }
    }

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(l => l !== callback);
          }
        }
      }
    };
  }

  private notify(event: string, session: any | null) {
    setTimeout(() => {
      this.listeners.forEach(l => l(event, session));
    }, 0);
  }
}

const mockAuthInstance = new MockAuth();

// Return a client that uses the local mock database and mock auth exclusively
export const supabase: any = {
  from: (table: string) => new MockQueryBuilder(table),
  auth: mockAuthInstance,
};
