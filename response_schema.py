"""Response Schema — Standardized response formatting."""

import json
from typing import Any, Dict


class ResponseSchema:
    """Standardized API response formatter."""

    @staticmethod
    def success(data: Any = None, message: str = "Success") -> Dict:
        return {
            "status": "success",
            "message": message,
            "data": data,
            "timestamp": json.dumps("now"),
        }

    @staticmethod
    def error(message: str, code: int = 500, details: Any = None) -> Dict:
        return {
            "status": "error",
            "message": message,
            "code": code,
            "details": details,
            "timestamp": json.dumps("now"),
        }

    @staticmethod
    def paginated(data: list, page: int = 1, per_page: int = 20, total: int = 0) -> Dict:
        return {
            "status": "success",
            "data": data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }

    @staticmethod
    def validation_error(errors: Dict) -> Dict:
        return {
            "status": "error",
            "message": "Validation failed",
            "code": 422,
            "errors": errors,
        }


if __name__ == "__main__":
    print(json.dumps(ResponseSchema.success({"id": 1}), indent=2))
    print(json.dumps(ResponseSchema.error("Not found", 404), indent=2))
    print(json.dumps(ResponseSchema.paginated([1, 2, 3], 1, 20, 100), indent=2))
