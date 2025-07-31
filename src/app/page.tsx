"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
// @ts-ignore
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

type TextItem = {
  str: string;
};

interface Message {
  id: number;
  sender: "user" | "ai" | "system";
  content: string;
}

const API_KEY = "AIzaSyBoQ9NG4uC-BdMH_DKZeFNCeBAtwJ5jdTQ"; // ❗Replace with ENV in production

export default function ChatbotUI() {
  const [pdfText, setPdfText] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [pdfLoaded, setPdfLoaded] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const typedArray = new Uint8Array(reader.result as ArrayBuffer);
      const pdf = await getDocument({ data: typedArray }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
      }

      setPdfText(fullText);
      setPdfLoaded(true);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "system",
          content: `📄 1 PDF uploaded: **${file.name}**`,
        },
      ]);
    };
    reader.readAsArrayBuffer(file);
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      content: trimmedInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const truncatedPdfText = pdfText.slice(0, 4000);

      const formattedMessages = [
        ...(pdfLoaded
          ? [
              {
                role: "user",
                parts: [
                  {
                    text: `Context from uploaded PDF:\n${truncatedPdfText}`,
                  },
                ],
              },
            ]
          : []),
        ...[...messages, userMessage].map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: formattedMessages }),
        }
      );

      const data = await response.json();
      const aiText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn’t get a response.";

      const aiMessage: Message = {
        id: Date.now() + 1,
        sender: "ai",
        content: aiText,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          content: "Oops! Something went wrong. Try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col min-h-screen items-center bg-gray-50 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-md p-4 space-y-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-purple-600">
          My AI Chatbot 🤖
        </h1>

        <Card className="w-full rounded-2xl shadow-lg border border-gray-200 max-h-[600px] overflow-hidden flex flex-col">
          <CardContent className="p-4 flex-1 overflow-y-auto">
            <ScrollArea className="max-h-[500px] pr-2">
              <div className="pr-2 flex flex-col space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] px-4 py-3 rounded-xl text-sm break-words whitespace-pre-wrap shadow",
                      msg.sender === "user"
                        ? "bg-blue-500 text-white self-end"
                        : msg.sender === "ai"
                        ? "bg-gray-100 text-black self-start"
                        : "bg-green-500 text-white self-center font-medium w-fit"
                    )}
                  >
                    <div className="text-sm leading-relaxed">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="max-w-[60%] px-4 py-2 rounded-xl text-sm bg-gray-200 text-black self-start animate-pulse shadow">
                    Typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* File Upload Box */}
        <div className="border rounded px-3 py-2 bg-white w-full flex items-center justify-between text-sm">
          <label className="cursor-pointer text-purple-600 font-medium">
            Choose File
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {pdfLoaded && uploadedFileName && (
            <span className="truncate text-gray-600 max-w-xs">
              {uploadedFileName}
            </span>
          )}
        </div>

        {/* Input + Send Button */}
        <div className="flex gap-2">
          <Input
            className="flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
          />
          <Button onClick={sendMessage} className="shrink-0">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
