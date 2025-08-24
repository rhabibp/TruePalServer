# TruePal Inventory Management System

A comprehensive inventory management system with role-based authentication, built with Kotlin/Ktor backend and React/TypeScript frontend.

## 🚀 Features

### Authentication & User Management
- **JWT-based authentication** with secure token management
- **Role-based access control** (RBAC)
  - **Admin users**: Full system access including pricing information and user management
  - **Staff users**: Limited access without pricing information
- **User Management Interface** for admins to create and manage staff accounts

### Inventory Management
- Parts inventory tracking with categories
- Stock management and low-stock alerts
- Multi-item transaction support
- Machine model compatibility tracking
- Supplier information management

### Security Features
- Password hashing with BCrypt
- JWT token expiration and refresh
- Protected API endpoints
- Role-based UI rendering
- Secure user session management

## 📋 Prerequisites

- **Java 17** or higher
- **Node.js 18** or higher
- **PostgreSQL 12** or higher
- **Git**

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TruePalServer
```

### 2. Database Setup
1. Create a PostgreSQL database named `truepal_inventory`
2. Update database connection settings in `src/main/resources/application.conf`
3. The application will automatically run Flyway migrations on startup

### 3. Backend Setup
```bash
# Build and run the backend server
./gradlew run

# The backend will start on http://localhost:8080
```

### 4. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev

# The frontend will start on http://localhost:3003
```

## 👥 User Management

### Default Users
The system comes with pre-configured users for testing:

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `admin` | `admin123` | ADMIN | Full system access, can manage users |
| `staff` | `staff123` | STAFF | Limited access, no pricing information |

### Creating New Staff Users (Admin Only)

1. **Login as Admin**
   - Use the default admin credentials above
   
2. **Navigate to User Management**
   - Click "User Management" in the sidebar (admin-only section)
   
3. **Create New User**
   - Click "Create New User" button
   - Fill in the required information:
     - Username (unique)
     - Password (minimum 6 characters)
     - Email address
     - Full name
     - Role (ADMIN or STAFF)
   
4. **User Management Actions**
   - **Activate/Deactivate users** - Toggle user access
   - **Delete users** - Permanently remove users (with confirmation)
   - **View user details** - See creation date, status, and activity

### Staff User Limitations

Staff users have restricted access:
- ❌ Cannot see parts pricing information
- ❌ Cannot access user management
- ❌ Cannot create, edit, or delete parts
- ✅ Can view parts inventory (without pricing)
- ✅ Can view transaction history
- ✅ Can access reports and analytics

## Technical Stack

### Backend
- **Framework**: Ktor (Kotlin web framework)
- **Database**: PostgreSQL with Exposed ORM
- **Authentication**: JWT tokens with BCrypt password hashing
- **Migrations**: Flyway for database versioning

### Frontend  
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors
- **Notifications**: React Hot Toast

## 🔐 Authentication Flow

### Login Process
1. User enters username/password on login form
2. Backend validates credentials and checks user status
3. JWT token generated with user ID, username, and role
4. Token stored in browser and sent with all API requests
5. Frontend routes and UI adapt based on user role

### Token Management
- **Expiration**: Tokens expire after 24 hours
- **Storage**: Stored in browser localStorage
- **Validation**: All API requests validate token server-side
- **Logout**: Tokens are cleared from browser storage

### Password Security
- Passwords hashed using BCrypt with salt
- Minimum 6 character requirement
- Current password required for changes

## 🎨 User Interface

### Modern Design Features
- **Clean Dashboard** with role-based cards and statistics
- **Responsive Layout** that works on all screen sizes
- **Sidebar Navigation** with role-based menu items
- **Professional Color Scheme** with gradient cards
- **User Profile Menu** with logout functionality
- **Modal Forms** for user creation and management
- **Toast Notifications** for user feedback

### Navigation Structure
```
├── Dashboard (All Users)
├── Parts Inventory (All Users, Staff sees no pricing)
├── Transactions (All Users)
├── Reports (All Users)
└── User Management (Admin Only)
    ├── Create New User
    ├── View All Users
    ├── Activate/Deactivate Users
    └── Delete Users
```

## 📊 API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/change-password` - Change user password

### Admin User Management
- `GET /api/admin/users` - List all users (Admin only)
- `POST /api/admin/users` - Create new user (Admin only)
- `PUT /api/admin/users/{id}/toggle-status` - Activate/deactivate user (Admin only)
- `DELETE /api/admin/users/{id}` - Delete user (Admin only)

### Parts Endpoints
- `GET /api/parts` - List parts (Staff gets filtered response without pricing)
- `POST /api/parts` - Create part (Admin only)
- `PUT /api/parts/{id}` - Update part (Admin only)
- `DELETE /api/parts/{id}` - Delete part (Admin only)

## 🧪 Testing

### Test the Authentication System

1. **Admin Login Test**
   ```bash
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

2. **Staff Login Test**
   ```bash
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"staff","password":"staff123"}'
   ```

3. **Create Staff User (Admin Token Required)**
   ```bash
   curl -X POST http://localhost:8080/api/admin/users \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "username": "newstaff",
       "password": "password123",
       "email": "staff@example.com",
       "fullName": "New Staff Member",
       "role": "STAFF"
     }'
   ```

## Building & Running

### Backend Commands
| Task                          | Description                                                          |
| -------------------------------|---------------------------------------------------------------------- |
| `./gradlew test`              | Run the tests                                                        |
| `./gradlew build`             | Build everything                                                     |
| `./gradlew run`               | Run the server (starts on :8080)                                    |
| `buildFatJar`                 | Build an executable JAR of the server with all dependencies included |
| `buildImage`                  | Build the docker image to use with the fat JAR                       |
| `publishImageToLocalRegistry` | Publish the docker image locally                                     |
| `runDocker`                   | Run using the local docker image                                     |

### Frontend Commands
| Task                 | Description                           |
| ---------------------|-------------------------------------- |
| `npm run dev`        | Development server with hot reload    |
| `npm run build`      | Production build                      |
| `npm run lint`       | Run ESLint                           |
| `npm run preview`    | Preview production build             |

If the server starts successfully, you'll see the following output:

```
2024-12-04 14:32:45.584 [main] INFO  Application - Application started in 0.303 seconds.
2024-12-04 14:32:45.682 [main] INFO  Application - Responding at http://0.0.0.0:8080
```

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Failed**
- Ensure PostgreSQL is running
- Check database credentials in configuration
- Verify database exists

**2. JWT Token Invalid**
- Check token expiration
- Verify JWT secret configuration matches
- Clear browser localStorage and login again

**3. Permission Denied**
- Verify user role matches required permissions
- Check if user account is active
- Ensure proper JWT token is being sent

**4. Frontend Build Errors**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify all TypeScript types are correct

## 🎯 Quick Start Guide

For the fastest setup experience:

1. **Start Database**: Ensure PostgreSQL is running
2. **Start Backend**: `./gradlew run`
3. **Start Frontend**: `cd frontend && npm install && npm run dev`
4. **Login**: Use `admin`/`admin123` or `staff`/`staff123`
5. **Create Staff User**: Login as admin → User Management → Create New User
6. **Test Role Differences**: Login as staff to see limited access

The system is now ready for inventory management with secure, role-based access control! 🎉

## 📚 Additional Resources

- **Backend Framework**: [Ktor Documentation](https://ktor.io/docs/)
- **Frontend Framework**: [React Documentation](https://react.dev/)
- **Styling**: [TailwindCSS Documentation](https://tailwindcss.com/docs)
- **Database**: [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- **Authentication**: [JWT.io](https://jwt.io/)

