import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../apps/server/.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('--- Setting up Attachments & Supabase Storage Bucket ---');

  // 1. Create storage bucket 'project-attachments'
  try {
    const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
    if (listErr) {
      console.warn('Could not list buckets:', listErr.message);
    } else {
      const exists = buckets.some((b) => b.name === 'project-attachments');
      if (!exists) {
        const { data, error } = await supabaseAdmin.storage.createBucket('project-attachments', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        if (error) {
          console.error('Failed to create bucket:', error.message);
        } else {
          console.log('Created Supabase storage bucket: project-attachments');
        }
      } else {
        console.log('Supabase storage bucket "project-attachments" already exists.');
      }
    }
  } catch (e: any) {
    console.warn('Storage bucket setup warning:', e.message);
  }

  // 2. Check attachments table
  const { data, error } = await supabaseAdmin.from('attachments').select('id').limit(1);
  if (error) {
    console.log('Attachments table status:', error.message);
    console.log('Please execute supabase/migrations/20260905000002_attachments_schema.sql in Supabase SQL editor if not created.');
  } else {
    console.log('Attachments table is active and queryable! Records found:', data.length);
  }
}

main().catch(console.error);
