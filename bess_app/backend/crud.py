from sqlalchemy.orm import Session
import models
import datetime


def create_calculation(db: Session, inputs: dict, results: dict):
    roi = results.get("roi", {})
    capex = results.get("capex", {})
    lcos_data = results.get("lcos", {})
    sizing = results.get("sizing", {})
    savings = results.get("savings", {})

    record = models.Calculation(
        use_case=inputs.get("use_case", ""),
        total_capex=capex.get("total_capex", 0),
        lcos=lcos_data.get("lcos_inr_per_kwh", 0),
        payback_yrs=roi.get("simple_payback_yrs", 0),
        num_modules=sizing.get("num_modules", 0),
        actual_kwh=sizing.get("actual_installed_kwh", 0),
        total_annual_savings=savings.get("total_annual_savings", 0),
        inputs_json=inputs,
        results_json=results,
    )
    db.add(record)
    db.flush()

    # Store BOM items
    for item in results.get("bom_items", []):
        bom = models.BOMItem(
            calculation_id=record.id,
            bom_item_id=item["id"],
            category=item["category"],
            description=item["description"],
            qty=item["qty"],
            unit=item["unit"],
            spec=item["spec"],
            unit_price=item["unit_price"],
            line_total=item["line_total"],
        )
        db.add(bom)

    # Store cashflow
    for yr in results.get("cashflow_years", []):
        cf = models.CashflowYear(
            calculation_id=record.id,
            year=yr["year"],
            soh_pct=yr["soh_pct"],
            usable_capacity_kwh=yr["usable_capacity_kwh"],
            arbitrage_saving=yr["arbitrage_saving"],
            md_dg_saving=yr["md_dg_saving"],
            total_saving=yr["total_saving"],
            net_benefit=yr["net_benefit"],
            cumulative_net=yr["cumulative_net"],
        )
        db.add(cf)

    # Audit log
    log = models.AuditLog(
        action="CALCULATE",
        table_name="calculations",
        record_id=record.id,
        details={"use_case": inputs.get("use_case"), "total_capex": capex.get("total_capex")},
    )
    db.add(log)
    db.commit()
    db.refresh(record)
    return record


def list_calculations(db: Session, limit: int = 20):
    return db.query(models.Calculation).order_by(models.Calculation.created_at.desc()).limit(limit).all()


def get_calculation(db: Session, calc_id: int):
    return db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()


def get_bom_items(db: Session, calc_id: int):
    return db.query(models.BOMItem).filter(models.BOMItem.calculation_id == calc_id).all()


def list_suppliers(db: Session):
    suppliers = db.query(models.Supplier).order_by(models.Supplier.weighted_score.desc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.component_category,
            "description": s.component_description,
            "unit_price": s.unit_price,
            "price_score": s.price_score,
            "technical_score": s.technical_score,
            "delivery_score": s.delivery_score,
            "warranty_score": s.warranty_score,
            "weighted_score": s.weighted_score,
            "is_selected": s.is_selected,
            "notes": s.notes,
        }
        for s in suppliers
    ]


def create_supplier(db: Session, data: dict):
    s = models.Supplier(
        name=data.get("name", ""),
        component_category=data.get("category", ""),
        component_description=data.get("description", ""),
        unit_price=data.get("unit_price", 0),
        price_score=data.get("price_score", 0),
        technical_score=data.get("technical_score", 0),
        delivery_score=data.get("delivery_score", 0),
        warranty_score=data.get("warranty_score", 0),
        support_score=data.get("support_score", 0),
        cert_score=data.get("cert_score", 0),
        weighted_score=data.get("weighted_score", 0),
        notes=data.get("notes", ""),
    )
    db.add(s)
    log = models.AuditLog(
        action="CREATE",
        table_name="suppliers",
        record_id=None,
        details={"name": s.name},
    )
    db.add(log)
    db.commit()
    db.refresh(s)
    return s


def get_audit_log(db: Session, limit: int = 50):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()
