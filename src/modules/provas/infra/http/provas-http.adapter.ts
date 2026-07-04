// ACL over @/lib/provas-api. Only this infra adapter knows the lib boundary.
import {
  listProvas,
  getProva,
  createProva,
  deleteProva,
  parseProvaUpload,
  createProvaFromParsed,
} from "@/lib/provas-api";
import type { ProvasPort } from "../../application/ports/provas.port";
import type {
  ProvaListItem,
  ProvaDetail,
  CreateProvaInput,
  CreateFromParsedInput,
  ParseUploadResult,
} from "../../domain/prova.types";

export class HttpProvasAdapter implements ProvasPort {
  listProvas(): Promise<ProvaListItem[]> {
    return listProvas();
  }

  getProva(id: string): Promise<ProvaDetail> {
    return getProva(id);
  }

  createProva(input: CreateProvaInput): Promise<{ provaId: string }> {
    return createProva(input);
  }

  async deleteProva(id: string): Promise<void> {
    await deleteProva(id);
  }

  parseUpload(provaFile: File, gabaritoFile: File): Promise<ParseUploadResult> {
    return parseProvaUpload(provaFile, gabaritoFile);
  }

  createFromParsed(input: CreateFromParsedInput): Promise<{ provaId: string }> {
    return createProvaFromParsed(input);
  }
}
