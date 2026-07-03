// Fitness functions de arquitetura (Hexagonal/DDD) para o código novo do frontend
// em src/modules/**. Falham o build se a regra de dependência for violada.
//
// FASE 0 (fundação): regras globais que JÁ passam em todo src/modules (graph/vr) —
// sem ciclos, domain não importa outras camadas, sem cruzar domínio de outro módulo.
// FASE 1a endurece o módulo `graph` (ratchet — os demais módulos aderem ao serem
// refatorados): domain/application puros (sem React nem @/lib/*-api) e @/lib/*-api
// só acessível pela camada infra/ (ACL HTTP). Ver o plano.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "graph-api-so-via-infra",
      severity: "error",
      comment:
        "graph: a borda HTTP (@/lib/*-api) só pode ser importada pela camada infra/ " +
        "(testes podem mockar a borda diretamente)",
      from: {
        path: "src/modules/graph/",
        pathNot: ["src/modules/graph/infra/", "\\.(test|spec)\\.(ts|tsx)$"],
      },
      to: { path: "src/lib/[^/]+-api\\.(ts|tsx)$" },
    },
    {
      name: "graph-domain-application-sem-react",
      severity: "error",
      comment: "graph: domain/ e application/ são puros — não importam React",
      from: { path: "src/modules/graph/(domain|application)/" },
      to: { path: "node_modules/react(-dom)?/" },
    },
    {
      name: "graph-application-sem-infra-presentation",
      severity: "error",
      comment: "graph: application/ depende só de domain e ports, não de infra/presentation",
      from: { path: "src/modules/graph/application/" },
      to: { path: "src/modules/graph/(infra|presentation)/" },
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
      comment: "um módulo não importa o domínio de outro módulo",
      from: { path: "src/modules/([^/]+)/" },
      to: {
        path: "src/modules/([^/]+)/domain/",
        pathNot: ["src/modules/$1/"],
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
