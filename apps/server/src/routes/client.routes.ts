import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const clientRouter = Router();

// GET /api/clients - List all client organizations
clientRouter.get('/clients', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clients - Create client
clientRouter.post('/clients', async (req: Request, res: Response) => {
  try {
    const { name, company, contact_person, contact_email, phone, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Client name is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert([
        {
          name,
          company: company || name,
          contact_person: contact_person || null,
          contact_email: contact_email || null,
          phone: phone || null,
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
