// Vector config is SEPARATE from the chat config on purpose: the two can be
// different providers. The default setup runs chat through the Claude CLI proxy
// (which only speaks chat completion) and vectors through a local TEI container
// serving a HuggingFace model — pointing both at one base URL breaks embeddings.
export interface EmbeddingConfig {
  baseUrl: string;
  model: string;
  // TEI ignores auth, but the OpenAI SDK refuses to build a client without a key.
  apiKey: string;
  // Only OpenAI's Matryoshka models accept this; omitted for fixed-size models
  // like e5, which reject the parameter.
  dimensions?: number;
  // e5 requires every input to carry an "query: "/"passage: " prefix — without it
  // the vectors are measurably worse. Other models want an empty prefix.
  inputPrefix: string;
}

export const EMBEDDING_CONFIG = Symbol('EMBEDDING_CONFIG');
