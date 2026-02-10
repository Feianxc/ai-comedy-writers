import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AIPersona, RoastMessage, RoastSession } from '@/types';

interface AppState {
  // 用户状态
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;

  // 人设状态
  selectedPersona: AIPersona | null;
  setSelectedPersona: (persona: AIPersona | null) => void;

  // 当前会话
  currentRoastId: string | null;
  setCurrentRoastId: (id: string | null) => void;
  currentSession: RoastSession | null;
  setCurrentSession: (session: RoastSession | null) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;

  // 消息流
  messages: RoastMessage[];
  addMessage: (message: RoastMessage) => void;
  updateLastMessage: (content: string, role?: string) => void;
  clearMessages: () => void;

  // UI状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // 历史记录
  recentTopics: string[];
  addRecentTopic: (topic: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      selectedPersona: null,
      currentRoastId: null,
      currentSession: null,
      isGenerating: false,
      messages: [],
      isLoading: false,
      recentTopics: [],

      // Actions
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null, selectedPersona: null, currentRoastId: null, currentSession: null, messages: [] }),

      setSelectedPersona: (persona) => set({ selectedPersona: persona }),

      setCurrentRoastId: (id) => set({ currentRoastId: id }),

      setCurrentSession: (session) => set({ currentSession: session }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      updateLastMessage: (content, role) =>
        set((state) => {
          const lastMessage = state.messages[state.messages.length - 1];
          if (lastMessage && (!role || lastMessage.role === role)) {
            return {
              messages: state.messages.map((msg, idx) =>
                idx === state.messages.length - 1
                  ? { ...msg, content: msg.content + content }
                  : msg
              ),
            };
          }
          return {
            messages: [
              ...state.messages,
              { role: role ?? '', content, isUser: false },
            ],
          };
        }),

      clearMessages: () => set({ messages: [] }),

      setIsLoading: (isLoading) => set({ isLoading }),

      addRecentTopic: (topic) =>
        set((state) => ({
          recentTopics: [topic, ...state.recentTopics.filter((t) => t !== topic)].slice(0, 10),
        })),
    }),
    {
      name: 'ai-comedy-storage',
      partialize: (state) => ({
        selectedPersona: state.selectedPersona,
        recentTopics: state.recentTopics,
      }),
    }
  )
);
