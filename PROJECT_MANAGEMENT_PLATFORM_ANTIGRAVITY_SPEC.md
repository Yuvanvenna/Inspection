# PROJECT MANAGEMENT PLATFORM — ANTIGRAVITY MASTER BUILD SPECIFICATION

## 1. Purpose

This is the single source of truth for building the NEW project-management platform.

IMPORTANT:
- Build incrementally; do not generate the entire application in one pass.
- Inspect the workspace before making architectural assumptions or code changes.

---

## 2. Product Overview

Build a role-based project management system for managers and employees.

The manager creates client projects, defines project information and requirements, assigns employees to tasks, sets deadlines, and monitors progress through six fixed stages:

1. Planning
2. Modelling
3. Development
4. Testing
5. 3D Modelling
6. Completion

Employees can log in and see only projects/tasks relevant to them. They can view requirements and deadlines, update their own task progress/status, and add work updates or completion notes for the manager.

Managers have full visibility and control. Stage progress is calculated automatically from task progress, but managers can override the calculated percentage.

The product should be simple, reliable, intuitive, secure, responsive, and maintainable.

---

## 3. Core Hierarchy

Manager
→ Client
→ Project
→ Requirements / Architecture / Project Information
→ Six Workflow Stages
→ Tasks
→ Employees
→ Task Progress + Status + Work Updates
→ Stage Progress
→ Overall Project Progress

Do not replace this with a generic Kanban-only product.

---

## 4. Roles

### Manager

Can:
- Log in/out
- Create/edit projects
- Manage clients
- Add requirements, architecture and technical information
- Set dates, priority and project status
- Assign employees
- Create/assign/edit tasks
- View all projects, stages, tasks and employee updates
- View calculated progress
- Override stage progress
- View overdue/blocked work
- Manage employees
- View relevant activity/audit history

### Employee

Can:
- Log in/out
- View their dashboard
- View only assigned projects
- View assigned tasks
- View relevant requirements/architecture/project information
- View deadlines
- Update their own task progress/status
- Add work updates/completion notes
- Mark assigned tasks completed
- Mark assigned tasks blocked and provide a reason
- View their task update history

Employees cannot:
- Create projects
- Assign employees
- Change project-level progress
- Override stage progress
- View unrelated projects/tasks
- Access manager administration

Authorization MUST be enforced server-side, not only by hiding UI.

---

## 5. Project Creation

Manager creates a project with:

### Basic information
- Project name
- Client
- Description
- Start date
- Deadline
- Priority
- Status

Suggested project statuses:
- Draft
- Active
- On Hold
- Completed
- Archived

### Client/project requirements
- Client requirements
- Functional requirements
- Technical requirements
- Deliverables
- Acceptance criteria
- Additional notes

### Architecture/technical information
- System architecture
- Technology stack
- Database
- APIs
- Infrastructure
- Technical notes
- Design/reference information

### Team
Select employees who will work on the project.

A client can have multiple projects.

---

## 6. Six Fixed Stages

Every project must contain these stages, in this exact order:

1. Planning
2. Modelling
3. Development
4. Testing
5. 3D Modelling
6. Completion

Do not remove Development or silently rename stages.

Each stage contains:
- Name
- Order
- Tasks
- Calculated progress
- Optional manager override
- Effective progress
- Status
- Relevant history

Suggested stage statuses:
- Not Started
- In Progress
- Blocked
- Completed

If a stage has no tasks, show **Not Started**, not 0% simply because no tasks exist.

---

## 7. Tasks

Tasks are the main unit of employee work.

Each task should contain:
- ID
- Project
- Stage
- Title
- Description
- Assigned employee
- Deadline
- Priority
- Status
- Progress percentage
- Created/updated timestamps
- Completed timestamp
- Optional attachment
- Optional notes

Suggested task statuses:
- Not Started
- In Progress
- Blocked
- Completed

Manager creates/assigns tasks. Employees update only tasks assigned to them.

---

## 8. Task Progress

Use a simple percentage model.

Recommended employee controls:
- 0%
- 25%
- 50%
- 75%
- 100%

Implementation may support any integer 0–100 if useful, but keep the normal UI simple.

Rules:
- 100% normally means Completed.
- Completed tasks must be 100%.
- Blocked tasks retain their current progress and store a blocker reason.

---

## 9. Employee Work Updates / Timeline

This is a core feature.

Employees should be able to add an update when:
- Meaningful progress is made
- A feature/task is completed
- A blocker occurs
- Important implementation information needs to reach the manager

Do NOT use one editable text field. Preserve a chronological history.

Each WorkUpdate contains:
- Employee
- Task
- Message
- Timestamp
- Progress at time of update
- Status at time of update
- Optional attachment

Example:

Task: Authentication API

Sept 5, 2026 — Rahul
Progress: 80%
Status: In Progress
“Completed authentication and registration APIs. JWT integration is working. Frontend integration remains.”

Sept 4, 2026 — Rahul
Progress: 60%
Status: In Progress
“Database schema and user registration endpoint completed.”

Manager can open a task and review this timeline. Historical updates must never be overwritten.

---

## 10. Blocked Tasks

Employees can mark a task Blocked and provide a reason.

Example:
Status: Blocked
Reason: “Waiting for API credentials from the client.”

Blocked tasks should be surfaced to the manager.

A blocked task keeps its current progress:
- 60% + Blocked remains 60%, not 0%.

---

## 11. Official Progress Calculation

Keep this simple. No weights, time tracking, story points or commit counts.

### Task → Stage

Stage calculated progress = average of all task percentages in that stage.

Example:
- Task A = 100%
- Task B = 75%
- Task C = 50%
- Task D = 25%

Stage = (100 + 75 + 50 + 25) / 4 = 62.5% → display 63%.

If a stage has no tasks:
- calculated progress = null / Not Started.

### Stage → Project

Overall project progress = average of the six stage progress values that have actual task-based progress.

Example:
- Planning = 100%
- Modelling = 80%
- Development = 60%
- Testing = 20%
- 3D Modelling = Not Started
- Completion = Not Started

Overall = (100 + 80 + 60 + 20) / 4 = 65%.

Display the overall number alongside all six stages so the manager has context.

The overall percentage is a simple progress indicator, not an exact mathematical measure of project completion.

---

## 12. Manager Stage Override

Never overwrite calculated progress.

Store:
- calculated_progress
- manager_override
- effective_progress

Effective progress:
- If override exists → override
- Otherwise → calculated progress

Example:
Calculated = 63%
Manager override = 70%
Displayed = 70%

UI should show:
Development — 70%
Manager adjusted
System calculated: 63%

Manager can remove the override and return to calculated progress.

Where practical, preserve override history:
- Previous value
- New value
- Manager
- Timestamp

If task progress later changes:
Calculated stage progress may change, but an existing manager override remains until the manager changes/removes it.

---

## 13. Overall Project Progress

Use effective stage progress values.

Do not create a separate arbitrary project percentage unless a future business requirement demands it.

Stage-level manager override is the primary manual control.

---

## 14. Manager Dashboard

The dashboard should answer:
1. What projects are active?
2. How much progress has been made?
3. Which projects/deadlines need attention?
4. Which tasks are overdue?
5. Which tasks are blocked?
6. What have employees recently reported?

Suggested sections:
- Total Projects
- Active Projects
- Completed Projects
- Overdue Tasks
- Blocked Tasks
- Project list
- Attention Required
- Recent employee updates

Project rows/cards:
- Project
- Client
- Overall progress
- Deadline
- Status
- Priority
- Team size

---

## 15. Manager Project Page

Show:
- Project name
- Client
- Deadline
- Priority
- Status
- Overall progress

Prominently display the six-stage tracker:
Planning → Modelling → Development → Testing → 3D Modelling → Completion

Each stage shows:
- Progress
- Status
- Task count
- Blocked count if useful

Also show:
- Description
- Client requirements
- Architecture
- Technical information
- Deliverables
- Acceptance criteria
- Documents
- Team
- Recent activity

---

## 16. Stage Detail

Clicking a stage should show:
- Stage name
- Effective progress
- Calculated progress
- Manager override
- Status
- Tasks
- Employees involved
- Deadlines
- Blocked tasks
- Recent work updates

Example:

Development — 70%
System calculated: 63%
Manager override: 70%

Tasks:
- Frontend API integration — 80% — Rahul
- Authentication — 100% — Priya
- Database integration — 40% — Arun

Blocked:
Database integration — waiting for client credentials

---

## 17. Task Detail

Show:
- Task
- Description
- Project
- Stage
- Assigned employee
- Deadline
- Priority
- Status
- Progress
- Work-update timeline
- Attachments
- Relevant project information
- Manager actions

Employee actions:
- Update progress
- Change status
- Add work update
- Mark completed
- Mark blocked + reason

Manager actions:
- Edit
- Reassign
- Change deadline
- Change priority
- Change status
- View history
- Add manager comment where appropriate
- Archive/delete according to policy

---

## 18. Employee Dashboard

Keep it simple.

### My Projects
Only projects assigned to the employee.

### My Tasks
- Task
- Project
- Stage
- Progress
- Status
- Deadline

### Upcoming Deadlines

### Recent Updates

### Blocked Tasks

---

## 19. Employee Project View

Show only authorized information:
- Project name
- Client
- Description
- Relevant requirements
- Relevant architecture/technical information
- Deadline
- Six-stage overview
- Their assigned tasks

Do not show manager controls.

---

## 20. Clients

Manager can manage:
- Client name
- Company
- Contact person
- Email
- Phone
- Notes

One client can own multiple projects.

---

## 21. Employees

Manager can:
- Create employee accounts
- Edit employee information
- Activate/deactivate employees
- View assigned projects/tasks

Suggested fields:
- Name
- Email
- Role
- Department/team if needed
- Account status

Do not build HR/payroll functionality.

---

## 22. Notifications

Start with in-app notifications.

Useful events:
- Task assigned
- Deadline approaching
- Task overdue
- Task blocked
- Task completed
- Manager comment/update
- Project assignment

Email can be added later if required.

---

## 23. Activity / Audit History

Important manager actions should be auditable:
- Project created/edited
- Employee assigned
- Task created/reassigned
- Deadline changed
- Status changed
- Stage override created/removed

Work updates have their own persistent timeline.

Keep audit functionality practical for MVP.

---

## 24. Authentication & Authorization

At minimum:
- Secure login/logout
- Password hashing
- Secure session/token handling
- MANAGER and EMPLOYEE roles
- Server-side authorization

Prevent insecure direct object access. An employee must not gain access to another employee’s task by changing a URL/API ID.

---

## 25. Suggested Technology

If starting from scratch:

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS

Backend:
- Node.js
- TypeScript
- Express or NestJS

Database:
- PostgreSQL

ORM:
- Prisma

Authentication:
- Secure session-based authentication or properly implemented JWT

Storage:
- Suitable object/file storage if attachments are implemented

If the repository already has a sensible stack, inspect it first and reuse it where practical. Do not migrate technologies without a strong reason.

---

## 26. Suggested Database Entities

### User
id, name, email, password_hash, role, status, created_at, updated_at

### Client
id, name, company, contact_person, contact_email, phone, notes, created_at, updated_at

### Project
id, client_id, name, description, start_date, deadline, priority, status, requirements, architecture, technical_information, created_by, created_at, updated_at

### ProjectMember
id, project_id, user_id, assigned_at

### WorkflowStage
id, project_id, name, order, calculated_progress, manager_override, status, created_at, updated_at

### Task
id, project_id, stage_id, title, description, assigned_to, deadline, priority, status, progress, created_at, updated_at, completed_at

### WorkUpdate
id, task_id, employee_id, message, progress_at_update, status_at_update, created_at

### Notification
id, user_id, type, title, message, read_at, created_at

### AuditLog
id, actor_id, entity_type, entity_id, action, old_value, new_value, created_at

### Attachment
id, task_id/project_id, uploaded_by, file_name, storage_key, file_type, created_at

Use proper foreign keys, constraints and indexes.

Every new project must automatically receive all six workflow stages.

---

## 27. Progress Data Integrity

Do not rely only on manually entered stage percentages.

The system must distinguish:
- Task progress
- Calculated stage progress
- Manager override
- Effective stage progress

Prefer deriving calculated values from tasks. If cached values are stored, update them reliably whenever relevant tasks change.

When a task changes:
1. Validate authorization.
2. Save task change.
3. Recalculate its stage.
4. Preserve any manager override.
5. Determine effective stage progress.
6. Recalculate project progress.
7. Refresh relevant dashboard data.
8. Record relevant history.

---

## 28. API Structure

Use clean REST-style APIs or an equally clear architecture.

Examples:

Auth:
POST /auth/login
POST /auth/logout
GET /auth/me

Clients:
GET /clients
POST /clients
GET /clients/:id
PATCH /clients/:id

Projects:
GET /projects
POST /projects
GET /projects/:id
PATCH /projects/:id

Members:
POST /projects/:id/members
DELETE /projects/:id/members/:userId

Stages:
GET /projects/:id/stages
GET /stages/:id
PATCH /stages/:id/override

Tasks:
GET /projects/:id/tasks
POST /projects/:id/tasks
GET /tasks/:id
PATCH /tasks/:id
PATCH /tasks/:id/progress
PATCH /tasks/:id/status

Work updates:
GET /tasks/:id/updates
POST /tasks/:id/updates

Dashboards:
GET /dashboard/manager
GET /dashboard/employee

Notifications:
GET /notifications
PATCH /notifications/:id/read

Exact routes may vary, but responsibilities must remain clear.

---

## 29. UI/UX

The application should feel like a polished, modern SaaS product used by a professional project-management team.

### Visual Direction

Use the generated UI direction as the visual reference for the overall design language:

- Light workspace/background
- Deep navy/indigo left sidebar
- Purple/blue as the primary accent family
- Green for positive/completed states
- Orange/amber for due-soon/warning states
- Red for overdue/blocked/critical states
- White cards with subtle borders and soft shadows
- Rounded corners, but avoid excessive "bubble" styling
- Generous whitespace
- Clear typography and strong visual hierarchy
- Clean, modern icons
- Restrained use of gradients
- Professional rather than playful
- Consistent spacing and component sizing

The exact colors do not need to match a mockup pixel-for-pixel. Establish a consistent design token system so the palette can be adjusted centrally later.

### Layout Direction

The application should generally follow this structure:

- Persistent dark sidebar for primary navigation
- Clean top header containing search/context, notifications and user profile
- Main content area with generous spacing
- Dashboard cards for high-level metrics
- Tables/lists for projects and tasks
- Detail pages for projects, stages and tasks
- Progress bars as a primary visual element
- Status badges using consistent semantic colors
- Timeline-style work updates for employee reports
- Responsive behavior for smaller screens

### Manager Dashboard Visual Priorities

The manager dashboard should visually prioritize:

1. Active projects
2. Overall project progress
3. Deadlines
4. Overdue/blocked work
5. Recent employee work updates
6. Stage progress

Example visual hierarchy:

Manager Dashboard
→ Summary/KPI cards
→ Active Projects
→ Attention Required
→ Stage Progress
→ Recent Work Updates

### Project Page Visual Priorities

The project page should prominently display:

- Project name and status
- Client
- Deadline
- Team
- Overall progress
- Six-stage progress tracker
- Project requirements/architecture
- Tasks
- Recent work updates

The six stages should be visually connected and easy to scan:

Planning → Modelling → Development → Testing → 3D Modelling → Completion

Each stage card should make its percentage and status immediately visible.

### Work Update Timeline

Work updates should visually resemble a clean activity/chat timeline without becoming a messaging application.

Each entry should show:

- Employee
- Timestamp
- Update message
- Progress at the time
- Status at the time
- Optional attachment

### Status Colors

Use semantic colors consistently:

- Green → Completed / On Track
- Blue/Purple → In Progress / Active
- Amber/Orange → Due Soon / Warning
- Red → Blocked / Overdue / At Risk
- Neutral gray → Not Started / Archived

Do not rely on color alone; always pair status colors with text/icons.

### UI States

Every important screen must have:

- Loading state
- Empty state
- Error state
- Success feedback
- Disabled state where appropriate

Use confirmation for destructive actions.

### Avoid

- Excessive animations
- Excessive gradients
- Unnecessary charts
- Overloaded dashboards
- Excessive modals
- Information overload
- Generic Kanban as the entire product
- Extremely dark full-page interfaces
- Inconsistent colors between screens
- Decorative UI that reduces usability

The goal is a clean, premium, professional SaaS interface similar in design quality to the visual reference, while keeping the actual product functionality defined by this specification.

---

## 30. Navigation

### Manager
Dashboard
Clients
Projects
Employees
Notifications
Settings

### Employee
My Dashboard
My Projects
My Tasks
Notifications
Profile

Employees must not see manager administration.

---

## 31. Project Completion

Completion is the final stage.

Possible Completion tasks:
- Final review
- Client approval
- Documentation
- Deployment
- Handover

Do not automatically mark the project Completed merely because a percentage reaches 100 unless the business rule explicitly supports it. Prefer explicit project completion controls for MVP.

---

## 32. Deadline Logic

Use simple date-based states:
- On Track
- Due Soon
- Overdue
- Completed

Examples:
- Completed task → Completed
- Future task → On Track or Due Soon
- Past incomplete deadline → Overdue

No AI is required.

---

## 33. Security

- Never expose passwords.
- Hash passwords securely.
- Never commit secrets.
- Use environment variables.
- Validate input.
- Enforce authorization server-side.
- Prevent unauthorized object access.
- Secure uploaded files if implemented.
- Use secure HTTP practices.
- Avoid leaking stack traces or sensitive details.
- Log important security events appropriately.

---

## 34. Performance

For MVP:
- Index foreign keys/common filters.
- Paginate long lists.
- Avoid N+1 queries.
- Keep dashboard queries efficient.
- Recalculate only affected stage/project.
- Avoid premature microservices.

A modular monolith is preferred initially.

---

## 35. Error Handling

Handle:
- Invalid login
- Unauthorized access
- Missing project/task/employee
- Invalid progress
- Invalid deadline
- Failed updates
- Failed uploads
- Database errors

Give users useful messages. Never expose raw stack traces.

---

## 36. Seed Data

Provide realistic development data:
- 2+ clients
- 1+ projects
- 3–5 employees
- Tasks across all six stages
- Completed, in-progress and blocked tasks
- Different deadlines
- Work-update history
- At least one manager stage override

The seeded dashboard should demonstrate the product immediately.

---

## 37. Development Phases

### Phase 1 — Foundation
- Inspect repository
- Architecture
- Project setup
- Database
- Authentication
- Roles
- Base UI/layout
- Seed data

STOP and validate.

### Phase 2 — Clients & Projects
- Client CRUD
- Project CRUD
- Project creation
- Requirements
- Architecture/technical information
- Automatic six stages

STOP and validate.

### Phase 3 — Employees & Tasks
- Employee management
- Project membership
- Task CRUD
- Assignment
- Status
- Progress
- Deadlines

STOP and validate.

### Phase 4 — Progress Engine
- Task → stage calculation
- Stage → project calculation
- Empty-stage handling
- Manager override
- Override persistence
- Progress UI

STOP and validate thoroughly.

### Phase 5 — Work Updates
- Create work updates
- Timeline
- Historical progress/status snapshots
- Manager visibility
- Employee restrictions

STOP and validate.

### Phase 6 — Dashboards
- Manager dashboard
- Employee dashboard
- Project overview
- Stage details
- Attention-required sections

STOP and validate.

### Phase 7 — Notifications & Activity
- In-app notifications
- Audit history
- Recent activity

STOP and validate.

### Phase 8 — Attachments/Documents
Only if required:
- Project documents
- Task attachments
- Secure storage
- Access control

### Phase 9 — Polish
- Responsive UI
- Loading/empty/error states
- Validation
- Accessibility
- Performance

### Phase 10 — End-to-End QA
Test complete manager and employee journeys.

---

## 38. Critical Antigravity Instructions

Before coding:
1. Read this entire document.
2. Inspect the entire repository.
3. Identify current frontend/backend/database setup.
4. Establish the architecture only after inspecting the workspace.
5. Use existing workspace code only when it is genuinely relevant and appropriate.
6. Propose architecture before major implementation.
7. Propose database schema/relationships.
8. Propose frontend/backend folder structure.
9. Identify dependencies.
10. Identify environment variables.
11. Identify risks and assumptions.
12. Provide the phased implementation plan.

Do NOT build the entire application immediately.

After presenting the architecture and detailed Phase 1 plan, STOP and wait for approval.

---

## 39. Implementation Discipline

For every phase:

Understand
→ Plan
→ Implement
→ Validate
→ Inspect
→ Report

After implementation, run relevant:
- Tests
- Type checks
- Linting
- Database migrations
- Build checks

Do not silently make unrelated large changes.

---

## 40. Change Discipline

- Preserve working functionality.
- Avoid unnecessary rewrites.
- Do not change the stack without justification.
- Keep migrations clean.
- Keep frontend/backend types synchronized.
- Centralize authorization.
- Avoid duplicated business logic.
- Keep progress calculation in a dedicated clear service/module.
- Keep UI components reusable.
- Keep API contracts clear.

---

## 41. Explicitly Out of Scope for MVP

Do NOT implement unless explicitly requested:
- Complex time tracking
- Story points
- Advanced resource planning
- Payroll
- HR management
- Complex financial management
- Microservices
- Predictive analytics

The MVP is a project/task/progress management platform.

## 42. Future Possibilities

The architecture may later support:
- Email notifications
- Calendar integration
- Client portal
- Custom workflows
- Additional workflow stages
- Team analytics
- Mobile app
- Advanced reporting

Do not implement these now unless requested.

## 43. Definition of Done

### Manager can
- Log in
- Create/manage clients
- Create projects
- Enter requirements
- Enter architecture/technical information
- Set deadlines
- Assign employees
- Create/assign tasks
- View all six stages
- View task progress
- View work-update timelines
- See calculated stage progress
- Override stage progress
- See overall project progress
- See blocked/overdue work
- Manage employees

### Employee can
- Log in
- See only assigned projects
- See assigned tasks
- See relevant project information
- See deadlines
- Update task progress/status
- Mark tasks completed
- Mark tasks blocked
- Add work updates
- View their update history

### System correctly
- Enforces role-based access
- Calculates task → stage progress
- Calculates stage → project progress
- Handles empty stages as Not Started
- Preserves manager overrides
- Maintains work-update history
- Handles deadlines
- Maintains important audit history
- Handles errors safely
- Prevents unauthorized data access

---

## 44. Product North Star

The manager should be able to answer:

“What projects are active, what stage is each in, how much work is completed, who is responsible, what is blocked, what is due soon, and what have employees reported?”

The employee should be able to answer:

“What am I responsible for, what do I need to complete, when is it due, what is the requirement, and what should I tell my manager about the work I completed?”

If the system answers those questions clearly and reliably, it is succeeding.

---

# FIRST ACTION REQUIRED FROM ANTIGRAVITY

Read this document completely.

Then inspect the existing repository.

Do NOT start coding yet.

Return:

1. Your understanding of the product
2. Current repository/technology assessment
3. Proposed architecture
4. Proposed database schema and relationships
5. Proposed frontend/backend folder structure
6. Required dependencies
7. Required environment variables
8. Phase-by-phase implementation plan
9. Detailed Phase 1 implementation plan
10. Risks, ambiguities and assumptions

Wait for approval before making major code changes.
