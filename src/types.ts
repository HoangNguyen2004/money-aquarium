import type { Game } from './game/rules';

export type TxType = 'expense' | 'income';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number; // VND
  category: string;
  note: string;
  date: string; // YYYY-MM-DD (giờ địa phương)
  createdAt: number;
  source: 'manual' | 'scan' | 'bot';
  photoUri?: string;
}

export interface Plan {
  income: number; // thu nhập dự kiến mỗi tháng
  savings: number; // mục tiêu tiết kiệm mỗi tháng
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'bot';
  text: string;
  txIds?: string[];
  imageUri?: string;
}

export interface AppState {
  ready: boolean;
  transactions: Transaction[];
  budgets: Record<string, number>; // hạn mức chi theo danh mục / tháng
  plan: Plan;
  chat: ChatMsg[];
  hasKey: boolean;
  themeId: string;
  game: Game; // tab Quán của tôi
  background: string | null; // ảnh nền: tên file trong thư mục tài liệu của app (trên web là URI của ảnh)
}
