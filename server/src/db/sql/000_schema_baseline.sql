--
-- PostgreSQL database dump
--

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: memo_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memo_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid NOT NULL,
    primary_monitor_branch character varying(150) NOT NULL,
    validator_branch character varying(150) NOT NULL,
    assigned_to_user_id uuid,
    assigned_by uuid NOT NULL,
    assigned_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    assigned_validator_user_id uuid
);


--
-- Name: memo_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memo_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    file_url text NOT NULL,
    attachment_category character varying(100),
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: memo_commencements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memo_commencements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid NOT NULL,
    commencement_date date NOT NULL,
    remarks text,
    recorded_by uuid NOT NULL,
    recorded_at timestamp without time zone DEFAULT now()
);


--
-- Name: memo_progress_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memo_progress_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid NOT NULL,
    progress_percent integer NOT NULL,
    status_note text,
    evidence_url text,
    report_date date NOT NULL,
    reported_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: memo_releases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memo_releases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid NOT NULL,
    released_amount numeric(18,2) NOT NULL,
    released_by uuid NOT NULL,
    remarks text,
    released_at timestamp without time zone DEFAULT now(),
    rejection_reason text,
    next_release_date date,
    release_percentage numeric(5,2),
    decision_type character varying(30),
    next_payment_date date,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: memo_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memo_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid NOT NULL,
    validation_note text,
    is_valid boolean NOT NULL,
    validated_by uuid NOT NULL,
    validated_at timestamp without time zone DEFAULT now()
);


--
-- Name: memos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_no character varying(120) NOT NULL,
    heading text NOT NULL,
    description text,
    category character varying(100) NOT NULL,
    branch_dru character varying(150) NOT NULL,
    beneficiary_name character varying(200),
    amount numeric(18,2) DEFAULT 0,
    currency character varying(20) DEFAULT 'NGN'::character varying NOT NULL,
    approval_status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    lifecycle_stage character varying(50) DEFAULT 'REGISTERED'::character varying NOT NULL,
    progress_percent integer DEFAULT 0 NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    approved_by uuid,
    approved_at timestamp without time zone,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    business_status character varying(100) DEFAULT 'DRAFT'::character varying NOT NULL,
    sync_status character varying(30) DEFAULT 'SYNCED'::character varying,
    last_modified_at timestamp without time zone DEFAULT now() NOT NULL,
    sync_id uuid DEFAULT gen_random_uuid(),
    version integer DEFAULT 1 NOT NULL,
    state character varying(100),
    location text,
    geopolitical_zone character varying(100),
    movement_type character varying(20)
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memo_id uuid,
    target_user_id uuid,
    target_role character varying(50),
    type character varying(100) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp without time zone,
    expires_at timestamp without time zone,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: organizational_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizational_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    unit_type character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sync_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(100) NOT NULL,
    record_sync_id uuid NOT NULL,
    local_payload jsonb,
    server_payload jsonb,
    resolution character varying(100),
    resolved_by uuid,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sync_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(100) NOT NULL,
    record_sync_id uuid NOT NULL,
    operation character varying(20) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(150) NOT NULL,
    username character varying(100) NOT NULL,
    password_hash text NOT NULL,
    role character varying(50) NOT NULL,
    branch_dru character varying(150),
    is_active boolean DEFAULT true,
    token_version integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: memo_assignments memo_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_assignments
    ADD CONSTRAINT memo_assignments_pkey PRIMARY KEY (id);


--
-- Name: memo_attachments memo_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_attachments
    ADD CONSTRAINT memo_attachments_pkey PRIMARY KEY (id);


--
-- Name: memo_commencements memo_commencements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_commencements
    ADD CONSTRAINT memo_commencements_pkey PRIMARY KEY (id);


--
-- Name: memo_progress_logs memo_progress_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_progress_logs
    ADD CONSTRAINT memo_progress_logs_pkey PRIMARY KEY (id);


--
-- Name: memo_releases memo_releases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_releases
    ADD CONSTRAINT memo_releases_pkey PRIMARY KEY (id);


--
-- Name: memo_validations memo_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_validations
    ADD CONSTRAINT memo_validations_pkey PRIMARY KEY (id);


--
-- Name: memos memos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizational_units organizational_units_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizational_units
    ADD CONSTRAINT organizational_units_code_key UNIQUE (code);


--
-- Name: organizational_units organizational_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizational_units
    ADD CONSTRAINT organizational_units_pkey PRIMARY KEY (id);


--
-- Name: sync_conflicts sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: sync_queue sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_memo_attachments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memo_attachments_created_at ON public.memo_attachments USING btree (created_at);


--
-- Name: idx_memo_progress_logs_reported_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memo_progress_logs_reported_by ON public.memo_progress_logs USING btree (reported_by);


--
-- Name: idx_memo_releases_decision_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memo_releases_decision_type ON public.memo_releases USING btree (decision_type);


--
-- Name: idx_memos_is_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memos_is_completed ON public.memos USING btree (is_completed);


--
-- Name: idx_memos_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memos_version ON public.memos USING btree (version);


--
-- Name: idx_sync_conflicts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_conflicts_created_at ON public.sync_conflicts USING btree (created_at);


--
-- Name: idx_sync_queue_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_queue_created_at ON public.sync_queue USING btree (created_at);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: memo_assignments memo_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_assignments
    ADD CONSTRAINT memo_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: memo_assignments memo_assignments_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_assignments
    ADD CONSTRAINT memo_assignments_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id);


--
-- Name: memo_assignments memo_assignments_assigned_validator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_assignments
    ADD CONSTRAINT memo_assignments_assigned_validator_user_id_fkey FOREIGN KEY (assigned_validator_user_id) REFERENCES public.users(id);


--
-- Name: memo_assignments memo_assignments_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_assignments
    ADD CONSTRAINT memo_assignments_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: memo_attachments memo_attachments_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_attachments
    ADD CONSTRAINT memo_attachments_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: memo_attachments memo_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_attachments
    ADD CONSTRAINT memo_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: memo_commencements memo_commencements_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_commencements
    ADD CONSTRAINT memo_commencements_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: memo_commencements memo_commencements_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_commencements
    ADD CONSTRAINT memo_commencements_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: memo_progress_logs memo_progress_logs_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_progress_logs
    ADD CONSTRAINT memo_progress_logs_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: memo_progress_logs memo_progress_logs_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_progress_logs
    ADD CONSTRAINT memo_progress_logs_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id);


--
-- Name: memo_releases memo_releases_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_releases
    ADD CONSTRAINT memo_releases_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: memo_releases memo_releases_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_releases
    ADD CONSTRAINT memo_releases_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id);


--
-- Name: memo_validations memo_validations_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_validations
    ADD CONSTRAINT memo_validations_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: memo_validations memo_validations_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memo_validations
    ADD CONSTRAINT memo_validations_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: memos memos_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: memos memos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memos
    ADD CONSTRAINT memos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_memo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--
