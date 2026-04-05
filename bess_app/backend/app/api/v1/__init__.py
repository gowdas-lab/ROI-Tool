from fastapi import APIRouter
from .projects import router as projects_router
from .bom import router as bom_router
from .suppliers import router as suppliers_router
from .permutations import router as permutations_router
from .analytics import router as analytics_router
from .scoring_weights import router as weights_router
from .admin import router as admin_router
from .auth import router as auth_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(projects_router, prefix="/projects", tags=["projects"])
router.include_router(bom_router, prefix="/bom", tags=["bom"])
router.include_router(suppliers_router, prefix="/suppliers", tags=["suppliers"])
router.include_router(permutations_router, prefix="/permutations", tags=["permutations"])
router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
router.include_router(weights_router, prefix="/scoring-weights", tags=["scoring"])
router.include_router(admin_router, prefix="/admin", tags=["admin"])
