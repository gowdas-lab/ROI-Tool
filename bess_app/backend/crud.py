from sqlalchemy.orm import Session
import models
import datetime


def create_calculation(db: Session, inputs: dict, results: dict, user_id: int | None = None):
    record = models.Calculation(
        use_case=inputs.get("use_case", ""),
        inputs=inputs,
        results=results,
        user_id=user_id,
    )
    db.add(record)
    db.flush()

    # Store BOM items
    for item in results.get("bom_items", []):
        bom = models.BOMItem(
            calculation_id=record.id,
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
        cf = models.CashflowYearLegacy(
            calculation_id=record.id,
            year=yr["year"],
            soh_pct=yr["soh_pct"],
            throughput_kwh=yr.get("throughput_kwh", 0),
            opex=yr.get("opex", 0),
            savings=yr.get("savings", 0),
            net=yr.get("net", 0),
            cumulative_net=yr["cumulative_net"],
        )
        db.add(cf)

    # Audit log
    log = models.AuditLog(
        user_id=str(user_id) if user_id is not None else None,
        action="CALCULATE",
        entity_type="Calculation",
        entity_id=record.id,
        changes={
            "use_case": inputs.get("use_case"),
            "total_capex": results.get("capex", {}).get("total_capex"),
        },
    )
    db.add(log)
    db.commit()
    db.refresh(record)
    return record


def list_calculations(db: Session, limit: int = 20, user_id: int | None = None):
    order_col = getattr(models.Calculation, "created_at", None)
    if order_col is None:
        order_col = getattr(models.Calculation, "timestamp", models.Calculation.id)
    q = db.query(models.Calculation)
    if user_id is not None and hasattr(models.Calculation, "user_id"):
        q = q.filter(models.Calculation.user_id == user_id)
    return q.order_by(order_col.desc()).limit(limit).all()


def get_calculation(db: Session, calc_id: int, user_id: int | None = None, is_admin: bool = False):
    q = db.query(models.Calculation).filter(models.Calculation.id == calc_id)
    if not is_admin and user_id is not None and hasattr(models.Calculation, "user_id"):
        q = q.filter(models.Calculation.user_id == user_id)
    return q.first()


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
        user_id=None,
        action="CREATE",
        entity_type="Supplier",
        entity_id=s.id,
        changes={"name": s.name},
    )
    db.add(log)
    db.commit()
    db.refresh(s)
    return s


def get_audit_log(db: Session, limit: int = 50):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()
