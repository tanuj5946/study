--
-- PostgreSQL database dump
--

\restrict bTsGRaJbIXh6hEJSPjCkctMUUSI8gMtrhfM9Lg0IeJUFGPX3agz2KSjMWD4LwwQ

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assessment_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_answers (
    id integer NOT NULL,
    assessment_id integer,
    question_id integer,
    selected_answer text,
    is_correct boolean
);


ALTER TABLE public.assessment_answers OWNER TO postgres;

--
-- Name: assessment_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessment_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessment_answers_id_seq OWNER TO postgres;

--
-- Name: assessment_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessment_answers_id_seq OWNED BY public.assessment_answers.id;


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessments (
    id integer NOT NULL,
    user_id integer,
    module_id integer,
    total_questions integer NOT NULL,
    score integer NOT NULL,
    percentage numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.assessments OWNER TO postgres;

--
-- Name: assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessments_id_seq OWNER TO postgres;

--
-- Name: assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessments_id_seq OWNED BY public.assessments.id;


--
-- Name: mini_test_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mini_test_attempts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    module_id integer NOT NULL,
    score integer NOT NULL,
    total integer NOT NULL,
    passed boolean NOT NULL,
    flagged boolean DEFAULT false,
    attempted_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.mini_test_attempts OWNER TO postgres;

--
-- Name: mini_test_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mini_test_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mini_test_attempts_id_seq OWNER TO postgres;

--
-- Name: mini_test_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mini_test_attempts_id_seq OWNED BY public.mini_test_attempts.id;


--
-- Name: module_unlocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_unlocks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    module_id integer NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.module_unlocks OWNER TO postgres;

--
-- Name: module_unlocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_unlocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_unlocks_id_seq OWNER TO postgres;

--
-- Name: module_unlocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_unlocks_id_seq OWNED BY public.module_unlocks.id;


--
-- Name: modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modules (
    id integer NOT NULL,
    subject_id integer,
    module_name character varying(150) NOT NULL,
    difficulty character varying(20),
    estimated_hours integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.modules OWNER TO postgres;

--
-- Name: modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.modules_id_seq OWNER TO postgres;

--
-- Name: modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modules_id_seq OWNED BY public.modules.id;


--
-- Name: notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notes (
    id integer NOT NULL,
    module_id integer,
    title character varying(150),
    content text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notes OWNER TO postgres;

--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notes_id_seq OWNER TO postgres;

--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    module_id integer,
    topic character varying(100) NOT NULL,
    difficulty character varying(20),
    question text NOT NULL,
    options jsonb NOT NULL,
    correct_answer text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    correct_option_index integer,
    CONSTRAINT questions_difficulty_check CHECK (((difficulty)::text = ANY (ARRAY[('Easy'::character varying)::text, ('Medium'::character varying)::text, ('Hard'::character varying)::text])))
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_id_seq OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: study_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.study_sessions (
    id integer NOT NULL,
    user_id integer,
    module_id integer,
    duration_minutes integer,
    session_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    title character varying(200),
    description text,
    date date,
    start_time time without time zone,
    completed boolean DEFAULT false
);


ALTER TABLE public.study_sessions OWNER TO postgres;

--
-- Name: study_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.study_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.study_sessions_id_seq OWNER TO postgres;

--
-- Name: study_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.study_sessions_id_seq OWNED BY public.study_sessions.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subjects_id_seq OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: topic_mastery; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.topic_mastery (
    user_id integer NOT NULL,
    topic character varying(100) NOT NULL,
    accuracy numeric(5,2),
    attempts integer DEFAULT 0
);


ALTER TABLE public.topic_mastery OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'student'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: assessment_answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_answers ALTER COLUMN id SET DEFAULT nextval('public.assessment_answers_id_seq'::regclass);


--
-- Name: assessments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments ALTER COLUMN id SET DEFAULT nextval('public.assessments_id_seq'::regclass);


--
-- Name: mini_test_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mini_test_attempts ALTER COLUMN id SET DEFAULT nextval('public.mini_test_attempts_id_seq'::regclass);


--
-- Name: module_unlocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_unlocks ALTER COLUMN id SET DEFAULT nextval('public.module_unlocks_id_seq'::regclass);


--
-- Name: modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules ALTER COLUMN id SET DEFAULT nextval('public.modules_id_seq'::regclass);


--
-- Name: notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: study_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_sessions ALTER COLUMN id SET DEFAULT nextval('public.study_sessions_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: assessment_answers assessment_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_answers
    ADD CONSTRAINT assessment_answers_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: mini_test_attempts mini_test_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mini_test_attempts
    ADD CONSTRAINT mini_test_attempts_pkey PRIMARY KEY (id);


--
-- Name: module_unlocks module_unlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_unlocks
    ADD CONSTRAINT module_unlocks_pkey PRIMARY KEY (id);


--
-- Name: module_unlocks module_unlocks_user_id_module_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_unlocks
    ADD CONSTRAINT module_unlocks_user_id_module_id_key UNIQUE (user_id, module_id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: study_sessions study_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_name_key UNIQUE (name);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: topic_mastery topic_mastery_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topic_mastery
    ADD CONSTRAINT topic_mastery_pkey PRIMARY KEY (user_id, topic);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_answers_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_assessment ON public.assessment_answers USING btree (assessment_id);


--
-- Name: idx_assessments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessments_user ON public.assessments USING btree (user_id);


--
-- Name: idx_questions_difficulty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_difficulty ON public.questions USING btree (difficulty);


--
-- Name: idx_questions_module; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_module ON public.questions USING btree (module_id);


--
-- Name: assessment_answers assessment_answers_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_answers
    ADD CONSTRAINT assessment_answers_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_answers assessment_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_answers
    ADD CONSTRAINT assessment_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mini_test_attempts mini_test_attempts_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mini_test_attempts
    ADD CONSTRAINT mini_test_attempts_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: mini_test_attempts mini_test_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mini_test_attempts
    ADD CONSTRAINT mini_test_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: module_unlocks module_unlocks_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_unlocks
    ADD CONSTRAINT module_unlocks_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: module_unlocks module_unlocks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_unlocks
    ADD CONSTRAINT module_unlocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: modules modules_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: notes notes_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: questions questions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: study_sessions study_sessions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id);


--
-- Name: study_sessions study_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: topic_mastery topic_mastery_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topic_mastery
    ADD CONSTRAINT topic_mastery_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict bTsGRaJbIXh6hEJSPjCkctMUUSI8gMtrhfM9Lg0IeJUFGPX3agz2KSjMWD4LwwQ

