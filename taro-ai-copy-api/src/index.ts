import cors from 'cors'
import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import { createChatCompletion } from './deepseek'

dotenv.config()

const PORT = Number(process.env.PORT) || 3000
const DEEPSEEK_API_KEY = "sk-239e9db4375347b58b8afcc018738645"

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

function requireDeepSeek(res: Response): boolean {
  if (!DEEPSEEK_API_KEY) {
    res.status(503).json({
      message: '服务未配置 DEEPSEEK_API_KEY，请在项目根目录 .env 中配置',
    })
    return false
  }
  return true
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'taro-ai-copy-api',
    deepseekConfigured: !!DEEPSEEK_API_KEY,
  })
})

// ========== 通用文案接口（保留兼容） ==========
/**
 * POST /api/ai/copy
 * Body: { prompt: string, scene?, tone?, length? }
 * Response: { text: string }
 */
app.post('/api/ai/copy', async (req: Request, res: Response) => {
  try {
    if (!requireDeepSeek(res)) return

    const { prompt, scene, tone, length } = req.body as {
      prompt?: string
      scene?: string
      tone?: string
      length?: 'short' | 'medium' | 'long'
    }

    const userPrompt = typeof prompt === 'string' ? prompt.trim() : ''
    if (!userPrompt) {
      res.status(400).json({ message: '缺少 prompt' })
      return
    }

    const systemPrompt = [
      '你是一位专业的文案创作助手，擅长小红书笔记、朋友圈文案、短视频脚本等短文案。',
      '根据用户给出的要求与要点，直接输出成品文案，不要加「文案如下」等前缀。',
      scene && `当前场景/平台偏好：${scene}`,
      tone && `语气/风格：${tone}`,
      length && `篇幅：${length === 'short' ? '简短' : length === 'long' ? '稍长' : '适中'}`,
    ]
      .filter(Boolean)
      .join('\n')

    const text = await createChatCompletion(DEEPSEEK_API_KEY, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    })

    res.json({ text })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error('[POST /api/ai/copy]', err.message)
    res.status(500).json({ message: err.message || '生成失败' })
  }
})

// ========== 1. 小红书文案生成 ==========
/**
 * POST /api/ai/xhs
 * Body: { noteType: string, outline: string, keywords?: string, versionIndex: 1|2|3 }
 * Response: { text: string }
 */
const XHS_TONES: Record<number, string> = {
  1: '自然真实，像朋友分享',
  2: '种草分享，突出好物与体验',
  3: '轻松幽默，带一点梗和表情感',
}

app.post('/api/ai/xhs', async (req: Request, res: Response) => {
  try {
    if (!requireDeepSeek(res)) return

    const { noteType, outline, keywords, versionIndex } = req.body as {
      noteType?: string
      outline?: string
      keywords?: string
      versionIndex?: 1 | 2 | 3
    }

    const outlineStr = typeof outline === 'string' ? outline.trim() : ''
    if (!outlineStr) {
      res.status(400).json({ message: '缺少 outline（笔记大纲/要点）' })
      return
    }

    const version = versionIndex === 1 || versionIndex === 2 || versionIndex === 3 ? versionIndex : 1
    const toneDesc = XHS_TONES[version]

    const systemPrompt = [
      '你是一位小红书爆款文案专家。',
      '只输出一条可直接使用的笔记正文，不要标题、不要「文案如下」等前缀，不要自带话题标签（标签由前端追加）。',
      '风格要求：口语化、有网感、适当留白换行，符合小红书用户阅读习惯。',
      `本版本风格：${toneDesc}。`,
    ].join('\n')

    const userPrompt = [
      `笔记类型：${noteType || '其他'}`,
      `大纲/要点：${outlineStr}`,
      keywords && keywords.trim() ? `补充关键词（请自然融入）：${keywords.trim()}` : null,
      '请直接输出一条完整笔记正文。',
    ]
      .filter(Boolean)
      .join('\n')

    const text = await createChatCompletion(DEEPSEEK_API_KEY, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 1024,
    })

    res.json({ text })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error('[POST /api/ai/xhs]', err.message)
    res.status(500).json({ message: err.message || '生成失败' })
  }
})

// ========== 2. 朋友圈文案生成 ==========
/**
 * POST /api/ai/moments
 * Body: { scene: string, persona: string, outline: string, festival?: string, hotTopic?: string }
 * Response: { text: string }
 */
app.post('/api/ai/moments', async (req: Request, res: Response) => {
  try {
    if (!requireDeepSeek(res)) return

    const { scene, persona, outline, festival, hotTopic } = req.body as {
      scene?: string
      persona?: string
      outline?: string
      festival?: string
      hotTopic?: string
    }

    const outlineStr = typeof outline === 'string' ? outline.trim() : ''
    if (!outlineStr) {
      res.status(400).json({ message: '缺少 outline（想表达的内容/心情）' })
      return
    }

    const systemPrompt = [
      '你是一位擅长写朋友圈配文的文案专家。',
      '只输出一条可直接用作朋友圈正文的配文，不要标题、不要「配文如下」等前缀。',
      '要求：自然、口语化、有个人情绪；可适当留白和换行；末尾可加 1～2 个 emoji。',
      '篇幅适中，不要过长。',
    ].join('\n')

    const parts = [
      `场景：${scene || '日常'}`,
      `人设/语气：${persona || '自然'}`,
      `想表达的内容/心情：${outlineStr}`,
      festival && festival.trim() ? `节日/氛围：${festival.trim()}` : null,
      hotTopic && hotTopic.trim() ? `结合热点/主题：${hotTopic.trim()}` : null,
    ].filter(Boolean)

    const userPrompt = parts.join('\n') + '\n请直接输出一条朋友圈配文。'

    const text = await createChatCompletion(DEEPSEEK_API_KEY, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 512,
    })

    res.json({ text })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error('[POST /api/ai/moments]', err.message)
    res.status(500).json({ message: err.message || '生成失败' })
  }
})

// ========== 3. 短视频脚本生成 ==========
/**
 * POST /api/ai/video
 * Body: { platform: string, hookStyle: string, idea: string }
 * Response: { outline: string, script: string, bgmSuggestion: string }
 */
app.post('/api/ai/video', async (req: Request, res: Response) => {
  try {
    if (!requireDeepSeek(res)) return

    const { platform, hookStyle, idea } = req.body as {
      platform?: string
      hookStyle?: string
      idea?: string
    }

    const ideaStr = typeof idea === 'string' ? idea.trim() : ''
    if (!ideaStr) {
      res.status(400).json({ message: '缺少 idea（视频主题/卖点）' })
      return
    }

    const systemPrompt = [
      '你是一位短视频脚本与口播稿专家。',
      '请按以下结构输出，用明确的标题分段，便于解析：',
      '【脚本结构】一段话概括：黄金3秒开头 + 核心内容段落 + 结尾引导。',
      '【口播稿】分段写出「开头/内容/结尾」的口语化文案，每段一两句话。',
      '【分镜建议】用「镜头1」「镜头2」… 简短描述画面。',
      '【BGM建议】只写风格/氛围，不要具体歌名。',
      '不要输出「文案如下」等多余前缀，直接按上述标题分段输出。',
    ].join('\n')

    const userPrompt = [
      `发布平台：${platform || '抖音'}`,
      `开头风格（黄金3秒）：${hookStyle || '痛点共鸣'}`,
      `视频主题/卖点：${ideaStr}`,
      '请按系统要求输出：脚本结构、口播稿、分镜建议、BGM建议。',
    ].join('\n')

    const text = await createChatCompletion(DEEPSEEK_API_KEY, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    })

    // 简单解析：按【xxx】分段
    const outlineMatch = text.match(/【脚本结构】([\s\S]*?)(?=【|$)/)
    const scriptMatch = text.match(/【口播稿】([\s\S]*?)(?=【|$)/)
    const shotMatch = text.match(/【分镜建议】([\s\S]*?)(?=【|$)/)
    const bgmMatch = text.match(/【BGM建议】([\s\S]*?)(?=【|$)/)

    const outline = (outlineMatch?.[1] ?? text).trim()
    const script = (scriptMatch?.[1] ?? '').trim()
    const shotText = (shotMatch?.[1] ?? '').trim()
    const bgmSuggestion = (bgmMatch?.[1] ?? '').trim()

    const scriptWithShot = [script, shotText].filter(Boolean).join('\n\n')

    res.json({
      outline,
      script: scriptWithShot || text,
      bgmSuggestion: bgmSuggestion || '根据平台调性选择节奏与情绪匹配的 BGM。',
    })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error('[POST /api/ai/video]', err.message)
    res.status(500).json({ message: err.message || '生成失败' })
  }
})

app.listen(PORT, () => {
  console.log(`[taro-ai-copy-api] http://localhost:${PORT}`)
  console.log(`  GET  /api/health     健康检查`)
  console.log(`  POST /api/ai/copy    通用文案（兼容）`)
  console.log(`  POST /api/ai/xhs     小红书文案`)
  console.log(`  POST /api/ai/moments 朋友圈文案`)
  console.log(`  POST /api/ai/video   短视频脚本`)
  if (!DEEPSEEK_API_KEY) {
    console.warn('  未设置 DEEPSEEK_API_KEY，AI 接口将返回 503')
  }
})
