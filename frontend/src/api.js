import axios from 'axios';

// Fixed backend URL - note the missing 'https://' in your description
const API_BASE = 'https://childfund-onlinetest.onrender.com';

console.log('Frontend-Backend Connection:', {
  frontend: typeof window !== 'undefined' ? window.location.origin : 'server',
  backend: API_BASE,
  timestamp: new Date().toISOString()
});

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000, // 60 seconds for Render cold starts
  withCredentials: false,
});

// Request interceptor with detailed logging
api.interceptors.request.use(
  (config) => {
    console.log('=== API REQUEST ===');
    console.log('Method:', config.method?.toUpperCase());
    console.log('URL:', `${config.baseURL}${config.url}`);
    console.log('Data:', config.data);
    console.log('==================');
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with detailed error handling
api.interceptors.response.use(
  (response) => {
    console.log('=== API SUCCESS ===');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    console.log('==================');
    return response;
  },
  (error) => {
    console.error('=== API ERROR ===');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message || error.message);
    console.error('Full Error:', error.response?.data);
    console.error('Request URL:', `${error.config?.baseURL}${error.config?.url}`);
    console.error('================');
    return Promise.reject(error);
  }
);

// Wake up Render server (handles cold starts)
export const wakeUpServer = async () => {
  try {
    console.log('Waking up Render server...');
    const response = await fetch(`${API_BASE}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Server wake-up failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Server is awake:', data);
    return data;
  } catch (error) {
    console.error('Wake-up failed:', error);
    throw error;
  }
};

// Test connection
export const testConnection = async () => {
  try {
    console.log('Testing connection to Render backend...');
    const response = await api.get('/health');
    console.log('Connection successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

// Main save user function
export const saveUser = async (payload) => {
  try {
    console.log('Starting user save process...');
    console.log('Payload:', payload);
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'school', 'language'];
    const missingFields = requiredFields.filter(field => !payload[field]?.trim());
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Clean payload
    const cleanPayload = {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      school: payload.school.trim(),
      language: payload.language.trim(),
      answers: payload.answers || [],
      score: payload.score || 0
    };
    
    console.log('Sending clean payload:', cleanPayload);
    
    // Wake up server first (for cold starts)
    try {
      await wakeUpServer();
      // Wait 2 seconds for server to fully wake up
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (wakeError) {
      console.warn('Server wake-up failed, trying direct save:', wakeError.message);
    }
    
    // Save user data
    const response = await api.post('/api/users', cleanPayload);
    console.log('User saved successfully!', response.data);
    return response;
    
  } catch (error) {
    console.error('Save user failed:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Render server is starting up. Please wait 30 seconds and try again.');
    } else if (error.response?.status === 503) {
      throw new Error('Database connection issue. Please try again in a moment.');
    } else if (error.response?.status === 404) {
      throw new Error('API endpoint not found. Backend deployment issue.');
    } else if (error.response?.status === 403) {
      throw new Error('Access denied. CORS configuration issue.');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    } else if (!error.response) {
      throw new Error('Cannot connect to server. Please check your internet connection.');
    } else {
      throw new Error(error.response?.data?.message || error.message || 'Save failed. Please try again.');
    }
  }
};

// Admin functions
export const getAdminUsers = async () => {
  try {
    console.log('Fetching admin users...');
    
    // Wake up server if needed
    try {
      await wakeUpServer();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (wakeError) {
      console.warn('Wake-up failed, trying direct request');
    }
    
    const response = await api.get('/api/admin/users');
    console.log('Admin users fetched:', response.data);
    return response;
    
  } catch (error) {
    console.error('Failed to fetch admin users:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Server is starting up. Please wait and try again.');
    } else if (error.response?.status === 503) {
      throw new Error('Database connection issue. Please try again.');
    } else {
      throw new Error(error.response?.data?.message || 'Failed to fetch users.');
    }
  }
};

export const getUsers = async () => {
  try {
    const response = await api.get('/api/users');
    return response;
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};

// Complete diagnostic function
export const runDiagnostics = async () => {
  console.log('Running complete diagnostics...');
  const results = {};
  
  try {
    // Test 1: Basic server ping
    console.log('1. Testing server ping...');
    const pingResult = await wakeUpServer();
    results.serverPing = { status: 'SUCCESS', data: pingResult };
  } catch (error) {
    results.serverPing = { status: 'FAILED', error: error.message };
  }
  
  try {
    // Test 2: Health check
    console.log('2. Testing health endpoint...');
    const healthResult = await testConnection();
    results.healthCheck = { status: 'SUCCESS', data: healthResult };
  } catch (error) {
    results.healthCheck = { status: 'FAILED', error: error.message };
  }
  
  try {
    // Test 3: Users endpoint
    console.log('3. Testing users endpoint...');
    const usersResult = await api.get('/api/users');
    results.usersEndpoint = { status: 'SUCCESS', count: usersResult.data.users?.length || 0 };
  } catch (error) {
    results.usersEndpoint = { status: 'FAILED', error: error.message };
  }
  
  try {
    // Test 4: Test save functionality
    console.log('4. Testing save functionality...');
    const testPayload = {
      name: 'Test User ' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      phone: '1234567890',
      school: 'Test School',
      language: 'English',
      answers: ['A', 'B', 'C'],
      score: 75
    };
    const saveResult = await saveUser(testPayload);
    results.saveTest = { status: 'SUCCESS', userId: saveResult.data.userId };
  } catch (error) {
    results.saveTest = { status: 'FAILED', error: error.message };
  }
  
  console.log('Diagnostic Results:', results);
  return results;
};

export default api;