-- Arquivo: esquema.sql
-- Descrição: definição do esquema do banco de dados relacional (SQLite) para
--            o sistema de clínica médica. Pertence à camada de persistência/dados.


-- Garante que chaves estrangeiras sejam validadas
PRAGMA foreign_keys = ON;

-- 1. Tabela de usuários (autenticação e perfis)

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    papel TEXT NOT NULL CHECK (papel IN ('paciente', 'medico')),
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);


-- 2. Tabela de médicos (perfil profissional e especialidade)

CREATE TABLE IF NOT EXISTS medicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER UNIQUE NOT NULL,
    crm TEXT UNIQUE NOT NULL,
    especialidade TEXT NOT NULL,
    preco_consulta NUMERIC NOT NULL CHECK (preco_consulta >= 0),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);


-- 3. Tabela de consultas (agendamento - recurso com CRUD completo)

CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL,
    medico_id INTEGER NOT NULL,
    data_hora TEXT NOT NULL, -- Formato padronizado: YYYY-MM-DD HH:MM:00
    status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'concluida', 'cancelada')),
    observacoes TEXT,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE RESTRICT,
    
    -- REGRA DE NEGÓCIO PRINCIPAL NO BANCO:
    -- A restrição UNIQUE (medico_id, data_hora) garante a nível de integridade física
    -- que o mesmo médico nunca terá duas consultas simultâneas no mesmo horário,
    -- protegendo o sistema contra requisições concorrentes.
    CONSTRAINT uq_medico_data_hora UNIQUE (medico_id, data_hora)
);

-- Índices para otimização de consultas e joins frequentes
CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_medico ON consultas(medico_id);
CREATE INDEX IF NOT EXISTS idx_consultas_data_hora ON consultas(data_hora);
