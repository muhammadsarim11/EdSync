import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    logoUrl: {
      type: String,
      default: ''
    },
    themeColor: {
      type: String,
      default: '#000000'
    }
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
