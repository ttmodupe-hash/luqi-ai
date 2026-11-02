from datetime import datetime, timedelta, timezone

from omega_ai.university_guide import Programme, Scholarship, UniversityGuide

NOW = datetime(2026, 10, 22, tzinfo=timezone.utc)


def test_country_and_qualification_filter():
    p = Programme("Fixture U", "ZA", "Engineering", "Engineering", "BSc",
                  "https://example.org/catalog", NOW - timedelta(days=1))
    old = Programme("Old U", "KE", "Medicine", "Health", "MBBS",
                    "https://example.org/catalog", NOW - timedelta(days=300))
    guide = UniversityGuide([p, old])
    assert guide.search(country="ZA", qualification="BSc", now=NOW) == [p]
    assert guide.search(country="KE", now=NOW) == []


def test_scholarship_is_never_guaranteed():
    s = Scholarship("Fixture award", ("ZA",), ("BSc",), ("Engineering",),
                    "https://example.org/award", NOW)
    guide = UniversityGuide(scholarships=[s])
    matches = guide.match_scholarships(country="ZA", qualification="BSc",
                                        subject="Engineering", now=NOW)
    assert len(matches) == 1
    assert matches[0].status == "potential_match_only"
    assert not guide.match_scholarships(country="KE", qualification="BSc",
                                         subject="Engineering", now=NOW)


def test_unsourced_catalog_is_excluded():
    p = Programme("Unsourced", "ZA", "AI", "Computing", "MSc", "", NOW)
    assert UniversityGuide([p]).search(now=NOW) == []
