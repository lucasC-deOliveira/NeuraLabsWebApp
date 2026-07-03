// Fitness functions de arquitetura (Hexagonal/DDD) para o código novo do frontend
// em src/modules/**. Falham o build se a regra de dependência for violada.
//
// FASE 0 (fundação): regras globais que JÁ passam em todo src/modules (graph/vr) —
// sem ciclos, domain não importa outras camadas, sem cruzar domínio de outro módulo.
// FASE 1a endureceu o módulo `graph`; FASE 3 GENERALIZA as regras hexagonais a
// TODOS os módulos (ratchet concluído): domain/application puros (sem React nem
// @/lib/*-api) e @/lib/*-api só acessível pela camada infra/ (ACL HTTP).
//
// Exceção documentada: `vr` é um renderizador 3D alternativo do domínio `graph`
// (não um bounded context próprio) — consome a superfície pública do graph
// (infra/http port + domain types). Ver `vr-consome-graph` abaixo.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "api-so-via-infra",
      severity: "error",
      comment:
        "a borda HTTP (@/lib/*-api) só pode ser importada pela camada infra/ de um " +
        "módulo (ACL HTTP; testes podem mockar a borda diretamente)",
      from: {
        path: "src/modules/[^/]+/",
        pathNot: ["src/modules/[^/]+/infra/", "\\.(test|spec)\\.(ts|tsx)$"],
      },
      to: { path: "src/lib/[^/]+-api\\.(ts|tsx)$" },
    },
    {
      name: "domain-application-sem-react",
      severity: "error",
      comment: "domain/ e application/ são puros — não importam React",
      from: { path: "src/modules/[^/]+/(domain|application)/" },
      to: { path: "node_modules/react(-dom)?/" },
    },
    {
      name: "application-sem-infra-presentation",
      severity: "error",
      comment: "application/ depende só de domain e ports, não de infra/presentation",
      from: { path: "src/modules/([^/]+)/application/" },
      to: { path: "src/modules/$1/(infra|presentation)/" },
    },
    {
      name: "domain-sem-camadas",
      severity: "error",
      comment: "domain/ não pode depender de application, infra ou presentation",
      from: { path: "src/modules/[^/]+/domain/" },
      to: { path: "src/modules/[^/]+/(application|infra|presentation)/" },
    },
    {
      name: "sem-cruzar-contexto",
      severity: "error",
      comment:
        "um módulo não importa o domínio de outro módulo. Exceção: vr → graph " +
        "(vr é um renderizador alternativo do graph, não um contexto próprio)",
      from: { path: "src/modules/([^/]+)/", pathNot: ["src/modules/vr/"] },
      to: {
        path: "src/modules/([^/]+)/domain/",
        pathNot: ["src/modules/$1/"],
      },
    },
    {
      name: "vr-so-consome-graph",
      severity: "error",
      comment:
        "vr só pode cruzar contexto para o graph (do qual é um renderizador 3D); " +
        "nenhum outro módulo externo",
      from: { path: "src/modules/vr/" },
      to: {
        path: "src/modules/([^/]+)/(domain|application|infra|presentation)/",
        pathNot: ["src/modules/(vr|graph)/"],
      },
    },
    {
      name: "sem-ciclos",
      severity: "error",
      comment: "dependências circulares são proibidas",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require"] },
  },
};
