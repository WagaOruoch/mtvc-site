import { defineCollection, z } from "astro:content";

const jobs = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    department: z.string(),
    description: z.string(),
    attachment: z.string().optional(),
    postedDate: z.coerce.date(),
    closingDate: z.coerce.date(),
    howToApply: z.string(),
  }),
});

const tenders = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    reference: z.string(),
    type: z.enum(["Tender", "Prequalification", "Addendum", "Notice"]),
    description: z.string(),
    attachments: z.array(z.string()).default([]),
    postedDate: z.coerce.date(),
    closingDate: z.coerce.date(),
    openingDate: z.coerce.date().optional(),
  }),
});

const announcements = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    image: z.string().optional(),
    description: z.string(),
    link: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    homepageBanner: z.boolean().default(false),
  }),
});

const gallery = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    department: z.string(),
    date: z.coerce.date(),
    photos: z.array(z.object({ image: z.string(), caption: z.string().optional() })),
    videos: z.array(z.string()).default([]),
  }),
});

const serviceCharter = defineCollection({
  type: "content",
  schema: z.object({
    englishAudio: z.string().optional(),
    swahiliAudio: z.string().optional(),
    signLanguageLink: z.string().url().optional(),
    pdf: z.string().optional(),
  }),
});

const departmentRequirements = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    department: z.string(),
    intake: z.string(),
    description: z.string().optional(),
    document: z.string().optional(),
  }),
});

const intakes = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    applicationUrl: z.string().url(),
    openingDate: z.coerce.date().optional(),
    closingDate: z.coerce.date().optional(),
    description: z.string().optional(),
  }),
});

export const collections = {
  jobs,
  tenders,
  announcements,
  gallery,
  "service-charter": serviceCharter,
  "department-requirements": departmentRequirements,
  intakes,
};
