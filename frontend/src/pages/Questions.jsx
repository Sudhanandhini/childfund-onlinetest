import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Avatar,
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Fade,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Quiz,
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  RadioButtonUnchecked,
  Person,
  Language,
  School,
  Timer,
  Send,
  Warning,
  Home,
  RestartAlt
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { QUESTIONS } from '../data/questions';
import { saveUser } from '../api';

// Custom theme for quiz
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

export default function Questions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem('userSignup');
    if (!raw) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(raw);
    setUser(parsed);
    const lang = parsed.language || 'English';
    setQuestions(QUESTIONS[lang] || QUESTIONS['English']);
  }, [navigate]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleSelect = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  };

  const goToQuestion = (index) => {
    setCurrentQuestion(index);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).filter(key => answers[key]).length;
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const answersArray = questions.map(q => ({
        questionId: q.id,
        question: q.q,
        answer: answers[q.id] || ''
      }));

      const payload = {
        name: user.name,
        phone: user.phone,
        school: user.school,
        class: user.className,
        language: user.language,
        answers: answersArray,
        completionTime: Math.floor(timeSpent / 60) // in minutes
      };

      await saveUser(payload);
      sessionStorage.removeItem('userSignup');
      navigate('/thankyou');
    } catch (err) {
      console.error(err);
      setShowConfirmDialog(false);
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return (getAnsweredCount() / questions.length) * 100;
  };

  const getQuestionStatus = (index) => {
    const question = questions[index];
    return answers[question?.id] ? 'completed' : 'pending';
  };

  if (!user || questions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const answeredCount = getAnsweredCount();
  const allAnswered = answeredCount === questions.length;

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 2
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Grid container alignItems="center" spacing={2}>
              <Grid item>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 56,
                    height: 56,
                  }}
                >
                  <Quiz sx={{ fontSize: 28 }} />
                </Avatar>
              </Grid>
              
              <Grid item xs>
                <Typography variant="h5" gutterBottom>
                  📚 Quiz in {user.language}
                </Typography>
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                  <Chip
                    icon={<Person />}
                    label={user.name}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                  {user.school && (
                    <Chip
                      icon={<School />}
                      label={user.school}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  <Chip
                    icon={<Timer />}
                    label={formatTime(timeSpent)}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Grid>

              <Grid item>
                <Tooltip title="Go back to signup">
                  <IconButton onClick={() => navigate('/')}>
                    <Home />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Paper>

          {/* Progress Section */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Progress: {answeredCount} / {questions.length} Questions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(getProgressPercentage())}% Complete
              </Typography>
            </Box>
            
            <LinearProgress
              variant="determinate"
              value={getProgressPercentage()}
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />

            {/* Question Navigation Stepper */}
            <Box sx={{ mt: 2, overflowX: 'auto' }}>
              <Stepper nonLinear activeStep={currentQuestion} sx={{ minWidth: 'max-content' }}>
                {questions.map((q, index) => (
                  <Step key={q.id}>
                    <StepButton
                      onClick={() => goToQuestion(index)}
                      completed={getQuestionStatus(index) === 'completed'}
                      sx={{
                        '& .MuiStepLabel-root': {
                          cursor: 'pointer',
                        },
                      }}
                    >
                      <Typography variant="caption">Q{q.id}</Typography>
                    </StepButton>
                  </Step>
                ))}
              </Stepper>
            </Box>
          </Paper>

          {/* Current Question */}
          <Fade in={true} key={currentQuestion}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Typography variant="h6" color="text.secondary">
                    Question {currentQuestion + 1} of {questions.length}
                  </Typography>
                  {answers[currentQ.id] && (
                    <Chip
                      icon={<CheckCircle />}
                      label="Answered"
                      color="success"
                      size="small"
                    />
                  )}
                </Box>

                <Typography variant="h5" gutterBottom sx={{ mb: 4, lineHeight: 1.4 }}>
                  {currentQ.q}
                </Typography>

                <RadioGroup
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleSelect(currentQ.id, e.target.value)}
                >
                  {currentQ.options.map((option, index) => (
                    <Paper
                      key={index}
                      elevation={answers[currentQ.id] === option ? 3 : 0}
                      sx={{
                        p: 2,
                        mb: 2,
                        border: answers[currentQ.id] === option ? 2 : 1,
                        borderColor: answers[currentQ.id] === option ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'translateY(-1px)',
                        },
                      }}
                      onClick={() => handleSelect(currentQ.id, option)}
                    >
                      <FormControlLabel
                        value={option}
                        control={
                          <Radio
                            sx={{ mr: 2 }}
                            icon={<RadioButtonUnchecked />}
                            checkedIcon={<CheckCircle />}
                          />
                        }
                        label={
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {option}
                          </Typography>
                        }
                        sx={{ margin: 0, width: '100%' }}
                      />
                    </Paper>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </Fade>

          {/* Navigation Controls */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Button
                  variant="outlined"
                  startIcon={<NavigateBefore />}
                  onClick={prevQuestion}
                  disabled={currentQuestion === 0}
                  size="large"
                >
                  Previous
                </Button>
              </Grid>

              <Grid item xs>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    Question {currentQuestion + 1} of {questions.length}
                  </Typography>
                  {!answers[currentQ.id] && (
                    <Typography variant="caption" color="warning.main">
                      Please select an answer
                    </Typography>
                  )}
                </Box>
              </Grid>

              <Grid item>
                {!isLastQuestion ? (
                  <Button
                    variant="contained"
                    endIcon={<NavigateNext />}
                    onClick={nextQuestion}
                    size="large"
                    disabled={!answers[currentQ.id]}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Send />}
                    onClick={() => setShowConfirmDialog(true)}
                    size="large"
                    sx={{
                      background: allAnswered 
                        ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                        : undefined,
                    }}
                  >
                    {allAnswered ? 'Submit Quiz' : `Submit (${answeredCount}/${questions.length})`}
                  </Button>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Summary Alert */}
          {answeredCount < questions.length && (
            <Alert
              severity="warning"
              icon={<Warning />}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              <AlertTitle>Incomplete Quiz</AlertTitle>
              You have {questions.length - answeredCount} unanswered question(s). 
              You can submit now or continue answering.
            </Alert>
          )}
        </Container>

        {/* Confirmation Dialog */}
        <Dialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Send color="primary" />
              Submit Quiz Confirmation
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Quiz Summary</AlertTitle>
              <Typography variant="body2">
                • Total Questions: <strong>{questions.length}</strong><br/>
                • Answered: <strong>{answeredCount}</strong><br/>
                • Unanswered: <strong>{questions.length - answeredCount}</strong><br/>
                • Time Spent: <strong>{formatTime(timeSpent)}</strong>
              </Typography>
            </Alert>
            
            {answeredCount < questions.length && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  You have <strong>{questions.length - answeredCount}</strong> unanswered questions. 
                  Unanswered questions will be recorded as blank.
                </Typography>
              </Alert>
            )}

            <Typography variant="body1">
              Are you sure you want to submit your quiz? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button
              onClick={() => setShowConfirmDialog(false)}
              variant="outlined"
              disabled={loading}
            >
              Review Answers
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="success"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Send />}
            >
              {loading ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}