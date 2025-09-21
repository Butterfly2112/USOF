# USOF (User Stack Overflow Forum) API

A comprehensive forum API built with Node.js, Express, and MySQL. This RESTful API provides all the functionality needed for a modern forum platform with user management, posts, comments, categories, favorites, subscriptions, and real-time notifications.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based auth with role-based access control
- **Posts Management** - Create, read, update, delete posts with rich content
- **Comments System** - Nested commenting with likes/dislikes
- **Categories** - Organize posts by categories with many-to-many relationships
- **Like/Dislike System** - Users can like/dislike posts and comments
- **User Profiles** - Complete user management with avatars and statistics

### Advanced Features
- **Favorites System** - Users can bookmark posts for quick access
- **Subscriptions & Notifications** - Subscribe to posts and get notified of updates
- **Advanced Search** - Full-text search with relevance scoring
- **Post Filtering & Sorting** - Filter by categories, dates, status; sort by likes/date
- **Content Moderation** - Admin tools to lock posts/comments
- **File Uploads** - Support for profile pictures and post images
- **User Statistics** - Detailed analytics for user activity

### Security & Performance
- **Password Reset** - Secure email-based password recovery
- **Input Validation** - Comprehensive validation using express-validator
- **SQL Injection Protection** - Parameterized queries throughout
- **Auto Rating System** - Automatic user rating calculation via database triggers
- **Pagination** - Efficient data loading with configurable page sizes


## 🛠 Installation

### Prerequisites
- **Node.js** (v16.0.0 or higher)
- **MySQL** (v8.0 or higher)
- **npm** (v7.0.0 or higher)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Butterfly2112/USOF.git
   cd USOF
   ```

2. **Install dependencies**
   ```bash
    npm install express mysql2 bcryptjs jsonwebtoken dotenv multer express-validator nodemailer uuid
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   mysql -u root -p < init.sql
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

The API will be available at `http://localhost:4000`

## 🔧 Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development
BASE_URL=http://localhost:4000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=usof_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

### Core Endpoints

#### Authentication
```http
POST /api/auth/register          # User registration
POST /api/auth/login             # User login
POST /api/auth/password-reset    # Request password reset
POST /api/auth/reset-password    # Reset password with token
POST /api/auth/logout            # User logout
```

#### Users
```http
GET    /api/users                # Get all users (public)
POST   /api/users                # Create user (admin only)
GET    /api/users/:id            # Get user profile
PATCH  /api/users/:id            # Update user profile
DELETE /api/users/:id            # Delete user
PATCH  /api/users/avatar         # Update user avatar
```

#### Posts
```http
GET    /api/posts                # List posts with filtering/sorting
POST   /api/posts                # Create new post
GET    /api/posts/:id            # Get specific post
PATCH  /api/posts/:id            # Update post (author/admin)
DELETE /api/posts/:id            # Delete post (author/admin)
PATCH  /api/posts/:id/lock       # Lock/unlock post (admin only)
```

#### Comments
```http
GET    /api/posts/:id/comments   # Get post comments
POST   /api/posts/:id/comments   # Add comment to post
GET    /api/comments/:id         # Get specific comment
PATCH  /api/comments/:id         # Update comment (author only)
DELETE /api/comments/:id         # Delete comment (author only)
PATCH  /api/comments/:id/lock    # Lock/unlock comment (admin only)
PATCH  /api/comments/:id/status  # Change comment status
```

#### Likes
```http
POST   /api/posts/:id/like       # Like/dislike post
GET    /api/posts/:id/like       # Get post likes
DELETE /api/posts/:id/like       # Remove like from post
POST   /api/comments/:id/like    # Like/dislike comment
DELETE /api/comments/:id/like    # Remove like from comment
```

#### Categories
```http
GET    /api/categories           # List all categories
POST   /api/categories           # Create category (admin only)
GET    /api/categories/:id       # Get specific category
PATCH  /api/categories/:id       # Update category (admin only)
DELETE /api/categories/:id       # Delete category (admin only)
GET    /api/categories/:id/posts # Get posts by category
```

#### Advanced Features
```http
# Favorites
GET    /api/favorites            # Get user's favorite posts
POST   /api/favorites/:postId    # Add post to favorites
DELETE /api/favorites/:postId    # Remove from favorites

# Subscriptions & Notifications
POST   /api/subscriptions/:postId    # Subscribe to post
DELETE /api/subscriptions/:postId    # Unsubscribe from post
GET    /api/notifications            # Get user notifications
PATCH  /api/notifications/:id/read   # Mark notification as read

# Search & Statistics
GET    /api/search/posts?q=query     # Search posts
GET    /api/stats/users/:id          # Get user statistics
```

### Request/Response Examples

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "login": "john_doe",
  "password": "securepassword123",
  "fullName": "John Doe",
  "email": "john@example.com"
}
```

#### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "How to use async/await in JavaScript",
  "content": "Here's a comprehensive guide...",
  "categories": [1, 2, 3],
  "status": "active"
}
```

#### Search Posts
```http
GET /api/search/posts?q=javascript&sort=relevance&page=1&pageSize=10
```

#### Filter Posts
```http
GET /api/posts?categories=1,2&dateFrom=2024-01-01&sort=likes&page=1
```

### Response Format
All responses follow this structure:
```json
{
  "success": true|false,
  "data": {...},
  "error": "Error message if success=false",
  "details": "Additional error details (development only)"
}
```

## 🎯 Advanced Features Deep Dive

### Favorites System
Users can bookmark posts for quick access:
- Add/remove posts from favorites
- Paginated favorites list
- Duplicate prevention with UNIQUE constraints

### Subscriptions & Notifications
Real-time engagement system:
- Subscribe to posts for updates
- Automatic notifications on post changes/new comments
- Mark notifications as read/unread
- Notification types: post_updated, new_comment, post_liked

### Search Functionality
Comprehensive search with relevance scoring:
- Full-text search in post titles and content
- Relevance scoring (title matches weighted higher)
- Multiple sorting options (relevance, date, likes)
- Pagination support

### Content Moderation
Admin tools for community management:
- Lock/unlock posts and comments
- Change content status (active/inactive)
- Admin-only access to moderation tools
- Track who locked content and when

### User Statistics
Detailed analytics for user engagement:
- Total posts and active posts count
- Average likes per post
- Total comments made
- Likes/dislikes given to others

## 🧪 Testing

### Manual Testing
Use tools like Postman or curl to test endpoints:

```bash
# Register a new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"password123","email":"test@example.com","fullName":"Test User"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginOrEmail":"testuser","password":"password123"}'

# Create a post (use token from login response)
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"title":"Test Post","content":"This is a test post","categories":[1]}'
```

### Health Check
```bash
curl http://localhost:4000/health
# Expected response: {"ok":true}
```

**Made with ❤️ by [Your Name]**