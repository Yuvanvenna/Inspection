-- ============================================================================
-- ANTIGRAVITY PROJECT MANAGEMENT PLATFORM — SEED DATA
-- ============================================================================

DO $$
DECLARE
  v_manager_id UUID := '00000000-0000-0000-0000-000000000001';
  v_emp_rahul UUID  := '00000000-0000-0000-0000-000000000002';
  v_emp_priya UUID  := '00000000-0000-0000-0000-000000000003';
  v_emp_arun  UUID  := '00000000-0000-0000-0000-000000000004';
  v_emp_anita UUID  := '00000000-0000-0000-0000-000000000005';
  
  v_client_apex UUID := '10000000-0000-0000-0000-000000000001';
  v_client_vertex UUID := '10000000-0000-0000-0000-000000000002';
  
  v_proj_drone UUID := '20000000-0000-0000-0000-000000000001';
  
  v_stage_plan UUID;
  v_stage_mod  UUID;
  v_stage_dev  UUID;
  v_stage_test UUID;
  v_stage_3d   UUID;
  v_stage_comp UUID;
  
  v_task_1 UUID := '30000000-0000-0000-0000-000000000001';
  v_task_2 UUID := '30000000-0000-0000-0000-000000000002';
  v_task_3 UUID := '30000000-0000-0000-0000-000000000003';
  v_task_4 UUID := '30000000-0000-0000-0000-000000000004';
BEGIN
  -- 1. Create Supabase Auth Users in auth.users (Password: Password123!)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  VALUES
    (v_manager_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@antigravity.io', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Alex Morgan"}', NOW(), NOW()),
    (v_emp_rahul, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahul@antigravity.io', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Rahul Sharma"}', NOW(), NOW()),
    (v_emp_priya, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@antigravity.io', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Priya Patel"}', NOW(), NOW()),
    (v_emp_arun, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arun@antigravity.io', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Arun Kumar"}', NOW(), NOW()),
    (v_emp_anita, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anita@antigravity.io', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Anita Desai"}', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create Application Profiles in public.profiles
  INSERT INTO public.profiles (id, name, email, role, status, department)
  VALUES
    (v_manager_id, 'Alex Morgan', 'manager@antigravity.io', 'MANAGER', 'ACTIVE', 'Product & Engineering'),
    (v_emp_rahul, 'Rahul Sharma', 'rahul@antigravity.io', 'EMPLOYEE', 'ACTIVE', 'Backend Engineering'),
    (v_emp_priya, 'Priya Patel', 'priya@antigravity.io', 'EMPLOYEE', 'ACTIVE', 'Frontend Engineering'),
    (v_emp_arun, 'Arun Kumar', 'arun@antigravity.io', 'EMPLOYEE', 'ACTIVE', '3D Modelling & CAD'),
    (v_emp_anita, 'Anita Desai', 'anita@antigravity.io', 'EMPLOYEE', 'ACTIVE', 'QA & Validation')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

  -- 3. Create Clients
  INSERT INTO public.clients (id, name, company, contact_person, contact_email, phone, notes)
  VALUES
    (v_client_apex, 'Apex Aerospace', 'Apex Dynamics Inc.', 'David Vance', 'd.vance@apexaero.com', '+1-555-0199', 'Key defense and commercial drone client.'),
    (v_client_vertex, 'Vertex BioTech', 'Vertex Laboratories', 'Sarah Lin', 'slin@vertexbio.org', '+1-555-0245', 'Healthcare logistics and biomedical payload systems.')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Create Project
  INSERT INTO public.projects (
    id, client_id, name, description, start_date, deadline, priority, status, overall_progress,
    client_requirements, functional_requirements, technical_requirements, deliverables, acceptance_criteria,
    system_architecture, technology_stack, database_info, api_info, infrastructure_info,
    created_by
  )
  VALUES (
    v_proj_drone,
    v_client_apex,
    'Autonomous Survey Drone & Fleet System',
    'High-resolution multi-spectral survey drone featuring onboard telemetry, real-time edge processing, and 3D terrain reconstruction.',
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '60 days',
    'HIGH',
    'ACTIVE',
    65.00,
    -- Requirements
    'Flight range of 15km, sub-5cm RTK positional accuracy, automatic obstacle avoidance in adverse weather.',
    'Telemetry streaming, mission waypoint plotting, automated return-to-home on signal loss, 3D payload preview.',
    'Edge inference under 50ms per frame, sub-second latency telemetry over 4G/5G, encrypted storage.',
    'Hardware telemetry module, Flight control backend, Web dashboard, 3D point cloud viewer.',
    'Passes wind resistance bench test up to 45km/h, zero packet loss in telemetry simulated buffer.',
    -- Architecture & Tech
    'Micro-kernel RTOS for flight controller; Node.js event bus for telemetry gateway; React/Vite SPA for mission command.',
    'React, TypeScript, Node.js, WebGL/Three.js, Supabase PostgreSQL.',
    'PostgreSQL with PostGIS for spatial coordinates, telemetry timeseries tables.',
    'gRPC for low-overhead telemetry; RESTful APIs for mission control.',
    'AWS GovCloud containerized deployment with redundant edge relays.',
    v_manager_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign Team Members
  INSERT INTO public.project_members (project_id, user_id)
  VALUES
    (v_proj_drone, v_emp_rahul),
    (v_proj_drone, v_emp_priya),
    (v_proj_drone, v_emp_arun),
    (v_proj_drone, v_emp_anita)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- Get stage IDs
  SELECT id INTO v_stage_plan FROM public.workflow_stages WHERE project_id = v_proj_drone AND name = 'PLANNING';
  SELECT id INTO v_stage_mod  FROM public.workflow_stages WHERE project_id = v_proj_drone AND name = 'MODELLING';
  SELECT id INTO v_stage_dev  FROM public.workflow_stages WHERE project_id = v_proj_drone AND name = 'DEVELOPMENT';
  SELECT id INTO v_stage_test FROM public.workflow_stages WHERE project_id = v_proj_drone AND name = 'TESTING';
  SELECT id INTO v_stage_3d   FROM public.workflow_stages WHERE project_id = v_proj_drone AND name = 'THREE_D_MODELLING';
  SELECT id INTO v_stage_comp FROM public.workflow_stages WHERE project_id = v_proj_drone AND name = 'COMPLETION';

  -- Update stage progress
  UPDATE public.workflow_stages
  SET calculated_progress = 100.00, effective_progress = 100.00, status = 'COMPLETED'
  WHERE id = v_stage_plan;

  UPDATE public.workflow_stages
  SET calculated_progress = 80.00, effective_progress = 80.00, status = 'IN_PROGRESS'
  WHERE id = v_stage_mod;

  UPDATE public.workflow_stages
  SET calculated_progress = 63.00, manager_override = 70.00, effective_progress = 70.00, status = 'IN_PROGRESS'
  WHERE id = v_stage_dev;

  UPDATE public.workflow_stages
  SET calculated_progress = 20.00, effective_progress = 20.00, status = 'IN_PROGRESS'
  WHERE id = v_stage_test;

  -- Insert Stage Override History for Development stage
  INSERT INTO public.stage_override_history (stage_id, previous_override, new_override, reason, created_by)
  VALUES (v_stage_dev, NULL, 70.00, 'Frontend and API integration ahead of schedule; factoring in unblocked PRs.', v_manager_id);

  -- 5. Create Tasks
  INSERT INTO public.tasks (id, project_id, stage_id, title, description, assigned_to, deadline, priority, status, progress, blocker_reason)
  VALUES
    (v_task_1, v_proj_drone, v_stage_dev, 'Flight Telemetry API Gateway', 'Develop WebSocket and REST ingestion endpoints for GPS and battery telemetry.', v_emp_rahul, NOW() + INTERVAL '10 days', 'HIGH', 'IN_PROGRESS', 80, NULL),
    (v_task_2, v_proj_drone, v_stage_dev, 'Mission Control Map UI', 'Interactive waypoint editor with real-time drone icon tracking and battery gauge.', v_emp_priya, NOW() + INTERVAL '14 days', 'MEDIUM', 'IN_PROGRESS', 70, NULL),
    (v_task_3, v_proj_drone, v_stage_dev, 'Sensor Calibration Pipeline', 'Process incoming LiDAR and IMU feeds to verify calibration matrix.', v_emp_rahul, NOW() - INTERVAL '2 days', 'URGENT', 'BLOCKED', 40, 'Waiting for raw sensor calibration specifications from Apex engineering.'),
    (v_task_4, v_proj_drone, v_stage_3d, 'Airframe 3D CAD Reconstruction', 'Finalize lightweight carbon-fiber fuselage mesh in 3D viewer.', v_emp_arun, NOW() + INTERVAL '25 days', 'MEDIUM', 'IN_PROGRESS', 50, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- 6. Create Work Updates (Append-only historical timeline)
  INSERT INTO public.work_updates (task_id, employee_id, message, progress_at_update, status_at_update, created_at)
  VALUES
    (v_task_1, v_emp_rahul, 'Designed message schema and setup initial Node/TypeScript server skeleton.', 30, 'In Progress', NOW() - INTERVAL '7 days'),
    (v_task_1, v_emp_rahul, 'Implemented WebSocket streaming with JWT authorization and packet checksum.', 60, 'In Progress', NOW() - INTERVAL '3 days'),
    (v_task_1, v_emp_rahul, 'Completed telemetry benchmark with 50 concurrent simulated drones at 60Hz. All green.', 80, 'In Progress', NOW() - INTERVAL '1 day'),
    (v_task_3, v_emp_rahul, 'Created initial calibration matrix calculations.', 40, 'In Progress', NOW() - INTERVAL '4 days'),
    (v_task_3, v_emp_rahul, 'Encountered blocker: The LiDAR sample dataset uses legacy binary header format not covered in spec.', 40, 'Blocked', NOW() - INTERVAL '2 days');

END $$;
