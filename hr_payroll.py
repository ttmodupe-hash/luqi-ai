"""HR & Payroll — Human resources and payroll management."""

import json
from typing import Dict, List


class HRPayroll:
    """HR and payroll management system."""

    def __init__(self):
        self.employees = []
        self.tax_brackets = [
            {"min": 0, "max": 237100, "rate": 0.18},
            {"min": 237101, "max": 370500, "rate": 0.26},
            {"min": 370501, "max": 512800, "rate": 0.31},
            {"min": 512801, "max": 673000, "rate": 0.36},
            {"min": 673001, "max": 857900, "rate": 0.39},
            {"min": 857901, "max": 1817000, "rate": 0.41},
            {"min": 1817001, "max": float("inf"), "rate": 0.45},
        ]

    def add_employee(self, name: str, salary: float, deductions: Dict = None) -> Dict:
        emp = {
            "id": len(self.employees) + 1,
            "name": name,
            "salary": salary,
            "deductions": deductions or {},
        }
        self.employees.append(emp)
        return emp

    def calculate_tax(self, annual_salary: float) -> float:
        tax = 0
        for bracket in self.tax_brackets:
            if annual_salary > bracket["min"]:
                taxable = min(annual_salary, bracket["max"]) - bracket["min"]
                tax += taxable * bracket["rate"]
        return tax

    def calculate_payslip(self, employee_id: int) -> Dict:
        emp = next((e for e in self.employees if e["id"] == employee_id), None)
        if not emp:
            return {"error": "Employee not found"}
        monthly = emp["salary"] / 12
        tax_monthly = self.calculate_tax(emp["salary"]) / 12
        uif = monthly * 0.01
        pension = monthly * (emp["deductions"].get("pension", 0) / 100)
        net = monthly - tax_monthly - uif - pension
        return {
            "employee": emp["name"],
            "gross": round(monthly, 2),
            "tax": round(tax_monthly, 2),
            "uif": round(uif, 2),
            "pension": round(pension, 2),
            "net": round(net, 2),
        }

    def leave_management(self, employee_id: int, leave_type: str, days: int) -> Dict:
        leave_balances = {"annual": 21, "sick": 30, "family": 5, "maternity": 120, "paternity": 10}
        return {
            "employee_id": employee_id,
            "leave_type": leave_type,
            "requested": days,
            "balance": leave_balances.get(leave_type, 0),
            "approved": days <= leave_balances.get(leave_type, 0),
        }


if __name__ == "__main__":
    hr = HRPayroll()
    hr.add_employee("John Doe", 500000, {"pension": 7.5})
    print(json.dumps(hr.calculate_payslip(1), indent=2))
    print(json.dumps(hr.leave_management(1, "annual", 5), indent=2))
