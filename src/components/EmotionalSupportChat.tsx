'use client';

import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Bot, User, Heart, Play, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface MeditationVideo {
  title: string;
  url: string;
  duration: string;
  description: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  language?: string;
  meditationSuggestion?: MeditationVideo;
}

interface Language {
  code: string;
  name: string;
}

export default function EmotionalSupportChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [languages, setLanguages] = useState<Language[]>([]);
  // const [meditationVideos, setMeditationVideos] = useState<MeditationVideo[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadLanguages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/emotional-support/languages`);
      if (response.ok) {
        const { languages } = await response.json();
        setLanguages(languages);
      }
    } catch (error) {
      console.error('Failed to load languages:', error);
    }
  };

  const loadMeditationVideos = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/emotional-support/meditation-videos`);
      if (response.ok) {
        const data = await response.json();
        // setMeditationVideos(data.videos);
      }
    } catch (error) {
      console.error('Failed to load meditation videos:', error);
    }
  };

  // Load languages and meditation videos on mount
  useEffect(() => {
    loadLanguages();
    loadMeditationVideos();
  }, [loadLanguages, loadMeditationVideos]);

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !session?.user?.id) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      language: selectedLanguage
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/emotional-support/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id
        },
        body: JSON.stringify({
          message: input.trim(),
          language: selectedLanguage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(data.timestamp),
        language: data.language,
        meditationSuggestion: data.meditationSuggestion
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I\'m sorry, I\'m having trouble responding right now. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const openVideo = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border-2 border-black relative">
      {/* Chat Header */}
      <div className="p-3 sm:p-4 border-b border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold">Emotional Support Chat</h2>
          </div>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">24/7 AI-powered emotional support companion</p>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-3 sm:p-4 pb-[80px] sm:pb-[88px]">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Welcome to Emotional Support Chat</h3>
              <p className="text-muted-foreground">
                I&apos;m here to listen and support you. Feel free to share what&apos;s on your mind.
              </p>
            </div>
          )}

          {messages.map((message, index) => {
            const messageId = `msg-${index}`;

            return (
              <div key={messageId}>
                <div
                  className={cn(
                    "flex gap-2 sm:gap-3 w-full",
                    message.role === 'assistant' ? 'justify-start' : 'justify-end'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      </div>
                    </div>
                  )}
                  <Card
                    className={cn(
                      "max-w-[85%] sm:max-w-[80%] p-3 sm:p-4",
                      message.role === 'assistant'
                        ? 'bg-red-50 rounded-tl-none'
                        : 'bg-blue-50 rounded-tr-none'
                    )}
                  >
                    <div className="flex flex-col gap-1.5 sm:gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {message.role === 'assistant' ? 'Support Companion' : 'You'}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </Card>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Meditation Video Suggestion */}
                {message.role === 'assistant' && message.meditationSuggestion && (
                  <div className="mt-3 ml-10 sm:ml-11">
                    <Card className="p-3 bg-green-50 border-green-200">
                      <div className="flex items-start gap-3">
                        <Play className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-800 mb-1">
                            Meditation Suggestion
                          </h4>
                          <p className="text-sm text-green-700 mb-2">
                            {message.meditationSuggestion.title}
                          </p>
                          <p className="text-xs text-green-600 mb-3">
                            {message.meditationSuggestion.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600">
                              Duration: {message.meditationSuggestion.duration}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openVideo(message.meditationSuggestion!.url)}
                              className="h-7 px-2 text-xs border-green-300 hover:bg-green-100"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Watch Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-black z-20">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your mind..."
            disabled={loading}
            className="flex-1 h-12 text-base px-4 rounded-full border-2 focus-visible:ring-2"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim() || !session?.user?.id}
            size="default"
            className="h-12 px-6 rounded-full hover:scale-105 transition-transform active:scale-95 shadow-lg"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            <span className="ml-2 hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
