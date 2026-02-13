export type RoomStatus = 'waiting' | 'active' | 'finished';

export interface RoomParticipant {
  id: string;
  userId: string | null;
  displayName: string;
  bio?: string;
  interests?: string[];
  personaId: string;
  personaLabel: string;
  isBot: boolean;
  isHost: boolean;
  joinedAt: string;
}

export interface RoomSnapshot {
  id: string;
  name: string;
  status: RoomStatus;
  topic: string | null;
  maxParticipants: number;
  rounds: number;
  hostUserId: string;
  hostName: string;
  participants: RoomParticipant[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface RoomMessage {
  id: string;
  round: number;
  participantId: string;
  role: string;
  content: string;
  isBot: boolean;
  isHost: boolean;
  timestamp: string;
}

export interface RoomSessionResult {
  sessionId: string;
  topic: string;
  participants: string[];
  messages: RoomMessage[];
  completedAt: string;
  totalRounds?: number;
  winnerId?: string;
  winnerName?: string;
  scores?: RoomScoreItem[];
}

export interface RoomScoreItem {
  participantId: string;
  role: string;
  score: number;
  isAlive: boolean;
  isGhost: boolean;
}
