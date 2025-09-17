// import mongoose from 'mongoose';

// const AnswerSchema = new mongoose.Schema({
//   questionId: Number,
//   question: String,
//   answer: String
// }, { _id: false });

// const UserSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   phone: { type: String, required: true },
//   school: { type: String },
//   class: { type: String },
//   language: { type: String, required: true },
//   answers: { type: [AnswerSchema], default: [] },
//   createdAt: { type: Date, default: Date.now }
// });

// export default mongoose.model('User', UserSchema);


import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  questionId: Number,
  question: String,
  answer: String
}, { _id: false });

const SubmissionSchema = new mongoose.Schema({
  answers: { type: [AnswerSchema], default: [] },
  submittedAt: { type: Date, default: Date.now },
  score: { type: Number, default: 0 }, // Optional: if you want to store scores
  completionTime: { type: Number }, // Optional: time taken in minutes
  sessionId: { type: String } // Optional: to track individual quiz sessions
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  school: { type: String },
  class: { type: String },
  language: { type: String, required: true },
  
  // Store multiple submissions instead of just one set of answers
  submissions: { type: [SubmissionSchema], default: [] },
  
  // Keep track of user stats
  totalAttempts: { type: Number, default: 0 },
  lastSubmission: { type: Date },
  
  // Original fields for backward compatibility
  answers: { type: [AnswerSchema], default: [] }, // Keep for existing data
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
UserSchema.index({ phone: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'submissions.submittedAt': -1 });

export default mongoose.model('User', UserSchema);