import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";
import {
  listQuestoes,
  getQuestao,
  createQuestao,
  updateQuestao,
  deleteQuestao,
  type CreateQuestaoInput,
} from "./questions-api";

vi.mock("./api", () => ({ apiFetch: vi.fn(() => Promise.resolve("RESULT")) }));
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => mockApiFetch.mockClear());

const input: CreateQuestaoInput = { tipo: "VERDADEIRO_FALSO", enunciado: "E", gabarito: "V" };

describe("questions-api", () => {
  it("lists questions", async () => {
    await listQuestoes();
    expect(mockApiFetch).toHaveBeenCalledWith("/questions");
  });

  it("gets a question by id", async () => {
    await getQuestao("q1");
    expect(mockApiFetch).toHaveBeenCalledWith("/questions/q1");
  });

  it("creates a question with a POST body", async () => {
    await createQuestao(input);
    expect(mockApiFetch).toHaveBeenCalledWith("/questions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  });

  it("updates a question with a PATCH body", async () => {
    await updateQuestao("q1", { gabarito: "F" });
    expect(mockApiFetch).toHaveBeenCalledWith("/questions/q1", {
      method: "PATCH",
      body: JSON.stringify({ gabarito: "F" }),
    });
  });

  it("deletes a question", async () => {
    await deleteQuestao("q1");
    expect(mockApiFetch).toHaveBeenCalledWith("/questions/q1", { method: "DELETE" });
  });
});
