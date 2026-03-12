# FlowLite — Multi-Tenant Workflow Management System

A lightweight, workflow-oriented project execution platform with real-time collaboration, role-based access control, board-based task organization, and multi-tenant organization isolation.

## Features

- **Multi-Tenant Organization Isolation** — All data scoped to organizations
- **Role-Based Access Control** — `ADMIN`, `PRODUCT_MANAGER`, `TEAM_LEAD`, `TEAM_MEMBER`
- **JWT Authentication** — Token-based auth with revocation on logout
- **Email Verification & Password Reset** — SMTP-powered account workflows
- **Real-Time Task Updates** — WebSocket (STOMP) broadcasts for live changes
- **Board Management** — Team and personal boards with custom colors, icons, limits, reordering, and default board support
- **Project Management** — Create, update, and organize projects with owner assignments
- **Task Management** — Due dates, priorities, assignments, comments, board-scoped tasks
- **Workflow State Machine** — Controlled transitions: `CREATED → ASSIGNED → IN_PROGRESS → REVIEW → DONE`
- **Dashboard Analytics** — Real-time org-scoped statistics with completion rates
- **Advanced Search & Filters** — Paginated search with priority, status, assignee filters and sorting
- **In-App Notifications** — Real-time notification dropdown with unread counts and mark-as-read
- **Profile Management** — View/edit profile, change password
- **Command Palette** — Quick keyboard-driven navigation and actions
- **Audit Logging** — AOP-based admin action tracking with PDF/Excel export
- **Recycle Bin (Trash)** — Soft-delete tasks with undo, restore, and empty trash
- **Account Security** — Rate limiting (5 attempts/min), account lockout after 5 failures
- **Task Archive & Soft Delete** — Cancel, archive, restore, and undo-delete flows
- **Task Templates** — Reusable templates for rapid task creation
- **Optimistic Locking** — Concurrent edit detection with user-friendly conflict resolution

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Java 17, Spring Boot 3.2, Spring Security, Spring Data JPA, WebSocket (STOMP) |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, TanStack React Query 5, Axios, Lucide Icons, Framer Motion, react-hot-toast, date-fns |
| **Database** | H2 (dev), MySQL 8 (production) |
| **Auth** | JWT (jjwt 0.12.3), BCrypt password hashing |
| **Real-Time** | STOMP over WebSocket with SockJS fallback |
| **Export** | Apache POI (Excel), iText (PDF) |
| **Testing** | Vitest, React Testing Library (frontend); JUnit 5 (backend) |
| **Deployment** | Docker, Docker Compose |

## Prerequisites

- Java 17+
- Node.js 18+
- Maven 3.6+
- MySQL 8+ (optional — H2 in-memory DB for development)

## Installation & Setup

### Backend Setup

```bash
# Clone repository
git clone https://github.com/Smitrangpariya/Flowlite.git
cd FlowLite/backend

# Copy environment variables
cp .env.example .env
# Edit .env and set your values

# Build and run
mvn clean install
mvn spring-boot:run
```

### Frontend Setup

```bash
cd FlowLite/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Docker Mode

```bash
docker-compose up --build
```

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Swagger API Docs | http://localhost:8080/swagger-ui.html |
| H2 Console (dev) | http://localhost:8080/h2-console |

## Default Credentials (Development Mode)

When `DataSeeder` runs (non-production profiles only):

| Email | Password | Role |
|-------|----------|------|
| admin@flowlite.com | password123 | ADMIN |
| manager@flowlite.com | password123 | PRODUCT_MANAGER |
| lead@flowlite.com | password123 | TEAM_LEAD |
| member@flowlite.com | password123 | TEAM_MEMBER |

**Organization:** FlowLite Demo

> **Note:** Default users are only seeded in non-production profiles.

## Environment Variables

Copy `.env.example` to `.env` and configure. Critical variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (dev default) | JWT signing key (minimum 32 characters) |
| `JWT_EXPIRATION` | `3600000` | Token expiry in ms (1 hour) |
| `MYSQL_URL` | `jdbc:h2:mem:flowlite` | Database JDBC URL |
| `MYSQL_USER` | `sa` | Database username |
| `MYSQL_PASSWORD` | (empty) | Database password |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins |
| `MAIL_HOST` | `smtp.gmail.com` | SMTP server host |
| `MAIL_PORT` | `587` | SMTP server port |
| `MAIL_USERNAME` | (empty) | SMTP email address |
| `MAIL_PASSWORD` | (empty) | SMTP app password |

See [.env.example](.env.example) for all available variables.

## Database Setup

### H2 (Development)

Automatic setup — no configuration needed. Data resets on restart.

### MySQL (Production)

```sql
CREATE DATABASE flowlite;
CREATE USER 'flowlite_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON flowlite.* TO 'flowlite_user'@'localhost';
FLUSH PRIVILEGES;
```

Then update `.env`:
```
MYSQL_URL=jdbc:mysql://localhost:3306/flowlite?useSSL=false&serverTimezone=UTC
MYSQL_USER=flowlite_user
MYSQL_PASSWORD=your_password
```

## Project Structure

```
FlowLite/
├── backend/
│   ├── src/main/java/com/flowlite/
│   │   ├── config/          # Security, JWT, WebSocket, Swagger configs
│   │   ├── controller/      # REST API endpoints
│   │   │   ├── AdminController        # Admin user & audit management
│   │   │   ├── AuthController         # Authentication & password reset
│   │   │   ├── BoardController        # Board CRUD, limits, reordering
│   │   │   ├── DashboardController    # Analytics & statistics
│   │   │   ├── NotificationController # User notifications
│   │   │   ├── ProfileController      # Profile & password management
│   │   │   ├── ProjectController      # Project CRUD
│   │   │   ├── TaskController         # Task CRUD, workflow, trash
│   │   │   ├── TaskTemplateController # Task templates
│   │   │   └── UserController         # User listing for assignments
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── entity/          # JPA Entities (Task, Board, Project, User, etc.)
│   │   ├── exception/       # Custom exceptions & error handling
│   │   ├── repository/      # Data Access Layer
│   │   ├── service/         # Business Logic
│   │   ├── aspect/          # AOP Audit Logging
│   │   ├── filter/          # Rate Limiting & JWT filters
│   │   ├── scheduler/       # Cleanup Jobs
│   │   ├── seeder/          # Development Data Seeder
│   │   └── validation/      # Input Validation
│   └── src/main/resources/
│       └── application.properties
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API clients (task, board, project, websocket)
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Navbar               # Navigation bar with notifications & trash
│   │   │   ├── CommandPalette       # Keyboard-driven command palette
│   │   │   ├── TaskCard             # Task display with actions
│   │   │   ├── CreateTaskModal      # Task creation form
│   │   │   ├── EditTaskModal        # Task editing form
│   │   │   ├── CreateBoardModal     # Board creation with colors & icons
│   │   │   ├── EditBoardModal       # Board editing
│   │   │   ├── CreateProjectModal   # Project creation
│   │   │   ├── TrashModal           # Recycle bin with restore & empty
│   │   │   ├── AuditReportModal     # Audit report with Excel/PDF export
│   │   │   ├── NotificationDropdown # In-app notification center
│   │   │   ├── TaskCommentSection   # Task comments
│   │   │   └── ...                  # Archive, Cancel, Delete, Confirm modals
│   │   ├── context/         # Auth context (React Context)
│   │   ├── hooks/           # Custom React hooks (useBoards, useTasks, useTaskMutations, useTaskWebSocket, useKeyboardShortcuts)
│   │   ├── pages/           # Page components (Dashboard, Boards, BoardTasks, Profile, Login, Register, Admin, etc.)
│   │   ├── constants/       # Application constants
│   │   ├── test/            # Frontend test suites
│   │   └── App.jsx          # Root component with routing
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── .env.example
└── README.md
```

## Workflow Rules

| Transition | Who Can Do It |
|------------|---------------|
| `CREATED → ASSIGNED` | Admin, Product Manager, Team Lead |
| `ASSIGNED → IN_PROGRESS` | Assignee only |
| `IN_PROGRESS → REVIEW` | Assignee only |
| `REVIEW → DONE` | Approver (Team Lead, Admin) |
| `REVIEW → IN_PROGRESS` | Approver (reject) |
| Any → `CANCELLED` | Admin, Product Manager, Creator |
| `DONE → ARCHIVED` | Admin, Product Manager |

**Additional rules:**
- Only `CREATED` tasks can be permanently deleted
- Archived/cancelled tasks can be restored to their previous status
- Soft-deleted tasks support undo within a time window
- Recycle bin supports bulk permanent deletion (empty trash)

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with new organization |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/logout` | Logout (revokes token) |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/verify-email` | Verify email with token |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List active tasks (org-scoped) |
| GET | `/api/tasks/paginated` | List tasks with pagination |
| GET | `/api/tasks/board/{boardId}` | List tasks by board (paginated) |
| GET | `/api/tasks/board/{boardId}/all` | All tasks for a board |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/{id}` | Update task (optimistic lock via version) |
| DELETE | `/api/tasks/{id}` | Soft-delete task |
| PATCH | `/api/tasks/{id}/status` | Update task status (workflow enforced) |
| GET | `/api/tasks/my` | My assigned tasks |
| GET | `/api/tasks/search` | Search with filters (paginated, sorted) |
| GET | `/api/tasks/archived` | Archived tasks |
| GET | `/api/tasks/cancelled` | Cancelled tasks |
| GET | `/api/tasks/deleted` | Soft-deleted tasks (trash) |
| DELETE | `/api/tasks/trash/empty` | Permanently delete all trashed tasks |
| POST | `/api/tasks/{id}/archive` | Archive task |
| POST | `/api/tasks/{id}/cancel` | Cancel task (with reason) |
| PUT | `/api/tasks/{id}/restore` | Restore archived/cancelled task |
| PUT | `/api/tasks/{id}/undo-delete` | Undo soft-delete |

### Task Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/{id}/comments` | Get task comments |
| POST | `/api/tasks/{id}/comments` | Add comment |

### Task Audit & Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/{id}/audit` | Get task audit report |
| GET | `/api/tasks/{id}/audit/excel` | Export audit report as Excel |
| GET | `/api/tasks/{id}/audit/pdf` | Export audit report as PDF |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all visible boards (team + personal) |
| GET | `/api/boards/team` | List team boards only |
| GET | `/api/boards/personal` | List personal boards only |
| GET | `/api/boards/limits` | Get board usage & limits |
| GET | `/api/boards/{id}` | Get board by ID |
| POST | `/api/boards` | Create board (team: admin only; personal: anyone) |
| PUT | `/api/boards/{id}` | Update board |
| PUT | `/api/boards/{id}/set-default` | Set as default board |
| PUT | `/api/boards/reorder` | Reorder personal boards |
| DELETE | `/api/boards/{id}` | Delete board |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/{id}` | Get project by ID |
| POST | `/api/projects` | Create project (Manager/Admin) |
| PUT | `/api/projects/{id}` | Update project (Manager/Admin) |
| DELETE | `/api/projects/{id}` | Delete project (Admin only) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get org-scoped task statistics & completion rate |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update profile (name, email) |
| POST | `/api/users/me/password` | Change password |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| GET | `/api/notifications/unread-count` | Get unread notification count |
| PATCH | `/api/notifications/{id}/read` | Mark notification as read |
| POST | `/api/notifications/read-all` | Mark all as read |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List org/team users for assignment |
| GET | `/api/users/{id}` | Get user by ID |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List active templates |
| POST | `/api/templates` | Create template (Manager/Admin) |
| DELETE | `/api/templates/{id}` | Delete template (Manager/Admin) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List org users (ADMIN only) |
| POST | `/api/admin/users` | Create user in org |
| PATCH | `/api/admin/users/{id}/role` | Update user role |
| DELETE | `/api/admin/users/{id}` | Deactivate user |
| GET | `/api/admin/organization` | Get organization info |
| GET | `/api/admin/audit-logs` | View audit logs (filterable by days) |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `/ws` | STOMP WebSocket endpoint (SockJS fallback) |
| `/topic/org/{orgId}/tasks` | Subscribe for real-time task events |

**WebSocket event payload:**
```json
{
  "type": "TASK_CREATED | TASK_UPDATED | TASK_DELETED | TASK_ARCHIVED | TASK_CANCELLED | TASK_RESTORED",
  "task": { /* TaskResponse object */ }
}
```

Interactive API docs available at: http://localhost:8080/swagger-ui.html

## Frontend Pages & Components

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Org-scoped task statistics, charts, and overview |
| Boards | `/boards` | Manage team and personal boards with custom colors & icons |
| Board Tasks | `/boards/:boardId/tasks` | View and manage tasks within a specific board |
| Profile | `/profile` | View/edit profile and change password |
| Task Templates | `/templates` | Create and manage reusable task templates |
| Admin Users | `/admin/users` | Manage org users and roles (Admin only) |
| Admin Audit Logs | `/admin/audit-logs` | View admin audit trail (Admin only) |
| Login / Register | `/login`, `/register` | Authentication with email verification |
| Password Reset | `/forgot-password`, `/reset-password` | SMTP-powered reset flow |

**Key UI Components:**
- **Command Palette** — `Ctrl+K` keyboard shortcut for quick navigation
- **Notification Dropdown** — Real-time bell icon with unread badge
- **Trash Modal** — Recycle bin with restore and empty trash actions
- **Audit Report Modal** — View task audit trail with Excel/PDF export
- **Task Card** — Rich task display with status transitions, comments, and actions

## Testing

### Backend Tests
```bash
cd backend
mvn test
```

Runs unit tests:
- `AuthServiceTest` — Registration, login, lockout, token management
- `TaskServiceTest` — CRUD, org isolation, status transitions, WebSocket broadcasts, permissions

### Frontend Tests
```bash
cd frontend
npm test
```

Runs with Vitest and React Testing Library.

## Security Features

- **BCrypt Password Hashing** — Industry-standard password storage
- **JWT Token Authentication** — Stateless auth with configurable expiration
- **Token Revocation** — Tokens invalidated on logout
- **Rate Limiting** — 5 login attempts per minute per IP
- **Account Lockout** — Auto-lock after 5 consecutive failed attempts
- **Email Verification** — Required for new accounts
- **Password Strength Validation** — Enforced minimum complexity
- **XSS Input Sanitization** — User input sanitized before storage
- **CSRF Protection** — Spring Security CSRF for stateful endpoints
- **Multi-Tenant Data Isolation** — Organization-scoped queries prevent cross-tenant access
- **Role-Based Method Security** — `@PreAuthorize` annotations on all endpoints

## Deployment

### Production Checklist

1. Set `spring.profiles.active=production`
2. Configure MySQL connection via environment variables
3. Set a strong `JWT_SECRET` (256+ bits / minimum 32 characters)
4. Configure SMTP credentials for email features
5. H2 Console and Swagger UI are automatically disabled in production
6. Set `spring.jpa.hibernate.ddl-auto=validate`
7. Set up SSL/TLS
8. Configure proper `CORS_ALLOWED_ORIGINS`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## License

MIT

## Authors

- FlowLite Team

## Acknowledgments

- [Spring Boot](https://spring.io/projects/spring-boot)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query)
- [Lucide Icons](https://lucide.dev/)
- [Framer Motion](https://www.framer.com/motion/)
- [react-hot-toast](https://react-hot-toast.com/)
- [date-fns](https://date-fns.org/)
- All open-source libraries used in this project
