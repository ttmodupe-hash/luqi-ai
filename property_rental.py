"""Property Rental — Property rental listings and management."""

import json
from typing import Dict, List


class PropertyRental:
    """Property rental listing and management."""

    def __init__(self):
        self.listings = []

    def add_listing(self, title: str, location: str, price: float, bedrooms: int, bathrooms: int, type: str = "apartment") -> Dict:
        listing = {
            "id": len(self.listings) + 1,
            "title": title,
            "location": location,
            "price": price,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "type": type,
            "status": "available",
        }
        self.listings.append(listing)
        return listing

    def search(self, location: str = None, max_price: float = None, min_bedrooms: int = None) -> List[Dict]:
        results = self.listings
        if location:
            results = [l for l in results if location.lower() in l["location"].lower()]
        if max_price:
            results = [l for l in results if l["price"] <= max_price]
        if min_bedrooms:
            results = [l for l in results if l["bedrooms"] >= min_bedrooms]
        return results

    def rental_yield(self, purchase_price: float, monthly_rent: float) -> Dict:
        annual_rent = monthly_rent * 12
        yield_pct = (annual_rent / purchase_price) * 100
        return {
            "purchase_price": purchase_price,
            "monthly_rent": monthly_rent,
            "annual_rent": annual_rent,
            "gross_yield": round(yield_pct, 2),
        }

    def affordability(self, income: float, expenses: float = 0) -> Dict:
        max_rent = (income - expenses) * 0.3
        return {
            "monthly_income": income,
            "expenses": expenses,
            "max_rent": round(max_rent, 2),
            "recommendation": f"Look for rentals under R{max_rent:.0f}",
        }


if __name__ == "__main__":
    rental = PropertyRental()
    rental.add_listing("Modern Apartment", "Sandton, Johannesburg", 12000, 2, 2)
    rental.add_listing("Family Home", "Cape Town", 18000, 3, 2)
    print(json.dumps(rental.search(location="Johannesburg"), indent=2))
    print(json.dumps(rental.rental_yield(2000000, 15000), indent=2))
