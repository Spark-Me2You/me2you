export type ClaimPayload = {
  version: '1.0';
  type: string;
  display: {
    title: string;
    description: string;
    icon?: string;
  };
  data: Record<string, unknown>;
};

export type GeneratedClaim = {
  token_id: string;
  claim_url: string;
  expires_at: string;
};

export type ClaimResult = {
  success: true;
  token_id: string;
  payload: ClaimPayload;
};
