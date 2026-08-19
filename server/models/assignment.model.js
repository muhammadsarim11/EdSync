import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },

    attachmentUrl: {
      type: String,
      default: ''
    },
    deadline: {
      type: Date,
      required: true
    },
    totalMarks: {
      type: Number,
      default: 100
    }
  },
  { timestamps: true }
);

assignmentSchema.index({ lectureId: 1 });

export default mongoose.model('Assignment', assignmentSchema);
