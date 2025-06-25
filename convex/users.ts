import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const loginUser = mutation({
  args: {
    name: v.string(),
    trainingNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("typingUsers")
      .filter((q) => q.eq(q.field("name"), args.name))
      .filter((q) => q.eq(q.field("trainingNumber"), args.trainingNumber))
      .first();
    
    if (existingUser) {
      return existingUser._id;
    }
    
    // Create new user if doesn't exist
    return await ctx.db.insert("typingUsers", {
      name: args.name,
      trainingNumber: args.trainingNumber,
    });
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    trainingNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("typingUsers")
      .filter((q) => q.eq(q.field("name"), args.name))
      .filter((q) => q.eq(q.field("trainingNumber"), args.trainingNumber))
      .first();
    
    if (existingUser) {
      return existingUser._id;
    }
    
    return await ctx.db.insert("typingUsers", {
      name: args.name,
      trainingNumber: args.trainingNumber,
    });
  },
});

export const getUser = query({
  args: { userId: v.id("typingUsers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
