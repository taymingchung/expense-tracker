import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import 'dotenv/config';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/* -------------------------------------------------
   🔐  USE ANON KEY FOR NORMAL USER AUTH (VERY IMPORTANT)
--------------------------------------------------- */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY   // <--- REPLACE with your anon key
);

/* -------------------------------------------------
   🔐  ADMIN CLIENT USING SERVICE ROLE KEY
   - ONLY USED FOR admin.listUsers(), admin.deleteUser()
--------------------------------------------------- */
const adminClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // <--- use service key here
);
console.log("Service role key loaded?", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const upload = multer({ dest: 'uploads/' });

/* ICON MAP */
const iconMap = {
  '🛒': 'shopping',
  '🍔': 'food',
  '🚗': 'transport',
  '🏥': 'health',
  '📚': 'education',
  '🎬': 'entertainment',
  '✈️': 'travel',
  '🏠': 'housing',
  '⚡': 'utilities',
  '💻': 'electronics',
  '👕': 'clothing',
  '🎮': 'gaming',
  '🌮': 'dining',
  '☕': 'beverages',
  '🎫': 'events'
};
const reverseIconMap = Object.fromEntries(Object.entries(iconMap).map(([k, v]) => [v, k]));

/* -------------------------------------------------
   🔐  FIXED USER AUTH FUNCTION
--------------------------------------------------- */
async function getUser(req) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) throw new Error('No token');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) throw new Error('Invalid token');
  const { data: profile } = await supabase.from('profiles').select('is_blocked').eq('id', user.id).single();
  if (profile?.is_blocked) throw new Error('Account blocked');
  return user;
}

/* -------------------------------------------------
   WALLET ENDPOINTS (unchanged)
--------------------------------------------------- */
app.get('/wallets', async (req, res) => {
  try {
    const user = await getUser(req);
    
    const { data: owned } = await supabase
      .from('wallets')
      .select('id, name, owner_id, created_at')
      .eq('owner_id', user.id);

    const { data: shared } = await supabase
      .from('wallet_members')
      .select('wallets!inner(id, name, owner_id, created_at)')
      .eq('user_id', user.id);

    const sharedWallets = shared?.map(m => m.wallets) || [];
    const walletMap = new Map();
    [...(owned || []), ...sharedWallets].forEach(w => {
      if (!walletMap.has(w.id)) {
        walletMap.set(w.id, w);
      }
    });

    const allWallets = Array.from(walletMap.values());
    res.json(allWallets);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// CREATE new wallet
app.post('/wallets', async (req, res) => {
  try {
    const user = await getUser(req);
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Wallet name is required' });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .insert({ name: name.trim(), owner_id: user.id })
      .select()
      .single();

    if (walletError) throw walletError;

    const { error: memberError } = await supabase
      .from('wallet_members')
      .insert({ wallet_id: wallet.id, user_id: user.id, role: 'owner' });

    if (memberError) throw memberError;

    res.json({ success: true, data: wallet });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// ADD member to wallet
app.post('/wallets/:wallet_id/members', async (req, res) => {
  try {
    const user = await getUser(req);
    const { wallet_id } = req.params;
    const { email, role } = req.body;

    // Check if user is owner
    const { data: ownership } = await supabase
      .from('wallet_members')
      .select('role')
      .eq('wallet_id', wallet_id)
      .eq('user_id', user.id)
      .single();

    if (!ownership || ownership.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can add members' });
    }

    // Get user by email
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const targetUser = authUsers.users.find(u => u.email === email);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabase
      .from('wallet_members')
      .insert({ wallet_id, user_id: targetUser.id, role: role || 'member' });

    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// DELETE expense
app.delete('/expenses/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    const { id } = req.params;

    // Verify ownership
    const { data: expense } = await supabase
      .from('expenses')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!expense || expense.user_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// UPDATE expense
app.put('/expenses/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    const { id } = req.params;
    const { item, price, store, date, icon } = req.body;

    // Verify ownership
    const { data: expense } = await supabase
      .from('expenses')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!expense || expense.user_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const categoryName = iconMap[icon] || 'shopping';

    const { data, error } = await supabase
      .from('expenses')
      .update({
        item: item?.trim(),
        price: parseFloat(price),
        store: store?.trim() || 'Unknown Store',
        date,
        category: categoryName
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        ...data,
        icon: reverseIconMap[data.category] || '🛒'
      }
    });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const user = await getUser(req)
    const wallet_id = req.body.wallet_id || null

    const results = []

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        const expenses = results.map(row => ({
          user_id: user.id,
          wallet_id: wallet_id,
          date: row.date || row.Date || row['Purchase Date'],
          item: (row.item || row.Item || row.Description || row.Product || '').trim(),
          store: row.store || row.Store || row.Shop || row.Merchant || '',
          price: parseFloat(row.price || row.Price || row.Amount || row.Total || 0),
          category: row.category || row.Category || 'shopping'
        })).filter(e => e.item && e.price > 0 && e.date)

        const { error } = await supabase.from('expenses').insert(expenses)
        fs.unlinkSync(req.file.path)
        if (error) throw error

        res.json({ success: true, inserted: expenses.length })
      })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
})

app.post('/expenses', async (req, res) => {
  try {
    const user = await getUser(req);
    const { wallet_id, item, price, store, date, icon } = req.body;

    if (!item || !price || !wallet_id) {
      return res.status(400).json({ error: 'Missing required fields: item, price, wallet_id' });
    }

    // Check if user is a wallet member OR the wallet owner
    const { data: walletAccess } = await supabase
      .from('wallet_members')
      .select('id')
      .eq('wallet_id', wallet_id)
      .eq('user_id', user.id)
      .single();

    const { data: wallet } = await supabase
      .from('wallets')
      .select('owner_id')
      .eq('id', wallet_id)
      .single();

    // Must be either a member OR the owner
    if (!walletAccess && (!wallet || wallet.owner_id !== user.id)) {
      return res.status(403).json({ error: 'No access to this wallet' });
    }

    const categoryName = iconMap[icon] || 'shopping';

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        wallet_id: wallet_id,
        item: item.trim(),
        price: parseFloat(price),
        store: store?.trim() || 'Unknown Store',
        date: date || new Date().toISOString().split('T')[0],
        category: categoryName
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      success: true, 
      data: {
        ...data,
        icon: reverseIconMap[categoryName] || '🛒'
      }
    });
  } catch (err) {
    console.error('POST /expenses error:', err);
    res.status(401).json({ error: err.message });
  }
});

app.get('/expenses', async (req, res) => {
  try {
    const user = await getUser(req);
    const { wallet_id, month, year, search } = req.query;

    if (!wallet_id) {
      return res.json([]);
    }

    // Verify user has access to this wallet
    const { data: member, error: memberError } = await supabase
      .from('wallet_members')
      .select('user_id')
      .eq('wallet_id', wallet_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      return res.status(403).json({ error: 'No access to this wallet' });
    }

    let q = supabase.from('expenses').select('*').eq('wallet_id', wallet_id);

    if (month && year) {
      q = q.gte('date', `${year}-${month.padStart(2,'0')}-01`).lt('date', `${year}-${(parseInt(month)+1).toString().padStart(2,'0')}-01`);
    }
    if (search) q = q.ilike('item', `%${search}%`);
    q = q.order('date', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;

    const enrichedData = data.map(exp => ({
      ...exp,
      icon: reverseIconMap[exp.category] || '🛒'
    }));

    res.json(enrichedData);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

/* -------------------------------------------------
   ADMIN: GET USERS (FIXED TO USE adminClient)
--------------------------------------------------- */
app.get('/admin/users', async (req, res) => {
  try {
    const user = await getUser(req);

    // Check if current user is admin (bypass RLS)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return res.status(403).json({ error: 'Forbidden - not admin' });
    }

    // ← THIS IS THE FIX: use adminClient to get ALL profiles
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('*');

    // Get emails from auth.users (still needs service_role)
    const { data: authUsers } = await adminClient.auth.admin.listUsers();

    const list = profiles.map(p => {
      const au = authUsers.users.find(u => u.id === p.id);
      return {
        id: p.id,
        email: au?.email || '—',
        full_name: p.full_name || '—',
        is_blocked: p.is_blocked || false,
        created_at: p.created_at
      };
    });

    res.json(list);
  } catch (e) {
    console.error('Admin users error:', e);
    res.status(500).json({ error: e.message });
  }
});

/* -------------------------------------------------
   ADMIN ACTIONS (delete, block/unblock) — FIXED
--------------------------------------------------- */
app.post('/admin/action', async (req, res) => {
  try {
    const user = await getUser(req);

    // ← ONLY USE adminClient to check is_admin
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return res.status(403).json({ error: 'Forbidden - not admin' });
    }

    const { user_id, action } = req.body;

    if (action === 'delete') {
      await adminClient.auth.admin.deleteUser(user_id);
      await supabase.from('expenses').delete().eq('user_id', user_id);
      await supabase.from('profiles').delete().eq('id', user_id);
    } else {
      // block or unblock
      await supabase
        .from('profiles')
        .update({ is_blocked: action === 'block' })
        .eq('id', user_id);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Admin action error:', e);
    res.status(500).json({ error: e.message });
  }
})


/* -------------------------------------------------
   START SERVER
--------------------------------------------------- */
app.listen(5000, '0.0.0.0', () =>
  console.log('Backend running on port 5000')
);
