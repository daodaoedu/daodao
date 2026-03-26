--
-- PostgreSQL database dump
--

-- Dumped from database version 14.15 (Debian 14.15-1.pgdg120+1)
-- Dumped by pg_dump version 14.15 (Debian 14.15-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: pg_aggregate; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_aggregate (
    aggfnoid regproc NOT NULL,
    aggkind "char" NOT NULL,
    aggnumdirectargs smallint NOT NULL,
    aggtransfn regproc NOT NULL,
    aggfinalfn regproc NOT NULL,
    aggcombinefn regproc NOT NULL,
    aggserialfn regproc NOT NULL,
    aggdeserialfn regproc NOT NULL,
    aggmtransfn regproc NOT NULL,
    aggminvtransfn regproc NOT NULL,
    aggmfinalfn regproc NOT NULL,
    aggfinalextra boolean NOT NULL,
    aggmfinalextra boolean NOT NULL,
    aggfinalmodify "char" NOT NULL,
    aggmfinalmodify "char" NOT NULL,
    aggsortop oid NOT NULL,
    aggtranstype oid NOT NULL,
    aggtransspace integer NOT NULL,
    aggmtranstype oid NOT NULL,
    aggmtransspace integer NOT NULL,
    agginitval text COLLATE pg_catalog."C",
    aggminitval text COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_aggregate REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_aggregate OWNER TO daodao;

--
-- Name: pg_am; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_am (
    oid oid NOT NULL,
    amname name NOT NULL,
    amhandler regproc NOT NULL,
    amtype "char" NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_am REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_am OWNER TO daodao;

--
-- Name: pg_amop; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_amop (
    oid oid NOT NULL,
    amopfamily oid NOT NULL,
    amoplefttype oid NOT NULL,
    amoprighttype oid NOT NULL,
    amopstrategy smallint NOT NULL,
    amoppurpose "char" NOT NULL,
    amopopr oid NOT NULL,
    amopmethod oid NOT NULL,
    amopsortfamily oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_amop REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_amop OWNER TO daodao;

--
-- Name: pg_amproc; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_amproc (
    oid oid NOT NULL,
    amprocfamily oid NOT NULL,
    amproclefttype oid NOT NULL,
    amprocrighttype oid NOT NULL,
    amprocnum smallint NOT NULL,
    amproc regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_amproc REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_amproc OWNER TO daodao;

--
-- Name: pg_attrdef; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_attrdef (
    oid oid NOT NULL,
    adrelid oid NOT NULL,
    adnum smallint NOT NULL,
    adbin pg_node_tree NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_attrdef REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_attrdef OWNER TO daodao;

--
-- Name: pg_attribute; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_attribute (
    attrelid oid NOT NULL,
    attname name NOT NULL,
    atttypid oid NOT NULL,
    attstattarget integer NOT NULL,
    attlen smallint NOT NULL,
    attnum smallint NOT NULL,
    attndims integer NOT NULL,
    attcacheoff integer NOT NULL,
    atttypmod integer NOT NULL,
    attbyval boolean NOT NULL,
    attalign "char" NOT NULL,
    attstorage "char" NOT NULL,
    attcompression "char" NOT NULL,
    attnotnull boolean NOT NULL,
    atthasdef boolean NOT NULL,
    atthasmissing boolean NOT NULL,
    attidentity "char" NOT NULL,
    attgenerated "char" NOT NULL,
    attisdropped boolean NOT NULL,
    attislocal boolean NOT NULL,
    attinhcount integer NOT NULL,
    attcollation oid NOT NULL,
    attacl aclitem[],
    attoptions text[] COLLATE pg_catalog."C",
    attfdwoptions text[] COLLATE pg_catalog."C",
    attmissingval anyarray
);

ALTER TABLE ONLY pg_catalog.pg_attribute REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_attribute OWNER TO daodao;

SET default_tablespace = pg_global;

--
-- Name: pg_auth_members; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_auth_members (
    roleid oid NOT NULL,
    member oid NOT NULL,
    grantor oid NOT NULL,
    admin_option boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_auth_members REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_auth_members OWNER TO daodao;

--
-- Name: pg_authid; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_authid (
    oid oid NOT NULL,
    rolname name NOT NULL,
    rolsuper boolean NOT NULL,
    rolinherit boolean NOT NULL,
    rolcreaterole boolean NOT NULL,
    rolcreatedb boolean NOT NULL,
    rolcanlogin boolean NOT NULL,
    rolreplication boolean NOT NULL,
    rolbypassrls boolean NOT NULL,
    rolconnlimit integer NOT NULL,
    rolpassword text COLLATE pg_catalog."C",
    rolvaliduntil timestamp with time zone
);

ALTER TABLE ONLY pg_catalog.pg_authid REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_authid OWNER TO daodao;

--
-- Name: pg_available_extension_versions; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_available_extension_versions AS
 SELECT e.name,
    e.version,
    (x.extname IS NOT NULL) AS installed,
    e.superuser,
    e.trusted,
    e.relocatable,
    e.schema,
    e.requires,
    e.comment
   FROM (pg_available_extension_versions() e(name, version, superuser, trusted, relocatable, schema, requires, comment)
     LEFT JOIN pg_extension x ON (((e.name = x.extname) AND (e.version = x.extversion))));


ALTER TABLE pg_catalog.pg_available_extension_versions OWNER TO daodao;

--
-- Name: pg_available_extensions; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_available_extensions AS
 SELECT e.name,
    e.default_version,
    x.extversion AS installed_version,
    e.comment
   FROM (pg_available_extensions() e(name, default_version, comment)
     LEFT JOIN pg_extension x ON ((e.name = x.extname)));


ALTER TABLE pg_catalog.pg_available_extensions OWNER TO daodao;

--
-- Name: pg_backend_memory_contexts; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_backend_memory_contexts AS
 SELECT pg_get_backend_memory_contexts.name,
    pg_get_backend_memory_contexts.ident,
    pg_get_backend_memory_contexts.parent,
    pg_get_backend_memory_contexts.level,
    pg_get_backend_memory_contexts.total_bytes,
    pg_get_backend_memory_contexts.total_nblocks,
    pg_get_backend_memory_contexts.free_bytes,
    pg_get_backend_memory_contexts.free_chunks,
    pg_get_backend_memory_contexts.used_bytes
   FROM pg_get_backend_memory_contexts() pg_get_backend_memory_contexts(name, ident, parent, level, total_bytes, total_nblocks, free_bytes, free_chunks, used_bytes);


ALTER TABLE pg_catalog.pg_backend_memory_contexts OWNER TO daodao;

SET default_tablespace = '';

--
-- Name: pg_cast; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_cast (
    oid oid NOT NULL,
    castsource oid NOT NULL,
    casttarget oid NOT NULL,
    castfunc oid NOT NULL,
    castcontext "char" NOT NULL,
    castmethod "char" NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_cast REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_cast OWNER TO daodao;

--
-- Name: pg_class; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_class (
    oid oid NOT NULL,
    relname name NOT NULL,
    relnamespace oid NOT NULL,
    reltype oid NOT NULL,
    reloftype oid NOT NULL,
    relowner oid NOT NULL,
    relam oid NOT NULL,
    relfilenode oid NOT NULL,
    reltablespace oid NOT NULL,
    relpages integer NOT NULL,
    reltuples real NOT NULL,
    relallvisible integer NOT NULL,
    reltoastrelid oid NOT NULL,
    relhasindex boolean NOT NULL,
    relisshared boolean NOT NULL,
    relpersistence "char" NOT NULL,
    relkind "char" NOT NULL,
    relnatts smallint NOT NULL,
    relchecks smallint NOT NULL,
    relhasrules boolean NOT NULL,
    relhastriggers boolean NOT NULL,
    relhassubclass boolean NOT NULL,
    relrowsecurity boolean NOT NULL,
    relforcerowsecurity boolean NOT NULL,
    relispopulated boolean NOT NULL,
    relreplident "char" NOT NULL,
    relispartition boolean NOT NULL,
    relrewrite oid NOT NULL,
    relfrozenxid xid NOT NULL,
    relminmxid xid NOT NULL,
    relacl aclitem[],
    reloptions text[] COLLATE pg_catalog."C",
    relpartbound pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_class REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_class OWNER TO daodao;

--
-- Name: pg_collation; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_collation (
    oid oid NOT NULL,
    collname name NOT NULL,
    collnamespace oid NOT NULL,
    collowner oid NOT NULL,
    collprovider "char" NOT NULL,
    collisdeterministic boolean NOT NULL,
    collencoding integer NOT NULL,
    collcollate name NOT NULL,
    collctype name NOT NULL,
    collversion text COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_collation REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_collation OWNER TO daodao;

--
-- Name: pg_config; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_config AS
 SELECT pg_config.name,
    pg_config.setting
   FROM pg_config() pg_config(name, setting);


ALTER TABLE pg_catalog.pg_config OWNER TO daodao;

--
-- Name: pg_constraint; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_constraint (
    oid oid NOT NULL,
    conname name NOT NULL,
    connamespace oid NOT NULL,
    contype "char" NOT NULL,
    condeferrable boolean NOT NULL,
    condeferred boolean NOT NULL,
    convalidated boolean NOT NULL,
    conrelid oid NOT NULL,
    contypid oid NOT NULL,
    conindid oid NOT NULL,
    conparentid oid NOT NULL,
    confrelid oid NOT NULL,
    confupdtype "char" NOT NULL,
    confdeltype "char" NOT NULL,
    confmatchtype "char" NOT NULL,
    conislocal boolean NOT NULL,
    coninhcount integer NOT NULL,
    connoinherit boolean NOT NULL,
    conkey smallint[],
    confkey smallint[],
    conpfeqop oid[],
    conppeqop oid[],
    conffeqop oid[],
    conexclop oid[],
    conbin pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_constraint REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_constraint OWNER TO daodao;

--
-- Name: pg_conversion; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_conversion (
    oid oid NOT NULL,
    conname name NOT NULL,
    connamespace oid NOT NULL,
    conowner oid NOT NULL,
    conforencoding integer NOT NULL,
    contoencoding integer NOT NULL,
    conproc regproc NOT NULL,
    condefault boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_conversion REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_conversion OWNER TO daodao;

--
-- Name: pg_cursors; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_cursors AS
 SELECT c.name,
    c.statement,
    c.is_holdable,
    c.is_binary,
    c.is_scrollable,
    c.creation_time
   FROM pg_cursor() c(name, statement, is_holdable, is_binary, is_scrollable, creation_time);


ALTER TABLE pg_catalog.pg_cursors OWNER TO daodao;

SET default_tablespace = pg_global;

--
-- Name: pg_database; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_database (
    oid oid NOT NULL,
    datname name NOT NULL,
    datdba oid NOT NULL,
    encoding integer NOT NULL,
    datcollate name NOT NULL,
    datctype name NOT NULL,
    datistemplate boolean NOT NULL,
    datallowconn boolean NOT NULL,
    datconnlimit integer NOT NULL,
    datlastsysoid oid NOT NULL,
    datfrozenxid xid NOT NULL,
    datminmxid xid NOT NULL,
    dattablespace oid NOT NULL,
    datacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_database REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_database OWNER TO daodao;

--
-- Name: pg_db_role_setting; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_db_role_setting (
    setdatabase oid NOT NULL,
    setrole oid NOT NULL,
    setconfig text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_db_role_setting REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_db_role_setting OWNER TO daodao;

SET default_tablespace = '';

--
-- Name: pg_default_acl; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_default_acl (
    oid oid NOT NULL,
    defaclrole oid NOT NULL,
    defaclnamespace oid NOT NULL,
    defaclobjtype "char" NOT NULL,
    defaclacl aclitem[] NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_default_acl REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_default_acl OWNER TO daodao;

--
-- Name: pg_depend; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_depend (
    classid oid NOT NULL,
    objid oid NOT NULL,
    objsubid integer NOT NULL,
    refclassid oid NOT NULL,
    refobjid oid NOT NULL,
    refobjsubid integer NOT NULL,
    deptype "char" NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_depend REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_depend OWNER TO daodao;

--
-- Name: pg_description; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_description (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    objsubid integer NOT NULL,
    description text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_description REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_description OWNER TO daodao;

--
-- Name: pg_enum; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_enum (
    oid oid NOT NULL,
    enumtypid oid NOT NULL,
    enumsortorder real NOT NULL,
    enumlabel name NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_enum REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_enum OWNER TO daodao;

--
-- Name: pg_event_trigger; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_event_trigger (
    oid oid NOT NULL,
    evtname name NOT NULL,
    evtevent name NOT NULL,
    evtowner oid NOT NULL,
    evtfoid oid NOT NULL,
    evtenabled "char" NOT NULL,
    evttags text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_event_trigger REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_event_trigger OWNER TO daodao;

--
-- Name: pg_extension; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_extension (
    oid oid NOT NULL,
    extname name NOT NULL,
    extowner oid NOT NULL,
    extnamespace oid NOT NULL,
    extrelocatable boolean NOT NULL,
    extversion text NOT NULL COLLATE pg_catalog."C",
    extconfig oid[],
    extcondition text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_extension REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_extension OWNER TO daodao;

--
-- Name: pg_file_settings; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_file_settings AS
 SELECT a.sourcefile,
    a.sourceline,
    a.seqno,
    a.name,
    a.setting,
    a.applied,
    a.error
   FROM pg_show_all_file_settings() a(sourcefile, sourceline, seqno, name, setting, applied, error);


ALTER TABLE pg_catalog.pg_file_settings OWNER TO daodao;

--
-- Name: pg_foreign_data_wrapper; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_foreign_data_wrapper (
    oid oid NOT NULL,
    fdwname name NOT NULL,
    fdwowner oid NOT NULL,
    fdwhandler oid NOT NULL,
    fdwvalidator oid NOT NULL,
    fdwacl aclitem[],
    fdwoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_foreign_data_wrapper REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_foreign_data_wrapper OWNER TO daodao;

--
-- Name: pg_foreign_server; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_foreign_server (
    oid oid NOT NULL,
    srvname name NOT NULL,
    srvowner oid NOT NULL,
    srvfdw oid NOT NULL,
    srvtype text COLLATE pg_catalog."C",
    srvversion text COLLATE pg_catalog."C",
    srvacl aclitem[],
    srvoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_foreign_server REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_foreign_server OWNER TO daodao;

--
-- Name: pg_foreign_table; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_foreign_table (
    ftrelid oid NOT NULL,
    ftserver oid NOT NULL,
    ftoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_foreign_table REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_foreign_table OWNER TO daodao;

--
-- Name: pg_group; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_group AS
 SELECT pg_authid.rolname AS groname,
    pg_authid.oid AS grosysid,
    ARRAY( SELECT pg_auth_members.member
           FROM pg_auth_members
          WHERE (pg_auth_members.roleid = pg_authid.oid)) AS grolist
   FROM pg_authid
  WHERE (NOT pg_authid.rolcanlogin);


ALTER TABLE pg_catalog.pg_group OWNER TO daodao;

--
-- Name: pg_hba_file_rules; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_hba_file_rules AS
 SELECT a.line_number,
    a.type,
    a.database,
    a.user_name,
    a.address,
    a.netmask,
    a.auth_method,
    a.options,
    a.error
   FROM pg_hba_file_rules() a(line_number, type, database, user_name, address, netmask, auth_method, options, error);


ALTER TABLE pg_catalog.pg_hba_file_rules OWNER TO daodao;

--
-- Name: pg_index; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_index (
    indexrelid oid NOT NULL,
    indrelid oid NOT NULL,
    indnatts smallint NOT NULL,
    indnkeyatts smallint NOT NULL,
    indisunique boolean NOT NULL,
    indisprimary boolean NOT NULL,
    indisexclusion boolean NOT NULL,
    indimmediate boolean NOT NULL,
    indisclustered boolean NOT NULL,
    indisvalid boolean NOT NULL,
    indcheckxmin boolean NOT NULL,
    indisready boolean NOT NULL,
    indislive boolean NOT NULL,
    indisreplident boolean NOT NULL,
    indkey int2vector NOT NULL,
    indcollation oidvector NOT NULL,
    indclass oidvector NOT NULL,
    indoption int2vector NOT NULL,
    indexprs pg_node_tree COLLATE pg_catalog."C",
    indpred pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_index REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_index OWNER TO daodao;

--
-- Name: pg_indexes; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_indexes AS
 SELECT n.nspname AS schemaname,
    c.relname AS tablename,
    i.relname AS indexname,
    t.spcname AS tablespace,
    pg_get_indexdef(i.oid) AS indexdef
   FROM ((((pg_index x
     JOIN pg_class c ON ((c.oid = x.indrelid)))
     JOIN pg_class i ON ((i.oid = x.indexrelid)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
     LEFT JOIN pg_tablespace t ON ((t.oid = i.reltablespace)))
  WHERE ((c.relkind = ANY (ARRAY['r'::"char", 'm'::"char", 'p'::"char"])) AND (i.relkind = ANY (ARRAY['i'::"char", 'I'::"char"])));


ALTER TABLE pg_catalog.pg_indexes OWNER TO daodao;

--
-- Name: pg_inherits; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_inherits (
    inhrelid oid NOT NULL,
    inhparent oid NOT NULL,
    inhseqno integer NOT NULL,
    inhdetachpending boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_inherits REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_inherits OWNER TO daodao;

--
-- Name: pg_init_privs; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_init_privs (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    objsubid integer NOT NULL,
    privtype "char" NOT NULL,
    initprivs aclitem[] NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_init_privs REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_init_privs OWNER TO daodao;

--
-- Name: pg_language; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_language (
    oid oid NOT NULL,
    lanname name NOT NULL,
    lanowner oid NOT NULL,
    lanispl boolean NOT NULL,
    lanpltrusted boolean NOT NULL,
    lanplcallfoid oid NOT NULL,
    laninline oid NOT NULL,
    lanvalidator oid NOT NULL,
    lanacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_language REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_language OWNER TO daodao;

--
-- Name: pg_largeobject; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_largeobject (
    loid oid NOT NULL,
    pageno integer NOT NULL,
    data bytea NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_largeobject REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_largeobject OWNER TO daodao;

--
-- Name: pg_largeobject_metadata; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_largeobject_metadata (
    oid oid NOT NULL,
    lomowner oid NOT NULL,
    lomacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_largeobject_metadata REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_largeobject_metadata OWNER TO daodao;

--
-- Name: pg_locks; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_locks AS
 SELECT l.locktype,
    l.database,
    l.relation,
    l.page,
    l.tuple,
    l.virtualxid,
    l.transactionid,
    l.classid,
    l.objid,
    l.objsubid,
    l.virtualtransaction,
    l.pid,
    l.mode,
    l.granted,
    l.fastpath,
    l.waitstart
   FROM pg_lock_status() l(locktype, database, relation, page, tuple, virtualxid, transactionid, classid, objid, objsubid, virtualtransaction, pid, mode, granted, fastpath, waitstart);


ALTER TABLE pg_catalog.pg_locks OWNER TO daodao;

--
-- Name: pg_matviews; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_matviews AS
 SELECT n.nspname AS schemaname,
    c.relname AS matviewname,
    pg_get_userbyid(c.relowner) AS matviewowner,
    t.spcname AS tablespace,
    c.relhasindex AS hasindexes,
    c.relispopulated AS ispopulated,
    pg_get_viewdef(c.oid) AS definition
   FROM ((pg_class c
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
     LEFT JOIN pg_tablespace t ON ((t.oid = c.reltablespace)))
  WHERE (c.relkind = 'm'::"char");


ALTER TABLE pg_catalog.pg_matviews OWNER TO daodao;

--
-- Name: pg_namespace; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_namespace (
    oid oid NOT NULL,
    nspname name NOT NULL,
    nspowner oid NOT NULL,
    nspacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_namespace REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_namespace OWNER TO daodao;

--
-- Name: pg_opclass; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_opclass (
    oid oid NOT NULL,
    opcmethod oid NOT NULL,
    opcname name NOT NULL,
    opcnamespace oid NOT NULL,
    opcowner oid NOT NULL,
    opcfamily oid NOT NULL,
    opcintype oid NOT NULL,
    opcdefault boolean NOT NULL,
    opckeytype oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_opclass REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_opclass OWNER TO daodao;

--
-- Name: pg_operator; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_operator (
    oid oid NOT NULL,
    oprname name NOT NULL,
    oprnamespace oid NOT NULL,
    oprowner oid NOT NULL,
    oprkind "char" NOT NULL,
    oprcanmerge boolean NOT NULL,
    oprcanhash boolean NOT NULL,
    oprleft oid NOT NULL,
    oprright oid NOT NULL,
    oprresult oid NOT NULL,
    oprcom oid NOT NULL,
    oprnegate oid NOT NULL,
    oprcode regproc NOT NULL,
    oprrest regproc NOT NULL,
    oprjoin regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_operator REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_operator OWNER TO daodao;

--
-- Name: pg_opfamily; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_opfamily (
    oid oid NOT NULL,
    opfmethod oid NOT NULL,
    opfname name NOT NULL,
    opfnamespace oid NOT NULL,
    opfowner oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_opfamily REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_opfamily OWNER TO daodao;

--
-- Name: pg_partitioned_table; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_partitioned_table (
    partrelid oid NOT NULL,
    partstrat "char" NOT NULL,
    partnatts smallint NOT NULL,
    partdefid oid NOT NULL,
    partattrs int2vector NOT NULL,
    partclass oidvector NOT NULL,
    partcollation oidvector NOT NULL,
    partexprs pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_partitioned_table REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_partitioned_table OWNER TO daodao;

--
-- Name: pg_policies; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_policies AS
 SELECT n.nspname AS schemaname,
    c.relname AS tablename,
    pol.polname AS policyname,
        CASE
            WHEN pol.polpermissive THEN 'PERMISSIVE'::text
            ELSE 'RESTRICTIVE'::text
        END AS permissive,
        CASE
            WHEN (pol.polroles = '{0}'::oid[]) THEN (string_to_array('public'::text, ''::text))::name[]
            ELSE ARRAY( SELECT pg_authid.rolname
               FROM pg_authid
              WHERE (pg_authid.oid = ANY (pol.polroles))
              ORDER BY pg_authid.rolname)
        END AS roles,
        CASE pol.polcmd
            WHEN 'r'::"char" THEN 'SELECT'::text
            WHEN 'a'::"char" THEN 'INSERT'::text
            WHEN 'w'::"char" THEN 'UPDATE'::text
            WHEN 'd'::"char" THEN 'DELETE'::text
            WHEN '*'::"char" THEN 'ALL'::text
            ELSE NULL::text
        END AS cmd,
    pg_get_expr(pol.polqual, pol.polrelid) AS qual,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check
   FROM ((pg_policy pol
     JOIN pg_class c ON ((c.oid = pol.polrelid)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)));


ALTER TABLE pg_catalog.pg_policies OWNER TO daodao;

--
-- Name: pg_policy; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_policy (
    oid oid NOT NULL,
    polname name NOT NULL,
    polrelid oid NOT NULL,
    polcmd "char" NOT NULL,
    polpermissive boolean NOT NULL,
    polroles oid[] NOT NULL,
    polqual pg_node_tree COLLATE pg_catalog."C",
    polwithcheck pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_policy REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_policy OWNER TO daodao;

--
-- Name: pg_prepared_statements; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_prepared_statements AS
 SELECT p.name,
    p.statement,
    p.prepare_time,
    p.parameter_types,
    p.from_sql,
    p.generic_plans,
    p.custom_plans
   FROM pg_prepared_statement() p(name, statement, prepare_time, parameter_types, from_sql, generic_plans, custom_plans);


ALTER TABLE pg_catalog.pg_prepared_statements OWNER TO daodao;

--
-- Name: pg_prepared_xacts; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_prepared_xacts AS
 SELECT p.transaction,
    p.gid,
    p.prepared,
    u.rolname AS owner,
    d.datname AS database
   FROM ((pg_prepared_xact() p(transaction, gid, prepared, ownerid, dbid)
     LEFT JOIN pg_authid u ON ((p.ownerid = u.oid)))
     LEFT JOIN pg_database d ON ((p.dbid = d.oid)));


ALTER TABLE pg_catalog.pg_prepared_xacts OWNER TO daodao;

--
-- Name: pg_proc; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_proc (
    oid oid NOT NULL,
    proname name NOT NULL,
    pronamespace oid NOT NULL,
    proowner oid NOT NULL,
    prolang oid NOT NULL,
    procost real NOT NULL,
    prorows real NOT NULL,
    provariadic oid NOT NULL,
    prosupport regproc NOT NULL,
    prokind "char" NOT NULL,
    prosecdef boolean NOT NULL,
    proleakproof boolean NOT NULL,
    proisstrict boolean NOT NULL,
    proretset boolean NOT NULL,
    provolatile "char" NOT NULL,
    proparallel "char" NOT NULL,
    pronargs smallint NOT NULL,
    pronargdefaults smallint NOT NULL,
    prorettype oid NOT NULL,
    proargtypes oidvector NOT NULL,
    proallargtypes oid[],
    proargmodes "char"[],
    proargnames text[] COLLATE pg_catalog."C",
    proargdefaults pg_node_tree COLLATE pg_catalog."C",
    protrftypes oid[],
    prosrc text NOT NULL COLLATE pg_catalog."C",
    probin text COLLATE pg_catalog."C",
    prosqlbody pg_node_tree COLLATE pg_catalog."C",
    proconfig text[] COLLATE pg_catalog."C",
    proacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_proc REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_proc OWNER TO daodao;

--
-- Name: pg_publication; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_publication (
    oid oid NOT NULL,
    pubname name NOT NULL,
    pubowner oid NOT NULL,
    puballtables boolean NOT NULL,
    pubinsert boolean NOT NULL,
    pubupdate boolean NOT NULL,
    pubdelete boolean NOT NULL,
    pubtruncate boolean NOT NULL,
    pubviaroot boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_publication REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_publication OWNER TO daodao;

--
-- Name: pg_publication_rel; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_publication_rel (
    oid oid NOT NULL,
    prpubid oid NOT NULL,
    prrelid oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_publication_rel REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_publication_rel OWNER TO daodao;

--
-- Name: pg_publication_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_publication_tables AS
 SELECT p.pubname,
    n.nspname AS schemaname,
    c.relname AS tablename
   FROM pg_publication p,
    LATERAL pg_get_publication_tables((p.pubname)::text) gpt(relid),
    (pg_class c
     JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (c.oid = gpt.relid);


ALTER TABLE pg_catalog.pg_publication_tables OWNER TO daodao;

--
-- Name: pg_range; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_range (
    rngtypid oid NOT NULL,
    rngsubtype oid NOT NULL,
    rngmultitypid oid NOT NULL,
    rngcollation oid NOT NULL,
    rngsubopc oid NOT NULL,
    rngcanonical regproc NOT NULL,
    rngsubdiff regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_range REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_range OWNER TO daodao;

SET default_tablespace = pg_global;

--
-- Name: pg_replication_origin; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_replication_origin (
    roident oid NOT NULL,
    roname text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_replication_origin REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_replication_origin OWNER TO daodao;

--
-- Name: pg_replication_origin_status; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_replication_origin_status AS
 SELECT pg_show_replication_origin_status.local_id,
    pg_show_replication_origin_status.external_id,
    pg_show_replication_origin_status.remote_lsn,
    pg_show_replication_origin_status.local_lsn
   FROM pg_show_replication_origin_status() pg_show_replication_origin_status(local_id, external_id, remote_lsn, local_lsn);


ALTER TABLE pg_catalog.pg_replication_origin_status OWNER TO daodao;

--
-- Name: pg_replication_slots; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_replication_slots AS
 SELECT l.slot_name,
    l.plugin,
    l.slot_type,
    l.datoid,
    d.datname AS database,
    l.temporary,
    l.active,
    l.active_pid,
    l.xmin,
    l.catalog_xmin,
    l.restart_lsn,
    l.confirmed_flush_lsn,
    l.wal_status,
    l.safe_wal_size,
    l.two_phase
   FROM (pg_get_replication_slots() l(slot_name, plugin, slot_type, datoid, temporary, active, active_pid, xmin, catalog_xmin, restart_lsn, confirmed_flush_lsn, wal_status, safe_wal_size, two_phase)
     LEFT JOIN pg_database d ON ((l.datoid = d.oid)));


ALTER TABLE pg_catalog.pg_replication_slots OWNER TO daodao;

SET default_tablespace = '';

--
-- Name: pg_rewrite; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_rewrite (
    oid oid NOT NULL,
    rulename name NOT NULL,
    ev_class oid NOT NULL,
    ev_type "char" NOT NULL,
    ev_enabled "char" NOT NULL,
    is_instead boolean NOT NULL,
    ev_qual pg_node_tree NOT NULL COLLATE pg_catalog."C",
    ev_action pg_node_tree NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_rewrite REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_rewrite OWNER TO daodao;

--
-- Name: pg_roles; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_roles AS
 SELECT pg_authid.rolname,
    pg_authid.rolsuper,
    pg_authid.rolinherit,
    pg_authid.rolcreaterole,
    pg_authid.rolcreatedb,
    pg_authid.rolcanlogin,
    pg_authid.rolreplication,
    pg_authid.rolconnlimit,
    '********'::text AS rolpassword,
    pg_authid.rolvaliduntil,
    pg_authid.rolbypassrls,
    s.setconfig AS rolconfig,
    pg_authid.oid
   FROM (pg_authid
     LEFT JOIN pg_db_role_setting s ON (((pg_authid.oid = s.setrole) AND (s.setdatabase = (0)::oid))));


ALTER TABLE pg_catalog.pg_roles OWNER TO daodao;

--
-- Name: pg_rules; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_rules AS
 SELECT n.nspname AS schemaname,
    c.relname AS tablename,
    r.rulename,
    pg_get_ruledef(r.oid) AS definition
   FROM ((pg_rewrite r
     JOIN pg_class c ON ((c.oid = r.ev_class)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (r.rulename <> '_RETURN'::name);


ALTER TABLE pg_catalog.pg_rules OWNER TO daodao;

--
-- Name: pg_seclabel; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_seclabel (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    objsubid integer NOT NULL,
    provider text NOT NULL COLLATE pg_catalog."C",
    label text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_seclabel REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_seclabel OWNER TO daodao;

--
-- Name: pg_seclabels; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_seclabels AS
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
        CASE
            WHEN (rel.relkind = ANY (ARRAY['r'::"char", 'p'::"char"])) THEN 'table'::text
            WHEN (rel.relkind = 'v'::"char") THEN 'view'::text
            WHEN (rel.relkind = 'm'::"char") THEN 'materialized view'::text
            WHEN (rel.relkind = 'S'::"char") THEN 'sequence'::text
            WHEN (rel.relkind = 'f'::"char") THEN 'foreign table'::text
            ELSE NULL::text
        END AS objtype,
    rel.relnamespace AS objnamespace,
        CASE
            WHEN pg_table_is_visible(rel.oid) THEN quote_ident((rel.relname)::text)
            ELSE ((quote_ident((nsp.nspname)::text) || '.'::text) || quote_ident((rel.relname)::text))
        END AS objname,
    l.provider,
    l.label
   FROM ((pg_seclabel l
     JOIN pg_class rel ON (((l.classoid = rel.tableoid) AND (l.objoid = rel.oid))))
     JOIN pg_namespace nsp ON ((rel.relnamespace = nsp.oid)))
  WHERE (l.objsubid = 0)
UNION ALL
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
    'column'::text AS objtype,
    rel.relnamespace AS objnamespace,
    ((
        CASE
            WHEN pg_table_is_visible(rel.oid) THEN quote_ident((rel.relname)::text)
            ELSE ((quote_ident((nsp.nspname)::text) || '.'::text) || quote_ident((rel.relname)::text))
        END || '.'::text) || (att.attname)::text) AS objname,
    l.provider,
    l.label
   FROM (((pg_seclabel l
     JOIN pg_class rel ON (((l.classoid = rel.tableoid) AND (l.objoid = rel.oid))))
     JOIN pg_attribute att ON (((rel.oid = att.attrelid) AND (l.objsubid = att.attnum))))
     JOIN pg_namespace nsp ON ((rel.relnamespace = nsp.oid)))
  WHERE (l.objsubid <> 0)
UNION ALL
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
        CASE pro.prokind
            WHEN 'a'::"char" THEN 'aggregate'::text
            WHEN 'f'::"char" THEN 'function'::text
            WHEN 'p'::"char" THEN 'procedure'::text
            WHEN 'w'::"char" THEN 'window'::text
            ELSE NULL::text
        END AS objtype,
    pro.pronamespace AS objnamespace,
    (((
        CASE
            WHEN pg_function_is_visible(pro.oid) THEN quote_ident((pro.proname)::text)
            ELSE ((quote_ident((nsp.nspname)::text) || '.'::text) || quote_ident((pro.proname)::text))
        END || '('::text) || pg_get_function_arguments(pro.oid)) || ')'::text) AS objname,
    l.provider,
    l.label
   FROM ((pg_seclabel l
     JOIN pg_proc pro ON (((l.classoid = pro.tableoid) AND (l.objoid = pro.oid))))
     JOIN pg_namespace nsp ON ((pro.pronamespace = nsp.oid)))
  WHERE (l.objsubid = 0)
UNION ALL
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
        CASE
            WHEN (typ.typtype = 'd'::"char") THEN 'domain'::text
            ELSE 'type'::text
        END AS objtype,
    typ.typnamespace AS objnamespace,
        CASE
            WHEN pg_type_is_visible(typ.oid) THEN quote_ident((typ.typname)::text)
            ELSE ((quote_ident((nsp.nspname)::text) || '.'::text) || quote_ident((typ.typname)::text))
        END AS objname,
    l.provider,
    l.label
   FROM ((pg_seclabel l
     JOIN pg_type typ ON (((l.classoid = typ.tableoid) AND (l.objoid = typ.oid))))
     JOIN pg_namespace nsp ON ((typ.typnamespace = nsp.oid)))
  WHERE (l.objsubid = 0)
UNION ALL
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
    'large object'::text AS objtype,
    NULL::oid AS objnamespace,
    (l.objoid)::text AS objname,
    l.provider,
    l.label
   FROM (pg_seclabel l
     JOIN pg_largeobject_metadata lom ON ((l.objoid = lom.oid)))
  WHERE ((l.classoid = ('pg_largeobject'::regclass)::oid) AND (l.objsubid = 0))
UNION ALL
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
    'language'::text AS objtype,
    NULL::oid AS objnamespace,
    quote_ident((lan.lanname)::text) AS objname,
    l.provider,
    l.label
   FROM (pg_seclabel l
     JOIN pg_language lan ON (((l.classoid = lan.tableoid) AND (l.objoid = lan.oid))))
  WHERE (l.objsubid = 0)
UNION ALL
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
    'schema'::text AS objtype,
    nsp.oid AS objnamespace,
    quote_ident((nsp.nspname)::text) AS objname,
    l.provider,
    l.label
   FROM (pg_seclabel l
     JOIN pg_namespace nsp ON (((l.classoid = nsp.tableoid) AND (l.objoid = nsp.oid))))
  WHERE (l.objsubid = 0)
UNION ALL
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
    'event trigger'::text AS objtype,
    NULL::oid AS objnamespace,
    quote_ident((evt.evtname)::text) AS objname,
    l.provider,
    l.label
   FROM (pg_seclabel l
     JOIN pg_event_trigger evt ON (((l.classoid = evt.tableoid) AND (l.objoid = evt.oid))))
  WHERE (l.objsubid = 0)
UNION ALL
 SELECT l.objoid,
    l.classoid,
    l.objsubid,
    'publication'::text AS objtype,
    NULL::oid AS objnamespace,
    quote_ident((p.pubname)::text) AS objname,
    l.provider,
    l.label
   FROM (pg_seclabel l
     JOIN pg_publication p ON (((l.classoid = p.tableoid) AND (l.objoid = p.oid))))
  WHERE (l.objsubid = 0)
UNION ALL
 SELECT l.objoid,
    l.classoid,
    0 AS objsubid,
    'subscription'::text AS objtype,
    NULL::oid AS objnamespace,
    quote_ident((s.subname)::text) AS objname,
    l.provider,
    l.label
   FROM (pg_shseclabel l
     JOIN pg_subscription s ON (((l.classoid = s.tableoid) AND (l.objoid = s.oid))))
UNION ALL
 SELECT l.objoid,
    l.classoid,
    0 AS objsubid,
    'database'::text AS objtype,
    NULL::oid AS objnamespace,
    quote_ident((dat.datname)::text) AS objname,
    l.provider,
    l.label
   FROM (pg_shseclabel l
     JOIN pg_database dat ON (((l.classoid = dat.tableoid) AND (l.objoid = dat.oid))))
UNION ALL
 SELECT l.objoid,
    l.classoid,
    0 AS objsubid,
    'tablespace'::text AS objtype,
    NULL::oid AS objnamespace,
    quote_ident((spc.spcname)::text) AS objname,
    l.provider,
    l.label
   FROM (pg_shseclabel l
     JOIN pg_tablespace spc ON (((l.classoid = spc.tableoid) AND (l.objoid = spc.oid))))
UNION ALL
 SELECT l.objoid,
    l.classoid,
    0 AS objsubid,
    'role'::text AS objtype,
    NULL::oid AS objnamespace,
    quote_ident((rol.rolname)::text) AS objname,
    l.provider,
    l.label
   FROM (pg_shseclabel l
     JOIN pg_authid rol ON (((l.classoid = rol.tableoid) AND (l.objoid = rol.oid))));


ALTER TABLE pg_catalog.pg_seclabels OWNER TO daodao;

--
-- Name: pg_sequence; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_sequence (
    seqrelid oid NOT NULL,
    seqtypid oid NOT NULL,
    seqstart bigint NOT NULL,
    seqincrement bigint NOT NULL,
    seqmax bigint NOT NULL,
    seqmin bigint NOT NULL,
    seqcache bigint NOT NULL,
    seqcycle boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_sequence REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_sequence OWNER TO daodao;

--
-- Name: pg_sequences; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_sequences AS
 SELECT n.nspname AS schemaname,
    c.relname AS sequencename,
    pg_get_userbyid(c.relowner) AS sequenceowner,
    (s.seqtypid)::regtype AS data_type,
    s.seqstart AS start_value,
    s.seqmin AS min_value,
    s.seqmax AS max_value,
    s.seqincrement AS increment_by,
    s.seqcycle AS cycle,
    s.seqcache AS cache_size,
        CASE
            WHEN has_sequence_privilege(c.oid, 'SELECT,USAGE'::text) THEN pg_sequence_last_value((c.oid)::regclass)
            ELSE NULL::bigint
        END AS last_value
   FROM ((pg_sequence s
     JOIN pg_class c ON ((c.oid = s.seqrelid)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE ((NOT pg_is_other_temp_schema(n.oid)) AND (c.relkind = 'S'::"char"));


ALTER TABLE pg_catalog.pg_sequences OWNER TO daodao;

--
-- Name: pg_settings; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_settings AS
 SELECT a.name,
    a.setting,
    a.unit,
    a.category,
    a.short_desc,
    a.extra_desc,
    a.context,
    a.vartype,
    a.source,
    a.min_val,
    a.max_val,
    a.enumvals,
    a.boot_val,
    a.reset_val,
    a.sourcefile,
    a.sourceline,
    a.pending_restart
   FROM pg_show_all_settings() a(name, setting, unit, category, short_desc, extra_desc, context, vartype, source, min_val, max_val, enumvals, boot_val, reset_val, sourcefile, sourceline, pending_restart);


ALTER TABLE pg_catalog.pg_settings OWNER TO daodao;

--
-- Name: pg_shadow; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_shadow AS
 SELECT pg_authid.rolname AS usename,
    pg_authid.oid AS usesysid,
    pg_authid.rolcreatedb AS usecreatedb,
    pg_authid.rolsuper AS usesuper,
    pg_authid.rolreplication AS userepl,
    pg_authid.rolbypassrls AS usebypassrls,
    pg_authid.rolpassword AS passwd,
    pg_authid.rolvaliduntil AS valuntil,
    s.setconfig AS useconfig
   FROM (pg_authid
     LEFT JOIN pg_db_role_setting s ON (((pg_authid.oid = s.setrole) AND (s.setdatabase = (0)::oid))))
  WHERE pg_authid.rolcanlogin;


ALTER TABLE pg_catalog.pg_shadow OWNER TO daodao;

SET default_tablespace = pg_global;

--
-- Name: pg_shdepend; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_shdepend (
    dbid oid NOT NULL,
    classid oid NOT NULL,
    objid oid NOT NULL,
    objsubid integer NOT NULL,
    refclassid oid NOT NULL,
    refobjid oid NOT NULL,
    deptype "char" NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_shdepend REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_shdepend OWNER TO daodao;

--
-- Name: pg_shdescription; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_shdescription (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    description text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_shdescription REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_shdescription OWNER TO daodao;

--
-- Name: pg_shmem_allocations; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_shmem_allocations AS
 SELECT pg_get_shmem_allocations.name,
    pg_get_shmem_allocations.off,
    pg_get_shmem_allocations.size,
    pg_get_shmem_allocations.allocated_size
   FROM pg_get_shmem_allocations() pg_get_shmem_allocations(name, off, size, allocated_size);


ALTER TABLE pg_catalog.pg_shmem_allocations OWNER TO daodao;

--
-- Name: pg_shseclabel; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_shseclabel (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    provider text NOT NULL COLLATE pg_catalog."C",
    label text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_shseclabel REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_shseclabel OWNER TO daodao;

--
-- Name: pg_stat_activity; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_activity AS
 SELECT s.datid,
    d.datname,
    s.pid,
    s.leader_pid,
    s.usesysid,
    u.rolname AS usename,
    s.application_name,
    s.client_addr,
    s.client_hostname,
    s.client_port,
    s.backend_start,
    s.xact_start,
    s.query_start,
    s.state_change,
    s.wait_event_type,
    s.wait_event,
    s.state,
    s.backend_xid,
    s.backend_xmin,
    s.query_id,
    s.query,
    s.backend_type
   FROM ((pg_stat_get_activity(NULL::integer) s(datid, pid, usesysid, application_name, state, query, wait_event_type, wait_event, xact_start, query_start, backend_start, state_change, client_addr, client_hostname, client_port, backend_xid, backend_xmin, backend_type, ssl, sslversion, sslcipher, sslbits, ssl_client_dn, ssl_client_serial, ssl_issuer_dn, gss_auth, gss_princ, gss_enc, leader_pid, query_id)
     LEFT JOIN pg_database d ON ((s.datid = d.oid)))
     LEFT JOIN pg_authid u ON ((s.usesysid = u.oid)));


ALTER TABLE pg_catalog.pg_stat_activity OWNER TO daodao;

--
-- Name: pg_stat_all_indexes; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_all_indexes AS
 SELECT c.oid AS relid,
    i.oid AS indexrelid,
    n.nspname AS schemaname,
    c.relname,
    i.relname AS indexrelname,
    pg_stat_get_numscans(i.oid) AS idx_scan,
    pg_stat_get_tuples_returned(i.oid) AS idx_tup_read,
    pg_stat_get_tuples_fetched(i.oid) AS idx_tup_fetch
   FROM (((pg_class c
     JOIN pg_index x ON ((c.oid = x.indrelid)))
     JOIN pg_class i ON ((i.oid = x.indexrelid)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (c.relkind = ANY (ARRAY['r'::"char", 't'::"char", 'm'::"char"]));


ALTER TABLE pg_catalog.pg_stat_all_indexes OWNER TO daodao;

--
-- Name: pg_stat_all_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_all_tables AS
 SELECT c.oid AS relid,
    n.nspname AS schemaname,
    c.relname,
    pg_stat_get_numscans(c.oid) AS seq_scan,
    pg_stat_get_tuples_returned(c.oid) AS seq_tup_read,
    (sum(pg_stat_get_numscans(i.indexrelid)))::bigint AS idx_scan,
    ((sum(pg_stat_get_tuples_fetched(i.indexrelid)))::bigint + pg_stat_get_tuples_fetched(c.oid)) AS idx_tup_fetch,
    pg_stat_get_tuples_inserted(c.oid) AS n_tup_ins,
    pg_stat_get_tuples_updated(c.oid) AS n_tup_upd,
    pg_stat_get_tuples_deleted(c.oid) AS n_tup_del,
    pg_stat_get_tuples_hot_updated(c.oid) AS n_tup_hot_upd,
    pg_stat_get_live_tuples(c.oid) AS n_live_tup,
    pg_stat_get_dead_tuples(c.oid) AS n_dead_tup,
    pg_stat_get_mod_since_analyze(c.oid) AS n_mod_since_analyze,
    pg_stat_get_ins_since_vacuum(c.oid) AS n_ins_since_vacuum,
    pg_stat_get_last_vacuum_time(c.oid) AS last_vacuum,
    pg_stat_get_last_autovacuum_time(c.oid) AS last_autovacuum,
    pg_stat_get_last_analyze_time(c.oid) AS last_analyze,
    pg_stat_get_last_autoanalyze_time(c.oid) AS last_autoanalyze,
    pg_stat_get_vacuum_count(c.oid) AS vacuum_count,
    pg_stat_get_autovacuum_count(c.oid) AS autovacuum_count,
    pg_stat_get_analyze_count(c.oid) AS analyze_count,
    pg_stat_get_autoanalyze_count(c.oid) AS autoanalyze_count
   FROM ((pg_class c
     LEFT JOIN pg_index i ON ((c.oid = i.indrelid)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (c.relkind = ANY (ARRAY['r'::"char", 't'::"char", 'm'::"char", 'p'::"char"]))
  GROUP BY c.oid, n.nspname, c.relname;


ALTER TABLE pg_catalog.pg_stat_all_tables OWNER TO daodao;

--
-- Name: pg_stat_archiver; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_archiver AS
 SELECT s.archived_count,
    s.last_archived_wal,
    s.last_archived_time,
    s.failed_count,
    s.last_failed_wal,
    s.last_failed_time,
    s.stats_reset
   FROM pg_stat_get_archiver() s(archived_count, last_archived_wal, last_archived_time, failed_count, last_failed_wal, last_failed_time, stats_reset);


ALTER TABLE pg_catalog.pg_stat_archiver OWNER TO daodao;

--
-- Name: pg_stat_bgwriter; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_bgwriter AS
 SELECT pg_stat_get_bgwriter_timed_checkpoints() AS checkpoints_timed,
    pg_stat_get_bgwriter_requested_checkpoints() AS checkpoints_req,
    pg_stat_get_checkpoint_write_time() AS checkpoint_write_time,
    pg_stat_get_checkpoint_sync_time() AS checkpoint_sync_time,
    pg_stat_get_bgwriter_buf_written_checkpoints() AS buffers_checkpoint,
    pg_stat_get_bgwriter_buf_written_clean() AS buffers_clean,
    pg_stat_get_bgwriter_maxwritten_clean() AS maxwritten_clean,
    pg_stat_get_buf_written_backend() AS buffers_backend,
    pg_stat_get_buf_fsync_backend() AS buffers_backend_fsync,
    pg_stat_get_buf_alloc() AS buffers_alloc,
    pg_stat_get_bgwriter_stat_reset_time() AS stats_reset;


ALTER TABLE pg_catalog.pg_stat_bgwriter OWNER TO daodao;

--
-- Name: pg_stat_database; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_database AS
 SELECT d.oid AS datid,
    d.datname,
        CASE
            WHEN (d.oid = (0)::oid) THEN 0
            ELSE pg_stat_get_db_numbackends(d.oid)
        END AS numbackends,
    pg_stat_get_db_xact_commit(d.oid) AS xact_commit,
    pg_stat_get_db_xact_rollback(d.oid) AS xact_rollback,
    (pg_stat_get_db_blocks_fetched(d.oid) - pg_stat_get_db_blocks_hit(d.oid)) AS blks_read,
    pg_stat_get_db_blocks_hit(d.oid) AS blks_hit,
    pg_stat_get_db_tuples_returned(d.oid) AS tup_returned,
    pg_stat_get_db_tuples_fetched(d.oid) AS tup_fetched,
    pg_stat_get_db_tuples_inserted(d.oid) AS tup_inserted,
    pg_stat_get_db_tuples_updated(d.oid) AS tup_updated,
    pg_stat_get_db_tuples_deleted(d.oid) AS tup_deleted,
    pg_stat_get_db_conflict_all(d.oid) AS conflicts,
    pg_stat_get_db_temp_files(d.oid) AS temp_files,
    pg_stat_get_db_temp_bytes(d.oid) AS temp_bytes,
    pg_stat_get_db_deadlocks(d.oid) AS deadlocks,
    pg_stat_get_db_checksum_failures(d.oid) AS checksum_failures,
    pg_stat_get_db_checksum_last_failure(d.oid) AS checksum_last_failure,
    pg_stat_get_db_blk_read_time(d.oid) AS blk_read_time,
    pg_stat_get_db_blk_write_time(d.oid) AS blk_write_time,
    pg_stat_get_db_session_time(d.oid) AS session_time,
    pg_stat_get_db_active_time(d.oid) AS active_time,
    pg_stat_get_db_idle_in_transaction_time(d.oid) AS idle_in_transaction_time,
    pg_stat_get_db_sessions(d.oid) AS sessions,
    pg_stat_get_db_sessions_abandoned(d.oid) AS sessions_abandoned,
    pg_stat_get_db_sessions_fatal(d.oid) AS sessions_fatal,
    pg_stat_get_db_sessions_killed(d.oid) AS sessions_killed,
    pg_stat_get_db_stat_reset_time(d.oid) AS stats_reset
   FROM ( SELECT 0 AS oid,
            NULL::name AS datname
        UNION ALL
         SELECT pg_database.oid,
            pg_database.datname
           FROM pg_database) d;


ALTER TABLE pg_catalog.pg_stat_database OWNER TO daodao;

--
-- Name: pg_stat_database_conflicts; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_database_conflicts AS
 SELECT d.oid AS datid,
    d.datname,
    pg_stat_get_db_conflict_tablespace(d.oid) AS confl_tablespace,
    pg_stat_get_db_conflict_lock(d.oid) AS confl_lock,
    pg_stat_get_db_conflict_snapshot(d.oid) AS confl_snapshot,
    pg_stat_get_db_conflict_bufferpin(d.oid) AS confl_bufferpin,
    pg_stat_get_db_conflict_startup_deadlock(d.oid) AS confl_deadlock
   FROM pg_database d;


ALTER TABLE pg_catalog.pg_stat_database_conflicts OWNER TO daodao;

--
-- Name: pg_stat_gssapi; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_gssapi AS
 SELECT s.pid,
    s.gss_auth AS gss_authenticated,
    s.gss_princ AS principal,
    s.gss_enc AS encrypted
   FROM pg_stat_get_activity(NULL::integer) s(datid, pid, usesysid, application_name, state, query, wait_event_type, wait_event, xact_start, query_start, backend_start, state_change, client_addr, client_hostname, client_port, backend_xid, backend_xmin, backend_type, ssl, sslversion, sslcipher, sslbits, ssl_client_dn, ssl_client_serial, ssl_issuer_dn, gss_auth, gss_princ, gss_enc, leader_pid, query_id)
  WHERE (s.client_port IS NOT NULL);


ALTER TABLE pg_catalog.pg_stat_gssapi OWNER TO daodao;

--
-- Name: pg_stat_progress_analyze; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_progress_analyze AS
 SELECT s.pid,
    s.datid,
    d.datname,
    s.relid,
        CASE s.param1
            WHEN 0 THEN 'initializing'::text
            WHEN 1 THEN 'acquiring sample rows'::text
            WHEN 2 THEN 'acquiring inherited sample rows'::text
            WHEN 3 THEN 'computing statistics'::text
            WHEN 4 THEN 'computing extended statistics'::text
            WHEN 5 THEN 'finalizing analyze'::text
            ELSE NULL::text
        END AS phase,
    s.param2 AS sample_blks_total,
    s.param3 AS sample_blks_scanned,
    s.param4 AS ext_stats_total,
    s.param5 AS ext_stats_computed,
    s.param6 AS child_tables_total,
    s.param7 AS child_tables_done,
    (s.param8)::oid AS current_child_table_relid
   FROM (pg_stat_get_progress_info('ANALYZE'::text) s(pid, datid, relid, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14, param15, param16, param17, param18, param19, param20)
     LEFT JOIN pg_database d ON ((s.datid = d.oid)));


ALTER TABLE pg_catalog.pg_stat_progress_analyze OWNER TO daodao;

--
-- Name: pg_stat_progress_basebackup; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_progress_basebackup AS
 SELECT s.pid,
        CASE s.param1
            WHEN 0 THEN 'initializing'::text
            WHEN 1 THEN 'waiting for checkpoint to finish'::text
            WHEN 2 THEN 'estimating backup size'::text
            WHEN 3 THEN 'streaming database files'::text
            WHEN 4 THEN 'waiting for wal archiving to finish'::text
            WHEN 5 THEN 'transferring wal files'::text
            ELSE NULL::text
        END AS phase,
        CASE s.param2
            WHEN '-1'::integer THEN NULL::bigint
            ELSE s.param2
        END AS backup_total,
    s.param3 AS backup_streamed,
    s.param4 AS tablespaces_total,
    s.param5 AS tablespaces_streamed
   FROM pg_stat_get_progress_info('BASEBACKUP'::text) s(pid, datid, relid, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14, param15, param16, param17, param18, param19, param20);


ALTER TABLE pg_catalog.pg_stat_progress_basebackup OWNER TO daodao;

--
-- Name: pg_stat_progress_cluster; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_progress_cluster AS
 SELECT s.pid,
    s.datid,
    d.datname,
    s.relid,
        CASE s.param1
            WHEN 1 THEN 'CLUSTER'::text
            WHEN 2 THEN 'VACUUM FULL'::text
            ELSE NULL::text
        END AS command,
        CASE s.param2
            WHEN 0 THEN 'initializing'::text
            WHEN 1 THEN 'seq scanning heap'::text
            WHEN 2 THEN 'index scanning heap'::text
            WHEN 3 THEN 'sorting tuples'::text
            WHEN 4 THEN 'writing new heap'::text
            WHEN 5 THEN 'swapping relation files'::text
            WHEN 6 THEN 'rebuilding index'::text
            WHEN 7 THEN 'performing final cleanup'::text
            ELSE NULL::text
        END AS phase,
    (s.param3)::oid AS cluster_index_relid,
    s.param4 AS heap_tuples_scanned,
    s.param5 AS heap_tuples_written,
    s.param6 AS heap_blks_total,
    s.param7 AS heap_blks_scanned,
    s.param8 AS index_rebuild_count
   FROM (pg_stat_get_progress_info('CLUSTER'::text) s(pid, datid, relid, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14, param15, param16, param17, param18, param19, param20)
     LEFT JOIN pg_database d ON ((s.datid = d.oid)));


ALTER TABLE pg_catalog.pg_stat_progress_cluster OWNER TO daodao;

--
-- Name: pg_stat_progress_copy; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_progress_copy AS
 SELECT s.pid,
    s.datid,
    d.datname,
    s.relid,
        CASE s.param5
            WHEN 1 THEN 'COPY FROM'::text
            WHEN 2 THEN 'COPY TO'::text
            ELSE NULL::text
        END AS command,
        CASE s.param6
            WHEN 1 THEN 'FILE'::text
            WHEN 2 THEN 'PROGRAM'::text
            WHEN 3 THEN 'PIPE'::text
            WHEN 4 THEN 'CALLBACK'::text
            ELSE NULL::text
        END AS type,
    s.param1 AS bytes_processed,
    s.param2 AS bytes_total,
    s.param3 AS tuples_processed,
    s.param4 AS tuples_excluded
   FROM (pg_stat_get_progress_info('COPY'::text) s(pid, datid, relid, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14, param15, param16, param17, param18, param19, param20)
     LEFT JOIN pg_database d ON ((s.datid = d.oid)));


ALTER TABLE pg_catalog.pg_stat_progress_copy OWNER TO daodao;

--
-- Name: pg_stat_progress_create_index; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_progress_create_index AS
 SELECT s.pid,
    s.datid,
    d.datname,
    s.relid,
    (s.param7)::oid AS index_relid,
        CASE s.param1
            WHEN 1 THEN 'CREATE INDEX'::text
            WHEN 2 THEN 'CREATE INDEX CONCURRENTLY'::text
            WHEN 3 THEN 'REINDEX'::text
            WHEN 4 THEN 'REINDEX CONCURRENTLY'::text
            ELSE NULL::text
        END AS command,
        CASE s.param10
            WHEN 0 THEN 'initializing'::text
            WHEN 1 THEN 'waiting for writers before build'::text
            WHEN 2 THEN ('building index'::text || COALESCE((': '::text || pg_indexam_progress_phasename((s.param9)::oid, s.param11)), ''::text))
            WHEN 3 THEN 'waiting for writers before validation'::text
            WHEN 4 THEN 'index validation: scanning index'::text
            WHEN 5 THEN 'index validation: sorting tuples'::text
            WHEN 6 THEN 'index validation: scanning table'::text
            WHEN 7 THEN 'waiting for old snapshots'::text
            WHEN 8 THEN 'waiting for readers before marking dead'::text
            WHEN 9 THEN 'waiting for readers before dropping'::text
            ELSE NULL::text
        END AS phase,
    s.param4 AS lockers_total,
    s.param5 AS lockers_done,
    s.param6 AS current_locker_pid,
    s.param16 AS blocks_total,
    s.param17 AS blocks_done,
    s.param12 AS tuples_total,
    s.param13 AS tuples_done,
    s.param14 AS partitions_total,
    s.param15 AS partitions_done
   FROM (pg_stat_get_progress_info('CREATE INDEX'::text) s(pid, datid, relid, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14, param15, param16, param17, param18, param19, param20)
     LEFT JOIN pg_database d ON ((s.datid = d.oid)));


ALTER TABLE pg_catalog.pg_stat_progress_create_index OWNER TO daodao;

--
-- Name: pg_stat_progress_vacuum; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_progress_vacuum AS
 SELECT s.pid,
    s.datid,
    d.datname,
    s.relid,
        CASE s.param1
            WHEN 0 THEN 'initializing'::text
            WHEN 1 THEN 'scanning heap'::text
            WHEN 2 THEN 'vacuuming indexes'::text
            WHEN 3 THEN 'vacuuming heap'::text
            WHEN 4 THEN 'cleaning up indexes'::text
            WHEN 5 THEN 'truncating heap'::text
            WHEN 6 THEN 'performing final cleanup'::text
            ELSE NULL::text
        END AS phase,
    s.param2 AS heap_blks_total,
    s.param3 AS heap_blks_scanned,
    s.param4 AS heap_blks_vacuumed,
    s.param5 AS index_vacuum_count,
    s.param6 AS max_dead_tuples,
    s.param7 AS num_dead_tuples
   FROM (pg_stat_get_progress_info('VACUUM'::text) s(pid, datid, relid, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14, param15, param16, param17, param18, param19, param20)
     LEFT JOIN pg_database d ON ((s.datid = d.oid)));


ALTER TABLE pg_catalog.pg_stat_progress_vacuum OWNER TO daodao;

--
-- Name: pg_stat_replication; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_replication AS
 SELECT s.pid,
    s.usesysid,
    u.rolname AS usename,
    s.application_name,
    s.client_addr,
    s.client_hostname,
    s.client_port,
    s.backend_start,
    s.backend_xmin,
    w.state,
    w.sent_lsn,
    w.write_lsn,
    w.flush_lsn,
    w.replay_lsn,
    w.write_lag,
    w.flush_lag,
    w.replay_lag,
    w.sync_priority,
    w.sync_state,
    w.reply_time
   FROM ((pg_stat_get_activity(NULL::integer) s(datid, pid, usesysid, application_name, state, query, wait_event_type, wait_event, xact_start, query_start, backend_start, state_change, client_addr, client_hostname, client_port, backend_xid, backend_xmin, backend_type, ssl, sslversion, sslcipher, sslbits, ssl_client_dn, ssl_client_serial, ssl_issuer_dn, gss_auth, gss_princ, gss_enc, leader_pid, query_id)
     JOIN pg_stat_get_wal_senders() w(pid, state, sent_lsn, write_lsn, flush_lsn, replay_lsn, write_lag, flush_lag, replay_lag, sync_priority, sync_state, reply_time) ON ((s.pid = w.pid)))
     LEFT JOIN pg_authid u ON ((s.usesysid = u.oid)));


ALTER TABLE pg_catalog.pg_stat_replication OWNER TO daodao;

--
-- Name: pg_stat_replication_slots; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_replication_slots AS
 SELECT s.slot_name,
    s.spill_txns,
    s.spill_count,
    s.spill_bytes,
    s.stream_txns,
    s.stream_count,
    s.stream_bytes,
    s.total_txns,
    s.total_bytes,
    s.stats_reset
   FROM pg_replication_slots r,
    LATERAL pg_stat_get_replication_slot((r.slot_name)::text) s(slot_name, spill_txns, spill_count, spill_bytes, stream_txns, stream_count, stream_bytes, total_txns, total_bytes, stats_reset)
  WHERE (r.datoid IS NOT NULL);


ALTER TABLE pg_catalog.pg_stat_replication_slots OWNER TO daodao;

--
-- Name: pg_stat_slru; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_slru AS
 SELECT s.name,
    s.blks_zeroed,
    s.blks_hit,
    s.blks_read,
    s.blks_written,
    s.blks_exists,
    s.flushes,
    s.truncates,
    s.stats_reset
   FROM pg_stat_get_slru() s(name, blks_zeroed, blks_hit, blks_read, blks_written, blks_exists, flushes, truncates, stats_reset);


ALTER TABLE pg_catalog.pg_stat_slru OWNER TO daodao;

--
-- Name: pg_stat_ssl; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_ssl AS
 SELECT s.pid,
    s.ssl,
    s.sslversion AS version,
    s.sslcipher AS cipher,
    s.sslbits AS bits,
    s.ssl_client_dn AS client_dn,
    s.ssl_client_serial AS client_serial,
    s.ssl_issuer_dn AS issuer_dn
   FROM pg_stat_get_activity(NULL::integer) s(datid, pid, usesysid, application_name, state, query, wait_event_type, wait_event, xact_start, query_start, backend_start, state_change, client_addr, client_hostname, client_port, backend_xid, backend_xmin, backend_type, ssl, sslversion, sslcipher, sslbits, ssl_client_dn, ssl_client_serial, ssl_issuer_dn, gss_auth, gss_princ, gss_enc, leader_pid, query_id)
  WHERE (s.client_port IS NOT NULL);


ALTER TABLE pg_catalog.pg_stat_ssl OWNER TO daodao;

--
-- Name: pg_stat_subscription; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_subscription AS
 SELECT su.oid AS subid,
    su.subname,
    st.pid,
    st.relid,
    st.received_lsn,
    st.last_msg_send_time,
    st.last_msg_receipt_time,
    st.latest_end_lsn,
    st.latest_end_time
   FROM (pg_subscription su
     LEFT JOIN pg_stat_get_subscription(NULL::oid) st(subid, relid, pid, received_lsn, last_msg_send_time, last_msg_receipt_time, latest_end_lsn, latest_end_time) ON ((st.subid = su.oid)));


ALTER TABLE pg_catalog.pg_stat_subscription OWNER TO daodao;

--
-- Name: pg_stat_sys_indexes; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_sys_indexes AS
 SELECT pg_stat_all_indexes.relid,
    pg_stat_all_indexes.indexrelid,
    pg_stat_all_indexes.schemaname,
    pg_stat_all_indexes.relname,
    pg_stat_all_indexes.indexrelname,
    pg_stat_all_indexes.idx_scan,
    pg_stat_all_indexes.idx_tup_read,
    pg_stat_all_indexes.idx_tup_fetch
   FROM pg_stat_all_indexes
  WHERE ((pg_stat_all_indexes.schemaname = ANY (ARRAY['pg_catalog'::name, 'information_schema'::name])) OR (pg_stat_all_indexes.schemaname ~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_stat_sys_indexes OWNER TO daodao;

--
-- Name: pg_stat_sys_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_sys_tables AS
 SELECT pg_stat_all_tables.relid,
    pg_stat_all_tables.schemaname,
    pg_stat_all_tables.relname,
    pg_stat_all_tables.seq_scan,
    pg_stat_all_tables.seq_tup_read,
    pg_stat_all_tables.idx_scan,
    pg_stat_all_tables.idx_tup_fetch,
    pg_stat_all_tables.n_tup_ins,
    pg_stat_all_tables.n_tup_upd,
    pg_stat_all_tables.n_tup_del,
    pg_stat_all_tables.n_tup_hot_upd,
    pg_stat_all_tables.n_live_tup,
    pg_stat_all_tables.n_dead_tup,
    pg_stat_all_tables.n_mod_since_analyze,
    pg_stat_all_tables.n_ins_since_vacuum,
    pg_stat_all_tables.last_vacuum,
    pg_stat_all_tables.last_autovacuum,
    pg_stat_all_tables.last_analyze,
    pg_stat_all_tables.last_autoanalyze,
    pg_stat_all_tables.vacuum_count,
    pg_stat_all_tables.autovacuum_count,
    pg_stat_all_tables.analyze_count,
    pg_stat_all_tables.autoanalyze_count
   FROM pg_stat_all_tables
  WHERE ((pg_stat_all_tables.schemaname = ANY (ARRAY['pg_catalog'::name, 'information_schema'::name])) OR (pg_stat_all_tables.schemaname ~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_stat_sys_tables OWNER TO daodao;

--
-- Name: pg_stat_user_functions; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_user_functions AS
 SELECT p.oid AS funcid,
    n.nspname AS schemaname,
    p.proname AS funcname,
    pg_stat_get_function_calls(p.oid) AS calls,
    pg_stat_get_function_total_time(p.oid) AS total_time,
    pg_stat_get_function_self_time(p.oid) AS self_time
   FROM (pg_proc p
     LEFT JOIN pg_namespace n ON ((n.oid = p.pronamespace)))
  WHERE ((p.prolang <> (12)::oid) AND (pg_stat_get_function_calls(p.oid) IS NOT NULL));


ALTER TABLE pg_catalog.pg_stat_user_functions OWNER TO daodao;

--
-- Name: pg_stat_user_indexes; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_user_indexes AS
 SELECT pg_stat_all_indexes.relid,
    pg_stat_all_indexes.indexrelid,
    pg_stat_all_indexes.schemaname,
    pg_stat_all_indexes.relname,
    pg_stat_all_indexes.indexrelname,
    pg_stat_all_indexes.idx_scan,
    pg_stat_all_indexes.idx_tup_read,
    pg_stat_all_indexes.idx_tup_fetch
   FROM pg_stat_all_indexes
  WHERE ((pg_stat_all_indexes.schemaname <> ALL (ARRAY['pg_catalog'::name, 'information_schema'::name])) AND (pg_stat_all_indexes.schemaname !~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_stat_user_indexes OWNER TO daodao;

--
-- Name: pg_stat_user_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_user_tables AS
 SELECT pg_stat_all_tables.relid,
    pg_stat_all_tables.schemaname,
    pg_stat_all_tables.relname,
    pg_stat_all_tables.seq_scan,
    pg_stat_all_tables.seq_tup_read,
    pg_stat_all_tables.idx_scan,
    pg_stat_all_tables.idx_tup_fetch,
    pg_stat_all_tables.n_tup_ins,
    pg_stat_all_tables.n_tup_upd,
    pg_stat_all_tables.n_tup_del,
    pg_stat_all_tables.n_tup_hot_upd,
    pg_stat_all_tables.n_live_tup,
    pg_stat_all_tables.n_dead_tup,
    pg_stat_all_tables.n_mod_since_analyze,
    pg_stat_all_tables.n_ins_since_vacuum,
    pg_stat_all_tables.last_vacuum,
    pg_stat_all_tables.last_autovacuum,
    pg_stat_all_tables.last_analyze,
    pg_stat_all_tables.last_autoanalyze,
    pg_stat_all_tables.vacuum_count,
    pg_stat_all_tables.autovacuum_count,
    pg_stat_all_tables.analyze_count,
    pg_stat_all_tables.autoanalyze_count
   FROM pg_stat_all_tables
  WHERE ((pg_stat_all_tables.schemaname <> ALL (ARRAY['pg_catalog'::name, 'information_schema'::name])) AND (pg_stat_all_tables.schemaname !~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_stat_user_tables OWNER TO daodao;

--
-- Name: pg_stat_wal; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_wal AS
 SELECT w.wal_records,
    w.wal_fpi,
    w.wal_bytes,
    w.wal_buffers_full,
    w.wal_write,
    w.wal_sync,
    w.wal_write_time,
    w.wal_sync_time,
    w.stats_reset
   FROM pg_stat_get_wal() w(wal_records, wal_fpi, wal_bytes, wal_buffers_full, wal_write, wal_sync, wal_write_time, wal_sync_time, stats_reset);


ALTER TABLE pg_catalog.pg_stat_wal OWNER TO daodao;

--
-- Name: pg_stat_wal_receiver; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_wal_receiver AS
 SELECT s.pid,
    s.status,
    s.receive_start_lsn,
    s.receive_start_tli,
    s.written_lsn,
    s.flushed_lsn,
    s.received_tli,
    s.last_msg_send_time,
    s.last_msg_receipt_time,
    s.latest_end_lsn,
    s.latest_end_time,
    s.slot_name,
    s.sender_host,
    s.sender_port,
    s.conninfo
   FROM pg_stat_get_wal_receiver() s(pid, status, receive_start_lsn, receive_start_tli, written_lsn, flushed_lsn, received_tli, last_msg_send_time, last_msg_receipt_time, latest_end_lsn, latest_end_time, slot_name, sender_host, sender_port, conninfo)
  WHERE (s.pid IS NOT NULL);


ALTER TABLE pg_catalog.pg_stat_wal_receiver OWNER TO daodao;

--
-- Name: pg_stat_xact_all_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_xact_all_tables AS
 SELECT c.oid AS relid,
    n.nspname AS schemaname,
    c.relname,
    pg_stat_get_xact_numscans(c.oid) AS seq_scan,
    pg_stat_get_xact_tuples_returned(c.oid) AS seq_tup_read,
    (sum(pg_stat_get_xact_numscans(i.indexrelid)))::bigint AS idx_scan,
    ((sum(pg_stat_get_xact_tuples_fetched(i.indexrelid)))::bigint + pg_stat_get_xact_tuples_fetched(c.oid)) AS idx_tup_fetch,
    pg_stat_get_xact_tuples_inserted(c.oid) AS n_tup_ins,
    pg_stat_get_xact_tuples_updated(c.oid) AS n_tup_upd,
    pg_stat_get_xact_tuples_deleted(c.oid) AS n_tup_del,
    pg_stat_get_xact_tuples_hot_updated(c.oid) AS n_tup_hot_upd
   FROM ((pg_class c
     LEFT JOIN pg_index i ON ((c.oid = i.indrelid)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (c.relkind = ANY (ARRAY['r'::"char", 't'::"char", 'm'::"char", 'p'::"char"]))
  GROUP BY c.oid, n.nspname, c.relname;


ALTER TABLE pg_catalog.pg_stat_xact_all_tables OWNER TO daodao;

--
-- Name: pg_stat_xact_sys_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_xact_sys_tables AS
 SELECT pg_stat_xact_all_tables.relid,
    pg_stat_xact_all_tables.schemaname,
    pg_stat_xact_all_tables.relname,
    pg_stat_xact_all_tables.seq_scan,
    pg_stat_xact_all_tables.seq_tup_read,
    pg_stat_xact_all_tables.idx_scan,
    pg_stat_xact_all_tables.idx_tup_fetch,
    pg_stat_xact_all_tables.n_tup_ins,
    pg_stat_xact_all_tables.n_tup_upd,
    pg_stat_xact_all_tables.n_tup_del,
    pg_stat_xact_all_tables.n_tup_hot_upd
   FROM pg_stat_xact_all_tables
  WHERE ((pg_stat_xact_all_tables.schemaname = ANY (ARRAY['pg_catalog'::name, 'information_schema'::name])) OR (pg_stat_xact_all_tables.schemaname ~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_stat_xact_sys_tables OWNER TO daodao;

--
-- Name: pg_stat_xact_user_functions; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_xact_user_functions AS
 SELECT p.oid AS funcid,
    n.nspname AS schemaname,
    p.proname AS funcname,
    pg_stat_get_xact_function_calls(p.oid) AS calls,
    pg_stat_get_xact_function_total_time(p.oid) AS total_time,
    pg_stat_get_xact_function_self_time(p.oid) AS self_time
   FROM (pg_proc p
     LEFT JOIN pg_namespace n ON ((n.oid = p.pronamespace)))
  WHERE ((p.prolang <> (12)::oid) AND (pg_stat_get_xact_function_calls(p.oid) IS NOT NULL));


ALTER TABLE pg_catalog.pg_stat_xact_user_functions OWNER TO daodao;

--
-- Name: pg_stat_xact_user_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stat_xact_user_tables AS
 SELECT pg_stat_xact_all_tables.relid,
    pg_stat_xact_all_tables.schemaname,
    pg_stat_xact_all_tables.relname,
    pg_stat_xact_all_tables.seq_scan,
    pg_stat_xact_all_tables.seq_tup_read,
    pg_stat_xact_all_tables.idx_scan,
    pg_stat_xact_all_tables.idx_tup_fetch,
    pg_stat_xact_all_tables.n_tup_ins,
    pg_stat_xact_all_tables.n_tup_upd,
    pg_stat_xact_all_tables.n_tup_del,
    pg_stat_xact_all_tables.n_tup_hot_upd
   FROM pg_stat_xact_all_tables
  WHERE ((pg_stat_xact_all_tables.schemaname <> ALL (ARRAY['pg_catalog'::name, 'information_schema'::name])) AND (pg_stat_xact_all_tables.schemaname !~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_stat_xact_user_tables OWNER TO daodao;

--
-- Name: pg_statio_all_indexes; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_all_indexes AS
 SELECT c.oid AS relid,
    i.oid AS indexrelid,
    n.nspname AS schemaname,
    c.relname,
    i.relname AS indexrelname,
    (pg_stat_get_blocks_fetched(i.oid) - pg_stat_get_blocks_hit(i.oid)) AS idx_blks_read,
    pg_stat_get_blocks_hit(i.oid) AS idx_blks_hit
   FROM (((pg_class c
     JOIN pg_index x ON ((c.oid = x.indrelid)))
     JOIN pg_class i ON ((i.oid = x.indexrelid)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (c.relkind = ANY (ARRAY['r'::"char", 't'::"char", 'm'::"char"]));


ALTER TABLE pg_catalog.pg_statio_all_indexes OWNER TO daodao;

--
-- Name: pg_statio_all_sequences; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_all_sequences AS
 SELECT c.oid AS relid,
    n.nspname AS schemaname,
    c.relname,
    (pg_stat_get_blocks_fetched(c.oid) - pg_stat_get_blocks_hit(c.oid)) AS blks_read,
    pg_stat_get_blocks_hit(c.oid) AS blks_hit
   FROM (pg_class c
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (c.relkind = 'S'::"char");


ALTER TABLE pg_catalog.pg_statio_all_sequences OWNER TO daodao;

--
-- Name: pg_statio_all_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_all_tables AS
 SELECT c.oid AS relid,
    n.nspname AS schemaname,
    c.relname,
    (pg_stat_get_blocks_fetched(c.oid) - pg_stat_get_blocks_hit(c.oid)) AS heap_blks_read,
    pg_stat_get_blocks_hit(c.oid) AS heap_blks_hit,
    (sum((pg_stat_get_blocks_fetched(i.indexrelid) - pg_stat_get_blocks_hit(i.indexrelid))))::bigint AS idx_blks_read,
    (sum(pg_stat_get_blocks_hit(i.indexrelid)))::bigint AS idx_blks_hit,
    (pg_stat_get_blocks_fetched(t.oid) - pg_stat_get_blocks_hit(t.oid)) AS toast_blks_read,
    pg_stat_get_blocks_hit(t.oid) AS toast_blks_hit,
    (pg_stat_get_blocks_fetched(x.indexrelid) - pg_stat_get_blocks_hit(x.indexrelid)) AS tidx_blks_read,
    pg_stat_get_blocks_hit(x.indexrelid) AS tidx_blks_hit
   FROM ((((pg_class c
     LEFT JOIN pg_index i ON ((c.oid = i.indrelid)))
     LEFT JOIN pg_class t ON ((c.reltoastrelid = t.oid)))
     LEFT JOIN pg_index x ON ((t.oid = x.indrelid)))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (c.relkind = ANY (ARRAY['r'::"char", 't'::"char", 'm'::"char"]))
  GROUP BY c.oid, n.nspname, c.relname, t.oid, x.indexrelid;


ALTER TABLE pg_catalog.pg_statio_all_tables OWNER TO daodao;

--
-- Name: pg_statio_sys_indexes; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_sys_indexes AS
 SELECT pg_statio_all_indexes.relid,
    pg_statio_all_indexes.indexrelid,
    pg_statio_all_indexes.schemaname,
    pg_statio_all_indexes.relname,
    pg_statio_all_indexes.indexrelname,
    pg_statio_all_indexes.idx_blks_read,
    pg_statio_all_indexes.idx_blks_hit
   FROM pg_statio_all_indexes
  WHERE ((pg_statio_all_indexes.schemaname = ANY (ARRAY['pg_catalog'::name, 'information_schema'::name])) OR (pg_statio_all_indexes.schemaname ~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_statio_sys_indexes OWNER TO daodao;

--
-- Name: pg_statio_sys_sequences; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_sys_sequences AS
 SELECT pg_statio_all_sequences.relid,
    pg_statio_all_sequences.schemaname,
    pg_statio_all_sequences.relname,
    pg_statio_all_sequences.blks_read,
    pg_statio_all_sequences.blks_hit
   FROM pg_statio_all_sequences
  WHERE ((pg_statio_all_sequences.schemaname = ANY (ARRAY['pg_catalog'::name, 'information_schema'::name])) OR (pg_statio_all_sequences.schemaname ~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_statio_sys_sequences OWNER TO daodao;

--
-- Name: pg_statio_sys_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_sys_tables AS
 SELECT pg_statio_all_tables.relid,
    pg_statio_all_tables.schemaname,
    pg_statio_all_tables.relname,
    pg_statio_all_tables.heap_blks_read,
    pg_statio_all_tables.heap_blks_hit,
    pg_statio_all_tables.idx_blks_read,
    pg_statio_all_tables.idx_blks_hit,
    pg_statio_all_tables.toast_blks_read,
    pg_statio_all_tables.toast_blks_hit,
    pg_statio_all_tables.tidx_blks_read,
    pg_statio_all_tables.tidx_blks_hit
   FROM pg_statio_all_tables
  WHERE ((pg_statio_all_tables.schemaname = ANY (ARRAY['pg_catalog'::name, 'information_schema'::name])) OR (pg_statio_all_tables.schemaname ~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_statio_sys_tables OWNER TO daodao;

--
-- Name: pg_statio_user_indexes; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_user_indexes AS
 SELECT pg_statio_all_indexes.relid,
    pg_statio_all_indexes.indexrelid,
    pg_statio_all_indexes.schemaname,
    pg_statio_all_indexes.relname,
    pg_statio_all_indexes.indexrelname,
    pg_statio_all_indexes.idx_blks_read,
    pg_statio_all_indexes.idx_blks_hit
   FROM pg_statio_all_indexes
  WHERE ((pg_statio_all_indexes.schemaname <> ALL (ARRAY['pg_catalog'::name, 'information_schema'::name])) AND (pg_statio_all_indexes.schemaname !~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_statio_user_indexes OWNER TO daodao;

--
-- Name: pg_statio_user_sequences; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_user_sequences AS
 SELECT pg_statio_all_sequences.relid,
    pg_statio_all_sequences.schemaname,
    pg_statio_all_sequences.relname,
    pg_statio_all_sequences.blks_read,
    pg_statio_all_sequences.blks_hit
   FROM pg_statio_all_sequences
  WHERE ((pg_statio_all_sequences.schemaname <> ALL (ARRAY['pg_catalog'::name, 'information_schema'::name])) AND (pg_statio_all_sequences.schemaname !~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_statio_user_sequences OWNER TO daodao;

--
-- Name: pg_statio_user_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_statio_user_tables AS
 SELECT pg_statio_all_tables.relid,
    pg_statio_all_tables.schemaname,
    pg_statio_all_tables.relname,
    pg_statio_all_tables.heap_blks_read,
    pg_statio_all_tables.heap_blks_hit,
    pg_statio_all_tables.idx_blks_read,
    pg_statio_all_tables.idx_blks_hit,
    pg_statio_all_tables.toast_blks_read,
    pg_statio_all_tables.toast_blks_hit,
    pg_statio_all_tables.tidx_blks_read,
    pg_statio_all_tables.tidx_blks_hit
   FROM pg_statio_all_tables
  WHERE ((pg_statio_all_tables.schemaname <> ALL (ARRAY['pg_catalog'::name, 'information_schema'::name])) AND (pg_statio_all_tables.schemaname !~ '^pg_toast'::text));


ALTER TABLE pg_catalog.pg_statio_user_tables OWNER TO daodao;

SET default_tablespace = '';

--
-- Name: pg_statistic; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_statistic (
    starelid oid NOT NULL,
    staattnum smallint NOT NULL,
    stainherit boolean NOT NULL,
    stanullfrac real NOT NULL,
    stawidth integer NOT NULL,
    stadistinct real NOT NULL,
    stakind1 smallint NOT NULL,
    stakind2 smallint NOT NULL,
    stakind3 smallint NOT NULL,
    stakind4 smallint NOT NULL,
    stakind5 smallint NOT NULL,
    staop1 oid NOT NULL,
    staop2 oid NOT NULL,
    staop3 oid NOT NULL,
    staop4 oid NOT NULL,
    staop5 oid NOT NULL,
    stacoll1 oid NOT NULL,
    stacoll2 oid NOT NULL,
    stacoll3 oid NOT NULL,
    stacoll4 oid NOT NULL,
    stacoll5 oid NOT NULL,
    stanumbers1 real[],
    stanumbers2 real[],
    stanumbers3 real[],
    stanumbers4 real[],
    stanumbers5 real[],
    stavalues1 anyarray,
    stavalues2 anyarray,
    stavalues3 anyarray,
    stavalues4 anyarray,
    stavalues5 anyarray
);

ALTER TABLE ONLY pg_catalog.pg_statistic REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_statistic OWNER TO daodao;

--
-- Name: pg_statistic_ext; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_statistic_ext (
    oid oid NOT NULL,
    stxrelid oid NOT NULL,
    stxname name NOT NULL,
    stxnamespace oid NOT NULL,
    stxowner oid NOT NULL,
    stxstattarget integer NOT NULL,
    stxkeys int2vector NOT NULL,
    stxkind "char"[] NOT NULL,
    stxexprs pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_statistic_ext REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_statistic_ext OWNER TO daodao;

--
-- Name: pg_statistic_ext_data; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_statistic_ext_data (
    stxoid oid NOT NULL,
    stxdndistinct pg_ndistinct COLLATE pg_catalog."C",
    stxddependencies pg_dependencies COLLATE pg_catalog."C",
    stxdmcv pg_mcv_list COLLATE pg_catalog."C",
    stxdexpr pg_statistic[]
);

ALTER TABLE ONLY pg_catalog.pg_statistic_ext_data REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_statistic_ext_data OWNER TO daodao;

--
-- Name: pg_stats; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stats WITH (security_barrier='true') AS
 SELECT n.nspname AS schemaname,
    c.relname AS tablename,
    a.attname,
    s.stainherit AS inherited,
    s.stanullfrac AS null_frac,
    s.stawidth AS avg_width,
    s.stadistinct AS n_distinct,
        CASE
            WHEN (s.stakind1 = 1) THEN s.stavalues1
            WHEN (s.stakind2 = 1) THEN s.stavalues2
            WHEN (s.stakind3 = 1) THEN s.stavalues3
            WHEN (s.stakind4 = 1) THEN s.stavalues4
            WHEN (s.stakind5 = 1) THEN s.stavalues5
            ELSE NULL::anyarray
        END AS most_common_vals,
        CASE
            WHEN (s.stakind1 = 1) THEN s.stanumbers1
            WHEN (s.stakind2 = 1) THEN s.stanumbers2
            WHEN (s.stakind3 = 1) THEN s.stanumbers3
            WHEN (s.stakind4 = 1) THEN s.stanumbers4
            WHEN (s.stakind5 = 1) THEN s.stanumbers5
            ELSE NULL::real[]
        END AS most_common_freqs,
        CASE
            WHEN (s.stakind1 = 2) THEN s.stavalues1
            WHEN (s.stakind2 = 2) THEN s.stavalues2
            WHEN (s.stakind3 = 2) THEN s.stavalues3
            WHEN (s.stakind4 = 2) THEN s.stavalues4
            WHEN (s.stakind5 = 2) THEN s.stavalues5
            ELSE NULL::anyarray
        END AS histogram_bounds,
        CASE
            WHEN (s.stakind1 = 3) THEN s.stanumbers1[1]
            WHEN (s.stakind2 = 3) THEN s.stanumbers2[1]
            WHEN (s.stakind3 = 3) THEN s.stanumbers3[1]
            WHEN (s.stakind4 = 3) THEN s.stanumbers4[1]
            WHEN (s.stakind5 = 3) THEN s.stanumbers5[1]
            ELSE NULL::real
        END AS correlation,
        CASE
            WHEN (s.stakind1 = 4) THEN s.stavalues1
            WHEN (s.stakind2 = 4) THEN s.stavalues2
            WHEN (s.stakind3 = 4) THEN s.stavalues3
            WHEN (s.stakind4 = 4) THEN s.stavalues4
            WHEN (s.stakind5 = 4) THEN s.stavalues5
            ELSE NULL::anyarray
        END AS most_common_elems,
        CASE
            WHEN (s.stakind1 = 4) THEN s.stanumbers1
            WHEN (s.stakind2 = 4) THEN s.stanumbers2
            WHEN (s.stakind3 = 4) THEN s.stanumbers3
            WHEN (s.stakind4 = 4) THEN s.stanumbers4
            WHEN (s.stakind5 = 4) THEN s.stanumbers5
            ELSE NULL::real[]
        END AS most_common_elem_freqs,
        CASE
            WHEN (s.stakind1 = 5) THEN s.stanumbers1
            WHEN (s.stakind2 = 5) THEN s.stanumbers2
            WHEN (s.stakind3 = 5) THEN s.stanumbers3
            WHEN (s.stakind4 = 5) THEN s.stanumbers4
            WHEN (s.stakind5 = 5) THEN s.stanumbers5
            ELSE NULL::real[]
        END AS elem_count_histogram
   FROM (((pg_statistic s
     JOIN pg_class c ON ((c.oid = s.starelid)))
     JOIN pg_attribute a ON (((c.oid = a.attrelid) AND (a.attnum = s.staattnum))))
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE ((NOT a.attisdropped) AND has_column_privilege(c.oid, a.attnum, 'select'::text) AND ((c.relrowsecurity = false) OR (NOT row_security_active(c.oid))));


ALTER TABLE pg_catalog.pg_stats OWNER TO daodao;

--
-- Name: pg_stats_ext; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stats_ext WITH (security_barrier='true') AS
 SELECT cn.nspname AS schemaname,
    c.relname AS tablename,
    sn.nspname AS statistics_schemaname,
    s.stxname AS statistics_name,
    pg_get_userbyid(s.stxowner) AS statistics_owner,
    ( SELECT array_agg(a.attname ORDER BY a.attnum) AS array_agg
           FROM (unnest(s.stxkeys) k(k)
             JOIN pg_attribute a ON (((a.attrelid = s.stxrelid) AND (a.attnum = k.k))))) AS attnames,
    pg_get_statisticsobjdef_expressions(s.oid) AS exprs,
    s.stxkind AS kinds,
    sd.stxdndistinct AS n_distinct,
    sd.stxddependencies AS dependencies,
    m.most_common_vals,
    m.most_common_val_nulls,
    m.most_common_freqs,
    m.most_common_base_freqs
   FROM (((((pg_statistic_ext s
     JOIN pg_class c ON ((c.oid = s.stxrelid)))
     JOIN pg_statistic_ext_data sd ON ((s.oid = sd.stxoid)))
     LEFT JOIN pg_namespace cn ON ((cn.oid = c.relnamespace)))
     LEFT JOIN pg_namespace sn ON ((sn.oid = s.stxnamespace)))
     LEFT JOIN LATERAL ( SELECT array_agg(pg_mcv_list_items."values") AS most_common_vals,
            array_agg(pg_mcv_list_items.nulls) AS most_common_val_nulls,
            array_agg(pg_mcv_list_items.frequency) AS most_common_freqs,
            array_agg(pg_mcv_list_items.base_frequency) AS most_common_base_freqs
           FROM pg_mcv_list_items(sd.stxdmcv) pg_mcv_list_items(index, "values", nulls, frequency, base_frequency)) m ON ((sd.stxdmcv IS NOT NULL)))
  WHERE (pg_has_role(c.relowner, 'USAGE'::text) AND ((c.relrowsecurity = false) OR (NOT row_security_active(c.oid))));


ALTER TABLE pg_catalog.pg_stats_ext OWNER TO daodao;

--
-- Name: pg_stats_ext_exprs; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_stats_ext_exprs WITH (security_barrier='true') AS
 SELECT cn.nspname AS schemaname,
    c.relname AS tablename,
    sn.nspname AS statistics_schemaname,
    s.stxname AS statistics_name,
    pg_get_userbyid(s.stxowner) AS statistics_owner,
    stat.expr,
    (stat.a).stanullfrac AS null_frac,
    (stat.a).stawidth AS avg_width,
    (stat.a).stadistinct AS n_distinct,
        CASE
            WHEN ((stat.a).stakind1 = 1) THEN (stat.a).stavalues1
            WHEN ((stat.a).stakind2 = 1) THEN (stat.a).stavalues2
            WHEN ((stat.a).stakind3 = 1) THEN (stat.a).stavalues3
            WHEN ((stat.a).stakind4 = 1) THEN (stat.a).stavalues4
            WHEN ((stat.a).stakind5 = 1) THEN (stat.a).stavalues5
            ELSE NULL::anyarray
        END AS most_common_vals,
        CASE
            WHEN ((stat.a).stakind1 = 1) THEN (stat.a).stanumbers1
            WHEN ((stat.a).stakind2 = 1) THEN (stat.a).stanumbers2
            WHEN ((stat.a).stakind3 = 1) THEN (stat.a).stanumbers3
            WHEN ((stat.a).stakind4 = 1) THEN (stat.a).stanumbers4
            WHEN ((stat.a).stakind5 = 1) THEN (stat.a).stanumbers5
            ELSE NULL::real[]
        END AS most_common_freqs,
        CASE
            WHEN ((stat.a).stakind1 = 2) THEN (stat.a).stavalues1
            WHEN ((stat.a).stakind2 = 2) THEN (stat.a).stavalues2
            WHEN ((stat.a).stakind3 = 2) THEN (stat.a).stavalues3
            WHEN ((stat.a).stakind4 = 2) THEN (stat.a).stavalues4
            WHEN ((stat.a).stakind5 = 2) THEN (stat.a).stavalues5
            ELSE NULL::anyarray
        END AS histogram_bounds,
        CASE
            WHEN ((stat.a).stakind1 = 3) THEN (stat.a).stanumbers1[1]
            WHEN ((stat.a).stakind2 = 3) THEN (stat.a).stanumbers2[1]
            WHEN ((stat.a).stakind3 = 3) THEN (stat.a).stanumbers3[1]
            WHEN ((stat.a).stakind4 = 3) THEN (stat.a).stanumbers4[1]
            WHEN ((stat.a).stakind5 = 3) THEN (stat.a).stanumbers5[1]
            ELSE NULL::real
        END AS correlation,
        CASE
            WHEN ((stat.a).stakind1 = 4) THEN (stat.a).stavalues1
            WHEN ((stat.a).stakind2 = 4) THEN (stat.a).stavalues2
            WHEN ((stat.a).stakind3 = 4) THEN (stat.a).stavalues3
            WHEN ((stat.a).stakind4 = 4) THEN (stat.a).stavalues4
            WHEN ((stat.a).stakind5 = 4) THEN (stat.a).stavalues5
            ELSE NULL::anyarray
        END AS most_common_elems,
        CASE
            WHEN ((stat.a).stakind1 = 4) THEN (stat.a).stanumbers1
            WHEN ((stat.a).stakind2 = 4) THEN (stat.a).stanumbers2
            WHEN ((stat.a).stakind3 = 4) THEN (stat.a).stanumbers3
            WHEN ((stat.a).stakind4 = 4) THEN (stat.a).stanumbers4
            WHEN ((stat.a).stakind5 = 4) THEN (stat.a).stanumbers5
            ELSE NULL::real[]
        END AS most_common_elem_freqs,
        CASE
            WHEN ((stat.a).stakind1 = 5) THEN (stat.a).stanumbers1
            WHEN ((stat.a).stakind2 = 5) THEN (stat.a).stanumbers2
            WHEN ((stat.a).stakind3 = 5) THEN (stat.a).stanumbers3
            WHEN ((stat.a).stakind4 = 5) THEN (stat.a).stanumbers4
            WHEN ((stat.a).stakind5 = 5) THEN (stat.a).stanumbers5
            ELSE NULL::real[]
        END AS elem_count_histogram
   FROM (((((pg_statistic_ext s
     JOIN pg_class c ON ((c.oid = s.stxrelid)))
     LEFT JOIN pg_statistic_ext_data sd ON ((s.oid = sd.stxoid)))
     LEFT JOIN pg_namespace cn ON ((cn.oid = c.relnamespace)))
     LEFT JOIN pg_namespace sn ON ((sn.oid = s.stxnamespace)))
     JOIN LATERAL ( SELECT unnest(pg_get_statisticsobjdef_expressions(s.oid)) AS expr,
            unnest(sd.stxdexpr) AS a) stat ON ((stat.expr IS NOT NULL)))
  WHERE (pg_has_role(c.relowner, 'USAGE'::text) AND ((c.relrowsecurity = false) OR (NOT row_security_active(c.oid))));


ALTER TABLE pg_catalog.pg_stats_ext_exprs OWNER TO daodao;

SET default_tablespace = pg_global;

--
-- Name: pg_subscription; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_subscription (
    oid oid NOT NULL,
    subdbid oid NOT NULL,
    subname name NOT NULL,
    subowner oid NOT NULL,
    subenabled boolean NOT NULL,
    subbinary boolean NOT NULL,
    substream boolean NOT NULL,
    subconninfo text NOT NULL COLLATE pg_catalog."C",
    subslotname name,
    subsynccommit text NOT NULL COLLATE pg_catalog."C",
    subpublications text[] NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_subscription REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_subscription OWNER TO daodao;

SET default_tablespace = '';

--
-- Name: pg_subscription_rel; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_subscription_rel (
    srsubid oid NOT NULL,
    srrelid oid NOT NULL,
    srsubstate "char" NOT NULL,
    srsublsn pg_lsn
);

ALTER TABLE ONLY pg_catalog.pg_subscription_rel REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_subscription_rel OWNER TO daodao;

--
-- Name: pg_tables; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_tables AS
 SELECT n.nspname AS schemaname,
    c.relname AS tablename,
    pg_get_userbyid(c.relowner) AS tableowner,
    t.spcname AS tablespace,
    c.relhasindex AS hasindexes,
    c.relhasrules AS hasrules,
    c.relhastriggers AS hastriggers,
    c.relrowsecurity AS rowsecurity
   FROM ((pg_class c
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
     LEFT JOIN pg_tablespace t ON ((t.oid = c.reltablespace)))
  WHERE (c.relkind = ANY (ARRAY['r'::"char", 'p'::"char"]));


ALTER TABLE pg_catalog.pg_tables OWNER TO daodao;

SET default_tablespace = pg_global;

--
-- Name: pg_tablespace; Type: TABLE; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_tablespace (
    oid oid NOT NULL,
    spcname name NOT NULL,
    spcowner oid NOT NULL,
    spcacl aclitem[],
    spcoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_tablespace REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_tablespace OWNER TO daodao;

--
-- Name: pg_timezone_abbrevs; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_timezone_abbrevs AS
 SELECT pg_timezone_abbrevs.abbrev,
    pg_timezone_abbrevs.utc_offset,
    pg_timezone_abbrevs.is_dst
   FROM pg_timezone_abbrevs() pg_timezone_abbrevs(abbrev, utc_offset, is_dst);


ALTER TABLE pg_catalog.pg_timezone_abbrevs OWNER TO daodao;

--
-- Name: pg_timezone_names; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_timezone_names AS
 SELECT pg_timezone_names.name,
    pg_timezone_names.abbrev,
    pg_timezone_names.utc_offset,
    pg_timezone_names.is_dst
   FROM pg_timezone_names() pg_timezone_names(name, abbrev, utc_offset, is_dst);


ALTER TABLE pg_catalog.pg_timezone_names OWNER TO daodao;

SET default_tablespace = '';

--
-- Name: pg_transform; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_transform (
    oid oid NOT NULL,
    trftype oid NOT NULL,
    trflang oid NOT NULL,
    trffromsql regproc NOT NULL,
    trftosql regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_transform REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_transform OWNER TO daodao;

--
-- Name: pg_trigger; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_trigger (
    oid oid NOT NULL,
    tgrelid oid NOT NULL,
    tgparentid oid NOT NULL,
    tgname name NOT NULL,
    tgfoid oid NOT NULL,
    tgtype smallint NOT NULL,
    tgenabled "char" NOT NULL,
    tgisinternal boolean NOT NULL,
    tgconstrrelid oid NOT NULL,
    tgconstrindid oid NOT NULL,
    tgconstraint oid NOT NULL,
    tgdeferrable boolean NOT NULL,
    tginitdeferred boolean NOT NULL,
    tgnargs smallint NOT NULL,
    tgattr int2vector NOT NULL,
    tgargs bytea NOT NULL,
    tgqual pg_node_tree COLLATE pg_catalog."C",
    tgoldtable name,
    tgnewtable name
);

ALTER TABLE ONLY pg_catalog.pg_trigger REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_trigger OWNER TO daodao;

--
-- Name: pg_ts_config; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_ts_config (
    oid oid NOT NULL,
    cfgname name NOT NULL,
    cfgnamespace oid NOT NULL,
    cfgowner oid NOT NULL,
    cfgparser oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_ts_config REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_config OWNER TO daodao;

--
-- Name: pg_ts_config_map; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_ts_config_map (
    mapcfg oid NOT NULL,
    maptokentype integer NOT NULL,
    mapseqno integer NOT NULL,
    mapdict oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_ts_config_map REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_config_map OWNER TO daodao;

--
-- Name: pg_ts_dict; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_ts_dict (
    oid oid NOT NULL,
    dictname name NOT NULL,
    dictnamespace oid NOT NULL,
    dictowner oid NOT NULL,
    dicttemplate oid NOT NULL,
    dictinitoption text COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_ts_dict REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_dict OWNER TO daodao;

--
-- Name: pg_ts_parser; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_ts_parser (
    oid oid NOT NULL,
    prsname name NOT NULL,
    prsnamespace oid NOT NULL,
    prsstart regproc NOT NULL,
    prstoken regproc NOT NULL,
    prsend regproc NOT NULL,
    prsheadline regproc NOT NULL,
    prslextype regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_ts_parser REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_parser OWNER TO daodao;

--
-- Name: pg_ts_template; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_ts_template (
    oid oid NOT NULL,
    tmplname name NOT NULL,
    tmplnamespace oid NOT NULL,
    tmplinit regproc NOT NULL,
    tmpllexize regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_ts_template REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_template OWNER TO daodao;

--
-- Name: pg_type; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_type (
    oid oid NOT NULL,
    typname name NOT NULL,
    typnamespace oid NOT NULL,
    typowner oid NOT NULL,
    typlen smallint NOT NULL,
    typbyval boolean NOT NULL,
    typtype "char" NOT NULL,
    typcategory "char" NOT NULL,
    typispreferred boolean NOT NULL,
    typisdefined boolean NOT NULL,
    typdelim "char" NOT NULL,
    typrelid oid NOT NULL,
    typsubscript regproc NOT NULL,
    typelem oid NOT NULL,
    typarray oid NOT NULL,
    typinput regproc NOT NULL,
    typoutput regproc NOT NULL,
    typreceive regproc NOT NULL,
    typsend regproc NOT NULL,
    typmodin regproc NOT NULL,
    typmodout regproc NOT NULL,
    typanalyze regproc NOT NULL,
    typalign "char" NOT NULL,
    typstorage "char" NOT NULL,
    typnotnull boolean NOT NULL,
    typbasetype oid NOT NULL,
    typtypmod integer NOT NULL,
    typndims integer NOT NULL,
    typcollation oid NOT NULL,
    typdefaultbin pg_node_tree COLLATE pg_catalog."C",
    typdefault text COLLATE pg_catalog."C",
    typacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_type REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_type OWNER TO daodao;

--
-- Name: pg_user; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_user AS
 SELECT pg_shadow.usename,
    pg_shadow.usesysid,
    pg_shadow.usecreatedb,
    pg_shadow.usesuper,
    pg_shadow.userepl,
    pg_shadow.usebypassrls,
    '********'::text AS passwd,
    pg_shadow.valuntil,
    pg_shadow.useconfig
   FROM pg_shadow;


ALTER TABLE pg_catalog.pg_user OWNER TO daodao;

--
-- Name: pg_user_mapping; Type: TABLE; Schema: pg_catalog; Owner: daodao
--

CREATE TABLE pg_catalog.pg_user_mapping (
    oid oid NOT NULL,
    umuser oid NOT NULL,
    umserver oid NOT NULL,
    umoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_user_mapping REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_user_mapping OWNER TO daodao;

--
-- Name: pg_user_mappings; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_user_mappings AS
 SELECT u.oid AS umid,
    s.oid AS srvid,
    s.srvname,
    u.umuser,
        CASE
            WHEN (u.umuser = (0)::oid) THEN 'public'::name
            ELSE a.rolname
        END AS usename,
        CASE
            WHEN (((u.umuser <> (0)::oid) AND (a.rolname = CURRENT_USER) AND (pg_has_role(s.srvowner, 'USAGE'::text) OR has_server_privilege(s.oid, 'USAGE'::text))) OR ((u.umuser = (0)::oid) AND pg_has_role(s.srvowner, 'USAGE'::text)) OR ( SELECT pg_authid.rolsuper
               FROM pg_authid
              WHERE (pg_authid.rolname = CURRENT_USER))) THEN u.umoptions
            ELSE NULL::text[]
        END AS umoptions
   FROM ((pg_user_mapping u
     JOIN pg_foreign_server s ON ((u.umserver = s.oid)))
     LEFT JOIN pg_authid a ON ((a.oid = u.umuser)));


ALTER TABLE pg_catalog.pg_user_mappings OWNER TO daodao;

--
-- Name: pg_views; Type: VIEW; Schema: pg_catalog; Owner: daodao
--

CREATE VIEW pg_catalog.pg_views AS
 SELECT n.nspname AS schemaname,
    c.relname AS viewname,
    pg_get_userbyid(c.relowner) AS viewowner,
    pg_get_viewdef(c.oid) AS definition
   FROM (pg_class c
     LEFT JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE (c.relkind = 'v'::"char");


ALTER TABLE pg_catalog.pg_views OWNER TO daodao;

--
-- Name: ai_review_feedbacks; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.ai_review_feedbacks (
    id integer NOT NULL,
    review_id integer,
    task_id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text,
    token_usage double precision DEFAULT 0,
    style text,
    thinking_method text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_review_feedbacks OWNER TO daodao;

--
-- Name: TABLE ai_review_feedbacks; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.ai_review_feedbacks IS 'AI智能評價回饋系統 - 為學習評價提供AI生成的個人化分析建議，支援多種回饋風格和思維方法，提升學習反思品質';


--
-- Name: COLUMN ai_review_feedbacks.id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ai_review_feedbacks.id IS 'AI回饋記錄唯一識別碼，系統自動生成的主鍵';


--
-- Name: COLUMN ai_review_feedbacks.review_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ai_review_feedbacks.review_id IS '關聯的評價記錄ID，一對一關係，每個評價對應一個AI回饋';


--
-- Name: COLUMN ai_review_feedbacks.task_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ai_review_feedbacks.task_id IS 'AI任務唯一識別碼，用於追蹤AI處理狀態和除錯';


--
-- Name: COLUMN ai_review_feedbacks.content; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ai_review_feedbacks.content IS 'AI產生的回饋內容，包含學習建議、優勢分析和改進方向';


--
-- Name: COLUMN ai_review_feedbacks.token_usage; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ai_review_feedbacks.token_usage IS 'AI模型使用的token數量，用於成本控制和使用分析';


--
-- Name: COLUMN ai_review_feedbacks.style; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ai_review_feedbacks.style IS '回饋風格設定：如激勵型、分析型、指導型等個人化風格選項';


--
-- Name: COLUMN ai_review_feedbacks.thinking_method; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ai_review_feedbacks.thinking_method IS '思維方法設定：如批判思考、創意思維、系統思考等方法論框架';


--
-- Name: COLUMN ai_review_feedbacks.created_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ai_review_feedbacks.created_at IS 'AI回饋建立時間，記錄AI回饋生成時間點，使用UTC時區';


--
-- Name: ai_review_feedbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.ai_review_feedbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_review_feedbacks_id_seq OWNER TO daodao;

--
-- Name: ai_review_feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.ai_review_feedbacks_id_seq OWNED BY public.ai_review_feedbacks.id;


--
-- Name: basic_info; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.basic_info (
    id integer NOT NULL,
    self_introduction text,
    share_list text,
    want_to_do_list public.want_to_do_list_t[]
);


ALTER TABLE public.basic_info OWNER TO daodao;

--
-- Name: COLUMN basic_info.share_list; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.basic_info.share_list IS 'split(、)';


--
-- Name: basic_info_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.basic_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.basic_info_id_seq OWNER TO daodao;

--
-- Name: basic_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.basic_info_id_seq OWNED BY public.basic_info.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_id integer,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO daodao;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO daodao;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: city; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.city (
    id integer NOT NULL,
    name public.city_t
);


ALTER TABLE public.city OWNER TO daodao;

--
-- Name: city_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.city_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.city_id_seq OWNER TO daodao;

--
-- Name: city_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.city_id_seq OWNED BY public.city.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    target_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    visibility character varying(10) DEFAULT 'private'::character varying,
    parent_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    target_type character varying(20) DEFAULT 'post'::character varying NOT NULL,
    CONSTRAINT chk_target_type CHECK (((target_type)::text = ANY (ARRAY[('post'::character varying)::text, ('resource'::character varying)::text, ('note'::character varying)::text, ('outcome'::character varying)::text, ('review'::character varying)::text, ('circle'::character varying)::text, ('idea'::character varying)::text, ('portfolio'::character varying)::text]))),
    CONSTRAINT comments_visibility_check CHECK (((visibility)::text = ANY (ARRAY[('public'::character varying)::text, ('private'::character varying)::text])))
);


ALTER TABLE public.comments OWNER TO daodao;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.comments_id_seq OWNER TO daodao;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    google_id character varying(255),
    photo_url text,
    is_subscribe_email boolean,
    email character varying(255),
    ig character varying(255),
    discord character varying(255),
    line character varying(255),
    fb character varying(255)
);


ALTER TABLE public.contacts OWNER TO daodao;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contacts_id_seq OWNER TO daodao;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: country; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.country (
    id integer NOT NULL,
    alpha2 character(2),
    alpha3 character(3),
    name character varying(100) NOT NULL
);


ALTER TABLE public.country OWNER TO daodao;

--
-- Name: country_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.country_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.country_id_seq OWNER TO daodao;

--
-- Name: country_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.country_id_seq OWNED BY public.country.id;


--
-- Name: eligibility; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.eligibility (
    id integer NOT NULL,
    reference_file_path text,
    partner_emails text[],
    fee_plans_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.eligibility OWNER TO daodao;

--
-- Name: eligibility_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.eligibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eligibility_id_seq OWNER TO daodao;

--
-- Name: eligibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.eligibility_id_seq OWNED BY public.eligibility.id;


--
-- Name: entity_resources; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.entity_resources (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    resource_id integer NOT NULL,
    entity_type character varying(20) NOT NULL,
    entity_id integer NOT NULL,
    created_by integer NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT entity_resources_entity_type_check CHECK (((entity_type)::text = ANY (ARRAY[('practice'::character varying)::text, ('project'::character varying)::text, ('idea'::character varying)::text])))
);


ALTER TABLE public.entity_resources OWNER TO daodao;

--
-- Name: TABLE entity_resources; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.entity_resources IS '實體資源關聯表：建立多態關聯，將練習、項目、想法與學習資源進行關聯，支援知識圖譜建構';


--
-- Name: COLUMN entity_resources.id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.id IS '關聯記錄的唯一識別碼，自增主鍵';


--
-- Name: COLUMN entity_resources.external_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.external_id IS '外部API使用的UUID識別碼，支援分散式系統';


--
-- Name: COLUMN entity_resources.resource_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.resource_id IS '關聯的學習資源ID，關聯resources表';


--
-- Name: COLUMN entity_resources.entity_type; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.entity_type IS '實體類型：practice(練習計劃)、project(項目)、idea(創意想法)';


--
-- Name: COLUMN entity_resources.entity_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.entity_id IS '實體的ID，數字ID格式，配合entity_type使用';


--
-- Name: COLUMN entity_resources.created_by; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.created_by IS '建立此關聯的使用者ID，關聯users表';


--
-- Name: COLUMN entity_resources.note; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.note IS '使用者對此資源關聯的個人備註和說明';


--
-- Name: COLUMN entity_resources.created_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.created_at IS '資源關聯建立時間';


--
-- Name: COLUMN entity_resources.updated_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.updated_at IS '資源關聯最後更新時間';


--
-- Name: COLUMN entity_resources.deleted_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.entity_resources.deleted_at IS '軟刪除時間，NULL表示關聯仍然有效';


--
-- Name: entity_resources_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.entity_resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.entity_resources_id_seq OWNER TO daodao;

--
-- Name: entity_resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.entity_resources_id_seq OWNED BY public.entity_resources.id;


--
-- Name: entity_tags; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.entity_tags (
    id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    tag_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    CONSTRAINT entity_tags_entity_type_check CHECK (((entity_type)::text = ANY (ARRAY[('resource'::character varying)::text, ('idea'::character varying)::text, ('project'::character varying)::text, ('practice'::character varying)::text, ('circle'::character varying)::text, ('user'::character varying)::text])))
);


ALTER TABLE public.entity_tags OWNER TO daodao;

--
-- Name: entity_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.entity_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.entity_tags_id_seq OWNER TO daodao;

--
-- Name: entity_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.entity_tags_id_seq OWNED BY public.entity_tags.id;


--
-- Name: fee_plans; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.fee_plans (
    id integer NOT NULL,
    fee_plan_type public.qualifications_t,
    name character varying(255),
    discount numeric(8,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.fee_plans OWNER TO daodao;

--
-- Name: fee_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.fee_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fee_plans_id_seq OWNER TO daodao;

--
-- Name: fee_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.fee_plans_id_seq OWNED BY public.fee_plans.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    title text,
    photo_url character varying(255),
    photo_alt character varying(255),
    category public.group_category_t[],
    group_type public.group_type_t[],
    partner_education_step public.partner_education_step_t[],
    description character varying(255),
    city_id integer,
    is_grouping boolean,
    created_date timestamp with time zone,
    updated_date timestamp with time zone,
    "time" text,
    partner_style text,
    created_at timestamp with time zone,
    created_by integer,
    updated_at timestamp with time zone,
    updated_by character varying(255),
    motivation text,
    contents text,
    expectation_result text,
    notice text,
    tag_list text[],
    group_deadline timestamp with time zone,
    is_need_deadline boolean,
    participator integer,
    hold_time time without time zone,
    is_online boolean,
    "TBD" boolean
);


ALTER TABLE public.groups OWNER TO daodao;

--
-- Name: TABLE groups; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.groups IS 'need to normalize 需要維護 熱門學習領域 ';


--
-- Name: COLUMN groups.category; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.groups.category IS '學習領域 split(,)';


--
-- Name: COLUMN groups.city_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.groups.city_id IS 'split(,)';


--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.groups_id_seq OWNER TO daodao;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: ideas; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.ideas (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    content text NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    has_resources boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    version integer DEFAULT 1,
    CONSTRAINT ideas_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('draft'::character varying)::text, ('archived'::character varying)::text])))
);


ALTER TABLE public.ideas OWNER TO daodao;

--
-- Name: TABLE ideas; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.ideas IS '創意想法表：儲存使用者的創意想法和點子，支援版本控制、狀態管理和軟刪除功能';


--
-- Name: COLUMN ideas.id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.id IS '創意想法的內部唯一識別碼，自增主鍵';


--
-- Name: COLUMN ideas.external_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.external_id IS '外部API使用的UUID識別碼，用於分散式系統';


--
-- Name: COLUMN ideas.user_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.user_id IS '想法發布者的使用者ID，關聯users表';


--
-- Name: COLUMN ideas.content; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.content IS '創意想法的具體內容，支援文本格式';


--
-- Name: COLUMN ideas.status; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.status IS '想法狀態：active(已發布)、draft(草稿)、archived(已封存)';


--
-- Name: COLUMN ideas.has_resources; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.has_resources IS '是否關聯學習資源，用於快速篩選和查詢';


--
-- Name: COLUMN ideas.created_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.created_at IS '想法建立時間';


--
-- Name: COLUMN ideas.updated_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.updated_at IS '想法最後更新時間';


--
-- Name: COLUMN ideas.deleted_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.deleted_at IS '軟刪除時間，NULL表示未刪除';


--
-- Name: COLUMN ideas.version; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.ideas.version IS '想法版本號，支援版本控制和歷史追蹤';


--
-- Name: ideas_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.ideas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ideas_id_seq OWNER TO daodao;

--
-- Name: ideas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.ideas_id_seq OWNED BY public.ideas.id;


--
-- Name: likes; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.likes (
    id integer NOT NULL,
    post_id integer,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.likes OWNER TO daodao;

--
-- Name: likes_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.likes_id_seq OWNER TO daodao;

--
-- Name: likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.likes_id_seq OWNED BY public.likes.id;


--
-- Name: location; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.location (
    id integer NOT NULL,
    city_id integer,
    country_id integer,
    "isTaiwan" boolean
);


ALTER TABLE public.location OWNER TO daodao;

--
-- Name: location_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.location_id_seq OWNER TO daodao;

--
-- Name: location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.location_id_seq OWNED BY public.location.id;


--
-- Name: marathon; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.marathon (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    event_id character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    registration_status character varying(50),
    people_number integer,
    registration_start_date date,
    registration_end_date date,
    is_public boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT marathon_registration_status_check CHECK (((registration_status)::text = ANY (ARRAY[('Open'::character varying)::text, ('Closed'::character varying)::text, ('Pending'::character varying)::text, ('Full'::character varying)::text])))
);


ALTER TABLE public.marathon OWNER TO daodao;

--
-- Name: marathon_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.marathon_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.marathon_id_seq OWNER TO daodao;

--
-- Name: marathon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.marathon_id_seq OWNED BY public.marathon.id;


--
-- Name: mentor_participants; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.mentor_participants (
    mentor_id integer NOT NULL,
    participant_id integer NOT NULL
);


ALTER TABLE public.mentor_participants OWNER TO daodao;

--
-- Name: milestone; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.milestone (
    id integer NOT NULL,
    project_id integer NOT NULL,
    "position" integer,
    name character varying(255) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_completed boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_position_positive CHECK (("position" > 0)),
    CONSTRAINT milestone_check CHECK ((start_date < end_date))
);


ALTER TABLE public.milestone OWNER TO daodao;

--
-- Name: milestone_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.milestone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.milestone_id_seq OWNER TO daodao;

--
-- Name: milestone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.milestone_id_seq OWNED BY public.milestone.id;


--
-- Name: note; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.note (
    id integer NOT NULL,
    post_id integer,
    content text,
    image_urls text[],
    video_urls text[],
    visibility character varying(10) DEFAULT 'private'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT note_visibility_check CHECK (((visibility)::text = ANY (ARRAY[('public'::character varying)::text, ('private'::character varying)::text])))
);


ALTER TABLE public.note OWNER TO daodao;

--
-- Name: note_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.note_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.note_id_seq OWNER TO daodao;

--
-- Name: note_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.note_id_seq OWNED BY public.note.id;


--
-- Name: old_activities; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.old_activities (
    mongo_id text,
    "userId" text,
    title text,
    "photoURL" text,
    "photoAlt" text,
    category text,
    area text,
    "time" text,
    "partnerStyle" text,
    "partnerEducationStep" text,
    description text,
    "tagList" text,
    "isGrouping" boolean,
    "createdDate" text,
    "updatedDate" text,
    __v bigint,
    "activityCategory" text,
    content text,
    deadline text,
    "isNeedDeadline" boolean,
    motivation text,
    notice text,
    outcome text,
    participator text,
    views double precision,
    created_at timestamp without time zone,
    created_by text,
    updated_at timestamp without time zone,
    updated_by text
);


ALTER TABLE public.old_activities OWNER TO daodao;

--
-- Name: old_marathons_v1; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.old_marathons_v1 (
    mongo_id text,
    title text,
    "eventId" text,
    "userId" text,
    description text,
    motivation text,
    content text,
    goals text,
    strategies text,
    milestones text,
    outcomes text,
    status text,
    "registrationStatus" text,
    "registrationDate" text,
    pricing text,
    "isPublic" boolean,
    "isSendEmail" boolean,
    "createdDate" text,
    "updatedDate" text,
    __v bigint,
    resources text,
    created_at timestamp without time zone,
    created_by text,
    updated_at timestamp without time zone,
    updated_by text
);


ALTER TABLE public.old_marathons_v1 OWNER TO daodao;

--
-- Name: old_marathons_v2; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.old_marathons_v2 (
    mongo_id text,
    title text,
    "eventId" text,
    "userId" text,
    description text,
    motivation text,
    content text,
    goals text,
    strategies text,
    milestones text,
    outcomes text,
    status text,
    "registrationStatus" text,
    "registrationDate" text,
    pricing text,
    "isPublic" boolean,
    "isSendEmail" boolean,
    "createdDate" text,
    "updatedDate" text,
    __v bigint,
    resources text,
    created_at timestamp without time zone,
    created_by text,
    updated_at timestamp without time zone,
    updated_by text
);


ALTER TABLE public.old_marathons_v2 OWNER TO daodao;

--
-- Name: old_resource; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.old_resource (
    "資源類型" text,
    "創建者" text,
    "縮圖" text,
    "領域名稱" text,
    "補充資源" text,
    "連結" text,
    "費用" text,
    "影片" text,
    "介紹" text,
    "標籤" text,
    "地區" text,
    "年齡層" text,
    "資源名稱" text
);


ALTER TABLE public.old_resource OWNER TO daodao;

--
-- Name: old_store; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.old_store (
    "AI 摘要" text,
    "Description" text,
    "作者" text,
    "Social Image" text,
    "Tags" text,
    "Created" text,
    "Name" text
);


ALTER TABLE public.old_store OWNER TO daodao;

--
-- Name: old_user; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.old_user (
    mongo_id text,
    "birthDay" text,
    "educationStage" text,
    email text,
    gender text,
    "googleID" text,
    name text,
    "photoURL" text,
    "interestList" text,
    "isOpenLocation" boolean,
    "isOpenProfile" boolean,
    location text,
    "roleList" text,
    "selfIntroduction" text,
    share text,
    "tagList" text,
    "wantToDoList" text,
    "createdDate" text,
    "updatedDate" text,
    __v bigint,
    "contactList" text,
    "isSubscribeEmail" boolean,
    created_at timestamp without time zone,
    created_by text,
    updated_at timestamp without time zone,
    updated_by text
);


ALTER TABLE public.old_user OWNER TO daodao;

--
-- Name: outcome; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.outcome (
    id integer NOT NULL,
    post_id integer NOT NULL,
    content text,
    image_urls text[],
    video_urls text[],
    visibility character varying(10) DEFAULT 'private'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT outcome_visibility_check CHECK (((visibility)::text = ANY (ARRAY[('public'::character varying)::text, ('private'::character varying)::text])))
);


ALTER TABLE public.outcome OWNER TO daodao;

--
-- Name: outcome_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.outcome_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.outcome_id_seq OWNER TO daodao;

--
-- Name: outcome_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.outcome_id_seq OWNED BY public.outcome.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text
);


ALTER TABLE public.permissions OWNER TO daodao;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_id_seq OWNER TO daodao;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: position; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public."position" (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public."position" OWNER TO daodao;

--
-- Name: position_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.position_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.position_id_seq OWNER TO daodao;

--
-- Name: position_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.position_id_seq OWNED BY public."position".id;


--
-- Name: post; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.post (
    id integer NOT NULL,
    project_id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(20) NOT NULL,
    week integer,
    title character varying(255) NOT NULL,
    date date,
    visibility character varying(10) DEFAULT 'private'::character varying,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT post_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text]))),
    CONSTRAINT post_type_check CHECK (((type)::text = ANY (ARRAY[('outcome'::character varying)::text, ('note'::character varying)::text, ('review'::character varying)::text]))),
    CONSTRAINT post_visibility_check CHECK (((visibility)::text = ANY (ARRAY[('public'::character varying)::text, ('private'::character varying)::text])))
);


ALTER TABLE public.post OWNER TO daodao;

--
-- Name: post_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.post_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.post_id_seq OWNER TO daodao;

--
-- Name: post_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.post_id_seq OWNED BY public.post.id;


--
-- Name: practice_checkins; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.practice_checkins (
    id integer NOT NULL,
    practice_id integer NOT NULL,
    user_id integer NOT NULL,
    checkin_date date NOT NULL,
    progress_amount numeric(10,2) NOT NULL,
    note text,
    mood character varying(20),
    reflection_text text,
    related_resource_id uuid,
    streak_day integer DEFAULT 1,
    cumulative_progress numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    CONSTRAINT practice_checkins_mood_check CHECK (((mood)::text = ANY (ARRAY[('awesome'::character varying)::text, ('happy'::character varying)::text, ('neutral'::character varying)::text, ('tired'::character varying)::text, ('frustrated'::character varying)::text]))),
    CONSTRAINT practice_checkins_progress_amount_check CHECK ((progress_amount > (0)::numeric))
);


ALTER TABLE public.practice_checkins OWNER TO daodao;

--
-- Name: TABLE practice_checkins; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.practice_checkins IS '主題實踐打卡記錄表：記錄使用者每日主題實踐的具體執行情況，包括進度、心情、反思和連續紀錄統計';


--
-- Name: COLUMN practice_checkins.id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.id IS '打卡記錄的UUID主鍵，支援分散式系統';


--
-- Name: COLUMN practice_checkins.practice_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.practice_id IS '所屬主題實踐計劃的ID，關聯practices表';


--
-- Name: COLUMN practice_checkins.user_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.user_id IS '執行打卡的使用者ID，關聯users表';


--
-- Name: COLUMN practice_checkins.checkin_date; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.checkin_date IS '打卡日期，每個主題實踐每日只能打卡一次';


--
-- Name: COLUMN practice_checkins.progress_amount; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.progress_amount IS '當日完成的進度量（頁數、分鐘數等）';


--
-- Name: COLUMN practice_checkins.note; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.note IS '當日主題實踐的學習筆記和心得';


--
-- Name: COLUMN practice_checkins.mood; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.mood IS '當日學習心情：awesome(很棒)、happy(開心)、neutral(普通)、tired(疲累)、frustrated(挫折)';


--
-- Name: COLUMN practice_checkins.reflection_text; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.reflection_text IS '當日學習反思和總結內容';


--
-- Name: COLUMN practice_checkins.related_resource_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.related_resource_id IS '相關學習資源的ID，可關聯特定學習材料';


--
-- Name: COLUMN practice_checkins.streak_day; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.streak_day IS '當日是連續打卡的第幾天';


--
-- Name: COLUMN practice_checkins.cumulative_progress; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.cumulative_progress IS '截至當日的累積學習進度';


--
-- Name: COLUMN practice_checkins.created_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.created_at IS '打卡記錄建立時間';


--
-- Name: COLUMN practice_checkins.updated_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practice_checkins.updated_at IS '打卡記錄最後更新時間';


--
-- Name: practice_checkins_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.practice_checkins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.practice_checkins_id_seq OWNER TO daodao;

--
-- Name: practice_checkins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.practice_checkins_id_seq OWNED BY public.practice_checkins.id;


--
-- Name: practices; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.practices (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    title character varying(100) NOT NULL,
    content_type character varying(20) NOT NULL,
    custom_content_type character varying(50),
    total_amount integer NOT NULL,
    current_progress numeric(10,2) DEFAULT 0,
    start_date date,
    daily_goal_type character varying(20) NOT NULL,
    daily_goal_time_minutes integer,
    daily_goal_amount integer,
    daily_goal_unit character varying(10),
    practice_action text,
    status character varying(20) DEFAULT 'active'::character varying,
    has_resources boolean DEFAULT false,
    streak integer DEFAULT 0,
    max_streak integer DEFAULT 0,
    last_checkin_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT practices_content_type_check CHECK (((content_type)::text = ANY (ARRAY[('book'::character varying)::text, ('video'::character varying)::text, ('articles'::character varying)::text, ('podcast'::character varying)::text, ('course'::character varying)::text, ('custom'::character varying)::text]))),
    CONSTRAINT practices_daily_goal_amount_check CHECK (((daily_goal_amount >= 1) AND (daily_goal_amount <= 100))),
    CONSTRAINT practices_daily_goal_time_minutes_check CHECK (((daily_goal_time_minutes >= 5) AND (daily_goal_time_minutes <= 240))),
    CONSTRAINT practices_daily_goal_type_check CHECK (((daily_goal_type)::text = ANY (ARRAY[('time'::character varying)::text, ('completion'::character varying)::text]))),
    CONSTRAINT practices_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('paused'::character varying)::text, ('completed'::character varying)::text, ('archived'::character varying)::text]))),
    CONSTRAINT practices_total_amount_check CHECK ((total_amount > 0))
);


ALTER TABLE public.practices OWNER TO daodao;

--
-- Name: TABLE practices; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.practices IS '練習記錄表：儲存使用者的學習練習計劃，支援多種內容類型、目標設定和進度追蹤';


--
-- Name: COLUMN practices.id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.id IS '練習記錄的整數主鍵';


--
-- Name: COLUMN practices.external_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.external_id IS '外部API使用的UUID識別碼';


--
-- Name: COLUMN practices.user_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.user_id IS '練習者的使用者ID，關聯users表';


--
-- Name: COLUMN practices.title; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.title IS '練習計劃的標題名稱';


--
-- Name: COLUMN practices.content_type; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.content_type IS '學習內容類型：book(書籍)、video(影片)、articles(文章)、podcast、course(課程)、custom(自定義)';


--
-- Name: COLUMN practices.custom_content_type; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.custom_content_type IS '自定義內容類型名稱，當content_type為custom時使用';


--
-- Name: COLUMN practices.total_amount; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.total_amount IS '學習目標總量（如總頁數、總分鐘數等）';


--
-- Name: COLUMN practices.current_progress; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.current_progress IS '目前已完成的進度量';


--
-- Name: COLUMN practices.start_date; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.start_date IS '練習計劃開始日期';


--
-- Name: COLUMN practices.daily_goal_type; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.daily_goal_type IS '每日目標類型：time(時間目標)或completion(完成量目標)';


--
-- Name: COLUMN practices.daily_goal_time_minutes; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.daily_goal_time_minutes IS '每日目標時間，單位為分鐘（5-240分鐘）';


--
-- Name: COLUMN practices.daily_goal_amount; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.daily_goal_amount IS '每日目標完成量（1-100單位）';


--
-- Name: COLUMN practices.daily_goal_unit; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.daily_goal_unit IS '每日目標的計量單位（如頁、章節等）';


--
-- Name: COLUMN practices.practice_action; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.practice_action IS '具體的練習行動描述';


--
-- Name: COLUMN practices.status; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.status IS '練習狀態：active(進行中)、paused(暫停)、completed(已完成)、archived(已封存)';


--
-- Name: COLUMN practices.has_resources; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.has_resources IS '是否關聯學習資源，用於快速篩選';


--
-- Name: COLUMN practices.streak; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.streak IS '目前連續打卡天數';


--
-- Name: COLUMN practices.max_streak; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.max_streak IS '歷史最高連續打卡天數紀錄';


--
-- Name: COLUMN practices.last_checkin_date; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.last_checkin_date IS '最後一次打卡的日期';


--
-- Name: COLUMN practices.created_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.created_at IS '練習記錄建立時間';


--
-- Name: COLUMN practices.updated_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.updated_at IS '練習記錄最後更新時間';


--
-- Name: COLUMN practices.deleted_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.practices.deleted_at IS '軟刪除時間，NULL表示未刪除';


--
-- Name: practices_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.practices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.practices_id_seq OWNER TO daodao;

--
-- Name: practices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.practices_id_seq OWNED BY public.practices.id;


--
-- Name: preference_options; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.preference_options (
    id integer NOT NULL,
    preference_type_id integer NOT NULL,
    name character varying(200) NOT NULL,
    value character varying(50) NOT NULL,
    description text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    selection_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.preference_options OWNER TO daodao;

--
-- Name: TABLE preference_options; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.preference_options IS 'DAODAO 平台偏好選項表，定義用戶偏好系統的具體選項內容，支援統計和排序';


--
-- Name: preference_options_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.preference_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.preference_options_id_seq OWNER TO daodao;

--
-- Name: preference_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.preference_options_id_seq OWNED BY public.preference_options.id;


--
-- Name: preference_types; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.preference_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    value character varying(30) NOT NULL,
    description text,
    max_selections integer DEFAULT 3,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.preference_types OWNER TO daodao;

--
-- Name: TABLE preference_types; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.preference_types IS 'DAODAO 平台偏好類型表，定義用戶偏好系統的分類架構和選擇規則';


--
-- Name: preference_types_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.preference_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.preference_types_id_seq OWNER TO daodao;

--
-- Name: preference_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.preference_types_id_seq OWNED BY public.preference_types.id;


--
-- Name: professional_fields; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.professional_fields (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    value character varying(100) NOT NULL,
    description text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.professional_fields OWNER TO daodao;

--
-- Name: TABLE professional_fields; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.professional_fields IS 'ESCO 專業領域分類主表';


--
-- Name: COLUMN professional_fields.name; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.professional_fields.name IS '專業領域中文名稱';


--
-- Name: COLUMN professional_fields.value; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.professional_fields.value IS '專業領域英文值 (用於 API)';


--
-- Name: COLUMN professional_fields.description; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.professional_fields.description IS '專業領域描述';


--
-- Name: COLUMN professional_fields.display_order; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.professional_fields.display_order IS '顯示順序';


--
-- Name: COLUMN professional_fields.is_active; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.professional_fields.is_active IS '是否啟用';


--
-- Name: professional_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.professional_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.professional_fields_id_seq OWNER TO daodao;

--
-- Name: professional_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.professional_fields_id_seq OWNED BY public.professional_fields.id;


--
-- Name: project; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.project (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    img_url character varying(255),
    title character varying(255) NOT NULL,
    description text,
    motivation public.motivation_t[],
    motivation_description text,
    goal character varying(255),
    content text,
    strategy public.strategy_t[],
    strategy_description text,
    resource text,
    outcome public.outcome_t[],
    outcome_description text,
    is_public boolean DEFAULT true,
    status character varying(50) DEFAULT 'Not Started'::character varying,
    start_date date,
    end_date date,
    "interval" integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer,
    version integer,
    CONSTRAINT project_check CHECK ((start_date < end_date)),
    CONSTRAINT project_interval_check CHECK (("interval" > 0)),
    CONSTRAINT project_status_check CHECK (((status)::text = ANY (ARRAY[('Ongoing'::character varying)::text, ('Completed'::character varying)::text, ('Not Started'::character varying)::text, ('Canceled'::character varying)::text])))
);


ALTER TABLE public.project OWNER TO daodao;

--
-- Name: project_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_id_seq OWNER TO daodao;

--
-- Name: project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.project_id_seq OWNED BY public.project.id;


--
-- Name: project_marathon; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.project_marathon (
    id integer NOT NULL,
    project_id integer,
    marathon_id integer,
    eligibility_id integer,
    project_registration_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50),
    feedback text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_marathon_status_check CHECK (((status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Approved'::character varying)::text, ('Rejected'::character varying)::text])))
);


ALTER TABLE public.project_marathon OWNER TO daodao;

--
-- Name: project_marathon_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.project_marathon_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_marathon_id_seq OWNER TO daodao;

--
-- Name: project_marathon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.project_marathon_id_seq OWNED BY public.project_marathon.id;


--
-- Name: rating; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.rating (
    id integer NOT NULL,
    user_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    overall_rating numeric(3,1) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rating_overall_rating_check CHECK (((overall_rating >= (0)::numeric) AND (overall_rating <= (10)::numeric))),
    CONSTRAINT rating_target_type_check CHECK (((target_type)::text = ANY (ARRAY[('project'::character varying)::text, ('post'::character varying)::text, ('resource'::character varying)::text, ('note'::character varying)::text, ('outcome'::character varying)::text, ('review'::character varying)::text, ('circle'::character varying)::text, ('idea'::character varying)::text, ('portfolio'::character varying)::text])))
);


ALTER TABLE public.rating OWNER TO daodao;

--
-- Name: TABLE rating; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.rating IS '通用評分系統主表 - 記錄用戶對平台各種內容類型的整體評分，支援10分制評分機制和統一的評分管理';


--
-- Name: COLUMN rating.id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating.id IS '評分記錄唯一識別碼，系統自動生成的主鍵';


--
-- Name: COLUMN rating.user_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating.user_id IS '評分用戶ID，關聯users表，確保評分者有效性';


--
-- Name: COLUMN rating.target_type; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating.target_type IS '評分目標類型，支援多種內容類型(project、post、resource、note、outcome、review、circle、idea、portfolio)';


--
-- Name: COLUMN rating.target_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating.target_id IS '評分目標的具體ID，配合target_type定位具體內容';


--
-- Name: COLUMN rating.overall_rating; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating.overall_rating IS '整體評分，使用0-10分制，支援一位小數精度';


--
-- Name: COLUMN rating.created_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating.created_at IS '評分建立時間，記錄首次評分時間點，使用UTC時區';


--
-- Name: COLUMN rating.updated_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating.updated_at IS '評分最後更新時間，記錄最後修改評分時間點，支援評分修改，使用UTC時區';


--
-- Name: rating_detail; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.rating_detail (
    id integer NOT NULL,
    rating_id integer NOT NULL,
    category character varying(50) NOT NULL,
    rating_value numeric(3,1) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rating_detail_rating_value_check CHECK (((rating_value >= (0)::numeric) AND (rating_value <= (10)::numeric)))
);


ALTER TABLE public.rating_detail OWNER TO daodao;

--
-- Name: TABLE rating_detail; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.rating_detail IS '評分細項明細表 - 支援多維度評分系統，記錄評分的各個具體類別和分數，提供精細化的評價分析和改進建議';


--
-- Name: COLUMN rating_detail.id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating_detail.id IS '評分細項記錄唯一識別碼，系統自動生成的主鍵';


--
-- Name: COLUMN rating_detail.rating_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating_detail.rating_id IS '關聯到評分主表的ID，建立主從關係';


--
-- Name: COLUMN rating_detail.category; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating_detail.category IS '評分類別名稱，定義評分的具體維度(如內容品質、實用性、易懂程度等)';


--
-- Name: COLUMN rating_detail.rating_value; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating_detail.rating_value IS '該類別的具體評分，使用0-10分制，支援一位小數精度';


--
-- Name: COLUMN rating_detail.created_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating_detail.created_at IS '細項評分建立時間，記錄細項評分建立時間點，使用UTC時區';


--
-- Name: COLUMN rating_detail.updated_at; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.rating_detail.updated_at IS '細項評分最後更新時間，記錄最後修改細項評分時間點，使用UTC時區';


--
-- Name: rating_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.rating_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rating_detail_id_seq OWNER TO daodao;

--
-- Name: rating_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.rating_detail_id_seq OWNED BY public.rating_detail.id;


--
-- Name: rating_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.rating_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rating_id_seq OWNER TO daodao;

--
-- Name: rating_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.rating_id_seq OWNED BY public.rating.id;


--
-- Name: resource_review; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.resource_review (
    id integer NOT NULL,
    user_id integer NOT NULL,
    resource_id integer NOT NULL,
    score_impact numeric(2,1) NOT NULL,
    score_mindset numeric(2,1) NOT NULL,
    score_problems numeric(2,1) NOT NULL,
    score_perspectives numeric(2,1) NOT NULL,
    score_goals numeric(2,1) NOT NULL,
    content text NOT NULL,
    well_structured boolean DEFAULT false,
    practice_focused boolean DEFAULT false,
    well_rounded_concepts boolean DEFAULT false,
    thought_provoking boolean DEFAULT false,
    progressive_learning boolean DEFAULT false,
    problem_based boolean DEFAULT false,
    real_world_examples boolean DEFAULT false,
    interactive boolean DEFAULT false,
    visually_rich boolean DEFAULT false,
    time_usage character varying(30),
    with_online_courses boolean DEFAULT false,
    with_books boolean DEFAULT false,
    with_other_tools boolean DEFAULT false,
    with_community boolean DEFAULT false,
    only_this_resource boolean DEFAULT false,
    not_applicable_resource boolean DEFAULT false,
    status character varying(20) DEFAULT 'published'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT resource_review_score_goals_check CHECK (((score_goals >= 1.0) AND (score_goals <= 5.0))),
    CONSTRAINT resource_review_score_impact_check CHECK (((score_impact >= 1.0) AND (score_impact <= 5.0))),
    CONSTRAINT resource_review_score_mindset_check CHECK (((score_mindset >= 1.0) AND (score_mindset <= 5.0))),
    CONSTRAINT resource_review_score_perspectives_check CHECK (((score_perspectives >= 1.0) AND (score_perspectives <= 5.0))),
    CONSTRAINT resource_review_score_problems_check CHECK (((score_problems >= 1.0) AND (score_problems <= 5.0))),
    CONSTRAINT resource_review_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text, ('archived'::character varying)::text, ('reported'::character varying)::text]))),
    CONSTRAINT resource_review_time_usage_check CHECK (((time_usage)::text = ANY (ARRAY[('1_2_hours_daily'::character varying)::text, ('few_intensive_days_week'::character varying)::text, ('spare_moments'::character varying)::text, ('not_applicable_time'::character varying)::text])))
);


ALTER TABLE public.resource_review OWNER TO daodao;

--
-- Name: resource_review_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.resource_review_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.resource_review_id_seq OWNER TO daodao;

--
-- Name: resource_review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.resource_review_id_seq OWNED BY public.resource_review.id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    created_by integer NOT NULL,
    major_category_id integer,
    sub_category_id integer,
    name character varying(255) NOT NULL,
    url character varying(1000) NOT NULL,
    image_url character varying(1000),
    description text NOT NULL,
    video_url character varying(1000),
    type character varying(100) NOT NULL,
    cost character varying(50) NOT NULL,
    level character varying(50) DEFAULT 'all_levels'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT resources_cost_check CHECK (((cost)::text = ANY (ARRAY[('free'::character varying)::text, ('paid'::character varying)::text, ('partial_free'::character varying)::text]))),
    CONSTRAINT resources_level_check CHECK (((level)::text = ANY (ARRAY[('beginner'::character varying)::text, ('intermediate'::character varying)::text, ('expert'::character varying)::text, ('all_levels'::character varying)::text]))),
    CONSTRAINT resources_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('active'::character varying)::text, ('archived'::character varying)::text, ('reported'::character varying)::text]))),
    CONSTRAINT resources_type_check CHECK (((type)::text = ANY (ARRAY[('learning_platform_app'::character varying)::text, ('learning_tools'::character varying)::text, ('books_articles'::character varying)::text, ('video_content'::character varying)::text, ('podcast_content'::character varying)::text, ('workshops_courses'::character varying)::text, ('professional_certificates'::character varying)::text, ('community_organization'::character varying)::text, ('other'::character varying)::text])))
);


ALTER TABLE public.resources OWNER TO daodao;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.resources_id_seq OWNER TO daodao;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: review; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.review (
    id integer NOT NULL,
    post_id integer NOT NULL,
    mood character varying(20) NOT NULL,
    mood_description text,
    stress_level smallint NOT NULL,
    learning_review smallint NOT NULL,
    learning_feedback text,
    adjustment_plan text,
    visibility character varying(10) DEFAULT 'private'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT review_learning_review_check CHECK (((learning_review >= 1) AND (learning_review <= 10))),
    CONSTRAINT review_mood_check CHECK (((mood)::text = ANY (ARRAY[('happy'::character varying)::text, ('calm'::character varying)::text, ('anxious'::character varying)::text, ('tired'::character varying)::text, ('frustrated'::character varying)::text]))),
    CONSTRAINT review_stress_level_check CHECK (((stress_level >= 1) AND (stress_level <= 10))),
    CONSTRAINT review_visibility_check CHECK (((visibility)::text = ANY (ARRAY[('public'::character varying)::text, ('private'::character varying)::text])))
);


ALTER TABLE public.review OWNER TO daodao;

--
-- Name: review_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.review_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.review_id_seq OWNER TO daodao;

--
-- Name: review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.review_id_seq OWNED BY public.review.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO daodao;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO daodao;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO daodao;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: store; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.store (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    user_id integer,
    image_url character varying(255),
    author_list text,
    tags character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ai_summary text,
    description text,
    content text,
    name character varying(255)
);


ALTER TABLE public.store OWNER TO daodao;

--
-- Name: store_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.store_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.store_id_seq OWNER TO daodao;

--
-- Name: store_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.store_id_seq OWNED BY public.store.id;


--
-- Name: subscription_plan; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.subscription_plan (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    features jsonb,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscription_plan OWNER TO daodao;

--
-- Name: subscription_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.subscription_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.subscription_plan_id_seq OWNER TO daodao;

--
-- Name: subscription_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.subscription_plan_id_seq OWNED BY public.subscription_plan.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tags OWNER TO daodao;

--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tags_id_seq OWNER TO daodao;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: task; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.task (
    id integer NOT NULL,
    milestone_id integer NOT NULL,
    name character varying(255),
    description text,
    days_of_week public.day_enum[],
    is_completed boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.task OWNER TO daodao;

--
-- Name: task_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.task_id_seq OWNER TO daodao;

--
-- Name: task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.task_id_seq OWNED BY public.task.id;


--
-- Name: temp_users; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.temp_users (
    id integer NOT NULL,
    google_id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    photo_url character varying(255),
    created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.temp_users OWNER TO daodao;

--
-- Name: temp_users_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.temp_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.temp_users_id_seq OWNER TO daodao;

--
-- Name: temp_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.temp_users_id_seq OWNED BY public.temp_users.id;


--
-- Name: user_interests; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_interests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_interests OWNER TO daodao;

--
-- Name: user_interests_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.user_interests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_interests_id_seq OWNER TO daodao;

--
-- Name: user_interests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.user_interests_id_seq OWNED BY public.user_interests.id;


--
-- Name: user_join_group; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_join_group (
    id integer NOT NULL,
    user_id integer,
    group_id integer,
    group_participation_role_t public.group_participation_role_t DEFAULT 'Initiator'::public.group_participation_role_t,
    participated_at timestamp with time zone
);


ALTER TABLE public.user_join_group OWNER TO daodao;

--
-- Name: user_join_group_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.user_join_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_join_group_id_seq OWNER TO daodao;

--
-- Name: user_join_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.user_join_group_id_seq OWNED BY public.user_join_group.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_permissions (
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO daodao;

--
-- Name: user_positions; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_positions (
    user_id integer NOT NULL,
    position_id integer NOT NULL
);


ALTER TABLE public.user_positions OWNER TO daodao;

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    preference_option_id integer NOT NULL,
    is_selected boolean DEFAULT false,
    preference_weight numeric(3,2) DEFAULT 1.0,
    last_accessed_at timestamp without time zone,
    access_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_preferences OWNER TO daodao;

--
-- Name: TABLE user_preferences; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.user_preferences IS 'DAODAO 平台用戶偏好關聯表，支援個人化推薦系統和學習內容過濾，含權重和行為追蹤';


--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_preferences_id_seq OWNER TO daodao;

--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- Name: user_professional_fields; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_professional_fields (
    id integer NOT NULL,
    user_id integer NOT NULL,
    professional_field_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_professional_fields OWNER TO daodao;

--
-- Name: TABLE user_professional_fields; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.user_professional_fields IS '用戶專業領域關聯表 (多對多)';


--
-- Name: COLUMN user_professional_fields.user_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.user_professional_fields.user_id IS '用戶 ID';


--
-- Name: COLUMN user_professional_fields.professional_field_id; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON COLUMN public.user_professional_fields.professional_field_id IS '專業領域 ID';


--
-- Name: user_professional_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.user_professional_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_professional_fields_id_seq OWNER TO daodao;

--
-- Name: user_professional_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.user_professional_fields_id_seq OWNED BY public.user_professional_fields.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_profiles (
    id integer NOT NULL,
    user_id integer,
    nickname character varying(100),
    bio text,
    skills text[],
    interests text[],
    learning_needs text[],
    contact_info jsonb,
    is_public boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_profiles OWNER TO daodao;

--
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_profiles_id_seq OWNER TO daodao;

--
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- Name: user_project; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_project (
    id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer NOT NULL
);


ALTER TABLE public.user_project OWNER TO daodao;

--
-- Name: user_project_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.user_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_project_id_seq OWNER TO daodao;

--
-- Name: user_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.user_project_id_seq OWNED BY public.user_project.id;


--
-- Name: user_subscription; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.user_subscription (
    id integer NOT NULL,
    user_id integer,
    plan_id integer,
    status public.subscription_status NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_subscription OWNER TO daodao;

--
-- Name: user_subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.user_subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_subscription_id_seq OWNER TO daodao;

--
-- Name: user_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.user_subscription_id_seq OWNED BY public.user_subscription.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: daodao
--

CREATE TABLE public.users (
    id integer NOT NULL,
    external_id uuid DEFAULT gen_random_uuid(),
    mongo_id text NOT NULL,
    gender public.gender_t,
    language character varying(255),
    education_stage public.education_stage_t DEFAULT 'other'::public.education_stage_t,
    tag_list text[],
    contact_id integer,
    is_open_location boolean,
    location_id integer,
    nickname character varying(255),
    role_id integer NOT NULL,
    is_open_profile boolean,
    birth_date date,
    basic_info_id integer,
    "createdDate" timestamp with time zone,
    "updatedDate" timestamp with time zone,
    created_by character varying(255),
    created_at timestamp with time zone,
    updated_by character varying(255),
    updated_at timestamp with time zone,
    is_active boolean DEFAULT true,
    verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    custom_id character varying(50),
    custom_id_verified boolean DEFAULT false,
    custom_id_created_at timestamp with time zone,
    professional_field character varying(100),
    personal_slogan character varying(200),
    referral_source character varying(100),
    CONSTRAINT chk_professional_field_valid CHECK (((professional_field IS NULL) OR ((professional_field)::text = ANY ((ARRAY['information_and_communication_technologies_icts'::character varying, 'business_administration_and_law'::character varying, 'arts_and_humanities'::character varying, 'natural_sciences_mathematics_and_statistics'::character varying, 'engineering_manufacturing_and_construction'::character varying, 'health_and_welfare'::character varying, 'education'::character varying, 'social_sciences_journalism_and_information'::character varying, 'language_skills_and_knowledge'::character varying, 'services'::character varying, 'agriculture_forestry_fisheries_and_veterinary'::character varying, 'others'::character varying])::text[]))))
);


ALTER TABLE public.users OWNER TO daodao;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: daodao
--

COMMENT ON TABLE public.users IS '可能需要維護 熱門標籤列表 到cache';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: daodao
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO daodao;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: daodao
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_review_feedbacks id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ai_review_feedbacks ALTER COLUMN id SET DEFAULT nextval('public.ai_review_feedbacks_id_seq'::regclass);


--
-- Name: basic_info id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.basic_info ALTER COLUMN id SET DEFAULT nextval('public.basic_info_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: city id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.city ALTER COLUMN id SET DEFAULT nextval('public.city_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: country id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.country ALTER COLUMN id SET DEFAULT nextval('public.country_id_seq'::regclass);


--
-- Name: eligibility id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.eligibility ALTER COLUMN id SET DEFAULT nextval('public.eligibility_id_seq'::regclass);


--
-- Name: entity_resources id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_resources ALTER COLUMN id SET DEFAULT nextval('public.entity_resources_id_seq'::regclass);


--
-- Name: entity_tags id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_tags ALTER COLUMN id SET DEFAULT nextval('public.entity_tags_id_seq'::regclass);


--
-- Name: fee_plans id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.fee_plans ALTER COLUMN id SET DEFAULT nextval('public.fee_plans_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: ideas id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ideas ALTER COLUMN id SET DEFAULT nextval('public.ideas_id_seq'::regclass);


--
-- Name: likes id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.likes ALTER COLUMN id SET DEFAULT nextval('public.likes_id_seq'::regclass);


--
-- Name: location id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.location ALTER COLUMN id SET DEFAULT nextval('public.location_id_seq'::regclass);


--
-- Name: marathon id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.marathon ALTER COLUMN id SET DEFAULT nextval('public.marathon_id_seq'::regclass);


--
-- Name: milestone id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.milestone ALTER COLUMN id SET DEFAULT nextval('public.milestone_id_seq'::regclass);


--
-- Name: note id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.note ALTER COLUMN id SET DEFAULT nextval('public.note_id_seq'::regclass);


--
-- Name: outcome id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.outcome ALTER COLUMN id SET DEFAULT nextval('public.outcome_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: position id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public."position" ALTER COLUMN id SET DEFAULT nextval('public.position_id_seq'::regclass);


--
-- Name: post id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.post ALTER COLUMN id SET DEFAULT nextval('public.post_id_seq'::regclass);


--
-- Name: practice_checkins id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practice_checkins ALTER COLUMN id SET DEFAULT nextval('public.practice_checkins_id_seq'::regclass);


--
-- Name: practices id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practices ALTER COLUMN id SET DEFAULT nextval('public.practices_id_seq'::regclass);


--
-- Name: preference_options id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.preference_options ALTER COLUMN id SET DEFAULT nextval('public.preference_options_id_seq'::regclass);


--
-- Name: preference_types id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.preference_types ALTER COLUMN id SET DEFAULT nextval('public.preference_types_id_seq'::regclass);


--
-- Name: professional_fields id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.professional_fields ALTER COLUMN id SET DEFAULT nextval('public.professional_fields_id_seq'::regclass);


--
-- Name: project id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project ALTER COLUMN id SET DEFAULT nextval('public.project_id_seq'::regclass);


--
-- Name: project_marathon id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project_marathon ALTER COLUMN id SET DEFAULT nextval('public.project_marathon_id_seq'::regclass);


--
-- Name: rating id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.rating ALTER COLUMN id SET DEFAULT nextval('public.rating_id_seq'::regclass);


--
-- Name: rating_detail id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.rating_detail ALTER COLUMN id SET DEFAULT nextval('public.rating_detail_id_seq'::regclass);


--
-- Name: resource_review id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resource_review ALTER COLUMN id SET DEFAULT nextval('public.resource_review_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: review id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.review ALTER COLUMN id SET DEFAULT nextval('public.review_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: store id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.store ALTER COLUMN id SET DEFAULT nextval('public.store_id_seq'::regclass);


--
-- Name: subscription_plan id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.subscription_plan ALTER COLUMN id SET DEFAULT nextval('public.subscription_plan_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: task id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.task ALTER COLUMN id SET DEFAULT nextval('public.task_id_seq'::regclass);


--
-- Name: temp_users id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.temp_users ALTER COLUMN id SET DEFAULT nextval('public.temp_users_id_seq'::regclass);


--
-- Name: user_interests id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_interests ALTER COLUMN id SET DEFAULT nextval('public.user_interests_id_seq'::regclass);


--
-- Name: user_join_group id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_join_group ALTER COLUMN id SET DEFAULT nextval('public.user_join_group_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- Name: user_professional_fields id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_professional_fields ALTER COLUMN id SET DEFAULT nextval('public.user_professional_fields_id_seq'::regclass);


--
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- Name: user_project id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_project ALTER COLUMN id SET DEFAULT nextval('public.user_project_id_seq'::regclass);


--
-- Name: user_subscription id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_subscription ALTER COLUMN id SET DEFAULT nextval('public.user_subscription_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: pg_aggregate pg_aggregate_fnoid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_aggregate
    ADD CONSTRAINT pg_aggregate_fnoid_index PRIMARY KEY (aggfnoid);


--
-- Name: pg_am pg_am_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_am
    ADD CONSTRAINT pg_am_name_index UNIQUE (amname);


--
-- Name: pg_am pg_am_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_am
    ADD CONSTRAINT pg_am_oid_index PRIMARY KEY (oid);


--
-- Name: pg_amop pg_amop_fam_strat_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_amop
    ADD CONSTRAINT pg_amop_fam_strat_index UNIQUE (amopfamily, amoplefttype, amoprighttype, amopstrategy);


--
-- Name: pg_amop pg_amop_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_amop
    ADD CONSTRAINT pg_amop_oid_index PRIMARY KEY (oid);


--
-- Name: pg_amop pg_amop_opr_fam_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_amop
    ADD CONSTRAINT pg_amop_opr_fam_index UNIQUE (amopopr, amoppurpose, amopfamily);


--
-- Name: pg_amproc pg_amproc_fam_proc_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_amproc
    ADD CONSTRAINT pg_amproc_fam_proc_index UNIQUE (amprocfamily, amproclefttype, amprocrighttype, amprocnum);


--
-- Name: pg_amproc pg_amproc_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_amproc
    ADD CONSTRAINT pg_amproc_oid_index PRIMARY KEY (oid);


--
-- Name: pg_attrdef pg_attrdef_adrelid_adnum_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_attrdef
    ADD CONSTRAINT pg_attrdef_adrelid_adnum_index UNIQUE (adrelid, adnum);


--
-- Name: pg_attrdef pg_attrdef_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_attrdef
    ADD CONSTRAINT pg_attrdef_oid_index PRIMARY KEY (oid);


--
-- Name: pg_attribute pg_attribute_relid_attnam_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_attribute
    ADD CONSTRAINT pg_attribute_relid_attnam_index UNIQUE (attrelid, attname);


--
-- Name: pg_attribute pg_attribute_relid_attnum_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_attribute
    ADD CONSTRAINT pg_attribute_relid_attnum_index PRIMARY KEY (attrelid, attnum);


SET default_tablespace = pg_global;

--
-- Name: pg_auth_members pg_auth_members_member_role_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_auth_members
    ADD CONSTRAINT pg_auth_members_member_role_index UNIQUE (member, roleid);


--
-- Name: pg_auth_members pg_auth_members_role_member_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_auth_members
    ADD CONSTRAINT pg_auth_members_role_member_index PRIMARY KEY (roleid, member);


--
-- Name: pg_authid pg_authid_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_authid
    ADD CONSTRAINT pg_authid_oid_index PRIMARY KEY (oid);


--
-- Name: pg_authid pg_authid_rolname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_authid
    ADD CONSTRAINT pg_authid_rolname_index UNIQUE (rolname);


SET default_tablespace = '';

--
-- Name: pg_cast pg_cast_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_cast
    ADD CONSTRAINT pg_cast_oid_index PRIMARY KEY (oid);


--
-- Name: pg_cast pg_cast_source_target_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_cast
    ADD CONSTRAINT pg_cast_source_target_index UNIQUE (castsource, casttarget);


--
-- Name: pg_class pg_class_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_class
    ADD CONSTRAINT pg_class_oid_index PRIMARY KEY (oid);


--
-- Name: pg_class pg_class_relname_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_class
    ADD CONSTRAINT pg_class_relname_nsp_index UNIQUE (relname, relnamespace);


--
-- Name: pg_collation pg_collation_name_enc_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_collation
    ADD CONSTRAINT pg_collation_name_enc_nsp_index UNIQUE (collname, collencoding, collnamespace);


--
-- Name: pg_collation pg_collation_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_collation
    ADD CONSTRAINT pg_collation_oid_index PRIMARY KEY (oid);


--
-- Name: pg_constraint pg_constraint_conrelid_contypid_conname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_constraint
    ADD CONSTRAINT pg_constraint_conrelid_contypid_conname_index UNIQUE (conrelid, contypid, conname);


--
-- Name: pg_constraint pg_constraint_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_constraint
    ADD CONSTRAINT pg_constraint_oid_index PRIMARY KEY (oid);


--
-- Name: pg_conversion pg_conversion_default_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_conversion
    ADD CONSTRAINT pg_conversion_default_index UNIQUE (connamespace, conforencoding, contoencoding, oid);


--
-- Name: pg_conversion pg_conversion_name_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_conversion
    ADD CONSTRAINT pg_conversion_name_nsp_index UNIQUE (conname, connamespace);


--
-- Name: pg_conversion pg_conversion_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_conversion
    ADD CONSTRAINT pg_conversion_oid_index PRIMARY KEY (oid);


SET default_tablespace = pg_global;

--
-- Name: pg_database pg_database_datname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_database
    ADD CONSTRAINT pg_database_datname_index UNIQUE (datname);


--
-- Name: pg_database pg_database_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_database
    ADD CONSTRAINT pg_database_oid_index PRIMARY KEY (oid);


--
-- Name: pg_db_role_setting pg_db_role_setting_databaseid_rol_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_db_role_setting
    ADD CONSTRAINT pg_db_role_setting_databaseid_rol_index PRIMARY KEY (setdatabase, setrole);


SET default_tablespace = '';

--
-- Name: pg_default_acl pg_default_acl_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_default_acl
    ADD CONSTRAINT pg_default_acl_oid_index PRIMARY KEY (oid);


--
-- Name: pg_default_acl pg_default_acl_role_nsp_obj_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_default_acl
    ADD CONSTRAINT pg_default_acl_role_nsp_obj_index UNIQUE (defaclrole, defaclnamespace, defaclobjtype);


--
-- Name: pg_description pg_description_o_c_o_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_description
    ADD CONSTRAINT pg_description_o_c_o_index PRIMARY KEY (objoid, classoid, objsubid);


--
-- Name: pg_enum pg_enum_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_enum
    ADD CONSTRAINT pg_enum_oid_index PRIMARY KEY (oid);


--
-- Name: pg_enum pg_enum_typid_label_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_enum
    ADD CONSTRAINT pg_enum_typid_label_index UNIQUE (enumtypid, enumlabel);


--
-- Name: pg_enum pg_enum_typid_sortorder_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_enum
    ADD CONSTRAINT pg_enum_typid_sortorder_index UNIQUE (enumtypid, enumsortorder);


--
-- Name: pg_event_trigger pg_event_trigger_evtname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_event_trigger
    ADD CONSTRAINT pg_event_trigger_evtname_index UNIQUE (evtname);


--
-- Name: pg_event_trigger pg_event_trigger_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_event_trigger
    ADD CONSTRAINT pg_event_trigger_oid_index PRIMARY KEY (oid);


--
-- Name: pg_extension pg_extension_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_extension
    ADD CONSTRAINT pg_extension_name_index UNIQUE (extname);


--
-- Name: pg_extension pg_extension_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_extension
    ADD CONSTRAINT pg_extension_oid_index PRIMARY KEY (oid);


--
-- Name: pg_foreign_data_wrapper pg_foreign_data_wrapper_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_foreign_data_wrapper
    ADD CONSTRAINT pg_foreign_data_wrapper_name_index UNIQUE (fdwname);


--
-- Name: pg_foreign_data_wrapper pg_foreign_data_wrapper_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_foreign_data_wrapper
    ADD CONSTRAINT pg_foreign_data_wrapper_oid_index PRIMARY KEY (oid);


--
-- Name: pg_foreign_server pg_foreign_server_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_foreign_server
    ADD CONSTRAINT pg_foreign_server_name_index UNIQUE (srvname);


--
-- Name: pg_foreign_server pg_foreign_server_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_foreign_server
    ADD CONSTRAINT pg_foreign_server_oid_index PRIMARY KEY (oid);


--
-- Name: pg_foreign_table pg_foreign_table_relid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_foreign_table
    ADD CONSTRAINT pg_foreign_table_relid_index PRIMARY KEY (ftrelid);


--
-- Name: pg_index pg_index_indexrelid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_index
    ADD CONSTRAINT pg_index_indexrelid_index PRIMARY KEY (indexrelid);


--
-- Name: pg_inherits pg_inherits_relid_seqno_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_inherits
    ADD CONSTRAINT pg_inherits_relid_seqno_index PRIMARY KEY (inhrelid, inhseqno);


--
-- Name: pg_init_privs pg_init_privs_o_c_o_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_init_privs
    ADD CONSTRAINT pg_init_privs_o_c_o_index PRIMARY KEY (objoid, classoid, objsubid);


--
-- Name: pg_language pg_language_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_language
    ADD CONSTRAINT pg_language_name_index UNIQUE (lanname);


--
-- Name: pg_language pg_language_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_language
    ADD CONSTRAINT pg_language_oid_index PRIMARY KEY (oid);


--
-- Name: pg_largeobject pg_largeobject_loid_pn_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_largeobject
    ADD CONSTRAINT pg_largeobject_loid_pn_index PRIMARY KEY (loid, pageno);


--
-- Name: pg_largeobject_metadata pg_largeobject_metadata_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_largeobject_metadata
    ADD CONSTRAINT pg_largeobject_metadata_oid_index PRIMARY KEY (oid);


--
-- Name: pg_namespace pg_namespace_nspname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_namespace
    ADD CONSTRAINT pg_namespace_nspname_index UNIQUE (nspname);


--
-- Name: pg_namespace pg_namespace_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_namespace
    ADD CONSTRAINT pg_namespace_oid_index PRIMARY KEY (oid);


--
-- Name: pg_opclass pg_opclass_am_name_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_opclass
    ADD CONSTRAINT pg_opclass_am_name_nsp_index UNIQUE (opcmethod, opcname, opcnamespace);


--
-- Name: pg_opclass pg_opclass_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_opclass
    ADD CONSTRAINT pg_opclass_oid_index PRIMARY KEY (oid);


--
-- Name: pg_operator pg_operator_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_operator
    ADD CONSTRAINT pg_operator_oid_index PRIMARY KEY (oid);


--
-- Name: pg_operator pg_operator_oprname_l_r_n_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_operator
    ADD CONSTRAINT pg_operator_oprname_l_r_n_index UNIQUE (oprname, oprleft, oprright, oprnamespace);


--
-- Name: pg_opfamily pg_opfamily_am_name_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_opfamily
    ADD CONSTRAINT pg_opfamily_am_name_nsp_index UNIQUE (opfmethod, opfname, opfnamespace);


--
-- Name: pg_opfamily pg_opfamily_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_opfamily
    ADD CONSTRAINT pg_opfamily_oid_index PRIMARY KEY (oid);


--
-- Name: pg_partitioned_table pg_partitioned_table_partrelid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_partitioned_table
    ADD CONSTRAINT pg_partitioned_table_partrelid_index PRIMARY KEY (partrelid);


--
-- Name: pg_policy pg_policy_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_policy
    ADD CONSTRAINT pg_policy_oid_index PRIMARY KEY (oid);


--
-- Name: pg_policy pg_policy_polrelid_polname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_policy
    ADD CONSTRAINT pg_policy_polrelid_polname_index UNIQUE (polrelid, polname);


--
-- Name: pg_proc pg_proc_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_proc
    ADD CONSTRAINT pg_proc_oid_index PRIMARY KEY (oid);


--
-- Name: pg_proc pg_proc_proname_args_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_proc
    ADD CONSTRAINT pg_proc_proname_args_nsp_index UNIQUE (proname, proargtypes, pronamespace);


--
-- Name: pg_publication pg_publication_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_publication
    ADD CONSTRAINT pg_publication_oid_index PRIMARY KEY (oid);


--
-- Name: pg_publication pg_publication_pubname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_publication
    ADD CONSTRAINT pg_publication_pubname_index UNIQUE (pubname);


--
-- Name: pg_publication_rel pg_publication_rel_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_publication_rel
    ADD CONSTRAINT pg_publication_rel_oid_index PRIMARY KEY (oid);


--
-- Name: pg_publication_rel pg_publication_rel_prrelid_prpubid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_publication_rel
    ADD CONSTRAINT pg_publication_rel_prrelid_prpubid_index UNIQUE (prrelid, prpubid);


--
-- Name: pg_range pg_range_rngmultitypid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_range
    ADD CONSTRAINT pg_range_rngmultitypid_index UNIQUE (rngmultitypid);


--
-- Name: pg_range pg_range_rngtypid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_range
    ADD CONSTRAINT pg_range_rngtypid_index PRIMARY KEY (rngtypid);


SET default_tablespace = pg_global;

--
-- Name: pg_replication_origin pg_replication_origin_roiident_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_replication_origin
    ADD CONSTRAINT pg_replication_origin_roiident_index PRIMARY KEY (roident);


--
-- Name: pg_replication_origin pg_replication_origin_roname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_replication_origin
    ADD CONSTRAINT pg_replication_origin_roname_index UNIQUE (roname);


SET default_tablespace = '';

--
-- Name: pg_rewrite pg_rewrite_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_rewrite
    ADD CONSTRAINT pg_rewrite_oid_index PRIMARY KEY (oid);


--
-- Name: pg_rewrite pg_rewrite_rel_rulename_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_rewrite
    ADD CONSTRAINT pg_rewrite_rel_rulename_index UNIQUE (ev_class, rulename);


--
-- Name: pg_seclabel pg_seclabel_object_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_seclabel
    ADD CONSTRAINT pg_seclabel_object_index PRIMARY KEY (objoid, classoid, objsubid, provider);


--
-- Name: pg_sequence pg_sequence_seqrelid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_sequence
    ADD CONSTRAINT pg_sequence_seqrelid_index PRIMARY KEY (seqrelid);


SET default_tablespace = pg_global;

--
-- Name: pg_shdescription pg_shdescription_o_c_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_shdescription
    ADD CONSTRAINT pg_shdescription_o_c_index PRIMARY KEY (objoid, classoid);


--
-- Name: pg_shseclabel pg_shseclabel_object_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_shseclabel
    ADD CONSTRAINT pg_shseclabel_object_index PRIMARY KEY (objoid, classoid, provider);


SET default_tablespace = '';

--
-- Name: pg_statistic_ext_data pg_statistic_ext_data_stxoid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_statistic_ext_data
    ADD CONSTRAINT pg_statistic_ext_data_stxoid_index PRIMARY KEY (stxoid);


--
-- Name: pg_statistic_ext pg_statistic_ext_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_statistic_ext
    ADD CONSTRAINT pg_statistic_ext_name_index UNIQUE (stxname, stxnamespace);


--
-- Name: pg_statistic_ext pg_statistic_ext_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_statistic_ext
    ADD CONSTRAINT pg_statistic_ext_oid_index PRIMARY KEY (oid);


--
-- Name: pg_statistic pg_statistic_relid_att_inh_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_statistic
    ADD CONSTRAINT pg_statistic_relid_att_inh_index PRIMARY KEY (starelid, staattnum, stainherit);


SET default_tablespace = pg_global;

--
-- Name: pg_subscription pg_subscription_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_subscription
    ADD CONSTRAINT pg_subscription_oid_index PRIMARY KEY (oid);


SET default_tablespace = '';

--
-- Name: pg_subscription_rel pg_subscription_rel_srrelid_srsubid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_subscription_rel
    ADD CONSTRAINT pg_subscription_rel_srrelid_srsubid_index PRIMARY KEY (srrelid, srsubid);


SET default_tablespace = pg_global;

--
-- Name: pg_subscription pg_subscription_subname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_subscription
    ADD CONSTRAINT pg_subscription_subname_index UNIQUE (subdbid, subname);


--
-- Name: pg_tablespace pg_tablespace_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_tablespace
    ADD CONSTRAINT pg_tablespace_oid_index PRIMARY KEY (oid);


--
-- Name: pg_tablespace pg_tablespace_spcname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_tablespace
    ADD CONSTRAINT pg_tablespace_spcname_index UNIQUE (spcname);


SET default_tablespace = '';

--
-- Name: pg_transform pg_transform_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_transform
    ADD CONSTRAINT pg_transform_oid_index PRIMARY KEY (oid);


--
-- Name: pg_transform pg_transform_type_lang_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_transform
    ADD CONSTRAINT pg_transform_type_lang_index UNIQUE (trftype, trflang);


--
-- Name: pg_trigger pg_trigger_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_trigger
    ADD CONSTRAINT pg_trigger_oid_index PRIMARY KEY (oid);


--
-- Name: pg_trigger pg_trigger_tgrelid_tgname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_trigger
    ADD CONSTRAINT pg_trigger_tgrelid_tgname_index UNIQUE (tgrelid, tgname);


--
-- Name: pg_ts_config pg_ts_config_cfgname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_config
    ADD CONSTRAINT pg_ts_config_cfgname_index UNIQUE (cfgname, cfgnamespace);


--
-- Name: pg_ts_config_map pg_ts_config_map_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_config_map
    ADD CONSTRAINT pg_ts_config_map_index PRIMARY KEY (mapcfg, maptokentype, mapseqno);


--
-- Name: pg_ts_config pg_ts_config_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_config
    ADD CONSTRAINT pg_ts_config_oid_index PRIMARY KEY (oid);


--
-- Name: pg_ts_dict pg_ts_dict_dictname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_dict
    ADD CONSTRAINT pg_ts_dict_dictname_index UNIQUE (dictname, dictnamespace);


--
-- Name: pg_ts_dict pg_ts_dict_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_dict
    ADD CONSTRAINT pg_ts_dict_oid_index PRIMARY KEY (oid);


--
-- Name: pg_ts_parser pg_ts_parser_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_parser
    ADD CONSTRAINT pg_ts_parser_oid_index PRIMARY KEY (oid);


--
-- Name: pg_ts_parser pg_ts_parser_prsname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_parser
    ADD CONSTRAINT pg_ts_parser_prsname_index UNIQUE (prsname, prsnamespace);


--
-- Name: pg_ts_template pg_ts_template_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_template
    ADD CONSTRAINT pg_ts_template_oid_index PRIMARY KEY (oid);


--
-- Name: pg_ts_template pg_ts_template_tmplname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_ts_template
    ADD CONSTRAINT pg_ts_template_tmplname_index UNIQUE (tmplname, tmplnamespace);


--
-- Name: pg_type pg_type_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_type
    ADD CONSTRAINT pg_type_oid_index PRIMARY KEY (oid);


--
-- Name: pg_type pg_type_typname_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_type
    ADD CONSTRAINT pg_type_typname_nsp_index UNIQUE (typname, typnamespace);


--
-- Name: pg_user_mapping pg_user_mapping_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_user_mapping
    ADD CONSTRAINT pg_user_mapping_oid_index PRIMARY KEY (oid);


--
-- Name: pg_user_mapping pg_user_mapping_user_server_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: daodao
--

ALTER TABLE ONLY pg_catalog.pg_user_mapping
    ADD CONSTRAINT pg_user_mapping_user_server_index UNIQUE (umuser, umserver);


--
-- Name: ai_review_feedbacks ai_review_feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ai_review_feedbacks
    ADD CONSTRAINT ai_review_feedbacks_pkey PRIMARY KEY (id);


--
-- Name: ai_review_feedbacks ai_review_feedbacks_review_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ai_review_feedbacks
    ADD CONSTRAINT ai_review_feedbacks_review_id_key UNIQUE (review_id);


--
-- Name: ai_review_feedbacks ai_review_feedbacks_task_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ai_review_feedbacks
    ADD CONSTRAINT ai_review_feedbacks_task_id_key UNIQUE (task_id);


--
-- Name: basic_info basic_info_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.basic_info
    ADD CONSTRAINT basic_info_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: city city_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.city
    ADD CONSTRAINT city_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: country country_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.country
    ADD CONSTRAINT country_pkey PRIMARY KEY (id);


--
-- Name: eligibility eligibility_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.eligibility
    ADD CONSTRAINT eligibility_pkey PRIMARY KEY (id);


--
-- Name: entity_resources entity_resources_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_resources
    ADD CONSTRAINT entity_resources_external_id_key UNIQUE (external_id);


--
-- Name: entity_resources entity_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_resources
    ADD CONSTRAINT entity_resources_pkey PRIMARY KEY (id);


--
-- Name: entity_resources entity_resources_resource_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_resources
    ADD CONSTRAINT entity_resources_resource_id_entity_type_entity_id_key UNIQUE (resource_id, entity_type, entity_id);


--
-- Name: entity_tags entity_tags_entity_type_entity_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_entity_type_entity_id_tag_id_key UNIQUE (entity_type, entity_id, tag_id);


--
-- Name: entity_tags entity_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_pkey PRIMARY KEY (id);


--
-- Name: fee_plans fee_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.fee_plans
    ADD CONSTRAINT fee_plans_pkey PRIMARY KEY (id);


--
-- Name: groups groups_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_external_id_key UNIQUE (external_id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: ideas ideas_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_external_id_key UNIQUE (external_id);


--
-- Name: ideas ideas_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_pkey PRIMARY KEY (id);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (id);


--
-- Name: marathon marathon_event_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.marathon
    ADD CONSTRAINT marathon_event_id_key UNIQUE (event_id);


--
-- Name: marathon marathon_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.marathon
    ADD CONSTRAINT marathon_external_id_key UNIQUE (external_id);


--
-- Name: marathon marathon_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.marathon
    ADD CONSTRAINT marathon_pkey PRIMARY KEY (id);


--
-- Name: mentor_participants mentor_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.mentor_participants
    ADD CONSTRAINT mentor_participants_pkey PRIMARY KEY (mentor_id, participant_id);


--
-- Name: milestone milestone_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.milestone
    ADD CONSTRAINT milestone_pkey PRIMARY KEY (id);


--
-- Name: note note_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.note
    ADD CONSTRAINT note_pkey PRIMARY KEY (id);


--
-- Name: outcome outcome_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.outcome
    ADD CONSTRAINT outcome_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: position position_name_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public."position"
    ADD CONSTRAINT position_name_key UNIQUE (name);


--
-- Name: position position_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public."position"
    ADD CONSTRAINT position_pkey PRIMARY KEY (id);


--
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (id);


--
-- Name: practice_checkins practice_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practice_checkins
    ADD CONSTRAINT practice_checkins_pkey PRIMARY KEY (id);


--
-- Name: practice_checkins practice_checkins_practice_id_checkin_date_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practice_checkins
    ADD CONSTRAINT practice_checkins_practice_id_checkin_date_key UNIQUE (practice_id, checkin_date);


--
-- Name: practices practices_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practices
    ADD CONSTRAINT practices_external_id_key UNIQUE (external_id);


--
-- Name: practices practices_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practices
    ADD CONSTRAINT practices_pkey PRIMARY KEY (id);


--
-- Name: preference_options preference_options_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.preference_options
    ADD CONSTRAINT preference_options_pkey PRIMARY KEY (id);


--
-- Name: preference_options preference_options_preference_type_id_value_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.preference_options
    ADD CONSTRAINT preference_options_preference_type_id_value_key UNIQUE (preference_type_id, value);


--
-- Name: preference_types preference_types_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.preference_types
    ADD CONSTRAINT preference_types_pkey PRIMARY KEY (id);


--
-- Name: preference_types preference_types_value_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.preference_types
    ADD CONSTRAINT preference_types_value_key UNIQUE (value);


--
-- Name: professional_fields professional_fields_name_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.professional_fields
    ADD CONSTRAINT professional_fields_name_key UNIQUE (name);


--
-- Name: professional_fields professional_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.professional_fields
    ADD CONSTRAINT professional_fields_pkey PRIMARY KEY (id);


--
-- Name: professional_fields professional_fields_value_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.professional_fields
    ADD CONSTRAINT professional_fields_value_key UNIQUE (value);


--
-- Name: project project_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_external_id_key UNIQUE (external_id);


--
-- Name: project_marathon project_marathon_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project_marathon
    ADD CONSTRAINT project_marathon_pkey PRIMARY KEY (id);


--
-- Name: project_marathon project_marathon_project_id_marathon_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project_marathon
    ADD CONSTRAINT project_marathon_project_id_marathon_id_key UNIQUE (project_id, marathon_id);


--
-- Name: project project_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_pkey PRIMARY KEY (id);


--
-- Name: project project_user_id_title_version_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_user_id_title_version_key UNIQUE (user_id, title, version);


--
-- Name: rating_detail rating_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.rating_detail
    ADD CONSTRAINT rating_detail_pkey PRIMARY KEY (id);


--
-- Name: rating rating_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.rating
    ADD CONSTRAINT rating_pkey PRIMARY KEY (id);


--
-- Name: rating rating_user_id_target_type_target_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.rating
    ADD CONSTRAINT rating_user_id_target_type_target_id_key UNIQUE (user_id, target_type, target_id);


--
-- Name: resource_review resource_review_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resource_review
    ADD CONSTRAINT resource_review_pkey PRIMARY KEY (id);


--
-- Name: resource_review resource_review_user_id_resource_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resource_review
    ADD CONSTRAINT resource_review_user_id_resource_id_key UNIQUE (user_id, resource_id);


--
-- Name: resources resources_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_external_id_key UNIQUE (external_id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: review review_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: store store_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_external_id_key UNIQUE (external_id);


--
-- Name: store store_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_pkey PRIMARY KEY (id);


--
-- Name: store store_user_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_user_id_key UNIQUE (user_id);


--
-- Name: subscription_plan subscription_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.subscription_plan
    ADD CONSTRAINT subscription_plan_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: temp_users temp_users_email_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.temp_users
    ADD CONSTRAINT temp_users_email_key UNIQUE (email);


--
-- Name: temp_users temp_users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.temp_users
    ADD CONSTRAINT temp_users_google_id_key UNIQUE (google_id);


--
-- Name: temp_users temp_users_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.temp_users
    ADD CONSTRAINT temp_users_pkey PRIMARY KEY (id);


--
-- Name: user_interests user_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_pkey PRIMARY KEY (id);


--
-- Name: user_interests user_interests_unique; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_unique UNIQUE (user_id, category_id);


--
-- Name: user_join_group user_join_group_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_join_group
    ADD CONSTRAINT user_join_group_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_id);


--
-- Name: user_positions user_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_positions
    ADD CONSTRAINT user_positions_pkey PRIMARY KEY (user_id, position_id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_preference_option_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_preference_option_id_key UNIQUE (user_id, preference_option_id);


--
-- Name: user_professional_fields user_professional_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_professional_fields
    ADD CONSTRAINT user_professional_fields_pkey PRIMARY KEY (id);


--
-- Name: user_professional_fields user_professional_fields_unique; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_professional_fields
    ADD CONSTRAINT user_professional_fields_unique UNIQUE (user_id, professional_field_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_project user_project_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_project
    ADD CONSTRAINT user_project_pkey PRIMARY KEY (id);


--
-- Name: user_project user_project_user_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_project
    ADD CONSTRAINT user_project_user_id_project_id_key UNIQUE (user_id, project_id);


--
-- Name: user_subscription user_subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_subscription
    ADD CONSTRAINT user_subscription_pkey PRIMARY KEY (id);


--
-- Name: users users_custom_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_custom_id_key UNIQUE (custom_id);


--
-- Name: users users_external_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_external_id_key UNIQUE (external_id);


--
-- Name: users users_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_mongo_id_key UNIQUE (mongo_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: pg_class_tblspc_relfilenode_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_class_tblspc_relfilenode_index ON pg_catalog.pg_class USING btree (reltablespace, relfilenode);


--
-- Name: pg_constraint_conname_nsp_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_constraint_conname_nsp_index ON pg_catalog.pg_constraint USING btree (conname, connamespace);


--
-- Name: pg_constraint_conparentid_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_constraint_conparentid_index ON pg_catalog.pg_constraint USING btree (conparentid);


--
-- Name: pg_constraint_contypid_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_constraint_contypid_index ON pg_catalog.pg_constraint USING btree (contypid);


--
-- Name: pg_depend_depender_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_depend_depender_index ON pg_catalog.pg_depend USING btree (classid, objid, objsubid);


--
-- Name: pg_depend_reference_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_depend_reference_index ON pg_catalog.pg_depend USING btree (refclassid, refobjid, refobjsubid);


--
-- Name: pg_index_indrelid_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_index_indrelid_index ON pg_catalog.pg_index USING btree (indrelid);


--
-- Name: pg_inherits_parent_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_inherits_parent_index ON pg_catalog.pg_inherits USING btree (inhparent);


SET default_tablespace = pg_global;

--
-- Name: pg_shdepend_depender_index; Type: INDEX; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE INDEX pg_shdepend_depender_index ON pg_catalog.pg_shdepend USING btree (dbid, classid, objid, objsubid);


--
-- Name: pg_shdepend_reference_index; Type: INDEX; Schema: pg_catalog; Owner: daodao; Tablespace: pg_global
--

CREATE INDEX pg_shdepend_reference_index ON pg_catalog.pg_shdepend USING btree (refclassid, refobjid);


SET default_tablespace = '';

--
-- Name: pg_statistic_ext_relid_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_statistic_ext_relid_index ON pg_catalog.pg_statistic_ext USING btree (stxrelid);


--
-- Name: pg_trigger_tgconstraint_index; Type: INDEX; Schema: pg_catalog; Owner: daodao
--

CREATE INDEX pg_trigger_tgconstraint_index ON pg_catalog.pg_trigger USING btree (tgconstraint);


--
-- Name: idx_categories_name; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_categories_name ON public.categories USING btree (name);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_city_name; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_city_name ON public.city USING btree (name);


--
-- Name: idx_comments_target; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_comments_target ON public.comments USING btree (target_type, target_id);


--
-- Name: idx_comments_user; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_comments_user ON public.comments USING btree (user_id);


--
-- Name: idx_comments_visibility; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_comments_visibility ON public.comments USING btree (visibility);


--
-- Name: idx_country_alpha2; Type: INDEX; Schema: public; Owner: daodao
--

CREATE UNIQUE INDEX idx_country_alpha2 ON public.country USING btree (alpha2);


--
-- Name: idx_country_alpha3; Type: INDEX; Schema: public; Owner: daodao
--

CREATE UNIQUE INDEX idx_country_alpha3 ON public.country USING btree (alpha3);


--
-- Name: idx_entity_tags_created_at; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_entity_tags_created_at ON public.entity_tags USING btree (created_at);


--
-- Name: idx_entity_tags_tag_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_entity_tags_tag_id ON public.entity_tags USING btree (tag_id);


--
-- Name: idx_entity_tags_type_entity; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_entity_tags_type_entity ON public.entity_tags USING btree (entity_type, entity_id);


--
-- Name: idx_entity_tags_user; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_entity_tags_user ON public.entity_tags USING btree (entity_type, entity_id) WHERE ((entity_type)::text = 'user'::text);


--
-- Name: idx_group_TBD; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX "idx_group_TBD" ON public.groups USING btree ("TBD");


--
-- Name: idx_group_city_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_group_city_id ON public.groups USING btree (city_id);


--
-- Name: idx_group_group_type; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_group_group_type ON public.groups USING btree (group_type);


--
-- Name: idx_group_is_grouping; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_group_is_grouping ON public.groups USING btree (is_grouping);


--
-- Name: idx_group_is_online; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_group_is_online ON public.groups USING btree (is_online);


--
-- Name: idx_group_partner_education_step; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_group_partner_education_step ON public.groups USING btree (partner_education_step);


--
-- Name: idx_likes_post_user; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_likes_post_user ON public.likes USING btree (post_id, user_id);


--
-- Name: idx_location_city_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_location_city_id ON public.location USING btree (city_id);


--
-- Name: idx_location_country_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_location_country_id ON public.location USING btree (country_id);


--
-- Name: idx_marathon_start_date; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_marathon_start_date ON public.marathon USING btree (start_date);


--
-- Name: idx_milestone_project_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_milestone_project_id ON public.milestone USING btree (project_id);


--
-- Name: idx_note_post_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_note_post_id ON public.note USING btree (post_id);


--
-- Name: idx_outcome_post_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_outcome_post_id ON public.outcome USING btree (post_id);


--
-- Name: idx_posts_project_status; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_posts_project_status ON public.post USING btree (project_id, status);


--
-- Name: idx_professional_fields_active; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_professional_fields_active ON public.professional_fields USING btree (is_active);


--
-- Name: idx_professional_fields_name; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_professional_fields_name ON public.professional_fields USING btree (name);


--
-- Name: idx_professional_fields_value; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_professional_fields_value ON public.professional_fields USING btree (value);


--
-- Name: idx_project_marathon_status; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_project_marathon_status ON public.project_marathon USING btree (status);


--
-- Name: idx_resource_cost; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_resource_cost ON public.resources USING btree (cost);


--
-- Name: idx_resource_created_at; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_resource_created_at ON public.resources USING btree (created_at);


--
-- Name: idx_resource_created_by; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_resource_created_by ON public.resources USING btree (created_by);


--
-- Name: idx_resource_level; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_resource_level ON public.resources USING btree (level);


--
-- Name: idx_resource_type; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_resource_type ON public.resources USING btree (type);


--
-- Name: idx_resource_type_cost_level; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_resource_type_cost_level ON public.resources USING btree (type, cost, level);


--
-- Name: idx_review_post_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_review_post_id ON public.review USING btree (post_id);


--
-- Name: idx_review_resource_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_review_resource_id ON public.resource_review USING btree (resource_id);


--
-- Name: idx_review_user_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_review_user_id ON public.resource_review USING btree (user_id);


--
-- Name: idx_task_milestone_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_task_milestone_id ON public.task USING btree (milestone_id);


--
-- Name: idx_user_group; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_user_group ON public.user_join_group USING btree (user_id, group_id);


--
-- Name: idx_user_professional_fields_field_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_user_professional_fields_field_id ON public.user_professional_fields USING btree (professional_field_id);


--
-- Name: idx_user_professional_fields_user_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_user_professional_fields_user_id ON public.user_professional_fields USING btree (user_id);


--
-- Name: idx_user_profiles_is_public; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_user_profiles_is_public ON public.user_profiles USING btree (is_public);


--
-- Name: idx_user_subscription_user_status; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_user_subscription_user_status ON public.user_subscription USING btree (user_id, status);


--
-- Name: idx_users_education_stage; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_users_education_stage ON public.users USING btree (education_stage);


--
-- Name: idx_users_location_id; Type: INDEX; Schema: public; Owner: daodao
--

CREATE INDEX idx_users_location_id ON public.users USING btree (location_id);


--
-- Name: pg_settings pg_settings_n; Type: RULE; Schema: pg_catalog; Owner: daodao
--

CREATE RULE pg_settings_n AS
    ON UPDATE TO pg_catalog.pg_settings DO INSTEAD NOTHING;


--
-- Name: pg_settings pg_settings_u; Type: RULE; Schema: pg_catalog; Owner: daodao
--

CREATE RULE pg_settings_u AS
    ON UPDATE TO pg_catalog.pg_settings
   WHERE (new.name = old.name) DO  SELECT set_config(old.name, new.setting, false) AS set_config;


--
-- Name: ai_review_feedbacks ai_review_feedbacks_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ai_review_feedbacks
    ADD CONSTRAINT ai_review_feedbacks_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.review(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: eligibility eligibility_fee_plans_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.eligibility
    ADD CONSTRAINT eligibility_fee_plans_id_fkey FOREIGN KEY (fee_plans_id) REFERENCES public.fee_plans(id);


--
-- Name: entity_resources entity_resources_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_resources
    ADD CONSTRAINT entity_resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: entity_resources entity_resources_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_resources
    ADD CONSTRAINT entity_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: entity_tags entity_tags_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entity_tags entity_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: ai_review_feedbacks fk_review; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ai_review_feedbacks
    ADD CONSTRAINT fk_review FOREIGN KEY (review_id) REFERENCES public.review(id) ON DELETE CASCADE;


--
-- Name: user_professional_fields fk_user_professional_fields_field; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_professional_fields
    ADD CONSTRAINT fk_user_professional_fields_field FOREIGN KEY (professional_field_id) REFERENCES public.professional_fields(id) ON DELETE CASCADE;


--
-- Name: user_professional_fields fk_user_professional_fields_user; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_professional_fields
    ADD CONSTRAINT fk_user_professional_fields_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.city(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ideas ideas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: likes likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.post(id) ON DELETE CASCADE;


--
-- Name: likes likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: location location_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.city(id);


--
-- Name: location location_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.country(id);


--
-- Name: marathon marathon_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.marathon
    ADD CONSTRAINT marathon_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: mentor_participants mentor_participants_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.mentor_participants
    ADD CONSTRAINT mentor_participants_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mentor_participants mentor_participants_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.mentor_participants
    ADD CONSTRAINT mentor_participants_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: milestone milestone_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.milestone
    ADD CONSTRAINT milestone_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: note note_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.note
    ADD CONSTRAINT note_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.post(id) ON DELETE CASCADE;


--
-- Name: outcome outcome_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.outcome
    ADD CONSTRAINT outcome_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.post(id) ON DELETE CASCADE;


--
-- Name: post post_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: post post_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: practice_checkins practice_checkins_practice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practice_checkins
    ADD CONSTRAINT practice_checkins_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES public.practices(id) ON DELETE CASCADE;


--
-- Name: practice_checkins practice_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practice_checkins
    ADD CONSTRAINT practice_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: practices practices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.practices
    ADD CONSTRAINT practices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: preference_options preference_options_preference_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.preference_options
    ADD CONSTRAINT preference_options_preference_type_id_fkey FOREIGN KEY (preference_type_id) REFERENCES public.preference_types(id);


--
-- Name: project_marathon project_marathon_eligibility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project_marathon
    ADD CONSTRAINT project_marathon_eligibility_id_fkey FOREIGN KEY (eligibility_id) REFERENCES public.eligibility(id);


--
-- Name: project_marathon project_marathon_marathon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project_marathon
    ADD CONSTRAINT project_marathon_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES public.marathon(id) ON DELETE CASCADE;


--
-- Name: project_marathon project_marathon_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project_marathon
    ADD CONSTRAINT project_marathon_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: project project_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rating_detail rating_detail_rating_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.rating_detail
    ADD CONSTRAINT rating_detail_rating_id_fkey FOREIGN KEY (rating_id) REFERENCES public.rating(id) ON DELETE CASCADE;


--
-- Name: rating rating_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.rating
    ADD CONSTRAINT rating_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: resource_review resource_review_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resource_review
    ADD CONSTRAINT resource_review_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: resource_review resource_review_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resource_review
    ADD CONSTRAINT resource_review_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resources resources_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resources resources_major_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_major_category_id_fkey FOREIGN KEY (major_category_id) REFERENCES public.categories(id);


--
-- Name: resources resources_sub_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_sub_category_id_fkey FOREIGN KEY (sub_category_id) REFERENCES public.categories(id);


--
-- Name: review review_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.post(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: store store_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: task task_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestone(id) ON DELETE CASCADE;


--
-- Name: user_interests user_interests_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: user_interests user_interests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_join_group user_join_group_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_join_group
    ADD CONSTRAINT user_join_group_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: user_join_group user_join_group_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_join_group
    ADD CONSTRAINT user_join_group_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_positions user_positions_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_positions
    ADD CONSTRAINT user_positions_position_id_fkey FOREIGN KEY (position_id) REFERENCES public."position"(id);


--
-- Name: user_positions user_positions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_positions
    ADD CONSTRAINT user_positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_preferences user_preferences_preference_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_preference_option_id_fkey FOREIGN KEY (preference_option_id) REFERENCES public.preference_options(id);


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_project user_project_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_project
    ADD CONSTRAINT user_project_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: user_project user_project_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_project
    ADD CONSTRAINT user_project_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_subscription user_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_subscription
    ADD CONSTRAINT user_subscription_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plan(id) ON DELETE SET NULL;


--
-- Name: user_subscription user_subscription_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.user_subscription
    ADD CONSTRAINT user_subscription_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_basic_info_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_basic_info_id_fkey FOREIGN KEY (basic_info_id) REFERENCES public.basic_info(id);


--
-- Name: users users_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: users users_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: daodao
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

