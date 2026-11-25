import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cohort',
      required: true
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    orderIndex: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['Live', 'Recorded'],
      required: true
    },
    videoUrl: {
      type: String,
      default: ''
    },
    resourceUrl: {
      type: String,
      default: ''
    },
    durationInMinutes: {
      type: Number,
      default: 0
    },
    // Lifecycle of an uploaded class recording (Cloudinary):
    // none -> pending (signature issued) -> ready (webhook received).
    recordingStatus: {
      type: String,
      enum: ['none', 'pending', 'ready'],
      default: 'none'
    },
    recordingUrl: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

lectureSchema.index({ moduleId: 1 });
lectureSchema.index({ cohortId: 1 });
lectureSchema.index({ organizationId: 1 });

export default mongoose.model('Lecture', lectureSchema);
