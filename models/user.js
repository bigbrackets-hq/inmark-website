const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    usercode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    faceid: {
      type: String,
      trim: true,
    },
    usetype: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
    },
    organization: {
      type: String,
      trim: true,
    },
    checked: {
      type: Boolean,
      default: false,
    },
    checkedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["listed", "invited", "rsvp'd", "checkin", "no-show", "cancelled"],
      default: null,
    },
    statusAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "testuser" },
);

module.exports = mongoose.model("User", userSchema);
