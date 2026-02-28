export type ArtifactMode = "public" | "encrypted";

export type PublicArtifactEnvelope = {
  protocolVersion: string;
  mode: "public";
  artifactHash: string;
  artifactURI?: string;
  parents: string[];
  metadata?: Record<string, unknown>;
};

export type EncryptedArtifactEnvelope = {
  protocolVersion: string;
  mode: "encrypted";
  ciphertextHash: string;
  ciphertextURI?: string;
  encryption?: { alg: string; keyPolicy: string };
  parents: string[];
  metadata?: Record<string, unknown>;
};
