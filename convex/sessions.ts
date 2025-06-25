import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate random 7-digit code
function generateSessionCode(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

export const createSession = mutation({
  args: {
    creatorId: v.id("typingUsers"),
    wordCount: v.number(),
    allowEditing: v.boolean(),
    maxEdits: v.number(),
  },
  handler: async (ctx, args) => {
    let code = generateSessionCode();
    
    // Ensure code is unique
    while (await ctx.db.query("sessions").withIndex("by_code", (q) => q.eq("code", code)).first()) {
      code = generateSessionCode();
    }
    
    const sessionId = await ctx.db.insert("sessions", {
      code,
      creatorId: args.creatorId,
      isActive: true,
      challengeStarted: false,
      wordCount: args.wordCount,
      allowEditing: args.allowEditing,
      maxEdits: args.maxEdits,
    });
    
    return { sessionId, code };
  },
});

export const joinSession = mutation({
  args: {
    code: v.string(),
    userId: v.id("typingUsers"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    
    if (!session || !session.isActive) {
      throw new Error("Session not found or inactive");
    }
    
    // Check if user is the creator
    if (session.creatorId === args.userId) {
      // Creator joins as observer, not participant
      return session._id;
    }
    
    // Check if user already joined
    const existingParticipant = await ctx.db
      .query("participants")
      .withIndex("by_session_and_user", (q) => 
        q.eq("sessionId", session._id).eq("userId", args.userId)
      )
      .first();
    
    if (existingParticipant) {
      return session._id;
    }
    
    // Add user as participant
    await ctx.db.insert("participants", {
      sessionId: session._id,
      userId: args.userId,
      score: 100,
      currentPosition: 0,
      isFinished: false,
      editsUsed: 0,
    });
    
    return session._id;
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getSessionByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

export const getSessionParticipants = query({
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
    
    return participantsWithUsers;
  },
});

export const startChallenge = mutation({
  args: {
    sessionId: v.id("sessions"),
    challengeText: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      challengeText: args.challengeText,
      challengeStarted: true,
      startTime: Date.now(),
    });
  },
});

export const updateParticipantProgress = mutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("typingUsers"),
    score: v.number(),
    currentPosition: v.number(),
    isFinished: v.boolean(),
    wpm: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    editsUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_session_and_user", (q) => 
        q.eq("sessionId", args.sessionId).eq("userId", args.userId)
      )
      .first();
    
    if (participant) {
      await ctx.db.patch(participant._id, {
        score: args.score,
        currentPosition: args.currentPosition,
        isFinished: args.isFinished,
        wpm: args.wpm,
        accuracy: args.accuracy,
        editsUsed: args.editsUsed,
      });
    }
  },
});

// دالة لتوليد نص بعدد كلمات محدد
export const generateChallengeText = query({
  args: { wordCount: v.number() },
  handler: async (ctx, args) => {
    const SAMPLE_TEXTS = [
      "في عالم التكنولوجيا المتطور، تلعب البرمجة دوراً مهماً في تشكيل مستقبلنا الرقمي. من خلال تعلم لغات البرمجة المختلفة، يمكننا إنشاء تطبيقات وبرامج تساعد في حل المشاكل اليومية وتحسين جودة الحياة. إن إتقان مهارات الكتابة السريعة والدقيقة يعتبر أساساً مهماً لكل مبرمج ومطور، حيث يساعد على زيادة الإنتاجية وتقليل الأخطاء في الكود.",
      "التعليم الإلكتروني أصبح جزءاً لا يتجزأ من النظام التعليمي الحديث. يوفر هذا النوع من التعليم مرونة كبيرة للطلاب والمعلمين على حد سواء، حيث يمكن الوصول إلى المحتوى التعليمي في أي وقت ومن أي مكان. كما يساعد على تطوير مهارات التعلم الذاتي والاعتماد على النفس في اكتساب المعرفة والمهارات الجديدة.",
      "الذكاء الاصطناعي يشهد تطوراً سريعاً في السنوات الأخيرة، ويؤثر على جميع جوانب حياتنا اليومية. من السيارات ذاتية القيادة إلى المساعدات الصوتية الذكية، نرى تطبيقات عملية للذكاء الاصطناعي في كل مكان. هذا التطور يتطلب من المتخصصين في مجال التكنولوجيا مواكبة أحدث التطورات والتقنيات لضمان البقاء في المقدمة.",
      "الأمن السيبراني أصبح من أهم التحديات في العصر الرقمي الحالي. مع تزايد الهجمات الإلكترونية والتهديدات الأمنية، تحتاج الشركات والمؤسسات إلى تطوير استراتيجيات شاملة لحماية بياناتها ومعلوماتها الحساسة. يتطلب هذا الأمر استثماراً كبيراً في التقنيات الحديثة وتدريب الموظفين على أفضل الممارسات الأمنية.",
      "التجارة الإلكترونية غيرت طريقة تسوق المستهلكين وتفاعلهم مع العلامات التجارية. توفر المنصات الرقمية تجربة تسوق مريحة ومرنة، مما يتيح للعملاء مقارنة الأسعار والمنتجات بسهولة. هذا التطور أدى إلى نمو كبير في قطاع التجارة الإلكترونية وخلق فرص عمل جديدة في مجالات التسويق الرقمي والخدمات اللوجستية."
    ];
    
    // اختيار نص عشوائي
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    
    // تقسيم النص إلى كلمات
    const words = randomText.split(' ');
    
    // أخذ العدد المطلوب من الكلمات
    const selectedWords = words.slice(0, Math.min(args.wordCount, words.length));
    
    return selectedWords.join(' ');
  },
});
