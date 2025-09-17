import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [viewMode, setViewMode] = useState('users');
  const [exportingUserId, setExportingUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/admin/users');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched users:', data);
      
      const usersData = data.users || data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(`Failed to fetch users: ${err.message}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get all submissions from all users for submissions view
  const getAllSubmissions = () => {
    const submissions = [];
    users.forEach(user => {
      if (user.submissions && user.submissions.length > 0) {
        user.submissions.forEach((submission, index) => {
          submissions.push({
            ...submission,
            user: user,
            submissionNumber: index + 1,
            totalUserSubmissions: user.submissions.length
          });
        });
      } else if (user.answers && user.answers.length > 0) {
        submissions.push({
          answers: user.answers,
          submittedAt: user.createdAt,
          user: user,
          submissionNumber: 1,
          totalUserSubmissions: 1,
          isLegacy: true
        });
      }
    });
    return submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  };

  // Filter function
  const getFilteredData = () => {
    if (viewMode === 'submissions') {
      const allSubmissions = getAllSubmissions();
      return allSubmissions.filter(submission => {
        const user = submission.user;
        const matchesSearch = !searchTerm || 
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phone?.includes(searchTerm) ||
          user.school?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesLanguage = selectedLanguage === 'all' || user.language === selectedLanguage;
        
        return matchesSearch && matchesLanguage;
      });
    } else {
      return users.filter(user => {
        const matchesSearch = !searchTerm || 
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phone?.includes(searchTerm) ||
          user.school?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesLanguage = selectedLanguage === 'all' || user.language === selectedLanguage;
        
        return matchesSearch && matchesLanguage;
      });
    }
  };

  // Export individual user data with all submissions
  const exportUserData = async (user) => {
    setExportingUserId(user._id);
    
    try {
      // Prepare user data with all submissions
      const userData = {
        userInfo: {
          name: user.name,
          phone: user.phone,
          school: user.school || 'N/A',
          class: user.class || 'N/A',
          language: user.language,
          totalAttempts: user.totalAttempts || user.submissions?.length || 1,
          firstSubmission: new Date(user.createdAt).toLocaleString(),
          latestSubmission: new Date(user.lastSubmission || user.updatedAt).toLocaleString()
        },
        submissions: []
      };

      // Add all submissions
      if (user.submissions && user.submissions.length > 0) {
        user.submissions.forEach((submission, index) => {
          const submissionData = {
            attemptNumber: index + 1,
            submittedAt: new Date(submission.submittedAt).toLocaleString(),
            sessionId: submission.sessionId || 'N/A',
            totalAnswers: submission.answers?.length || 0,
            completionTime: submission.completionTime ? `${submission.completionTime} minutes` : 'N/A',
            score: submission.score || 0,
            answers: []
          };

          // Add individual answers
          if (submission.answers && submission.answers.length > 0) {
            submission.answers.forEach(answer => {
              submissionData.answers.push({
                questionId: answer.questionId,
                question: answer.question,
                answer: answer.answer
              });
            });
          }

          userData.submissions.push(submissionData);
        });
      } else if (user.answers && user.answers.length > 0) {
        // Handle legacy single submission
        const submissionData = {
          attemptNumber: 1,
          submittedAt: new Date(user.createdAt).toLocaleString(),
          sessionId: 'Legacy',
          totalAnswers: user.answers.length,
          completionTime: 'N/A',
          score: 0,
          answers: []
        };

        user.answers.forEach(answer => {
          submissionData.answers.push({
            questionId: answer.questionId,
            question: answer.question,
            answer: answer.answer
          });
        });

        userData.submissions.push(submissionData);
      }

      // Create CSV content
      const csvContent = createUserCSV(userData);
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `user_${user.name.replace(/\s+/g, '_')}_${user.phone}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

    } catch (error) {
      console.error('Error exporting user data:', error);
      alert('Error exporting user data. Please try again.');
    } finally {
      setExportingUserId(null);
    }
  };

  // Create CSV content for individual user
  const createUserCSV = (userData) => {
    let csv = '';
    
    // User Information Section
    csv += 'USER INFORMATION\n';
    csv += 'Field,Value\n';
    csv += `Name,"${userData.userInfo.name}"\n`;
    csv += `Phone,"${userData.userInfo.phone}"\n`;
    csv += `School,"${userData.userInfo.school}"\n`;
    csv += `Class,"${userData.userInfo.class}"\n`;
    csv += `Language,"${userData.userInfo.language}"\n`;
    csv += `Total Attempts,"${userData.userInfo.totalAttempts}"\n`;
    csv += `First Submission,"${userData.userInfo.firstSubmission}"\n`;
    csv += `Latest Submission,"${userData.userInfo.latestSubmission}"\n`;
    csv += '\n';

    // Submissions Summary
    csv += 'SUBMISSIONS SUMMARY\n';
    csv += 'Attempt #,Submitted At,Session ID,Total Answers,Completion Time,Score\n';
    userData.submissions.forEach(submission => {
      csv += `${submission.attemptNumber},"${submission.submittedAt}","${submission.sessionId}",${submission.totalAnswers},"${submission.completionTime}",${submission.score}\n`;
    });
    csv += '\n';

    // Detailed Answers for Each Submission
    userData.submissions.forEach((submission, submissionIndex) => {
      csv += `ATTEMPT #${submission.attemptNumber} - DETAILED ANSWERS\n`;
      csv += `Submitted At: ${submission.submittedAt}\n`;
      csv += `Session ID: ${submission.sessionId}\n`;
      csv += 'Question ID,Question,Answer\n';
      
      submission.answers.forEach(answer => {
        csv += `${answer.questionId},"${answer.question.replace(/"/g, '""')}","${answer.answer}"\n`;
      });
      csv += '\n';
    });

    return csv;
  };

  const filteredData = getFilteredData();
  const totalSubmissions = getAllSubmissions().length;
  const usersWithMultipleAttempts = users.filter(user => 
    (user.submissions?.length || 0) > 1 || user.totalAttempts > 1
  ).length;

  // Export all data (existing function)
  const exportAllData = () => {
    if (viewMode === 'submissions') {
      const headers = ['User Name', 'Phone', 'School', 'Class', 'Language', 'Submission #', 'Answers Count', 'Submitted At', 'Session ID'];
      const csvContent = [
        headers.join(','),
        ...filteredData.map(submission => [
          `"${submission.user.name || ''}"`,
          `"${submission.user.phone || ''}"`,
          `"${submission.user.school || ''}"`,
          `"${submission.user.class || ''}"`,
          `"${submission.user.language || ''}"`,
          `${submission.submissionNumber}/${submission.totalUserSubmissions}`,
          submission.answers?.length || 0,
          `"${new Date(submission.submittedAt).toLocaleString()}"`,
          `"${submission.sessionId || 'N/A'}"`
        ].join(','))
      ].join('\n');

      downloadCSV(csvContent, 'quiz_all_submissions');
    } else {
      const headers = ['Name', 'Phone', 'School', 'Class', 'Language', 'Total Attempts', 'Latest Submission', 'First Submission'];
      const csvContent = [
        headers.join(','),
        ...filteredData.map(user => [
          `"${user.name || ''}"`,
          `"${user.phone || ''}"`,
          `"${user.school || ''}"`,
          `"${user.class || ''}"`,
          `"${user.language || ''}"`,
          user.totalAttempts || user.submissions?.length || 1,
          `"${new Date(user.lastSubmission || user.updatedAt || user.createdAt).toLocaleString()}"`,
          `"${new Date(user.createdAt).toLocaleString()}"`
        ].join(','))
      ].join('\n');

      downloadCSV(csvContent, 'quiz_users_summary');
    }
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <h2>Loading Admin Dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Admin Dashboard</h1>
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <h3>{users.length}</h3>
            <p>Total Users</p>
          </div>
          <div style={styles.statCard}>
            <h3>{totalSubmissions}</h3>
            <p>Total Submissions</p>
          </div>
          <div style={styles.statCard}>
            <h3>{usersWithMultipleAttempts}</h3>
            <p>Repeat Users</p>
          </div>
          <div style={styles.statCard}>
            <h3>{new Set(users.map(u => u.language)).size}</h3>
            <p>Languages</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
          <button onClick={fetchUsers} style={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* View Mode Toggle */}
      <div style={styles.viewToggle}>
        <button
          onClick={() => setViewMode('users')}
          style={{
            ...styles.toggleButton,
            backgroundColor: viewMode === 'users' ? '#3498db' : '#bdc3c7'
          }}
        >
          👥 Users View ({users.length})
        </button>
        <button
          onClick={() => setViewMode('submissions')}
          style={{
            ...styles.toggleButton,
            backgroundColor: viewMode === 'submissions' ? '#3498db' : '#bdc3c7'
          }}
        >
          📝 All Submissions ({totalSubmissions})
        </button>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Search by name, phone, or school..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={styles.languageFilter}
          >
            <option value="all">All Languages</option>
            <option value="tamil">Tamil</option>
            <option value="english">English</option>
            <option value="telugu">Telugu</option>
            <option value="kannada">Kannada</option>
            <option value="marathi">Marathi</option>
            <option value="hindi">Hindi</option>
          </select>
        </div>

        <div style={styles.actionButtons}>
          <button onClick={fetchUsers} style={styles.refreshButton}>
            🔄 Refresh
          </button>
          <button onClick={exportAllData} style={styles.exportButton}>
            📥 Export All {viewMode === 'users' ? 'Users' : 'Submissions'}
          </button>
        </div>
      </div>

      {/* Results */}
      {filteredData.length === 0 ? (
        <div style={styles.noData}>
          <h3>No {viewMode === 'users' ? 'Users' : 'Submissions'} Found</h3>
          <p>
            {users.length === 0 
              ? 'Quiz submissions will appear here once users start submitting.'
              : 'Try adjusting your search or language filter.'
            }
          </p>
          <button onClick={fetchUsers} style={styles.refreshButton}>
            🔄 Check Again
          </button>
        </div>
      ) : (
        <div style={styles.resultsInfo}>
          <p>
            Showing {filteredData.length} {viewMode === 'users' ? 'users' : 'submissions'}
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedLanguage !== 'all' && ` in ${selectedLanguage}`}
          </p>
        </div>
      )}

      {/* Table */}
      {filteredData.length > 0 && (
        <div style={styles.tableContainer}>
          {viewMode === 'users' ? (
            <UsersTable 
              users={filteredData} 
              onExportUser={exportUserData}
              exportingUserId={exportingUserId}
            />
          ) : (
            <SubmissionsTable submissions={filteredData} />
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced Users Table Component with Individual Export
const UsersTable = ({ users, onExportUser, exportingUserId }) => (
  <table style={styles.table}>
    <thead>
      <tr style={styles.tableHeader}>
        <th style={styles.th}>Name</th>
        <th style={styles.th}>Phone</th>
        <th style={styles.th}>School</th>
        <th style={styles.th}>Class</th>
        <th style={styles.th}>Language</th>
        <th style={styles.th}>Attempts</th>
        <th style={styles.th}>Latest Submission</th>
        <th style={styles.th}>Actions</th>
      </tr>
    </thead>
    <tbody>
      {users.map((user, index) => (
        <UserRow 
          key={user._id || index} 
          user={user} 
          index={index}
          onExportUser={onExportUser}
          isExporting={exportingUserId === user._id}
        />
      ))}
    </tbody>
  </table>
);

// Submissions Table Component (unchanged)
const SubmissionsTable = ({ submissions }) => (
  <table style={styles.table}>
    <thead>
      <tr style={styles.tableHeader}>
        <th style={styles.th}>User</th>
        <th style={styles.th}>Phone</th>
        <th style={styles.th}>Language</th>
        <th style={styles.th}>Attempt #</th>
        <th style={styles.th}>Answers</th>
        <th style={styles.th}>Submitted At</th>
        <th style={styles.th}>Actions</th>
      </tr>
    </thead>
    <tbody>
      {submissions.map((submission, index) => (
        <SubmissionRow key={`${submission.user._id}-${submission.submittedAt}-${index}`} submission={submission} index={index} />
      ))}
    </tbody>
  </table>
);

// Enhanced User Row Component with Individual Export Button
const UserRow = ({ user, index, onExportUser, isExporting }) => {
  const [showSubmissions, setShowSubmissions] = useState(false);
  const totalAttempts = user.totalAttempts || user.submissions?.length || 1;
  
  return (
    <>
      <tr style={{ 
        ...styles.tableRow,
        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
      }}>
        <td style={styles.td}>
          <strong>{user.name || 'N/A'}</strong>
        </td>
        <td style={styles.td}>{user.phone || 'N/A'}</td>
        <td style={styles.td}>{user.school || '-'}</td>
        <td style={styles.td}>{user.class || '-'}</td>
        <td style={styles.td}>
          <span style={{
            ...styles.languageBadge,
            backgroundColor: getLanguageColor(user.language),
          }}>
            {user.language || 'N/A'}
          </span>
        </td>
        <td style={styles.td}>
          <span style={{
            ...styles.attemptsBadge,
            backgroundColor: totalAttempts > 1 ? '#e74c3c' : '#27ae60'
          }}>
            {totalAttempts} attempt{totalAttempts > 1 ? 's' : ''}
          </span>
        </td>
        <td style={styles.td}>
          <div style={styles.dateContainer}>
            <div>{new Date(user.lastSubmission || user.updatedAt || user.createdAt).toLocaleDateString()}</div>
            <small style={styles.timeText}>
              {new Date(user.lastSubmission || user.updatedAt || user.createdAt).toLocaleTimeString()}
            </small>
          </div>
        </td>
        <td style={styles.td}>
          <div style={styles.actionButtonsContainer}>
            <button
              onClick={() => setShowSubmissions(!showSubmissions)}
              style={{
                ...styles.actionButton,
                backgroundColor: showSubmissions ? '#e74c3c' : '#3498db',
                marginBottom: '5px'
              }}
            >
              {showSubmissions ? '🔼 Hide' : '🔽 View'} Details
            </button>
            
            <button
              onClick={() => onExportUser(user)}
              disabled={isExporting}
              style={{
                ...styles.actionButton,
                backgroundColor: isExporting ? '#bdc3c7' : '#28a745',
                cursor: isExporting ? 'not-allowed' : 'pointer'
              }}
            >
              {isExporting ? '⏳ Exporting...' : '📤 Export User'}
            </button>
          </div>
        </td>
      </tr>
      
      {showSubmissions && (
        <tr>
          <td colSpan="8" style={styles.submissionsContainer}>
            <UserSubmissionsDetail user={user} />
          </td>
        </tr>
      )}
    </>
  );
};

// Submission Row Component (unchanged)
const SubmissionRow = ({ submission, index }) => {
  const [showAnswers, setShowAnswers] = useState(false);
  
  return (
    <>
      <tr style={{ 
        ...styles.tableRow,
        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
      }}>
        <td style={styles.td}>
          <strong>{submission.user.name}</strong><br />
          <small>{submission.user.school || 'No school'}</small>
        </td>
        <td style={styles.td}>{submission.user.phone}</td>
        <td style={styles.td}>
          <span style={{
            ...styles.languageBadge,
            backgroundColor: getLanguageColor(submission.user.language),
          }}>
            {submission.user.language}
          </span>
        </td>
        <td style={styles.td}>
          <span style={styles.attemptNumber}>
            #{submission.submissionNumber}
            {submission.totalUserSubmissions > 1 && (
              <><br /><small>of {submission.totalUserSubmissions}</small></>
            )}
          </span>
        </td>
        <td style={styles.td}>
          <span style={styles.answersBadge}>
            {submission.answers?.length || 0} answers
          </span>
        </td>
        <td style={styles.td}>
          <div style={styles.dateContainer}>
            <div>{new Date(submission.submittedAt).toLocaleDateString()}</div>
            <small style={styles.timeText}>
              {new Date(submission.submittedAt).toLocaleTimeString()}
            </small>
          </div>
        </td>
        <td style={styles.td}>
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            style={{
              ...styles.actionButton,
              backgroundColor: showAnswers ? '#e74c3c' : '#27ae60'
            }}
          >
            {showAnswers ? '👁️‍🗨️ Hide' : '👁️ View'}
          </button>
        </td>
      </tr>
      
      {showAnswers && (
        <tr>
          <td colSpan="7" style={styles.answersContainer}>
            <AnswersDetail answers={submission.answers} sessionId={submission.sessionId} />
          </td>
        </tr>
      )}
    </>
  );
};

// User Submissions Detail Component (unchanged)
const UserSubmissionsDetail = ({ user }) => (
  <div style={styles.userSubmissionsDetail}>
    <h4>📋 All Submissions for {user.name}</h4>
    {user.submissions && user.submissions.length > 0 ? (
      <div style={styles.submissionsList}>
        {user.submissions.map((submission, index) => (
          <div key={index} style={styles.submissionItem}>
            <div style={styles.submissionHeader}>
              <strong>Attempt #{index + 1}</strong>
              <span style={styles.submissionDate}>
                {new Date(submission.submittedAt).toLocaleString()}
              </span>
            </div>
            <div style={styles.submissionStats}>
              <span>✅ {submission.answers?.length || 0} answers</span>
              {submission.sessionId && <span>🆔 {submission.sessionId}</span>}
              {submission.completionTime && <span>⏱️ {submission.completionTime}min</span>}
            </div>
            <AnswersDetail answers={submission.answers} compact={true} />
          </div>
        ))}
      </div>
    ) : (
      <div style={styles.legacyData}>
        <p>📋 Legacy submission data:</p>
        <AnswersDetail answers={user.answers} compact={true} />
      </div>
    )}
  </div>
);

// Answers Detail Component (unchanged)
const AnswersDetail = ({ answers, sessionId, compact = false }) => (
  <div style={compact ? styles.answersCompact : styles.answersContent}>
    {!compact && sessionId && (
      <p style={styles.sessionInfo}>🆔 Session ID: {sessionId}</p>
    )}
    {answers && answers.length > 0 ? (
      <div style={styles.answersList}>
        {answers.map((answer, idx) => (
          <div key={idx} style={compact ? styles.answerItemCompact : styles.answerItem}>
            <div style={styles.questionText}>
              <strong>Q{answer.questionId}: </strong>
              {answer.question}
            </div>
            <div style={styles.answerText}>
              <strong>Answer: </strong>
              <span style={styles.userAnswer}>{answer.answer}</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p style={styles.noAnswers}>No answers submitted</p>
    )}
  </div>
);

// Helper Functions
const getLanguageColor = (language) => {
  const colors = {
    tamil: '#FF6B6B',
    english: '#4ECDC4',
    telugu: '#45B7D1',
    kannada: '#96CEB4',
    marathi: '#FECA57',
    hindi: '#FF9FF3'
  };
  return colors[language?.toLowerCase()] || '#95A5A6';
};

// Enhanced Styles
const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f7fa',
    minHeight: '100vh'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f5f7fa'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  header: {
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  title: {
    color: '#2c3e50',
    margin: '0 0 20px 0',
    fontSize: '2.5em',
    textAlign: 'center'
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: '20px'
  },
  statCard: {
    textAlign: 'center',
    padding: '15px',
    backgroundColor: '#ecf0f1',
    borderRadius: '8px',
    minWidth: '120px',
    flex: 1
  },
  viewToggle: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    justifyContent: 'center'
  },
  toggleButton: {
    padding: '12px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  errorBox: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  retryButton: {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  searchContainer: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  searchInput: {
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    width: '300px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  languageFilter: {
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px'
  },
  refreshButton: {
    padding: '12px 24px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  exportButton: {
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  resultsInfo: {
    backgroundColor: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    marginBottom: '10px',
    color: '#666',
    fontSize: '14px'
  },
  noData: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#34495e'
  },
  th: {
    padding: '15px 12px',
    textAlign: 'left',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #ecf0f1',
    transition: 'background-color 0.3s'
  },
  td: {
    padding: '15px 12px',
    textAlign: 'left',
    verticalAlign: 'top',
    fontSize: '14px'
  },
  languageBadge: {
    padding: '4px 12px',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  attemptsBadge: {
    padding: '4px 12px',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  answersBadge: {
    padding: '4px 12px',
    backgroundColor: '#27ae60',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  attemptNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  dateContainer: {
    fontSize: '13px'
  },
  timeText: {
    color: '#7f8c8d',
    fontSize: '11px'
  },
  actionButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'center'
  },
  actionButtonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    minWidth: '120px'
  },
  submissionsContainer: {
    padding: '0',
    backgroundColor: '#f8f9fa'
  },
  userSubmissionsDetail: {
    padding: '20px',
    backgroundColor: '#f8f9fa'
  },
  submissionsList: {
    display: 'grid',
    gap: '15px',
    marginTop: '15px'
  },
  submissionItem: {
    padding: '15px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    borderLeft: '4px solid #3498db'
  },
  submissionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee'
  },
  submissionDate: {
    color: '#666',
    fontSize: '13px'
  },
  submissionStats: {
    display: 'flex',
    gap: '15px',
    marginBottom: '10px',
    fontSize: '12px',
    color: '#666'
  },
  legacyData: {
    padding: '15px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    marginTop: '10px'
  },
  answersContainer: {
    padding: '0',
    backgroundColor: '#f8f9fa'
  },
  answersContent: {
    padding: '20px',
    backgroundColor: '#f8f9fa'
  },
  answersCompact: {
    padding: '10px 0'
  },
  sessionInfo: {
    color: '#666',
    fontSize: '12px',
    marginBottom: '10px',
    fontFamily: 'monospace'
  },
  answersList: {
    display: 'grid',
    gap: '10px'
  },
  answerItem: {
    padding: '12px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '6px',
    borderLeft: '3px solid #27ae60'
  },
  answerItemCompact: {
    padding: '8px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '8px',
    fontSize: '13px'
  },
  questionText: {
    marginBottom: '6px',
    color: '#2c3e50',
    fontSize: '13px'
  },
  answerText: {
    fontSize: '13px'
  },
  userAnswer: {
    color: '#27ae60',
    fontWeight: 'bold'
  },
  noAnswers: {
    color: '#7f8c8d',
    fontStyle: 'italic',
    margin: 0,
    textAlign: 'center',
    padding: '20px'
  }
};

export default AdminDashboard;