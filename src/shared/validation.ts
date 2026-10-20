import { commandSchema, pointSchema } from './types'
export const validateCommand = (input: unknown) => commandSchema.parse(input)
export const validatePoint = (input: unknown) => pointSchema.parse(input)
export function assertTrusted(sender: number, owner: number, mainFrame: boolean): void {
  if (sender !== owner || !mainFrame) throw new Error('不受信任的窗口请求')
}
