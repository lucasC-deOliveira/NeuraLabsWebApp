// Fitness functions de arquitetura (Hexagonal/Clean) para o código novo em
// src/modules/**. Falham o build se a regra de dependência for violada.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-sem-saida',
      severity: 'error',
      comment: 'domain/ não pode depender de application, infrastructure ou interface',
      from: { path: 'src/modules/[^/]+/domain/' },
      to: { path: 'src/modules/[^/]+/(application|infrastructure|interface)/' },
    },
    {
      name: 'domain-sem-frameworks',
      severity: 'error',
      comment: 'domain/ é puro: sem Prisma, OpenAI ou NestJS',
      from: { path: 'src/modules/[^/]+/domain/' },
      to: { path: 'node_modules/(@prisma|prisma|openai|@nestjs)' },
    },
    {
      name: 'application-sem-infra',
      severity: 'error',
      comment: 'application/ depende de ports (domain), não de infrastructure/interface',
      from: { path: 'src/modules/[^/]+/application/' },
      to: { path: 'src/modules/[^/]+/(infrastructure|interface)/' },
    },
    {
      name: 'sem-cruzar-contexto',
      severity: 'error',
      comment: 'um bounded context não importa o domínio de outro',
      from: { path: 'src/modules/([^/]+)/' },
      to: {
        path: 'src/modules/([^/]+)/domain/',
        pathNot: ['src/modules/$1/'],
      },
    },
    {
      name: 'sem-ciclos',
      severity: 'error',
      comment: 'dependências circulares são proibidas',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
