// Fitness functions de arquitetura (Hexagonal/DDD) para o código novo do frontend
// em src/modules/**. Falham o build se a regra de dependência for violada.
//
// FASE 0 (fundação): só as regras que JÁ passam no código atual (graph/vr) —
// sem ciclos, domain não importa outras camadas, sem cruzar domínio de outro módulo.
// FASE 1a endurece: domain/application puros (sem React nem @/lib/*-api), e
// @/lib/*-api só acessível pela camada infra/ (ACL HTTP). Ver o plano.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
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
