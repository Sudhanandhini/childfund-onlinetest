import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Server starting...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://childfund-onlinetest.vercel.app'
  ],
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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

const User = mongoose.model('User', userSchema);

// Enhanced MongoDB connection function
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    console.log('Attempting MongoDB connection...');
    
    // Disconnect if already connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 30000, // 30 seconds
      bufferMaxEntries: 0,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    
    console.log('MongoDB connected successfully');
    console.log('Database name:', mongoose.connection.name);
    console.log('Connection host:', mongoose.connection.host);
    
  } catch (error) {
    console.error('MongoDB connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('SOLUTION: Check username/password in MongoDB Atlas');
    } else if (error.message.includes('IP') || error.message.includes('network')) {
      console.error('SOLUTION: Add 0.0.0.0/0 to MongoDB Atlas Network Access');
    } else if (error.message.includes('timeout')) {
      console.error('SOLUTION: Check MongoDB Atlas cluster status');
    }
    
    // Retry connection after 15 seconds
    setTimeout(connectDB, 15000);
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
  // Attempt to reconnect
  setTimeout(connectDB, 10000);
});

// Routes
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'Disconnected',
    1: 'Connected', 
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  res.json({
    message: 'MERN Quiz Server is running!',
    timestamp: new Date().toISOString(),
    database: statusMap[dbStatus],
    environment: process.env.NODE_ENV || 'development',
    mongooseVersion: mongoose.version
  });
});

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting', 
    3: 'Disconnecting'
  };
  
  res.json({
    status: 'OK',
    database: statusMap[dbStatus],
    timestamp: new Date().toISOString(),
    port: PORT,
    uptime: process.uptime()
  });
});

// Test MongoDB connection endpoint
app.get('/test-db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    
    if (dbStatus !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        status: dbStatus
      });
    }
    
    // Try to perform a simple operation
    const testResult = await mongoose.connection.db.admin().ping();
    
    res.json({
      success: true,
      message: 'Database connection test successful',
      ping: testResult,
      collections: await mongoose.connection.db.listCollections().toArray()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Save user route
app.post('/api/users', async (req, res) => {
  try {
    console.log('Received user submission:', req.body);
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'Please wait for database connection'
      });
    }

    const { name, email, phone, school, language, answers, score } = req.body;
    
    // Validation
    if (!name || !email || !phone || !school || !language) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'email', 'phone', 'school', 'language']
      });
    }

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      school: school.trim(), 
      language: language.trim(),
      answers: answers || [],
      score: parseInt(score) || 0
    });

    const savedUser = await newUser.save();
    console.log('User saved successfully:', savedUser._id);
    
    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully!',
      userId: savedUser._id,
      score: savedUser.score
    });
    
  } catch (error) {
    console.error('Save user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving user data',
      error: error.message
    });
  }
});

// Get users routes
app.get('/api/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const users = await User.find({}).sort({ submittedAt: -1 }).lean();
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Admin users route
app.get('/api/admin/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const users = await User.find({}).sort({ submittedAt: -1 }).lean();
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
    
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin users',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// Start server and connect to database
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: https://childfund-onlinetest.onrender.com/health`);
      console.log(`DB test: https://childfund-onlinetest.onrender.com/test-db`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();