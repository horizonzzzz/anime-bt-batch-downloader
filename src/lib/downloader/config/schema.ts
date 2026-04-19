import { z } from "zod"

export const downloaderProfileSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .transform((value) => value.replace(/\/+$/, "")),
  username: z.string().trim(),
  password: z.string()
})

export const downloaderConfigSchema = z.object({
  activeId: z.enum(["qbittorrent", "transmission"]),
  profiles: z.object({
    qbittorrent: downloaderProfileSchema,
    transmission: downloaderProfileSchema
  })
}).superRefine((values, context) => {
  const activeProfile = values.profiles[values.activeId]
  if (!activeProfile.baseUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["profiles", values.activeId, "baseUrl"],
      message: "Active downloader base URL is required."
    })
  }
})