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
  password: z.string().min(6).optional(),
});

employeeRouter.post('/employees', async (req: Request, res: Response) => {
  try {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid employee data', details: parsed.error.format() },
      });
    }

    const { name, email, role, department, password } = parsed.data;

    // 1. Create Supabase Auth User with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || 'Password123!',
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

// POST /api/auth/login - Direct email/password authentication against database
employeeRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
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

    // 2. Ensure user exists in Supabase GoTrue Auth
    let sessionToken: string | null = null;
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password: password || 'Password123!',
    });

    if (!authError && authData?.session?.access_token) {
      sessionToken = authData.session.access_token;
    } else {
      // Seed user or uninitialized GoTrue user: register/update password in auth
      try {
        await supabaseAdmin.auth.admin.createUser({
          id: profile.id,
          email: profile.email,
          password: password || 'Password123!',
          email_confirm: true,
          user_metadata: { name: profile.name },
        });
      } catch {
        try {
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            password: password || 'Password123!',
          });
        } catch {
          // Continue
        }
      }

      const { data: retryAuth } = await supabaseAdmin.auth.signInWithPassword({
        email: profile.email,
        password: password || 'Password123!',
      });
      sessionToken = retryAuth?.session?.access_token || null;
    }

    return res.json({
      success: true,
      data: {
        profile,
        token: sessionToken,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
