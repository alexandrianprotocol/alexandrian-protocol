declare module "json-canonicalize" {
  /** RFC 8785 JCS canonicalization. Returns deterministic JSON string. */
  function canonicalize(obj: unknown): string;
  export default canonicalize;
}
