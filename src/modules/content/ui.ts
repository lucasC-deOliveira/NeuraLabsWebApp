// Presentation surface of the `content` shared kernel — the React concept picker
// and tree. Kept separate from the pure "@/modules/content" barrel so
// domain/application consumers never transitively depend on React.
export { ConceptSelector } from "./presentation/components/ConceptSelector";
export { NewConceptCard } from "./presentation/components/NewConceptCard";
export { AssuntoNode, type ExpandKind, type TreeCtx } from "./presentation/components/ConceptTree";
