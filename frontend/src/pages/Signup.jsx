import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  MenuItem,
  Grid,
  Container,
  Paper,
  Avatar,
  Chip,
  Alert,
  AlertTitle,
  Fade,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  PersonAdd,
  School,
  Phone,
  Language,
  Class,
  AccountCircle,
  PlayArrow,
  Refresh,
  CheckCircle,
  Warning,
  Info
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
  },
});

const LANGUAGES = [
  { value: 'English', label: 'English', flag: '🇬🇧' },
  { value: 'Hindi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { value: 'Tamil', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { value: 'Telugu', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { value: 'Kannada', label: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { value: 'Marathi', label: 'मराठी (Marathi)', flag: '🇮🇳' },
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    school: '',
    className: '',
    language: 'English'
  });
  const [loading, setLoading] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  const [message, setMessage] = useState('');
  const [showExistingUserInfo, setShowExistingUserInfo] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!form.name.trim()) {
      errors.name = 'Name is required';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(form.phone.trim())) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!form.language) {
      errors.language = 'Please select a language';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkExistingUser = async (phone) => {
    if (phone.length !== 10) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/users/check-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.exists) {
          setExistingUser(data.user);
          setShowExistingUserInfo(true);
          setMessage(data.message);
          
          // Pre-fill form with existing user data
          setForm(prev => ({
            ...prev,
            name: data.user.name,
            school: data.user.school || '',
            className: data.user.class || '',
            language: data.user.language
          }));
        } else {
          setExistingUser(null);
          setShowExistingUserInfo(false);
          setMessage('');
        }
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Clear specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Check for existing user when phone number changes
    if (name === 'phone') {
      const cleanPhone = value.replace(/\D/g, '').slice(0, 10);
      setForm(prev => ({ ...prev, phone: cleanPhone }));
      
      if (cleanPhone.length === 10) {
        checkExistingUser(cleanPhone);
      } else if (existingUser) {
        setExistingUser(null);
        setShowExistingUserInfo(false);
        setMessage('');
      }
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      school: '',
      className: '',
      language: 'English'
    });
    setExistingUser(null);
    setShowExistingUserInfo(false);
    setMessage('');
    setFormErrors({});
  };

  const start = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Store data in sessionStorage to pass to questions page
      const dataToStore = {
        ...form,
        isExistingUser: !!existingUser,
        attemptNumber: existingUser ? (existingUser.totalAttempts + 1) : 1,
        timestamp: new Date().getTime()
      };

      sessionStorage.setItem('userSignup', JSON.stringify(dataToStore));
      
      // Simulate loading for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      navigate('/questions');
    } catch (error) {
      console.error('Error starting quiz:', error);
      setMessage('Error starting quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedLanguage = LANGUAGES.find(lang => lang.value === form.language);

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          py: 4
        }}
      >
        <Container maxWidth="sm">
          <Fade in={true} timeout={800}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  color: 'white',
                  p: 4,
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    border: '3px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <PersonAdd sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h4" gutterBottom>
                  📚 Quiz Registration
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Start your learning journey today
                </Typography>
              </Box>

              <CardContent sx={{ p: 4 }}>
                {/* Existing User Welcome */}
                {showExistingUserInfo && existingUser && (
                  <Fade in={true}>
                    <Alert 
                      severity="success" 
                      icon={<CheckCircle />}
                      sx={{ mb: 3, borderRadius: 2 }}
                    >
                      <AlertTitle>🎉 Welcome Back!</AlertTitle>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>{existingUser.name}</strong> • Phone: {existingUser.phone}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Previous attempts: <strong>{existingUser.totalAttempts}</strong> • 
                          Last attempt: {new Date(existingUser.lastSubmission).toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={`This will be attempt #${existingUser.totalAttempts + 1}`}
                          color="success"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Alert>
                  </Fade>
                )}

                {/* General Message */}
                {message && !showExistingUserInfo && (
                  <Alert 
                    severity="info" 
                    icon={<Info />}
                    sx={{ mb: 3, borderRadius: 2 }}
                  >
                    {message}
                  </Alert>
                )}

                <form onSubmit={start}>
                  <Grid container spacing={3}>
                    {/* Name Field */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        name="name"
                        label="Full Name"
                        value={form.name}
                        onChange={handleChange}
                        error={!!formErrors.name}
                        helperText={formErrors.name}
                        required
                        InputProps={{
                          startAdornment: (
                            <AccountCircle sx={{ color: 'action.active', mr: 1 }} />
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&:hover fieldset': {
                              borderColor: 'primary.main',
                            },
                          },
                        }}
                      />
                    </Grid>

                    {/* Phone Field */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        name="phone"
                        label="Phone Number"
                        value={form.phone}
                        onChange={handleChange}
                        error={!!formErrors.phone}
                        helperText={formErrors.phone || `${form.phone.length}/10 digits`}
                        required
                        type="tel"
                        InputProps={{
                          startAdornment: (
                            <Phone sx={{ color: 'action.active', mr: 1 }} />
                          ),
                        }}
                      />
                    </Grid>

                    {/* School Field */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="school"
                        label="School Name"
                        value={form.school}
                        onChange={handleChange}
                        InputProps={{
                          startAdornment: (
                            <School sx={{ color: 'action.active', mr: 1 }} />
                          ),
                        }}
                        helperText="Optional"
                      />
                    </Grid>

                    {/* Class Field */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="className"
                        label="Class/Grade"
                        value={form.className}
                        onChange={handleChange}
                        InputProps={{
                          startAdornment: (
                            <Class sx={{ color: 'action.active', mr: 1 }} />
                          ),
                        }}
                        helperText="Optional"
                      />
                    </Grid>

                    {/* Language Field */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        select
                        name="language"
                        label="Preferred Language"
                        value={form.language}
                        onChange={handleChange}
                        error={!!formErrors.language}
                        helperText={formErrors.language}
                        required
                        InputProps={{
                          startAdornment: (
                            <Language sx={{ color: 'action.active', mr: 1 }} />
                          ),
                        }}
                      >
                        {LANGUAGES.map((lang) => (
                          <MenuItem key={lang.value} value={lang.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <span>{lang.flag}</span>
                              <span>{lang.label}</span>
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {/* Selected Language Display */}
                    {selectedLanguage && (
                      <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Chip
                            label={`${selectedLanguage.flag} Quiz will be in ${selectedLanguage.label}`}
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      </Grid>
                    )}
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Tooltip title="Reset all fields">
                      <IconButton 
                        onClick={resetForm}
                        disabled={loading}
                        sx={{ 
                          bgcolor: 'grey.100',
                          '&:hover': { bgcolor: 'grey.200' }
                        }}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
                      sx={{
                        py: 2,
                        background: existingUser 
                          ? 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
                          : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        '&:hover': {
                          background: existingUser
                            ? 'linear-gradient(135deg, #c0392b 0%, #a93226 100%)'
                            : 'linear-gradient(135deg, #229954 0%, #27ae60 100%)',
                        },
                        fontSize: '1.1rem',
                        fontWeight: 700
                      }}
                    >
                      {loading ? 'Preparing Quiz...' :
                       existingUser ? `🔄 Start Attempt #${existingUser.totalAttempts + 1}` :
                       '🚀 Start Your First Quiz'}
                    </Button>
                  </Box>
                </form>

                {/* Progress Indicator */}
                {loading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                      Setting up your quiz experience...
                    </Typography>
                  </Box>
                )}

                {/* Footer Info */}
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    📝 <strong>Note:</strong> You can take this quiz multiple times.
                    Each attempt will be saved separately.
                  </Typography>
                  {existingUser && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      📊 Your previous quiz attempts are saved and can be viewed in the admin dashboard.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Paper>
          </Fade>
        </Container>
      </Box>
    </ThemeProvider>
  );
}