import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';

export const employeeRouter = Router();

// GET /api/employees - List all profiles
employeeRouter.get('/employees', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        tasks:tasks(id, status),
        members:project_members(id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

const createEmployeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['MANAGER', 'EMPLOYEE']),
  department: z.string().optional(),
  password: z.string().min(6),
});

employeeRouter.post('/employees', async (req: Request, res: Response) => {
  try {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid employee data. Password must be at least 6 characters.', details: parsed.error.format() },
      });
    }

    const { name, email, role, department, password } = parsed.data;

    // 1. Create Supabase Auth User with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError || !authData.user) {
      return res.status(400).json({
        success: false,
        error: { message: `Supabase auth error: ${authError?.message}` },
      });
    }

    // 2. Insert into public.profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          name,
          email,
          role,
          status: 'ACTIVE',
          department: department || null,
        },
      ])
      .select()
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        error: { message: `Profile creation error: ${profileError.message}` },
      });
    }

    return res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { message: err.message },
    });
  }
});

// PATCH /api/employees/:id - Update employee profile (bypasses RLS)
employeeRouter.patch('/employees/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, department, status, role } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (department !== undefined) updates.department = department;
    if (status !== undefined) updates.status = status;
    if (role !== undefined) updates.role = role;

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { message: err.message },
    });
  }
});

// DELETE /api/employees/:id - Delete employee profile and auth account (bypasses RLS)
employeeRouter.delete('/employees/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Fetch employee to check role
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !profile) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // 2. Reassign any assigned tasks to an active manager to prevent foreign key violations
    const { data: managerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'MANAGER')
      .neq('id', id)
      .limit(1)
      .maybeSingle();

    if (managerProfile) {
      await supabaseAdmin
        .from('tasks')
        .update({ assigned_to: managerProfile.id })
        .eq('assigned_to', id);
    }

    // 3. Remove project memberships & notifications
    await supabaseAdmin.from('project_members').delete().eq('user_id', id);
    await supabaseAdmin.from('notifications').delete().eq('user_id', id);

    // 4. Delete profile
    const { error: deleteProfileErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteProfileErr) {
      return res.status(400).json({ success: false, error: deleteProfileErr.message });
    }

    // 5. Delete Supabase Auth user so they can no longer log in
    try {
      await supabaseAdmin.auth.admin.deleteUser(id);
    } catch (authDeleteErr: any) {
      console.warn('Auth user delete note:', authDeleteErr.message);
    }

    return res.json({
      success: true,
      message: `Employee "${profile.name}" deleted successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login - Direct email/password authentication against database
employeeRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch user from profiles by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ success: false, error: profileError.message });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email. Please register a new account or check spelling.',
      });
    }

    if (profile.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Your account is deactivated. Please contact an administrator.',
      });
    }

    // 2. Authenticate against Supabase Auth with provided password
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (authError || !authData?.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Please enter the correct password for your account.',
      });
    }

    return res.json({
      success: true,
      data: {
        profile,
        token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
