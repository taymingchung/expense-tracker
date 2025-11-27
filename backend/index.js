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

const upload = multer({ dest: 'uploads/' });

// ========================================================
// SUPABASE CLIENTS
// ========================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const adminClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ========================================================
// ICON MAP
// ========================================================

const iconMap = {
  '🛒': 'shopping', '🍔': 'food', '🚗': 'transport', '🏥': 'health',
  '📚': 'education', '🎬': 'entertainment', '✈️': 'travel', '🏠': 'housing',
  '⚡': 'utilities', '💻': 'electronics', '👕': 'clothing', '🎮': 'gaming',
  '🌮': 'dining', '☕': 'beverages', '🎫': 'events',
  '💰': 'salary', '💼': 'business', '📈': 'invest', '🎁': 'bonus'
};

const reverseIconMap = Object.fromEntries(Object.entries(iconMap).map(([k, v]) => [v, k]));

// ========================================================
// AUTH
// ========================================================

async function getUser(req) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) throw new Error('No token');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) throw new Error('Invalid token');
  
  const { data: profile } = await supabase.from('profiles').select('is_blocked').eq('id', user.id).single();
  if (profile?.is_blocked) throw new Error('Account blocked');
  return user;
}

// ========================================================
// WALLETS (Unchanged)
// ========================================================

app.get('/wallets', async (req, res) => {
  try {
    const user = await getUser(req);
    const { data: owned } = await supabase.from('wallets').select('*').eq('owner_id', user.id);
    const { data: shared } = await supabase.from('wallet_members').select('wallets!inner(*)').eq('user_id', user.id);
    
    // Merge and Deduplicate
    const all = [...(owned || []), ...(shared?.map(m => m.wallets) || [])];
    const unique = Array.from(new Map(all.map(w => [w.id, w])).values());
    
    res.json(unique);
  } catch (e) { res.status(401).json({ error: e.message }); }
});

app.post('/wallets', async (req, res) => {
  try {
    const user = await getUser(req);
    const { name } = req.body;
    const { data: wallet, error } = await supabase.from('wallets').insert({ name, owner_id: user.id }).select().single();
    if (error) throw error;
    await supabase.from('wallet_members').insert({ wallet_id: wallet.id, user_id: user.id, role: 'owner' });
    res.json({ success: true, data: wallet });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/wallets/:wallet_id', async (req, res) => {
  try {
    const user = await getUser(req);
    const { wallet_id } = req.params;
    
    const { data: wallet } = await supabase.from('wallets').select('owner_id').eq('id', wallet_id).single();
    if (wallet?.owner_id !== user.id) return res.status(403).json({ error: 'Not owner' });

    // UPDATED TABLE NAME HERE
    await supabase.from('transactions').delete().eq('wallet_id', wallet_id); 
    await supabase.from('wallet_members').delete().eq('wallet_id', wallet_id);
    await supabase.from('wallets').delete().eq('id', wallet_id);
    
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========================================================
// TRANSACTIONS (FORMERLY EXPENSES)
// ========================================================

app.post('/expenses', async (req, res) => {
  try {
    const user = await getUser(req);
    // Get category_type (income/expense)
    const { wallet_id, item, price, store, date, icon, category_type } = req.body;

    // Validate
    const { data: member } = await supabase.from('wallet_members').select('id').eq('wallet_id', wallet_id).eq('user_id', user.id).maybeSingle();
    const { data: owner } = await supabase.from('wallets').select('owner_id').eq('id', wallet_id).single();
    if (!member && owner?.owner_id !== user.id) return res.status(403).json({ error: 'No access' });

    // UPDATED TABLE NAME HERE
    const { data, error } = await supabase
      .from('transactions') 
      .insert({
        user_id: user.id,
        wallet_id,
        item: item.trim(),
        price: parseFloat(price),
        store: store || (category_type === 'income' ? 'Source' : 'Store'),
        date: date || new Date().toISOString().split('T')[0],
        icon: icon || '🛒',
        category_type: category_type || 'expense' // Default to expense
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

app.get('/expenses', async (req, res) => {
  try {
    const user = await getUser(req);
    const { wallet_id, month, year, search } = req.query;
    
    // Check Access
    const { data: member } = await supabase.from('wallet_members').select('id').eq('wallet_id', wallet_id).eq('user_id', user.id).maybeSingle();
    const { data: owner } = await supabase.from('wallets').select('owner_id').eq('id', wallet_id).single();
    if (!member && owner?.owner_id !== user.id) return res.status(403).json({ error: 'No access' });

    // UPDATED TABLE NAME HERE
    let q = supabase.from('transactions').select('*').eq('wallet_id', wallet_id);

    if (month && year) {
       q = q.gte('date', `${year}-${month.padStart(2,'0')}-01`)
            .lt('date', `${year}-${(parseInt(month)+1).toString().padStart(2,'0')}-01`);
    }
    if (search) q = q.ilike('item', `%${search}%`);
    q = q.order('date', { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(401).json({ error: e.message }); }
});

app.put('/expenses/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    const { id } = req.params;
    const { item, price, store, date, icon, category_type } = req.body;

    // UPDATED TABLE NAME HERE
    const { data: txn } = await supabase.from('transactions').select('user_id').eq('id', id).single();
    if (txn?.user_id !== user.id) return res.status(403).json({ error: 'Not authorized' });

    const { data, error } = await supabase
      .from('transactions')
      .update({ item, price, store, date, icon, category_type })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

app.delete('/expenses/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    const { id } = req.params;
    
    // UPDATED TABLE NAME HERE
    const { data: txn } = await supabase.from('transactions').select('user_id').eq('id', id).single();
    if (txn?.user_id !== user.id) return res.status(403).json({ error: 'Not authorized' });

    await supabase.from('transactions').delete().eq('id', id);
    res.json({ success: true });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

// ========================================================
// CSV UPLOAD
// ========================================================

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const user = await getUser(req);
    const wallet_id = req.body.wallet_id;
    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        const txns = results.map(row => {
          const type = row.type || row.Type || 'expense';
          return {
             user_id: user.id,
             wallet_id,
             date: row.date || new Date().toISOString().split('T')[0],
             item: row.item || row.Item || 'Imported Item',
             price: parseFloat(row.price || row.Price || row.Amount || 0),
             store: row.store || row.Store || '',
             category_type: type.toLowerCase(),
             icon: row.icon || (type.toLowerCase() === 'income' ? '💰' : '🛒')
          };
        }).filter(t => t.price > 0);

        // UPDATED TABLE NAME HERE
        const { error } = await supabase.from('transactions').insert(txns);
        fs.unlinkSync(req.file.path);
        
        if (error) throw error;
        res.json({ success: true, inserted: txns.length });
      });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ========================================================
// ADMIN (Updated)
// ========================================================

app.get('/admin/users', async (req, res) => {
  try {
    const user = await getUser(req);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const userIds = authUsers.users.map(u => u.id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, is_blocked, is_admin')
      .in('id', userIds);

    const enriched = authUsers.users.map(u => {
      const p = profiles?.find(x => x.id === u.id) || {};
      return {
        id: u.id,
        email: u.email,
        full_name: p.full_name || null,
        is_blocked: p.is_blocked || false,
        is_admin: p.is_admin || false,
        created_at: u.created_at,
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(enriched);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/action', async (req, res) => {
  try {
    const user = await getUser(req);
    const { user_id, action } = req.body;

    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin only' });
    }

    switch (action) {
      case 'block':
      case 'unblock':
        await adminClient.from('profiles').update({ is_blocked: action === 'block' }).eq('id', user_id);
        break;

      case 'make_admin':
      case 'remove_admin':
        await adminClient.from('profiles').update({ is_admin: action === 'make_admin' }).eq('id', user_id);
        break;

      case 'delete':
        await adminClient.auth.admin.deleteUser(user_id);
        await adminClient.from('transactions').delete().eq('user_id', user_id);
        await adminClient.from('wallet_members').delete().eq('user_id', user_id);
        await adminClient.from('wallets').delete().eq('owner_id', user_id);
        await adminClient.from('profiles').delete().eq('id', user_id);
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(5000, '0.0.0.0', () => console.log('Backend on 5000'));