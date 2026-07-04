// Port the provas presentation depends on. The infra/ HTTP adapter implements it
// over @/lib/provas-api (ACL); tests mock the boundary.
import type {
  ProvaListItem,
  ProvaDetail,
  CreateProvaInput,
  CreateFromParsedInput,
  ParseUploadResult,
} from "../../domain/prova.types";

export interface ProvasPort {
  listProvas(): Promise<ProvaListItem[]>;
  getProva(id: string): Promise<ProvaDetail>;
  createProva(input: CreateProvaInput): Promise<{ provaId: string }>;
  deleteProva(id: string): Promise<void>;
  parseUpload(provaFile: File, gabaritoFile: File): Promise<ParseUploadResult>;
  createFromParsed(input: CreateFromParsedInput): Promise<{ provaId: string }>;
}
