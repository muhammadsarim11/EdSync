import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema({
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
  durationInMinutes: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

lectureSchema.index({ moduleId: 1 });

export default mongoose.model('Lecture', lectureSchema);