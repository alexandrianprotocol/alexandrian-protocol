import { ok, err, wrapError } from "@alexandrian/sdk-core";
import type { Result } from "@alexandrian/sdk-core";

export class AlexandrianClient {
  constructor(private readonly baseUrl: string) {}

  ping(): string {
    return `ok:${this.baseUrl}`;
  }

  pingResult(): Result<string> {
    try {
      return ok(this.ping());
    } catch (caught) {
      return err(wrapError(caught));
    }
  }
}
