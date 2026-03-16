import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { appendExpenseRow, readSheetRows, getAccessTokenFromRefreshToken } from "@/lib/server/sheets";

const client = new Anthropic();

// ── Telegram webhook schemas ──────────────────────────────────────────────────

const TelegramVoice = z.object({
  file_id: z.string(),
  duration: z.number(),
});

const TelegramMessage = z.object({
  message_id: z.number(),
  from: z.object({ id: z.number(), first_name: z.string().optional() }),
  chat: z.object({ id: z.number() }),
  text: z.string().optional(),
  voice: TelegramVoice.optional(),
});

const TelegramUpdate = z.object({
  update_id: z.number(),
  message: TelegramMessage.optional(),
});

// ── Expense schema ────────────────────────────────────────────────────────────

const ParsedExpense = z.object({
  description: z.string(),
  amount: z.number().positive(),
  category: z.enum(["Restaurante", "Mercado", "Streaming", "Farmácia", "Viagem", "Outros"]),
  card: z.enum(["Itau", "Alelo", "Caju", "Conta Gero", "Conta Yas"]),
});

// ── Telegram helpers ──────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function downloadVoiceFile(fileId: string): Promise<Blob> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fileRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
  );
  const fileData = (await fileRes.json()) as {
    ok: boolean;
    result: { file_path: string };
  };
  if (!fileData.ok) throw new Error("Failed to get file info from Telegram");

  const audioRes = await fetch(
    `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`
  );
  if (!audioRes.ok) throw new Error("Failed to download voice file from Telegram");
  return audioRes.blob();
}

// ── AI helpers ────────────────────────────────────────────────────────────────

async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice.oga");
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper transcription failed: ${err}`);
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

async function detectIntent(text: string): Promise<"EXPENSE" | "QUERY"> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 10,
    system: `You detect the intent of a message about personal finances.
Reply with exactly one word: EXPENSE if the user is logging a new purchase (e.g. "almoço R$45", "gastei 30 reais no mercado"), or QUERY if the user is asking about past expenses (e.g. "quanto gastei?", "show last expenses", "resumo do mês").`,
    messages: [{ role: "user", content: text }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  const intent = block.text.trim().toUpperCase();
  if (intent === "EXPENSE" || intent === "QUERY") return intent;
  return "EXPENSE";
}

async function parseExpense(text: string): Promise<z.infer<typeof ParsedExpense>> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    system: `You extract expense data from user messages in Brazilian Portuguese or English.
Return only a JSON object with fields: description, amount, category, card.
Rules:
- amount is a positive number in BRL (no currency symbol)
- category must be one of: Restaurante, Mercado, Streaming, Farmácia, Viagem, Outros
- card must be one of: Itau, Alelo, Caju, Conta Gero, Conta Yas
- if card is not mentioned, infer from context; default to Itau if unsure
- return only the JSON object with no preamble`,
    messages: [{ role: "user", content: text }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  const json: unknown = JSON.parse(block.text.trim());
  return ParsedExpense.parse(json);
}

async function answerQuery(text: string, rows: string[][]): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const [header = [], ...dataRows] = rows;
  const sheetContent = [header, ...dataRows].map((row) => row.join(" | ")).join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You are a helpful budget assistant. Answer questions about expense data from a Google Sheet.
Today's date is ${today}.
Respond concisely and friendly in the same language as the question (Brazilian Portuguese or English).
Use R$ for currency amounts.
Spreadsheet data:
${sheetContent}`,
    messages: [{ role: "user", content: text }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let chatId: number | undefined;

  try {
    const body: unknown = await req.json();
    const update = TelegramUpdate.parse(body);
    const message = update.message;

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    chatId = message.chat.id;
    const senderId = message.from.id;

    // Authorization
    const allowedIds = (process.env.ALLOWED_TELEGRAM_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .map(Number);

    if (!allowedIds.includes(senderId)) {
      return NextResponse.json({ ok: true });
    }

    // Resolve text content
    let text: string;
    if (message.voice) {
      const audioBlob = await downloadVoiceFile(message.voice.file_id);
      text = await transcribeAudio(audioBlob);
    } else if (message.text) {
      text = message.text;
    } else {
      await sendTelegramMessage(chatId, "Please send a text or voice message.");
      return NextResponse.json({ ok: true });
    }

    const refreshToken = process.env.OWNER_REFRESH_TOKEN;
    if (!refreshToken) throw new Error("OWNER_REFRESH_TOKEN is not set");
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);
    const spreadsheetId = process.env.OWNER_SPREADSHEET_ID ?? "";
    const sheetName = process.env.OWNER_SHEET_NAME ?? "Expenses";

    const intent = await detectIntent(text);

    if (intent === "EXPENSE") {
      const expense = await parseExpense(text);
      const today = new Date().toLocaleDateString("pt-BR");
      await appendExpenseRow(accessToken, spreadsheetId, sheetName, [
        today,
        expense.description,
        expense.amount,
        expense.category,
        expense.card,
        "Telegram",
      ]);
      await sendTelegramMessage(
        chatId,
        `✅ Salvo!\n📝 ${expense.description}\n💰 R$${expense.amount}\n🏷️ ${expense.category} · ${expense.card}`
      );
    } else {
      const rows = await readSheetRows(accessToken, spreadsheetId, sheetName);
      const answer = await answerQuery(text, rows);
      await sendTelegramMessage(chatId, answer);
    }
  } catch (err: unknown) {
    console.error("Telegram webhook error:", err);
    if (chatId !== undefined) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await sendTelegramMessage(chatId, `❌ Error: ${msg}`);
    }
  }

  return NextResponse.json({ ok: true });
}
