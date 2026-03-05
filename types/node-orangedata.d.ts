declare module "node-orangedata" {
  export class Order {
    constructor(options: Record<string, unknown>);
    addPosition(options: Record<string, unknown>): Order;
    addPayment(options: { type: number; amount: number }): Order;
    validate(): void;
    id?: string;
  }

  export class OrangeData {
    constructor(options: Record<string, unknown>);
    sendOrder(order: Order): Promise<unknown>;
  }
}

declare module "node-orangedata/lib/errors" {
  export class OrangeDataError extends Error {
    errors?: string[];
  }
  export class OrangeDataApiError extends Error {
    errors?: string[];
  }
}
