import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSessionLeaderboard = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    const participantsWithUsers = await Promise.all(
      participants.map(async (participant) => {
        const user = await ctx.db.get(participant.userId);
        return {
          ...participant,
          user,
        };
      })
    );
    
    // Sort by: 1. Finished status, 2. Score (desc), 3. WPM (desc), 4. Accuracy (desc)
    const sortedParticipants = participantsWithUsers.sort((a, b) => {
      // Finished participants come first
      if (a.isFinished !== b.isFinished) {
        return b.isFinished ? 1 : -1;
      }
      
      // Then by score (higher is better)
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      
      // Then by WPM (higher is better)
      const aWpm = a.wpm || 0;
      const bWpm = b.wpm || 0;
      if (aWpm !== bWpm) {
        return bWpm - aWpm;
      }
      
      // Finally by accuracy (higher is better)
      const aAccuracy = a.accuracy || 0;
      const bAccuracy = b.accuracy || 0;
      return bAccuracy - aAccuracy;
    });
    
    // Add ranking
    return sortedParticipants.map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));
  },
});

export const getGlobalLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    // Get all finished participants from all sessions
    const allParticipants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("isFinished"), true))
      .collect();
    
    const participantsWithUsers = await Promise.all(
      allParticipants.map(async (participant) => {
        const user = await ctx.db.get(participant.userId);
        const session = await ctx.db.get(participant.sessionId);
        return {
          ...participant,
          user,
          session,
        };
      })
    );
    
    // Group by user and get their best performance
    const userBestPerformances = new Map();
    
    participantsWithUsers.forEach((participant) => {
      const userId = participant.userId;
      const existing = userBestPerformances.get(userId);
      
      if (!existing || participant.score > existing.score) {
        userBestPerformances.set(userId, participant);
      }
    });
    
    // Convert to array and sort
    const leaderboard = Array.from(userBestPerformances.values()).sort((a, b) => {
      // Sort by score (desc), then WPM (desc), then accuracy (desc)
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      
      const aWpm = a.wpm || 0;
      const bWpm = b.wpm || 0;
      if (aWpm !== bWpm) {
        return bWpm - aWpm;
      }
      
      const aAccuracy = a.accuracy || 0;
      const bAccuracy = b.accuracy || 0;
      return bAccuracy - aAccuracy;
    });
    
    // Add ranking and limit to top 50
    return leaderboard.slice(0, 50).map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));
  },
});
