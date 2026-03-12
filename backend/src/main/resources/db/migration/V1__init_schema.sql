-- ============================================================================
-- V1__init_schema.sql
-- FlowLite — Initial schema for all 14 entity tables
-- Compatible with MySQL 8 and H2 (MODE=MYSQL)
--
-- TABLE ORDER (dependency-safe):
--   1. organizations      (no deps)
--   2. teams              (depends on: organizations — created_by_id added later)
--   3. users              (depends on: organizations, teams)
--   4. teams ALTER        (deferred FK: created_by_id → users)
--   5. boards             (depends on: organizations, users)
--   6. projects           (depends on: organizations, users)
--   7. tasks              (depends on: boards, projects, users)
--   8. task_comments      (depends on: tasks, users)
--   9. task_templates     (depends on: organizations, users)
--   10. notifications     (depends on: users)
--   11. audit_logs        (no FK deps)
--   12. login_attempts    (no FK deps)
--   13. email_verifications (no FK deps)
--   14. password_resets   (depends on: users)
--   15. revoked_tokens    (no FK deps)
-- ============================================================================

-- ==================== 1. ORGANIZATIONS ====================
CREATE TABLE IF NOT EXISTS organizations (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100)    NOT NULL,
    slug            VARCHAR(100)    NULL,
    active          TINYINT(1)      NOT NULL DEFAULT 1,
    description     VARCHAR(500)    NULL,
    created_at      DATETIME(6)     NOT NULL,
    updated_at      DATETIME(6)     NOT NULL,
    deleted         TINYINT(1)      NOT NULL DEFAULT 0,
    deleted_at      DATETIME(6)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_org_name      UNIQUE (name),
    CONSTRAINT uk_org_slug      UNIQUE (slug)
);

-- ==================== 2. TEAMS (without created_by_id FK — users doesn't exist yet) ====================
CREATE TABLE IF NOT EXISTS teams (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(255)    NOT NULL,
    organization_id BIGINT          NOT NULL,
    created_by_id   BIGINT          NULL,
    created_at      DATETIME(6)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_team_org      FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- ==================== 3. USERS ====================
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    username        VARCHAR(255)    NOT NULL,
    first_name      VARCHAR(255)    NULL,
    last_name       VARCHAR(255)    NULL,
    password        VARCHAR(255)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    role            VARCHAR(50)     NOT NULL,
    organization_id BIGINT          NOT NULL,
    team_id         BIGINT          NULL,
    active          TINYINT(1)      NOT NULL DEFAULT 1,
    email_verified  TINYINT(1)      NOT NULL DEFAULT 0,
    email_verified_at DATETIME(6)   NULL,
    job_title       VARCHAR(100)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_user_username UNIQUE (username),
    CONSTRAINT uk_user_email    UNIQUE (email),
    CONSTRAINT fk_user_org      FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_user_team     FOREIGN KEY (team_id)          REFERENCES teams(id)
);

CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_org   ON users(organization_id);

-- ==================== 4. DEFERRED FK: teams.created_by_id → users ====================
ALTER TABLE teams ADD CONSTRAINT fk_team_creator FOREIGN KEY (created_by_id) REFERENCES users(id);

-- ==================== 5. BOARDS ====================
CREATE TABLE IF NOT EXISTS boards (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100)    NOT NULL,
    description     TEXT            NULL,
    board_type      VARCHAR(20)     NOT NULL,
    organization_id BIGINT          NOT NULL,
    owner_id        BIGINT          NULL,
    board_color     VARCHAR(7)      NULL,
    board_icon      VARCHAR(50)     NULL,
    is_default      TINYINT(1)      NULL DEFAULT 0,
    is_active       TINYINT(1)      NULL DEFAULT 1,
    display_order   INT             NULL DEFAULT 0,
    created_at      DATETIME(6)     NOT NULL,
    updated_at      DATETIME(6)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_board_org     FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_board_owner   FOREIGN KEY (owner_id)        REFERENCES users(id)
);

CREATE INDEX idx_board_org_type ON boards(organization_id, board_type);
CREATE INDEX idx_board_owner    ON boards(owner_id);

-- ==================== 6. PROJECTS ====================
CREATE TABLE IF NOT EXISTS projects (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(255)    NOT NULL,
    description     VARCHAR(1000)   NULL,
    start_date      DATE            NULL,
    status          VARCHAR(255)    NOT NULL,
    organization_id BIGINT          NOT NULL,
    owner_id        BIGINT          NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_project_org   FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_project_owner FOREIGN KEY (owner_id)        REFERENCES users(id)
);

-- ==================== 7. TASKS ====================
CREATE TABLE IF NOT EXISTS tasks (
    id               BIGINT          NOT NULL AUTO_INCREMENT,
    title            VARCHAR(255)    NOT NULL,
    description      VARCHAR(2000)   NULL,
    priority         VARCHAR(255)    NOT NULL,
    status           VARCHAR(50)     NOT NULL,
    workflow_version VARCHAR(255)    NOT NULL DEFAULT 'v1-default',
    project_id       BIGINT          NULL,
    assignee_id      BIGINT          NULL,
    approver_id      BIGINT          NULL,
    created_by_id    BIGINT          NULL,
    board_id         BIGINT          NOT NULL,
    due_date         DATE            NULL,
    created_at       DATETIME(6)     NULL,
    completed_at     DATETIME(6)     NULL,
    cancelled_at     DATETIME(6)     NULL,
    archived_at      DATETIME(6)     NULL,
    deleted_at       DATETIME(6)     NULL,
    previous_status  VARCHAR(255)    NULL,
    version          BIGINT          NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_task_project   FOREIGN KEY (project_id)    REFERENCES projects(id),
    CONSTRAINT fk_task_assignee  FOREIGN KEY (assignee_id)   REFERENCES users(id),
    CONSTRAINT fk_task_approver  FOREIGN KEY (approver_id)   REFERENCES users(id),
    CONSTRAINT fk_task_creator   FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_task_board     FOREIGN KEY (board_id)      REFERENCES boards(id)
);

CREATE INDEX idx_task_status       ON tasks(status);
CREATE INDEX idx_task_board        ON tasks(board_id);
CREATE INDEX idx_task_assignee     ON tasks(assignee_id);
CREATE INDEX idx_task_created_by   ON tasks(created_by_id);
CREATE INDEX idx_task_board_status ON tasks(board_id, status);

-- ==================== 8. TASK COMMENTS ====================
CREATE TABLE IF NOT EXISTS task_comments (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    task_id     BIGINT          NOT NULL,
    author_id   BIGINT          NOT NULL,
    comment     VARCHAR(2000)   NOT NULL,
    type        VARCHAR(50)     NOT NULL,
    created_at  DATETIME(6)     NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_comment_task   FOREIGN KEY (task_id)   REFERENCES tasks(id),
    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES users(id)
);

-- ==================== 9. TASK TEMPLATES ====================
CREATE TABLE IF NOT EXISTS task_templates (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    name                VARCHAR(255)    NOT NULL,
    default_title       VARCHAR(255)    NOT NULL,
    default_description VARCHAR(2000)   NULL,
    default_priority    VARCHAR(255)    NOT NULL,
    organization_id     BIGINT          NOT NULL,
    created_by_id       BIGINT          NULL,
    created_at          DATETIME(6)     NULL,
    active              TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_template_org     FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_template_creator FOREIGN KEY (created_by_id)   REFERENCES users(id)
);

-- ==================== 10. NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS notifications (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    recipient_id    BIGINT          NOT NULL,
    content         VARCHAR(255)    NOT NULL,
    type            VARCHAR(50)     NOT NULL,
    `read`          TINYINT(1)      NOT NULL DEFAULT 0,
    related_task_id BIGINT          NULL,
    created_at      DATETIME(6)     NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_notif_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- ==================== 11. AUDIT LOGS ====================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    action      VARCHAR(255)    NOT NULL,
    entity      VARCHAR(255)    NOT NULL,
    timestamp   DATETIME(6)     NOT NULL,
    username    VARCHAR(255)    NULL,
    details     VARCHAR(255)    NULL,
    PRIMARY KEY (id)
);

-- ==================== 12. LOGIN ATTEMPTS ====================
CREATE TABLE IF NOT EXISTS login_attempts (
    id           BIGINT          NOT NULL AUTO_INCREMENT,
    email        VARCHAR(100)    NOT NULL,
    ip_address   VARCHAR(50)     NOT NULL,
    successful   TINYINT(1)      NOT NULL,
    attempt_time DATETIME(6)     NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX idx_attempt_email ON login_attempts(email);
CREATE INDEX idx_attempt_ip    ON login_attempts(ip_address);

-- ==================== 13. EMAIL VERIFICATIONS ====================
CREATE TABLE IF NOT EXISTS email_verifications (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    email       VARCHAR(100)    NOT NULL,
    token       VARCHAR(100)    NOT NULL,
    expires_at  DATETIME(6)     NOT NULL,
    verified    TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  DATETIME(6)     NOT NULL,
    verified_at DATETIME(6)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_verification_token UNIQUE (token)
);

CREATE INDEX idx_verification_token ON email_verifications(token);
CREATE INDEX idx_verification_email ON email_verifications(email);

-- ==================== 14. PASSWORD RESETS ====================
CREATE TABLE IF NOT EXISTS password_resets (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    user_id     BIGINT          NOT NULL,
    token       VARCHAR(100)    NOT NULL,
    expires_at  DATETIME(6)     NOT NULL,
    used        TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  DATETIME(6)     NOT NULL,
    used_at     DATETIME(6)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_reset_token    UNIQUE (token),
    CONSTRAINT fk_reset_user     FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_reset_token ON password_resets(token);
CREATE INDEX idx_reset_user  ON password_resets(user_id);

-- ==================== 15. REVOKED TOKENS ====================
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    token       VARCHAR(500)    NOT NULL,
    expires_at  DATETIME(6)     NOT NULL,
    revoked_at  DATETIME(6)     NOT NULL,
    reason      VARCHAR(255)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_revoked_token UNIQUE (token)
);

CREATE INDEX idx_revoked_token ON revoked_tokens(token);
