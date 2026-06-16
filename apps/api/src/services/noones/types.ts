export interface NoOnesApiResponse<T = unknown> {
  status: "success" | "error";
  timestamp: number;
  data?: T;
  error?: { code: number; message: string };
}

export interface NoOnesOffer {
  offer_id: string;
  offer_hash?: string;
  margin?: number;
  fiat_price_per_crypto?: number;
  fiat_amount_range_min?: number;
  fiat_amount_range_max?: number;
  fiat_currency_code?: string;
  currency_code?: string;
  crypto_currency_code?: string;
  payment_method_slug?: string;
  payment_method_name?: string;
  offer_type?: string;
  active?: boolean;
}

export interface NoOnesOfferAllData {
  count: number;
  totalCount?: number;
  offers: NoOnesOffer[];
}

export interface NoOnesTradeStartData {
  success: boolean;
  trade_hash: string;
}

export interface NoOnesTrade {
  trade_hash: string;
  status?: string;
  trade_status?: string;
  offer_hash?: string;
  fiat_amount?: number;
  fiat_currency_code?: string;
  crypto_amount?: number;
  crypto_currency_code?: string;
  crypto_amount_total?: number;
}

export interface NoOnesTradeGetData {
  trade: NoOnesTrade;
}

export interface NoOnesWebhookPayload {
  type?: string;
  event_type?: string;
  trade_hash?: string;
  trade?: NoOnesTrade;
  data?: Record<string, unknown>;
}
