import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import type { FunctionCall, FunctionConfig, Message } from "./types";

const openai = new OpenAI();

function mapMessages(
  requester: string,
  messages: Message[]
): ChatCompletionMessageParam[] {
  // Messages previously sent by the requesting member are considered 'assistant' messages
  return messages.map((message) => ({
    role: message.sender === requester ? "assistant" : "user",
    content: message.content,
  }));
}

export async function getCompletion(
  requester: string,
  systemPrompt: string,
  messages: Message[],
  functionConfig: FunctionConfig
): Promise<FunctionCall | string | null> {
  const formattedMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...mapMessages(requester, messages),
  ];

  try {
    const { choices } = await openai.chat.completions.create({
      messages: formattedMessages,
      model: "gpt-4-0613",
      functions: Object.values(functionConfig).map((config) => config.schema),
    });

    const { message } = choices[0];
    const { function_call, content } = message;

    if (function_call) {
      const functionArgs = JSON.parse(formatJsonStr(function_call.arguments));
      return {
        name: function_call.name,
        arguments: functionArgs,
        content: content || "",
      };
    }

    return content;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function formatJsonStr(jstr: string): string {
  /* Remove newlines outside of quotes, and handle JSON escape sequences.

  1. this function removes the newline in the query outside of quotes otherwise JSON.parse(s) will fail.
      Ex 1:
      "{\n"tool": "python",\n"query": "print('hello')\nprint('world')"\n}" -> "{"tool": "python","query": "print('hello')\nprint('world')"}"
      Ex 2:
      "{\n  \"location\": \"Boston, MA\"\n}" -> "{"location": "Boston, MA"}"

  2. this function also handles JSON escape sequences inside quotes,
      Ex 1:
      '{"args": "a\na\na\ta"}' -> '{"args": "a\\na\\na\\ta"}'
  */

  let result: string[] = [];
  let insideQuotes = false;
  let lastChar = " ";
  for (let char of jstr) {
    if (lastChar !== "\\" && char === '"') {
      insideQuotes = !insideQuotes;
    }
    lastChar = char;
    if (!insideQuotes && char === "\n") {
      continue;
    }
    if (insideQuotes && char === "\n") {
      char = "\\n";
    }
    if (insideQuotes && char === "\t") {
      char = "\\t";
    }
    result.push(char);
  }
  return result.join("");
}
