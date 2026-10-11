const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    eventType: {
      type: String,
      required: true,
      enum: ['page_view', 'click', 'custom'],
      index: true
    },
    pageUrl: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    pagePath: {
      type: String,
      default: ''
    },
    pageTitle: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },

    // Click coordinates (for click events)
    x: {
      type: Number,
      default: null
    },
    y: {
      type: Number,
      default: null
    },
    clientX: {
      type: Number,
      default: null
    },
    clientY: {
      type: Number,
      default: null
    },
    xPct: {
      type: Number,
      default: null
    },
    yPct: {
      type: Number,
      default: null
    },
    viewportWidth: {
      type: Number,
      default: null
    },
    viewportHeight: {
      type: Number,
      default: null
    },

    // Target element metadata
    elementTag: {
      type: String,
      default: ''
    },
    elementId: {
      type: String,
      default: ''
    },
    elementClass: {
      type: String,
      default: ''
    },
    elementText: {
      type: String,
      default: ''
    },

    // Client metadata
    referrer: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    ip: {
      type: String,
      default: ''
    },
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for querying a session's ordered events
EventSchema.index({ sessionId: 1, timestamp: 1 });

// Compound index for heatmap querying by page and event type
EventSchema.index({ pageUrl: 1, eventType: 1 });

module.exports = mongoose.models.Event || mongoose.model('Event', EventSchema);
