import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeatureTables1699876600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Queues tables
    await queryRunner.query(`
      CREATE TYPE queue_strategy AS ENUM ('ring_all', 'longest_idle', 'least_talk_time', 'round_robin', 'random');
      CREATE TYPE queue_status AS ENUM ('active', 'paused', 'inactive');
      CREATE TYPE overflow_action AS ENUM ('voicemail', 'ivr', 'external', 'hangup');
      CREATE TYPE agent_status AS ENUM ('available', 'busy', 'wrap_up', 'break', 'offline');

      CREATE TABLE queues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        extension_number VARCHAR(20) UNIQUE,
        strategy queue_strategy DEFAULT 'longest_idle',
        service_level_threshold_seconds INT DEFAULT 20,
        service_level_goal_percent INT DEFAULT 80,
        max_wait_time_seconds INT DEFAULT 300,
        music_on_hold_id UUID,
        welcome_prompt_id UUID,
        position_announcement_enabled BOOLEAN DEFAULT TRUE,
        position_announcement_interval_seconds INT DEFAULT 30,
        max_queue_size INT DEFAULT 50,
        wrap_up_time_seconds INT DEFAULT 10,
        overflow_action overflow_action DEFAULT 'voicemail',
        overflow_destination_id UUID,
        overflow_destination_number VARCHAR(50),
        callback_enabled BOOLEAN DEFAULT FALSE,
        status queue_status DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE queue_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
        extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
        priority INT DEFAULT 0,
        skills TEXT[],
        penalty INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(queue_id, extension_id)
      );

      CREATE TABLE agent_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
        queue_id UUID REFERENCES queues(id) ON DELETE CASCADE,
        status agent_status NOT NULL,
        reason_code VARCHAR(100),
        state_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_call_ended_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_queues_name ON queues(name) WHERE deleted_at IS NULL;
      CREATE INDEX idx_queue_members_queue_id ON queue_members(queue_id);
      CREATE INDEX idx_queue_members_extension_id ON queue_members(extension_id);
      CREATE INDEX idx_agent_states_extension_id ON agent_states(extension_id);
      CREATE INDEX idx_agent_states_status ON agent_states(status);

      CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON queues
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_queue_members_updated_at BEFORE UPDATE ON queue_members
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_agent_states_updated_at BEFORE UPDATE ON agent_states
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create IVR tables
    await queryRunner.query(`
      CREATE TYPE ivr_action_type AS ENUM ('extension', 'queue', 'ivr', 'voicemail', 'external', 'hangup', 'repeat');

      CREATE TABLE ivr_menus (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        welcome_prompt_id UUID,
        digit_timeout_seconds INT DEFAULT 5,
        max_retries INT DEFAULT 3,
        invalid_prompt_id UUID,
        timeout_prompt_id UUID,
        timeout_destination_type VARCHAR(50),
        timeout_destination_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE ivr_menu_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ivr_menu_id UUID NOT NULL REFERENCES ivr_menus(id) ON DELETE CASCADE,
        dtmf_digit VARCHAR(2) NOT NULL,
        action ivr_action_type NOT NULL,
        destination_id UUID,
        destination_number VARCHAR(50),
        pre_transfer_prompt_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(ivr_menu_id, dtmf_digit)
      );

      CREATE INDEX idx_ivr_menu_options_ivr_menu_id ON ivr_menu_options(ivr_menu_id);

      CREATE TRIGGER update_ivr_menus_updated_at BEFORE UPDATE ON ivr_menus
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_ivr_menu_options_updated_at BEFORE UPDATE ON ivr_menu_options
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create Voicemail tables
    await queryRunner.query(`
      CREATE TABLE voicemail_boxes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        extension_id UUID NOT NULL UNIQUE REFERENCES extensions(id) ON DELETE CASCADE,
        pin VARCHAR(20),
        greeting_prompt_id UUID,
        email_notification BOOLEAN DEFAULT TRUE,
        email_address VARCHAR(255),
        attach_audio BOOLEAN DEFAULT TRUE,
        retention_days INT DEFAULT 90,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE voicemail_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voicemail_box_id UUID NOT NULL REFERENCES voicemail_boxes(id) ON DELETE CASCADE,
        caller_number VARCHAR(50) NOT NULL,
        caller_name VARCHAR(100),
        storage_path VARCHAR(500) NOT NULL,
        duration_seconds INT NOT NULL,
        file_size_bytes BIGINT,
        is_read BOOLEAN DEFAULT FALSE,
        is_urgent BOOLEAN DEFAULT FALSE,
        received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE,
        delete_at DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_voicemail_boxes_extension_id ON voicemail_boxes(extension_id);
      CREATE INDEX idx_voicemail_messages_voicemail_box_id ON voicemail_messages(voicemail_box_id);
      CREATE INDEX idx_voicemail_messages_received_at ON voicemail_messages(received_at DESC);

      CREATE TRIGGER update_voicemail_boxes_updated_at BEFORE UPDATE ON voicemail_boxes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create Recordings table
    await queryRunner.query(`
      CREATE TYPE recording_type AS ENUM ('on_demand', 'automatic', 'compliance');

      CREATE TABLE recordings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id VARCHAR(255) NOT NULL,
        recording_type recording_type NOT NULL,
        initiated_by_user_id UUID,
        storage_path VARCHAR(500) NOT NULL,
        duration_seconds INT NOT NULL,
        file_size_bytes BIGINT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        encryption_key_id VARCHAR(100),
        allowed_user_ids UUID[],
        allowed_roles TEXT[],
        retention_until DATE NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL,
        stopped_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_recordings_call_id ON recordings(call_id);
      CREATE INDEX idx_recordings_retention_until ON recordings(retention_until);
      CREATE INDEX idx_recordings_started_at ON recordings(started_at DESC);

      CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON recordings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create Inbound/Outbound Rules
    await queryRunner.query(`
      CREATE TYPE inbound_rule_status AS ENUM ('active', 'inactive');
      CREATE TYPE outbound_rule_status AS ENUM ('active', 'inactive');

      CREATE TABLE inbound_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        did_pattern VARCHAR(50) NOT NULL,
        trunk_id UUID REFERENCES trunks(id) ON DELETE CASCADE,
        priority INT DEFAULT 100,
        time_profile_id UUID,
        caller_id_pattern VARCHAR(50),
        destination_type VARCHAR(50) NOT NULL,
        destination_id UUID,
        destination_number VARCHAR(50),
        fallback_destination_type VARCHAR(50),
        fallback_destination_id UUID,
        fallback_destination_number VARCHAR(50),
        status inbound_rule_status DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE outbound_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        number_pattern VARCHAR(100) NOT NULL,
        priority INT DEFAULT 100,
        strip_digits INT DEFAULT 0,
        prepend VARCHAR(20),
        trunk_id UUID NOT NULL REFERENCES trunks(id) ON DELETE CASCADE,
        caller_id_mode VARCHAR(50) DEFAULT 'extension',
        custom_caller_id VARCHAR(50),
        allowed_for_roles TEXT[] DEFAULT ARRAY['admin', 'supervisor', 'agent', 'user'],
        max_duration_seconds INT,
        status outbound_rule_status DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_inbound_rules_did_pattern ON inbound_rules(did_pattern);
      CREATE INDEX idx_inbound_rules_trunk_id ON inbound_rules(trunk_id);
      CREATE INDEX idx_outbound_rules_number_pattern ON outbound_rules(number_pattern);
      CREATE INDEX idx_outbound_rules_trunk_id ON outbound_rules(trunk_id);

      CREATE TRIGGER update_inbound_rules_updated_at BEFORE UPDATE ON inbound_rules
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_outbound_rules_updated_at BEFORE UPDATE ON outbound_rules
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create CRM Integration table
    await queryRunner.query(`
      CREATE TYPE crm_type AS ENUM ('salesforce', 'zoho', 'hubspot', 'freshdesk', 'dynamics365', 'custom');
      CREATE TYPE auth_type AS ENUM ('oauth2', 'api_key', 'basic');
      CREATE TYPE crm_integration_status AS ENUM ('active', 'inactive', 'error');

      CREATE TABLE crm_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        crm_type crm_type NOT NULL,
        base_url VARCHAR(500),
        api_version VARCHAR(20),
        auth_type auth_type NOT NULL,
        auth_credentials JSONB NOT NULL,
        lookup_endpoint VARCHAR(500),
        create_contact_endpoint VARCHAR(500),
        log_call_endpoint VARCHAR(500),
        field_mappings JSONB,
        screen_pop_enabled BOOLEAN DEFAULT TRUE,
        screen_pop_url_template TEXT,
        webhook_url VARCHAR(500),
        webhook_events TEXT[],
        status crm_integration_status DEFAULT 'active',
        last_sync_at TIMESTAMP WITH TIME ZONE,
        last_error TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TRIGGER update_crm_integrations_updated_at BEFORE UPDATE ON crm_integrations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create Conferences table
    await queryRunner.query(`
      CREATE TYPE conference_type AS ENUM ('audio', 'webrtc');
      CREATE TYPE conference_status AS ENUM ('scheduled', 'active', 'ended');

      CREATE TABLE conferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        extension_number VARCHAR(20) UNIQUE,
        conference_type conference_type DEFAULT 'audio',
        pin VARCHAR(20),
        moderator_pin VARCHAR(20),
        owner_user_id UUID,
        wait_for_moderator BOOLEAN DEFAULT FALSE,
        record_conference BOOLEAN DEFAULT FALSE,
        max_participants INT DEFAULT 25,
        enable_screen_sharing BOOLEAN DEFAULT TRUE,
        enable_chat BOOLEAN DEFAULT TRUE,
        scheduled_start TIMESTAMP WITH TIME ZONE,
        scheduled_end TIMESTAMP WITH TIME ZONE,
        status conference_status DEFAULT 'scheduled',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_conferences_extension_number ON conferences(extension_number);
      CREATE INDEX idx_conferences_scheduled_start ON conferences(scheduled_start);

      CREATE TRIGGER update_conferences_updated_at BEFORE UPDATE ON conferences
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS conferences CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_integrations CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS outbound_rules CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS inbound_rules CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS recordings CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS voicemail_messages CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS voicemail_boxes CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ivr_menu_options CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ivr_menus CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS agent_states CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS queue_members CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS queues CASCADE;`);

    await queryRunner.query(`DROP TYPE IF EXISTS conference_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS conference_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS crm_integration_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS auth_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS crm_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS outbound_rule_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS inbound_rule_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS recording_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS ivr_action_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS agent_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS overflow_action;`);
    await queryRunner.query(`DROP TYPE IF EXISTS queue_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS queue_strategy;`);
  }
}
