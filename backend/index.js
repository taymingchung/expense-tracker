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

async function getUser(req) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) throw new Error('No token');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) throw new Error('Invalid token');
  const { data: profile } = await supabase.from('profiles').select('is_blocked').eq('id', user.id).single();
  if (profile?.is_blocked) throw new Error('Account blocked');
  return user;
}

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const user = await getUser(req)
    const wallet_id = req.body.wallet_id || null  // <-- THIS LINE WAS MISSING

    const results = []

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        const expenses = results.map(row => ({
          user_id: user.id,
          wallet_id: wallet_id,  // <-- now saves to correct wallet
          date: row.date || row.Date || row['Purchase Date'],
          item: (row.item || row.Item || row.Description || row.Product || '').trim(),
          store: row.store || row.Store || row.Shop || row.Merchant || '',
          price: parseFloat(row.price || row.Price || row.Amount || row.Total || 0),
          category: row.category || row.Category || null
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

app.get('/expenses', async (req, res) => {
  try {
    const user = await getUser(req);
    let q = supabase.from('expenses').select('*').eq('user_id', user.id);
    const { month, year, search } = req.query;
    if (month && year) {
      q = q.gte('date', `${year}-${month.padStart(2,'0')}-01`).lt('date', `${year}-${(parseInt(month)+1).toString().padStart(2,'0')}-01`);
    }
    if (search) q = q.ilike('item', `%${search}%`);
    q = q.order('date', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
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