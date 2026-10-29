/**
 * Extension interfaces for licensed partners (master prompt §12).
 * v1 ships mock / no-op implementations only. Nothing here moves real money,
 * holds assets, or verifies revenue.
 */

// ── Payments (fixed-price sponsored placements) ─────────────────────────────
export type CheckoutRequest = { invoiceId: string; amountCents: number; currency: string; description: string; customerEmail: string };
export type CheckoutSession = { provider: string; sessionId: string; redirectUrl: string };

export interface PaymentProvider {
  readonly name: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Verifies webhook signature and returns a normalized event, or null when invalid. */
  parseWebhook(rawBody: string, signature: string | null): Promise<{ eventId: string; type: "paid" | "failed"; invoiceId: string } | null>;
}

/** Mock provider: no network, no credentials. Real Stripe adapter requires explicit approval + security review. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    return { provider: this.name, sessionId: `mock_${req.invoiceId}`, redirectUrl: `/advertise/checkout/mock?invoice=${req.invoiceId}` };
  }
  async parseWebhook(): Promise<null> {
    return null; // mock payments are confirmed in-app, never via webhook
  }
}

// ── Out of scope in v1: interfaces only ─────────────────────────────────────
export interface EscrowProvider {
  readonly name: string;
  /** Not implemented in v1 — art and acquisitions are inquiry-only. */
  openEscrow(_: { listingId: string; amountCents: number; currency: string }): Promise<never>;
}

export interface VerificationProvider {
  readonly name: string;
  verifyCompany(_: { companyId: string; legalName: string; countryIso2: string; registrationNumber?: string }): Promise<{ status: "verified" | "unverified" | "manual_review"; reference?: string }>;
}

export interface KycProvider {
  readonly name: string;
  startCheck(_: { userId: string }): Promise<{ checkId: string; url: string }>;
}

export interface SearchProvider {
  readonly name: string;
  search(q: string, opts: { type: string; limit: number }): Promise<Array<{ type: string; id: string }>>;
}

export class ManualVerificationProvider implements VerificationProvider {
  readonly name = "manual";
  async verifyCompany() {
    return { status: "manual_review" as const };
  }
}

export class NotImplementedEscrow implements EscrowProvider {
  readonly name = "none";
  async openEscrow(): Promise<never> {
    throw new Error("Escrow is out of scope for PATRONOS v1. Integrate a licensed partner behind this interface.");
  }
}

export const providers = {
  payment: new MockPaymentProvider() as PaymentProvider,
  verification: new ManualVerificationProvider() as VerificationProvider,
  escrow: new NotImplementedEscrow() as EscrowProvider,
};
