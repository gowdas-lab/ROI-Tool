-- Performance indexes on supplier_id, project_id

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_use_case ON projects(use_case);

-- Configurations indexes
CREATE INDEX IF NOT EXISTS idx_configurations_project_id ON configurations(project_id);
CREATE INDEX IF NOT EXISTS idx_configurations_rank ON configurations(project_id, rank);
CREATE INDEX IF NOT EXISTS idx_configurations_recommended ON configurations(is_recommended) WHERE is_recommended = TRUE;

-- BOM Line Items indexes
CREATE INDEX IF NOT EXISTS idx_bom_project_id ON bom_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_config_id ON bom_line_items(configuration_id);
CREATE INDEX IF NOT EXISTS idx_bom_supplier_id ON bom_line_items(selected_supplier_id);
CREATE INDEX IF NOT EXISTS idx_bom_category ON bom_line_items(category);

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(component_category);
CREATE INDEX IF NOT EXISTS idx_suppliers_weighted_score ON suppliers(weighted_score DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_country ON suppliers(country);

-- Supplier Components indexes
CREATE INDEX IF NOT EXISTS idx_supplier_components_supplier_id ON supplier_components(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_components_component_id ON supplier_components(component_catalog_id);

-- Financial Results indexes
CREATE INDEX IF NOT EXISTS idx_financial_project_id ON financial_results(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_config_id ON financial_results(configuration_id);
CREATE INDEX IF NOT EXISTS idx_financial_lcos ON financial_results(lcos_inr_per_kwh);

-- Cashflow indexes
CREATE INDEX IF NOT EXISTS idx_cashflow_result_id ON cashflow_years(financial_result_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_year ON cashflow_years(year);

-- Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- Legacy indexes
CREATE INDEX IF NOT EXISTS idx_calculations_timestamp ON calculations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bom_items_calc_id ON bom_items(calculation_id);
