import { ok, err, wrapError } from "@alexandrian/sdk-core";
import type { Result } from "@alexandrian/sdk-core";

export class DatasetClient {
  constructor(private readonly baseUrl: string) {}

  list(): string[] {
    return [this.baseUrl];
  }

  listResult(): Result<string[]> {
    try {
      return ok(this.list());
    } catch (caught) {
      return err(wrapError(caught));
    }
  }
}
