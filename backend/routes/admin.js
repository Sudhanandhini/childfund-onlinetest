// import express from "express";
// import User from "../models/User.js";

// const router = express.Router();

// // GET /api/admin/users - Get all user submissions
// router.get("/users", async (req, res) => {
//   try {
//     const users = await User.find().sort({ createdAt: -1 });
//     res.json({
//       message: 'Users fetched successfully',
//       count: users.length,
//       users: users
//     });
//   } catch (err) {
//     console.error('Error fetching users:', err);
//     res.status(500).json({ 
//       message: "Error fetching users", 
//       error: err.message 
//     });
//   }
// });

// // GET /api/admin/users/:id - Get specific user
// router.get("/users/:id", async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
//     res.json(user);
//   } catch (err) {
//     console.error('Error fetching user:', err);
//     res.status(500).json({ 
//       message: "Error fetching user", 
//       error: err.message 
//     });
//   }
// });

// // DELETE /api/admin/users/:id - Delete user
// router.delete("/users/:id", async (req, res) => {
//   try {
//     const deletedUser = await User.findByIdAndDelete(req.params.id);
//     if (!deletedUser) {
//       return res.status(404).json({ message: 'User not found' });
//     }
//     res.json({ message: 'User deleted successfully', user: deletedUser });
//   } catch (err) {
//     console.error('Error deleting user:', err);
//     res.status(500).json({ 
//       message: "Error deleting user", 
//       error: err.message 
//     });
//   }
// });

// export default router;


import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET /api/admin/users - Get all users with submission details
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ updatedAt: -1 });
    
    // Enhance users data with submission statistics
    const enhancedUsers = users.map(user => {
      const userObj = user.toObject();
      const submissionCount = user.submissions?.length || (user.answers?.length > 0 ? 1 : 0);
      
      return {
        ...userObj,
        submissionCount,
        totalAttempts: user.totalAttempts || submissionCount,
        latestSubmission: user.lastSubmission || user.submissions?.[user.submissions.length - 1]?.submittedAt || user.createdAt,
        hasMultipleAttempts: submissionCount > 1
      };
    });

    // Calculate statistics
    const stats = {
      totalUsers: users.length,
      totalSubmissions: enhancedUsers.reduce((sum, user) => sum + user.submissionCount, 0),
      usersWithMultipleAttempts: enhancedUsers.filter(user => user.hasMultipleAttempts).length,
      languageBreakdown: enhancedUsers.reduce((acc, user) => {
        acc[user.language] = (acc[user.language] || 0) + 1;
        return acc;
      }, {}),
      recentSubmissions: enhancedUsers.filter(user => {
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return new Date(user.latestSubmission) > dayAgo;
      }).length
    };

    res.json({
      message: 'Users fetched successfully',
      users: enhancedUsers,
      statistics: stats
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ 
      message: "Error fetching users", 
      error: err.message 
    });
  }
});

// GET /api/admin/users/:id - Get specific user with all submissions
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userObj = user.toObject();
    const submissionCount = user.submissions?.length || (user.answers?.length > 0 ? 1 : 0);

    res.json({
      ...userObj,
      submissionCount,
      totalAttempts: user.totalAttempts || submissionCount,
      hasMultipleAttempts: submissionCount > 1
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ 
      message: "Error fetching user", 
      error: err.message 
    });
  }
});

// GET /api/admin/submissions - Get all submissions from all users
router.get("/submissions", async (req, res) => {
  try {
    const users = await User.find().sort({ updatedAt: -1 });
    
    const allSubmissions = [];
    
    users.forEach(user => {
      if (user.submissions && user.submissions.length > 0) {
        // New format with multiple submissions
        user.submissions.forEach((submission, index) => {
          allSubmissions.push({
            _id: `${user._id}_${submission._id || index}`,
            user: {
              _id: user._id,
              name: user.name,
              phone: user.phone,
              school: user.school,
              class: user.class,
              language: user.language
            },
            answers: submission.answers,
            submittedAt: submission.submittedAt,
            sessionId: submission.sessionId,
            score: submission.score,
            completionTime: submission.completionTime,
            submissionNumber: index + 1,
            totalUserSubmissions: user.submissions.length
          });
        });
      } else if (user.answers && user.answers.length > 0) {
        // Legacy format - single submission
        allSubmissions.push({
          _id: `${user._id}_legacy`,
          user: {
            _id: user._id,
            name: user.name,
            phone: user.phone,
            school: user.school,
            class: user.class,
            language: user.language
          },
          answers: user.answers,
          submittedAt: user.createdAt,
          sessionId: 'legacy',
          score: 0,
          completionTime: null,
          submissionNumber: 1,
          totalUserSubmissions: 1,
          isLegacy: true
        });
      }
    });

    // Sort by submission date (newest first)
    allSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json({
      message: 'All submissions fetched successfully',
      submissions: allSubmissions,
      count: allSubmissions.length
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ 
      message: "Error fetching submissions", 
      error: err.message 
    });
  }
});

// GET /api/admin/statistics - Get detailed statistics
router.get("/statistics", async (req, res) => {
  try {
    const users = await User.find();
    
    const stats = {
      overview: {
        totalUsers: users.length,
        totalSubmissions: 0,
        usersWithMultipleAttempts: 0,
        averageAttemptsPerUser: 0
      },
      languages: {},
      timeBasedStats: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0
      },
      submissionPatterns: {
        singleAttempt: 0,
        multipleAttempts: 0,
        maxAttemptsByUser: 0
      }
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    users.forEach(user => {
      const submissionCount = user.submissions?.length || (user.answers?.length > 0 ? 1 : 0);
      stats.overview.totalSubmissions += submissionCount;
      
      // Language statistics
      if (user.language) {
        stats.languages[user.language] = (stats.languages[user.language] || 0) + 1;
      }
      
      // Multiple attempts tracking
      if (submissionCount > 1) {
        stats.overview.usersWithMultipleAttempts++;
        stats.submissionPatterns.multipleAttempts++;
      } else if (submissionCount === 1) {
        stats.submissionPatterns.singleAttempt++;
      }
      
      // Max attempts tracking
      stats.submissionPatterns.maxAttemptsByUser = Math.max(
        stats.submissionPatterns.maxAttemptsByUser, 
        submissionCount
      );
      
      // Time-based statistics
      const userLatestSubmission = user.lastSubmission || user.updatedAt || user.createdAt;
      if (userLatestSubmission >= today) {
        stats.timeBasedStats.today++;
      }
      if (userLatestSubmission >= weekAgo) {
        stats.timeBasedStats.thisWeek++;
      }
      if (userLatestSubmission >= monthAgo) {
        stats.timeBasedStats.thisMonth++;
      }
    });

    // Calculate average
    stats.overview.averageAttemptsPerUser = users.length > 0 
      ? (stats.overview.totalSubmissions / users.length).toFixed(2)
      : 0;

    res.json({
      message: 'Statistics fetched successfully',
      statistics: stats
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ 
      message: "Error fetching statistics", 
      error: err.message 
    });
  }
});

// DELETE /api/admin/users/:id - Delete user and all submissions
router.delete("/users/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const submissionCount = deletedUser.submissions?.length || (deletedUser.answers?.length > 0 ? 1 : 0);
    
    res.json({ 
      message: `User and ${submissionCount} submission(s) deleted successfully`, 
      user: {
        name: deletedUser.name,
        phone: deletedUser.phone,
        submissionsDeleted: submissionCount
      }
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ 
      message: "Error deleting user", 
      error: err.message 
    });
  }
});

// DELETE /api/admin/users/:userId/submissions/:submissionIndex - Delete specific submission
router.delete("/users/:userId/submissions/:submissionIndex", async (req, res) => {
  try {
    const { userId, submissionIndex } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const index = parseInt(submissionIndex);
    if (!user.submissions || index < 0 || index >= user.submissions.length) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    
    // Remove the specific submission
    const deletedSubmission = user.submissions[index];
    user.submissions.splice(index, 1);
    
    // Update user stats
    user.totalAttempts = user.submissions.length;
    user.lastSubmission = user.submissions.length > 0 
      ? user.submissions[user.submissions.length - 1].submittedAt 
      : user.createdAt;
    
    await user.save();
    
    res.json({ 
      message: 'Submission deleted successfully',
      deletedSubmission: {
        submissionIndex: index + 1,
        submittedAt: deletedSubmission.submittedAt,
        answersCount: deletedSubmission.answers?.length || 0
      },
      remainingSubmissions: user.submissions.length
    });
  } catch (err) {
    console.error('Error deleting submission:', err);
    res.status(500).json({ 
      message: "Error deleting submission", 
      error: err.message 
    });
  }
});

// POST /api/admin/export - Export data in various formats
router.post("/export", async (req, res) => {
  try {
    const { format = 'csv', type = 'users', filters = {} } = req.body;
    
    let query = {};
    
    // Apply filters
    if (filters.language && filters.language !== 'all') {
      query.language = filters.language;
    }
    if (filters.dateFrom) {
      query.createdAt = { $gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
    }
    
    const users = await User.find(query).sort({ updatedAt: -1 });
    
    let exportData = [];
    
    if (type === 'submissions') {
      // Export all submissions
      users.forEach(user => {
        if (user.submissions && user.submissions.length > 0) {
          user.submissions.forEach((submission, index) => {
            exportData.push({
              userName: user.name,
              userPhone: user.phone,
              userSchool: user.school || '',
              userClass: user.class || '',
              userLanguage: user.language,
              submissionNumber: index + 1,
              totalSubmissions: user.submissions.length,
              answersCount: submission.answers?.length || 0,
              submittedAt: submission.submittedAt,
              sessionId: submission.sessionId || '',
              score: submission.score || 0,
              completionTime: submission.completionTime || ''
            });
          });
        }
      });
    } else {
      // Export users summary
      exportData = users.map(user => ({
        name: user.name,
        phone: user.phone,
        school: user.school || '',
        class: user.class || '',
        language: user.language,
        totalAttempts: user.totalAttempts || user.submissions?.length || 1,
        latestSubmission: user.lastSubmission || user.updatedAt,
        firstSubmission: user.createdAt,
        hasMultipleAttempts: (user.submissions?.length || 0) > 1
      }));
    }
    
    res.json({
      message: 'Export data prepared successfully',
      data: exportData,
      count: exportData.length,
      type,
      format,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error preparing export:', err);
    res.status(500).json({ 
      message: "Error preparing export", 
      error: err.message 
    });
  }
});

// GET /api/admin/users/search/:searchTerm - Search users
router.get("/users/search/:searchTerm", async (req, res) => {
  try {
    const { searchTerm } = req.params;
    
    const query = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } },
        { school: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    const users = await User.find(query).sort({ updatedAt: -1 }).limit(50);
    
    const enhancedUsers = users.map(user => {
      const submissionCount = user.submissions?.length || (user.answers?.length > 0 ? 1 : 0);
      return {
        ...user.toObject(),
        submissionCount,
        hasMultipleAttempts: submissionCount > 1
      };
    });
    
    res.json({
      message: `Found ${users.length} users matching "${searchTerm}"`,
      users: enhancedUsers,
      searchTerm
    });
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ 
      message: "Error searching users", 
      error: err.message 
    });
  }
});

export default router;