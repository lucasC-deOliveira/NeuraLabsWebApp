-- Add usuarioId to assuntos (existing records → first user)
ALTER TABLE assuntos ADD COLUMN id_usuario TEXT;
UPDATE assuntos SET id_usuario = (SELECT id FROM usuarios LIMIT 1) WHERE id_usuario IS NULL;

-- Add usuarioId to nodes_conhecimento
ALTER TABLE nodes_conhecimento ADD COLUMN id_usuario TEXT;
UPDATE nodes_conhecimento SET id_usuario = (SELECT id FROM usuarios LIMIT 1) WHERE id_usuario IS NULL;
