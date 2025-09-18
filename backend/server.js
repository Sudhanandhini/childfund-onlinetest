import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for Vercel deployment
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://childfund-onlinetest.vercel.app',
      'https://childfund-onlinetest-git-main-sudhanandhinjs-projects.vercel.app',
      'https://childfund-onlinetest-sudhanandhinjs-projects.vercel.app',
      // Add Vercel preview deployments pattern
      /^https:\/\/childfund-onlinetest.*\.vercel\.app$/
    ];
    
    console.log('CORS Check - Origin:', origin);
    
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) {
      console.log('CORS: No origin - ALLOWED');
      return callback(null, true);
    }
    
    // Check if origin matches allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      console.log('CORS: Origin allowed -', origin);
      callback(null, true);
    } else {
      console.log('CORS: Origin blocked -', origin);
      // For debugging, allow all origins initially
      callback(null, true); // Change to callback(new Error('Not allowed by CORS')); after testing
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  console.log('Origin:', req.get('Origin'));
  console.log('User-Agent:', req.get('User-Agent')?.substring(0, 50) + '...');
  next();
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  school: { type: String, required: true },
  language: { type: String, required: true },
  answers: [{ type: String }],
  score: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log('Database:', mongoose.connection.name);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'MERN Quiz Server is running!',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development',
    cors: 'Enabled for Vercel'
  });
});

app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
    
    res.json({
      status: 'OK',
      database: states[dbState],
      timestamp: new Date().toISOString(),
      port: PORT,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set'
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message
    });
  }
});

// Save user route
app.post('/api/users', async (req, res) => {
  try {
    console.log('📝 Received user submission:', req.body);
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ Database not connected');
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'Database connection unavailable'
      });
    }

    const { name, email, phone, school, language, answers, score } = req.body;
    
    // Validation
    const requiredFields = { name, email, phone, school, language };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || !value.toString().trim())
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'email', 'phone', 'school', 'language'],
        missing: missingFields
      });
    }

    // Create new user
    const newUser = new User({
      name: name.toString().trim(),
      email: email.toString().trim().toLowerCase(),
      phone: phone.toString().trim(),
      school: school.toString().trim(),
      language: language.toString().trim(),
      answers: answers || [],
      score: parseInt(score) || 0,
      submittedAt: new Date()
    });

    // Save to database
    const savedUser = await newUser.save();
    
    console.log('✅ User saved successfully:', savedUser._id);
    
    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully!',
      userId: savedUser._id,
      score: savedUser.score
    });
    
  } catch (error) {
    console.error('❌ Error saving user:', error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry',
        error: 'A submission with this information already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error saving quiz submission',
      error: error.message
    });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const users = await User.find({})
      .select('-__v')
      .sort({ submittedAt: -1 })
      .lean();
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Admin routes
app.get('/api/admin/users', async (req, res) => {
  try {
    console.log('📊 Admin: Fetching all users...');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const users = await User.find({})
      .sort({ submittedAt: -1 })
      .lean();

    console.log(`✅ Found ${users.length} users for admin`);
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
    
  } catch (error) {
    console.error('❌ Admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin users',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.originalUrl);
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    availableRoutes: ['/api/users', '/api/admin/users', '/health']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      origin: req.get('Origin')
    });
  }
  
  res.status(500).json({ 
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for Vercel deployment`);
});