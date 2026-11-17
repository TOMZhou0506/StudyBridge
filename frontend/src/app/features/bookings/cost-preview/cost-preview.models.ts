// A3 Task 12: Defines the standalone cost service request and response data.
export interface CostRequest {
  agreedRate: number;
  durationMinutes: number;
}

// Represents the calculated session cost returned by the service.
export interface CostBreakdown {
  subtotal: number;
  platformFee: number;
  total: number;
}
