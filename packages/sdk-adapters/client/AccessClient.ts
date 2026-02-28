import { ok, err, wrapError } from "@alexandrian/sdk-core";
import type { Result } from "@alexandrian/sdk-core";

export class AccessClient {
  constructor(private readonly baseUrl: string) {}

  check(subject: string): string {
    return `${this.baseUrl}:${subject}`;
  }

  checkResult(subject: string): Result<string> {
    try {
      return ok(this.check(subject));
    } catch (caught) {
      return err(wrapError(caught));
    }
  }
}
