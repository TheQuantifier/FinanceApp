// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    /* --------------------------------------------------
       AUTH FIELDS
    -------------------------------------------------- */
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    /* --------------------------------------------------
       PROFILE FIELDS
    -------------------------------------------------- */
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      default: '',
      trim: true,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },

    bio: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

/* --------------------------------------------------
   INDEXES (for faster login & uniqueness)
-------------------------------------------------- */
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });


/* --------------------------------------------------
   PASSWORD HASHING
-------------------------------------------------- */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});


/* --------------------------------------------------
   CHECK PASSWORD
-------------------------------------------------- */
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};


/* --------------------------------------------------
   REMOVE PASSWORD WHEN RETURNING JSON
-------------------------------------------------- */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};


module.exports = mongoose.model('User', userSchema);