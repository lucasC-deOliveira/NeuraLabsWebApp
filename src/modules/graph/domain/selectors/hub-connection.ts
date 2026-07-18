// "Conectar todos a X": com N nós selecionados, liga todos ao nó-hub (o que
// recebeu o botão direito) com UMA relação. Lógica pura — quem grava é o
// use-case; aqui só se decide o que pode ser ligado e em que direção.
import { getAllowedRelations, getCanonicalDirection } from "../services/relation-rules";

export interface HubMember {
  id: string;
  type: string;
}

export interface PlannedEdge {
  sourceNodeId: string;
  targetNodeId: string;
  tipoRelacao: string;
}

export interface HubConnectionPlan {
  edges: PlannedEdge[];
  // Membros descartados por não aceitarem a relação com o hub. Contados para a UI
  // poder dizer "3 de 10 ignorados" em vez de criar menos arestas em silêncio.
  skipped: number;
}

/**
 * Relações que TODOS os membros podem ter com o hub. Só estas são oferecidas:
 * uma relação válida para parte da seleção criaria arestas pela metade.
 * @example sharedRelationsWithHub({ id: "t1", type: "TOPICO" }, membros)
 */
export function sharedRelationsWithHub(hub: HubMember, members: HubMember[]): string[] {
  const others = membersWithoutHub(hub, members);
  if (!others.length) return [];
  const perMember = others.map((m) => getAllowedRelations(hub.type, m.type));
  return perMember[0].filter((relacao) => perMember.every((allowed) => allowed.includes(relacao)));
}

/**
 * Uma aresta por membro, na direção canônica da relação.
 * @example planHubConnections(hub, membros, "PERTENCE_A")
 */
export function planHubConnections(
  hub: HubMember,
  members: HubMember[],
  tipoRelacao: string,
): HubConnectionPlan {
  const edges: PlannedEdge[] = [];
  let skipped = 0;
  for (const member of membersWithoutHub(hub, members)) {
    const edge = toCanonicalEdge(hub, member, tipoRelacao);
    if (edge) edges.push(edge);
    else skipped++;
  }
  return { edges, skipped };
}

function membersWithoutHub(hub: HubMember, members: HubMember[]): HubMember[] {
  return members.filter((m) => m.id !== hub.id);
}

// A direção não é escolha do usuário: PERTENCE_A vai do CONCEITO para o TOPICO,
// nunca ao contrário. As regras do domínio decidem qual ponta é a origem.
function toCanonicalEdge(hub: HubMember, member: HubMember, tipoRelacao: string): PlannedEdge | null {
  const direction = getCanonicalDirection(hub.type, member.type, tipoRelacao);
  if (!direction) return null;
  const [sourceType] = direction;
  const hubIsSource = sourceType === hub.type;
  return {
    sourceNodeId: hubIsSource ? hub.id : member.id,
    targetNodeId: hubIsSource ? member.id : hub.id,
    tipoRelacao,
  };
}
