import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  typingUsers: defineTable({
    name: v.string(),
    trainingNumber: v.string(),
  }),
  
  sessions: defineTable({
    code: v.string(),
    creatorId: v.id("typingUsers"),
    isActive: v.boolean(),
    challengeText: v.optional(v.string()),
    challengeStarted: v.boolean(),
    startTime: v.optional(v.number()),
    // إعدادات الجلسة الجديدة
    wordCount: v.optional(v.number()), // عدد الكلمات
    allowEditing: v.optional(v.boolean()), // السماح بالتعديل
    maxEdits: v.optional(v.number()), // عدد مرات التعديل المسموحة
  }).index("by_code", ["code"]),
  
  participants: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("typingUsers"),
    score: v.number(),
    currentPosition: v.number(),
    isFinished: v.boolean(),
    wpm: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    editsUsed: v.optional(v.number()), // عدد مرات التعديل المستخدمة
  }).index("by_session", ["sessionId"])
   .index("by_session_and_user", ["sessionId", "userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
