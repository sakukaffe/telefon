import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699876543210 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'agent', 'user');
      CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role user_role NOT NULL DEFAULT 'user',
        status user_status NOT NULL DEFAULT 'active',
        language VARCHAR(10) DEFAULT 'de-DE',
        timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
        time_profile_id UUID,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
      CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
    `);

    // Create extensions table
    await queryRunner.query(`
      CREATE TYPE extension_type AS ENUM ('sip', 'webrtc', 'virtual');
      CREATE TYPE extension_status AS ENUM ('active', 'inactive');
      CREATE TYPE call_recording_policy AS ENUM ('off', 'on_demand', 'always');
      CREATE TYPE presence_status AS ENUM ('available', 'busy', 'away', 'dnd', 'offline');

      CREATE TABLE extensions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        number VARCHAR(20) NOT NULL UNIQUE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        extension_type extension_type NOT NULL DEFAULT 'sip',
        sip_password VARCHAR(100) NOT NULL,
        display_name VARCHAR(100),
        voicemail_enabled BOOLEAN DEFAULT TRUE,
        voicemail_pin VARCHAR(20),
        voicemail_email_notification BOOLEAN DEFAULT TRUE,
        call_recording_policy call_recording_policy DEFAULT 'off',
        can_record_calls BOOLEAN DEFAULT FALSE,
        allow_international BOOLEAN DEFAULT TRUE,
        allow_mobile BOOLEAN DEFAULT TRUE,
        forward_on_busy_enabled BOOLEAN DEFAULT FALSE,
        forward_on_busy_destination VARCHAR(50),
        forward_on_no_answer_enabled BOOLEAN DEFAULT FALSE,
        forward_on_no_answer_destination VARCHAR(50),
        forward_on_no_answer_timeout INT DEFAULT 20,
        forward_unconditional_enabled BOOLEAN DEFAULT FALSE,
        forward_unconditional_destination VARCHAR(50),
        dnd_enabled BOOLEAN DEFAULT FALSE,
        presence_status presence_status DEFAULT 'available',
        codec_preferences TEXT[] DEFAULT ARRAY['opus', 'g722', 'pcmu', 'pcma'],
        max_concurrent_calls INT DEFAULT 2,
        status extension_status DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX idx_extensions_number ON extensions(number) WHERE deleted_at IS NULL;
      CREATE INDEX idx_extensions_user_id ON extensions(user_id);
    `);

    // Create extension_registrations table
    await queryRunner.query(`
      CREATE TYPE transport_type AS ENUM ('udp', 'tcp', 'tls', 'wss');

      CREATE TABLE extension_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
        contact_uri VARCHAR(255) NOT NULL,
        user_agent TEXT,
        ip_address INET NOT NULL,
        port INT NOT NULL,
        transport transport_type NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_extension_registrations_extension_id ON extension_registrations(extension_id);
      CREATE INDEX idx_extension_registrations_expires_at ON extension_registrations(expires_at);
    `);

    // Create trunks table
    await queryRunner.query(`
      CREATE TYPE trunk_type AS ENUM ('register', 'ip_auth', 'static');
      CREATE TYPE trunk_transport AS ENUM ('udp', 'tcp', 'tls');
      CREATE TYPE dtmf_mode AS ENUM ('rfc2833', 'inband', 'info');
      CREATE TYPE trunk_status AS ENUM ('active', 'inactive', 'testing');

      CREATE TABLE trunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        trunk_type trunk_type NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INT DEFAULT 5060,
        transport trunk_transport DEFAULT 'udp',
        username VARCHAR(100),
        password VARCHAR(255),
        auth_username VARCHAR(100),
        allowed_ips INET[],
        codec_preferences TEXT[] DEFAULT ARRAY['pcmu', 'pcma', 'g722', 'opus'],
        dtmf_mode dtmf_mode DEFAULT 'rfc2833',
        default_caller_id VARCHAR(50),
        did_ranges JSONB,
        max_concurrent_calls INT DEFAULT 10,
        backup_trunk_id UUID REFERENCES trunks(id) ON DELETE SET NULL,
        status trunk_status DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX idx_trunks_name ON trunks(name) WHERE deleted_at IS NULL;
    `);

    // Create calls table
    await queryRunner.query(`
      CREATE TYPE call_direction AS ENUM ('inbound', 'outbound', 'internal');
      CREATE TYPE call_state AS ENUM ('initiated', 'ringing', 'answered', 'held', 'transferred', 'ended');
      CREATE TYPE hangup_cause AS ENUM ('normal_clearing', 'busy', 'no_answer', 'cancel', 'rejected', 'failed', 'timeout');

      CREATE TABLE calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id VARCHAR(255) NOT NULL UNIQUE,
        direction call_direction NOT NULL,
        caller_number VARCHAR(50) NOT NULL,
        caller_name VARCHAR(100),
        callee_number VARCHAR(50) NOT NULL,
        callee_name VARCHAR(100),
        caller_extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,
        callee_extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,
        trunk_id UUID REFERENCES trunks(id) ON DELETE SET NULL,
        state call_state DEFAULT 'initiated',
        initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ringing_at TIMESTAMP WITH TIME ZONE,
        answered_at TIMESTAMP WITH TIME ZONE,
        ended_at TIMESTAMP WITH TIME ZONE,
        hangup_cause hangup_cause,
        recording_id UUID,
        queue_id UUID,
        agent_extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,
        queue_wait_time_seconds INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_calls_call_id ON calls(call_id);
      CREATE INDEX idx_calls_state ON calls(state);
      CREATE INDEX idx_calls_caller_extension_id ON calls(caller_extension_id);
      CREATE INDEX idx_calls_callee_extension_id ON calls(callee_extension_id);
      CREATE INDEX idx_calls_queue_id ON calls(queue_id);
    `);

    // Create update trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_extensions_updated_at BEFORE UPDATE ON extensions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_trunks_updated_at BEFORE UPDATE ON trunks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS calls CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS extension_registrations CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS extensions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trunks CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS hangup_cause;`);
    await queryRunner.query(`DROP TYPE IF EXISTS call_state;`);
    await queryRunner.query(`DROP TYPE IF EXISTS call_direction;`);
    await queryRunner.query(`DROP TYPE IF EXISTS trunk_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS dtmf_mode;`);
    await queryRunner.query(`DROP TYPE IF EXISTS trunk_transport;`);
    await queryRunner.query(`DROP TYPE IF EXISTS trunk_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS transport_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS presence_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS call_recording_policy;`);
    await queryRunner.query(`DROP TYPE IF EXISTS extension_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS extension_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role;`);
  }
}
