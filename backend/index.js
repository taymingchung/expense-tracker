import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const supabase = createClient(
  'https://yhrogwhomqfofxdzhbjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlocm9nd2hvbXFmb2Z4ZHpoYmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzAyMzUsImV4cCI6MjA3OTQ0NjIzNX0.Xr1USyNJoPD_TRreSeR_d-SA0D_uRndJPgBcFn2gnK8'
);

const upload = multer({ dest: 'uploads/' });

// Icon mapping
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

async function getUser(req) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) throw new Error('No token');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) throw new Error('Invalid token');
  const { data: profile } = await supabase.from('profiles').select('is_blocked').eq('id', user.id).single();
  if (profile?.is_blocked) throw new Error('Account blocked');
  return user;
}

// GET wallets for current user
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

    let q = supabase.from('expenses').select('*').eq('user_id', user.id);

    if (wallet_id) {
      q = q.eq('wallet_id', wallet_id);
    }

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

app.get('/admin/users', async (req, res) => {
  try {
    const user = await getUser(req);
    const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!p?.is_admin) return res.status(403).json({ error: 'Forbidden' });
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const list = profiles.map(p => {
      const au = authUsers.users.find(u => u.id === p.id);
      return { id: p.id, email: au?.email || '', full_name: p.full_name || '', is_blocked: p.is_blocked };
    });
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/action', async (req, res) => {
  try {
    const admin = await getUser(req);
    const { data: ap } = await supabase.from('profiles').select('is_admin').eq('id', admin.id).single();
    if (!ap?.is_admin) return res.status(403).json({ error: 'Forbidden' });
    const { user_id, action } = req.body;
    if (action === 'delete') {
      await supabase.auth.admin.deleteUser(user_id);
      await supabase.from('expenses').delete().eq('user_id', user_id);
      await supabase.from('profiles').delete().eq('id', user_id);
    } else {
      await supabase.from('profiles').update({ is_blocked: action === 'block' }).eq('id', user_id);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(5000, '0.0.0.0', () => console.log('Backend on 5000'));