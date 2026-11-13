// Phần AI: đọc hóa đơn từ ảnh và trợ lý ghi chi tiêu, gọi Claude API bằng khóa của người dùng.
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { ALL_IDS, CATEGORIES, cat, EXPENSE_IDS, normalizeCategory } from './categories';
import { addDays, fmt, isValidISO, today } from './format';
import { getApiKey } from './secrets';
import { addTransaction, deleteTransaction, getState, setBudget } from './store';
import { computeStats, inRange } from './report';

const MODEL = 'claude-opus-5-5';
// Nếu bộ lọc an toàn từ chối nhầm, API tự chạy lại trên model dự phòng.
const BETAS = ['server-side-fallback-2026-07-01'];

export class AiError extends Error {}

async function client(): Promise<Anthropic> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new AiError('Chưa có API key. Thêm key trong Cài đặt để dùng AI.');
  // Ứng dụng cá nhân: khóa do chính người dùng nhập và chỉ lưu trên máy họ.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 });
}

function explain(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.AuthenticationError) return new AiError('API key không hợp lệ. Kiểm tra lại trong Cài đặt.');
  if (e instanceof Anthropic.PermissionDeniedError) return new AiError('API key không có quyền dùng model này.');
  if (e instanceof Anthropic.RateLimitError) return new AiError('Đang quá giới hạn gọi API, thử lại sau ít phút.');
  if (e instanceof Anthropic.APIConnectionError) return new AiError('Không kết nối được tới máy chủ AI. Kiểm tra mạng.');
  if (e instanceof Anthropic.APIError) return new AiError(`Lỗi từ máy chủ AI (${e.status ?? '?'}): ${e.message}`);
  return new AiError('Có lỗi khi gọi AI. Thử lại nhé.');
}

type ImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function mime(m?: string | null): ImageMime {
  return m === 'image/png' || m === 'image/gif' || m === 'image/webp' ? m : 'image/jpeg';
}

const categoryGuide = CATEGORIES.map((c) => `${c.id} = ${c.name} (${c.type === 'expense' ? 'chi' : 'thu'})`).join('; ');

// ---------- Đọc hóa đơn ----------

const ReceiptSchema = z.object({
  readable: z.boolean().describe('false nếu ảnh không phải hóa đơn/biên lai/màn hình chuyển khoản hoặc không đọc được số tiền'),
  type: z.enum(['expense', 'income']),
  total: z.number().describe('Tổng tiền phải trả, đơn vị VND, số nguyên'),
  merchant: z.string().describe('Tên cửa hàng hoặc người nhận, rỗng nếu không rõ'),
  date: z.string().describe('Ngày trên hóa đơn dạng YYYY-MM-DD, rỗng nếu không thấy'),
  category: z.enum(ALL_IDS as [string, ...string[]]),
  note: z.string().describe('Ghi chú ngắn bằng tiếng Việt, tối đa 6 từ, vd "Highlands Coffee" hoặc "Siêu thị Co.opmart"'),
});

export interface Receipt {
  readable: boolean;
  type: 'expense' | 'income';
  total: number;
  merchant: string;
  date: string;
  category: string;
  note: string;
}

export async function scanReceipt(base64: string, mimeType?: string | null): Promise<Receipt> {
  try {
    const c = await client();
    const res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: 'default',
      output_config: { effort: 'low', format: zodOutputFormat(ReceiptSchema) },
      system:
        `Bạn đọc ảnh hóa đơn, biên lai hoặc ảnh chụp màn hình chuyển khoản để ghi sổ chi tiêu cá nhân ở Việt Nam. ` +
        `Lấy tổng tiền cuối cùng người dùng phải trả (sau thuế và giảm giá), không lấy tiền khách đưa hay tiền thối. ` +
        `Tiền là VND: "125.000" nghĩa là một trăm hai mươi lăm nghìn. Hôm nay là ${today()}. Danh mục: ${categoryGuide}.`,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime(mimeType), data: base64 } },
            { type: 'text', text: 'Đọc hóa đơn này.' },
          ],
        },
      ],
    });
    if (res.stop_reason === 'refusal') throw new AiError('AI từ chối xử lý ảnh này.');
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const parsed = ReceiptSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new AiError('AI trả về kết quả không đọc được. Thử chụp lại rõ hơn.');
    const r = parsed.data;
    return {
      ...r,
      total: Math.round(Math.abs(r.total)),
      date: isValidISO(r.date) && r.date <= today() ? r.date : today(),
      category: normalizeCategory(r.category, r.type),
    };
  } catch (e) {
    if (e instanceof SyntaxError) throw new AiError('AI trả về kết quả không đọc được. Thử chụp lại rõ hơn.');
    throw explain(e);
  }
}

// ---------- Trợ lý ----------

type Msg = Anthropic.Beta.BetaMessageParam;

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'add_transaction',
    description: 'Ghi một khoản chi hoặc thu vào sổ. Gọi một lần cho mỗi khoản.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['expense', 'income'] },
        amount: { type: 'integer', description: 'Số tiền VND, số nguyên dương. "35k" = 35000, "1tr2" = 1200000.' },
        category: { type: 'string', enum: ALL_IDS },
        note: { type: 'string', description: 'Ghi chú ngắn bằng tiếng Việt' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['type', 'amount', 'category', 'note', 'date'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_summary',
    description: 'Tổng thu, tổng chi, chi theo danh mục trong một khoảng ngày, kèm hạn mức và kế hoạch tháng.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } },
      required: ['from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_transactions',
    description: 'Liệt kê giao dịch trong một khoảng ngày (tối đa 60, mới nhất trước), có id để sửa/xóa.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } },
      required: ['from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_transaction',
    description: 'Xóa một giao dịch theo id. Chỉ dùng khi người dùng yêu cầu xóa rõ ràng.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'set_budget',
    description: 'Đặt hạn mức chi hằng tháng cho một danh mục chi. amount = 0 để bỏ hạn mức.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { category: { type: 'string', enum: EXPENSE_IDS }, amount: { type: 'integer' } },
      required: ['category', 'amount'],
      additionalProperties: false,
    },
  },
];

function runTool(name: string, input: unknown, added: string[]): string {
  const a = (input ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '');
  const int = (k: string) => (typeof a[k] === 'number' && isFinite(a[k] as number) ? Math.round(a[k] as number) : NaN);
  const range = () => {
    const from = isValidISO(str('from')) ? str('from') : addDays(today(), -30);
    const to = isValidISO(str('to')) ? str('to') : today();
    return { from, to };
  };
  const s = getState();

  switch (name) {
    case 'add_transaction': {
      const amount = int('amount');
      const type = str('type') === 'income' ? 'income' : 'expense';
      if (!(amount > 0)) return 'Lỗi: amount phải là số nguyên dương.';
      const tx = addTransaction({
        type,
        amount,
        category: str('category'),
        note: str('note') || cat(normalizeCategory(str('category'), type)).name,
        date: isValidISO(str('date')) ? str('date') : today(),
        source: 'bot',
      });
      added.push(tx.id);
      return JSON.stringify({ ok: true, id: tx.id, saved: { ...tx, category_name: cat(tx.category).name } });
    }
    case 'get_summary': {
      const { from, to } = range();
      const st = computeStats(inRange(s.transactions, from, to));
      return JSON.stringify({
        from,
        to,
        income: st.income,
        expense: st.expense,
        balance: st.balance,
        count: st.count,
        expense_by_category: st.byCategory.map((c) => ({ category: c.id, name: cat(c.id).name, total: c.total, count: c.count })),
        monthly_budgets: s.budgets,
        monthly_plan: s.plan,
      });
    }
    case 'list_transactions': {
      const { from, to } = range();
      const list = inRange(s.transactions, from, to)
        .sort((x, y) => (x.date === y.date ? y.createdAt - x.createdAt : x.date < y.date ? 1 : -1))
        .slice(0, 60)
        .map((t) => ({ id: t.id, date: t.date, type: t.type, amount: t.amount, category: t.category, note: t.note }));
      return JSON.stringify(list);
    }
    case 'delete_transaction': {
      const tx = s.transactions.find((t) => t.id === str('id'));
      if (!tx) return 'Lỗi: không tìm thấy giao dịch với id này.';
      deleteTransaction(tx.id);
      return JSON.stringify({ ok: true, deleted: `${tx.note} ${fmt(tx.amount)} ngày ${tx.date}` });
    }
    case 'set_budget': {
      const amount = int('amount');
      if (!EXPENSE_IDS.includes(str('category')) || !(amount >= 0)) return 'Lỗi: danh mục hoặc số tiền không hợp lệ.';
      setBudget(str('category'), amount);
      return JSON.stringify({ ok: true, category: cat(str('category')).name, amount });
    }
    default:
      return `Lỗi: không có công cụ ${name}.`;
  }
}

function systemPrompt(): string {
  return (
    `Bạn là trợ lý trong một ứng dụng sổ chi tiêu cá nhân của người dùng ở Việt Nam. Bạn trả lời bằng tiếng Việt, ngắn gọn, thân thiện, ` +
    `vì người dùng đọc trên màn hình điện thoại: thường một đến ba câu, không dùng markdown hay bảng.\n\n` +
    `Việc chính của bạn là ghi khoản chi/thu vào sổ bằng công cụ add_transaction khi người dùng kể về một khoản tiền ` +
    `(bằng chữ hoặc bằng ảnh hóa đơn), và trả lời câu hỏi về chi tiêu dựa trên dữ liệu lấy từ get_summary hoặc list_transactions. ` +
    `Đừng đoán số liệu: hãy gọi công cụ trước khi nói về tổng chi, số dư hay hạn mức.\n\n` +
    `Khi câu của người dùng đủ rõ số tiền thì ghi luôn, không hỏi lại; tự chọn danh mục hợp lý nhất. Chỉ hỏi lại khi thiếu số tiền. ` +
    `Tiền là VND: "35k" = 35.000, "1tr2" = 1.200.000, "2 củ" = 2.000.000. Nếu không nói ngày thì dùng hôm nay. ` +
    `Với ảnh hóa đơn, ghi tổng tiền cuối cùng phải trả thành một giao dịch. Sau khi ghi, xác nhận lại ngắn gọn số tiền và danh mục.\n\n` +
    `Hôm nay là ${today()}. Danh mục: ${categoryGuide}.`
  );
}

// Lịch sử hội thoại gửi cho API (giữ trong phiên, khác với phần hiển thị).
let history: Msg[] = [];

export function resetAssistant() {
  history = [];
}

export interface AssistantReply {
  text: string;
  txIds: string[];
}

export async function askAssistant(
  text: string,
  image?: { base64: string; mimeType?: string | null },
): Promise<AssistantReply> {
  const added: string[] = [];
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: mime(image.mimeType), data: image.base64 } });
  content.push({ type: 'text', text: text || 'Ghi hóa đơn này vào sổ giúp mình.' });

  // Ảnh cũ không gửi lại ở các lượt sau để tiết kiệm; chỉ giữ 24 tin gần nhất.
  const messages: Msg[] = [...history.slice(-24), { role: 'user', content }];
  while (messages.length && (messages[0].role !== 'user' || hasToolResult(messages[0]))) messages.shift();

  try {
    const c = await client();
    let reply = '';
    for (let turn = 0; turn < 8; turn++) {
      const res = await c.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: BETAS,
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: systemPrompt(),
        tools: TOOLS,
        messages,
      });

      if (res.stop_reason === 'refusal') {
        reply = 'Mình không hỗ trợ được yêu cầu này.';
        break;
      }
      messages.push({ role: 'assistant', content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
      reply = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim() || reply;

      if (res.stop_reason === 'pause_turn') continue;
      if (res.stop_reason !== 'tool_use') break;

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const b of res.content) {
        if (b.type !== 'tool_use') continue;
        const out = runTool(b.name, b.input, added);
        results.push({ type: 'tool_result', tool_use_id: b.id, content: out, is_error: out.startsWith('Lỗi:') });
      }
      messages.push({ role: 'user', content: results });
    }

    // Lưu lịch sử, thay ảnh bằng chú thích chữ.
    history = messages.map((m): Msg =>
      m.role === 'user' && Array.isArray(m.content)
        ? { role: 'user', content: m.content.map((b) => (b.type === 'image' ? { type: 'text' as const, text: '[ảnh hóa đơn đã gửi]' } : b)) }
        : m,
    );
    return { text: reply || (added.length ? 'Đã ghi xong.' : 'Mình chưa hiểu, bạn nói lại giúp nhé.'), txIds: added };
  } catch (e) {
    // Giao dịch đã ghi trước khi lỗi vẫn nằm trong sổ; báo cho người dùng biết.
    const err = explain(e);
    if (added.length) err.message += ` (Đã kịp ghi ${added.length} khoản trước khi lỗi.)`;
    (err as AiError & { txIds?: string[] }).txIds = added;
    throw err;
  }
}

function hasToolResult(m: Msg): boolean {
  return Array.isArray(m.content) && m.content.some((b) => b.type === 'tool_result');
}
