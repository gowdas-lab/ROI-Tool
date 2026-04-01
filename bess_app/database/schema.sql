-- =========================
-- BASE TABLES (NO DEPENDENCIES)
-- =========================

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    component_category VARCHAR(100),
    country VARCHAR(100),
    tier VARCHAR(50),
    certifications TEXT,
    price_score FLOAT,
    technical_score FLOAT,
    delivery_score FLOAT,
    warranty_score FLOAT,
    support_score FLOAT,
    certification_score FLOAT,
    weighted_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Component Catalog
CREATE TABLE IF NOT EXISTS component_catalog (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description VARCHAR(300),
    rated_voltage_v FLOAT,
    rated_current_a FLOAT,
    rated_power_kw FLOAT,
    capacity_kwh FLOAT,
    dimensions_mm VARCHAR(100),
    weight_kg FLOAT,
    ip_rating VARCHAR(20),
    certifications VARCHAR(200),
    warranty_years INTEGER,
    standard VARCHAR(100)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name VARCHAR(200),
    use_case VARCHAR(200),
    peak_demand_kw FLOAT,
    daily_energy_kwh FLOAT,
    num_sites INTEGER DEFAULT 1,
    backup_duration_hrs FLOAT,
    grid_peak_tariff FLOAT,
    grid_offpeak_tariff FLOAT,
    cycles_per_day FLOAT,
    project_lifetime_yrs FLOAT,
    dod_pct FLOAT,
    battery_module_kwh FLOAT,
    cycle_life INTEGER,
    round_trip_efficiency_pct FLOAT,
    solar_pv_kwp FLOAT DEFAULT 0,
    solar_cuf_pct FLOAT DEFAULT 19,
    inputs_json JSONB
);

-- =========================
-- LEVEL 2 TABLES
-- =========================

-- Configurations
CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    num_modules INTEGER,
    module_kwh FLOAT,
    total_kwh FLOAT,
    num_inverters INTEGER,
    inverter_kw FLOAT,
    total_kw FLOAT,
    efficiency_score FLOAT,
    cost_score FLOAT,
    overall_score FLOAT,
    is_recommended BOOLEAN DEFAULT FALSE,
    rank INTEGER
);

-- Supplier Scores
CREATE TABLE IF NOT EXISTS supplier_scores (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    price_score FLOAT,
    technical_score FLOAT,
    delivery_score FLOAT,
    warranty_score FLOAT,
    support_score FLOAT,
    certification_score FLOAT,
    price_weight FLOAT,
    technical_weight FLOAT,
    delivery_weight FLOAT,
    warranty_weight FLOAT,
    support_weight FLOAT,
    cert_weight FLOAT,
    weighted_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Scoring Weights
CREATE TABLE IF NOT EXISTS scoring_weights (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    price_weight FLOAT DEFAULT 30,
    technical_weight FLOAT DEFAULT 25,
    delivery_weight FLOAT DEFAULT 15,
    warranty_weight FLOAT DEFAULT 10,
    support_weight FLOAT DEFAULT 10,
    cert_weight FLOAT DEFAULT 10,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- LEVEL 3 TABLES
-- =========================

-- Supplier Components
CREATE TABLE IF NOT EXISTS supplier_components (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    component_catalog_id INTEGER REFERENCES component_catalog(id) ON DELETE CASCADE,
    moq INTEGER,
    unit_cost FLOAT,
    lead_time_weeks INTEGER,
    currency VARCHAR(10) DEFAULT 'INR'
);

-- BOM Line Items
CREATE TABLE IF NOT EXISTS bom_line_items (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    configuration_id INTEGER REFERENCES configurations(id) ON DELETE SET NULL,
    bom_item_id INTEGER,
    category VARCHAR(100),
    description VARCHAR(300),
    qty FLOAT,
    unit VARCHAR(50),
    spec VARCHAR(300),
    unit_price FLOAT,
    line_total FLOAT,
    selected_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Financial Results
CREATE TABLE IF NOT EXISTS financial_results (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    configuration_id INTEGER REFERENCES configurations(id) ON DELETE SET NULL,
    battery_cost FLOAT,
    inverter_cost FLOAT,
    solar_cost FLOAT,
    bms_cost FLOAT,
    installation_cost FLOAT,
    commissioning_cost FLOAT,
    contingency_cost FLOAT,
    total_capex FLOAT,
    annual_battery_om FLOAT,
    annual_inverter_om FLOAT,
    annual_solar_om FLOAT,
    total_annual_opex FLOAT,
    lcos_inr_per_kwh FLOAT,
    lcos_pv_adjusted FLOAT,
    energy_throughput_kwh FLOAT,
    lifetime_cost FLOAT,
    annual_arbitrage FLOAT,
    annual_md_saving FLOAT,
    dg_displacement FLOAT,
    total_annual_savings FLOAT,
    net_annual_benefit FLOAT,
    simple_payback_yrs FLOAT,
    roi_10yr_pct FLOAT,
    npv_8pct FLOAT,
    irr_pct FLOAT,
    cumulative_10yr_net FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cashflow Years
CREATE TABLE IF NOT EXISTS cashflow_years (
    id SERIAL PRIMARY KEY,
    financial_result_id INTEGER REFERENCES financial_results(id) ON DELETE CASCADE,
    year INTEGER,
    soh_pct FLOAT,
    throughput_kwh FLOAT,
    opex FLOAT,
    savings FLOAT,
    net FLOAT,
    cumulative_net FLOAT
);

-- =========================
-- FINAL TABLES
-- =========================

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id VARCHAR(100),
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    changes JSONB,
    notes TEXT
);

-- Legacy Tables
CREATE TABLE IF NOT EXISTS calculations (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    use_case VARCHAR(100),
    inputs JSONB,
    results JSONB
);

CREATE TABLE IF NOT EXISTS bom_items (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER,
    category VARCHAR(100),
    description VARCHAR(300),
    qty FLOAT,
    unit VARCHAR(50),
    spec VARCHAR(300),
    unit_price FLOAT,
    line_total FLOAT
);

CREATE TABLE IF NOT EXISTS cashflow_years_legacy (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER,
    year INTEGER,
    soh_pct FLOAT,
    throughput_kwh FLOAT,
    opex FLOAT,
    savings FLOAT,
    net FLOAT,
    cumulative_net FLOAT
);