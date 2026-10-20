import { z } from 'zod'
export const actionSchema = z.enum(['pet', 'feed', 'play'])
export const animationSchema = z.enum(['idle','walk','sleep','stretch','groom','look','petted','eat','play','lifted','land','greet'])
export const stageSchema = z.enum(['new','familiar','close'])
export const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict()
export const settingsSchema = z.object({ quiet: z.boolean(), sound: z.boolean(), reducedMotion: z.boolean(), alwaysOnTop: z.boolean(), launchAtLogin: z.boolean() }).strict()
const timestamp = z.number().finite().min(0).max(8.64e15)
const petSchema = z.object({
  name: z.string().trim().min(1).max(20), energy: z.number().min(0).max(100), contentment: z.number().min(0).max(100),
  bond: z.number().int().min(0), stage: stageSchema, animation: animationSchema,
  preferences: z.object({ pet: z.number().nonnegative(), feed: z.number().nonnegative(), play: z.number().nonnegative() }).strict(),
  lastSeenAt: timestamp, maxObservedAt: timestamp, createdAt: timestamp,
  creditedDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  lastActionAt: z.object({ pet: timestamp.optional(), feed: timestamp.optional(), play: timestamp.optional() }).strict()
}).strict()
export const messageSchema = z.object({ id: z.string(), role: z.enum(['user','assistant']), text: z.string().max(12000), createdAt: timestamp }).strict()
export const memorySchema = z.object({ id: z.string(), kind: z.enum(['name','preference','moment']), text: z.string().trim().min(1).max(500), sourceMessageId: z.string().optional(), createdAt: timestamp }).strict()
export const connectionSchema = z.object({ endpoint: z.url().refine(v => { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password }, '请使用不含密码的 HTTPS 地址'), model: z.string().trim().min(1).max(120) }).strict()
export const snapshotSchema = z.object({ version: z.literal(1), pet: petSchema, settings: settingsSchema, messages: z.array(messageSchema), memories: z.array(memorySchema).max(100), connection: connectionSchema.nullable(), position: pointSchema.nullable(), onboardingComplete: z.boolean() }).strict()
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('care'), action: actionSchema }).strict(),
  z.object({ type: z.literal('rename'), name: z.string().trim().min(1).max(20) }).strict(),
  z.object({ type: z.literal('settings'), patch: settingsSchema.partial() }).strict(),
  z.object({ type: z.literal('complete-onboarding') }).strict(),
  z.object({ type: z.literal('memory-add'), kind: z.enum(['name','preference','moment']), text: z.string().trim().min(1).max(500), sourceMessageId: z.string().optional() }).strict(),
  z.object({ type: z.literal('memory-update'), id: z.string(), text: z.string().trim().min(1).max(500) }).strict(),
  z.object({ type: z.literal('memory-delete'), id: z.string() }).strict(),
  z.object({ type: z.literal('message-delete'), id: z.string() }).strict(),
  z.object({ type: z.literal('messages-clear') }).strict()
])
export type Action = z.infer<typeof actionSchema>
export type Animation = z.infer<typeof animationSchema>
export type Stage = z.infer<typeof stageSchema>
export type PetState = z.infer<typeof petSchema>
export type Settings = z.infer<typeof settingsSchema>
export type Message = z.infer<typeof messageSchema>
export type Memory = z.infer<typeof memorySchema>
export type Connection = z.infer<typeof connectionSchema>
export type Snapshot = z.infer<typeof snapshotSchema>
export type PetCommand = z.infer<typeof commandSchema>
export type Point = z.infer<typeof pointSchema>
export type Size = { width: number; height: number }
export type Rect = Point & Size
export type Tab = 'pet' | 'chat' | 'memories' | 'settings'
export type ChatResult = { status: 'ok'; message: Message } | { status: 'cancelled' | 'error'; reason: string }
export type ConnectionCheckResult = { status: 'ok' | 'cancelled' | 'error'; reason: string }
export type RuntimeStatus = { connected: boolean; busy: boolean; recovered: boolean; storageError: boolean; hidden: boolean }
