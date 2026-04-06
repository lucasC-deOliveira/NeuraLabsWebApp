import { CreateNotaUseCase } from "./create-nota.use-case";
import type { NotaRepository } from "../../domain/repositories/nota-repository";

const mockRepository: NotaRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  delete: vi.fn(),
};

const concepts = [
  { id: "c1", nome: "Soberania" },
  { id: "c2", nome: "Federalismo" },
];

describe("CreateNotaUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a nota with parsed sections and matched concepts", async () => {
    const useCase = new CreateNotaUseCase(mockRepository, concepts);
    const input = {
      rawText:
        "# Soberania\nSoberania: O poder supremo do Estado\n\n# Federalismo\nFederalismo: Organização em entes federados",
      userId: "user-1",
    };

    const result = await useCase.execute(input);

    expect(result.notaId).toBeDefined();
    expect(result.matchedConcepts.length).toBe(2);
    expect(result.matchedConcepts.map((m) => m.term)).toContain("Soberania");
    expect(result.matchedConcepts.map((m) => m.term)).toContain("Federalismo");
  });

  it("should call repository save", async () => {
    const useCase = new CreateNotaUseCase(mockRepository, concepts);
    const input = { rawText: "texto aqui", userId: "user-1" };

    await useCase.execute(input);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it("should create nota with optional title", async () => {
    const useCase = new CreateNotaUseCase(mockRepository, concepts);
    const input = { rawText: "texto", userId: "user-1", titulo: "Aula 1" };

    const result = await useCase.execute(input);

    expect(result.notaId).toBeDefined();
  });

  it("should return empty matchedConcepts when no terms match", async () => {
    const useCase = new CreateNotaUseCase(mockRepository, concepts);
    const input = {
      rawText: "# Conceito Inexistente XYZ\nBlablabla",
      userId: "user-1",
    };

    const result = await useCase.execute(input);

    expect(result.matchedConcepts).toEqual([]);
  });
});
